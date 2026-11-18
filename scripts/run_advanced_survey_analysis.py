#!/usr/bin/env python
"""Run explicitly approved centered SVD survey experiments only."""

from __future__ import annotations

import argparse
import copy
import hashlib
import importlib.metadata
import json
import platform
import sys
import time
import traceback
from pathlib import Path
from typing import Any

import pandas as pd
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
MODES = ("inspect", "code", "fit", "interpret", "review-items")


def digest(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, allow_nan=False).encode()).hexdigest()


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def validate(value: Any, schema: str) -> None:
    document = json.loads((ROOT / "schemas" / schema).read_text(encoding="utf-8"))
    Draft202012Validator(document).validate(value)


def authorize(path: Path | None, config: dict, actions: set[str]) -> None:
    if path is None:
        raise PermissionError("Obtain explicit user approval for this experiment and its actions.")
    approval = json.loads(path.read_text(encoding="utf-8"))
    if (
        approval.get("approved") is not True
        or approval.get("config_sha256") != digest(config)
        or not actions.issubset(set(approval.get("actions", [])))
    ):
        raise PermissionError("Approval is absent, stale, or does not authorize these actions.")


def read_source(source: dict, base: Path, private: Path, group: str) -> pd.DataFrame:
    from analyze_survey_export import read_export

    path = (base / source["path"]).resolve()
    if file_hash(path) != source["sha256"]:
        raise ValueError("Source changed; inspect it again and renew the experiment approval.")
    private.mkdir(parents=True, exist_ok=True)
    frame, _, _, _, _, _ = read_export(
        path, private, source.get("sheet"), source.get("attribute_sheet"), group
    )
    # Attribute sheets remain private; only explicit, separately approved joins use them.
    if not source.get("prepared") and any(str(col).endswith("_SENSITIVE_COMMENT_FLAG") for col in frame):
        raise ValueError("Prepare native platform exports with the existing inspection/confirmation workflow first.")
    return frame


def load_data(config: dict, base: Path, private: Path) -> pd.DataFrame:
    from analyze_survey_export import safe_attribute

    experiment = config["experiment"]
    group = experiment["group"]
    frame = read_source(config["source"], base, private / "source", group)
    for number, join in enumerate(config.get("joins", [])):
        key = join["key"]
        columns = join["columns"]
        if key not in frame or not all(safe_attribute(col) for col in columns):
            raise ValueError("The join key is absent or joined columns are not privacy-eligible.")
        if set(columns) & set(frame.columns):
            raise ValueError("Joined predictors conflict with existing columns.")
        other = read_source(join["source"], base, private / f"join-{number}", key)
        selected = [key, *columns]
        available = join.get("available_at")
        if available:
            selected.append(available)
        if other[key].isna().any() or other[key].duplicated().any() or frame[key].isna().any():
            raise ValueError("External data needs complete keys and a many-to-one linkage.")
        merged = frame.merge(other[selected], on=key, how="left", validate="many_to_one", indicator=True)
        coverage = merged["_merge"].value_counts().to_dict()
        write_json(private / f"join-{number}-coverage.json", {str(k): int(v) for k, v in coverage.items()})
        if available:
            time_column = experiment.get("time")
            if not time_column:
                raise ValueError("Timestamped additions require a confirmed survey time column.")
            known = merged["_merge"] == "both"
            supplied = pd.to_datetime(merged.loc[known, available], errors="raise", utc=True)
            survey_time = pd.to_datetime(merged.loc[known, time_column], errors="raise", utc=True)
            if supplied.isna().any() or survey_time.isna().any() or (supplied > survey_time).any():
                raise ValueError("An external predictor was unavailable at the survey/prediction time.")
            merged = merged.drop(columns=[available])
        frame = merged.drop(columns=["_merge"])
    return frame


def provenance() -> dict:
    import vivaglint.modeling as modeling
    from local_runtime import isolated_environment

    required = json.loads((ROOT / "skills/analyze-survey-advanced/references/engine.json").read_text(encoding="utf-8"))
    implementation = Path(modeling.__file__).read_bytes().replace(b"\r\n", b"\n")
    if hashlib.sha256(implementation).hexdigest() != required["modeling_sha256"]:
        raise RuntimeError("The approved advanced engine is not installed; use requirements-advanced-runtime.txt.")
    if sys.version_info < (3, 11) or sys.prefix == sys.base_prefix or not isolated_environment(Path(sys.prefix)):
        raise RuntimeError("Advanced execution requires an isolated virtual environment.")
    versions = {}
    for line in (ROOT / "requirements-advanced-runtime.txt").read_text(encoding="utf-8").splitlines():
        if "==" in line and not line.startswith("#"):
            name, expected = line.strip().split("==", 1)
            actual = importlib.metadata.version(name)
            if actual != expected:
                raise RuntimeError("Advanced runtime dependencies changed; restore the pinned isolated environment.")
            versions[name] = actual
    return {
        "engine_commit": required["commit"],
        "engine_modeling_sha256": required["modeling_sha256"],
        "python": platform.python_version(),
        "platform": platform.system(),
        "dependencies": {"vivaglint": importlib.metadata.version("vivaglint"), **versions},
        "runner_sha256": file_hash(Path(__file__)),
    }


