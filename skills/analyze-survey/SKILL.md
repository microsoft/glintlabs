---
name: analyze-survey
description: "Analyze a CSV or Excel employee survey export and create a self-contained interactive HTML report plus a privacy-safe share ZIP. Use when the user asks to analyze survey data, a Viva Glint export, or an employee survey workbook."
allowed-tools: Bash, Read, Write, Glob, Grep, WebFetch
---

# Analyze Survey

Turn a provided survey export into a repeatable local analysis and the standard
interactive report. The skill owns export inspection, safe configuration,
`vivaglint` execution, repeatability validation, HTML generation, and
packaging. It does not generate AI interpretation, a broader customer readout,
or a manager action plan.

## Start here

This skill never assumes a data source. Always ask the user, with the
`ask_user` tool when available, which data ingest method to use before doing
anything else:

> How would you like to bring in survey data?
> 1. Upload my own CSV/XLSX export
> 2. Pull live data from the Glint API
> 3. Use the demo/sample dataset to test the skill

Do not proceed past this question with an assumed default. Branch on the
answer:

### 1. CSV/XLSX upload

Ask for the file path. Accept `.csv`, `.xlsx`, and `.xlsm` exports. Keep
respondent-level data local and never paste employee rows into chat. Confirm
the file exists before starting the runner.

### 2. Glint API

Pull data live via Microsoft Graph using the `vivaglint` MCP tools instead of
a file upload:

1. If credentials are not already configured for this session, ask the user
   for `tenant_id`, `client_id`, `client_secret`, and `experience_name`, then
   call `vivaglint-configure_api_credentials`. Never paste the client secret
   back into chat or write it into a committed file.
2. Ask which survey to pull and how: a specific `cycle_id`, a `survey_uuid`
   (which may span several cycles), or a `start_date`/`end_date` range. Also
   confirm `emp_id_col` and `scale_points` if they are not obvious.
3. Call `vivaglint-import_survey_api` with those inputs and a `save_zip_to`
   path so the pulled export lands on local disk. Survey/date-range mode may
   return several cycles; treat each as its own session.
4. Use the resulting local file as the `--survey-export` input to the runner
   below. All analysis still runs locally from that point on exactly like the
   upload path.

If the API call fails or credentials are missing, report the failure and ask
the user to re-enter credentials or switch to another ingest method; do not
silently fall back to the demo dataset.

### 3. Demo/sample dataset

Use this workbook, which is checked directly into this repository so any user
can access it without additional permissions:

```text
Demo Viva Glint Dataset with Attributes - Exit survey research guided.xlsx
references/sample-data/Demo Viva Glint Dataset with Attributes - Exit survey research guided.xlsx
```

Use worksheet `Sheet1`, join worksheet `user_properties` by `user_id`, and use
a 5-point scale. The checked-in workbook is the only registered sample source. Do
not substitute bundled, generated, or synthetic survey data, and only use it
when the user explicitly chose the demo/sample option.

## Required grounding

Read these references in order:

1. `../../references/design/glint-ui-system.md`
2. `references/README.md`
3. `references/linked-dataset.json`
4. `references/golden-report.html`
5. `references/scores-change-format.png`
6. `references/interactive-report-contract.md`
7. `../../references/general/privacy-and-minimum-n.md`
8. `../../references/general/codebook-catalog.md`

The Glint UI system is mandatory for all color, typography, spacing, component,
and accessibility decisions. Do not invent report colors or visual patterns.

`golden-report.html` is the canonical report shell. Future reports must preserve
its markup, styling, tab order, labels, and browser interactions exactly while
replacing its embedded aggregate data payload with the current analysis.
The required base tab order is Correlation, Factors, Scores change, Downloads,
and Methodology. When attrition analysis completes, add Attrition analysis
followed immediately by Attrition alerts between Factors and Scores change. If
attrition is unavailable, omit both attrition tabs, but keep Methodology and
omit its attrition subsections. The Methodology tab is the final tab and
documents, for analysts, how each visible analysis is computed and should be
interpreted. Do not add Overview, Item results, or Heatmap tabs.

