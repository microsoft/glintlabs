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
