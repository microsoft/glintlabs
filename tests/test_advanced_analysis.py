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
        approval=str(approval), narrative=None, frozen_from=None, delivery="report",
    )


def test_default_cli_delivery_keeps_aggregate_outputs_without_html(study, monkeypatch):
    import build_advanced_analysis_report as report

    def forbidden(*args, **kwargs):
        pytest.fail("Chat code-only delivery tried to read respondent data.")

    monkeypatch.setattr(runner, "load_data", forbidden)
    monkeypatch.setattr(report, "TEMPLATE", study[0] / "missing-template.html")
    opt = options(study, study[2], mode="code", actions=["code"])
    monkeypatch.setattr(sys, "argv", [
        "run_advanced_survey_analysis.py", "--config", opt.config,
        "--project-dir", opt.project_dir, "--output-dir", opt.output_dir,
        "--mode", "code", "--approval", opt.approval,
    ])
    assert runner.main() == 0
    output = Path(opt.output_dir)
    manifest = json.loads((output / "advanced-analysis-manifest.json").read_text())
    assert manifest["status"] == "not_run"
    assert manifest["qa"]["verdict"] == "Not ready"
    names = {item["path"] for item in manifest["artifacts"]}
    assert names == {
        "experiment-template.json", "experiment.ipynb", "reproduce.py",
        "model-diagnostics.json", "model-comparison.csv",
    }
    assert all(runner.file_hash(output / item["path"]) == item["sha256"] for item in manifest["artifacts"])
    assert not list(output.glob("*.html"))
    assert not list(output.glob("*.zip"))
    assert not (output / "SHARING_README.txt").exists()


@pytest.mark.parametrize("task", ["regression", "svd"])
def test_chat_fit_preserves_verified_diagnostics_without_html(study, task):
    config = study[2]
    if task == "svd":
        config["experiment"].update(task="svd", models=[], components=2, metric="reconstruction_rmse")
    opt = options(study, config)
    opt.delivery = "chat"
    runner.run(opt)
    output = Path(opt.output_dir)
    manifest = json.loads((output / "advanced-analysis-manifest.json").read_text())
    assert manifest["status"] == "completed"
    assert manifest["qa"]["repeatability"] == "passed"
    assert json.loads((output / "model-diagnostics.json").read_text()) == manifest["summary"]
    assert manifest["summary"]["svd" if task == "svd" else "models"]
    assert manifest["interpretation"]["status"] == "unavailable"
    assert (output / "_private" / "frozen-config.json").is_file()
    assert not list(output.glob("*.html"))
    assert not list(output.glob("*.zip"))
    assert "PRIVATE_EMPLOYEE_SENTINEL" not in json.dumps(manifest)


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
    study[2]["survey"] = {
        "name": "Engagement pulse", "invited_count": 300, "respondent_column": "respondent",
    }
    opt = options(study, study[2])
    runner.run(opt)
    output = Path(opt.output_dir)
    manifest = json.loads((output / "advanced-analysis-manifest.json").read_text())
    assert manifest["status"] == "completed"
    assert manifest["qa"]["repeatability"] == "passed"
    assert manifest["summary"]["development_reference"]["meets_utility_criterion"]
    assert manifest["interpretation"]["status"] == "unavailable"
    assert manifest["survey"] == {
        "name": "Engagement pulse", "response_count": 240, "feature_count": 2,
        "invited_count": 300, "response_rate": 80,
    }
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
        assert json.loads(archive.read("advanced-analysis-manifest.json"))["survey"] == manifest["survey"]
        cell = notebook["cells"][1]
        assert cell["outputs"] == [] and cell["execution_count"] is None
        compile("".join(cell["source"]), "notebook", "exec")
    with pytest.raises(ValueError, match="history"):
        runner.run(opt)


