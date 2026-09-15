# Interactive survey report contract

Every successful `analyze-survey` run must produce an interactive HTML report
in this format. This contract is required, not an optional example.

The exact golden example is:

```text
references/skills/analyze-survey/golden-report.html
```

Its SHA-256 at adoption is
`16e913831b72e0b3fa37fdbd261dc2fe665abc452969868f7ad41e0ec97782df`.
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

- Use the published Glint UI system.
- Force the light Glint report theme; do not follow operating-system dark mode.
- Use `#FAFAFA` for the canvas, white cards, `#335CCC` as the primary Glint
  blue, `#E5EEFF` for blue tint, Glint status colors, and the approved
  favorable/unfavorable treatments.
- Use Segoe UI/Aptos/Calibri typography, restrained 10-16 px radii, subtle
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

- Compare the two selected/available survey cycles item by item.
- Show prior score, current score, delta, and both sample sizes.
- Support largest absolute change, decrease, and increase sorting.
- Apply the shared report filter only when both cycles meet minimum N.

### Relationships

- Run the full Pearson correlation analysis and show the complete item-by-item
  matrix.
- Include magnitude threshold, significance, and focused-item filters.
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
