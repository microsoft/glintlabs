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

The runner prints durable progress updates with an ASCII bar, percentage,
elapsed time, and current phase. Keep progress visible during both analysis
passes and the interactive-report build, especially relationship clustering
and alert aggregation, which can take several minutes on large exports.

The first report build also writes
`people-science-summary-context.json`, a compact aggregate-only input for AI
interpretation. Use `interpret-analysis` for statistical guardrails and
`people-science-knowledge-vault` for externally published knowledge grounding.
Write all six tab narratives to `people-science-summaries.json` using
`people-science-summaries.schema.json`, then rerun the report builder. The
summary file and context are safe aggregate artifacts and are included in the
share ZIP.

## Privacy

- Minimum displayed group size defaults to 5.
- Raw survey and attribute files stay outside the share ZIP.
- Names, email addresses, comments, phone numbers, and addresses are never
  automatically selected as report attributes.
- Browser interactions use embedded aggregate data, not respondent rows.

## Report

The required behavior and packaging are defined in
`interactive-report-contract.md`.

Each tab begins with a concise AI-generated People Science perspective. It
separates observation from interpretation, recommends a next step, states a
caveat, and links relevant published evidence. Whenever the report attribute
or value changes, the summary immediately recalculates its headline and
observation from that filter's aggregate results. Authored segment narratives
take precedence. Tabs without filter-specific analysis state that limitation
instead of presenting company-wide evidence as filtered evidence.

`people-science-source-index.json` is the fast retrieval layer for report
grounding. It contains reviewed public sources, concept terms, and three
defaults per tab. The browser ranks sources against key terms in the current
headline and observation, so filtered findings about topics such as belonging,
action taking, work-life, confidentiality, or attrition receive different
references. Every rendered summary shows three sources.

`golden-report.html` is the user-approved canonical HTML example. The report
builder reads that file directly and replaces only the `const D=...` aggregate
data payload. Do not restyle, restructure, rename, or independently recreate
the report shell. The aggregate values embedded in the golden file are example
values and must never be reused for another analysis.

Before changing the golden report or any report colors, load
`references/design/glint-ui-system.md`. It points to the canonical
`glint-ui-system` skill and records the required Glint/Fluent design rules.

The golden report intentionally excludes Overview, Item results, and Heatmap.
Its six tabs are Scores change, Relationships, Alerts, Factors, Attrition
analysis, and Downloads.

The Scores change table layout is grounded in `scores-change-format.png`.
Preserve its grouped old/new cycle headers, Mean/Stddev/n columns, p-value
indicator, alternating rows, and proportional score-difference bars.
Include a Respondent population control with All respondents and Repeat
respondents. Repeat-only values must be precomputed from employee IDs present
in both selected cycles and remain subject to minimum-N suppression.

The Relationships matrix classifies absolute Pearson `r` as Low (`< .30`),
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

The Alerts tab is a triage table. Preserve severity summary counts,
company-adjusted change, Welch significance, compact filters and sorting, and
expandable top-five item declines. Severity rules and minimum-N behavior are
defined in `interactive-report-contract.md`; do not replace them with visual
judgment or causal language. Every alert group must have at least 20 responses
in both compared cycles, including filtered intersections.

The Factors tab re-estimates item loadings for each eligible report
attribute/value cut with the same factor count and varimax rotation as the
company solution. A cut requires at least the greater of 100 complete responses
or five complete responses per item; otherwise the report displays the
suppression reason. The tab includes loading-dimension cards and a filter-aware
line plot of every item loading. Treat labels as working hypotheses and never
interpret matching factor numbers across cuts as proof of equivalent
constructs or measurement invariance.
