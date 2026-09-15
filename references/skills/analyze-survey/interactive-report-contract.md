# Interactive survey report contract

Every successful `analyze-survey` run must produce an interactive HTML report
in this format. This contract is required, not an optional example.

The exact golden example is:

```text
references/skills/analyze-survey/golden-report.html
```

Its SHA-256 at adoption is
`5d75c898851b98ea487cddd7dcf65df55acdd15a04e8af28c4ceffb0e8d7d011`.
Generated reports must match its static HTML shell exactly. The only intended
substitution is the JSON value assigned to `const D`, which must come from the
current analysis.

The deterministic implementation is
`scripts/build_interactive_report.py`. The analysis runner invokes it
automatically after repeatability passes. Do not rely on an agent to recreate
the dashboard from prose or maintain a second handwritten template.

## Required package

Create:

```text
<analysis-name>-report.html
<analysis-name>-share.zip
```

The ZIP must contain:

```text
OPEN_REPORT.html
SHARING_README.txt
analysis-manifest.json
completed aggregate CSV/JSON artifacts
```

`OPEN_REPORT.html` is the report renamed as the obvious entry point. Exclude
raw respondent data, employee-property files, comments, and repeatability
staging data from the ZIP.

## Visual contract

- Load and follow `references/design/glint-ui-system.md`, which points to the
  published `glint-ui-system` skill and canonical upstream reference.
- Force the light Glint report theme; do not follow operating-system dark mode.
- Use `#FAFAFA` for the canvas, white cards, `#335CCC` as the primary Glint
  blue, `#E5EEFF` for blue tint, Glint status colors, and the approved
  favorable/unfavorable treatments.
- Use Segoe UI typography, approved Glint radii, subtle
  borders and shadows, accessible focus states, and responsive layouts.
- Do not substitute a generic dashboard theme.

## Required navigation

Keep this tab order and naming:

1. **Scores change**
2. **Relationships**
3. **Alerts**
4. **Factors**
5. **Attrition analysis**
6. **Downloads**

If an analysis cannot run, keep its tab and explain exactly which input is
missing. Never remove the tab or fabricate data.

## Shared report filter

Place one report-level attribute/value filter above the tabs.

- Apply it to Scores change, Relationships, and Alerts.
- Treat it as a parent filter. Alerts must calculate their displayed
  dimensions within the selected segment.
- Use saved aggregate values in the browser. Do not embed or recalculate from
  respondent-level rows.
- Suppress unavailable intersections explicitly instead of silently reverting
  to company results.
- Preserve categorical attributes as categories. For genuinely numeric
  attributes with more than 10 distinct values, create about five
  non-overlapping, clearly labeled buckets.

## Tab behavior

### Scores change

- Follow `scores-change-format.png`.
- Let the user select old and new cycles when more than two are available.
- Add a **Respondent population** sub-heading with **All respondents** and
  **Repeat respondents** options.
- Define repeat respondents as employees represented in both selected cycles.
  Precompute these matched populations locally; do not derive them from
  aggregate counts in the browser.
- Use grouped cycle headers with Mean, Stddev, and n subcolumns.
- Show a P-Value column with a visible significance indicator.
- Show Score Difference (New - Old) with a proportional horizontal data bar
  and the signed numeric difference.
- Keep questions in survey order and use alternating row shading.
- Apply the shared report filter only when both cycles meet minimum N.

### Relationships

- Run the full Pearson correlation analysis and show the complete item-by-item
  matrix.
- Classify absolute relationship strength as Low (`|r| < .30`), Medium
  (`.30-.49`), High (`.50-.69`), or Very high (`>= .70`) and give each band a
  distinct, labeled matrix color.
- Include a control to turn strength colors on or off without changing the
  displayed values.
- Include a minimum-strength filter for All, Medium or higher, High or higher,
  and Very high only.
- Include a control to show or hide statistical-significance markers.
- Keep significance markers off by default to reduce visual noise.
- Let users add and individually remove multiple highlighted questions. Dim
  unrelated cells and emphasize selected row/column headers and cells.
- Show full question names on both axes. Use compact regular-weight text, with
  vertical column labels and horizontal row labels.
- Keep the legend and summary compact, hide empty highlight/detail regions, and
  reveal relationship details only after a cell is selected.
- Clicking a cell shows `r`, p-value, N, and significance status.
- State how many unique relationships are significant and nonsignificant.
- Emphasize practical magnitude when large N makes most results significant.
- Save segment matrices only where there are at least 30 response rows.

### Alerts

- Rank manager-defined teams by average item-score decrease across two cycles.
- Show prior/current score, delta, both sample sizes, number of declining
  items, and the largest item decline.
- Require at least 10 responses per cycle for company-wide team alerts.
- For report-filtered team intersections, require at least 5 matching
  responses per cycle and state that threshold.
- Describe alerts as screening signals, not causal or statistical findings.

### Factors

- Show the company-wide rotated factor solution and leading item loadings.
- Do not automatically substitute segment factor models. Explain that
  stability and measurement-invariance review is required first.

### Attrition analysis

- When valid outcome and date inputs exist, show overall, tenure, and
  organization views first.
- Otherwise show **Not run** and list the missing inputs.
- Never generate synthetic attrition outcomes.

### Downloads

Link the manifest and every completed aggregate artifact, including derived
correlation matrices, score-change, and alert outputs when available.

## Privacy and performance

- Default minimum displayed group size is 5.
- Keep respondent-level data local and outside the shareable package.
- Precompute score, distribution, change, relationship, and alert
  aggregates. Browser interactions must select saved values rather than rerun
  analysis over employee rows.
- Validate all download links and JavaScript syntax before sharing.
- Require the standard two-run repeatability check before generating a
  user-facing report.

## Sharing guidance

The default shareable artifact is the ZIP. Recipients extract it and open
`OPEN_REPORT.html`. A normal SharePoint document-library URL may download or
sandbox HTML and block JavaScript. For browser-only hosting, use an approved
static web host or an SPFx implementation.