def survey_overview(config: dict, frame: pd.DataFrame | None = None) -> dict:
    details = config.get("survey", {})
    minimum = config["experiment"]["min_group_size"]
    invited = details.get("invited_count")
    if invited is not None and invited < minimum:
        raise ValueError("The invitation count is below the configured privacy minimum.")
    overview = {
        "name": details.get("name"),
        "response_count": None,
        "feature_count": len(config["experiment"]["features"]),
        "invited_count": invited,
        "response_rate": None,
    }
    if frame is None:
        return overview
    titles = (
        frame["survey_cycle_title"].dropna().astype(str).str.strip()
        if "survey_cycle_title" in frame else pd.Series(dtype=str)
    )
    titles = titles[titles.ne("")].unique()
    if overview["name"] is None and len(titles) == 1:
        overview["name"] = titles[0]
    count = len(frame)
    if invited is not None:
        respondent = details["respondent_column"]
        if (
            respondent not in frame or frame[respondent].isna().any()
            or frame[respondent].astype(str).str.strip().eq("").any()
            or frame[respondent].duplicated().any()
            or any(
                frame[column].dropna().nunique() > 1
                for column in ("survey_cycle_title", "survey_cycle_id", "survey_cycle")
                if column in frame
            )
        ):
            raise ValueError("Response rate needs one confirmed survey scope and one response per identified respondent.")
        if count > invited:
            raise ValueError("Survey responses exceed the confirmed invitation count.")
    if count >= minimum:
        overview["response_count"] = count
        if invited is not None:
            overview["response_rate"] = 100 * count / invited
    return overview


def seal_holdout_design(project: Path, config: dict, frame: pd.DataFrame) -> Path:
    experiment = config["experiment"]
    validation = experiment["validation"]
    columns = [experiment["group"]]
    if validation["kind"] == "time":
        columns.append(experiment["time"])
    design = {
        "source_selection": {key: value for key, value in config["source"].items() if key != "path"},
        "group": experiment["group"],
        "time": experiment.get("time") if validation["kind"] == "time" else None,
        "split_seed": experiment.get("split_seed", experiment["seed"]),
        "validation": {key: validation[key] for key in ("kind", "holdout_fraction", "unseen_groups")},
        "split_inputs_sha256": hashlib.sha256(
            pd.util.hash_pandas_object(frame[columns], index=True).to_numpy().tobytes()
        ).hexdigest(),
    }
    ledger_dir = project / "_holdouts"
    ledger_dir.mkdir(exist_ok=True)
    seal = ledger_dir / f'{config["source"]["sha256"]}-design.json'
    try:
        with seal.open("x", encoding="utf-8") as handle:
            json.dump(design, handle)
    except FileExistsError:
        if json.loads(seal.read_text(encoding="utf-8")) != design:
            raise ValueError("The reserved holdout design changed; preserve its original split seed, source selection and grouping/timing.")
    return ledger_dir / f'{config["source"]["sha256"]}.json'


def export_code(config: dict, output: Path) -> None:
    portable = copy.deepcopy(config)
    portable["source"]["path"] = "PRIVATE_SURVEY" + Path(config["source"]["path"]).suffix
    for number, join in enumerate(portable.get("joins", [])):
        join["source"]["path"] = f"PRIVATE_JOIN_{number + 1}" + Path(join["source"]["path"]).suffix
    write_json(output / "experiment-template.json", portable)
    code = (
        '"""Supply private inputs and obtain fresh approval before execution.\n'
        'Install the complete plugin and its pinned advanced runtime first.\n'
        'This file contains no fitted models, employee rows, or notebook outputs.\n"""\n'
        "import subprocess\nimport sys\nfrom pathlib import Path\n\n"
        'plugin = Path("PATH_TO_COMPLETE_PLUGIN")\n'
        "command = [sys.executable, str(plugin / 'scripts' / 'run_advanced_survey_analysis.py'),\n"
        "           '--config', 'experiment-template.json', '--project-dir', 'PRIVATE_PROJECT',\n"
        "           '--output-dir', 'PRIVATE_PROJECT/NEW_RUN', '--mode', 'fit',\n"
        "           '--approval', 'PRIVATE_APPROVAL.json']\n"
        "if __name__ == '__main__':\n"
        "    subprocess.run(command, check=True)\n"
    )
    (output / "reproduce.py").write_text(code, encoding="utf-8")
    write_json(output / "experiment.ipynb", {
        "nbformat": 4, "nbformat_minor": 5,
        "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}},
        "cells": [
            {"id": "instructions", "cell_type": "markdown", "metadata": {},
             "source": ["# Advanced survey experiment\n", "Placeholders require your private files and fresh approval. No analysis has run in this notebook."]},
            {"id": "experiment", "cell_type": "code", "metadata": {}, "execution_count": None,
             "outputs": [], "source": code.splitlines(keepends=True)},
        ],
    })