@pytest.mark.parametrize("task", ["regression", "svd"])
def test_code_only_does_not_read_or_fit_data(study, monkeypatch, task):
    import vivaglint.modeling

    def forbidden(*args, **kwargs):
        pytest.fail("Code-only mode tried to execute a model.")

    monkeypatch.setattr(vivaglint.modeling, "run_model_experiment", forbidden)
    config = study[2]
    if task == "svd":
        config["experiment"].update(task="svd", models=[], components=2, metric="reconstruction_rmse")
    config["source"]["path"] = "UNAVAILABLE.csv"
    config["survey"] = {
        "name": "Planned pulse", "invited_count": 300, "respondent_column": "respondent",
    }
    opt = options(study, config, mode="code", actions=["code"])
    runner.run(opt)
    manifest = json.loads((Path(opt.output_dir) / "advanced-analysis-manifest.json").read_text())
    assert manifest["status"] == "not_run"
    assert manifest["qa"]["verdict"] == "Not ready"
    assert manifest["survey"]["name"] == "Planned pulse"
    assert manifest["survey"]["feature_count"] == 2
    assert manifest["survey"]["response_count"] is None
    assert manifest["survey"]["response_rate"] is None
    html = (Path(opt.output_dir) / "advanced-report.html").read_text(encoding="utf-8")
    assert '<div id="svd-visuals" hidden>' in html
    assert '<section id="interpretation"><h2>' in html
    assert html.count("<h3>How to action these results</h3>") == 5


def test_survey_overview_uses_source_title_without_inventing_invitation_coverage(study):
    _, frame, config = study
    frame["survey_cycle_title"] = "H2 engagement"
    overview = runner.survey_overview(config, frame)
    assert overview["name"] == "H2 engagement"
    assert overview["response_count"] == 240
    assert overview["invited_count"] is None
    assert overview["response_rate"] is None
    frame.loc[0, "survey_cycle_title"] = "H1 engagement"
    assert runner.survey_overview(config, frame)["name"] is None
    config["survey"] = {"name": "Confirmed combined scope"}
    assert runner.survey_overview(config, frame)["name"] == "Confirmed combined scope"
    assert runner.survey_overview(config, frame.head(4))["response_count"] is None


@pytest.mark.parametrize("invalid", [
    "duplicate", "missing_id", "unknown_id", "multiple_cycles", "multiple_cycle_ids", "too_few_invited",
])
def test_survey_overview_rejects_misleading_response_rates(study, invalid):
    _, frame, config = study
    config["survey"] = {
        "name": "Confirmed pulse", "invited_count": 300, "respondent_column": "respondent",
    }
    if invalid == "duplicate":
        frame.loc[0, "respondent"] = frame.loc[1, "respondent"]
    elif invalid == "missing_id":
        frame.loc[0, "respondent"] = np.nan
    elif invalid == "unknown_id":
        config["survey"]["respondent_column"] = "unknown"
    elif invalid == "multiple_cycles":
        frame["survey_cycle_title"] = ["H1"] * 120 + ["H2"] * 120
    elif invalid == "multiple_cycle_ids":
        frame["survey_cycle_id"] = [1001] * 120 + [1002] * 120
    else:
        config["survey"]["invited_count"] = 200
    with pytest.raises(ValueError, match="Response rate needs|exceed"):
        runner.survey_overview(config, frame)


