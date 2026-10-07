# Analyze Survey reference

`analyze-survey` always asks the user which data ingest method to use — CSV/XLSX
upload, the live Glint API, or the demo/sample dataset — before doing anything
else, then deterministically creates the analysis manifest, aggregate
artifacts, interactive HTML report, and safe share ZIP from whichever export
results.

## Ingest methods

1. **CSV/XLSX upload** — the user provides a file path directly.
2. **Glint API** — `vivaglint-configure_api_credentials` stores Microsoft
   Graph credentials for the session, then `vivaglint-import_survey_api`
   (mode `cycle`, `survey`, or `daterange`) pulls the data and writes it to a
   local file via `save_zip_to`. That local file is then used exactly like an
   upload for every step below.
3. **Demo/sample dataset** — the checked-in sample workbook, used only when
   explicitly selected.

## Supported input

- CSV survey exports
- XLSX/XLSM workbooks
- Wide item data with one row per respondent and numeric `Q_*` columns
- Outcome-style `Q_*` fields that do not match the configured response scale
  are excluded from automatic item detection.
- Optional employee attributes in the same table or a workbook sheet named
  `user_properties`, `attributes`, `employee attributes`, or `demographics`

Automatic employee ID detection recognizes common forms such as `user_id`,
`employee_id`, and `respondent_id`. Use explicit command options when an export
uses different names.

## Registered linked source

The sole registered sample source is
`Demo Viva Glint Dataset with Attributes - Exit survey research guided.xlsx`,
checked directly into this repository so any user can access it without
additional permissions, at:

```text
references/sample-data/Demo Viva Glint Dataset with Attributes - Exit survey research guided.xlsx
```

Use `Sheet1`, join `user_properties` by `user_id`, and use a 5-point scale.
The registered sample also defines an H2-to-Exit attrition analysis: cycle
`1002` is the predictor survey, cycle `1003` is the Exit cohort,
`attrition date` is the outcome date, and `survey_completion_date` supplies
the predictor date. The current H2 completion date is June 1, 2026. The
deterministic windows are 90, 180, and 365 days.
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

The runner prints durable progress updates with an ASCII bar, percentage,
elapsed time, and current phase. Keep progress visible during both analysis
passes and the interactive-report build, especially correlation clustering
and attrition-alert aggregation, which can take several minutes on large exports.
Before launching it, give the user a concise completion-time estimate based on
the export size and prior observed runs when available.

The first report build also writes
`people-science-summary-context.json`, a compact aggregate-only input for AI
interpretation. Standard `analyze-survey` runs use summary mode `off`, so no AI
summary cards or summary file appear in the report package. The explicitly
invoked `analyze-survey-ai-preview` skill uses this context, writes all six tab
narratives to `people-science-summaries.json`, and rebuilds the shared report
with summary mode `required`.

## Privacy

- Minimum displayed group size defaults to 5.
- Raw survey and attribute files stay outside the share ZIP.
- Names, email addresses, raw comments, phone numbers, and addresses are never
  automatically selected as report attributes.
- When a workbook contains a linked comments worksheet, the runner may derive
  deterministic aggregate theme labels locally. At least five comments and
  roughly 2% theme recurrence are required for a theme. Raw comment text stays
  in `_input`, never enters the HTML, AI context, share ZIP, or chat, and is
  never shown to report recipients.
- Identifier-like employee, manager, team, client, UUID, and GUID fields are
  excluded from report filters and aggregate downloads. Manager-defined alert
  groups receive deterministic generic team labels before entering the report.
- Browser interactions use embedded aggregate data, not respondent rows.

## Report

The required behavior and packaging are defined in
`interactive-report-contract.md`.

Standard reports contain no AI summary cards. Preview reports may retain
validated AI narrative data for future development, but tab-level AI cards are
hidden. Every tab begins with one concise plain-language paragraph describing
what the analysis means and how to use it.

Live summaries remain compact by stating the selected scope once in the
headline and avoiding repeated metrics or findings across the observation,
interpretation, recommendation, and caveat.

