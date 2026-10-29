import csv
import hashlib
import importlib.util
import json
import re
import shutil
import subprocess
import sys
import zipfile
from io import StringIO
from pathlib import Path
from types import SimpleNamespace

import pytest


ROOT = Path(__file__).resolve().parents[1]


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def platform_input(tmp_path):
    module = load_script("analyze_survey_export")
    first, second = "We have clear goals.", "My manager supports me."
    frame = module.pd.DataFrame({
        "Survey Cycle Creation Date": ["2026-01-01"] * 8,
        "Survey Cycle Completion Date": ["2026-01-31"] * 8,
        "Survey Cycle Title": ["Cycle A"] * 8,
        "Survey Cycle UUID": ["0001"] * 8,
        "Survey Cycle Sent Date": ["2026-01-02"] * 8,
        first: [1, 2, 3, 4, 5, -1, 2, 5],
        first + "_COMMENT": ["Clear goals", "PRIVATE_SENSITIVE", "PRIVATE_UNKNOWN", "", "", "", "", ""],
        first + "_COMMENT_TOPICS": ["goals", "PRIVATE_TOPIC", "PRIVATE_TOPIC", "", "", "", "", ""],
        first + "_SENSITIVE_COMMENT_FLAG": ["false", "true", "", "", "", "", "", ""],
        second: [2, 3, 4, 5, 1, 2, -1, 4],
        second + "_COMMENT": [""] * 8,
        second + "_COMMENT_TOPICS": [""] * 8,
        second + "_SENSITIVE_COMMENT_FLAG": [""] * 8,
        "Employee ID": ["00001", "1", "00003", "00004", "00005", "00006", "00007", "00008"],
        "Tenure": ["Early", "Early", "Early", "Early", "Late", "Late", "Late", "Late"],
        "attribute 4": ["A", "B"] * 4,
        "First Name": ["PRIVATE_NAME"] * 8,
    })
    source = tmp_path / "native.csv"
    frame.to_csv(source, index=False)
    options = SimpleNamespace(
        survey_export=str(source), output_dir=str(tmp_path / "output"),
        sheet=None, attribute_sheet=None, emp_id_col=None, scale_points=5,
        question_cols=None, attribute_cols=None, min_group_size=5,
        inspect_only=True, preparation_decisions=None, summary_mode="off",
    )
    return module, frame, options


def approve_platform(module, options, **overrides):
    options.inspect_only = True
    proposal_path = module.build_config(options, Path(options.output_dir))
    proposal = json.loads(proposal_path.read_text(encoding="utf-8"))
    decisions = proposal["decisions_template"]
    decisions.update(confirmed=True, **overrides)
    decision_path = Path(options.output_dir) / "_input" / "confirmed.json"
    decision_path.write_text(json.dumps(decisions), encoding="utf-8")
    options.preparation_decisions = str(decision_path)
    options.inspect_only = False
    return module.build_config(options, Path(options.output_dir))


@pytest.mark.parametrize("suffix", [".csv", ".xlsx", ".xlsm"])
def test_platform_preparation_preserves_scores_identity_and_private_comments(platform_input, tmp_path, suffix):
    module, frame, options = platform_input
    source = tmp_path / f"native{suffix}"
    if suffix == ".csv":
        frame.to_csv(source, index=False)
    else:
        frame.to_excel(source, index=False)
    options.survey_export = str(source)
    config_path = approve_platform(module, options)
    config = json.loads(config_path.read_text(encoding="utf-8"))
    normalized = module.pd.read_csv(config["survey_csv"], dtype={"Employee ID": str, "survey_cycle_id": str})
    first, second = config["question_cols"]
    assert [first, second] == ["We have clear goals.", "My manager supports me."]
    assert normalized["Employee ID"].tolist()[:2] == ["00001", "1"]
    assert normalized["survey_cycle_id"].unique().tolist() == ["0001"]
    assert module.pd.isna(normalized[first].iloc[5])
    assert module.pd.isna(normalized[second].iloc[6])
    assert normalized[first].iloc[0] == 1
    assert config["attribute_cols"] == ["Tenure"]
    assert "First Name" not in normalized
    assert "attribute 4" not in normalized
    comments = module.pd.read_csv(config["comments_file"], dtype=str)
    assert comments["Employee ID"].tolist() == ["00001"]
    assert comments["comment"].tolist() == ["Clear goals"]
    assert comments["survey_cycle_id"].tolist() == ["0001"]
    assert comments["question_uuid"].tolist() == [first]
    audit = config_path.with_name("preparation-audit.json").read_text(encoding="utf-8")
    assert "PRIVATE_" not in audit
    codes = [entry["code"] for entry in json.loads(audit)["limitations"]]
    assert codes == ["attribute_excluded", "private_attribute", "comment_excluded"]
    runner = load_script("run_vivaglint_analysis")
    survey = runner.load_survey(config, config_path, Path(config["survey_csv"]))
    assert survey.data["Employee ID"].tolist()[:2] == ["00001", "1"]


def test_platform_requires_current_explicit_user_decisions(platform_input):
    module, frame, options = platform_input
    output = Path(options.output_dir)
    proposal_path = module.build_config(options, output)
    assert not proposal_path.with_name("survey.csv").exists()
    options.inspect_only = False
    with pytest.raises(ValueError, match="User confirmation"):
        module.build_config(options, output)
    proposal = json.loads(proposal_path.read_text(encoding="utf-8"))
    decision_path = proposal_path.with_name("confirmed.json")
    decision_path.write_text(json.dumps(proposal["decisions_template"]), encoding="utf-8")
    options.preparation_decisions = str(decision_path)
    with pytest.raises(ValueError, match="unconfirmed or stale"):
        module.build_config(options, output)
    approve_platform(module, options)
    options.scale_points = 7
    with pytest.raises(ValueError, match="unconfirmed or stale"):
        module.build_config(options, output)
    options.scale_points = 5
    frame.iloc[0, 5] = 4
    frame.to_csv(options.survey_export, index=False)
    with pytest.raises(ValueError, match="unconfirmed or stale"):
        module.build_config(options, output)


def test_wide_items_with_a_completion_date_keep_existing_ingestion(platform_input):
    module, _, options = platform_input
    module.pd.DataFrame({
        "user_id": ["00001", "1", "00003"],
        "Survey Cycle Completion Date": ["2026-01-31"] * 3,
        "Q_ONE": [1, 3, 5],
    }).to_csv(options.survey_export, index=False)
    options.inspect_only = False
    config_path = module.build_config(options, Path(options.output_dir))
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert config["question_cols"] == ["Q_ONE"]
    assert not config_path.with_name("preparation-audit.json").exists()


@pytest.mark.parametrize("native", [False, True])
@pytest.mark.parametrize("selected", [[], ["correlations"], ["scores_change", "response_distribution"]])
def test_export_selection_limits_codebooks_and_skips_unrequested_outcomes(
    platform_input, monkeypatch, native, selected,
):
    module, _, options = platform_input
    options.analyses = selected
    monkeypatch.setattr(
        module, "inspect_source",
        lambda *_: pytest.fail("Unselected attrition must not inspect outcomes"),
    )
    if native:
        config_path = approve_platform(module, options)
    else:
        module.pd.DataFrame({
            "user_id": range(20), "Q_ONE": [1, 2, 3, 4, 5] * 4,
            "Department": ["Engineering"] * 10 + ["Sales"] * 10,
        }).to_csv(options.survey_export, index=False)
        options.inspect_only = False
        config_path = module.build_config(options, Path(options.output_dir))
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert config["selected_analyses"] == selected
    assert set(config["analyses"]) == {"descriptives", "by_attribute", *(
        analysis for analysis in selected if analysis != "scores_change"
    )}
    assert "embedded_attrition" not in config
    assert not config.get("analysis_limitations")
    assert not config_path.with_name("attrition-discovery.json").exists()


def test_builder_does_not_compute_or_share_unselected_results(custom_exit_export, tmp_path, monkeypatch):
    export, _, options = custom_exit_export
    options.analyses = []
    output = tmp_path / "selected"
    config_path = export.build_config(options, output)
    (output / "analysis-manifest.json").write_text(json.dumps({
        "analyses": [{"name": "descriptives", "status": "completed", "artifact": "descriptives.csv"}],
        "artifacts": {"descriptives": "descriptives.csv"},
        "repeatability_check": {"status": "passed"},
    }), encoding="utf-8")
    (output / "descriptives.csv").write_text("question,mean\nQ_ONE,50\n", encoding="utf-8")
    for name in ("factor_analysis_summary.csv", "correlations.csv", "attrition.csv", "response_distribution.csv"):
        (output / name).write_text("STALE_UNSELECTED_SENTINEL\n", encoding="utf-8")
    builder = load_script("build_interactive_report")
    monkeypatch.setattr(builder, "args", lambda: SimpleNamespace(
        config=str(config_path), output_dir=str(output), summary_mode=None,
        progress_start=0, progress_end=100, progress_started_at=None,
    ))
    def unselected(*_args, **_kwargs):
        pytest.fail("Unselected optional analysis was computed")
    for name in ("relationship_cube", "factor_cube", "attrition_payload", "attrition_alert_payload", "distribution_cube"):
        monkeypatch.setattr(builder, name, unselected)
    assert builder.main() == 0
    report = (output / "selected-report.html").read_text(encoding="utf-8")
    assert re.findall(r'<button class="tab"[^>]*>(.*?)</button>', report) == ["Downloads", "Methodology"]
    assert 'data-id="downloads" aria-selected="true"' in report
    assert "<section class=panel id=downloads role=tabpanel>" in report
    payload = json.JSONDecoder().raw_decode(report.split("<script>const D=", 1)[1])[0]
    assert payload["overall"]
    assert payload["factors"] == payload["relationships"] == {}
    assert payload["cycles"]["repeat"] == {"overall": {}, "segments": {
        attribute: {} for attribute in payload["segments"]
    }}
    assert re.findall(r'data-methodology-section="([^"]+)"', report) == [
        "correlation", "factors", "attrition-analysis", "attrition-alerts",
        "scores-change", "item-distribution",
    ]
    assert report.count("(Not run)</span></h3>") == 6
    assert report.count("class=methodology-callout") == 12
    with zipfile.ZipFile(output / "selected-share.zip") as archive:
        assert not any(name in archive.namelist() for name in (
            "factor_analysis_summary.csv", "correlations.csv", "attrition.csv", "response_distribution.csv",
        ))
        assert "STALE_UNSELECTED_SENTINEL" not in archive.read("OPEN_REPORT.html").decode()
        context = json.loads(archive.read("people-science-summary-context.json"))
        assert context["tabs"]["changes"] == {"status": "not_selected"}


@pytest.mark.parametrize("selected,expected_tabs", [
    ([], ["Downloads", "Methodology"]),
    (["correlations"], ["Correlation", "Downloads", "Methodology"]),
    (["factor_analysis"], ["Factors", "Downloads", "Methodology"]),
    (["attrition"], ["Attrition analysis", "Attrition insights", "Downloads", "Methodology"]),
    (["scores_change", "response_distribution"], ["Scores change", "Item distribution", "Downloads", "Methodology"]),
    (["correlations", "factor_analysis", "attrition", "scores_change", "response_distribution"],
     ["Correlation", "Factors", "Attrition analysis", "Attrition insights", "Scores change",
      "Item distribution", "Downloads", "Methodology"]),
])
def test_selected_reports_repeat_and_package_only_requested_analyses(
    custom_exit_export, tmp_path, selected, expected_tabs,
):
    _, _, options = custom_exit_export
    output = tmp_path / "selected"
    result = subprocess.run([
        sys.executable, str(ROOT / "scripts/analyze_survey_export.py"),
        "--survey-export", options.survey_export, "--output-dir", str(output),
        "--analyses", *selected,
    ], capture_output=True, text=True, encoding="utf-8")
    assert result.returncode == 0, result.stdout + result.stderr
    with zipfile.ZipFile(output / "selected-share.zip") as archive:
        report = archive.read("OPEN_REPORT.html").decode("utf-8")
        manifest = json.loads(archive.read("analysis-manifest.json"))
        assert manifest["selected_analyses"] == selected
        assert manifest["repeatability_check"]["status"] == "passed"
        assert all(item["status"] == "completed" for item in manifest["analyses"])
        assert {item["name"] for item in manifest["analyses"]} == {
            "descriptives", "by_attribute", *(name for name in selected if name != "scores_change"),
        }
        assert re.findall(r'<button class="tab"[^>]*>(.*?)</button>', report) == expected_tabs
        assert f'aria-selected="true">{expected_tabs[0]}</button>' in report
        method_sections = {
            "correlation": "correlations", "factors": "factor_analysis",
            "attrition-analysis": "attrition", "attrition-alerts": "attrition",
            "scores-change": "scores_change", "item-distribution": "response_distribution",
        }
        assert re.findall(r'data-methodology-section="([^"]+)"', report) == list(method_sections)
        methodology_nav = re.search(r'<nav class="methodology-jump"[^>]*>(.*?)</nav>', report).group(1)
        assert re.findall(r'href="#methodology-([^"]+)"', methodology_nav) == list(method_sections)
        for section, analysis in method_sections.items():
            blurb = re.search(
                rf'<article class="methodology-card" data-methodology-section="{section}".*?</article>',
                report, re.DOTALL,
            ).group(0)
            assert ("(Not run)" in blurb) == (analysis not in selected)
            assert "</h3></div><p>" in blurb
            assert "Example interpretation" in blurb
            assert "Example action" in blurb
            assert "Hypothetical:" in blurb
        payload = json.JSONDecoder().raw_decode(report.split("<script>const D=", 1)[1])[0]
        assert payload["selectedAnalyses"] == selected
        assert bool(payload["relationships"]) == ("correlations" in selected)
        assert bool(payload["factors"]) == ("factor_analysis" in selected)
        assert bool(payload["attritionData"]) == ("attrition" in selected)
        assert ("distribution" in payload) == ("response_distribution" in selected)
        if "response_distribution" in selected:
            assert 'data-methodology-section="item-distribution"' in report
            assert "response_distribution.csv" in archive.namelist()
            assert payload["distribution"]["labels"] == [0, 25, 50, 75, 100]
            render = report.split("function render(){", 1)[1].split("}renderStatic();", 1)[0]
            assert 'if(D.selectedAnalyses.includes("response_distribution"))renderDistribution();' in render


def test_selected_attrition_without_results_retains_methodology_and_examples():
    builder = load_script("build_interactive_report")
    golden = (ROOT / "skills/analyze-survey/references/golden-report.html").read_text(encoding="utf-8")
    report = builder.prepare_selected_report(
        builder.prepare_report_shell(golden, False, keep_all_methodology=True), ["attrition"],
    )
    assert ">Attrition analysis</button>" not in report
    assert ">Attrition insights</button>" not in report
    for section in ("attrition-analysis", "attrition-alerts"):
        article = re.search(
            rf'<article class="methodology-card" data-methodology-section="{section}".*?</article>',
            report, re.DOTALL,
        ).group(0)
        assert "(Not run)" in article
        assert "Example interpretation" in article
        assert "Example action" in article
        assert "Hypothetical:" in article


def test_distribution_suppresses_sparse_items_and_small_groups():
    builder = load_script("build_interactive_report")
    frame = builder.pd.DataFrame({
        "Q_ONE": [1, 2, 3, 4, 5, None, None, None],
        "Q_SPARSE": [1, 2, 3, None, None, None, None, None],
        "Department": ["Large"] * 5 + ["Tiny"] * 3,
        "__employee_id": range(8),
    })
    segments = {"Department": {"values": {"Large": {}, "Tiny": {}}}}
    payload = builder.distribution_cube(frame, ["Q_ONE", "Q_SPARSE"], segments, 5, 5)
    assert payload["overall"] == [[5, 20, 20, 20, 20, 20], [None] * 6]
    assert set(payload["segments"]["Department"]) == {"Large"}
    assert payload["segments"]["Department"]["Large"][1] == [None] * 6


