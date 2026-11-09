# Advanced analysis references

| File | Responsibility |
| --- | --- |
| `modeling-workflow.md` | Expert collaboration, approval, source-bound config, engine execution, tuning and data amendments |
| `interpretation.md` | Model QA and the existing Knowledge Vault evidence handoff |
| `interactive-report-contract.md` | Advanced report, score units, privacy and packaging |
| `report.html` | Advanced-only Glint report shell; never contains respondent rows |
| `engine.json` | Exact advanced-engine revision and implementation hash |

Use the closed schemas in `schemas/advanced-analysis-config.schema.json`,
`advanced-analysis-manifest.schema.json`, and
`advanced-interpretation.schema.json`. These are distinct from basic survey
contracts and do not alter the basic runner, report, or default narrative mode.
First-party modeling code lives in `vivaglint.modeling`, not in the report builder.

The engine extension must be reviewed separately. While its PR is open, the
advanced dependency is a review-branch commit, not a released engine version.
Do not describe this as production-ready or install it into the basic runtime.
