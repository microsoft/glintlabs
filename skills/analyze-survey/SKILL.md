---
name: analyze-survey
description: "Analyze a CSV or Excel employee survey export and create a self-contained interactive HTML report plus a privacy-safe share ZIP. Use when the user asks to analyze survey data, a Viva Glint export, or an employee survey workbook."
allowed-tools: Bash, Read, Write, Glob, Grep
---

# Analyze Survey

Turn a provided survey export into a repeatable local analysis and the standard
interactive report. The skill owns export inspection, safe configuration,
`vivaglint` execution, repeatability validation, HTML generation, and packaging.
It does not own People Science interpretation or manager recommendations.

## Start here

Ask:

> Do you have your own survey data you would like to analyze? If not, I can use the linked Viva Glint workbook.

Accept `.csv`, `.xlsx`, and `.xlsm` exports. Keep respondent-level data local
and never paste employee rows into chat.

If the user does not provide another export, use this workbook:

```text
Viva Glint Dataset with Attributes.xlsx
https://microsoft.sharepoint-df.com/:x:/t/EVE/cQqUFHaCVNxhR5SuuM1bWSpIEgUCf21SzklCzncCB16W6hH3Kg
```

Use worksheet `Sheet1`, join worksheet `user_properties` by `user_id`, and use
a 5-point scale. The linked workbook is the only registered sample source. Do
not substitute bundled, generated, or synthetic survey data.

## Required grounding

Read these references in order:

1. `references/skills/analyze-survey/README.md`
2. `references/skills/analyze-survey/linked-dataset.json`
3. `references/skills/analyze-survey/golden-report.html`
4. `references/skills/analyze-survey/interactive-report-contract.md`
5. `references/general/privacy-and-minimum-n.md`
6. `references/general/codebook-catalog.md`

`golden-report.html` is the canonical report shell. Future reports must preserve
its markup, styling, tab order, labels, and browser interactions exactly while
replacing its embedded aggregate data payload with the current analysis.

## Primary workflow

Use the direct export runner:

```bash
python scripts/analyze_survey_export.py \
  --survey-export <survey.csv-or-xlsx> \
  --output-dir <output-directory>
```

The runner automatically:

- detects standard employee ID columns
- detects numeric `Q_*` survey items
- reads `Sheet1` or the first worksheet from Excel workbooks
- joins a `user_properties` or attributes worksheet when present
- selects privacy-safe categorical report attributes
- creates an internal `analysis-config.json`
- runs the standard `vivaglint` analyses twice
- requires SHA-256 repeatability
- builds the self-contained interactive report and safe share ZIP
- uses the checked-in golden report as the exact HTML template

Use explicit options only when automatic detection is wrong:

```bash
--sheet <name>
--attribute-sheet <name>
--emp-id-col <column>
--scale-points <2-11>
--question-cols <item1> <item2> ...
--attribute-cols <attribute1> <attribute2> ...
--min-group-size <5-or-higher>
```

## Successful output

A successful run must contain:

```text
analysis-manifest.json
descriptives.csv
response_distribution.csv
correlations.csv
factor_analysis_summary.csv
by_attribute.csv
<output-directory-name>-report.html
<output-directory-name>-share.zip
```

Only completed analysis CSVs are required. The HTML report and ZIP are always
required after repeatability passes. Open the HTML report before finishing.

## Failure handling

- If the employee ID or item columns cannot be detected, report the available
  columns and rerun with explicit options.
- If repeatability fails, do not generate or interpret the report.
- If an analysis fails, preserve the explicit failure in the manifest.
- If cycle, alert, heatmap, or attrition inputs are unavailable, keep the
  corresponding report tab and explain what is missing.
- Never substitute synthetic attrition outcomes.

## Boundaries

After generation, recommend `analysis-qa`. Use `interpret-analysis` only after
QA passes. Do not create manager guidance in this skill.
