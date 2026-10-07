# Interactive survey report contract

Every successful `analyze-survey` run must produce an interactive HTML report
in this format. This contract is required, not an optional example.

The exact golden example is:

```text
golden-report.html
```

Its SHA-256 at adoption, calculated from canonical LF-normalized bytes, is
`c908bfc55f446299f39f7a8586e18a0dd56f8b4eb12e6b4e1472ef52753a5906`.
Generated reports in `required` mode must match its static HTML shell exactly.
The intended substitution is the JSON value assigned to `const D`. In `off`
mode, the seven empty AI summary containers are also removed from the generated
report.

## AI-generated People Science summary modes

The shared report builder supports three explicit modes:

- `off`: render no AI summary cards, ignore any stale summary file, and exclude
  that file from the share ZIP. This is the default for `analyze-survey`.
- `optional`: render summaries only when a valid summary file exists; otherwise
  render no summary cards.
- `required`: fail report generation unless a valid summary file exists. This
  is required by `analyze-survey-ai-preview`.

Always create `people-science-summary-context.json` from aggregate results so a
completed analysis can be reused by the preview workflow without rerunning the
codebooks. When summaries are enabled:

- Require six summary objects for schema stability: Scores change,
  Correlation (`relationships`), Attrition alerts (`alerts`), Factors,
  Attrition analysis, and Downloads. Render only summaries for tabs present in
  the report.
- Each summary must contain a headline, observed evidence, professional
  interpretation, recommended next step, caveat, and published-source links.
- Generate narratives from `people-science-summary-context.json`, never raw
  respondent rows, and conform to `people-science-summaries.schema.json`.
- Use `interpret-analysis` guardrails and
  `people-science-knowledge-vault` source priority. Do not present correlation,
  factors, alerts, or attrition associations as causal.
- Recalculate summaries when the report attribute or value changes. Authored
  segment narratives take precedence over live aggregate summaries.
- Keep every tab-level AI summary container hidden. The current-survey summary
  remains the primary landing-page narrative, and each tab uses its concise
  static introduction for interpretation guidance.
- Select three public references for each rendered summary using
  `people-science-source-index.json`.

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
- Adapt the visual hierarchy of the Glint Labs Figma Home frame: a rounded
  masthead, editorial report hero, pill navigation, generous whitespace,
  resource-style cards and downloads, and a high-contrast closing section.
  Preserve the Glint UI system as the token and accessibility authority.
- Use the hero for a deterministic **current survey summary**, not generic
  marketing copy. It must update with the shared report filter and show:
  latest privacy-eligible cycle and response count, average item score, the
  three high-scoring items, the three low-scoring items, privacy-safe aggregate
  comment themes for each item when available, and average/leading movement
  from the prior cycle when available.
- Prefer score-ranked items with sufficient linked comment coverage when at
  least six are available. Otherwise retain the full score ranking and state
  when an item has no privacy-eligible linked themes. Describe all results as
  relative positions within the current survey. Do not imply an external
  benchmark, root cause, or causal interpretation. Keep the summary available
  in summary mode `off`.
- Derive comment themes locally using deterministic keyword coding. Count a
  theme at most once per comment, require at least five comments and roughly
  2% recurrence in the applicable item/cut, and show no more than three theme
  labels per item. Raw comments must never enter HTML, AI prompts or context,
  the share ZIP, or chat.
- Force the light Glint report theme; do not follow operating-system dark mode.
- Use a white canvas, `#FAFAFA` supporting surfaces, `#335CCC` as the primary
  Glint blue, `#E5EEFF` for blue tint, Glint status colors, and the approved
  favorable/unfavorable treatments.
- Use Segoe UI typography, approved Glint radii, subtle
  borders and shadows, accessible focus states, and responsive layouts.
- Keep analytical tables and charts dense enough for comparison; apply the
  editorial treatment around them rather than weakening statistical encodings.
- Do not substitute a generic dashboard theme.
- Give every primary visual (Scores change table, Correlation matrix, Alerts
  table, and the Factors chart/card group) a top-right toolbar with two icon buttons: export
  the visual's aggregated data as CSV, and copy the visual as an image to the
  clipboard (falling back to a PNG download when clipboard image write is
  unavailable). Toolbars must remain accessible (labeled, focus-visible) and
  must not alter the underlying data encodings.

