# Analyze Survey reference

`analyze-survey` accepts a survey export directly and deterministically creates
the analysis manifest, aggregate artifacts, interactive HTML report, and safe
share ZIP.

## Supported input

- CSV survey exports
- XLSX/XLSM workbooks
- Wide item data with one row per respondent and numeric `Q_*` columns
- Optional employee attributes in the same table or a workbook sheet named
  `user_properties`, `attributes`, `employee attributes`, or `demographics`

Automatic employee ID detection recognizes common forms such as `user_id`,
`employee_id`, and `respondent_id`. Use explicit command options when an export
uses different names.

## Registered linked source

The sole registered sample source is `Viva Glint Dataset with Attributes.xlsx`
at:

```text
https://microsoft.sharepoint-df.com/:x:/t/EVE/cQqUFHaCVNxhR5SuuM1bWSpIEgUCf21SzklCzncCB16W6hH3Kg
```

Use `Sheet1`, join `user_properties` by `user_id`, and use a 5-point scale.
Do not replace it with bundled, generated, or synthetic survey data. If access
is unavailable, report the access problem instead of silently substituting a
different dataset.

## Deterministic entry point

```text
scripts/analyze_survey_export.py
```

This script is the only normal user-facing entry point. It prepares an internal
config under `<output>/_input/`, then calls:

1. `scripts/run_vivaglint_analysis.py`
2. `scripts/build_interactive_report.py`

The analysis must pass the two-run artifact hash comparison before the report
builder runs.

## Privacy

- Minimum displayed group size defaults to 5.
- Raw survey and attribute files stay outside the share ZIP.
- Names, email addresses, comments, phone numbers, and addresses are never
  automatically selected as report attributes.
- Browser interactions use embedded aggregate data, not respondent rows.

## Report

The required behavior and packaging are defined in
`interactive-report-contract.md`.

`golden-report.html` is the user-approved canonical HTML example. The report
builder reads that file directly and replaces only the `const D=...` aggregate
data payload. Do not restyle, restructure, rename, or independently recreate
the report shell. The aggregate values embedded in the golden file are example
values and must never be reused for another analysis.

The golden report intentionally excludes Overview, Item results, and Heatmap.
Its six tabs are Scores change, Relationships, Alerts, Factors, Attrition
analysis, and Downloads.

The Scores change table layout is grounded in `scores-change-format.png`.
Preserve its grouped old/new cycle headers, Mean/Stddev/n columns, p-value
indicator, alternating rows, and proportional score-difference bars.
Include a Respondent population control with All respondents and Repeat
respondents. Repeat-only values must be precomputed from employee IDs present
in both selected cycles and remain subject to minimum-N suppression.