def model_qa(summary: dict, repeatability: str) -> dict:
    limitations = list(summary.get("warnings", []))
    verdict = "Not ready" if repeatability != "passed" else "Use with caveats"
    if summary.get("task") != "svd":
        raise ValueError("Advanced analysis supports centered SVD only.")
    limitations.append("Exploratory SVD is not a validated measurement model.")
    return {"verdict": verdict, "repeatability": repeatability, "limitations": limitations}


def embed_interpretation(manifest: dict, narrative_path: Path) -> None:
    from urllib.parse import urlparse

    narrative = json.loads(narrative_path.read_text(encoding="utf-8"))
    validate(narrative, "advanced-interpretation.schema.json")
    if manifest["qa"]["verdict"] == "Not ready":
        raise ValueError("Interpretation requires QA-eligible diagnostics.")
    if (
        narrative["config_sha256"] != manifest["config_sha256"]
        or narrative["summary_sha256"] != digest(manifest["summary"])
    ):
        raise ValueError("Narrative evidence is stale; review the current diagnostics.")
    allowed = {"techcommunity.microsoft.com", "learn.microsoft.com", "adoption.microsoft.com", "www.microsoft.com"}
    for claim in narrative["claims"]:
        for source in claim["sources"]:
            if urlparse(source["url"]).hostname not in allowed:
                raise ValueError("Citations must use eligible public Microsoft research/documentation sources.")
    manifest["interpretation"] = {"status": "reviewed", **narrative}