def test_platform_ambiguous_attributes_require_confirmed_evidence(platform_input):
    module, _, options = platform_input
    mappings = {"Tenure": "Tenure", "attribute 4": "Department", "First Name": None}
    with pytest.raises(ValueError, match="user-confirmed meaning"):
        approve_platform(module, options, attribute_mappings=mappings)
    config_path = approve_platform(
        module, options, attribute_mappings=mappings,
        attribute_evidence={"attribute 4": "User confirmed the source data dictionary: attribute 4 means department."},
    )
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert config["attribute_cols"] == ["Tenure", "Department"]
    assert "Department" in module.pd.read_csv(config["survey_csv"]).columns
    mappings["First Name"] = "Location"
    with pytest.raises(ValueError, match="identifying, sensitive"):
        approve_platform(
            module, options, attribute_mappings=mappings,
            attribute_evidence={"attribute 4": "User-confirmed department mapping."},
        )


def test_platform_incomplete_blocks_and_invalid_scores_are_explicit_exclusions(platform_input):
    module, frame, options = platform_input
    first, second = list(frame.columns)[5], list(frame.columns)[9]
    frame = frame.drop(columns=second + "_COMMENT_TOPICS")
    frame[first] = frame[first].astype(float)
    frame.loc[0, first] = 99
    frame.loc[1, first] = 2.5
    frame.to_csv(options.survey_export, index=False)
    config_path = approve_platform(module, options)
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert config["question_cols"] == [first]
    normalized = module.pd.read_csv(config["survey_csv"])
    assert normalized[first].iloc[:2].isna().all()
    assert normalized[first].iloc[2] == 3
    audit = json.loads(config_path.with_name("preparation-audit.json").read_text(encoding="utf-8"))
    assert {"incomplete_question", "invalid_scores"} <= {entry["code"] for entry in audit["limitations"]}


def test_platform_cycles_keep_repeat_respondents_distinct(platform_input):
    module, frame, options = platform_input
    second_cycle = frame.copy()
    second_cycle["Survey Cycle UUID"] = "0002"
    second_cycle["Survey Cycle Title"] = "Cycle B"
    both = module.pd.concat([frame, second_cycle], ignore_index=True)
    both.to_csv(options.survey_export, index=False)
    config_path = approve_platform(module, options)
    config = json.loads(config_path.read_text(encoding="utf-8"))
    comments = module.pd.read_csv(config["comments_file"], dtype=str)
    assert comments["Employee ID"].tolist() == ["00001", "00001"]
    assert comments["survey_cycle_id"].tolist() == ["0001", "0002"]
    duplicate = module.pd.concat([both, both.iloc[[0]]], ignore_index=True)
    duplicate.to_csv(options.survey_export, index=False)
    config_path = approve_platform(module, options)
    audit = json.loads(config_path.with_name("preparation-audit.json").read_text(encoding="utf-8"))
    assert any(entry["code"] == "invalid_records" for entry in audit["limitations"])
    config = json.loads(config_path.read_text(encoding="utf-8"))
    normalized = module.pd.read_csv(config["survey_csv"], dtype=str)
    assert not ((normalized["Employee ID"] == "00001") & (normalized["survey_cycle_id"] == "0001")).any()


@pytest.mark.parametrize("header_problem", ["duplicate", "blank", "metadata"])
def test_platform_ambiguous_headers_do_not_fall_back_to_wide_items(platform_input, header_problem):
    module, frame, options = platform_input
    headers = list(frame.columns)
    if header_problem == "duplicate":
        headers[-1] = headers[-2]
    elif header_problem == "blank":
        headers[-1] = ""
    else:
        headers[0] = "Unexpected metadata"
    frame.columns = headers
    frame.to_csv(options.survey_export, index=False)
    with pytest.raises(ValueError, match="confirm|Confirm|resolve"):
        module.build_config(options, Path(options.output_dir))


@pytest.mark.parametrize("count", [0, 5, 6, 12])
def test_limitations_projection_exports_complete_safe_text_only_above_five(tmp_path, count):
    module = load_script("build_interactive_report")
    input_dir = tmp_path / "_input"
    input_dir.mkdir()
    survey = input_dir / "survey.csv"
    survey.write_text("Employee ID,Q_ONE\n00001,5\n", encoding="utf-8")
    config = input_dir / "analysis-config.json"
    assert module.input_limitations(config, survey, tmp_path) == {"audited": False, "entries": []}
    audit = {
        "version": 1, "normalized_sha256": hashlib.sha256(survey.read_bytes()).hexdigest(),
        "cycle_order": ["Cycle A"],
        "limitations": [{"code": "attribute_excluded", "columns": [position + 10]} for position in range(count)],
        "private_detail": "</script>PRIVATE_ROW",
    }
    audit_path = input_dir / "preparation-audit.json"
    audit_path.write_text(json.dumps(audit), encoding="utf-8")
    payload = module.input_limitations(config, survey, tmp_path)
    assert len(payload["entries"]) == count
    export = tmp_path / "input-limitations.txt"
    assert export.exists() == (count > 5)
    if export.exists():
        content = export.read_text(encoding="utf-8")
        assert content == "Input limitations\n\n" + "\n".join(payload["entries"]) + "\n"
        assert "PRIVATE_ROW" not in content
    audit["limitations"] = [{"code": "attribute_excluded", "columns": ["<script>"]}]
    audit_path.write_text(json.dumps(audit), encoding="utf-8")
    with pytest.raises(ValueError, match="positive integers"):
        module.input_limitations(config, survey, tmp_path)
    audit["normalized_sha256"] = "stale"
    audit_path.write_text(json.dumps(audit), encoding="utf-8")
    with pytest.raises(ValueError, match="does not match"):
        module.input_limitations(config, survey, tmp_path)


@pytest.mark.parametrize("positions,prefix", [
    ([10], "Column 10: "),
    ([10, 11], "Columns 10, 11: "),
    ([], ""),
])
def test_limitations_column_label_matches_number_of_positions(tmp_path, positions, prefix):
    module = load_script("build_interactive_report")
    survey = tmp_path / "survey.csv"
    survey.write_text("Employee ID,Q_ONE\n00001,5\n", encoding="utf-8")
    audit = {
        "version": 1,
        "normalized_sha256": hashlib.sha256(survey.read_bytes()).hexdigest(),
        "cycle_order": ["Cycle A"],
        "limitations": [{"code": "attribute_excluded", "columns": positions}],
    }
    (tmp_path / "preparation-audit.json").write_text(json.dumps(audit), encoding="utf-8")
    payload = module.input_limitations(tmp_path / "analysis-config.json", survey, tmp_path)
    assert payload["entries"] == [prefix + module.PREPARATION_REASONS["attribute_excluded"]]


def test_limitations_preview_has_five_entries_and_full_text_download():
    node = shutil.which("node")
    if node is None:
        pytest.skip("Node.js is required for report interaction checks.")
    golden = (ROOT / "skills/analyze-survey/references/golden-report.html").read_text(encoding="utf-8")
    function = golden.split("function renderInputLimitations(){", 1)[1].split("\nfunction renderStatic", 1)[0]
    checks = r'''
const assert=require("node:assert/strict");
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};}
 append(...items){this.children.push(...items);}
}
let grid, jump, D;
const document={
 createElement:tag=>new Element(tag),
 querySelector:selector=>selector==="#methodology-limitations"?null:selector.endsWith(".methodology-grid")?grid:jump
};
for(const count of [0,5,6,12]){
 grid=new Element("div");jump=new Element("nav");
 D={inputLimitations:{audited:true,entries:Array.from({length:count},(_,i)=>"Limitation "+i)}};
 renderInputLimitations();
 const article=grid.children[0];
 const paragraphs=article.children.filter(child=>child.tag==="p").map(child=>child.textContent);
 assert.deepEqual(paragraphs,count===0?["No input exclusions were recorded during preparation."]:count>5?["Preview: showing the first 5 limitations. Download the full list below."]:[]);
 const list=article.children.find(child=>child.tag==="ul");
 assert.equal(list?.children.length||0,Math.min(5,count));
 const link=article.children.find(child=>child.tag==="a");
 assert.equal(Boolean(link),count>5);
 if(link){
  assert.equal(link.download,"input-limitations.txt");
  const expected="Input limitations\n\n"+D.inputLimitations.entries.join("\n")+"\n";
  fetch(link.href).then(response=>response.text()).then(text=>assert.equal(text,expected));
 }
 assert.equal(jump.children[0].href,"#methodology-limitations");
}
grid=new Element("div");jump=new Element("nav");D={};
renderInputLimitations();
assert.match(grid.children[0].children.find(child=>child.tag==="p").textContent,/exclusions were not recorded/);
'''
    subprocess.run(
        [node, "-e", "function renderInputLimitations(){" + function + "\n" + checks],
        check=True, capture_output=True, text=True,
    )


