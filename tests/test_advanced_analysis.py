import argparse
import json
import re
import sys
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from jsonschema.exceptions import ValidationError

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import run_advanced_survey_analysis as runner


@pytest.fixture
def study(tmp_path):
    rng = np.random.default_rng(42)
    frame = pd.DataFrame({
        "respondent": np.arange(240),
        "Q_work": rng.uniform(1, 5, 240),
        "Q_support": rng.uniform(1, 5, 240),
        "PRIVATE_COMMENT": ["PRIVATE_EMPLOYEE_SENTINEL"] * 240,
    })
    frame["Q_outcome"] = 1 + 0.6 * (frame["Q_work"] - 1) + rng.uniform(0, 0.4, 240)
    source = tmp_path / "confidential.csv"
    frame.to_csv(source, index=False)
    config = {
        "schema_version": "1.0.0",
        "source": {"path": str(source), "sha256": runner.file_hash(source)},
        "experiment": {
            "task": "regression", "features": ["Q_work", "Q_support"],
            "target": "Q_outcome", "group": "respondent", "seed": 42,
            "score_scale": 5, "min_group_size": 5, "metric": "mae",
            "utility_threshold": 0.5,
            "validation": {"kind": "group", "folds": 3, "holdout_fraction": 0.2, "unseen_groups": True},
            "models": [
                {"id": "baseline", "method": "dummy"},
                {"id": "linear", "method": "linear"},
                {"id": "forest", "method": "random_forest", "parameters": {"n_estimators": 8}},
                {"id": "boost", "method": "gradient_boosting", "parameters": {"n_estimators": 8}},
            ],
            "budget": {"threads": 1, "max_trials": 8, "max_rows": 500, "max_seconds": 60},
        },
    }
    return tmp_path, frame, config


def options(study, config, mode="fit", run_name="run", actions=None):
    root = study[0]
    path = root / f"{run_name}-config.json"
    runner.write_json(path, config)
    approval = root / f"{run_name}-approval.json"
    runner.write_json(approval, {
        "approved": True, "config_sha256": runner.digest(config),
        "actions": actions if actions is not None else ["fit", "replay"],
    })
    return argparse.Namespace(
        config=str(path), project_dir=str(root / "project"),
        output_dir=str(root / "project" / run_name), mode=mode,
        approval=str(approval), narrative=None, frozen_from=None,
    )


def test_source_bound_consent_and_no_autonomous_tuning(study):
    config = study[2]
    opt = options(study, config)
    opt.approval = None
    with pytest.raises(PermissionError):
        runner.run(opt)
    opt = options(study, config)
    config["experiment"]["seed"] = 43
    runner.write_json(Path(opt.config), config)
    with pytest.raises(PermissionError, match="stale"):
        runner.run(opt)
    config["experiment"]["models"][2]["grid"] = {"max_depth": [2, 4]}
    opt = options(study, config, actions=["fit", "replay"])
    with pytest.raises(PermissionError, match="tune mode"):
        runner.run(opt)
    opt = options(study, config, mode="tune", actions=["fit", "replay"])
    with pytest.raises(PermissionError):
        runner.run(opt)


def test_end_to_end_report_replay_and_privacy(study):
    opt = options(study, study[2])
    runner.run(opt)
    output = Path(opt.output_dir)
    manifest = json.loads((output / "advanced-analysis-manifest.json").read_text())
    assert manifest["status"] == "completed"
    assert manifest["qa"]["repeatability"] == "passed"
    assert manifest["summary"]["development_reference"]["meets_utility_criterion"]
    assert manifest["interpretation"]["status"] == "unavailable"
    assert (output / "_private/frozen-config.json").is_file()
    with zipfile.ZipFile(output / "advanced-share.zip") as archive:
        assert "OPEN_REPORT.html" in archive.namelist()
        assert not any(name.startswith("_") for name in archive.namelist())
        for name in archive.namelist():
            content = archive.read(name).decode()
            assert "PRIVATE_EMPLOYEE_SENTINEL" not in content
            assert str(study[0]) not in content
            assert "development_indices" not in content
            assert "holdout_indices" not in content
        notebook = json.loads(archive.read("experiment.ipynb"))
        cell = notebook["cells"][1]
        assert cell["outputs"] == [] and cell["execution_count"] is None
        compile("".join(cell["source"]), "notebook", "exec")
    with pytest.raises(ValueError, match="history"):
        runner.run(opt)


