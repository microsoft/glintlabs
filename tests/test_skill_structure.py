import csv
import json
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


def test_analyze_survey_points_to_demo_data():
    skill = (ROOT / "skills/analyze-survey/SKILL.md").read_text(encoding="utf-8")
    source = (ROOT / "demo-data/survey/source.json").read_text(encoding="utf-8")
    demo_config = ROOT / "demo-data/survey/config.json"
    demo_csv = ROOT / "demo-data/survey/glint_demo_data.csv"
    demo_url = (
        "https://microsoft.sharepoint-df.com/:x:/t/EVE/"
        "cQqUFHaCVNxhR5SuuM1bWSpIEgUCf21SzklCzncCB16W6hH3Kg"
    )

    assert (
        "Do you have your own survey data you would like to analyze? "
        "If not, I can use the demo Viva Glint workbook."
    ) in skill
    assert skill.index("The first action") < skill.index("Ask for missing required inputs")
    assert demo_url in skill
    assert demo_url in source
    assert demo_config.exists()
    assert demo_csv.exists()
    assert "Run tenure and organization as separate attribute views by default." in skill
    assert "do not claim attrition analysis completed" in skill
    assert "interactive-report-contract.md" in skill
    assert "<analysis-name>-report.html" in skill
    assert "<analysis-name>-share.zip" in skill

    report_contract = (
        ROOT / "references/skills/analyze-survey/interactive-report-contract.md"
    ).read_text(encoding="utf-8")
    required_tabs = (
        "Overview",
        "Item results",
        "Scores change",
        "Heatmap",
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
    assert "questions on the vertical axis" in report_contract
    assert "attribute values on the horizontal" in report_contract
    assert "Do not embed or recalculate from" in report_contract
    assert "Exclude\nraw respondent data" in report_contract
    assert "scripts/build_interactive_report.py" in report_contract
    assert (ROOT / "scripts/build_interactive_report.py").exists()
    runner = (ROOT / "scripts/run_vivaglint_analysis.py").read_text(encoding="utf-8")
    assert 'with_name("build_interactive_report.py")' in runner


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
    for tab in (
        "Overview",
        "Item results",
        "Scores change",
        "Heatmap",
        "Relationships",
        "Alerts",
        "Factors",
        "Attrition analysis",
        "Downloads",
    ):
        assert f">{tab}</button>" in report_text
    with zipfile.ZipFile(share_zip) as archive:
        names = set(archive.namelist())
    assert "OPEN_REPORT.html" in names
    assert survey.name not in names
    assert attributes.name not in names


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