def test_native_export_end_to_end_repeats_and_packages_full_limitations(platform_input):
    module, _, options = platform_input
    import numpy as np

    random = np.random.default_rng(42)
    size = 280
    frame = module.pd.DataFrame({
        "Survey Cycle Creation Date": ["2026-01-01"] * size,
        "Survey Cycle Completion Date": ["2026-01-31"] * size,
        "Survey Cycle Title": ["Cycle A"] * 140 + ["Cycle B"] * 140,
        "Survey Cycle UUID": ["z-first"] * 140 + ["a-second"] * 140,
        "Survey Cycle Sent Date": ["2026-01-02"] * size,
    })
    questions = [
        "We have clear goals.", "My manager supports me.", "I can learn here.",
        "We work well together.", "I have the tools I need.", "My work matters.",
    ]
    shared = random.normal(size=(size, 2))
    for index, question in enumerate(questions):
        scores = np.clip(np.rint(3 + shared[:, index % 2] + random.normal(size=size)), 1, 5)
        scores[index] = -1
        frame[question] = scores
        frame[question + "_COMMENT"] = ""
        frame[question + "_COMMENT_TOPICS"] = ""
        frame[question + "_SENSITIVE_COMMENT_FLAG"] = ""
    frame.loc[:9, questions[0] + "_COMMENT"] = "Our team has clear goals and priorities."
    frame.loc[:9, questions[0] + "_SENSITIVE_COMMENT_FLAG"] = "false"
    frame.loc[10, questions[0] + "_COMMENT"] = "RAW_SENSITIVE_SENTINEL"
    frame.loc[10, questions[0] + "_COMMENT_TOPICS"] = "RAW_TOPIC_SENTINEL"
    frame.loc[10, questions[0] + "_SENSITIVE_COMMENT_FLAG"] = "true"
    frame.loc[11, questions[0] + "_COMMENT"] = "RAW_UNKNOWN_SENTINEL"
    employee_ids = [f"{index:05d}" for index in range(140)]
    employee_ids[2] = "NA"
    frame["Employee ID"] = employee_ids * 2
    frame["Tenure"] = ["Early", "N/A"] * 140
    for index in range(8):
        frame[f"attribute {index}"] = ["A", "B"] * 140
    frame["First Name"] = "RAW_PERSON_SENTINEL"
    frame.to_csv(options.survey_export, index=False)
    config_path = approve_platform(module, options)
    (config_path.parent / "private-notes.txt").write_text("PRIVATE_NOTE_SENTINEL", encoding="utf-8")
    output = Path(options.output_dir)
    (output / "private-preparation-copy.json").write_text('{"private":"PRIVATE_ROOT_SENTINEL"}', encoding="utf-8")
    (output / "raw-snapshot.csv").write_text("PRIVATE_RAW_SENTINEL\n", encoding="utf-8")
    completed = subprocess.run(
        [
            sys.executable, str(ROOT / "scripts/analyze_survey_export.py"),
            "--survey-export", options.survey_export, "--output-dir", options.output_dir,
            "--preparation-decisions", options.preparation_decisions,
        ],
        capture_output=True, text=True, encoding="utf-8",
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    manifest = json.loads((output / "analysis-manifest.json").read_text(encoding="utf-8"))
    assert manifest["repeatability_check"]["status"] == "passed"
    assert all(step["status"] == "completed" for step in manifest["analyses"])
    report = (output / f"{output.name}-report.html").read_text(encoding="utf-8")
    payload = json.loads(report.split("<script>const D=", 1)[1].split(";\nconst names=", 1)[0])
    assert len(payload["inputLimitations"]["entries"]) == 11
    assert any("exit outcomes were not provided" in entry for entry in payload["inputLimitations"]["entries"])
    assert payload["cycles"]["cycles"] == ["Cycle A", "Cycle B"]
    assert next(iter(payload["cycles"]["repeat"]["overall"].values()))["Cycle A"]["n"] == 140
    assert "N/A" in payload["segments"]["Tenure"]["values"]
    assert "input-limitations.txt" in payload["downloads"]
    assert payload["commentThemes"]["overall"]
    with zipfile.ZipFile(output / f"{output.name}-share.zip") as archive:
        assert "input-limitations.txt" in archive.namelist()
        assert "private-preparation-copy.json" not in archive.namelist()
        assert "raw-snapshot.csv" not in archive.namelist()
        expected = "Input limitations\n\n" + "\n".join(payload["inputLimitations"]["entries"]) + "\n"
        assert archive.read("input-limitations.txt").decode() == expected
        for name in archive.namelist():
            assert not name.startswith("_input")
            assert "preparation-" not in name
            content = archive.read(name).decode("utf-8")
            assert "RAW_" not in content
            assert "PRIVATE_NOTE_SENTINEL" not in content
            assert "Our team has clear goals and priorities." not in content


def test_each_skill_has_first_priority_reference_folder():
    skills_dir = ROOT / "skills"
    skill_names = sorted(path.name for path in skills_dir.iterdir() if path.is_dir())

    assert skill_names == [
        "analyze-survey",
        "analyze-survey-ai-preview",
        "people-science-knowledge-vault",
    ]

    missing = [
        name
        for name in skill_names
        if not (skills_dir / name / "references/README.md").exists()
    ]

    assert missing == []
    assert not (ROOT / "references/skills").exists()
    for name in skill_names:
        skill = (skills_dir / name / "SKILL.md").read_text(encoding="utf-8")
        assert f"skills/{name}/references" not in skill


def test_analyze_survey_required_grounding_paths_are_skill_relative():
    skill_dir = ROOT / "skills/analyze-survey"
    required = [
        "../../references/design/glint-ui-system.md",
        "references/README.md",
        "references/linked-dataset.json",
        "references/golden-report.html",
        "references/scores-change-format.png",
        "references/interactive-report-contract.md",
        "references/interpretation.md",
        "references/people-science-summaries.schema.json",
        "references/people-science-source-index.json",
        "../people-science-knowledge-vault/references",
        "../../references/general/interpretation-guardrails.md",
        "../../references/general/privacy-and-minimum-n.md",
        "../../references/general/codebook-catalog.md",
    ]

    assert all((skill_dir / path).resolve().exists() for path in required)


def test_survey_interpretation_and_qa_workflow_is_consolidated():
    skill_dir = ROOT / "skills/analyze-survey"
    skill = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
    interpretation_path = skill_dir / "references/interpretation.md"
    interpretation = interpretation_path.read_text(encoding="utf-8")
    interpretation_text = " ".join(interpretation.split())

    assert "interpret existing vivaglint outputs" in skill
    existing_outputs = skill.split("### Existing analysis outputs", 1)[1].split(
        "### New survey analysis", 1
    )[0]
    assert "references/interpretation.md" in existing_outputs
    assert "Do not ask for a new ingest" in existing_outputs
    assert "rerun codebooks" in existing_outputs
    assert "require HTML/ZIP generation" in existing_outputs
    assert "Only after QA passes (Ready or Use with caveats)" in interpretation_text
    assert "knowledge-vault handoff" in existing_outputs
    assert "Purely conceptual" in existing_outputs
    assert "QA-only" in existing_outputs
    assert not (ROOT / "skills" / "analysis-qa").exists()
    qa = skill.split("## Analysis QA", 1)[1].split("## Primary workflow", 1)[0]
    for requirement in (
        "Execution completeness",
        "Input adequacy",
        "Privacy",
        "Statistical caution",
        "Comparison validity",
        "Interpretation readiness",
        "Ready / Use with caveats / Not ready",
        "outputs cannot be inspected",
        "repeatability failed",
        "required segment suppression is absent",
        "re-identification risk",
        "incompatible wording",
        "unstable factors",
        "Reuse QA already established",
    ):
        assert requirement in qa
    assert "../../people-science-knowledge-vault/SKILL.md" in interpretation
    assert "Use the vault's complete retrieval process" in interpretation_text
    assert "without requiring a manifest, survey data, QA, or a new analysis" in interpretation_text
    assert "retain the QA gate above" in interpretation_text
    assert "Keep observed survey findings, cited published guidance, and hypotheses clearly separate" in interpretation_text
    assert "Cite retrieved article bodies beside the claims" in interpretation_text

    for section in (
        "## Required grounding",
        "## Interpretation process",
        "### Executive takeaways",
        "### Evidence pattern",
        "### What not to over-interpret",
        "### Recommended follow-up",
        "## Guardrails",
    ):
        assert section in interpretation
    for safeguard in (
        "Analysis QA",
        "hard stops",
        "Do not overstate causality",
        "Do not name small groups",
        "Do not create manager-facing action plans in this workflow",
        "Do not substitute overall averages for missing benchmarks",
        "Do not label factors as definitive constructs",
    ):
        assert safeguard in interpretation_text

    for path in re.findall(r"`(\.\./[^`]+\.md)`", interpretation):
        assert (interpretation_path.parent / path).resolve().is_file()
    for document in ROOT.rglob("*.md"):
        assert "interpret-analysis" not in document.read_text(encoding="utf-8")


def test_new_analysis_intake_selects_reports_before_data_source():
    skill = (ROOT / "skills/analyze-survey/SKILL.md").read_text(encoding="utf-8")
    intake = skill.split("### New survey analysis", 1)[1].split("## Required grounding", 1)[0]
    assert intake.index("What type of analysis would you like to run?") < intake.index(
        "How would you like to bring in survey data?"
    )
    assert "multi-select array field" in intake
    assert "no preselected defaults" in intake
    assert "explicitly empty selection runs item scores only" in intake
    assert "Downloads and Methodology are always" in intake
    assert "Attrition\nanalysis also runs Attrition insights" in intake
    assert "pass them through\n`--analyses`" in intake
    assert "Existing-output QA/interpretation" in intake


def test_analyze_survey_points_to_linked_dataset():
    skill = (ROOT / "skills/analyze-survey/SKILL.md").read_text(encoding="utf-8")
    source_path = (
        ROOT / "skills/analyze-survey/references/linked-dataset.json"
    )
    source = json.loads(source_path.read_text(encoding="utf-8"))
    source_url = (
        "https://raw.githubusercontent.com/microsoft/glintlabs/main/"
        "skills/analyze-survey/references/sample-data/"
        "Demo%20Viva%20Glint%20Dataset%20with%20Attributes%20-%20Exit"
        "%20survey%20research%20guided.xlsx"
    )
    source_file_path = (
        "skills/analyze-survey/references/sample-data/"
        "Demo Viva Glint Dataset with Attributes - Exit survey research guided.xlsx"
    )

    assert re.findall(r"^> \d+\. (.+)$", skill, re.MULTILINE) == [
        "Demo Analysis",
        "CSV Upload",
    ]
    assert "Do not proceed past this question with an assumed default" in skill
    assert "Never recommend modifying the skill" in skill
    assert "vivaglint-configure_api_credentials" not in skill
    assert "vivaglint-import_survey_api" not in skill
    assert source["source_url"] == source_url
    assert source["source_path"] == source_file_path
    assert source["worksheet"] == "Sheet1"
    assert source["attribute_worksheet"] == "user_properties"
    assert "references/sample-data/" in skill
    assert "synthetic survey data" in skill
    assert "scripts/analyze_survey_export.py" in skill
    assert "--survey-export" in skill
    assert "references/design/glint-ui-system.md" in skill
    assert "Do not invent report colors" in skill
    assert "interactive-report-contract.md" in skill
    assert "golden-report.html" in skill
    assert "scores-change-format.png" in skill
    assert "progress bar" in skill
    assert "estimated completion time" in skill
    assert "first response that starts the run" in skill
    assert "people-science-summary-context.json" in skill
    assert "--summary-mode off" in skill
    assert "analyze-survey-ai-preview" in skill
    assert "<output-directory-name>-report.html" in skill
    assert "<output-directory-name>-share.zip" in skill
    preview_skill = (
        ROOT / "skills/analyze-survey-ai-preview/SKILL.md"
    ).read_text(encoding="utf-8")
    assert "--summary-mode required" in preview_skill
    assert "people-science-summaries.schema.json" in preview_skill
    assert "../analyze-survey/references/interpretation.md" in preview_skill
    assert "`people-science-knowledge-vault`" in preview_skill

    report_contract = (
        ROOT / "skills/analyze-survey/references/interactive-report-contract.md"
    ).read_text(encoding="utf-8")
    required_tabs = (
        "Correlation",
        "Factors",
        "Attrition analysis",
        "Attrition insights",
        "Scores change",
        "Downloads",
        "Methodology",
    )
    positions = [report_contract.index(f"**{name}**") for name in required_tabs]
    assert positions == sorted(positions)
    assert "OPEN_REPORT.html" in report_contract
    assert "Force the light Glint report theme" in report_contract
    assert "Glint Labs Figma Home frame" in report_contract
    assert "Do not embed or recalculate from" in report_contract
    assert "Exclude\nraw respondent data" in report_contract
    assert "scripts/build_interactive_report.py" in report_contract
    assert "Low (`|r| < .30`)" in report_contract
    assert "turn strength colors on or off" in report_contract
    assert "show or hide statistical-significance markers" in report_contract
    assert "individually remove multiple highlighted questions" in report_contract
    assert "average-linkage hierarchical clustering" in report_contract
    assert "3 through 15 clusters" in report_contract
    assert "extend the dropdown through the recommended count" in report_contract
    assert "top five" in report_contract.lower()
    assert "median" in report_contract
    assert "lowest-scoring privacy-eligible group" in report_contract
    assert "favorable or unfavorable category N" in report_contract
    assert "Always include a final **Methodology** tab after Downloads." in report_contract
    assert "Begin each subsection with an unlabeled explanation" in report_contract
    assert "**Example interpretation** and **Example action** callouts" in report_contract
    assert "deterministic keyword coding" in report_contract
    assert "Raw comments must never enter HTML" in report_contract
    assert "three high-scoring items" in report_contract
    assert "three low-scoring items" in report_contract
    assert "privacy-safe aggregate\n  comment themes" in report_contract
    assert "greater of 100 complete responses or five complete" in report_contract
    assert "positive-correlation distance (`1 - r`)" in report_contract
    assert "highest average silhouette score" in report_contract
    assert "Clicking a cell shows `r`, p-value, N, strength" in report_contract
    assert "Tab-level AI summary containers stay hidden in every mode" in report_contract
    assert "Tab-level AI cards remain hidden" in preview_skill
    assert "contains six summary cards" not in preview_skill
    assert "`off`: render no AI summary cards" in report_contract
    assert "`required`: fail report generation" in report_contract
    assert "Recalculate summaries when the report attribute or value changes" in report_contract
    assert (ROOT / "scripts/build_interactive_report.py").exists()
    golden = ROOT / "skills/analyze-survey/references/golden-report.html"
    assert golden.exists()
    golden_sha = hashlib.sha256(
        golden.read_bytes().replace(b"\r\n", b"\n")
    ).hexdigest()
    assert golden_sha in report_contract
    golden_text = golden.read_text(encoding="utf-8")
    for design_hook in (
        "lab-nav",
        "report-hero",
        "surveySummary",
        "summary-card",
        "filter-panel",
        "report-footer",
    ):
        assert design_hook in golden_text
    design_reference = ROOT / "references/design/glint-ui-system.md"
    assert design_reference.exists()
    design_text = design_reference.read_text(encoding="utf-8")
    assert "glint-ui-system" in design_text
    assert "9e67a00125de2fd15130d675af57d190bc8ae294" in design_text
    assert "--colorBrandForeground1: #335CCC" in design_text
    assert (ROOT / "skills/analyze-survey/references/scores-change-format.png").exists()
    runner = (ROOT / "scripts/run_vivaglint_analysis.py").read_text(encoding="utf-8")
    assert 'with_name("build_interactive_report.py")' in runner
    assert (ROOT / "scripts/analyze_survey_export.py").exists()
    builder = (ROOT / "scripts/build_interactive_report.py").read_text(encoding="utf-8")
    assert '"golden-report.html"' in builder
    assert "relationship matrices and cluster recommendations" in builder.casefold()
    summary_schema = json.loads(
        (
            ROOT
            / "skills/analyze-survey/references/people-science-summaries.schema.json"
        ).read_text(encoding="utf-8")
    )
    assert summary_schema["properties"]["tabs"]["required"] == [
        "changes",
        "relationships",
        "alerts",
        "factors",
        "attrition",
        "downloads",
    ]
    source_index = json.loads(
        (
            ROOT
            / "skills/analyze-survey/references/people-science-source-index.json"
        ).read_text(encoding="utf-8")
    )
    assert len(source_index["sources"]) >= 10
    assert all(
        len(source_index["defaults"][tab]) == 3
        for tab in summary_schema["properties"]["tabs"]["required"]
    )
    assert all(source["url"].startswith("https://") for source in source_index["sources"])
    assert (ROOT / "scripts/progress.py").exists()


def test_downloads_intro_explains_export_units_and_share_contents():
    golden = (ROOT / "skills/analyze-survey/references/golden-report.html").read_text(
        encoding="utf-8"
    )
    intro = re.search(
        r"<section class=panel id=downloads\b.*?<p class=tab-intro>(.*?)</p>",
        golden,
        re.DOTALL,
    ).group(1)
    assert "Survey means, standard deviations, and score changes" in intro
    assert "0-100 score points" in intro
    assert "Response-distribution labels use the equivalent 0-100 values" in intro
    assert "attrition multipliers keep their own units" in intro
    assert "without individual responses or raw comments" in intro
    assert intro.count("<br><br>") == 2
    assert "<br><br><br>" not in intro
    assert "Any number cited without its matching file is unverified" not in intro


def test_all_analysis_introductions_match_correlation_paragraph_spacing():
    golden = (ROOT / "skills/analyze-survey/references/golden-report.html").read_text(
        encoding="utf-8"
    )
    intros = dict(re.findall(
        r"<section class=panel id=([^ >]+)[^>]*>.*?<p class=tab-intro>(.*?)</p>",
        golden,
        re.DOTALL,
    ))
    for tab in ("relationships", "factors", "alerts", "attrition", "changes", "downloads"):
        assert "<br><br>" in intros[tab], tab
        assert "<br><br><br>" not in intros[tab], tab
        assert re.search(r"(?<!<br>)<br>(?!<br>)", intros[tab]) is None, tab


@pytest.mark.parametrize("has_attrition", [False, True])
def test_methodology_layout_follows_report_order_without_numbered_headings(has_attrition):
    script = ROOT / "scripts/build_interactive_report.py"
    spec = importlib.util.spec_from_file_location("survey_methodology_layout", script)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    golden = (ROOT / "skills/analyze-survey/references/golden-report.html").read_text(
        encoding="utf-8"
    )
    report = module.prepare_report_shell(golden, has_attrition)
    expected = ["correlation", "factors"]
    if has_attrition:
        expected.extend(["attrition-analysis", "attrition-alerts"])
    expected.append("scores-change")
    assert re.findall(r'data-methodology-section="([^"]+)"', report) == expected
    nav = re.search(r'<nav class="methodology-jump"[^>]*>(.*?)</nav>', report).group(1)
    assert re.findall(r'href="#methodology-([^"]+)"', nav) == expected
    assert "methodology-index" not in report
    labels = re.findall(r"<span class=methodology-label>(.*?)</span>", report)
    assert labels == ["Example interpretation", "Example action"] * len(expected)
    section_size = int(re.search(r"\.methodology-card h3\{[^}]*font-size:(\d+)px", report).group(1))
    title_size = int(re.search(r"section\.panel>h2[^{}]*\{[^}]*font-size:(\d+)px", report).group(1))
    assert 20 < section_size < title_size


def test_methodology_explains_statistics_instead_of_report_building():
    golden = (
        ROOT / "skills/analyze-survey/references/golden-report.html"
    ).read_text(encoding="utf-8")
    required = {
        "correlation": [
            "Pearson correlation", "degrees of freedom", "complete pairs",
            "silhouette score", "causation",
        ],
        "factors": [
            "Exploratory factor analysis", "Varimax rotation",
            "total standardized item variance", "communality",
            "measurement invariance",
        ],
        "attrition-analysis": [
            "recorded exit rate", "Neutral and missing answers",
            "cumulative windows overlap", "Fisher exact test",
        ],
        "attrition-alerts": [
            "median attrition multiplier", "equal weight", "pooled exit rates",
            "group score - company score", "does not require statistical significance",
        ],
        "scores-change": [
            "sample standard deviation", "two-sided normal approximation",
            "displayed rounded means", "not a paired test",
        ],
    }
    for section, phrases in required.items():
        explanation = re.search(
            rf'data-methodology-section="{section}".*?</h3></div><p>(.*?)</p>',
            golden, re.DOTALL,
        ).group(1)
        assert all(phrase in explanation for phrase in phrases), section
        assert explanation.count("<br><br>") == 2
        for implementation_term in (
            "builder", "client-side", "extract_survey_factors",
            "saved aggregate cut", "artifact",
        ):
            assert implementation_term not in explanation, section


def test_progress_reporter_shows_bar_percentage_phase_and_elapsed_time():
    script_path = ROOT / "scripts/progress.py"
    spec = importlib.util.spec_from_file_location("survey_progress", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)

    stream = StringIO()
    reporter = module.ProgressReporter(start=10, end=90, stream=stream)
    reporter.update(50, "Building relationships")
    output = stream.getvalue()

    assert "[############------------]" in output
    assert " 50%" in output
    assert "Building relationships" in output
    assert re.search(r"\(\d{2}:\d{2}\)", output)


def test_direct_export_runner_detects_csv_contract(tmp_path):
    survey = tmp_path / "survey.csv"
    survey.write_text(
        "user_id,Q_ONE,Q_TWO,department,email\n"
        "1,1,2,Sales,a@example.com\n"
        "2,2,3,Sales,b@example.com\n"
        "3,3,4,Engineering,c@example.com\n"
        "4,4,5,Engineering,d@example.com\n"
        "5,5,1,Finance,e@example.com\n",
        encoding="utf-8",
    )
    script_path = ROOT / "scripts/analyze_survey_export.py"
    spec = importlib.util.spec_from_file_location("analyze_survey_export", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    options = module.parse_args

    class Args:
        survey_export = str(survey)
        output_dir = str(tmp_path / "output")
        sheet = None
        attribute_sheet = None
        emp_id_col = None
        scale_points = 5
        question_cols = None
        attribute_cols = None
        min_group_size = 5

    config_path = module.build_config(Args(), Path(Args.output_dir))
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert config["emp_id_col"] == "user_id"
    assert config["question_cols"] == ["Q_ONE", "Q_TWO"]
    assert config["attribute_cols"] == ["department"]
    assert config["summary_mode"] == "off"
    assert "email" not in config["attribute_cols"]
    assert config["source_file_name"] == survey.name
    assert len(config["source_sha256"]) == 64


def test_direct_export_runner_accepts_attributes_from_both_workbook_sheets(tmp_path):
    survey = tmp_path / "survey.xlsx"
    script_path = ROOT / "scripts/analyze_survey_export.py"
    spec = importlib.util.spec_from_file_location(
        "analyze_survey_export_mixed_attributes", script_path
    )
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)

    survey_frame = module.pd.DataFrame(
        {
            "user_id": [1, 2, 3, 4, 5],
            "survey_cycle_title": ["H1", "H1", "H2", "H2", "H2"],
            "Q_ONE": [1, 2, 3, 4, 5],
            "Q_TWO": [2, 3, 4, 5, 1],
        }
    )
    attributes_frame = module.pd.DataFrame(
        {
            "user_id": [1, 2, 3, 4, 5],
            "Organization Group": ["A", "A", "B", "B", "B"],
            "Location": ["East", "West", "East", "West", "East"],
        }
    )
    with module.pd.ExcelWriter(survey) as writer:
        survey_frame.to_excel(writer, sheet_name="Sheet1", index=False)
        attributes_frame.to_excel(writer, sheet_name="user_properties", index=False)

    class Args:
        survey_export = str(survey)
        output_dir = str(tmp_path / "output")
        sheet = "Sheet1"
        attribute_sheet = "user_properties"
        emp_id_col = "user_id"
        scale_points = 5
        question_cols = None
        attribute_cols = [
            "Organization Group",
            "Location",
            "survey_cycle_title",
        ]
        min_group_size = 5

    config_path = module.build_config(Args(), Path(Args.output_dir))
    config = json.loads(config_path.read_text(encoding="utf-8"))

    assert config["attribute_cols"] == Args.attribute_cols
    assert config["attribute_view_mode"] == "separate"
    assert config["attribute_file"].endswith("attributes.csv")


def test_direct_export_runner_extracts_linked_comments_for_local_aggregation(tmp_path):
    survey = tmp_path / "survey.xlsx"
    script_path = ROOT / "scripts/analyze_survey_export.py"
    spec = importlib.util.spec_from_file_location(
        "analyze_survey_export_comments", script_path
    )
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)

    with module.pd.ExcelWriter(survey) as writer:
        module.pd.DataFrame(
            {
                "user_id": [1, 2, 3, 4, 5],
                "survey_cycle_title": ["H2"] * 5,
                "Q_ONE": [1, 2, 3, 4, 5],
                "Q_TWO": [2, 3, 4, 5, 1],
            }
        ).to_excel(writer, sheet_name="Sheet1", index=False)
        module.pd.DataFrame(
            {
                "user_id": [1, 2, 3, 4, 5],
                "question_uuid": ["Q_ONE"] * 5,
                "comment": ["private career growth wording"] * 5,
            }
        ).to_excel(writer, sheet_name="comments", index=False)

    class Args:
        survey_export = str(survey)
        output_dir = str(tmp_path / "output")
        sheet = None
        attribute_sheet = None
        emp_id_col = None
        scale_points = 5
        question_cols = None
        attribute_cols = None
        min_group_size = 5

    config_path = module.build_config(Args(), Path(Args.output_dir))
    config = json.loads(config_path.read_text(encoding="utf-8"))
    comments_path = Path(config["comments_file"])

    assert config["source_comment_sheet"] == "comments"
    assert config["comments_question_col"] == "question_uuid"
    assert config["comments_text_col"] == "comment"
    assert comments_path.name == "comments.csv"
    assert comments_path.parent.name == "_input"
    assert comments_path.exists()