def test_code_only_does_not_read_or_fit_data(study, monkeypatch):
    import vivaglint.modeling

    def forbidden(*args, **kwargs):
        pytest.fail("Code-only mode tried to execute a model.")

    monkeypatch.setattr(vivaglint.modeling, "run_model_experiment", forbidden)
    config = study[2]
    config["source"]["path"] = "UNAVAILABLE.csv"
    opt = options(study, config, mode="code", actions=["code"])
    runner.run(opt)
    manifest = json.loads((Path(opt.output_dir) / "advanced-analysis-manifest.json").read_text())
    assert manifest["status"] == "not_run"
    assert manifest["qa"]["verdict"] == "Not ready"
    html = (Path(opt.output_dir) / "advanced-report.html").read_text(encoding="utf-8")
    assert '<div id="svd-visuals" hidden>' in html
    assert html.count("<h3>How to action these results</h3>") == 6


@pytest.mark.parametrize("task", ["regression", "svd"])
def test_report_leads_with_svd_and_explains_each_section(study, task):
    config = study[2]
    if task == "svd":
        config["experiment"].update(task="svd", models=[], components=2, metric="reconstruction_rmse")
    opt = options(study, config)
    runner.run(opt)
    html = (Path(opt.output_dir) / "advanced-report.html").read_text(encoding="utf-8")
    expected = ["svd", "comparison", "diagnostics", "interpretation", "methodology", "downloads"]
    assert re.findall(r'<section id="([^"]+)"', html) == expected
    nav = re.search(r'<nav aria-label="Report sections">(.*?)</nav>', html, re.DOTALL).group(1)
    assert re.findall(r'href="#([^"]+)"', nav) == expected
    intros = dict(re.findall(
        r'<section id="([^"]+)"[^>]*>.*?<p class="section-intro muted">(.*?)</p>',
        html, re.DOTALL,
    ))
    assert set(intros) == set(expected)
    assert all(intro.strip() for intro in intros.values())
    assert "Singular value decomposition" in intros["svd"]
    assert "variance" in intros["svd"]
    assert "not a validated measurement model" in intros["svd"]
    actions = re.findall(
        r'<div class="section-action"><h3>How to action these results</h3><p>(.*?)</p></div>',
        html, re.DOTALL,
    )
    assert len(actions) == len(expected)
    assert "not a causal priority for intervention" in actions[0]
    assert "untouched-holdout evaluation" in actions[1]
    assert "obtain explicit instruction" in actions[2]


def test_final_holdout_requires_frozen_plan_and_cannot_be_reused(study):
    initial = options(study, study[2])
    runner.run(initial)
    frozen_path = Path(initial.output_dir) / "_private/frozen-config.json"
    frozen = json.loads(frozen_path.read_text())
    final = options(study, frozen, "evaluate", "final", ["fit", "replay", "evaluate"])
    with pytest.raises(ValueError, match="frozen-from"):
        runner.run(final)
    final.frozen_from = str(frozen_path)
    runner.run(final)
    manifest = json.loads((Path(final.output_dir) / "advanced-analysis-manifest.json").read_text())
    assert manifest["summary"]["holdout_evaluated"]
    second = options(study, frozen, "evaluate", "second", ["fit", "replay", "evaluate"])
    second.frozen_from = str(frozen_path)
    with pytest.raises(ValueError, match="consumed"):
        runner.run(second)


def test_external_data_needs_consent_cardinality_and_time_checks(study):
    root, frame, config = study
    extra = root / "extra.csv"
    frame[["respondent"]].assign(operational_index=2).to_csv(extra, index=False)
    config["joins"] = [{
        "source": {"path": str(extra), "sha256": runner.file_hash(extra)},
        "key": "respondent", "columns": ["operational_index"],
        "eligibility_confirmed": True, "provenance_confirmed": True,
    }]
    config["experiment"]["features"].append("operational_index")
    opt = options(study, config)
    with pytest.raises(PermissionError):
        runner.run(opt)
    with pytest.raises(PermissionError):
        runner.run(options(study, config, "inspect"))
    joined = runner.load_data(config, root, root / "private")
    assert len(joined) == len(frame)
    external = pd.read_csv(extra)
    pd.concat([external, external.iloc[:1]]).to_csv(extra, index=False)
    config["joins"][0]["source"]["sha256"] = runner.file_hash(extra)
    with pytest.raises(ValueError, match="many-to-one"):
        runner.load_data(config, root, root / "private")


