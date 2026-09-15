import csv
import importlib.util
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_each_skill_has_first_priority_reference_folder():
    skills_dir = ROOT / "skills"
    refs_dir = ROOT / "references/skills"
    skill_names = sorted(path.name for path in skills_dir.iterdir() if path.is_dir())

    assert skill_names == [
        "analysis-qa",
        "analyze-survey",
        "interpret-analysis",
        "people-science-knowledge-vault",
    ]

    missing = [
        name
        for name in skill_names
        if not (refs_dir / name / "README.md").exists()
    ]

    assert missing == []


def test_analyze_survey_points_to_linked_dataset():
    skill = (ROOT / "skills/analyze-survey/SKILL.md").read_text(encoding="utf-8")
    source_path = (
        ROOT / "references/skills/analyze-survey/linked-dataset.json"
    )
    source = json.loads(source_path.read_text(encoding="utf-8"))
    source_url = (
        "https://microsoft.sharepoint-df.com/:x:/t/EVE/"
        "cQqUFHaCVNxhR5SuuM1bWSpIEgUCf21SzklCzncCB16W6hH3Kg"
    )

    assert (
        "Do you have your own survey data you would like to analyze? "
        "If not, I can use the linked Viva Glint workbook."
    ) in skill
    assert source["source_url"] == source_url
    assert source["worksheet"] == "Sheet1"
    assert source["attribute_worksheet"] == "user_properties"
    assert source_url in skill
    assert "synthetic survey data" in skill
    assert "scripts/analyze_survey_export.py" in skill
    assert "--survey-export" in skill
    assert "interactive-report-contract.md" in skill
    assert "golden-report.html" in skill
    assert "scores-change-format.png" in skill
    assert "strength-color visibility" in skill
    assert "statistical-significance visibility" in skill
    assert "multiple highlighted questions" in skill
    assert "<output-directory-name>-report.html" in skill
    assert "<output-directory-name>-share.zip" in skill

    report_contract = (
        ROOT / "references/skills/analyze-survey/interactive-report-contract.md"
    ).read_text(encoding="utf-8")
    required_tabs = (
        "Scores change",
        "Relationships",
        "Alerts",
        "Factors",
        "Attrition analysis",
        "Downloads",
    )
    positions = [report_contract.index(f"**{name}**") for name in required_tabs]
    assert positions == sorted(positions)
    assert "OPEN_REPORT.html" in report_contract
    assert "Force the light Glint report theme" in report_contract
    assert "Do not embed or recalculate from" in report_contract
    assert "Exclude\nraw respondent data" in report_contract
    assert "scripts/build_interactive_report.py" in report_contract
    assert "Low (`|r| < .30`)" in report_contract
    assert "turn strength colors on or off" in report_contract
    assert "show or hide statistical-significance markers" in report_contract
    assert "individually remove multiple highlighted questions" in report_contract
    assert (ROOT / "scripts/build_interactive_report.py").exists()
    golden = ROOT / "references/skills/analyze-survey/golden-report.html"
    assert golden.exists()
    assert (ROOT / "references/skills/analyze-survey/scores-change-format.png").exists()
    runner = (ROOT / "scripts/run_vivaglint_analysis.py").read_text(encoding="utf-8")
    assert 'with_name("build_interactive_report.py")' in runner
    assert (ROOT / "scripts/analyze_survey_export.py").exists()
    builder = (ROOT / "scripts/build_interactive_report.py").read_text(encoding="utf-8")
    assert '"golden-report.html"' in builder


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
    assert "email" not in config["attribute_cols"]
    assert config["source_file_name"] == survey.name
    assert len(config["source_sha256"]) == 64


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
    questions = ["Q_ONE", "Q_TWO", "Q_THREE", "Q_FOUR"]
    with survey.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["user_id", "survey_cycle_title", *questions],
        )
        writer.writeheader()
        for row in range(40):
            writer.writerow(
                {
                    "user_id": row + 1,
                    "survey_cycle_title": "H1" if row < 20 else "H2",
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

    subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts/build_interactive_report.py"),
            "--config",
            str(config),
            "--output-dir",
            str(tmp_path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    report = tmp_path / f"{tmp_path.name}-report.html"
    share_zip = tmp_path / f"{tmp_path.name}-share.zip"
    report_text = report.read_text(encoding="utf-8")
    golden_text = (
        ROOT / "references/skills/analyze-survey/golden-report.html"
    ).read_text(encoding="utf-8")
    payload = re.compile(r"(?s)(<script>const D=).*?(;\nconst names=)")
    assert payload.sub(r"\1__DATA__\2", report_text) == payload.sub(
        r"\1__DATA__\2", golden_text
    )
    for tab in (
        "Scores change",
        "Relationships",
        "Alerts",
        "Factors",
        "Attrition analysis",
        "Downloads",
    ):
        assert f">{tab}</button>" in report_text
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
        "Relationship display",
        "Minimum strength",
        "Show strength colors",
        "Show statistical significance",
        "Highlight a question",
        "Clear highlights",
        "Very high",
    ):
        assert heading in report_text
    with zipfile.ZipFile(share_zip) as archive:
        names = set(archive.namelist())
    assert "OPEN_REPORT.html" in names
    assert survey.name not in names
    assert attributes.name not in names


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
        ROOT / "references/skills/people-science-knowledge-vault/source-priority.md"
    ).read_text(encoding="utf-8")

    assert "Microsoft Viva Blog" in skill
    assert "only article records from the `External` worksheet" in skill
    assert "microsoftvivablog" in sources
    assert "People_Science_Content_full_index.xlsx" in sources
    assert "`External`" in sources
    assert "`Internal PSEs & POVs`" in sources