def test_direct_export_runner_ignores_incompatible_q_outcomes(tmp_path):
    survey = tmp_path / "survey.csv"
    survey.write_text(
        "user_id,Q_ONE,Q_TWO,Q_EXIT_OUTCOME,department\n"
        "1,1,2,50,Sales\n"
        "2,2,3,75,Sales\n"
        "3,3,4,100,Engineering\n"
        "4,4,5,75,Engineering\n"
        "5,5,1,50,Finance\n",
        encoding="utf-8",
    )
    script_path = ROOT / "scripts/analyze_survey_export.py"
    spec = importlib.util.spec_from_file_location(
        "analyze_survey_export_outcomes", script_path
    )
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)

    class Args:
        survey_export = str(survey)
        output_dir = str(tmp_path / "output")
        sheet = None
        attribute_sheet = None
        emp_id_col = None
        scale_points = 5
        question_cols = None
        attribute_cols = None
        min_group_size = 5

    config_path = module.build_config(Args(), Path(Args.output_dir))
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert config["question_cols"] == ["Q_ONE", "Q_TWO"]


def test_registered_demo_requests_embedded_attrition(tmp_path):
    survey = (
        tmp_path
        / "Demo Viva Glint Dataset with Attributes - Exit survey research guided.xlsx"
    )
    survey.write_text("", encoding="utf-8")
    script_path = ROOT / "scripts/analyze_survey_export.py"
    spec = importlib.util.spec_from_file_location(
        "analyze_survey_export_attrition", script_path
    )
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    module.read_platform_export = lambda *args: None

    frame = module.pd.DataFrame(
        {
            "user_id": [1, 2, 1],
            "survey_cycle_id": [1002, 1002, 1003],
            "survey_completion_date": [
                module.pd.Timestamp("2026-06-01"),
                module.pd.Timestamp("2026-06-01"),
                module.pd.NaT,
            ],
            "Q_ONE": [4, 2, None],
        }
    )
    attributes = module.pd.DataFrame(
        {
            "user_id": [1, 2],
            "attrition date": [
                (module.pd.Timestamp("2026-07-15") - module.pd.Timestamp("1899-12-30")).days,
                None,
            ],
        }
    )
    with module.pd.ExcelWriter(survey) as workbook:
        frame.to_excel(workbook, sheet_name="Sheet1", index=False)
        attributes.to_excel(workbook, sheet_name="user_properties", index=False)
    module.read_export = lambda *args: (
        frame,
        survey,
        attributes,
        tmp_path / "attributes.csv",
        None,
        {
            "survey_sheet": "Sheet1",
            "attribute_sheet": "user_properties",
            "comment_sheet": None,
        },
    )

    class Args:
        survey_export = str(survey)
        output_dir = str(tmp_path / "output")
        sheet = None
        attribute_sheet = None
        emp_id_col = None
        scale_points = 5
        question_cols = None
        attribute_cols = None
        min_group_size = 5

    config_path = module.build_config(Args(), Path(Args.output_dir))
    config = json.loads(config_path.read_text(encoding="utf-8"))

    assert "attrition" in config["analyses"]
    assert config["embedded_attrition"]["predictor_cycle"] == 1002
    assert config["embedded_attrition"]["outcome_cycle"] == 1003
    assert (
        config["embedded_attrition"]["predictor_completion_date_column"]
        == "survey_completion_date"
    )
    assert config["embedded_attrition"]["predictor_completion_date"] == "2026-06-01"


def test_embedded_exit_attrition_uses_registered_cycles_and_windows(tmp_path):
    script_path = ROOT / "scripts/run_vivaglint_analysis.py"
    spec = importlib.util.spec_from_file_location(
        "run_vivaglint_analysis_attrition", script_path
    )
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    survey = tmp_path / "survey.csv"
    module.pd.DataFrame(
        {
            "user_id": [1, 2, 3, 1],
            "survey_cycle_id": [1002, 1002, 1002, 1003],
            "attrition date": [None, None, None, 46113],
            "Q_ONE": [5, 1, 3, None],
            "department": ["A", "A", "B", "A"],
        }
    ).to_csv(survey, index=False)
    config = {
        "embedded_attrition": {
            "cycle_column": "survey_cycle_id",
            "predictor_cycle": 1002,
            "outcome_cycle": 1003,
            "termination_date_column": "attrition date",
            "predictor_completion_date": "2025-12-15",
            "time_periods": [90, 180, 365],
        },
        "attrition_attribute_cols": ["department"],
    }

    result = module.embedded_exit_attrition(
        config,
        tmp_path / "analysis-config.json",
        survey,
        ["Q_ONE"],
        "user_id",
        1,
    )

    overall = result[result["analysis_scope"] == "overall"]
    assert overall["days"].tolist() == [90, 180, 365]
    assert overall["favorable_n"].tolist() == [1, 1, 1]
    assert overall["unfavorable_n"].tolist() == [1, 1, 1]
    assert overall["favorable_attrition"].tolist() == [0.0, 1.0, 1.0]
    assert overall["unfavorable_attrition"].tolist() == [0.0, 0.0, 0.0]
    assert module.pd.isna(overall["attrition_ratio"].iloc[0])
    assert overall["attrition_ratio"].iloc[1:].tolist() == [0.0, 0.0]


@pytest.mark.parametrize(
    "ratios,suppressed_days,expected",
    [
        ({90: 3.0, 180: 2.0, 365: 4.0}, set(), 180),
        ({90: 3.0, 180: float("nan"), 365: 4.0}, set(), 365),
        ({90: 3.0, 180: 2.0, 365: 4.0}, {180}, 365),
        ({90: 3.0, 180: float("inf"), 365: 4.0}, set(), 365),
        ({180: 0.0, 365: 4.0}, set(), 180),
        ({90: 3.0, 365: 4.0}, set(), 365),
        ({90: 3.0, 180: float("nan"), 365: float("nan")}, set(), 90),
        ({90: float("nan"), 180: float("nan"), 365: float("nan")}, set(), 90),
    ],
)
def test_attrition_defaults_prefer_populated_windows(
    tmp_path, ratios, suppressed_days, expected
):
    spec = importlib.util.spec_from_file_location(
        "build_interactive_report_defaults",
        ROOT / "scripts/build_interactive_report.py",
    )
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    path = tmp_path / "attrition.csv"
    module.pd.DataFrame(
        [
            {
                "analysis_scope": scope,
                "attribute_name": "department" if scope == "attribute" else "",
                "attribute_value": "Engineering" if scope == "attribute" else "",
                "question": "Q_ONE",
                "days": day,
                "favorable_n": 1 if day in suppressed_days else 100,
                "unfavorable_n": 100,
                "favorable_attrition": 0.1,
                "unfavorable_attrition": 0.3,
                "attrition_ratio": ratio,
            }
            for scope in ("overall", "attribute")
            for day, ratio in ratios.items()
        ]
    ).to_csv(path, index=False)
    overall = [[75, 0, 0, 0, 200]]
    segments = {
        "department": {
            "label": "Department",
            "values": {"Engineering": {"items": [[65, 0, 0, 0, 200]]}},
        }
    }
    payload = module.attrition_payload(path, ["Q_ONE"], segments, 5)
    alerts = module.attrition_alert_payload(
        path, ["Q_ONE"], segments, overall, 5
    )
    assert payload["defaultDays"] == expected
    assert alerts["defaultDays"] == expected
    golden = (
        ROOT / "skills/analyze-survey/references/golden-report.html"
    ).read_text(encoding="utf-8")
    report = module.inject_attrition_report(
        module.prepare_report_shell(golden, True), payload, alerts, None
    )
    selected_index = payload["days"].index(expected)
    assert f"<option value={selected_index} selected>{expected} days" in report
    assert f"<option value={expected} selected>{expected} days" in report
    if all(module.pd.isna(ratio) for ratio in ratios.values()):
        assert all(row[8] is None for row in payload["rows"])
        assert not any(alerts["byDay"].values())
        assert "No usable multipliers are available for this selection." in report


def test_attrition_default_uses_initial_company_view(tmp_path):
    spec = importlib.util.spec_from_file_location(
        "build_interactive_report_company_default",
        ROOT / "scripts/build_interactive_report.py",
    )
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    path = tmp_path / "attrition.csv"
    module.pd.DataFrame(
        [
            {
                "analysis_scope": scope,
                "attribute_name": "department" if scope == "attribute" else "",
                "attribute_value": "Engineering" if scope == "attribute" else "",
                "question": "Q_ONE",
                "days": day,
                "favorable_n": 100,
                "unfavorable_n": 100,
                "favorable_attrition": 0.1,
                "unfavorable_attrition": 0.3,
                "attrition_ratio": ratio,
            }
            for scope, day, ratio in (
                ("overall", 180, float("nan")),
                ("overall", 365, 3.0),
                ("attribute", 180, 3.0),
            )
        ]
    ).to_csv(path, index=False)
    segments = {
        "department": {"values": {"Engineering": {}}}
    }
    payload = module.attrition_payload(path, ["Q_ONE"], segments, 5)
    assert payload["defaultDays"] == 365
    assert module.default_attrition_days([], set()) is None


def test_attrition_report_injection_adds_live_filtered_table(tmp_path):
    script_path = ROOT / "scripts/build_interactive_report.py"
    spec = importlib.util.spec_from_file_location(
        "build_interactive_report_attrition", script_path
    )
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    attrition = tmp_path / "attrition.csv"
    module.pd.DataFrame(
        [
            {
                "analysis_scope": "overall",
                "attribute_name": "",
                "attribute_value": "",
                "question": "Q_ONE",
                "days": days,
                "favorable_n": 100,
                "favorable_attrition": 0.1,
                "unfavorable_n": 100,
                "unfavorable_attrition": 0.3,
                "attrition_ratio": 3.0,
                "group_size": 200,
            }
            for days in (90, 180, 365)
        ]
    ).to_csv(attrition, index=False)
    payload = module.attrition_payload(attrition, ["Q_ONE"], {}, 5)
    alerts_payload = {
        "questions": ["Q_ONE"],
        "labels": ["One"],
        "days": [90, 180, 365],
        "defaultDays": 180,
        "byDay": {},
        "minimumCategoryN": 5,
        "method": "test",
    }
    golden = (
        ROOT / "skills/analyze-survey/references/golden-report.html"
    ).read_text(encoding="utf-8")
    report = module.inject_attrition_report(
        module.prepare_report_shell(golden, True),
        payload,
        alerts_payload,
        "2025-12-15",
    )

    assert payload["days"] == [90, 180, 365]
    assert len(payload["rows"]) == 3
    assert payload["rows"][0][10] < 0.05
    assert payload["rows"][0][11] == 1
    assert "id=attritionTableBody" in report
    assert 'id=copyAttritionTable aria-label="Copy Attrition analysis as image"' in report
    assert 'id=exportAttritionTable aria-label="Export Attrition analysis data as CSV"' in report
    assert 'title="Copy image to clipboard"' in report
    assert '<div class=visual-wrap id=attritionVisual><div class=visual-toolbar>' in report
    assert 'document.querySelector("#copyAttritionTable").innerHTML=IMAGE_ICON;' in report
    assert 'document.querySelector("#exportAttritionTable").innerHTML=CSV_ICON;' in report
    assert report.index('id=exportAttritionTable') < report.index('id=copyAttritionTable')
    assert "id=attritionExportStatus role=status" in report
    assert "function attritionExportRows()" in report
    assert "await copyVisualImage(capture,toolbar)" in report
    assert 'scroll.style.maxHeight="none"' in report
    assert "capture?.remove()" in report
    assert "downloadCsv(`attrition-analysis-${days}days.csv`,rows)" in report
    assert "id=alertsList" in report
    assert ">Attrition insights</button>" in report
    assert "<h2>Attrition insights</h2>" in report
    assert "Attrition alerts" not in report
    assert ">Methodology</button>" in report
    assert 'data-methodology-section="attrition-analysis"' in report
    assert 'data-methodology-section="attrition-alerts"' in report
    assert "<option value=1 selected>180 days (6 months)</option>" in report
    assert "ATTRITION_DATA" in report
    assert "attr.addEventListener(\"change\"" in report
    assert "<th>Item text</th><th>Attrition multiplier</th>" in report
    assert "attrition-bar-track" in report
    assert "attrition-baseline" in report
    assert "marker = 1.00x" in report
    assert "Statistically significant" in report
    assert "Fisher exact test" in report
    assert "This analysis compares later recorded exit rates" in report
    assert (
        "For example, a 3.2x multiplier on eSat means employees who answered "
        "unfavorably were 3.2 times as likely to leave within 180 days of survey "
        "completion as those who answered favorably."
    ) in report
    assert "Start with 180 days when results are available" in report
    assert "defaults to 365 days if that window has no usable results" in report
    assert "not three independent confirmations" in report
    assert "not individual employment decisions" in report
    canonical_intro = re.search(
        r"<section class=panel id=attrition\b.*?(<p class=tab-intro>.*?</p>)",
        golden,
        re.DOTALL,
    )
    rendered_intro = re.search(
        r"<section class=panel id=attrition\b.*?(<p class=tab-intro>.*?</p>)",
        report,
        re.DOTALL,
    )
    assert canonical_intro is not None and rendered_intro is not None
    assert rendered_intro.group(1) == canonical_intro.group(1)
    assert rendered_intro.group(1).count("<br><br>") == 3
    assert "<br><br><br>" not in rendered_intro.group(1)
    assert report.index(rendered_intro.group(1)) < report.index("id=attritionDays")
    assert report.index("id=attritionDays") < report.index("id=attritionVisual")
    alerts_intro = re.search(
        r"<section class=panel id=alerts\b.*?<p class=tab-intro>(.*?)</p>",
        report,
        re.DOTALL,
    ).group(1)
    assert "later exits.<br><br>Start" in alerts_intro
    assert report.index(alerts_intro) < report.index("id=alertDays")
    higher_minimum_report = module.inject_attrition_report(
        module.prepare_report_shell(golden, True),
        {**payload, "minimumCategoryN": 10},
        alerts_payload,
        "2025-12-15",
    )
    assert "fewer than 10 favorable or unfavorable respondents" in higher_minimum_report
    assert "fewer than five favorable or unfavorable respondents" not in higher_minimum_report
    assert "Start with the largest score gaps" in report
    assert "<th>Favorable n</th>" not in report
    assert "<th>Favorable attrition</th>" not in report
    assert "<th>Unfavorable n</th>" not in report
    assert "<th>Unfavorable attrition</th>" not in report
    assert "fewer than 5 favorable or unfavorable respondents" in report
    assert "2025-12-15" in report


