# Advanced analysis references

| File | Responsibility |
| --- | --- |
| `modeling-workflow.md` | Evidence-led decisions, default 1-8 SVD quality tables and recommendation/guidance, approval, source-bound execution and amendments |
| `interpretation.md` | SVD QA, automatic bounded Knowledge Vault retrieval and useful interpretation, evidence gaps and approval-language boundaries |
| `interactive-report-contract.md` | Inline chart semantics, optional HTML report, explicit decision/context notes, provisional pair leads, privacy and packaging |
| `report.html` | Advanced-only Glint report shell; never contains respondent rows |
| `engine.json` | Exact advanced-engine revision and implementation hash |

Use the closed schemas in `schemas/advanced-analysis-config.schema.json`,
`advanced-analysis-manifest.schema.json`, `advanced-interpretation.schema.json`,
and `advanced-item-candidates.schema.json`. These are distinct from basic survey
contracts and do not alter the basic runner, report, or default narrative mode.
First-party modeling code lives in `vivaglint.modeling`, not in the report builder.
This skill accepts only `task: svd`, an empty `models` list, and
`metric: reconstruction_rmse`. The shared engine's other capabilities are not
options in this skill. Only inspect, code, fit, interpret and review-items modes
are supported; component comparisons use separately approved fit configs.

The skill delivers charts and People Science interpretation inline in chat.
Runner delivery defaults to `chat`: retain aggregate/audit artifacts without
HTML or a ZIP. `--delivery report` is only for an explicitly requested export.

The engine extension must be reviewed separately. While its PR is open, the
advanced dependency is a review-branch commit, not a released engine version.
Do not describe this as production-ready or install it into the basic runtime.