`people-science-source-index.json` is the fast retrieval layer for report
grounding. It contains reviewed public sources, concept terms, and three
defaults per tab. The browser ranks sources against key terms across the
current headline, observation, interpretation, recommendation, and caveat, so
filtered findings about topics such as belonging, action taking, work-life,
confidentiality, or attrition receive different references. Every rendered
preview summary shows three sources.

`golden-report.html` is the user-approved canonical HTML example. The report
builder reads that file directly and replaces only the `const D=...` aggregate
data payload. Do not restyle, restructure, rename, or independently recreate
the report shell. The aggregate values embedded in the golden file are example
values and must never be reused for another analysis.

Before changing the golden report or any report colors, load
`references/design/glint-ui-system.md`. It points to the canonical
`glint-ui-system` skill and records the required Glint/Fluent design rules.
The report shell adapts the Glint Labs Figma Home page through its rounded
masthead, editorial hero, pill navigation, airy cards, resource-style download
rows, and high-contrast closing section. The Glint UI system remains the source
of truth for tokens, typography, interaction states, and accessibility.

The golden report intentionally excludes Overview, Item results, and Heatmap.
Generated reports use Correlation, Factors, Scores change, Downloads, and a
final Methodology reference tab. When attrition is available, they insert
Attrition analysis and Attrition alerts after Factors (before Scores change);
otherwise both tabs are absent, and Methodology omits its attrition
subsections. The Methodology tab documents the actual shipped calculations,
thresholds, and interpretation
guardrails for each visible analysis so analysts can explain the report
accurately.

The top of every report contains a deterministic current-survey summary before
the navigation. It responds to the shared attribute/value filter and presents
the latest privacy-eligible cycle, average item score, three high-scoring
items, three low-scoring items, prior-cycle movement when available, and up to
three privacy-safe aggregate comment themes for each displayed item. When at
least six scored items have sufficient linked comment coverage, the cards rank
within those items; otherwise they retain the full score ranking and identify
items without eligible themes. It remains present when AI summary mode is off.

The Scores change table layout is grounded in `scores-change-format.png`.
Preserve its grouped old/new cycle headers, Mean/Stddev/n columns, p-value
indicator, alternating rows, and proportional score-difference bars.
Include a Respondent population control with All respondents and Repeat
respondents. Repeat-only values must be precomputed from employee IDs present
in both selected cycles and remain subject to minimum-N suppression.

The Correlation matrix classifies absolute Pearson `r` as Low (`< .30`),
Medium (`.30-.49`), High (`.50-.69`), or Very high (`>= .70`). Preserve the
minimum-strength filter, strength-color toggle, significance toggle,
add/remove question highlights, summary counts, and click-through cell details
in the golden report. Keep the matrix visually compact: full question names on
both axes in small regular-weight text, subtle-to-strong blue intensity,
significance hidden by default, and no empty highlight or detail panels.
Use deterministic average-linkage clustering over positive-correlation
distance. Show the silhouette-based recommendation in a short blurb, default
to it, and allow selection from 3 through 10 clusters or through the
recommendation when it is higher.

The Attrition alerts tab ranks the top five attrition-multiplier items per
attribute and outcome window, then compares privacy-eligible group scores with
company overall. Company view shows the lowest-scoring group for each top
item; a selected report filter shows that group's top-five results. Ranking,
suppression, and interpretation rules are defined in
`interactive-report-contract.md`.

The Factors tab re-estimates item loadings for each eligible report
attribute/value cut with the same factor count and varimax rotation as the
company solution. A cut requires at least the greater of 100 complete responses
or five complete responses per item; otherwise the report displays the
suppression reason. The tab includes loading-dimension cards and filter-aware
clustered horizontal bar small multiples. Each dimension repeats the loading
axis from 0 to 1 while sharing one vertical set of question labels. Bar colors
reuse the Correlation Low, Medium, High, and Very high strength bands. Sort
the shared question axis high to low using MR1 loading only; do not combine
loading values across dimensions for ordering. Give every bar a high-contrast
outline and every two-decimal value label a contrasting outline for
readability. Treat labels as working hypotheses and never interpret matching
factor numbers across cuts as proof of equivalent constructs or measurement
invariance.