def test_project_preserves_holdout_while_allowing_approved_model_seed_changes(study):
    initial = options(study, study[2])
    runner.run(initial)
    expected = json.loads((Path(initial.output_dir) / "_private/split-membership.json").read_text())
    config = study[2]
    config["experiment"]["seed"] += 1
    with pytest.raises(ValueError, match="reserved holdout design"):
        runner.run(options(study, config, run_name="moved-holdout"))
    config["experiment"]["split_seed"] = 42
    revised = options(study, config, run_name="new-model-seed")
    runner.run(revised)
    actual = json.loads((Path(revised.output_dir) / "_private/split-membership.json").read_text())
    assert actual == expected


def test_stale_research_narrative_cannot_be_embedded(study):
    opt = options(study, study[2])
    runner.run(opt)
    output = Path(opt.output_dir)
    manifest = json.loads((output / "advanced-analysis-manifest.json").read_text())
    narrative = {
        "config_sha256": manifest["config_sha256"],
        "summary_sha256": runner.digest(manifest["summary"]),
        "approved_for_sharing": True,
        "required_references_complete": True,
        "reference_revision": "synthetic-test-fixture",
        "claims": [{
            "observation": "Synthetic fixture only.",
            "interpretation": "Test serialization, not a research claim.",
            "hypothesis": "", "next_check": "Review the fixture.", "caveat": "Not real data.",
            "sources": [{"url": "https://learn.microsoft.com/en-us/viva/glint/", "title": "Synthetic citation fixture", "body_reviewed": True}],
        }],
    }
    path = study[0] / "narrative.json"
    runner.write_json(path, narrative)
    runner.embed_interpretation(manifest, path)
    assert manifest["interpretation"]["status"] == "reviewed"
    narrative["summary_sha256"] = "0" * 64
    runner.write_json(path, narrative)
    with pytest.raises(ValueError, match="stale"):
        runner.embed_interpretation(manifest, path)


def test_schema_does_not_accept_basic_or_unbounded_config(study):
    config = study[2]
    config["experiment"]["budget"]["max_trials"] = 9999
    with pytest.raises(Exception, match="maximum"):
        runner.validate(config, "advanced-analysis-config.schema.json")
    assert json.loads((ROOT / "schemas/analysis-manifest.schema.json").read_text())["properties"]["schema_version"]["const"] == "1.0.0"


def test_svd_runs_without_a_predictive_leaderboard(study):
    config = study[2]
    config["experiment"].update(task="svd", models=[], components=2, metric="reconstruction_rmse")
    opt = options(study, config)
    runner.run(opt)
    output = Path(opt.output_dir)
    summary = json.loads((output / "advanced-analysis-manifest.json").read_text())["summary"]
    assert summary["models"] == []
    assert len(summary["svd"]["components"]) == 2
    assert any(value < 0 for row in summary["svd"]["components"] for value in row)
    html = (output / "advanced-report.html").read_text(encoding="utf-8")
    payload = json.loads(re.search(
        r'<script id="aggregate-data" type="application/json">(.*?)</script>', html, re.DOTALL,
    ).group(1))
    assert payload["summary"]["svd"] == summary["svd"]
    assert 'id="svd-chart"' in html and 'id="svd-components"' in html
    assert 'data-table="svd-weights-table"' in html
    assert "not factor loadings" in html
    assert 'id="item-removal-review"' in html
    assert "No removals recommended - assessment incomplete." in html
    assert "not proof that every question must stay" in html


