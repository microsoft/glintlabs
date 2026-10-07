import csv
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
import zipfile
from io import StringIO
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_each_skill_has_first_priority_reference_folder():
    skills_dir = ROOT / "skills"
    skill_names = sorted(path.name for path in skills_dir.iterdir() if path.is_dir())

    assert skill_names == [
        "analysis-qa",
        "analyze-survey",
        "analyze-survey-ai-preview",
        "interpret-analysis",
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
        "references/people-science-summaries.schema.json",
        "references/people-science-source-index.json",
        "../people-science-knowledge-vault/references",
        "../../references/general/interpretation-guardrails.md",
        "../../references/general/privacy-and-minimum-n.md",
        "../../references/general/codebook-catalog.md",
    ]

    assert all((skill_dir / path).resolve().exists() for path in required)


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

    assert "Upload my own CSV/XLSX export" in skill
    assert "Pull live data from the Glint API" in skill
    assert "Use the demo/sample dataset to test the skill" in skill
    assert "Do not proceed past this question with an assumed default" in skill
    assert "vivaglint-configure_api_credentials" in skill
    assert "vivaglint-import_survey_api" in skill
    assert "save_zip_to" in skill
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
    assert "strength-color visibility" in skill
    assert "statistical-significance visibility" in skill
    assert "multiple highlighted questions" in skill
    assert "positive-correlation distance (`1 - r`)" in skill
    assert "highest average silhouette score" in skill
    assert "dropdown from 3 through 10 clusters" in skill
    assert "median privacy-eligible attrition multiplier" in skill
    assert "top-five results" in skill
    assert "lowest-scoring group" in skill
    assert "deterministic, filter-aware current-survey" in skill
    assert "three high-scoring items" in skill
    assert "three low-scoring items" in skill
    assert "privacy-safe aggregate comment themes" in skill
    assert "Never include raw comments" in skill
    assert "greater of 100 complete responses or five complete responses" in skill
    assert "clustered horizontal bar small multiples" in skill
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
    assert "`interpret-analysis`" in preview_skill
    assert "`people-science-knowledge-vault`" in preview_skill

    report_contract = (
        ROOT / "skills/analyze-survey/references/interactive-report-contract.md"
    ).read_text(encoding="utf-8")
    required_tabs = (
        "Correlation",
        "Factors",
        "Attrition analysis",
        "Attrition alerts",
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
    assert "**Method**, **Example interpretation**, and **Example action**" in report_contract
    assert "deterministic keyword coding" in report_contract
    assert "Raw comments must never enter HTML" in report_contract
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
            "attrition date": [46113, None],
        }
    )
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
    assert "id=alertsList" in report
    assert ">Attrition alerts</button>" in report
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
    assert "Compare later exit rates for respondents" in report
    assert "Start with the largest score gaps" in report
    assert "<th>Favorable n</th>" not in report
    assert "<th>Favorable attrition</th>" not in report
    assert "<th>Unfavorable n</th>" not in report
    assert "<th>Unfavorable attrition</th>" not in report
    assert "fewer than 5 favorable or unfavorable respondents" in report
    assert "2025-12-15" in report


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
                "repeatability_check": {"status": "passed"},
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
    for tab in (
        "Scores change",
        "Correlation",
        "Factors",
        "Downloads",
        "Methodology",
    ):
        assert f">{tab}</button>" in report_text
    for unavailable_tab in ("Attrition analysis", "Attrition alerts", "Alerts"):
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
        "Differences with a high p-value or a small n are unconfirmed",
        "don't belong cleanly to either",
        "using only one item reintroduces that item's own noise",
        "Any number cited without its matching file is unverified",
    ):
        assert guidance in report_text
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
    assert suppressed["completeN"] == 20
    assert "At least 100 complete responses" in suppressed["reason"]


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