@pytest.mark.parametrize("task", ["regression", "svd"])
def test_report_leads_with_svd_and_explains_each_section(study, task):
    config = study[2]
    if task == "svd":
        config["experiment"].update(task="svd", models=[], components=2, metric="reconstruction_rmse")
    opt = options(study, config)
    runner.run(opt)
    html = (Path(opt.output_dir) / "advanced-report.html").read_text(encoding="utf-8")
    header = re.search(r"<header>(.*?)</header>", html, re.DOTALL).group(1)
    methodology = re.search(r'<section id="methodology">(.*?)</section>', html, re.DOTALL).group(1)
    assert 'id="status"' not in html
    assert 'class="badge"' not in header
    assert 'id="scope"' not in header
    assert 'id="scope"' in methodology
    assert 'id="qa"' in methodology
    expected = ["svd", "interpretation", "comparison", "diagnostics", "methodology", "downloads"]
    expected_sections = [section for section in expected if section != "interpretation"] if task == "svd" else expected
    assert re.findall(r'<section id="([^"]+)"', html) == expected_sections
    nav = re.search(r'<nav aria-label="Report sections">(.*?)</nav>', html, re.DOTALL).group(1)
    assert re.findall(r'href="#([^"]+)"', nav) == expected
    sections = dict(re.findall(r'<section id="([^"]+)"[^>]*>(.*?)</section>', html, re.DOTALL))
    assert html.count('id="interpretation"') == 1
    assert html.count('id="narrative"') == 1
    assert "__SVD_INTERPRETATION__" not in html and "__MODEL_INTERPRETATION__" not in html
    if task == "svd":
        assert '<div id="interpretation"><h3>' in sections["svd"]
        assert html.index('id="svd-chart"') < html.index('id="interpretation"') < html.index('id="svd-components"')
    else:
        assert '<section id="interpretation"><h2>' in html
    intros = {}
    for section, body in sections.items():
        intro = re.search(r'<p class="section-intro muted">(.*?)</p>', body, re.DOTALL)
        if intro:
            intros[section] = intro.group(1)
    assert set(intros) == set(expected) - {"interpretation"}
    if task != "svd":
        assert 'class="section-action"' not in sections["interpretation"]
    assert all(intro.strip() for intro in intros.values())
    assert "Singular value decomposition" in intros["svd"]
    assert "variance" in intros["svd"]
    assert "not a validated measurement model" in intros["svd"]
    actions = re.findall(
        r'<div class="section-action"><h3>How to action these results</h3><p>(.*?)</p></div>',
        html, re.DOTALL,
    )
    assert len(actions) == len(expected) - 1
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


