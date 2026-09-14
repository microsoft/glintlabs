# Demo survey data

Use this dataset when the user wants to analyze a survey but does not provide their own data.

## Intake prompt

Every survey-analysis workflow should start by asking:

> Do you have your own survey data you would like to analyze? If not, I can use the demo Viva Glint workbook.

The canonical demo source is:

```text
Demo Viva Glint Dataset with Attributes.xlsx
https://microsoft.sharepoint-df.com/:x:/t/EVE/cQqUFHaCVNxhR5SuuM1bWSpIEgUCf21SzklCzncCB16W6hH3Kg
```

Use `Sheet1`, export it to CSV, and configure it as `wide_items` with
`user_id` as the employee ID and numeric `Q_*` columns as survey items. Join
the `user_properties` worksheet by `user_id`.

## Offline fallback

If the canonical SharePoint workbook is unavailable, use
`demo-data/survey/glint_demo_data.csv` and `demo-data/survey/config.json`.
Disclose that the bundled fallback was used.

## Format

This is a `wide_items` dataset:

- `user_id` is the employee/respondent identifier for demo purposes.
- 27 numeric `Q_*` columns contain five-point survey item responses.
- Two survey cycles support time comparisons.
- The canonical workbook includes collaboration attributes and employee
  properties such as tenure, organization, level, location, and team.

Do not treat this as real employee data. It is for demos, smoke tests, and examples.