Before the navigation, show a deterministic, filter-aware current-survey
summary. Use the latest privacy-eligible cycle for the selected population and
describe its average item score, three high-scoring items, three low-scoring items,
and movement from the prior cycle when available. Add up to three
privacy-safe aggregate comment themes for each displayed item when linked
comments meet the minimum threshold. Prefer score-ranked items with sufficient
comment coverage when at least six are available; otherwise retain the score
ranking and state when themes are unavailable. Never include raw comments in
the report, AI context, share ZIP, or chat. Treat scores and themes as
descriptive within-survey signals rather than benchmarks or causal findings.
This summary must render in standard no-AI reports as well as AI-preview
reports.

Keep all tab-level AI summary cards hidden. Every tab instead begins with one
concise narrative paragraph that explains what the analysis means and how to
use it.

The Scores change tab must follow `scores-change-format.png`: grouped old/new
cycle columns with Mean, Stddev, and n, followed by P-Value and Score
Difference (New - Old) with proportional difference bars.
It must also include a Respondent population sub-heading that switches between
All respondents and Repeat respondents. Repeat respondents are employees with
responses in both selected cycles; never infer repeat status from aggregate
counts.

The Correlation tab must classify absolute Pearson relationship strength as
Low (`|r| < .30`), Medium (`.30-.49`), High (`.50-.69`), or Very high
(`>= .70`). Preserve controls for minimum strength, strength-color visibility,
statistical-significance visibility, and adding/removing multiple highlighted
questions. The report must support multiple highlighted questions at once.
Clicking a matrix cell must show `r`, p-value, N, strength, and
significance status. Keep the matrix compact with full question names on both
axes in small regular-weight text, make color intensity increase with
relationship strength, and hide significance and empty detail/highlight
regions by default.

Cluster the relationship matrix with deterministic average-linkage
hierarchical clustering using positive-correlation distance (`1 - r`). Select
the recommended count using the highest average silhouette score from 3
through 15, capped below the item count. Show a concise recommendation blurb
and a dropdown from 3 through 10 clusters, extending through the recommendation
when it is higher. Reorder both axes and show cluster labels/boundaries.
Describe clusters as exploratory rather than validated survey constructs.
Explain that clustered items share response patterns and may indicate
overlapping content. Item reduction must preserve content coverage and be
validated for reliability and stability across groups and cycles.

The Attrition alerts tab must use the attrition-priority model in the report
contract. For each report attribute and outcome window, rank items by the
median privacy-eligible attrition multiplier across its groups and retain the
top five. Compare each eligible group's item score with company overall. At
company level, show the lowest-scoring group for each top item and attribute;
under a report filter, show the selected group's top-five results. Keep the
language screening-oriented and non-causal.

## Primary workflow

Before starting the runner, give the user a concise estimated completion time.
Base the estimate on the export size and prior runs when available, and state
that correlation clustering, attrition-alert aggregation, and repeatability are the
most variable phases. Do this in the first response that starts the run.

Use the direct export runner:

```bash
python scripts/analyze_survey_export.py \
  --survey-export <survey.csv-or-xlsx> \
  --output-dir <output-directory>
```

The runner automatically:

- shows a live percentage, progress bar, elapsed time, and current phase
- detects standard employee ID columns
- detects numeric `Q_*` survey items
- excludes outcome-style `Q_*` fields that do not match the configured scale
- reads `Sheet1` or the first worksheet from Excel workbooks
- joins a `user_properties` or attributes worksheet when present
- selects privacy-safe categorical report attributes
- excludes identifier-like employee, manager, team, client, UUID, and GUID
  fields from report filters and aggregate downloads
- runs attrition whenever valid Exit or termination outcomes are present; for
  the registered demo, H2 (`survey_cycle_id = 1002`) is linked to Exit
  (`survey_cycle_id = 1003`) using H2's `survey_completion_date`
  (`2026-06-01`) and 90-, 180-, and 365-day windows
