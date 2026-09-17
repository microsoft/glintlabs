---
name: analysis-qa
description: "Evaluate People Science analysis outputs for validity, privacy, and interpretation readiness. Use when the user has an analysis-manifest.json or vivaglint output files and needs to know whether results are safe and meaningful to interpret."
allowed-tools: Read, Glob, Grep
---

# Analysis QA

Assess whether People Science analysis outputs are valid, privacy-safe, and ready for interpretation.

## Use when

Use this skill when the user asks:

- is this analysis safe to interpret?
- check this analysis package
- QA these survey results
- review these codebook outputs
- can I use these outputs for manager guidance or customer readout?

## Inputs

Start from `analysis-manifest.json`. If missing, ask for the output folder and inspect available files.

Before scoring, inspect references in this order:

1. `references/`
2. `../../references/general/`

Useful artifacts:

- `descriptives.csv`
- `response_distribution.csv`
- `correlations.csv`
- `factor_analysis_summary.csv`
- `cycle_comparisons.csv`
- `by_attribute.csv`
- `attrition.csv`

## QA dimensions

| Dimension | Checks |
|---|---|
| Execution completeness | Required codebooks completed; failures/skips are explicit. |
| Input adequacy | Respondent count, question count, cycle availability, required files. |
| Privacy | Minimum-N suppression, small cells, sensitive combinations. |
| Statistical caution | Correlation vs causation, factor stability, attrition association caveats. |
| Comparison validity | Cycle comparability, same scale/item wording/population. |
| Interpretation readiness | Whether outputs support a reliable narrative. |

## Output format

Return:

```markdown
## Analysis QA

**Verdict:** Ready / Use with caveats / Not ready

### What passed
1.

### Issues to fix before interpretation
1.

### Caveats to carry into interpretation
1.

### Recommended next step
```

## Hard stops

Return "Not ready" when:

- raw output is missing and cannot be inspected
- group suppression is absent for manager-facing segment outputs
- attrition outputs create likely re-identification risk
- cycle comparisons use incompatible item wording or scale
- factor analysis is unstable but is central to the intended story
