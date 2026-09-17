---
name: interpret-analysis
description: "Interpret People Science survey analysis outputs from vivaglint codebooks. Use when the user has an analysis-manifest.json, descriptives, correlations, factor analysis, cycle comparisons, by-attribute analysis, or attrition outputs and wants findings, caveats, hypotheses, or next analysis questions."
allowed-tools: Read, Glob, Grep
---

# Interpret Analysis

Turn People Science analysis outputs into clear findings, caveats, and recommended next steps.

## Use when

Use this skill when the user asks:

- interpret these survey results
- what do these codebooks mean?
- summarize the important findings
- identify the strongest themes
- explain correlations, factors, cycle changes, segments, or attrition patterns

## Required grounding

Before interpreting, inspect references in this order:

1. `references/`
2. `../../references/general/`

Then load:

- `analysis-manifest.json`
- `../../references/general/codebook-catalog.md`
- `../../references/general/interpretation-guardrails.md`
- `../../references/general/privacy-and-minimum-n.md`

## Interpretation process

1. Start with QA status. If no QA exists, perform a lightweight readiness check or recommend `analysis-qa`.
2. Identify the strongest descriptive patterns.
3. Look for convergence across codebooks:
   - descriptive item strength/weakness
   - response distribution shape
   - correlated clusters
   - factor structure
   - cycle movement
   - segment differences
   - attrition associations
4. Separate what is observed from what is inferred.
5. Name caveats and missing context.
6. Recommend follow-up analyses or stakeholder questions only when they would change action.

## Output format

```markdown
## People Science Interpretation

### Executive takeaways
1.
2.
3.

### Evidence pattern
| Pattern | Supporting outputs | Caveat |
|---|---|---|

### What not to over-interpret
1.

### Recommended follow-up
1.
```

## Guardrails

- Do not overstate causality from correlations or attrition associations.
- Do not name small groups or expose identifiable slices.
- Do not create manager-facing action plans unless requested.
- Do not substitute overall averages for missing benchmarks without saying so.
- Do not label factors as definitive constructs without item-level support.