def item_review_for(manifest, decision="remove"):
    return {
        "config_sha256": manifest["config_sha256"],
        "summary_sha256": runner.digest(manifest["summary"]),
        "approved_for_sharing": True,
        "protected_items_reviewed": True,
        "content_coverage_reviewed": True,
        "proposed_set_evidence": "The final retained synthetic representative preserves content and the response span.",
        "protected_items": ["Q_work"],
        "items": [
            {"question": "Q_work", "decision": "retain", "reason": "Retain the protected representative."},
            {
                "question": "Q_support", "decision": decision,
                "reason": "Synthetic duplicate reviewed; the protected representative remains.",
                "retained_alternative": "Q_work",
                "redundancy_evidence": "Exact duplicated responses in the synthetic fixture.",
                "coverage_evidence": "The synthetic duplicate adds no distinct content.",
                "stability_evidence": "Keeping one exact copy preserves the one-dimensional response span.",
            },
        ],
    }


@pytest.mark.parametrize("decision", ["remove", "retain", "insufficient_evidence"])
def test_review_items_attaches_reasons_without_refitting(study, monkeypatch, decision):
    root, frame, config = study
    frame["Q_support"] = frame["Q_work"]
    frame.to_csv(root / "confidential.csv", index=False)
    config["source"]["sha256"] = runner.file_hash(root / "confidential.csv")
    config["experiment"].update(task="svd", models=[], components=1, metric="reconstruction_rmse")
    fitted = options(study, config)
    runner.run(fitted)
    output = Path(fitted.output_dir)
    original = json.loads((output / "advanced-analysis-manifest.json").read_text())
    protected = {path.name: path.read_bytes() for path in (output / "_private").iterdir() if path.is_file()}
    review = item_review_for(original, decision)
    if decision != "remove":
        review["items"][1]["reason"] = "No removal justified: retain pending further content and stability evidence."
    path = root / "item-review.json"
    runner.write_json(path, review)

    def forbidden(*args, **kwargs):
        pytest.fail("Question review tried to read respondent data or refit.")

    monkeypatch.setattr(runner, "load_data", forbidden)
    import vivaglint.modeling
    monkeypatch.setattr(vivaglint.modeling, "run_model_experiment", forbidden)
    denied = options(study, config, mode="review-items", actions=["fit", "replay"])
    denied.item_review = str(path)
    with pytest.raises(PermissionError):
        runner.run(denied)
    if decision == "remove":
        monkeypatch.setattr(sys, "argv", [
            str(ROOT / "scripts" / "run_advanced_survey_analysis.py"),
            "--config", denied.config, "--project-dir", denied.project_dir,
            "--output-dir", denied.output_dir, "--mode", "review-items",
            "--approval", denied.approval, "--item-review", str(path),
        ])
        assert runner.main() == 1
        assert (output / "_private" / "item-review-failure.json").is_file()
        assert json.loads((output / "advanced-analysis-manifest.json").read_text()) == original
    opt = options(study, config, mode="review-items", actions=["interpret", "share"])
    opt.item_review = str(path)
    runner.run(opt)
    updated = json.loads((output / "advanced-analysis-manifest.json").read_text())
    assert updated["item_review"] == review
    for key in ("summary", "provenance", "qa"):
        assert updated[key] == original[key]
    assert all((output / "_private" / name).read_bytes() == value for name, value in protected.items())
    with zipfile.ZipFile(output / "advanced-share.zip") as archive:
        assert json.loads(archive.read("question-removal-review.json")) == review
    assert json.loads((output / "question-removal-review.json").read_text()) == review


@pytest.mark.parametrize("invalid", [
    "stale_config", "stale_summary", "duplicate_item", "unknown_item",
    "protected_removal", "missing_stability", "missing_set_review", "remove_both_representatives",
])
def test_item_review_rejects_unsupported_removals(invalid):
    from build_advanced_analysis_report import validate_item_review

    manifest = {
        "config_sha256": "a" * 64, "status": "completed",
        "qa": {"repeatability": "passed", "verdict": "Use with caveats"},
        "summary": {"task": "svd", "svd": {"features": ["Q_work", "Q_support"]}},
    }
    review = item_review_for(manifest)
    if invalid == "stale_config":
        review["config_sha256"] = "b" * 64
    elif invalid == "stale_summary":
        review["summary_sha256"] = "b" * 64
    elif invalid == "duplicate_item":
        review["items"].append(review["items"][0])
    elif invalid == "unknown_item":
        review["items"][1]["question"] = "Q_unfitted"
    elif invalid == "protected_removal":
        review["protected_items"].append("Q_support")
    elif invalid == "missing_stability":
        review["items"][1]["stability_evidence"] = " "
    elif invalid == "missing_set_review":
        review.pop("proposed_set_evidence")
    else:
        review["protected_items"] = []
        review["items"][0].update(
            decision="remove", retained_alternative="Q_support",
            redundancy_evidence="Synthetic duplicate.", coverage_evidence="Same synthetic topic.",
            stability_evidence="Same response span.",
        )
    with pytest.raises((ValueError, ValidationError)):
        validate_item_review(manifest, review)


