# Interactive survey report contract

Every successful `analyze-survey` run must produce an interactive HTML report
in this format. This contract is required, not an optional example.

The exact golden example is:

```text
references/skills/analyze-survey/golden-report.html
```

Its SHA-256 at adoption, calculated from canonical LF-normalized bytes, is
`c606cd34c4d4e583f76532431ed82c6c64ccb4bf06a8514ab48371780b02428c`.
Generated reports must match its static HTML shell exactly. The only intended
substitution is the JSON value assigned to `const D`, which must come from the
current analysis.

## AI-generated People Science summaries

- Begin every tab with a compact People Science perspective card.
- Require six summaries: Scores change, Relationships, Alerts, Factors,
  Attrition analysis, and Downloads.
- Each summary must contain a headline, observed evidence, professional
  interpretation, recommended next step, caveat, and published-source links
  when relevant.
- Generate narratives from `people-science-summary-context.json`, never raw
  respondent rows. Conform to `people-science-summaries.schema.json`.
- Use `interpret-analysis` guardrails and
  `people-science-knowledge-vault` source priority. Do not present correlation,
  factors, alerts, or attrition associations as causal.
- Recalculate the summary whenever the report attribute or value changes.
  Derive the filtered headline, observation, interpretation, recommendation,
  caveat, and references from the same aggregate source currently rendered by
  that tab. Authored segment narratives take precedence.
- For tabs without filter-specific analysis, update the scope statement and
  explicitly say that the evidence remains company-wide or unavailable.
- Select three public references for each rendered summary by matching key
  terms across its current headline, observation, interpretation,
  recommendation, and caveat against
  `people-science-source-index.json`. Prefer specific analytical and item-theme
  matches; use the tab defaults only to fill unmatched positions.
- If summaries have not been generated, show an honest unavailable state
  rather than invented or deterministic text labeled as AI-generated.

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
- Cluster questions with deterministic average-linkage hierarchical clustering
  using positive-correlation distance (`1 - r`).
- Recommend the cluster count with the highest average silhouette score among
  3 through 15 clusters, capped below the number of questions. Treat ties as a
  reason to prefer the smaller cluster count.
- Show the recommendation in a short blurb above the matrix.
- Provide every cluster-count option from 3 through 10. If the recommendation
  is greater than 10, extend the dropdown through the recommended count.
- Default the dropdown to the recommendation. Reorder both axes by cluster and
  show labeled cluster boundaries without replacing relationship-strength
  colors.
- Treat clusters as exploratory groupings, not validated survey constructs.
- Keep the legend and summary compact, hide empty highlight/detail regions, and
  reveal relationship details only after a cell is selected.
- Clicking a cell shows `r`, p-value, N, and significance status.
- State how many unique relationships are significant and nonsignificant.
- Emphasize practical magnitude when large N makes most results significant.
- Save segment matrices only where there are at least 30 response rows.

### Alerts

- Present manager-defined teams as a triage table with Critical, Watch,
  Improving, Stable, and Suppressed summary counts.
- Calculate each team's composite-score change, Welch significance, and
  company-adjusted change across exactly two cycles.
- Classify **Critical** when company-adjusted change is at most -3 points,
  p-value is below .05, and at least 25% of items (minimum 3) decline.
- Classify **Watch** when company-adjusted change is at most -2 points or raw
  change is at most -3 points with at least 3 declining items.
- Classify **Improving** when company-adjusted change is at least 3 points and
  p-value is below .05. Treat remaining eligible teams as Stable.
- Show prior/current score, raw and company-adjusted change, both sample sizes,
  number of declining items, and significance status.
- Add filters for severity, minimum adjusted decline, minimum declining items,
  team search, and significant-only results.
- Allow sorting by severity, adjusted decline, raw change, or declining-item
  count.
- Expand each team to show its five largest item declines with old score, new
  score, and delta.
- Require at least 20 responses in both compared cycles for every team alert,
  including report-filtered team intersections. Suppress every smaller group
  and state the threshold.
- Explain the classification rules in a compact disclosure. Describe alerts as
  screening signals, not causal findings.

### Factors

- Re-estimate the rotated factor loadings whenever the report attribute or
  value changes, using the company solution's factor count and the same
  extraction method and rotation.
- Require at least the greater of 100 complete responses or five complete
  responses per survey item. Show an explicit suppression or estimation
  failure reason when a cut is not eligible.
- Show the selected cut, complete-response N, factor count, rotation, leading
  item loadings, and clustered horizontal loading bars. Use one small-multiple
  panel per loading dimension, repeat the horizontal loading axis in every
  panel, and show the shared vertical question labels only once.
- Plot loading magnitudes on a positive `0` to `1` axis. Apply the same
  strength bands and colors as Relationships: Low (`< .30`), Medium
  (`.30-.49`), High (`.50-.69`), and Very high (`>= .70`).
- Sort the shared question axis from high to low by each item's strongest
  loading across the displayed dimensions. Give every bar a high-contrast outline and
  every two-decimal loading label a contrasting outline for readability.
- Explain that factor labels are working hypotheses, factor numbers can rotate
  or reorder across cuts, and filtered solutions do not establish measurement
  invariance.

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