def test_survey_summary_omits_cross_item_averages_but_keeps_item_scores_and_movement():
    node = shutil.which("node")
    if node is None:
        pytest.skip("Node.js is required to exercise the survey summary.")
    golden = (ROOT / "skills/analyze-survey/references/golden-report.html").read_text(
        encoding="utf-8"
    )
    renderer = next(
        line for line in golden.splitlines()
        if line.startswith("function renderSurveySummary()")
    )
    checks = r"""
const assert=require("node:assert/strict"),root={innerHTML:""};
const D={questions:["Q_ONE","Q_TWO"],labels:{Q_ONE:"Role fit",Q_TWO:"Career"},
  cycles:{cycles:["Earlier","Latest"]},commentThemes:{}};
const attr={value:""},val={value:""};
globalThis.document={querySelector(){return root}};
function selectedScope(){return attr.value?"Department: Sales":"All employees"}
const cycleValues={
  Earlier:{n:40,items:[[75,20,40],[60,20,40]]},
  Latest:{n:40,items:[[80,20,40],[70,20,40]]}
};
function cycleSource(){return cycleValues}
function compactN(value){return String(value)}
function escapeHtml(value){return String(value)}
for(const filtered of [false,true]){
  attr.value=filtered?"department":"";val.value=filtered?"Sales":"";
  renderSurveySummary();
  assert.ok(!root.innerHTML.includes("summary-score"));
  assert.ok(!root.innerHTML.includes("Average item score"));
  assert.ok(root.innerHTML.includes(selectedScope()));
  assert.ok(root.innerHTML.includes("<h1>Latest</h1>"));
  assert.ok(root.innerHTML.includes("40 responses"));
  assert.ok(root.innerHTML.includes("<strong>80</strong>"));
  assert.ok(root.innerHTML.includes("<strong>70</strong>"));
  assert.ok(!root.innerHTML.toLowerCase().includes("average"));
  assert.ok(root.innerHTML.includes("The largest improvement was Career (+10)."));
  assert.ok(root.innerHTML.includes("High scoring items"));
  assert.ok(root.innerHTML.includes("Low scoring items"));
}
cycleValues.Latest.items[1]=[50,20,40];
renderSurveySummary();
assert.ok(root.innerHTML.includes("The largest decline was Career (-10)."));
cycleValues.Latest.items=[[75,20,40],[60,20,40]];
renderSurveySummary();
assert.ok(root.innerHTML.includes("Comparable item scores were unchanged from Earlier."));
assert.ok(!root.innerHTML.toLowerCase().includes("average"));
cycleValues.Latest.items=[[80,20,40],[70,20,40]];
cycleValues.Latest.items[1]=[null,null,null];
cycleValues.Earlier.items[0]=[null,null,null];
renderSurveySummary();
assert.ok(root.innerHTML.includes("<strong>80</strong>"));
assert.ok(!root.innerHTML.includes("Career"));
assert.ok(!root.innerHTML.includes("<strong>0</strong>"));
assert.ok(!root.innerHTML.includes("+80"));
assert.ok(root.innerHTML.includes("A comparable prior survey cycle is not available"));
"""
    subprocess.run(
        [node, "-e", renderer + "\n" + checks], check=True,
        capture_output=True, text=True, encoding="utf-8", timeout=30,
    )


def test_report_filters_move_with_tabs_without_resetting_selections():
    node = shutil.which("node")
    if node is None:
        pytest.skip("Node.js is required to exercise report filters.")
    golden = (ROOT / "skills/analyze-survey/references/golden-report.html").read_text(
        encoding="utf-8"
    )
    helper = re.search(
        r"^function placeReportFilters\(tabId\)\{.*?^\}",
        golden, re.DOTALL | re.MULTILINE,
    ).group(0)
    checks = r"""
const assert=require("node:assert/strict");
const attr={value:"department"},val={value:"Sales"},cycleLabel={hidden:false};
const cycle={value:"Latest",closest(){return cycleLabel}};
const help={},note={},filters={hidden:true,querySelector(){return help}};
const panels=Object.fromEntries(["relationships","factors","changes","attrition","alerts","downloads","methodology"].map(id=>[
  id,{querySelector(selector){assert.equal(selector,".tab-intro");return{after(element){
    assert.equal(element,filters);element.parentId=id;
  }}}}
]));
globalThis.document={
  getElementById(id){return panels[id]},
  querySelector(selector){return selector==="#reportFilters"?filters:note}
};
function cycleAwareScope(){return"Department: Sales; Survey cycle: Latest"}
function selectedScope(){return"Department: Sales"}
for(const id of ["relationships","changes","attrition","alerts","factors"]){
  placeReportFilters(id);
  assert.equal(filters.hidden,false);
  assert.equal(filters.parentId,id);
  const cycleApplies=["relationships","factors"].includes(id);
  assert.equal(cycleLabel.hidden,!cycleApplies);
  assert.equal(note.textContent,cycleApplies?cycleAwareScope():selectedScope());
  assert.equal(attr.value,"department");assert.equal(val.value,"Sales");assert.equal(cycle.value,"Latest");
}
for(const id of ["downloads","methodology"]){
  placeReportFilters(id);assert.equal(filters.hidden,true);
}
placeReportFilters("relationships");
assert.equal(filters.parentId,"relationships");assert.equal(filters.hidden,false);
assert.match(help.textContent,/work together/);
"""
    subprocess.run(
        [node, "-e", helper + "\n" + checks], check=True,
        capture_output=True, text=True, encoding="utf-8", timeout=30,
    )


def test_visual_exports_use_current_relevant_filter_context_and_safe_cells():
    node = shutil.which("node")
    if node is None:
        pytest.skip("Node.js is required to exercise visual export context.")
    golden = (ROOT / "skills/analyze-survey/references/golden-report.html").read_text(
        encoding="utf-8"
    )
    helpers = [re.search(r"^function csvEscape\(.*$", golden, re.MULTILINE).group(0)]
    for name in ("visualFilterContext", "rowsWithFilterContext"):
        helpers.append(re.search(
            rf"^function {name}\(.*?^\}}", golden, re.DOTALL | re.MULTILINE,
        ).group(0))
    checks = r"""
const assert=require("node:assert/strict");
const D={segments:{department:{label:"Department"}}};
const attr={value:"department"},val={value:"Sales"},cycle={value:"Latest"};
const names=["Role fit","Career"],relFocus=new Set([1]);
const relColor={checked:true},relSignificance={checked:false};
const controls={};
function select(id,text,value=text){controls[id]={value,selectedOptions:[{textContent:text}],disabled:false}}
globalThis.document={querySelector(selector){return controls[selector]||null}};
select("#relClusters","4 clusters","4");select("#relStrength","High+",".5");
select("#oldCycle","Earlier");select("#newCycle","Latest");
select("#respondentPopulation","Repeat respondents","repeat");
select("#attritionDays","180 days (6 months)","1");select("#alertDays","365 days","365");
let context=Object.fromEntries(visualFilterContext("relationships"));
assert.deepEqual(context,{
  "Report attribute":"Department",Value:"Sales","Survey cycle":"Latest",
  Clusters:"4 clusters","Minimum strength":"High+","Highlighted questions":"Career",
  Color:"On",Significance:"Hidden"
});
const input=[["Item","Score"],["Role fit","72"]];
let exported=rowsWithFilterContext(input,"changes");
assert.deepEqual(exported,[
  ["Item","Score","Report attribute","Value","Old survey cycle","New survey cycle","Respondent population"],
  ["Role fit","72","Department","Sales","Earlier","Latest","Repeat respondents"]
]);
assert.deepEqual(input,[["Item","Score"],["Role fit","72"]]);
val.value=' =HYPERLINK("unsafe")';
controls["#respondentPopulation"].selectedOptions[0].textContent="All respondents";
exported=rowsWithFilterContext(input,"changes");
assert.equal(exported[1][3],val.value);
assert.match(csvEscape(exported[1][3]),/^"'/);
assert.equal(exported[1].at(-1),"All respondents");
assert.equal(csvEscape('Career, "growth"'),'"Career, ""growth""'+'"');
attr.value="";
context=Object.fromEntries(visualFilterContext("factors"));
assert.deepEqual(context,{"Report attribute":"Company overall",Value:"All employees","Survey cycle":"Latest"});
cycle.value="";
assert.equal(Object.fromEntries(visualFilterContext("factors"))["Survey cycle"],"All cycles");
for(const [tab,window] of [["attrition","180 days (6 months)"],["alerts","365 days"]]){
  context=Object.fromEntries(visualFilterContext(tab));
  assert.deepEqual(context,{"Report attribute":"Company overall",Value:"All employees","Outcome window":window});
}
controls["#relClusters"].disabled=true;
assert.equal(Object.fromEntries(visualFilterContext("relationships")).Clusters,"Unavailable");
assert.deepEqual(rowsWithFilterContext([],"changes"),[]);
"""
    subprocess.run(
        [node, "-e", "\n".join(helpers) + "\n" + checks], check=True,
        capture_output=True, text=True, encoding="utf-8", timeout=30,
    )


def test_visual_png_copy_adds_filter_footnote_and_preserves_download_fallback():
    node = shutil.which("node")
    if node is None:
        pytest.skip("Node.js is required to exercise PNG exports.")
    golden = (ROOT / "skills/analyze-survey/references/golden-report.html").read_text(
        encoding="utf-8"
    )
    helpers = []
    for name in ("wrapVisualText", "copyVisualImage"):
        helpers.append(re.search(
            rf"^(?:async )?function {name}\(.*?^\}}",
            golden, re.DOTALL | re.MULTILINE,
        ).group(0))
    checks = r"""
const assert=require("node:assert/strict");
let capture,canvas,svgCount=0,revoked=0,downloaded=0,copied=0,encodingFails=false;
const footnotes=[],messages=[],errors=[];
const toolbar={closest(){return{id:"changes"}}};
const el={
  scrollWidth:1000,getBoundingClientRect(){return{width:800}},
  querySelectorAll(){return[{scrollWidth:1200}]},
  cloneNode(){capture={
    style:{},scroll:{style:{}},heading:{style:{}},removed:false,
    removeAttribute(){},setAttribute(){},
    querySelectorAll(selector){
      if(selector===".scroll")return[this.scroll];
      if(selector==="th")return[this.heading];
      return[];
    },
    remove(){this.removed=true}
  };return capture}
};
const context={
  measureText(text){return{width:text.length*6}},
  scale(){},fillRect(){},drawImage(){},
  fillText(text){footnotes.push(text)}
};
globalThis.document={
  body:{appendChild(node){assert.equal(node,capture)}},
  createElement(tag){assert.equal(tag,"canvas");canvas={
    getContext(){return context},
    toBlob(resolve){resolve(encodingFails?null:new Blob(["png"],{type:"image/png"}))}
  };return canvas}
};
globalThis.getComputedStyle=()=>({color:"text",backgroundColor:"surface"});
globalThis.URL={createObjectURL(){return"blob:"+ ++svgCount},revokeObjectURL(){revoked++}};
globalThis.Image=class{set src(value){queueMicrotask(()=>this.onload())}};
Object.defineProperty(globalThis,"navigator",{value:{},configurable:true});
globalThis.window={};
function visualFilterContext(tab){
  assert.equal(tab,"changes");return[["Report attribute","Department"],["Value","Sales"],["Respondent population","Repeat respondents"]];
}
function domToSvgMarkup(node){
  assert.equal(node,capture);
  assert.equal(node.style.width,"1200px");
  assert.equal(node.scroll.style.maxHeight,"none");
  assert.equal(node.scroll.style.overflow,"visible");
  assert.equal(node.heading.style.position,"static");
  return{width:1200,height:900,svg:"<svg/>"}
}
function downloadBlob(blob,filename){assert.equal(blob.type,"image/png");assert.equal(filename,"visual.png");downloaded++}
function showVisualToast(target,message){assert.equal(target,toolbar);messages.push(message)}
console.error=(...args)=>errors.push(args);
(async()=>{
  await copyVisualImage(el,toolbar);
  assert.equal(downloaded,1);assert.equal(capture.removed,true);
  assert.equal(canvas.width,2400);assert.ok(canvas.height>1800);
  assert.match(footnotes.join(" "),/Value: Sales/);
  assert.match(footnotes.join(" "),/Respondent population: Repeat respondents/);
  assert.equal(messages.at(-1),"Image downloaded");
  window.ClipboardItem=globalThis.ClipboardItem=class{constructor(data){assert.ok(data["image/png"])}};
  navigator.clipboard={async write(items){assert.equal(items.length,1);copied++}};
  await copyVisualImage(el,toolbar);
  assert.equal(copied,1);assert.equal(downloaded,1);assert.equal(messages.at(-1),"Image copied");
  navigator.clipboard.write=async()=>{throw new Error("Permission denied")};
  await copyVisualImage(el,toolbar);
  assert.equal(downloaded,2);assert.equal(messages.at(-1),"Image downloaded");
  encodingFails=true;
  await copyVisualImage(el,toolbar);
  assert.equal(downloaded,2);assert.equal(messages.at(-1),"Copy failed");
  assert.equal(errors[0][0],"copyVisualImage failed");
  assert.equal(capture.removed,true);assert.equal(revoked,svgCount);
  assert.deepEqual(wrapVisualText(context,"unbrokenlongvalue",18),["unb","rok","enl","ong","val","ue"]);
})().catch(error=>{process.stderr.write(String(error));process.exitCode=1});
"""
    subprocess.run(
        [node, "-e", "\n".join(helpers) + "\n" + checks], check=True,
        capture_output=True, text=True, encoding="utf-8", timeout=30,
    )