def test_skill_has_proactive_collaboration_not_autonomous_tuning():
    skill = (ROOT / "skills/analyze-survey-advanced/SKILL.md").read_text()
    workflow = (ROOT / "skills/analyze-survey-advanced/references/modeling-workflow.md").read_text()
    assert "Never tune by yourself unless the user instructs you to" in skill
    assert "Proactively discuss tuning and additional context" in workflow
    assert "external dataset" in workflow
    assert "specific company information" in skill


def test_authorized_finite_tuning_preserves_comparison_and_replays_only_winner(study):
    config = study[2]
    config["experiment"]["models"] = [{
        "id": "forest", "method": "random_forest",
        "parameters": {"n_estimators": 5}, "grid": {"max_depth": [2, 4]},
    }]
    opt = options(study, config, "tune", actions=["fit", "replay", "tune"])
    runner.run(opt)
    output = Path(opt.output_dir)
    manifest = json.loads((output / "advanced-analysis-manifest.json").read_text())
    frozen = json.loads((output / "_private/frozen-config.json").read_text())
    assert len(manifest["summary"]["models"]) == 2
    assert len(frozen["experiment"]["models"]) == 1
    assert "grid" not in frozen["experiment"]["models"][0]
    assert manifest["qa"]["repeatability"] == "passed"


def test_join_rejects_future_data(study):
    root, frame, config = study
    frame["survey_time"] = "2024-01-01"
    frame.to_csv(config["source"]["path"], index=False)
    config["source"]["sha256"] = runner.file_hash(Path(config["source"]["path"]))
    config["experiment"]["time"] = "survey_time"
    extra = root / "future.csv"
    frame[["respondent"]].assign(operational_index=2, available="2025-01-01").to_csv(extra, index=False)
    config["joins"] = [{
        "source": {"path": str(extra), "sha256": runner.file_hash(extra)},
        "key": "respondent", "columns": ["operational_index"], "available_at": "available",
        "eligibility_confirmed": True, "provenance_confirmed": True,
    }]
    with pytest.raises(ValueError, match="unavailable"):
        runner.load_data(config, root, root / "private")


def test_source_change_after_approval_is_rejected(study):
    config = study[2]
    opt = options(study, config)
    Path(config["source"]["path"]).write_text("different data", encoding="utf-8")
    with pytest.raises(ValueError, match="Source changed"):
        runner.run(opt)


def test_interpret_mode_does_not_reload_private_source(study):
    opt = options(study, study[2])
    runner.run(opt)
    output = Path(opt.output_dir)
    manifest = json.loads((output / "advanced-analysis-manifest.json").read_text())
    narrative = {
        "config_sha256": manifest["config_sha256"], "summary_sha256": runner.digest(manifest["summary"]),
        "approved_for_sharing": True, "reference_revision": "synthetic-only",
        "required_references_complete": True,
        "claims": [{
            "observation": "</script><script>window.injected=true</script>",
            "interpretation": "Synthetic serialization fixture, not research.",
            "hypothesis": "", "next_check": "Review.", "caveat": "Test only.",
            "sources": [{"url": "https://learn.microsoft.com/en-us/viva/glint/", "title": "Synthetic fixture", "body_reviewed": True}],
        }],
    }
    path = study[0] / "narrative.json"
    runner.write_json(path, narrative)
    Path(study[2]["source"]["path"]).unlink()
    opt.mode = "interpret"
    opt.narrative = str(path)
    runner.write_json(Path(opt.approval), {
        "approved": True, "config_sha256": runner.digest(study[2]), "actions": ["interpret", "share"],
    })
    runner.run(opt)
    html = (output / "advanced-report.html").read_text()
    assert "</script><script>window.injected" not in html
    assert "\\u003c/script\\u003e" in html
