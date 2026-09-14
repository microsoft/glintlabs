---
name: analyze-survey
description: "Run the standard People Science survey analysis package using vivaglint and produce a stable manifest, interactive Glint report, and privacy-safe share ZIP. Use for Viva Glint survey exports, survey CSVs, cycle files, attribute files, attrition files, or the canonical demo workbook."
allowed-tools: Bash, Read, Write, Glob, Grep
---

# Analyze Survey

Run a standard, local People Science analysis workflow over Viva Glint survey
exports using the pinned `vivaglint` package, then package the completed
aggregate outputs in the required interactive Glint report. Do not copy
analysis code into this plugin.

## Use when

Use this skill when the user asks to:

- run a survey analysis package
- analyze a Viva Glint export
- produce descriptives, correlations, factor analysis, cycle comparisons, by-attribute analysis, or attrition analysis
- generate an analysis manifest for downstream interpretation
- prepare outputs for `interpret-analysis` or `analysis-qa`

Do not use this skill when the user only wants an interpretation of existing results. Use `interpret-analysis` instead.

## Required inputs

The first action in every survey-analysis request is to ask:

> Do you have your own survey data you would like to analyze? If not, I can use the demo Viva Glint workbook.

Do not ask for scale points, identifiers, attributes, or other configuration
until the user answers this question.

If the user does not have data or chooses demo data, reference and use:

```text
Demo Viva Glint Dataset with Attributes.xlsx
https://microsoft.sharepoint-df.com/:x:/t/EVE/cQqUFHaCVNxhR5SuuM1bWSpIEgUCf21SzklCzncCB16W6hH3Kg
```

Use worksheet `Sheet1`, `input_format: wide_items`, `emp_id_col: user_id`,
scale points `5`, numeric `Q_*` columns as survey items, and join worksheet
`user_properties` by `user_id`.

The analysis runner requires CSV input. Download or export `Sheet1` to a local
CSV before creating `analysis-config.json`. If the SharePoint workbook cannot
be accessed, continue with the bundled offline fallback rather than blocking:

```text
demo-data/survey/config.json
demo-data/survey/glint_demo_data.csv
```

When the fallback is used, state that it is the bundled offline demo and still
reference the SharePoint workbook as the canonical demo source.

Ask for missing required inputs:

| Input | Required | Notes |
|---|---:|---|
| Survey CSV | Yes | Primary Viva Glint export. |
| Scale points | Yes | Usually 5, but confirm. |
| Employee ID column | Yes | Required for import and joins. |
| Attribute file | Optional | Needed for by-attribute analysis. |
| Attribute columns | Optional | Required when attribute file is provided. |
| Attrition file | Optional | Needed for attrition analysis. |
| Termination date column | Optional | Required when attrition file is provided. |
| Survey completion date | Required for attrition | The survey data must contain `Survey Cycle Completion Date`. |
| Attrition attributes | Tenure and organization by default | Run overall, tenure, and organization views first. Offer additional attributes when available and relevant. |
| Cycle CSVs | Optional | Needed for cycle comparisons. |

The demo workbook includes survey-cycle metadata, collaboration attributes,
tenure, organization, organization group, management level, job title,
location, organization size, team size, and manager-defined teams. It does
not include termination outcomes, survey completion dates, or termination
dates, so do not claim attrition analysis completed on the workbook alone.

## Attrition defaults

When valid attrition inputs are available:

1. Run the overall attrition analysis.
2. Run tenure and organization as separate attribute views by default.
3. Offer other available attributes as additional separate views.
4. Report tenure or organization as missing if unavailable.
5. Do not create high-dimensional attribute intersections by default.

## Process

1. Inspect first-priority references in `references/skills/analyze-survey/`.
2. Inspect second-priority shared references in `references/general/`, especially `codebook-catalog.md`, `privacy-and-minimum-n.md`, and `architecture.md`.
3. Confirm the intended output directory.
4. Create or validate an `analysis-config.json` matching `schemas/analysis-config.schema.json`.
5. Run `scripts/run_vivaglint_analysis.py` with the config and output directory.
6. Require the built-in repeatability check to run. The script runs the analysis twice, compares completed artifacts by SHA-256 hash, and writes `repeatability_check` into `analysis-manifest.json`.
7. Inspect `analysis-manifest.json`.
8. After repeatability passes, read
   `references/skills/analyze-survey/interactive-report-contract.md`.
9. Confirm the runner automatically completed
   `scripts/build_interactive_report.py`. If debugging requires a direct run,
   execute:

   ```bash
   python scripts/build_interactive_report.py \
     --config <analysis-config.json> \
     --output-dir <analysis-output-directory>
   ```

   Do not hand-author a substitute report.
10. Validate JavaScript syntax, linked artifacts, minimum-N suppression, and
    exclusion of respondent-level files from the ZIP.
11. Open the HTML report and report what completed, skipped, or failed,
    whether repeatability passed, and where the report and ZIP were written.

## Output contract

The skill must produce or point to:

```text
analysis-manifest.json
descriptives.csv
response_distribution.csv
correlations.csv
factor_analysis_summary.csv
cycle_comparisons.csv
by_attribute.csv
attrition.csv
<analysis-name>-report.html
<analysis-name>-share.zip
```

Only artifacts for completed analyses are required. Skipped or failed analyses must be recorded in the manifest.

The report and ZIP are required after a successful repeatable analysis. Follow
`references/skills/analyze-survey/interactive-report-contract.md` exactly.
Do not finish a successful analysis with only CSV files and a manifest.

## Repeatability requirement

Always run analysis twice before treating outputs as interpretation-ready. The first run writes the primary artifacts; the second run writes to `_repeatability_run/` and compares completed artifacts byte-for-byte.

If `repeatability_check.status != "passed"`:

- do not interpret the results
- report the mismatched artifact names
- explain that the analysis is not reproducible yet
- inspect whether nondeterministic codebook behavior, package drift, input mutation, or environment differences caused the mismatch

Only use `--skip-repeatability-check` for the internal second pass or an explicit debugging request. Never use it for normal user-facing analysis.

## Interpretation boundaries

This skill may summarize execution status and obvious data warnings. It should not produce final People Science interpretation. After successful execution, suggest:

1. `analysis-qa` to check validity and safety.
2. `interpret-analysis` to synthesize findings.

## Privacy

Do not paste raw employee-level rows into chat. Keep outputs local. Use minimum group-size suppression for by-attribute and attrition analyses.