def run(options: argparse.Namespace) -> None:
    config_path = Path(options.config).resolve()
    config = json.loads(config_path.read_text(encoding="utf-8"))
    validate(config, "advanced-analysis-config.schema.json")
    mode = options.mode
    if mode not in MODES:
        raise ValueError(f"Unsupported SVD mode {mode!r}; choose from {', '.join(MODES)}.")
    output = Path(options.output_dir).resolve()
    project = Path(options.project_dir).resolve()
    if output == project or project not in output.parents:
        raise ValueError("Use a named run directory inside the same private project.")
    output.mkdir(parents=True, exist_ok=True)
    private = output / "_private"
    private.mkdir(exist_ok=True)
    approval = Path(options.approval).resolve() if options.approval else None
    include_report = getattr(options, "delivery", "chat") == "report"
    if mode == "review-items":
        authorize(approval, config, {"interpret", "share"})
        manifest = json.loads((output / "advanced-analysis-manifest.json").read_text(encoding="utf-8"))
        review_path = getattr(options, "item_review", None)
        candidates_path = getattr(options, "item_candidates", None)
        if manifest["config_sha256"] != digest(config) or bool(review_path) == bool(candidates_path):
            raise ValueError("Question review needs the original experiment and exactly one assessment or candidate shortlist.")
        from build_advanced_analysis_report import build_report, validate_item_candidates, validate_item_review
        if candidates_path:
            candidates = json.loads(Path(candidates_path).read_text(encoding="utf-8"))
            validate_item_candidates(manifest, candidates)
            manifest["item_candidates"] = candidates
        else:
            review = json.loads(Path(review_path).read_text(encoding="utf-8"))
            validate_item_review(manifest, review)
            manifest["item_review"] = review
        build_report(output, manifest, include_report=include_report)
        print("Question review attached; no models were fitted and no questions were deleted.")
        return
    if mode == "interpret":
        authorize(approval, config, {"interpret", "share"})
        manifest = json.loads((output / "advanced-analysis-manifest.json").read_text(encoding="utf-8"))
        if manifest["config_sha256"] != digest(config) or not options.narrative:
            raise ValueError("Interpretation needs the original experiment and a reviewed narrative.")
        embed_interpretation(manifest, Path(options.narrative))
        from build_advanced_analysis_report import build_report
        build_report(output, manifest, include_report=include_report)
        return
    if (output / "advanced-analysis-manifest.json").exists():
        raise ValueError("Preserve experiment history: use a new run directory.")
    if mode == "inspect":
        if config.get("joins"):
            authorize(approval, config, {"join"})
        frame = load_data(config, config_path.parent, private)
        write_json(private / "inspection.json", {
            "config_sha256": digest(config), "columns": list(frame.columns),
            "rows": len(frame), "dtypes": {col: str(dtype) for col, dtype in frame.dtypes.items()},
            "analysis_started": False,
        })
        print("Inspection saved privately; no model was fitted.")
        return
    actions = {"code"} if mode == "code" else {"fit", "replay"}
    if config.get("joins") and mode != "code":
        actions.add("join")
    authorize(approval, config, actions)
    with (private / "execution-claimed.json").open("x", encoding="utf-8") as handle:
        json.dump({"config_sha256": digest(config), "action": mode}, handle)
    export_code(config, output)
    manifest = {
        "schema_version": "1.0.0", "kind": "advanced-survey", "status": "not_run",
        "config_sha256": digest(config), "source_sha256": config["source"]["sha256"],
        "provenance": {}, "summary": {},
        "qa": {"verdict": "Not ready", "repeatability": "not_run", "limitations": ["Code generated; no models executed."]},
        "artifacts": [], "interpretation": {"status": "unavailable", "reason": "Research has not been retrieved and reviewed."},
        "survey": survey_overview(config),
    }
    if mode != "code":
        from vivaglint.modeling import run_model_experiment

        manifest["provenance"] = provenance()
        frame = load_data(config, config_path.parent, private)
        manifest["survey"] = survey_overview(config, frame)
        if len(frame) > config["experiment"]["budget"]["max_rows"]:
            raise ValueError("The loaded/joined data exceeds the approved row budget.")
        ledger = seal_holdout_design(project, config, frame)
        if ledger.exists():
            raise ValueError("This project's source holdout has been consumed. Use genuinely new evaluation data, not a new config.")
        write_json(private / "status.json", {"status": "running", "action": mode})
        started = time.monotonic()
        result = run_model_experiment(frame, config["experiment"])
        frozen = {**copy.deepcopy(config), "experiment": result["frozen_config"]}
        write_json(private / "frozen-config.json", frozen)
        write_json(private / "split-membership.json", result["private"])
        replay_config = copy.deepcopy(result["frozen_config"])
        remaining = config["experiment"]["budget"]["max_seconds"] - (time.monotonic() - started)
        if remaining <= 0:
            raise TimeoutError("The approved experiment budget has no time left for verification.")
        replay_config["budget"]["max_seconds"] = remaining
        verification = run_model_experiment(frame, replay_config)
        if result["summary"] != verification["summary"]:
            raise ValueError("Frozen experiment replay disagreed; do not share or interpret these outputs.")
        manifest["status"] = "completed"
        manifest["summary"] = result["summary"]
        manifest["summary"]["design"] = {
            "features": config["experiment"]["features"],
            "validation": config["experiment"]["validation"],
            "seed": config["experiment"]["seed"],
            "split_seed": config["experiment"].get("split_seed", config["experiment"]["seed"]),
        }
        manifest["qa"] = model_qa(result["summary"], "passed")
        manifest["qa"]["limitations"].append(
            "Readiness is bounded diagnostic QA, not proof of representative data or useful business performance."
        )
        write_json(private / "status.json", {"status": "completed", "action": mode})
    write_json(output / "advanced-analysis-manifest.json", manifest)
    from build_advanced_analysis_report import build_report
    build_report(output, manifest, include_report=include_report)
    print(f"Advanced experiment status: {manifest['status']}; QA: {manifest['qa']['verdict']}.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True)
    parser.add_argument("--project-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--mode", required=True, choices=MODES)
    parser.add_argument("--delivery", choices=["chat", "report"], default="chat",
                        help="Keep aggregate outputs for inline chat (default), or also create an HTML report and share ZIP.")
    parser.add_argument("--approval")
    parser.add_argument("--narrative")
    assessment = parser.add_mutually_exclusive_group()
    assessment.add_argument("--item-review")
    assessment.add_argument("--item-candidates")
    options = parser.parse_args()
    try:
        run(options)
    except (Exception, KeyboardInterrupt) as exc:
        private = Path(options.output_dir).resolve() / "_private"
        private.mkdir(parents=True, exist_ok=True)
        state = "cancelled" if isinstance(exc, KeyboardInterrupt) else "failed"
        review_only = options.mode == "review-items"
        status_name = "item-review-failure.json" if review_only else "status.json"
        error_name = "item-review-error.txt" if review_only else "error.txt"
        write_json(private / status_name, {"status": state, "error_type": type(exc).__name__})
        (private / error_name).write_text(traceback.format_exc(), encoding="utf-8")
        print(f"Advanced {'question review' if review_only else 'experiment'} {state}: {type(exc).__name__}. Details saved under _private/{error_name}; no success is claimed.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
