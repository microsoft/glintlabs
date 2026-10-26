# People Science interpretation

Turn People Science analysis outputs into clear findings, caveats, and recommended next steps.
This is the interpretation workflow owned by `analyze-survey`, for both
newly generated analyses and existing manifests or codebooks.

## Required grounding

Before interpreting, inspect references in this order:

1. `README.md` in this folder and any relevant interpretation examples or notes
2. The shared documents listed below

Paths below are relative to this document; the manifest and its artifacts
come from the user's output directory:

- `analysis-manifest.json`
- relevant artifacts listed in the manifest
- `../../../references/general/codebook-catalog.md`
- `../../../references/general/interpretation-guardrails.md`
- `../../../references/general/privacy-and-minimum-n.md`

## Interpretation process

1. Establish QA readiness before presenting findings. If no QA exists, use
   `analysis-qa` to inspect the manifest and relevant artifacts. Only after QA
   passes (Ready or Use with caveats), interpret supported outputs and carry
   forward all caveats. Stop when repeatability fails, QA identifies a hard
   stop, or readiness cannot be established; report the blockers instead.
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
7. After delivering findings, follow `../SKILL.md`'s post-analysis adaptation
   step: ask the exact open-text "Did I miss anything?" prompt and let the user
   add data, request attribute cuts, or correct mappings. Amend the current
   analysis rather than restarting intake; preserve QA and privacy gates.

## Detailed questions and published guidance

When a user asks a detailed People Science question, requests research or
guidance, or wants to understand the concepts behind a result, load and follow
`../../people-science-knowledge-vault/SKILL.md`. Examples include what
leadership correlations might mean, how to understand exploratory factors,
or what published guidance says about belonging and retention.

Use the vault's complete retrieval process, source priorities, clarification
rules, and evidence contract rather than duplicating them here. For a purely
conceptual question, go directly to that workflow without requiring a
manifest, survey data, QA, or a new analysis. For questions about the user's
actual results, retain the QA gate above and use the vault to supplement,
not replace, the inspected aggregate evidence.

Keep observed survey findings, cited published guidance, and hypotheses
clearly separate. Cite retrieved article bodies beside the claims they
support; do not treat published guidance as proof of the cause of a local
pattern. If source retrieval fails, disclose the gap rather than inventing
support. Use generic topic terms for external retrieval, never employee rows,
raw comments, identifiable groups, or customer-identifiable information.

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
- Do not create manager-facing action plans in this workflow. Handle explicit
  requests for those plans as a separate task.
- Do not substitute overall averages for missing benchmarks without saying so.
- Do not label factors as definitive constructs without item-level support.