## Required navigation

Keep this tab order and naming:

1. **Correlation**
2. **Factors**
3. **Attrition analysis** (only when attrition completes)
4. **Attrition alerts** (only when attrition completes)
5. **Scores change**
6. **Downloads**
7. **Methodology**

If attrition cannot run, omit both attrition tabs. Never fabricate attrition
data. For other analyses, keep the tab and explain why results are unavailable.

## Shared report filter

Place one report-level attribute/value filter above the tabs, plus a separate
**Survey cycle** selector for tabs whose underlying data is computed per
survey cycle.

- Apply the attribute/value filter to Scores change, Correlation, Attrition
  analysis, and Attrition alerts.
- Apply the separate Survey cycle selector to Correlation and Factors. It
  defaults to the most recently completed cycle.
- Exclude `survey_cycle_title` from the generic report-attribute dropdown;
  the dedicated Survey cycle selector is the only control for cycle scoping.
- Treat the report attribute and Survey cycle selectors as additive: both
  controls stay independently enabled, and selecting both narrows Correlation
  and Factors to the precomputed attribute-value-by-cycle cross-cut. Never
  disable one control because the other has a value. State this additive
  behavior in on-page help text next to the filters.
- Scores change, Attrition analysis, Attrition alerts, and Downloads do not
  wire into the Survey cycle selector: Scores change and Attrition alerts
  already manage explicit cycle-pair comparisons, and Attrition analysis is
  anchored to one fixed baseline cycle by construction.
- Treat it as a parent filter. Attrition alerts must select their displayed
  dimensions within the selected segment.
- Use saved aggregate values in the browser. Do not embed or recalculate from
  respondent-level rows.
- Suppress unavailable intersections explicitly instead of silently reverting
  to company results.
- Preserve categorical attributes as categories. For genuinely numeric
  attributes with more than 10 distinct values, create about five
  non-overlapping, clearly labeled buckets.

## Tab behavior

Begin every available tab with one concise narrative paragraph that explains
what the analysis means and how to use it. It should read like a friendly
section description rather than a callout card. Avoid statistical jargon where
a familiar phrase is sufficient and preserve the analysis guardrails:
comparisons are descriptive, correlation is non-causal, factors are
exploratory, and attrition results are not individual predictions.

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

### Correlation

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
- Explain that a cluster contains items with similar response patterns. Use
  clusters to review content overlap and potential survey shortening, but do
  not remove items without preserving content coverage and checking reliability
  and stability across groups and cycles.
- Keep the legend and summary compact, hide empty highlight/detail regions, and
  reveal relationship details only after a cell is selected.
- Clicking a cell shows `r`, p-value, N, and significance status.
- State how many unique relationships are significant and nonsignificant.
- Emphasize practical magnitude when large N makes most results significant.
- Save segment matrices only where there are at least 30 response rows.

### Attrition alerts

- For each report attribute and outcome window, calculate each item's median
  attrition multiplier across privacy-eligible attribute values.
- Rank items by that median and retain the top five per attribute.
- Show Attribute, Group, Attrition item, Group score, Company score, Gap,
  Attrition multiplier, and N.
- At company level, show the lowest-scoring privacy-eligible group for each top
  item and attribute. Sort the table by the largest negative score gap first.
- When an attribute/value filter is selected, show that group's results for the
  selected attribute's top five items.
- Exclude an attrition row when either its favorable or unfavorable category N
  is below the configured minimum. Continue applying normal report minimum-N
  suppression to the displayed group score.
- Provide 90-, 180-, and 365-day controls when those outcome windows exist.
  Default to 180 days when it has eligible alerts; otherwise default to the
  first outcome window with eligible alerts.
- Describe alerts as aggregate screening signals. Do not present multipliers as
  individual predictions or group score gaps as causal explanations.

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
  strength bands and colors as Correlation: Low (`< .30`), Medium
  (`.30-.49`), High (`.50-.69`), and Very high (`>= .70`).
- Sort the shared question axis from high to low by each item's MR1 loading
  only; do not combine loading values across dimensions for sorting. Give
  every bar a high-contrast outline and
  every two-decimal loading label a contrasting outline for readability.