def test_attrition_table_exports_preserve_filters_and_suppression():
    node = shutil.which("node")
    if node is None:
        pytest.skip("Node.js is required to exercise the report export helpers.")
    script_path = ROOT / "scripts/build_interactive_report.py"
    spec = importlib.util.spec_from_file_location(
        "build_interactive_report_exports", script_path
    )
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    golden = (
        ROOT / "skills/analyze-survey/references/golden-report.html"
    ).read_text(encoding="utf-8")
    report = module.inject_attrition_report(
        module.prepare_report_shell(golden, True),
        {"days": [90, 180, 365], "defaultDays": 180, "minimumCategoryN": 5},
        {"days": [90, 180, 365], "defaultDays": 180},
        None,
    )
    helpers = []
    for name in ("attritionExportRows", "copyAttritionTable", "exportAttritionTable"):
        match = re.search(
            rf"(?:async )?function {name}\(\)\{{.*?^\}}",
            report,
            re.DOTALL | re.MULTILINE,
        )
        assert match is not None
        if name == "copyAttritionTable":
            assert "writeText" not in match.group(0)
            assert "copyVisualImage(capture,toolbar)" in match.group(0)
        helpers.append(match.group(0))
    checks = r"""
const assert=require("node:assert/strict");
const ATTRITION_DATA={days:[90,180,365]};
const D={segments:{department:{label:"Department"}}};
const attr={value:"department"},val={value:"Sales"};
const windowSelect={value:"1"},status={textContent:""};
function row(rank,label,item,multiplier,significance){
  const fields={
    ".attrition-rank":rank,
    ".attrition-question":label,
    ".attrition-question-id":item,
    ".attrition-multiplier, .attrition-suppressed":multiplier,
    ".attrition-significant, .attrition-not-significant":significance
  };
  return{querySelector(selector){
    return fields[selector]?{textContent:fields[selector]}:null;
  }};
}
const body={rows:[
  row("1",'=HYPERLINK("example")',"Q_ONE","3.20x","Statistically significant"),
  row("2",'Career,\t"growth"\n',"Q_TWO","Suppressed","")
]};
const toolbar={},captureScroll={style:{}};
const capture={
  style:{},removeAttribute(){},setAttribute(){},
  querySelectorAll(){return[]},
  querySelector(selector){assert.equal(selector,".scroll");return captureScroll},
  prepend(note){assert.equal(note.context,"Department: Sales · 180-day outcome window")},
  remove(){this.removed=true}
};
const visual={
  querySelector(selector){
    if(selector===".visual-toolbar")return toolbar;
    assert.equal(selector,".scroll");return{scrollWidth:1000};
  },
  getBoundingClientRect(){return{width:900}},
  cloneNode(){capture.removed=false;return capture}
};
const elements={
  "#attritionTableBody":body,
  "#attritionDays":windowSelect,
  "#attritionExportStatus":status,
  "#attritionVisual":visual,
  "#attritionFilterNote":{cloneNode(){return{context:"Department: Sales · 180-day outcome window"}}}
};
globalThis.document={body:{appendChild(element){assert.equal(element,capture)}},querySelector(selector){
  if(selector==="#attritionTableBody .attrition-question"){
    return body.rows[0]?.querySelector(".attrition-question")||null;
  }
  assert.ok(selector in elements);
  return elements[selector];
}};
let copied,downloaded;
async function copyVisualImage(element,targetToolbar){
  assert.equal(element,capture);
  assert.equal(targetToolbar,toolbar);
  assert.equal(capture.style.width,"1002px");
  assert.equal(capture.style.position,"fixed");
  assert.equal(captureScroll.style.maxHeight,"none");
  assert.equal(captureScroll.style.overflow,"visible");
  copied=element;
}
function downloadCsv(filename,rows){downloaded={filename,rows}}
const errors=[];
console.error=(...args)=>errors.push(args);
(async()=>{
  const rows=attritionExportRows();
  assert.deepEqual(rows,[
    ["Population","Outcome window (days)","Rank","Item text","Item ID","Attrition multiplier","Significance"],
    ["Department: Sales","180","1",'\'=HYPERLINK("example")',"Q_ONE","3.20x","Statistically significant"],
    ["Department: Sales","180","2",'Career, "growth"',"Q_TWO","Suppressed",""]
  ]);
  await copyAttritionTable();
  assert.equal(copied,capture);
  assert.equal(capture.removed,true);
  assert.equal(status.textContent,"");
  exportAttritionTable();
  assert.deepEqual(downloaded,{filename:"attrition-analysis-180days.csv",rows});
  assert.equal(status.textContent,"CSV exported.");
  attr.value="";
  windowSelect.value="0";
  const overall=attritionExportRows();
  assert.equal(overall[1][0],"Company overall");
  assert.equal(overall[1][1],"90");
  exportAttritionTable();
  assert.equal(downloaded.filename,"attrition-analysis-90days.csv");
  copyVisualImage=async()=>{throw new Error("Capture failed")};
  await copyAttritionTable();
  assert.equal(status.textContent,"Image copy failed. Try again.");
  assert.equal(errors[0][0],"copyAttritionTable failed");
  assert.equal(capture.removed,true);
  body.rows=[];
  assert.deepEqual(attritionExportRows(),[]);
  await copyAttritionTable();
  assert.equal(status.textContent,"No data to copy.");
  exportAttritionTable();
  assert.equal(status.textContent,"No data to export.");
})().catch(error=>{process.stderr.write(String(error));process.exitCode=1});
"""
    subprocess.run(
        [node, "-e", "\n".join(helpers) + "\n" + checks],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=30,
    )


def test_direct_export_runner_excludes_identifier_attributes(tmp_path):
    survey = tmp_path / "survey.csv"
    survey.write_text(
        "user_id,Q_ONE,Q_TWO,department,manager_id,team_id,client_uuid,attrition date\n"
        "1,1,2,Sales,101,A,client-a,46113\n"
        "2,2,3,Sales,101,A,client-a,46114\n"
        "3,3,4,Engineering,202,B,client-b,46115\n"
        "4,4,5,Engineering,202,B,client-b,46116\n"
        "5,5,1,Finance,303,C,client-c,46117\n",
        encoding="utf-8",
    )
    script_path = ROOT / "scripts/analyze_survey_export.py"
    spec = importlib.util.spec_from_file_location(
        "analyze_survey_export_identifiers", script_path
    )
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)

    class Args:
        survey_export = str(survey)
        output_dir = str(tmp_path / "output")
        sheet = None
        attribute_sheet = None
        emp_id_col = None
        scale_points = 5
        question_cols = None
        attribute_cols = None
        min_group_size = 5

    config_path = module.build_config(Args(), Path(Args.output_dir))
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert config["attribute_cols"] == ["department"]


def test_privacy_safe_team_frame_replaces_identifier_values():
    script_path = ROOT / "scripts/build_interactive_report.py"
    spec = importlib.util.spec_from_file_location(
        "build_interactive_report_private_teams", script_path
    )
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    frame = module.pd.DataFrame({"manager_id": [43002, 27120, 43002]})

    safe, team_col = module.privacy_safe_team_frame(frame, "manager_id")

    assert team_col == "__team_label"
    assert set(safe[team_col]) == {"Team 001", "Team 002"}
    assert set(safe["manager_id"]) == {43002, 27120}


def test_report_builder_excludes_rows_without_selected_item_responses():
    script_path = ROOT / "scripts/build_interactive_report.py"
    spec = importlib.util.spec_from_file_location(
        "build_interactive_report_response_rows", script_path
    )
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    frame = module.pd.DataFrame(
        {
            "user_id": [1, 2, 3],
            "Q_ONE": [1.0, None, None],
            "Q_TWO": [None, 4.0, None],
        }
    )

    filtered = module.survey_response_rows(frame, ["Q_ONE", "Q_TWO"])

    assert filtered["user_id"].tolist() == [1, 2]


def test_comment_themes_require_privacy_threshold_and_follow_filters(tmp_path):
    script_path = ROOT / "scripts/build_interactive_report.py"
    spec = importlib.util.spec_from_file_location(
        "build_interactive_report_comment_themes", script_path
    )
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    frame = module.pd.DataFrame(
        {
            "user_id": list(range(1, 10)),
            "survey_cycle_title": ["H2"] * 9,
            "segment": ["A"] * 5 + ["B"] * 4,
            "Q_ONE": [5] * 9,
            "Q_TWO": [2] * 9,
        }
    )
    frame["__employee_id"] = frame["user_id"]
    comments = tmp_path / "comments.csv"
    module.pd.DataFrame(
        {
            "user_id": list(range(1, 10)) + list(range(1, 5)),
            "survey_cycle_title": ["H2"] * 13,
            "question_uuid": ["Q_ONE"] * 9 + ["Q_TWO"] * 4,
            "sentiment": (
                ["favorable"] * 5
                + ["neutral"] * 4
                + ["unfavorable"] * 4
            ),
            "comment": (
                ["private career growth wording"] * 9
                + ["private manager coaching wording"] * 4
            ),
        }
    ).to_csv(comments, index=False)

    payload = module.comment_theme_payload(
        comments,
        frame,
        ["Q_ONE", "Q_TWO"],
        {"segment": {"values": ["A", "B"]}},
        "user_id",
        "survey_cycle_title",
        "question_uuid",
        "comment",
    )
    serialized = json.dumps(payload)

    assert payload["overall"]["H2"]["Q_ONE"][0][0] == "Career growth and development"
    assert "Q_TWO" not in payload["overall"]["H2"]
    assert payload["segments"]["segment"]["A"]["H2"]["Q_ONE"]
    assert "B" not in payload["segments"]["segment"]
    assert payload["minimumComments"] == 5
    assert set(payload) == {"overall", "segments", "minimumComments"}
    assert "private career growth wording" not in serialized
    assert "private manager coaching wording" not in serialized


def test_direct_export_runner_normalizes_glint_score_encoding(tmp_path):
    survey = tmp_path / "survey.csv"
    survey.write_text(
        "user_id,Q_ONE,Q_TWO,department\n"
        "1,0,100,Sales\n"
        "2,25,75,Sales\n"
        "3,50,50,Engineering\n"
        "4,75,25,Engineering\n"
        "5,100,0,Finance\n",
        encoding="utf-8",
    )
    script_path = ROOT / "scripts/analyze_survey_export.py"
    spec = importlib.util.spec_from_file_location("analyze_survey_export_scores", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)

    class Args:
        survey_export = str(survey)
        output_dir = str(tmp_path / "output")
        sheet = None
        attribute_sheet = None
        emp_id_col = None
        scale_points = 5
        question_cols = None
        attribute_cols = None
        min_group_size = 5

    config_path = module.build_config(Args(), Path(Args.output_dir))
    config = json.loads(config_path.read_text(encoding="utf-8"))
    normalized = list(csv.DictReader(Path(config["survey_csv"]).open(encoding="utf-8")))
    assert [int(float(row["Q_ONE"])) for row in normalized] == [1, 2, 3, 4, 5]
    assert [int(float(row["Q_TWO"])) for row in normalized] == [5, 4, 3, 2, 1]


