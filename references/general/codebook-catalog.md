# Codebook catalog

This catalog maps analysis jobs to `vivaglint` functions and downstream interpretation use.

| Codebook | `vivaglint` function | Primary question | Output artifact |
|---|---|---|---|
| Descriptives | `summarize_survey` | What are the central patterns by survey item? | `descriptives.csv` |
| Response distribution | `get_response_dist` | How are responses distributed across scale points? | `response_distribution.csv` |
| Correlations | `get_correlations` | Which survey items move together? | `correlations.csv` |
| Factor analysis | `extract_survey_factors` | What latent constructs may organize the item set? | `factor_analysis_summary.csv` |
| Cycle comparison | `compare_cycles` | What changed across survey cycles? | `cycle_comparisons.csv` |
| By-attribute analysis | `analyze_by_attributes` | Where do patterns differ across groups? | `by_attribute.csv` |
| Attrition analysis | `analyze_attrition` | Which responses are associated with later attrition? | `attrition.csv` |

## Export units

The runner converts score statistics at the CSV export boundary; statistical
models still use the original response scale. In `descriptives.csv`,
`by_attribute.csv`, and `cycle_comparisons.csv`, `mean` is the unrounded
0-100 score and `sd` is the sample standard deviation in score points.
For a native scale from 1 to `scale_points`, the conversions are
`(mean - 1) * 100 / (scale_points - 1)` and
`sd * 100 / (scale_points - 1)`. Existing `glint_score` values remain the
rounded 0-100 scores returned by `vivaglint`; they are not converted again.

Cycle `change_from_previous` is a difference in 0-100 score points.
`pct_change_from_previous` is recalculated relative to the previous unrounded
0-100 mean; it is blank when that mean is zero or unavailable.
`glint_score_change_from_previous` remains the difference between rounded
Glint scores.

Response-distribution column suffixes identify equivalent 0-100 response
values: a five-point survey uses `count_0`, `count_25`, `count_50`, `count_75`,
`count_100` and matching `pct_` columns. Non-integer labels are rounded to six
decimal places. Counts and percentages are unchanged.

Correlations, factor loadings, communalities, variance percentages, p-values,
counts, favorability percentages, attrition rates, and attrition multipliers
retain their native units. The manifest's `export_profile` declares the
exported score units separately from `input_profile.scale_points`, which
continues to describe the model's input scale. Older manifests without
`export_profile` may have native-scale means and standard deviations; do not
assume their units from the report alone.

## Analysis selection rules

- Always run descriptives first. Most interpretation depends on item-level response patterns.
- Run response distribution when favorability or polarization matters.
- Run correlations when prioritizing drivers, redundancy, or potential themes.
- Run factor analysis only when there are enough respondents and items to support stable extraction.
- Run cycle comparison only when ordered cycle inputs are provided.
- Run by-attribute analysis only when attributes are present and minimum group-size suppression is configured.
- Run attrition only when attrition data is present and the termination date column is explicitly named.

## Default guardrails

- Minimum group size should default to 5 or higher.
- Do not interpret small segments as meaningful when suppression removes most rows.
- Do not treat correlation as causation.
- Do not treat factor labels as ground truth; they are hypotheses.
- Do not compare cycles without checking whether item wording, scale, population, or survey program changed.
- Do not create manager recommendations from attrition associations alone.
