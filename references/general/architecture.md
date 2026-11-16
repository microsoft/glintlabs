# Architecture: EVE People Science

## Design intent

Build a suite of focused People Science skills around a shared analysis contract rather than a single large skill.

The core separation is:

| Layer | Responsibility |
|---|---|
| `vivaglint` | Statistical analysis, data import helpers, codebook logic, package tests. |
| `eve-people-science` scripts | Thin orchestration, config parsing, artifact writing, manifest generation. |
| `analysis-manifest.json` | Stable contract between analysis execution and interpretation skills. |
| Skills | User-facing workflows: run, QA, and interpret. |
| Skill references | First-priority context in `skills/<skill-name>/references/`. |
| General references | Second-priority shared People Science context in `references/general/`. |

## Why not one giant skill

A single skill that owns all customer artifacts would be difficult to route,
test, and maintain. Survey execution, output QA, and interpretation share one
entry point, with detailed interpretation guidance kept in a colocated
reference:

1. `analyze-survey` produces outputs or accepts existing manifests and codebooks.
2. Its **Analysis QA** section determines whether outputs are safe to interpret
   and is the single source for readiness criteria, verdicts, and hard stops.
3. `analyze-survey` produces People Science findings using
   `skills/analyze-survey/references/interpretation.md` after readiness is
   established, carrying forward QA caveats.

QA-only and interpretation-only requests do not require new ingestion, codebook
execution, or report packaging. Standard reports remain free of embedded AI summaries;
`analyze-survey-ai-preview` remains the explicit opt-in for those summaries.

Each skill should know its job, the shared contract, and which references to load.

## Reference priority model

Every skill should load references in this order:

1. `skills/<skill-name>/references/`
2. `references/general/`

Skill-specific documents are the first place to inspect because they encode job-specific examples, runbooks, and interpretation patterns. General documents are optional shared context for the task, not a required second read every time.

If a skill-specific document conflicts with a general document, prefer the skill-specific instruction unless doing so would violate privacy, safety, or the shared analysis-manifest contract.

## Stable contract

The manifest is the backbone. It should be considered public within the plugin and versioned deliberately. Downstream skills should not inspect arbitrary runner internals.

Required manifest qualities:

- no raw employee-level rows
- artifact paths are relative to the output directory
- all failures and skips are explicit
- package version and recommended install are recorded
- privacy and interpretation warnings are surfaced
- readiness is separate from successful execution

## Versioning

Use pinned package dependencies for production or marketplace usage:

- preferred: `vivaglint[all]==0.1.1`
- development: git commit pin to `microsoft/vivaglint_py`
- avoid: unpinned `main`

When `vivaglint` changes output columns or analysis semantics, increment the manifest schema version and update downstream skills.