- Explain that factor labels are working hypotheses, factor numbers can rotate
  or reorder across cuts, and filtered solutions do not establish measurement
  invariance.
- Explain that loadings represent item-to-dimension alignment from 0 to 1. A
  .70 loading is stronger than .60, but the .10 difference is not inherently
  meaningful without the broader loading pattern, item content, and
  cross-loadings.

### Attrition analysis

- When valid outcome and date inputs exist, show overall, tenure, and
  organization views first.
- Rank eligible items by multiplier and display each item text with a
  horizontal bar and labeled multiplier. Mark 1.00x as the reference point.
- Do not display favorable or unfavorable counts or percentages in the report.
  Retain them only in the privacy-safe aggregate artifact for auditability and
  suppression enforcement.
- If attrition cannot run, omit both Attrition analysis and Attrition alerts.
- Never generate synthetic attrition outcomes.
- Calculate a two-sided Fisher exact test from the favorable and unfavorable
  exit counts. Visually flag multipliers with `p < .05`, show the p-value, and
  retain the non-causal screening language.

### Downloads

Link the manifest and every completed aggregate artifact, including derived
correlation matrices, score-change, and alert outputs when available.

### Methodology

- Always include a final **Methodology** tab after Downloads. It is reference
  documentation for analysts, not a filter-reactive data tab.
- Begin the tab with one short sentence explaining that it documents how the
  report's analyses work so analysts can interpret and explain results.
- Render one subsection for every analysis present in the report: Scores
  change, Correlation, Factors, Attrition analysis, and Attrition alerts.
  Omit the two attrition methodology subsections when attrition tabs are not
  present in that report instance.
- Each subsection must contain exactly these three labeled parts:
  **Method**, **Example interpretation**, and **Example action**.
- Keep the prose concise but analyst-depth: a few sentences for Method and one
  realistic sentence each for the interpretation and action example.
- Ground every Method description in the real implementation from
  `scripts/run_vivaglint_analysis.py` and
  `scripts/build_interactive_report.py`, including the actual thresholds,
  formulas, suppression rules, and defaults used in the shipped report.
- For Scores change, document the stored mean/stddev/n values, client-side
  p-value calculation, difference bars, repeat-respondent logic based on
  matched employee IDs across cycles, and minimum-N suppression.
- For Correlation, document Pearson `r`, the strength bands, the optional
  significance markers at `p < .05`, deterministic average-linkage
  hierarchical clustering over positive-correlation distance (`1 - r`), the
  silhouette-based recommendation search from 3 through 15 clusters capped
  below the item count, and the exploratory nature of clusters.
- For Factors, document the reuse of the company factor count, varimax
  re-estimation for each eligible cut, the minimum complete-response rule
  (greater of 100 or 5 per item), communality/loadings on the 0-1 display
  scale, MR1-based question sorting, and the cautions about factor labels and
  cross-cut factor-number matching.
- For Attrition analysis, document the unfavorable-to-favorable attrition-rate
  multiplier, the standard 90/180/365-day windows and 180-day default when
  present, the 1.00x reference line, minimum-category suppression, the
  two-sided Fisher exact test at `p < .05`, and the non-causal, non-predictive
  framing.
- For Attrition alerts, document ranking by the median privacy-eligible
  attrition multiplier across groups per attribute and window, retention of the
  top five items per attribute, the company view's lowest-scoring group logic,
  the filtered view's selected-group logic, and the same non-causal framing.
- Present each subsection as a numbered card with a small-caps label above
  each of the three parts (not inline bold text run into the paragraph), and
  render **Example interpretation** and **Example action** as distinct tinted
  callouts so they are visually separable from **Method**. Render inline
  formulas and code-like expressions with `<code>` styling rather than raw
  backticks. Precede the subsections with a compact jump-to-section nav, kept
  in sync with whichever subsections are present in that report instance.

## Privacy and performance

- Default minimum displayed group size is 5.
- Keep respondent-level data local and outside the shareable package.
- Exclude identifier-like employee, respondent, manager, team, client, UUID,
  and GUID columns from report filters and aggregate downloads.
- Precompute score, distribution, change, correlation, and attrition-alert
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
