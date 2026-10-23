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
- Native platform exports: five cycle-metadata columns, repeated score/comment/
  topics/sensitive-flag groups, then employee attributes. These require
  inspection and explicit user-confirmed loading decisions.
- Wide item data with one row per respondent and numeric `Q_*` columns
- Outcome-style `Q_*` fields that do not match the configured response scale
  are excluded from automatic item detection.
- Optional employee attributes in the same table or a workbook sheet named
  `user_properties`, `attributes`, `employee attributes`, or `demographics`
- Excel input uses `Sheet1` or the first worksheet by default.

Automatic employee ID detection recognizes common forms such as `user_id`,
`employee_id`, and `respondent_id`. Use explicit command options when an export
uses different names.

### Native platform preparation

Use `--inspect-only` to write a private `preparation-proposal.json` under
`<output>/_input/`. Review all assumptions with the user before using
`--preparation-decisions <confirmed.json>` to execute. The proposal's
`decisions_template` specifies the source/settings hashes, ID, scale, selected
questions, oldest-to-newest `cycle_order`, attribute mappings, and clear/sensitive
flag encodings. UUID order is not evidence of chronology. Keep
`confirmed: false` until the user has resolved the loading choices.

Every trailing candidate attribute must have an explicit mapping to a meaningful
name or `null` for confirmed exclusion. For uncertain names such as `attribute 4`,
ask the user for meaning and record the confirmed mapping/rule in
`attribute_evidence`. Numeric bands alone do not establish tenure versus age.
Do not invent labels or silently drop an ambiguous column. Identifying,
sensitive, overly granular, and conflicting mappings remain prohibited even
after confirmation.

The adapter reuses `vivaglint.extract_questions`, `split_survey_data`, and
`pivot_long` from the existing library. Question suffixes, not numeric-column
guessing, identify groups. Original question text remains the explicit item
key. Cycle UUID/title and approved attributes are retained separately because
`split_survey_data` does not retain them. Internal row links keep reshaped
comments aligned with the correct respondent and cycle; employee IDs retain
their original strings, including leading zeros.

Scores of `-1` are skipped, and blank score cells remain missing. Blank
comment/topic/flag cells with no comment are normal. Do not rank-remap unknown
score values or assume a scale. Confirm incomplete groups, invalid scores,
ambiguous identities, and flag contradictions with the user. Sensitive and
unknown-flag comment text/topics never enter interpretation or theme analysis.

`preparation-audit.json` records actual confirmed exclusions using reason codes
and column positions, without raw rows or sensitive counts. The report derives
its privacy-safe Limitations list from that record. The preview shows five
entries; when longer, `input-limitations.txt` contains the complete list and
is explicitly included in Downloads/the share ZIP. Private proposals, decisions,
audits, and raw comments stay under `_input` and are never shared.

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