- creates an internal `analysis-config.json`
- runs the standard `vivaglint` analyses twice
- requires SHA-256 repeatability
- builds the self-contained interactive report and safe share ZIP
- uses the checked-in golden report as the exact HTML template

Long-running phases must provide visible progress rather than appearing idle.
Keep updates concise and identify expensive work such as the repeatability
verification, correlation clustering, attrition-alert aggregation, and ZIP packaging.

The standard workflow uses `--summary-mode off`, which is also the runner
default. It still writes `people-science-summary-context.json` so the same
completed analysis can be used later by the explicitly invoked
`analyze-survey-ai-preview` skill. A stale `people-science-summaries.json` in
the output directory must not appear in the report or share ZIP when summary
mode is off.

For Factors, use the company solution's factor count and varimax rotation to
re-estimate loadings for every eligible attribute/value cut. Require at least
the greater of 100 complete responses or five complete responses per survey
item. Suppress smaller or failed cuts. Show the selected cut's complete N,
loading-dimension cards, and clustered horizontal bar small multiples. Repeat
the loading axis for each dimension and show the shared vertical question
labels once. Plot positive loading magnitudes from 0 to 1 and reuse the
Correlation Low, Medium, High, and Very high thresholds and colors. State
Sort questions high to low by MR1 loading only; do not combine loading
values across dimensions for ordering. Add a high-contrast outline to every
bar plus a contrasting outline around each two-decimal data label. State that
factor labels are exploratory working hypotheses,
dimensions can rotate or reorder across cuts, and this is not evidence of
measurement invariance.

Explain factor loadings as item-to-dimension alignment on a 0-to-1 scale.
Clarify that .70 is more closely aligned than .60, but a .10 difference is not
automatically practically meaningful without considering the full loading
pattern, item content, and cross-loadings.

For Attrition, rank all eligible items by the unfavorable-to-favorable
attrition-rate multiplier. Default to 180 days and allow 90-, 180-, and
365-day windows. Show the item text and a horizontal multiplier bar with a
clearly marked 1.00x reference line; do not display favorable or unfavorable
counts or percentages in the report. Apply the shared report filter, suppress
cells with fewer than five favorable or unfavorable respondents, and describe
associations as screening signals rather than causal estimates. Never report
individual flight-risk predictions.
Flag multipliers with a two-sided Fisher exact test p-value below .05 as
statistically significant while retaining the multiplier and non-causal
interpretation.

Use the checked-in People Science source index to select references from key
terms across the current headline, observation, interpretation,
recommendation, and caveat. Show three distinct references for every summary.
Prefer exact analytical or item-theme matches over generic survey resources,
and never reuse a source merely because it is broadly about employee surveys.
Use neutral score-based language for item rankings and avoid company-specific
classification vocabulary.

Use explicit options only when automatic detection is wrong:

```bash
--sheet <name>
--attribute-sheet <name>
--emp-id-col <column>
--scale-points <2-11>
--question-cols <item1> <item2> ...
--attribute-cols <attribute1> <attribute2> ...
--min-group-size <5-or-higher>
--summary-mode off
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
attrition.csv
<output-directory-name>-report.html
<output-directory-name>-share.zip
```

Only completed analysis CSVs are required. The HTML report and ZIP are always
required after repeatability passes. The standard report contains no AI summary
cards. Open the HTML report before finishing.

## Failure handling

- If the employee ID or item columns cannot be detected, report the available
  columns and rerun with explicit options.
- If repeatability fails, do not generate or interpret the report.
- If an analysis fails, preserve the explicit failure in the manifest.
- If cycle, alert, or attrition inputs are unavailable, keep the
  corresponding report tab and explain what is missing.
- Never substitute synthetic attrition outcomes.

## Boundaries

After generation, recommend `analysis-qa`. Use `interpret-analysis` only after
QA passes. Do not create manager guidance in this skill.
