---
name: analyze-survey
description: "Analyze a CSV or Excel employee survey export and create a self-contained interactive HTML report plus a privacy-safe share ZIP. Use when the user asks to analyze survey data, a Viva Glint export, or an employee survey workbook."
allowed-tools: Bash, Read, Write, Glob, Grep, WebFetch
---

# Analyze Survey

Turn a provided survey export into a repeatable local analysis and the standard
interactive report. The skill owns export inspection, safe configuration,
`vivaglint` execution, repeatability validation, HTML generation, tab-level
People Science summaries, and packaging. It does not own a broader customer
readout or manager action plan.

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

1. `references/design/glint-ui-system.md`
2. `references/skills/analyze-survey/README.md`
3. `references/skills/analyze-survey/linked-dataset.json`
4. `references/skills/analyze-survey/golden-report.html`
5. `references/skills/analyze-survey/scores-change-format.png`
6. `references/skills/analyze-survey/interactive-report-contract.md`
7. `references/skills/analyze-survey/people-science-summaries.schema.json`
8. `references/skills/analyze-survey/people-science-source-index.json`
9. `references/skills/people-science-knowledge-vault/`
10. `references/general/interpretation-guardrails.md`
11. `references/general/privacy-and-minimum-n.md`
12. `references/general/codebook-catalog.md`

The Glint UI system is mandatory for all color, typography, spacing, component,
and accessibility decisions. Do not invent report colors or visual patterns.

`golden-report.html` is the canonical report shell. Future reports must preserve
its markup, styling, tab order, labels, and browser interactions exactly while
replacing its embedded aggregate data payload with the current analysis.
The required tabs are Scores change, Relationships, Alerts, Factors,
Attrition analysis, and Downloads. Do not add Overview, Item results, or
Heatmap tabs.

The Scores change tab must follow `scores-change-format.png`: grouped old/new
cycle columns with Mean, Stddev, and n, followed by P-Value and Score
Difference (New - Old) with proportional difference bars.
It must also include a Respondent population sub-heading that switches between
All respondents and Repeat respondents. Repeat respondents are employees with
responses in both selected cycles; never infer repeat status from aggregate
counts.

The Relationships tab must classify absolute Pearson relationship strength as
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

The Alerts tab must use the triage model in the report contract: Critical,
Watch, Improving, Stable, and Suppressed counts; raw and company-adjusted
change; Welch significance; severity/search/threshold filters; sorting; and
expandable top-five item declines. Keep alert language screening-oriented and
non-causal. Suppress every alert group unless both compared cycles have at
least 20 responses; apply the same threshold after report filtering.

## Primary workflow

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
- reads `Sheet1` or the first worksheet from Excel workbooks
- joins a `user_properties` or attributes worksheet when present
- selects privacy-safe categorical report attributes
- creates an internal `analysis-config.json`
- runs the standard `vivaglint` analyses twice
- requires SHA-256 repeatability
- builds the self-contained interactive report and safe share ZIP
- uses the checked-in golden report as the exact HTML template

Long-running phases must provide visible progress rather than appearing idle.
Keep updates concise and identify expensive work such as the repeatability
verification, relationship clustering, alert aggregation, and ZIP packaging.

After the deterministic analysis completes:

1. Inspect `analysis-manifest.json` and
   `people-science-summary-context.json`.
2. Apply the `interpret-analysis` guardrails to distinguish observation,
   interpretation, recommendation, and caveat.
3. Use `people-science-knowledge-vault` to retrieve relevant externally
   published article bodies. Cite only claims supported by those sources.
4. Write `people-science-summaries.json` using
   `people-science-summaries.schema.json`. Include all six tabs.
5. Rerun `scripts/build_interactive_report.py` with the existing config and
   output directory so the summaries are embedded in the HTML and share ZIP.

Every tab must begin with an AI-generated People Science perspective containing
a headline, what the results show, a professional interpretation, a recommended
next step, a caveat, and relevant published-source links. Keep the narrative
concise, non-causal, privacy-safe, and explicit when evidence is unavailable.
The summary must recalculate whenever the report attribute or value changes.
Recompute its headline, observation, interpretation, recommendation, caveat,
and references from the selected filter's aggregate cycle, relationship,
alert, and factor results unless an authored filter-specific narrative is
available. Factor summaries must describe the selected cut's re-estimated
solution or its explicit suppression reason. For tabs without filter-specific
analysis, explicitly state that the displayed evidence remains company-wide or
unavailable.

For Factors, use the company solution's factor count and varimax rotation to
re-estimate loadings for every eligible attribute/value cut. Require at least
the greater of 100 complete responses or five complete responses per survey
item. Suppress smaller or failed cuts. Show the selected cut's complete N,
loading-dimension cards, and clustered horizontal bar small multiples. Repeat
the loading axis for each dimension and show the shared vertical question
labels once. Plot positive loading magnitudes from 0 to 1 and reuse the
Relationships Low, Medium, High, and Very high thresholds and colors. State
Sort questions low to high by their strongest displayed loading, and add a
subtle outline plus a two-decimal data label to every bar. State that factor
labels are exploratory working hypotheses, dimensions can rotate or reorder
across cuts, and this is not evidence of measurement invariance.

Use the checked-in People Science source index to select references from key
terms across the current headline, observation, interpretation,
recommendation, and caveat. Show three distinct references for every summary.
Prefer exact analytical or item-theme matches over generic survey resources,
and never reuse a source merely because it is broadly about employee surveys.

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
- If cycle, alert, or attrition inputs are unavailable, keep the
  corresponding report tab and explain what is missing.
- Never substitute synthetic attrition outcomes.

## Boundaries

After generation, recommend `analysis-qa`. Use `interpret-analysis` only after
QA passes. Do not create manager guidance in this skill.