@pytest.mark.parametrize("legacy", [False, True])
def test_stale_research_narrative_cannot_be_embedded(study, legacy):
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
    if not legacy:
        narrative["claims"][0] = {
            "text": "Synthetic prose fixture only, not a research claim.",
            "sources": narrative["claims"][0]["sources"],
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
    assert '<table id="svd-components-table" aria-label="Component summaries">' in html
    assert 'data-table="svd-components-table"' in html
    assert "svd-card" not in html
    assert 'data-table="svd-weights-table"' in html
    assert "not factor loadings" in html
    assert 'id:"svd-magnitude-legend"' in html
    assert 'id:"svd-magnitude-key"' in html
    assert "color-mix(in srgb" in html
    assert "Darker = larger magnitude" in html
    assert "Shading does not indicate validated strength or significance." in html
    assert 'id="item-removal-review"' in html
    assert "Top three candidates for removal review" in html
    assert "Candidate shortlist not yet prepared." in html
    assert "This SVD report is pending its required shortlist assessment." in html
    assert "Missing candidates do not mean every question must stay" in html
    assert '<p id="item-review-status" role="status" hidden>' in html
    assert 'id="item-review-status" class="badge"' not in html
    assert '<details id="item-review-details">' in html
    assert "max-width:85ch" not in html


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


def item_candidates_for(manifest):
    features = manifest["summary"]["svd"]["features"]
    return {
        "config_sha256": manifest["config_sha256"],
        "summary_sha256": runner.digest(manifest["summary"]),
        "approved_for_sharing": True,
        "ranking_basis": "Synthetic analyst ordering from inspected aggregate diagnostics.",
        "limitations": ["Content and after-removal stability have not been checked."],
        "protected_items_reviewed": False, "content_coverage_reviewed": False,
        "protected_items": [],
        "items": [{
            "question": features[0], "comparison_question": features[1],
            "reason": "Synthetic observed pattern merits investigation, not deletion.",
            "evidence_needed": ["Compare exact wording and same-population redundancy.", "Check protected coverage and reduced-set stability."],
        }],
    }


def context_candidates_for(manifest):
    candidates = item_candidates_for(manifest)
    candidates["items"] = []
    candidates["context_request"] = {
        "reason": "Synthetic profiles support reviewing a pair, not choosing which question to nominate.",
        "requested_inputs": ["Provide exact question wording.", "Mark must-keep questions and explain why."],
    }
    candidates["pair_leads"] = [{
        "questions": manifest["summary"]["svd"]["features"][:2],
        "reason": "The inspected synthetic profiles merit paired review, not deletion.",
        "evidence_needed": ["Compare exact wording and protected content before choosing a nominee."],
    }]
    return candidates


@pytest.mark.parametrize("state", ["nominees", "assessed_zero", "context_needed", "legacy_missing_context"])
@pytest.mark.parametrize("delivery", ["chat", "report"])
def test_candidate_shortlist_attaches_without_reading_data_or_refitting(study, monkeypatch, state, delivery):
    from build_advanced_analysis_report import build_report

    config = study[2]
    config["experiment"].update(task="svd", models=[], components=2, metric="reconstruction_rmse")
    opt = options(study, config)
    opt.delivery = delivery
    runner.run(opt)
    output = Path(opt.output_dir)
    original = json.loads((output / "advanced-analysis-manifest.json").read_text())
    protected = {path.name: path.read_bytes() for path in (output / "_private").iterdir() if path.is_file()}
    candidates = item_candidates_for(original)
    if state in {"assessed_zero", "legacy_missing_context"}:
        candidates["items"] = []
        candidates["ranking_basis"] = "No supported candidates in the inspected synthetic fixture."
    if state == "assessed_zero":
        candidates["protected_items_reviewed"] = True
        candidates["content_coverage_reviewed"] = True
    elif state == "context_needed":
        candidates = context_candidates_for(original)
    path = study[0] / "candidates.json"
    runner.write_json(path, candidates)

    def forbidden(*args, **kwargs):
        pytest.fail("Candidate attachment tried to read respondent data or fit a model.")

    monkeypatch.setattr(runner, "load_data", forbidden)
    import vivaglint.modeling
    monkeypatch.setattr(vivaglint.modeling, "run_model_experiment", forbidden)
    denied = options(study, config, mode="review-items", actions=["fit", "replay"])
    denied.item_candidates = str(path)
    with pytest.raises(PermissionError):
        runner.run(denied)
    opt = options(study, config, mode="review-items", actions=["interpret", "share"])
    opt.delivery = delivery
    opt.item_candidates = str(path)
    runner.run(opt)
    updated = json.loads((output / "advanced-analysis-manifest.json").read_text())
    assert updated["item_candidates"] == candidates
    for key in ("summary", "provenance", "qa"):
        assert updated[key] == original[key]
    assert all((output / "_private" / name).read_bytes() == value for name, value in protected.items())
    assert json.loads((output / "question-removal-candidates.json").read_text()) == candidates
    if delivery == "report":
        html = (output / "advanced-report.html").read_text()
        assert "No supported candidates identified." not in html
        assert "Please provide additional context to help select the top three candidates for removal review." in html
        assert 'id="item-review-shortlist" hidden' in html
        assert 'id="item-review-requested-inputs"' in html
        assert 'data-table="item-pair-leads-table"' in html
        assert "Question ID | Exact wording | Must keep and why | Distinct topic/action" in html
        with zipfile.ZipFile(output / "advanced-share.zip") as archive:
            assert json.loads(archive.read("question-removal-candidates.json")) == candidates
            assert "question-removal-review.json" not in archive.namelist()
    else:
        assert not list(output.glob("*.html"))
        assert not list(output.glob("*.zip"))
    before = (output / "advanced-analysis-manifest.json").read_bytes()
    updated["item_candidates"]["summary_sha256"] = "0" * 64
    with pytest.raises(ValueError, match="stale"):
        build_report(output, updated)
    assert (output / "advanced-analysis-manifest.json").read_bytes() == before


@pytest.mark.parametrize("invalid", [
    "unfitted_pair", "self_pair", "reversed_pair", "protected_pair",
    "four_pairs", "blank_context", "missing_context_inputs",
])
def test_pair_leads_and_context_reject_unsupported_or_ambiguous_records(invalid):
    from build_advanced_analysis_report import validate_item_candidates

    manifest = {
        "config_sha256": "a" * 64, "status": "completed",
        "qa": {"repeatability": "passed", "verdict": "Use with caveats"},
        "summary": {"task": "svd", "svd": {"features": ["Q_work", "Q_support"]}},
    }
    candidates = context_candidates_for(manifest)
    pair = candidates["pair_leads"][0]
    if invalid == "unfitted_pair":
        pair["questions"][1] = "Q_unfitted"
    elif invalid == "self_pair":
        pair["questions"][1] = pair["questions"][0]
    elif invalid == "reversed_pair":
        candidates["pair_leads"].append({**pair, "questions": list(reversed(pair["questions"]))})
    elif invalid == "protected_pair":
        candidates["protected_items"] = ["Q_work", "Q_support"]
    elif invalid == "four_pairs":
        candidates["pair_leads"] *= 4
    elif invalid == "blank_context":
        candidates["context_request"]["reason"] = " "
    else:
        del candidates["context_request"]["requested_inputs"]
    with pytest.raises((ValueError, ValidationError)):
        validate_item_candidates(manifest, candidates)


def test_missing_context_requires_explicit_decision_note_and_provisional_pair_guidance():
    skill = (ROOT / "skills/analyze-survey-advanced/SKILL.md").read_text()
    workflow = (ROOT / "skills/analyze-survey-advanced/references/modeling-workflow.md").read_text()
    assert "Make decisions and deferrals explicit in the conversation" in skill
    assert "Missing context is not a negative finding." in skill
    assert "unordered question pairs as `pair_leads`" in workflow
    assert "`context_request`" in workflow and "`requested_inputs`" in workflow
    assert "Guide the user to paste a" in workflow
    assert "Do not repeatedly ask for inputs already confirmed unavailable" in workflow


@pytest.mark.parametrize("invalid", [
    "stale_config", "stale_summary", "duplicate", "unknown",
    "protected", "unknown_protected", "self_comparison", "unknown_comparison",
    "shortlisted_comparison", "blank_reason", "blank_evidence", "unready", "non_svd",
    "legacy_protected",
])
def test_candidates_reject_invalid_or_unsupported_assessments(invalid):
    from build_advanced_analysis_report import validate_item_candidates

    manifest = {
        "config_sha256": "a" * 64, "status": "completed",
        "qa": {"repeatability": "passed", "verdict": "Use with caveats"},
        "summary": {"task": "svd", "svd": {"features": ["Q_work", "Q_support"]}},
    }
    candidates = item_candidates_for(manifest)
    item = candidates["items"][0]
    if invalid == "stale_config":
        candidates["config_sha256"] = "b" * 64
    elif invalid == "stale_summary":
        candidates["summary_sha256"] = "b" * 64
    elif invalid == "duplicate":
        candidates["items"].append(dict(item))
    elif invalid == "unknown":
        item["question"] = "Q_unfitted"
    elif invalid == "protected":
        candidates["protected_items"] = ["Q_work"]
    elif invalid == "unknown_protected":
        candidates["protected_items"] = ["Q_unfitted"]
    elif invalid == "self_comparison":
        item["comparison_question"] = "Q_work"
    elif invalid == "unknown_comparison":
        item["comparison_question"] = "Q_unfitted"
    elif invalid == "shortlisted_comparison":
        candidates["items"].append({**item, "question": "Q_support", "comparison_question": "Q_work"})
    elif invalid == "blank_reason":
        item["reason"] = " "
    elif invalid == "blank_evidence":
        item["evidence_needed"] = [" "]
    elif invalid == "unready":
        manifest["qa"]["verdict"] = "Not ready"
    elif invalid == "non_svd":
        manifest["summary"]["task"] = "regression"
        candidates["summary_sha256"] = runner.digest(manifest["summary"])
    else:
        manifest["item_review"] = item_review_for(manifest, "retain")
    with pytest.raises((ValueError, ValidationError)):
        validate_item_candidates(manifest, candidates)


@pytest.mark.parametrize("count", [3, 4])
def test_shortlist_accepts_three_in_analyst_order_but_rejects_four(count):
    from build_advanced_analysis_report import validate_item_candidates

    manifest = {
        "config_sha256": "a" * 64, "status": "completed",
        "qa": {"repeatability": "passed", "verdict": "Use with caveats"},
        "summary": {"task": "svd", "svd": {"features": [f"Q_{i}" for i in range(6)]}},
    }
    candidates = item_candidates_for(manifest)
    template = candidates["items"][0]
    order = ["Q_4", "Q_2", "Q_0", "Q_3"][:count]
    candidates["items"] = [{**template, "question": question, "comparison_question": "Q_5"} for question in order]
    candidates["protected_items"] = ["Q_5"]
    if count > 3:
        with pytest.raises(ValidationError, match="too long"):
            validate_item_candidates(manifest, candidates)
        return
    validate_item_candidates(manifest, candidates)
    assert [item["question"] for item in candidates["items"]] == order
    assert not candidates["protected_items_reviewed"]
    assert not candidates["content_coverage_reviewed"]


def test_skill_has_proactive_collaboration_not_autonomous_tuning():
    skill = (ROOT / "skills/analyze-survey-advanced/SKILL.md").read_text()
    workflow = (ROOT / "skills/analyze-survey-advanced/references/modeling-workflow.md").read_text()
    assert "Never tune by yourself unless the user instructs you to" in skill
    assert "Proactively discuss tuning and additional context" in workflow
    assert "external dataset" in workflow
    assert "specific company information" in skill
    assert "For every completed, QA-eligible SVD analysis, including demos and structure-only" in skill
    assert "always prepare and attach a ranked shortlist of the top three" in skill
    assert "Do not wait for a separate survey-shortening request" in skill
    assert "Before delivering any completed QA-eligible SVD discussion, prepare and attach" in workflow


def test_skill_delivers_chart_and_grounded_interpretation_inline_by_default():
    skill = (ROOT / "skills/analyze-survey-advanced/SKILL.md").read_text()
    delivery = " ".join(skill.split("## Chat-first delivery\n", 1)[1].split("\n## ", 1)[0].split())
    assert "full analysis conversation inline" in delivery
    assert "item-weight chart followed immediately by concise People Science-grounded interpretation with citations" in delivery
    assert "Do not generate/open HTML, launch a browser, or package a share ZIP by default." in delivery
    assert "text bar chart with signed values" in delivery
    assert "not fit/tune/interpret/share approval, model QA, privacy, or holdout requirements" in delivery


def test_skill_requires_evidence_and_comparable_component_options_before_selection():
    skill = (ROOT / "skills/analyze-survey-advanced/SKILL.md").read_text()
    workflow = (ROOT / "skills/analyze-survey-advanced/references/modeling-workflow.md").read_text()
    guardrail = skill.split("## Evidence-led decision guardrail\n", 1)[1].split("\n## ", 1)[0]
    choices = workflow.split("## Evidence-led choices and component selection\n", 1)[1].split("\n## ", 1)[0]
    assert "Every decision in this skill must be evidence-led" in guardrail
    assert "ask the user for the missing information" in guardrail
    assert "User approval permits execution; it does not establish analytical quality." in guardrail
    assert "There is no fixed default SVD component count." in choices
    assert "| Components | Variance explained (%) | Gain (pp) | Reconstruction MSE | RMSE | Evidence / trade-off |" in choices
    assert "development in-sample reconstruction error" in choices
    assert "not cross-validated or holdout reconstruction performance" in choices
    assert "Not computed" in choices
    assert "not permission to fit or tune" in choices
    assert "obtain the user's selection" in choices
    assert "Do not invent other-rank reconstruction errors" in choices
    assert "instead of arbitrarily choosing a" in workflow


def test_interpretation_and_tuning_require_vault_grounding_without_implied_approval():
    skill = (ROOT / "skills/analyze-survey-advanced/SKILL.md").read_text()
    workflow = (ROOT / "skills/analyze-survey-advanced/references/modeling-workflow.md").read_text()
    interpretation = (ROOT / "skills/analyze-survey-advanced/references/interpretation.md").read_text()
    guardrail = skill.split("## Mandatory Knowledge Vault guardrail\n", 1)[1].split("\n## ", 1)[0]
    guardrail = " ".join(guardrail.split())
    interpretation = " ".join(interpretation.split())
    assert "Before offering model interpretation or tuning guidance, consult" in guardrail
    assert "../people-science-knowledge-vault/SKILL.md" in guardrail
    assert "SVD, demos, follow-up questions and proactive tuning proposals" in guardrail
    assert "same-revision" in guardrail
    assert "cite them beside the claims they support" in guardrail
    assert "**People Science-grounded**, not **People Science-approved**" in guardrail
    assert "disclose the gap and withhold research-dependent advice" in guardrail
    assert "data-only, not People Science-grounded" in guardrail
    assert "does not authorize fitting" in guardrail
    assert "mandatory Knowledge Vault guardrail" in workflow
    assert "required-reference gate" in interpretation
    assert "Do not restart intake or refit unchanged models" in interpretation
    assert "unless that specific review is documented" in interpretation
    assert "Keep report interpretation unavailable until" in interpretation


def test_svd_defaults_to_one_through_eight_metrics_and_actionable_guidance():
    skill = (ROOT / "skills/analyze-survey-advanced/SKILL.md").read_text()
    workflow = (ROOT / "skills/analyze-survey-advanced/references/modeling-workflow.md").read_text()
    choices = workflow.split("## Evidence-led choices and component selection\n", 1)[1].split("\n## ", 1)[0]
    assert "**1 through 8**" in skill and "**1 through 8**" in choices
    for rank in range(1, 9):
        assert f"| {rank} | Not computed |" in choices
    assert "not a selected rank" in skill
    assert "Not feasible" in choices and "explicitly narrower user scope" in choices
    assert "Reuse verified, comparable runs" in choices
    assert "Always follow the table with a recommendation or concrete conditional guidance." in choices
    assert "user-confirmed coverage target; never invent that target" in choices
    assert "first request explicit authorization" in choices
    assert "same project, preserving its reserved holdout design" in choices
    assert "obtain the user's selection" in choices


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


@pytest.mark.parametrize("legacy", [False, True])
@pytest.mark.parametrize("delivery", ["chat", "report"])
def test_interpret_mode_does_not_reload_private_source(study, legacy, delivery):
    opt = options(study, study[2])
    opt.delivery = delivery
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
    if not legacy:
        narrative["claims"][0] = {
            "text": "</script><script>window.injected=true</script> Synthetic prose fixture only.",
            "sources": narrative["claims"][0]["sources"],
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
    updated = json.loads((output / "advanced-analysis-manifest.json").read_text())
    assert updated["interpretation"] == {"status": "reviewed", **narrative}
    for field in ("summary", "qa", "provenance", "config_sha256", "source_sha256", "survey"):
        assert updated[field] == manifest[field]
    if delivery == "report":
        html = (output / "advanced-report.html").read_text()
        assert "</script><script>window.injected" not in html
        assert "\\u003c/script\\u003e" in html
        with zipfile.ZipFile(output / "advanced-share.zip") as archive:
            assert json.loads(archive.read("advanced-analysis-manifest.json")) == updated
    else:
        assert not list(output.glob("*.html"))
        assert not list(output.glob("*.zip"))


@pytest.mark.parametrize("invalid", ["blank", "whitespace", "mixed_format", "unreviewed"])
def test_natural_interpretation_requires_unambiguous_reviewed_prose(invalid):
    narrative = {
        "config_sha256": "0" * 64, "summary_sha256": "1" * 64,
        "approved_for_sharing": True, "reference_revision": "synthetic-only",
        "required_references_complete": True,
        "claims": [{
            "text": "Synthetic prose fixture only.",
            "sources": [{"url": "https://learn.microsoft.com/en-us/viva/glint/", "title": "Synthetic fixture", "body_reviewed": True}],
        }],
    }
    claim = narrative["claims"][0]
    if invalid == "blank":
        claim["text"] = ""
    elif invalid == "whitespace":
        claim["text"] = " \t\n"
    elif invalid == "mixed_format":
        claim.update(observation="Synthetic fixture.", interpretation="", hypothesis="", next_check="", caveat="")
    else:
        claim["sources"][0]["body_reviewed"] = False
    with pytest.raises(ValidationError):
        runner.validate(narrative, "advanced-interpretation.schema.json")
