# Analyze Survey references

Place first-priority documents for `analyze-survey` here.

Use this folder for:

- input-data requirements
- codebook runbooks
- supported Glint export formats
- analysis configuration examples
- package-version notes
- deterministic/repeatability expectations
- known `vivaglint` edge cases
- `interactive-report-contract.md`, the required user-facing output format

When `analyze-survey` runs, inspect this folder before `references/general/`.

## Canonical demo workbook

When a user does not have their own survey data, reference and use:

- **File:** `Demo Viva Glint Dataset with Attributes.xlsx`
- **Worksheet:** `Sheet1`
- **Attributes:** `user_properties`
- **URL:** https://microsoft.sharepoint-df.com/:x:/t/EVE/cQqUFHaCVNxhR5SuuM1bWSpIEgUCf21SzklCzncCB16W6hH3Kg
- **Defaults:** `input_format: wide_items`, `emp_id_col: user_id`, scale points
  `5`

Export `Sheet1` to CSV for the current runner and join `user_properties` by
`user_id`. If authenticated SharePoint access is unavailable, use
`demo-data/survey/config.json` and `demo-data/survey/glint_demo_data.csv` as
the disclosed offline fallback.

## Required report

After the analysis passes repeatability, generate the interactive report and
shareable ZIP defined in `interactive-report-contract.md`. Use precomputed
aggregate interactions rather than browser-side employee analysis.
`scripts/run_vivaglint_analysis.py` invokes
`scripts/build_interactive_report.py` automatically.
