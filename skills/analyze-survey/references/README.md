# Analyze Survey references

Use `../SKILL.md` for routing, ingest choices, execution, and completion.
This folder supplies the detailed contracts and input notes:

| Reference | Owns |
|---|---|
| `interpretation.md` | QA readiness, cross-codebook synthesis, narrative format, and interpretation guardrails. |
| `interactive-report-contract.md` | Report behavior, analytical thresholds, privacy, score units, and packaging. |
| `golden-report.html` | Canonical HTML shell; replace its aggregate data through the shared builder, never reuse its example results. |
| `scores-change-format.png` | Scores change visual example. |
| `linked-dataset.json` | Machine-readable sample source registration. |
| `people-science-summaries.schema.json` | AI-preview narrative shape. |
| `people-science-source-index.json` | Reviewed public-source retrieval for AI-preview report summaries. |

## Interpretation references

Keep first-priority People Science interpretation materials in this folder:

- People Science interpretation examples
- construct-specific interpretation notes
- customer-ready narrative patterns
- correlation/factor/cycle interpretation examples
- caveat language
- follow-up analysis decision rules

Inspect this folder before the shared `references/general/` collection.

## Supported input

- CSV survey exports
- XLSX/XLSM workbooks
- Wide item data with one row per respondent and numeric `Q_*` columns
- Outcome-style `Q_*` fields that do not match the configured response scale
  are excluded from automatic item detection.
- Optional employee attributes in the same table or a workbook sheet named
  `user_properties`, `attributes`, `employee attributes`, or `demographics`
- Excel input uses `Sheet1` or the first worksheet by default.

Automatic employee ID detection recognizes common forms such as `user_id`,
`employee_id`, and `respondent_id`. Use explicit command options when an export
uses different names.

## Registered linked source

Use the workbook and ingest settings specified in `../SKILL.md` and
`linked-dataset.json`. The sample defines an H2-to-Exit attrition analysis: cycle
`1002` is the predictor survey, cycle `1003` is the Exit cohort,
`attrition date` is the outcome date, and `survey_completion_date` supplies
the predictor date. The current H2 completion date is June 1, 2026. The
deterministic windows are 90, 180, and 365 days.

## Deterministic entry point

```text
scripts/analyze_survey_export.py
```

For new analyses, this script prepares an internal
config under `<output>/_input/`, then calls:

1. `scripts/run_vivaglint_analysis.py`
2. `scripts/build_interactive_report.py`

## Input privacy

- Names, email addresses, raw comments, phone numbers, and addresses are never
  automatically selected as report attributes.
- Raw linked comments stay in `_input`; aggregate theme handling and
  suppression are governed by the report contract.
- Manager-defined alert groups receive deterministic generic team labels
  before entering the report.