def test_interactive_report_builder_creates_dashboard_and_safe_zip(tmp_path):
    survey = tmp_path / "survey.csv"
    attributes = tmp_path / "attributes.csv"
    comments = tmp_path / "comments.csv"
    questions = ["Q_ONE", "Q_TWO", "Q_THREE", "Q_FOUR"]
    with survey.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "user_id",
                "survey_cycle_title",
                "after_hours_collab",
                *questions,
            ],
        )
        writer.writeheader()
        for row in range(40):
            writer.writerow(
                {
                    "user_id": row + 1,
                    "survey_cycle_title": "H1" if row < 20 else "H2",
                    "after_hours_collab": "Low" if row % 2 else "High",
                    **{
                        question: ((row + index) % 5) + 1
                        for index, question in enumerate(questions)
                    },
                }
            )
    with attributes.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["user_id", "segment", "team_id"],
        )
        writer.writeheader()
        for row in range(40):
            writer.writerow(
                {
                    "user_id": row + 1,
                    "segment": f"Group {(row % 4) + 1}",
                    "team_id": "Team A",
                }
            )
    with comments.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "user_id",
                "survey_cycle_title",
                "question_uuid",
                "sentiment",
                "comment",
            ],
        )
        writer.writeheader()
        for row in range(40):
            for question in questions:
                writer.writerow(
                    {
                        "user_id": row + 1,
                        "survey_cycle_title": "H1" if row < 20 else "H2",
                        "question_uuid": question,
                        "sentiment": (
                            "favorable"
                            if row % 3 == 0
                            else "neutral"
                            if row % 3 == 1
                            else "unfavorable"
                        ),
                        "comment": "private career growth wording",
                    }
                )

    config = tmp_path / "analysis-config.json"
    config.write_text(
        json.dumps(
            {
                "survey_csv": survey.name,
                "attribute_file": attributes.name,
                "attribute_cols": ["survey_cycle_title", "segment", "team_id"],
                "question_cols": questions,
                "input_format": "wide_items",
                "scale_points": 5,
                "emp_id_col": "user_id",
                "comments_file": comments.name,
                "comments_question_col": "question_uuid",
                "comments_text_col": "comment",
            }
        ),
        encoding="utf-8",
    )
    (tmp_path / "analysis-manifest.json").write_text(
        json.dumps(
            {
                "repeatability_check": {
                    "status": "passed", "verification_dir": str(tmp_path / "_repeatability_run"),
                },
                "analyses": [
                    {
                        "name": "attrition",
                        "status": "skipped",
                        "message": "attrition_file and term_date_col are required.",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    (tmp_path / "attrition.csv").write_text("STALE_ATTRITION_SENTINEL\n", encoding="utf-8")
    sample_summary = {
        "headline": "A concise headline",
        "observation": "The aggregate results show a pattern.",
        "interpretation": "Treat the pattern as a listening hypothesis.",
        "recommendation": "Discuss the result with employees.",
        "caveat": "This is not causal evidence.",
        "sources": [
            {
                "title": "Published Viva Glint guidance",
                "url": "https://example.com/evidence",
            }
        ],
    }
    (tmp_path / "people-science-summaries.json").write_text(
        json.dumps(
            {
                "schema_version": "1.0.0",
                "tabs": {
                    tab: {"overall": sample_summary}
                    for tab in (
                        "changes",
                        "relationships",
                        "alerts",
                        "factors",
                        "attrition",
                        "downloads",
                    )
                },
            }
        ),
        encoding="utf-8",
    )

    subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts/build_interactive_report.py"),
            "--config",
            str(config),
            "--output-dir",
            str(tmp_path),
            "--summary-mode",
            "required",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    report = tmp_path / f"{tmp_path.name}-report.html"
    share_zip = tmp_path / f"{tmp_path.name}-share.zip"
    report_text = report.read_text(encoding="utf-8")
    with zipfile.ZipFile(share_zip) as archive:
        shared_manifest = json.loads(archive.read("analysis-manifest.json"))
        assert "attrition.csv" not in archive.namelist()
    assert "STALE_ATTRITION_SENTINEL" not in report_text
    assert shared_manifest["repeatability_check"]["verification_dir"] == "_repeatability_run"
    assert str(tmp_path) not in json.dumps(shared_manifest)
    for tab in (
        "Scores change",
        "Correlation",
        "Factors",
        "Downloads",
        "Methodology",
    ):
        assert f">{tab}</button>" in report_text
    for unavailable_tab in ("Attrition analysis", "Attrition insights", "Alerts"):
        assert f">{unavailable_tab}</button>" not in report_text
    assert 'data-methodology-section="scores-change"' in report_text
    assert 'data-methodology-section="correlation"' in report_text
    assert 'data-methodology-section="factors"' in report_text
    assert 'data-methodology-section="attrition-analysis"' not in report_text
    assert 'data-methodology-section="attrition-alerts"' not in report_text
    for removed_tab in ("Overview", "Item results", "Heatmap"):
        assert f">{removed_tab}</button>" not in report_text
    for heading in (
        "Respondent population",
        "All respondents",
        "Repeat respondents",
        "Question Name",
        "Mean",
        "Stddev",
        "P-Value",
        "Score Difference (New - Old)",
        "Minimum strength",
        "Highlight question",
        ">Color</label>",
        ">Significance</label>",
        ">Clear</button>",
        "Very high",
        "Recommended:",
        "Clusters",
        "Loading magnitude",
        "extracted dimension",
    ):
        assert heading in report_text
    assert "--rel-low:#f5f5f5" in report_text
    assert "--rel-medium:#e5eeff" in report_text
    assert "--rel-high:#7ea4fc" in report_text
    assert "--rel-very-high:#335ccc" in report_text
    assert "id=relSignificance type=checkbox>" in report_text
    assert "title=\"${names[i]}\">${names[i]}</th>" in report_text
    assert "font-size:10px;font-weight:400" in report_text
    assert "font-size:11px" in report_text
    assert "id=relClusters" in report_text
    assert "cluster-start-col" in report_text
    assert "cluster-start-row" in report_text
    assert "alertSeverity" not in report_text
    assert "alertSearch" not in report_text
    assert "topDeclines" not in report_text
    assert "id=attritionTableBody" not in report_text
    assert "id=alertsList" not in report_text
    assert "id=surveySummary" in report_text
    assert "function renderSurveySummary()" in report_text
    assert "High scoring items" in report_text
    assert "Low scoring items" in report_text
    assert "Comment themes:" in report_text
    assert ".ai-summary{display:none" in report_text
    for guidance in (
        "Repeat respondents exclude employees who answered only one cycle",
        "A higher p-value does not prove that scores stayed the same",
        "not adjusted for testing multiple items",
        "not a paired test of each employee's change",
        "not a labeled construct",
        "shortening the survey requires separate checks of content coverage, reliability, and stability",
        "Correlation shows how pairs of items move together",
        "'x% of item variance' on each card",
        "total variation across standardized survey-item responses",
        "40% of that variation in the fitted model",
        "without showing whether the underlying loading is positive or negative",
        "compare their item patterns rather than matching factor numbers",
        "Survey means, standard deviations, and score changes are exported in 0-100 score points",
        "attrition multipliers keep their own units",
    ):
        assert guidance in report_text
    factor_intro = re.search(
        r"<section class=panel id=factors\b.*?<p class=tab-intro>(.*?)</p>",
        report_text,
        re.DOTALL,
    )
    assert factor_intro is not None
    assert factor_intro.group(1).count("<br><br>") == 5
    assert "<br><br><br>" not in factor_intro.group(1)
    assert "stable, pre-built" not in factor_intro.group(1)
    assert "near-pure indicator" not in factor_intro.group(1)
    changes_intro = re.search(
        r"<section class=panel id=changes\b.*?<p class=tab-intro>(.*?)</p>",
        report_text,
        re.DOTALL,
    )
    assert changes_intro is not None
    assert changes_intro.group(1).count("<br><br>") == 3
    assert "<br><br><br>" not in changes_intro.group(1)
    assert "is a reliable signal" not in changes_intro.group(1)
    assert "skipping the repeat-respondent check" not in changes_intro.group(1)
    assert "are unconfirmed" not in changes_intro.group(1)
    for removed in (
        "id=themeCycle",
        "id=themeQuestion",
        "id=themeAttribute",
        "id=themeGroup",
        "function themeSource(",
        "function aggregateThemeItems(",
        "function comparisonRows(",
        "function renderComparison(",
        "function renderThemeProfile(",
        "function renderThemes()",
        "Favorable vs. unfavorable themes",
        "Favorable vs. unfavorable survey items",
        "Theme favorability profile",
        "Unfavorable coded mentions",
        'data-id="impact"',
        "function renderImpact()",
        '"impact":',
    ):
        assert removed not in report_text
    assert "private career growth wording" not in report_text
    assert report_text.count("data-summary=") == 4
    assert '"aiSummaries":{"changes"' in report_text
    assert "function liveFilterSummary(tab,base)" in report_text
    assert "function attritionSummaryRows()" in report_text
    assert "highest visible attrition multiplier" in report_text
    assert "function knowledgeSourcesFor(tab,summary)" in report_text
    assert "AI-generated · live filter" in report_text
    assert "function factorSource()" in report_text
    assert "function renderFactors()" in report_text
    assert "Clustered horizontal factor loading magnitude bars" in report_text
    assert "data-loading=" in report_text
    assert "data-strength=" in report_text
    assert "data-loading-label=" in report_text
    assert "ticks=[0,.3,.5,.7,1]" in report_text
    assert "primaryLoading(b)-primaryLoading(a)" in report_text
    assert ".factor-bar{stroke:var(--muted);stroke-width:1.5px" in report_text
    assert 'paint-order="stroke"' in report_text
    assert "var(--rel-very-high)" in report_text
    assert "summary.interpretation=" in report_text
    assert "summary.recommendation=" in report_text
    assert "summary.caveat=" in report_text
    assert "Factor solutions are exploratory working hypotheses" in report_text
    assert "Factor numbers can rotate or reorder" in report_text
    report_payload = json.loads(
        report_text[
            report_text.index("<script>const D=") + len("<script>const D="):
            report_text.index(";\nconst names=")
        ]
    )
    assert report_payload["commentThemes"]["overall"]["H2"]["Q_ONE"][0][0] == (
        "Career growth and development"
    )
    assert set(report_payload["commentThemes"]) == {
        "overall",
        "segments",
        "minimumComments",
    }
    assert len(report_payload["knowledgeSources"]["sources"]) >= 10
    assert set(report_payload["segments"]) == {"survey_cycle_title", "segment"}
    assert "impact" not in report_payload
    summary_context = json.loads(
        (tmp_path / "people-science-summary-context.json").read_text(encoding="utf-8")
    )
    assert set(summary_context["tabs"]) == {
        "changes",
        "relationships",
        "alerts",
        "factors",
        "attrition",
        "downloads",
    }
    assert "Team A" not in json.dumps(summary_context)
    with zipfile.ZipFile(share_zip) as archive:
        names = set(archive.namelist())
    assert "OPEN_REPORT.html" in names
    assert survey.name not in names
    assert attributes.name not in names
    assert "people-science-summary-context.json" in names
    assert "people-science-summaries.json" in names

    subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts/build_interactive_report.py"),
            "--config",
            str(config),
            "--output-dir",
            str(tmp_path),
            "--summary-mode",
            "off",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    report_text = report.read_text(encoding="utf-8")
    assert "data-summary=" not in report_text
    assert '"aiSummaries":{}' in report_text
    with zipfile.ZipFile(share_zip) as archive:
        names = set(archive.namelist())
    assert "people-science-summary-context.json" in names
    assert "people-science-summaries.json" not in names
    manifest = json.loads(
        (tmp_path / "analysis-manifest.json").read_text(encoding="utf-8")
    )
    assert manifest["report_generation"]["summary_mode"] == "off"

    subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts/build_interactive_report.py"),
            "--config",
            str(config),
            "--output-dir",
            str(tmp_path),
            "--summary-mode",
            "optional",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    report_text = report.read_text(encoding="utf-8")
    assert report_text.count("data-summary=") == 4
    manifest = json.loads(
        (tmp_path / "analysis-manifest.json").read_text(encoding="utf-8")
    )
    assert manifest["report_generation"]["summary_mode"] == "optional"


def test_factor_cube_reestimates_eligible_cuts_and_suppresses_small_ones(monkeypatch):
    script_path = ROOT / "scripts/build_interactive_report.py"
    spec = importlib.util.spec_from_file_location("factor_report_builder", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)

    questions = ["Q_ONE", "Q_TWO", "Q_THREE", "Q_FOUR"]
    rows = []
    for index in range(140):
        row = {
            "segment": "Eligible" if index < 120 else "Small",
            "__employee_id": index + 1,
            **{
                question: ((index * (question_index + 1) + question_index) % 5) + 1
                for question_index, question in enumerate(questions)
            },
        }
        rows.append(row)
        if index < 120:
            rows.append(row.copy())
    overall_rows = [
        {
            "question": question,
            "factor": factor,
            "loading": 0.5,
            "loading_label": "Weak",
            "communality": 0.5,
            "factor_variance_pct": 25.0,
        }
        for question in questions
        for factor in ("MR1", "MR2")
    ]

    def fake_extract(source, n_factors, rotation, min_loading):
        assert len(source.data) == 240
        assert n_factors == 2
        assert rotation == "varimax"
        assert min_loading == 0
        return {
            "factor_summary": module.pd.DataFrame(
                [
                    {
                        **row,
                        "loading": row["loading"] + 0.1,
                    }
                    for row in overall_rows
                ]
            )
        }

    import vivaglint

    monkeypatch.setattr(vivaglint, "extract_survey_factors", fake_extract)
    result = module.factor_cube(
        module.pd.DataFrame(rows),
        questions,
        ["segment"],
        overall_rows,
    )

    eligible = result["segments"]["segment"]["Eligible"]
    suppressed = result["segments"]["segment"]["Small"]
    assert result["minimumN"] == 100
    assert eligible["status"] == "available"
    assert eligible["n"] == 120
    assert eligible["completeN"] == 120
    assert eligible["responseRows"] == 240
    assert len(eligible["rows"]) == 8
    assert eligible["rows"][0]["loading"] == 0.6
    assert suppressed["status"] == "suppressed"
    assert all(suppressed[key] is None for key in ("n", "completeN", "responseRows"))
    assert "At least 100 complete responses" in suppressed["reason"]


def test_sparse_item_counts_and_factor_counts_are_not_serialized():
    module = load_script("build_interactive_report")
    questions = ["Q_ONE", "Q_SPARSE"]
    frame = module.pd.DataFrame({
        "__employee_id": range(10),
        "survey_cycle_title": ["Old"] * 5 + ["New"] * 5,
        "Q_ONE": [1, 2, 3, 4, 5] * 2,
        "Q_SPARSE": [1, 2, None, None, None] * 2,
    })
    metrics = module.metrics(frame, questions, 5)
    assert metrics[0][4] == 10
    assert metrics[1] == [None] * 5
    cycles = module.cycle_cube(frame, questions, [], "survey_cycle_title", 5)
    assert cycles["overall"]["New"]["items"][1] == [None] * 3
    factors = module.factor_cube(frame, questions, [], [])
    assert factors["overall"]["status"] == "suppressed"
    assert all(factors["overall"][key] is None for key in ("n", "completeN", "responseRows"))
    context = module.summary_context(questions, cycles, {}, {}, factors, "", [])
    assert len(context["tabs"]["changes"]["largest_changes"]) == 1


@pytest.fixture
def custom_exit_export(tmp_path):
    module = load_script("analyze_survey_export")
    rows = []
    for cycle, title, completion in [
        (10, "H1", "2025-06-01"), (20, "H2", "2025-12-15"),
    ]:
        for index in range(80):
            rows.append({
                "user_id": index + 1, "survey_cycle_id": cycle,
                "survey_cycle_title": title, "survey_completion_date": completion,
                "termination date": None,
                "Location": "Tiny" if index < 3 else "Large",
                "Q_ONE": index % 5 + 1, "Q_TWO": (index * 3 + 1) % 5 + 1,
            })
    for index in range(40):
        rows.append({
            "user_id": index + 1, "survey_cycle_id": 30, "survey_cycle_title": "Exit",
            "survey_completion_date": None, "termination date": "2026-01-15",
            "Location": "Tiny" if index < 3 else "Large", "Q_ONE": None, "Q_TWO": None,
        })
    frame = module.pd.DataFrame(rows)
    source = tmp_path / "customer-survey.csv"
    frame.to_csv(source, index=False)
    options = SimpleNamespace(
        survey_export=str(source), sheet=None, attribute_sheet=None,
        emp_id_col=None, scale_points=5, question_cols=None, attribute_cols=None,
        min_group_size=5, inspect_only=False, preparation_decisions=None,
        summary_mode="off", attrition_config=None,
    )
    return module, frame, options


def test_custom_exit_export_runs_attrition_and_packages_portable_private_payload(custom_exit_export, tmp_path):
    module, _, options = custom_exit_export
    output = tmp_path / "report"
    subprocess.run([
        sys.executable, str(ROOT / "scripts/analyze_survey_export.py"),
        "--survey-export", options.survey_export, "--output-dir", str(output),
    ], check=True, capture_output=True, text=True)
    config = json.loads((output / "_input" / "analysis-config.json").read_text(encoding="utf-8"))
    assert config["embedded_attrition"]["predictor_cycle"] == 20
    assert config["embedded_attrition"]["outcome_cycle"] == 30
    assert config["embedded_attrition"]["predictor_completion_date"] == "2025-12-15"
    with zipfile.ZipFile(output / "report-share.zip") as archive:
        manifest = json.loads(archive.read("analysis-manifest.json"))
        report = archive.read("OPEN_REPORT.html").decode("utf-8")
    assert manifest["repeatability_check"]["status"] == "passed"
    assert manifest["repeatability_check"]["verification_dir"] == "_repeatability_run"
    assert str(tmp_path) not in json.dumps(manifest)
    assert any(item["name"] == "attrition" and item["status"] == "completed" for item in manifest["analyses"])
    assert ">Attrition analysis</button>" in report
    payload = json.JSONDecoder().raw_decode(report.split("<script>const D=", 1)[1])[0]
    suppressed = payload["factors"]["segments"]["Location"]["Tiny"]
    assert suppressed["status"] == "suppressed"
    assert all(suppressed[key] is None for key in ("n", "completeN", "responseRows"))


@pytest.mark.parametrize("problem", ["ambiguous_cycle", "invalid_date", "ambiguous_column", "missing_outcome", "unsupported_scale"])
def test_uncertain_exit_data_is_excluded_and_recorded_in_limitations(custom_exit_export, tmp_path, problem):
    module, frame, options = custom_exit_export
    if problem == "ambiguous_cycle":
        frame.loc[frame["survey_cycle_title"] == "Exit", "survey_cycle_title"] = "Unclear"
        frame.loc[frame["survey_cycle_id"] == 10, "termination date"] = "2026-01-15"
        frame.loc[frame["survey_cycle_id"] == 10, ["Q_ONE", "Q_TWO"]] = None
    elif problem == "invalid_date":
        frame.loc[frame["survey_cycle_title"] == "Exit", "termination date"] = "not a date"
    elif problem == "ambiguous_column":
        frame["exit date"] = frame["termination date"]
    elif problem == "missing_outcome":
        frame = frame.drop(columns="termination date")
    else:
        options.scale_points = 7
    frame.to_csv(options.survey_export, index=False)
    output = tmp_path / "output"
    config_path = module.build_config(options, output)
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert "attrition" not in config["analyses"]
    assert "embedded_attrition" not in config
    assert "termination date" not in config["attribute_cols"]
    assert "exit date" not in config["attribute_cols"]
    report = load_script("build_interactive_report")
    limitations = report.input_limitations(
        config_path, Path(config["survey_csv"]), output, config["analysis_limitations"],
    )
    assert "Attrition analysis was excluded" in limitations["entries"][0]
    assert "not a date" not in json.dumps(limitations)


@pytest.mark.parametrize("outcome_source", ["external", "explicit"])
def test_custom_attrition_supports_external_or_explicit_outcomes(custom_exit_export, tmp_path, outcome_source):
    module, frame, options = custom_exit_export
    if outcome_source == "external":
        attributes = frame[["user_id", "termination date"]].dropna().drop_duplicates("user_id")
        source = tmp_path / "customer.xlsx"
        with module.pd.ExcelWriter(source) as workbook:
            frame.drop(columns="termination date").to_excel(workbook, sheet_name="Sheet1", index=False)
            attributes.to_excel(workbook, sheet_name="user_properties", index=False)
        options.survey_export = str(source)
    else:
        frame = frame.rename(columns={"termination date": "leaving_on"})
        frame.loc[frame["user_id"] == 1, "leaving_on"] = "2026-01-20"
        frame.to_csv(options.survey_export, index=False)
        settings = tmp_path / "attrition.json"
        settings.write_text(json.dumps({
            "cycle_column": "survey_cycle_id", "predictor_cycle": 20,
            "outcome_cycle": 30, "termination_date_column": "leaving_on",
            "predictor_completion_date_column": "survey_completion_date",
        }), encoding="utf-8")
        options.attrition_config = str(settings)
    config_path = module.build_config(options, tmp_path / "output")
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert "attrition" in config["analyses"]
    assert config["embedded_attrition"]["predictor_cycle"] == 20
    assert config["embedded_attrition"]["outcome_cycle"] == 30
    assert "leaving_on" not in config["attribute_cols"]
    assert "termination date" not in config["attribute_cols"]


def test_native_exit_detection_preserves_string_cycles_and_employee_ids(platform_input):
    module, frame, options = platform_input
    exits = frame.iloc[:4].copy()
    exits["Survey Cycle Title"] = "Exit"
    exits["Survey Cycle UUID"] = "0002"
    exits["termination_date"] = "2026-02-15"
    for column in exits.columns[5:13]:
        exits[column] = -1 if column in (frame.columns[5], frame.columns[9]) else ""
    module.pd.concat([frame, exits], ignore_index=True).to_csv(options.survey_export, index=False)
    config_path = approve_platform(module, options)
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert config["embedded_attrition"]["predictor_cycle"] == "0001"
    assert config["embedded_attrition"]["outcome_cycle"] == "0002"
    assert "termination_date" not in config["attribute_cols"]
    runner = load_script("run_vivaglint_analysis")
    result = runner.embedded_exit_attrition(
        config, config_path, Path(config["survey_csv"]), config["question_cols"],
        config["emp_id_col"], config["min_group_size"],
    )
    assert not result.empty
    assert set(result.loc[result["analysis_scope"] == "overall", "group_size"]) == {8}


@pytest.mark.parametrize("name", [
    "Leaver Date", "date_of_leaving", "Employee Separation Date",
    "lastWorkingDay", "DepartureDate", "attrition",
])
def test_attrition_discovers_actual_exit_date_aliases(custom_exit_export, tmp_path, name):
    module, frame, options = custom_exit_export
    frame = frame.rename(columns={"termination date": name})
    frame.loc[frame["survey_cycle_title"] == "Exit", "survey_cycle_title"] = "Leavers"
    frame.to_csv(options.survey_export, index=False)
    config_path = module.build_config(options, tmp_path / "output")
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert config["embedded_attrition"]["termination_date_column"] == name
    assert config["embedded_attrition"]["outcome_cycle"] == 30
    assert name not in config["attribute_cols"]


def test_attrition_inspection_searches_all_sheets_without_running_analysis(tmp_path):
    module = load_script("analyze_survey_export")
    source = tmp_path / "survey.xlsx"
    with module.pd.ExcelWriter(source) as workbook:
        module.pd.DataFrame({"user_id": ["PRIVATE_EMPLOYEE"], "Q_ONE": [4]}).to_excel(
            workbook, sheet_name="Sheet1", index=False,
        )
        module.pd.DataFrame({
            "Employee ID": ["PRIVATE_EMPLOYEE"], "Last Working Day": ["2026-01-15"],
            "Leaver Flag": [1], "Expected Exit Date": ["2026-02-15"],
            "Department": ["PRIVATE_DEPARTMENT"],
            "End Date": ["2026-01-15"],
        }).to_excel(workbook, sheet_name="Historical departures", index=False)
    output = tmp_path / "output"
    subprocess.run([
        sys.executable, str(ROOT / "scripts/analyze_survey_export.py"),
        "--survey-export", str(source), "--output-dir", str(output), "--inspect-attrition",
    ], check=True, capture_output=True, text=True)
    discovery = json.loads((output / "_input" / "attrition-discovery.json").read_text(encoding="utf-8"))
    candidates = {item["column"]: item for item in discovery["candidates"]}
    assert candidates["Last Working Day"]["sheet"] == "Historical departures"
    assert candidates["Last Working Day"]["kind"] == "exit_date"
    assert candidates["Leaver Flag"]["kind"] == "flag_or_status"
    assert candidates["Expected Exit Date"]["requires_confirmation"]
    assert candidates["End Date"]["kind"] == "date_candidate"
    assert candidates["End Date"]["requires_confirmation"]
    assert discovery["inspected_sheets"] == ["Sheet1", "Historical departures"]
    assert "Department" not in candidates
    assert "PRIVATE_" not in json.dumps(discovery)
    assert not (output / "analysis-manifest.json").exists()
    assert not (output / "_input" / "analysis-config.json").exists()


@pytest.mark.parametrize("kind", ["flag", "missing", "predicted"])
def test_missing_or_uncertain_outcomes_explain_required_inputs(custom_exit_export, tmp_path, capsys, kind):
    module, frame, options = custom_exit_export
    frame = frame.drop(columns="termination date")
    if kind == "flag":
        frame["Leaver Flag"] = (frame["survey_cycle_id"] == 30).astype(int)
    elif kind == "predicted":
        frame["Predicted Exit Date"] = "2026-01-15"
    frame.to_csv(options.survey_export, index=False)
    config_path = module.build_config(options, tmp_path / "output")
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert "attrition" not in config["analyses"]
    assert "Leaver Flag" not in config["attribute_cols"]
    assert "Predicted Exit Date" not in config["attribute_cols"]
    assert config["analysis_limitations"]
    message = capsys.readouterr().err
    for required in ("matching employee IDs", "actual exit dates", "completion date", "as-of date", "worksheet", "--exit-data"):
        assert required in message


@pytest.fixture
def separate_exit_export(custom_exit_export, tmp_path):
    module, frame, options = custom_exit_export
    mapping = {1: "00001", 2: "1"}
    frame["user_id"] = frame["user_id"].map(lambda value: mapping.get(value, str(value)))
    survey = frame.loc[frame["survey_cycle_id"] == 20].drop(
        columns=["survey_cycle_id", "survey_cycle_title", "termination date"],
    )
    survey.to_csv(options.survey_export, index=False)
    exits = frame.loc[frame["survey_cycle_id"] == 30, ["user_id", "termination date"]].rename(
        columns={"user_id": "StaffKey", "termination date": "Last Working Day"},
    )
    exit_path = tmp_path / "leavers.csv"
    exits.to_csv(exit_path, index=False)
    settings = {
        "outcome_emp_id_col": "StaffKey",
        "outcome_population_confirmed": True, "outcome_as_of_date": "2026-12-15",
    }
    settings_path = tmp_path / "outcomes.json"
    settings_path.write_text(json.dumps(settings), encoding="utf-8")
    options.exit_data = str(exit_path)
    options.attrition_config = str(settings_path)
    return module, options, settings


def test_separate_exit_file_runs_without_fabricated_exit_cycles(separate_exit_export, tmp_path):
    module, options, _ = separate_exit_export
    output = tmp_path / "report"
    subprocess.run([
        sys.executable, str(ROOT / "scripts/analyze_survey_export.py"),
        "--survey-export", options.survey_export, "--output-dir", str(output),
        "--exit-data", options.exit_data, "--attrition-config", options.attrition_config,
    ], check=True, capture_output=True, text=True)
    config = json.loads((output / "_input" / "analysis-config.json").read_text(encoding="utf-8"))
    assert "outcome_cycle" not in config["embedded_attrition"]
    assert "cycle_column" not in config["embedded_attrition"]
    ids = module.pd.read_csv(config["survey_csv"], converters={"user_id": str})["user_id"]
    assert ids.nunique() == 80
    assert {"00001", "1"}.issubset(ids)
    with zipfile.ZipFile(output / "report-share.zip") as archive:
        manifest = json.loads(archive.read("analysis-manifest.json"))
        assert manifest["repeatability_check"]["status"] == "passed"
        assert any(item["name"] == "attrition" and item["status"] == "completed" for item in manifest["analyses"])
        assert not any("exit-outcomes" in name or "attrition-discovery" in name for name in archive.namelist())
        assert str(tmp_path) not in json.dumps(manifest)


@pytest.mark.parametrize("confirmed", [False, True])
def test_outcome_coverage_is_required_and_limits_followup_windows(separate_exit_export, tmp_path, confirmed):
    module, options, settings = separate_exit_export
    settings.update(outcome_population_confirmed=confirmed, outcome_as_of_date="2026-04-01")
    Path(options.attrition_config).write_text(json.dumps(settings), encoding="utf-8")
    config_path = module.build_config(options, tmp_path / "output")
    config = json.loads(config_path.read_text(encoding="utf-8"))
    if confirmed:
        assert config["embedded_attrition"]["time_periods"] == [90]
        assert config["analysis_limitations"][0]["code"] == "attrition_followup"
    else:
        assert "attrition" not in config["analyses"]
        assert "embedded_attrition" not in config
        assert config["analysis_limitations"][0]["code"] == "attrition_unavailable"


def test_inline_outcome_dates_do_not_require_an_exit_cycle(separate_exit_export, tmp_path):
    module, options, _ = separate_exit_export
    survey = module.pd.read_csv(options.survey_export, converters={"user_id": str})
    exits = module.pd.read_csv(options.exit_data, converters={"StaffKey": str}).rename(columns={"StaffKey": "user_id"})
    survey.merge(exits, on="user_id", how="left", validate="one_to_one").to_csv(options.survey_export, index=False)
    options.exit_data = None
    config_path = module.build_config(options, tmp_path / "output")
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert "attrition" in config["analyses"]
    assert "outcome_cycle" not in config["embedded_attrition"]
    assert Path(config["embedded_attrition"]["outcome_file"]).is_file()


def test_user_can_point_to_exit_worksheet(separate_exit_export, tmp_path):
    module, options, _ = separate_exit_export
    source = tmp_path / "survey-with-exits.xlsx"
    with module.pd.ExcelWriter(source) as workbook:
        module.pd.read_csv(options.survey_export, dtype=str).to_excel(workbook, sheet_name="Sheet1", index=False)
        module.pd.read_csv(options.exit_data, dtype=str).to_excel(workbook, sheet_name="HR departures", index=False)
    options.survey_export = str(source)
    options.exit_data = None
    options.exit_sheet = "HR departures"
    config_path = module.build_config(options, tmp_path / "output")
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert "attrition" in config["analyses"]
    assert Path(config["embedded_attrition"]["outcome_file"]).name == "exit-outcomes.csv"


def test_skill_requires_missing_outcome_followup_and_open_text_adaptation():
    skill = (ROOT / "skills/analyze-survey/SKILL.md").read_text(encoding="utf-8")
    discovery = skill.split("### Attrition discovery and missing-data follow-up", 1)[1].split("### Native platform", 1)[0]
    assert "--inspect-attrition" in discovery
    assert "before excluding attrition" in discovery
    assert "ask_user" in discovery
    assert "open-text" in discovery
    completion = skill.split("### Post-analysis adaptation", 1)[1]
    assert "Did I miss anything? Any other data or attribute cuts you would like to include?" in completion
    assert "ask_user" in completion
    assert "open-text response field" in completion
    assert "repeatability" in completion


def test_cycle_changes_render_suppressed_item_without_numeric_values():
    node = shutil.which("node")
    if node is None:
        pytest.skip("Node.js is required to exercise cycle changes.")
    golden = (ROOT / "skills/analyze-survey/references/golden-report.html").read_text(encoding="utf-8")
    renderer = next(line for line in golden.splitlines() if line.startswith("const respondentPopulation="))
    setup = r"""
const assert=require("node:assert/strict");
const controls={
  "#respondentPopulation":{value:"all"},
  "#oldCycle":{add(){}}, "#newCycle":{add(){}}, "#changesTable":{innerHTML:""}
};
const document={querySelector(selector){return controls[selector]}};
function Option(text,value){return {text,value}}
const attr={value:""},val={value:""};
const D={questions:["Q_ONE","Q_TWO"],labels:{Q_ONE:"Eligible",Q_TWO:"Sparse"},
  cycles:{cycles:["Old","New"]}};
const values={Old:{items:[[50,20,10],[null,null,null]]},
  New:{items:[[75,20,10],[80,20,10]]}};
function cycleSource(){return values}
"""
    checks = r"""
renderChanges();
const html=controls["#changesTable"].innerHTML;
assert.ok(html.includes("Eligible"));
assert.ok(html.includes(">+25</span>"));
assert.ok(html.includes("Sparse</td><td colspan=8>Suppressed"));
assert.ok(!html.includes(">+80</span>"));
assert.ok(!html.includes("NaN"));
assert.ok(!html.includes("null"));
"""
    subprocess.run(
        [node, "-e", setup + "\n" + renderer + "\n" + checks], check=True,
        capture_output=True, text=True, encoding="utf-8", timeout=30,
    )


def test_people_science_summary_validation_and_script_escaping(tmp_path):
    script_path = ROOT / "scripts/build_interactive_report.py"
    spec = importlib.util.spec_from_file_location("summary_report_builder", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)

    summary = {
        "headline": "</script><script>alert('x')</script>",
        "observation": "Observed aggregate evidence.",
        "interpretation": "An exploratory interpretation.",
        "recommendation": "A practical next step.",
        "caveat": "Not causal.",
        "sources": [{"title": "Evidence", "url": "https://example.com/evidence"}],
    }
    document = {
        "schema_version": "1.0.0",
        "tabs": {tab: {"overall": summary} for tab in module.SUMMARY_TABS},
    }
    (tmp_path / "people-science-summaries.json").write_text(
        json.dumps(document), encoding="utf-8"
    )
    loaded = module.load_ai_summaries(tmp_path)
    rendered = module.html_page({"aiSummaries": loaded})

    assert "</script><script>alert('x')</script>" not in rendered
    assert "\\u003c/script\\u003e" in rendered

    del document["tabs"]["downloads"]
    (tmp_path / "people-science-summaries.json").write_text(
        json.dumps(document), encoding="utf-8"
    )
    try:
        module.load_ai_summaries(tmp_path)
    except ValueError as error:
        assert "missing tab summaries: downloads" in str(error)
    else:
        raise AssertionError("Missing summaries must be rejected")

    (tmp_path / "people-science-summaries.json").unlink()
    try:
        module.load_ai_summaries(tmp_path, required=True)
    except ValueError as error:
        assert "Summary mode 'required'" in str(error)
    else:
        raise AssertionError("Required summary mode must reject a missing file")


def test_relationship_cluster_plan_is_deterministic():
    script_path = ROOT / "scripts/build_interactive_report.py"
    spec = importlib.util.spec_from_file_location("build_interactive_report", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)

    groups = ({0, 1, 2}, {3, 4, 5}, {6, 7, 8})
    rows = []
    for first in range(9):
        for second in range(first + 1, 9):
            same_group = any(first in group and second in group for group in groups)
            rows.append([first, second, 0.9 if same_group else 0.1, 0.01, 100])

    first = module.cluster_plan(rows, 9)
    second = module.cluster_plan(rows, 9)

    assert first == second
    assert first["recommended"] == 3
    assert sorted(first["assignments"]) == ["3", "4", "5", "6", "7", "8"]
    assert len(set(first["assignments"]["3"])) == 3


def test_attrition_alerts_select_top_five_and_preserve_score_gaps(tmp_path):
    script_path = ROOT / "scripts/build_interactive_report.py"
    spec = importlib.util.spec_from_file_location("build_interactive_report", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)

    questions = [f"Q_{index}" for index in range(1, 7)]
    rows = []
    for value, offset in (("A", 0.0), ("B", 0.2)):
        for index, question in enumerate(questions):
            ratio = 6 - index + offset
            rows.append(
                {
                    "analysis_scope": "attribute",
                    "attribute_name": "department",
                    "attribute_value": value,
                    "question": question,
                    "days": 180,
                    "favorable_n": 10,
                    "unfavorable_n": 10,
                    "attrition_ratio": ratio,
                }
            )
    attrition = tmp_path / "attrition.csv"
    module.pd.DataFrame(rows).to_csv(attrition, index=False)
    segments = {
        "department": {
            "label": "Department",
            "values": {
                "A": {"items": [[50 + index, 0, 0, 0, 20] for index in range(6)]},
                "B": {"items": [[60 + index, 0, 0, 0, 20] for index in range(6)]},
            },
        }
    }
    overall = [[70, 0, 0, 0, 40] for _ in questions]
    result = module.attrition_alert_payload(
        attrition, questions, segments, overall, 5
    )

    department = result["byDay"]["180"]["department"]
    assert result["defaultDays"] == 180
    assert [row[0] for row in department["topItems"]] == [0, 1, 2, 3, 4]
    assert len(department["rows"]) == 10
    group_a_first = next(
        row for row in department["rows"] if row[0] == "A" and row[1] == 0
    )
    assert group_a_first == ["A", 0, 50.0, 70.0, -20.0, 20, 6.0, 6.1]


def test_attrition_alerts_suppress_small_attrition_categories(tmp_path):
    script_path = ROOT / "scripts/build_interactive_report.py"
    spec = importlib.util.spec_from_file_location("build_interactive_report", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)

    attrition = tmp_path / "attrition.csv"
    module.pd.DataFrame(
        [
            {
                "analysis_scope": "attribute",
                "attribute_name": "department",
                "attribute_value": "A",
                "question": "Q_ONE",
                "days": 180,
                "favorable_n": 4,
                "unfavorable_n": 20,
                "attrition_ratio": 3.0,
            },
            {
                "analysis_scope": "attribute",
                "attribute_name": "department",
                "attribute_value": "B",
                "question": "Q_ONE",
                "days": 180,
                "favorable_n": 20,
                "unfavorable_n": 20,
                "attrition_ratio": 2.0,
            },
        ]
    ).to_csv(attrition, index=False)
    segments = {
        "department": {
            "label": "Department",
            "values": {
                "A": {"items": [[40, 0, 0, 0, 20]]},
                "B": {"items": [[50, 0, 0, 0, 20]]},
            },
        }
    }
    result = module.attrition_alert_payload(
        attrition,
        ["Q_ONE"],
        segments,
        [[60, 0, 0, 0, 40]],
        5,
    )

    rows = result["byDay"]["180"]["department"]["rows"]
    assert rows == [["B", 0, 50.0, 60.0, -10.0, 20, 2.0, 2.0]]


def test_numeric_attribute_bucketing_handles_missing_values():
    script_path = ROOT / "scripts/build_interactive_report.py"
    spec = importlib.util.spec_from_file_location("build_interactive_report", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    frame = module.pd.DataFrame(
        {"user_id": range(12), "numeric_attribute": [*range(1, 12), None]}
    )
    buckets = module.bucket_numeric(frame, {"user_id"})
    assert "numeric_attribute" in buckets
    assert frame["numeric_attribute"].isna().sum() == 1


def test_knowledge_vault_source_priority():
    skill = (ROOT / "skills/people-science-knowledge-vault/SKILL.md").read_text(
        encoding="utf-8"
    )
    sources = (
        ROOT / "skills/people-science-knowledge-vault/references/source-priority.md"
    ).read_text(encoding="utf-8")

    assert "Microsoft Viva Blog" in skill
    assert "only article records from the `External` worksheet" in skill
    assert "microsoftvivablog" in sources
    assert "People_Science_Content_full_index.xlsx" in sources
    assert "`External`" in sources
    assert "`Internal PSEs & POVs`" in sources
