# eve-people-science

People Science analytics plugin suite for Viva Glint survey data.

## What it does

This plugin provides a set of focused skills that share a common analysis contract:

1. `analyze-survey` accepts CSV or Excel survey exports directly, runs a
   standard set of `vivaglint` codebooks, writes an `analysis-manifest.json`,
   and packages the required interactive HTML report and privacy-safe ZIP
   without AI-generated summaries.
2. `analyze-survey-ai-preview` adds staged, evidence-grounded People Science
   summaries to the same shared report pipeline.
3. `analysis-qa` reviews output validity, privacy thresholds, and interpretation readiness.
4. `interpret-analysis` turns codebook outputs into People Science findings and caveats.
5. `people-science-knowledge-vault` finds and synthesizes externally published People Science knowledge using a strict two-tier source hierarchy.

The plugin deliberately does not duplicate the `vivaglint` analysis package. It calls a pinned package version and treats the output manifest as the stable interface between execution and interpretation.

## Prerequisites

- Python 3.10 or later for local survey-analysis scripts.
- `vivaglint[all]==0.1.1` for the `analyze-survey` workflow.
- Access to the relevant Viva Glint survey exports or analysis outputs for the
  workflow being used.

## Install

Add the EVE marketplace, then install the plugin:

```text
/plugin marketplace add https://github.com/employee-experience/EVE-Plugin-Marketplace.git
/plugin install eve-people-science@eve-plugin-marketplace
```

## Usage

Ask for the People Science job directly; the host routes the request to the
appropriate skill. Examples:

- "Run the standard People Science analysis on this Viva Glint export."
- "Check whether this analysis manifest is safe to interpret."
- "Interpret the strongest findings and caveats in these survey results."
- "What published People Science guidance exists on this topic?"

For example prompts users can type into the native **Copilot in Viva Glint**
sidecar (the in-product chat pane on Glint dashboards/reports, not this
plugin), see `references/general/recommended-prompts.md`.

## Reference priority

Each skill has a first-priority reference collection at:

```text
skills/<skill-name>/references/
```

Shared, second-priority context lives at:

```text
references/general/
```

When a skill runs, inspect its colocated `references/` folder first, then
inspect `references/general/`. Skill-specific references take precedence for
that skill unless they violate privacy, safety, or the manifest contract.

## Shared contract

All downstream skills should start with:

```text
analysis-manifest.json
```

The manifest records:

- input files and non-sensitive profiles
- `vivaglint` version and package source
- analyses requested, completed, skipped, or failed
- artifact paths
- warnings and privacy notes
- downstream interpretation readiness

Schema: `schemas/analysis-manifest.schema.json`

## Skills

| Skill | Use when |
|---|---|
| `analyze-survey` | The user has survey data and wants the standard analysis package run. |
| `analyze-survey-ai-preview` | The user explicitly wants the staged AI-summary report experience. |
| `analysis-qa` | The user needs to know whether outputs are valid and safe to interpret. |
| `interpret-analysis` | The user has output files/manifests and wants People Science interpretation. |
| `people-science-knowledge-vault` | The user wants externally shareable People Science articles or an evidence-backed synthesis of published guidance. |

### Knowledge vault status

`people-science-knowledge-vault` is an initial scaffold. It gives first priority to
all articles discoverable from the Microsoft Viva Blog category and second priority
only to records in the source workbook's `External` worksheet. Future work can add a
generated article catalog, automated refresh, topic aliases, and retrieval-quality
tests without changing this source hierarchy.

## Linked survey dataset

Survey-analysis workflows should begin by asking:

> Do you have your own survey data you would like to analyze? If not, I can use the linked Viva Glint workbook.

If the user does not provide another export, use this workbook, which is
checked directly into this repository so any user can access it without
additional permissions:

```text
Demo Viva Glint Dataset with Attributes - Exit survey research guided.xlsx
skills/analyze-survey/references/sample-data/Demo Viva Glint Dataset with Attributes - Exit survey research guided.xlsx
```

Use `Sheet1`, join `user_properties` by `user_id`, and use a 5-point scale.
This is the only registered sample source. Do not silently substitute bundled,
generated, or synthetic survey data.

## Analyze-survey report output

Every successful, repeatable survey analysis produces the standardized report
defined in:

```text
skills/analyze-survey/references/interactive-report-contract.md
```

The report uses the fixed Glint tab layout, shared attribute filtering,
precomputed privacy-safe aggregates, and a ZIP containing
`OPEN_REPORT.html`. Raw respondent and employee-property files are excluded
from the shareable package.
Base tabs are Scores change, Correlation, Factors, and Downloads; when
attrition completes, Attrition analysis and Attrition alerts are inserted
between Factors and Downloads.

## Analysis engine

Default package:

```bash
pip install "vivaglint[all]==0.1.1"
```

Development pin:

```bash
pip install "git+https://github.com/microsoft/vivaglint_py.git@761d847a8c8d38ff42c78b4501d761350c9fd03f#egg=vivaglint[all]"
```

## Local smoke test

```bash
python scripts/analyze_survey_export.py --survey-export C:\path\to\Viva-Glint-Dataset-with-Attributes.xlsx --output-dir outputs\sample-survey
```

## Privacy stance

Employee survey data is sensitive. This plugin should:

- process files locally unless the user explicitly chooses another route
- suppress small groups before interpretation
- avoid copying raw employee-level rows into narrative outputs
- surface caveats when benchmarks, comparison groups, or statistical power are missing
- require user confirmation before producing customer-facing artifacts
