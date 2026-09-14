#!/usr/bin/env python
"""Run the EVE People Science analysis contract with vivaglint.

This script is intentionally thin. It imports the pinned vivaglint package,
runs requested codebooks, writes tabular artifacts, and emits a stable
analysis-manifest.json for downstream skills.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

import pandas as pd


RECOMMENDED_INSTALL = "vivaglint[all]==0.1.1"
SOURCE_REPO = "https://github.com/microsoft/vivaglint_py"
SOURCE_COMMIT = "761d847a8c8d38ff42c78b4501d761350c9fd03f"
DEFAULT_ANALYSES = [
    "descriptives",
    "response_distribution",
    "correlations",
    "factor_analysis",
    "cycle_comparisons",
    "by_attribute",
    "attrition",
]


@dataclass
class StepResult:
    name: str
    status: str
    artifact: str | None = None
    message: str | None = None

    def to_manifest(self) -> dict[str, str]:
        result = {"name": self.name, "status": self.status}
        if self.artifact:
            result["artifact"] = self.artifact
        if self.message:
            result["message"] = self.message
        return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run vivaglint analyses and write an EVE analysis manifest.")
    parser.add_argument("--config", required=True, help="Path to analysis-config.json.")
    parser.add_argument("--output-dir", required=True, help="Directory for artifacts and manifest.")
    parser.add_argument(
        "--skip-repeatability-check",
        action="store_true",
        help="Run once only. Intended for the internal second pass.",
    )
    return parser.parse_args()


def load_config(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        config = json.load(handle)

    required = ["survey_csv", "scale_points", "emp_id_col"]
    missing = [field for field in required if field not in config or config[field] in (None, "")]
    if missing:
        raise ValueError(f"Missing required config fields: {', '.join(missing)}")

    if not 2 <= int(config["scale_points"]) <= 11:
        raise ValueError("scale_points must be between 2 and 11.")

    config.setdefault("analyses", DEFAULT_ANALYSES)
    config.setdefault("min_group_size", 5)
    config.setdefault("attribute_cols", [])
    config.setdefault("input_format", "glint_export")
    return config


def write_csv(output_dir: Path, name: str, frame: pd.DataFrame) -> str:
    artifact = f"{name}.csv"
    frame.to_csv(output_dir / artifact, index=False)
    return artifact


def skip(name: str, reason: str) -> StepResult:
    return StepResult(name=name, status="skipped", message=reason)


def run_step(name: str, func: Callable[[], str]) -> StepResult:
    try:
        artifact = func()
    except (ValueError, FileNotFoundError, ImportError, KeyError) as exc:
        return StepResult(name=name, status="failed", message=str(exc))
    except Exception as exc:  # Surface unexpected package/runtime failures in the manifest.
        return StepResult(name=name, status="failed", message=f"{type(exc).__name__}: {exc}")
    return StepResult(name=name, status="completed", artifact=artifact)


def resolve_path(config_path: Path, value: str | None) -> Path | None:
    if not value:
        return None
    path = Path(value)
    if path.is_absolute():
        return path
    return (config_path.parent / path).resolve()


def dataframe_to_jsonable_summary(frame: pd.DataFrame) -> dict[str, Any]:
    return {
        "rows": int(frame.shape[0]),
        "columns": list(frame.columns),
    }


def detect_wide_item_columns(
    frame: pd.DataFrame,
    emp_id_col: str,
    attribute_cols: list[str],
    configured_question_cols: list[str] | None,
) -> list[str]:
    if configured_question_cols:
        missing = [col for col in configured_question_cols if col not in frame.columns]
        if missing:
            raise ValueError(f"Configured question columns not found: {', '.join(missing)}")
        return configured_question_cols

    reserved = {
        emp_id_col,
        "user_concat",
        "client_uuid",
        "survey_cycle_title",
        "survey_cycle_id",
        *attribute_cols,
    }
    question_cols = [
        col for col in frame.columns
        if col not in reserved and pd.api.types.is_numeric_dtype(frame[col])
    ]
    if not question_cols:
        raise ValueError("No numeric survey item columns found for wide_items input.")
    return question_cols


def load_survey(
    config: dict[str, Any],
    config_path: Path,
    survey_csv: Path,
):
    from vivaglint import read_glint_survey
    from vivaglint.import_ import build_glint_survey

    emp_id_col = config["emp_id_col"]
    input_format = config.get("input_format", "glint_export")
    if input_format == "glint_export":
        return read_glint_survey(str(survey_csv), emp_id_col=emp_id_col)

    if input_format != "wide_items":
        raise ValueError(f"Unsupported input_format: {input_format}")

    raw = pd.read_csv(survey_csv)
    attribute_cols = config.get("attribute_cols") or []
    attrition_attribute_cols = config.get("attrition_attribute_cols") or []
    all_attribute_cols = list(dict.fromkeys([
        *attribute_cols,
        *attrition_attribute_cols,
    ]))
    question_cols = detect_wide_item_columns(
        raw,
        emp_id_col=emp_id_col,
        attribute_cols=all_attribute_cols,
        configured_question_cols=config.get("question_cols"),
    )

    passthrough_cols = [
        col for col in ["Survey Cycle Completion Date", *all_attribute_cols]
        if col in raw.columns
    ]
    data = raw[[emp_id_col, *passthrough_cols, *question_cols]].copy()
    for question in question_cols:
        data[f"{question}_COMMENT"] = ""
        data[f"{question}_COMMENT_TOPICS"] = ""
        data[f"{question}_SENSITIVE_COMMENT_FLAG"] = ""

    survey = build_glint_survey(
        data,
        emp_id_col=emp_id_col,
        first_name_col=None,
        last_name_col=None,
        email_col=None,
        status_col=None,
        completion_date_col=None,
        sent_date_col=None,
        manager_id_col=None,
        file_path=str(survey_csv),
    )
    survey.metadata["attribute_cols"] = attribute_cols
    survey.metadata["attrition_attribute_cols"] = attrition_attribute_cols
    survey.metadata["input_format"] = input_format
    survey.metadata["question_cols"] = question_cols
    return survey


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def compare_repeatability(
    config_path: Path,
    output_dir: Path,
    artifacts: dict[str, str],
) -> dict[str, Any]:
    verification_dir = output_dir / "_repeatability_run"
    if verification_dir.exists():
        shutil.rmtree(verification_dir)
    verification_dir.mkdir(parents=True)

    command = [
        sys.executable,
        str(Path(__file__).resolve()),
        "--config",
        str(config_path),
        "--output-dir",
        str(verification_dir),
        "--skip-repeatability-check",
    ]
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    result: dict[str, Any] = {
        "enabled": True,
        "runs": 2,
        "status": "passed",
        "verification_dir": str(verification_dir),
        "compared_artifacts": [],
        "mismatches": [],
    }

    if completed.returncode != 0:
        result["status"] = "failed"
        result["mismatches"].append(
            {
                "artifact": "verification_run",
                "message": completed.stderr.strip() or completed.stdout.strip(),
            }
        )
        return result

    verification_manifest_path = verification_dir / "analysis-manifest.json"
    if not verification_manifest_path.exists():
        result["status"] = "failed"
        result["mismatches"].append(
            {
                "artifact": "analysis-manifest.json",
                "message": "Verification manifest was not created.",
            }
        )
        return result

    verification_manifest = json.loads(verification_manifest_path.read_text(encoding="utf-8"))
    verification_artifacts = verification_manifest.get("artifacts", {})

    if set(artifacts) != set(verification_artifacts):
        result["status"] = "failed"
        result["mismatches"].append(
            {
                "artifact": "artifact_set",
                "message": "Primary and verification runs produced different artifact sets.",
                "primary": sorted(artifacts),
                "verification": sorted(verification_artifacts),
            }
        )

    for key, relative_path in sorted(artifacts.items()):
        primary_path = output_dir / relative_path
        verification_relative = verification_artifacts.get(key)
        verification_path = verification_dir / verification_relative if verification_relative else None
        if verification_path is None or not verification_path.exists():
            result["status"] = "failed"
            result["mismatches"].append(
                {
                    "artifact": key,
                    "message": "Artifact missing from verification run.",
                }
            )
            continue

        primary_hash = file_sha256(primary_path)
        verification_hash = file_sha256(verification_path)
        result["compared_artifacts"].append(
            {
                "artifact": key,
                "primary_sha256": primary_hash,
                "verification_sha256": verification_hash,
            }
        )
        if primary_hash != verification_hash:
            result["status"] = "failed"
            result["mismatches"].append(
                {
                    "artifact": key,
                    "message": "Artifact hash mismatch across repeated runs.",
                    "primary_sha256": primary_hash,
                    "verification_sha256": verification_hash,
                }
            )

    return result


def main() -> int:
    args = parse_args()
    config_path = Path(args.config).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    config = load_config(config_path)

    import vivaglint
    from vivaglint import (
        analyze_attrition,
        analyze_by_attributes,
        compare_cycles,
        extract_questions,
        extract_survey_factors,
        get_correlations,
        get_response_dist,
        summarize_survey,
    )

    survey_csv = resolve_path(config_path, config["survey_csv"])
    if survey_csv is None or not survey_csv.exists():
        raise FileNotFoundError(f"Survey CSV not found: {survey_csv}")

    scale_points = int(config["scale_points"])
    emp_id_col = config["emp_id_col"]
    min_group_size = int(config.get("min_group_size", 5))
    requested = set(config.get("analyses", DEFAULT_ANALYSES))

    survey = load_survey(config, config_path, survey_csv)
    questions = extract_questions(survey)

    artifacts: dict[str, str] = {}
    analyses: list[StepResult] = []
    warnings: list[str] = []

    if len(survey.data) < 30:
        warnings.append("The sample has fewer than 30 rows; inferential and factor results should be treated as unstable.")
    if min_group_size < 5:
        warnings.append("min_group_size is below the recommended default of 5.")

    if "descriptives" in requested:
        def descriptives() -> str:
            frame = summarize_survey(survey, scale_points=scale_points)
            return write_csv(output_dir, "descriptives", frame)
        result = run_step("descriptives", descriptives)
        analyses.append(result)
        if result.artifact:
            artifacts["descriptives"] = result.artifact

    if "response_distribution" in requested:
        def response_distribution() -> str:
            frame = get_response_dist(survey)
            return write_csv(output_dir, "response_distribution", frame)
        result = run_step("response_distribution", response_distribution)
        analyses.append(result)
        if result.artifact:
            artifacts["response_distribution"] = result.artifact

    if "correlations" in requested:
        def correlations() -> str:
            frame = get_correlations(survey, method="pearson", format="long")
            return write_csv(output_dir, "correlations", frame)
        result = run_step("correlations", correlations)
        analyses.append(result)
        if result.artifact:
            artifacts["correlations"] = result.artifact

    if "factor_analysis" in requested:
        def factor_analysis() -> str:
            result = extract_survey_factors(survey, rotation="varimax")
            frame = result["factor_summary"]
            return write_csv(output_dir, "factor_analysis_summary", frame)
        result = run_step("factor_analysis", factor_analysis)
        analyses.append(result)
        if result.artifact:
            artifacts["factor_analysis"] = result.artifact

    if "cycle_comparisons" in requested:
        cycle_csvs = config.get("cycle_csvs") or []
        if len(cycle_csvs) < 2:
            analyses.append(skip("cycle_comparisons", "At least two cycle_csvs are required."))
        else:
            def cycle_comparisons() -> str:
                from vivaglint import read_glint_survey
                cycle_surveys = [
                    read_glint_survey(str(resolve_path(config_path, item["path"])), emp_id_col=emp_id_col)
                    for item in cycle_csvs
                ]
                cycle_names = [item["name"] for item in cycle_csvs]
                frame = compare_cycles(*cycle_surveys, scale_points=scale_points, cycle_names=cycle_names)
                return write_csv(output_dir, "cycle_comparisons", frame)
            result = run_step("cycle_comparisons", cycle_comparisons)
            analyses.append(result)
            if result.artifact:
                artifacts["cycle_comparisons"] = result.artifact

    if "by_attribute" in requested:
        attribute_file = resolve_path(config_path, config.get("attribute_file"))
        attribute_cols = config.get("attribute_cols") or []
        attribute_view_mode = config.get("attribute_view_mode", "combined")
        missing_attribute_cols = [
            col for col in attribute_cols
            if col not in survey.data.columns
        ]
        if not attribute_cols:
            analyses.append(skip("by_attribute", "attribute_cols are required."))
        elif not attribute_file and missing_attribute_cols:
            analyses.append(skip("by_attribute", "attribute_file is required because attribute columns are not already present in the survey data."))
        else:
            def by_attribute() -> str:
                if attribute_view_mode == "separate":
                    frames = []
                    for attribute_col in attribute_cols:
                        attribute_frame = analyze_by_attributes(
                            survey,
                            attribute_file=str(attribute_file) if attribute_file else None,
                            scale_points=scale_points,
                            attribute_cols=[attribute_col],
                            emp_id_col=emp_id_col,
                            min_group_size=min_group_size,
                        ).rename(columns={attribute_col: "attribute_value"})
                        attribute_frame.insert(0, "attribute_name", attribute_col)
                        frames.append(attribute_frame)
                    frame = pd.concat(frames, ignore_index=True, sort=False)
                    return write_csv(output_dir, "by_attribute", frame)

                frame = analyze_by_attributes(
                    survey,
                    attribute_file=str(attribute_file) if attribute_file else None,
                    scale_points=scale_points,
                    attribute_cols=attribute_cols,
                    emp_id_col=emp_id_col,
                    min_group_size=min_group_size,
                )
                return write_csv(output_dir, "by_attribute", frame)
            result = run_step("by_attribute", by_attribute)
            analyses.append(result)
            if result.artifact:
                artifacts["by_attribute"] = result.artifact

    if "attrition" in requested:
        attrition_file = resolve_path(config_path, config.get("attrition_file"))
        term_date_col = config.get("term_date_col")
        if not attrition_file or not term_date_col:
            analyses.append(skip("attrition", "attrition_file and term_date_col are required."))
        else:
            def attrition() -> str:
                attrition_attribute_cols = config.get(
                    "attrition_attribute_cols",
                    ["tenure", "organization"],
                )
                missing_attrition_cols = [
                    col for col in attrition_attribute_cols
                    if col not in survey.data.columns
                ]
                if missing_attrition_cols:
                    raise ValueError(
                        "Default attrition attribute column(s) not found: "
                        + ", ".join(missing_attrition_cols)
                    )

                common_args = {
                    "survey": survey,
                    "attrition_file": str(attrition_file),
                    "emp_id_col": emp_id_col,
                    "term_date_col": term_date_col,
                    "scale_points": scale_points,
                    "time_periods": config.get(
                        "attrition_time_periods",
                        [90, 180, 365],
                    ),
                    "min_group_size": min_group_size,
                }
                frames = []
                overall = analyze_attrition(**common_args)
                overall.insert(0, "attribute_value", "")
                overall.insert(0, "attribute_name", "")
                overall.insert(0, "analysis_scope", "overall")
                frames.append(overall)

                for attribute_col in attrition_attribute_cols:
                    segmented = analyze_attrition(
                        **common_args,
                        attribute_cols=[attribute_col],
                    ).rename(columns={attribute_col: "attribute_value"})
                    segmented.insert(0, "attribute_name", attribute_col)
                    segmented.insert(0, "analysis_scope", "attribute")
                    frames.append(segmented)

                frame = pd.concat(frames, ignore_index=True, sort=False)
                return write_csv(output_dir, "attrition", frame)
            result = run_step("attrition", attrition)
            analyses.append(result)
            if result.artifact:
                artifacts["attrition"] = result.artifact

    failed = [item for item in analyses if item.status == "failed"]
    completed = [item for item in analyses if item.status == "completed"]
    readiness_reasons = []
    if failed:
        readiness_reasons.append("One or more requested analyses failed.")
    if "descriptives" not in artifacts:
        readiness_reasons.append("Descriptives are missing; downstream interpretation should not proceed.")
    if len(survey.data) < 30:
        readiness_reasons.append("Small sample size limits interpretation readiness.")

    manifest = {
        "schema_version": "1.0.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "engine": {
            "package": "vivaglint",
            "version": getattr(vivaglint, "__version__", "unknown"),
            "recommended_install": RECOMMENDED_INSTALL,
            "source_repo": SOURCE_REPO,
            "source_commit": SOURCE_COMMIT,
        },
        "input_profile": {
            "n_rows": int(len(survey.data)),
            "n_questions": int(len(questions)),
            "emp_id_col": emp_id_col,
            "scale_points": scale_points,
            "attribute_cols": config.get("attribute_cols") or [],
            "input_format": config.get("input_format", "glint_export"),
        },
        "analyses": [item.to_manifest() for item in analyses],
        "artifacts": artifacts,
        "warnings": warnings,
        "interpretation_readiness": {
            "ready": not readiness_reasons,
            "reasons": readiness_reasons,
        },
        "artifact_summaries": {
            key: dataframe_to_jsonable_summary(pd.read_csv(output_dir / path))
            for key, path in artifacts.items()
        },
    }

    repeatability_check = {
        "enabled": False,
        "runs": 1,
        "status": "skipped",
        "compared_artifacts": [],
        "mismatches": [],
    }
    if not args.skip_repeatability_check:
        repeatability_check = compare_repeatability(config_path, output_dir, artifacts)
        manifest["repeatability_check"] = repeatability_check
        if repeatability_check["status"] != "passed":
            manifest["interpretation_readiness"]["ready"] = False
            manifest["interpretation_readiness"]["reasons"].append(
                "Repeatability check failed; do not interpret outputs until mismatches are resolved."
            )
    else:
        manifest["repeatability_check"] = repeatability_check

    with (output_dir / "analysis-manifest.json").open("w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")

    report_status = "skipped"
    report_failed = False
    if (
        not args.skip_repeatability_check
        and not failed
        and repeatability_check["status"] == "passed"
    ):
        report_command = [
            sys.executable,
            str(Path(__file__).with_name("build_interactive_report.py")),
            "--config",
            str(config_path),
            "--output-dir",
            str(output_dir),
        ]
        report_process = subprocess.run(
            report_command,
            capture_output=True,
            text=True,
            check=False,
        )
        if report_process.returncode == 0:
            report_status = "completed"
        else:
            report_status = "failed"
            report_failed = True
            print(
                report_process.stderr.strip() or report_process.stdout.strip(),
                file=sys.stderr,
            )

    print(json.dumps({
        "output_dir": str(output_dir),
        "completed": len(completed),
        "failed": len(failed),
        "repeatability": repeatability_check["status"],
        "report": report_status,
    }, indent=2))
    return 1 if failed or repeatability_check["status"] == "failed" or report_failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
