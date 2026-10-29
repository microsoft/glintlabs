---
name: analyze-survey
description: "Analyze a CSV or Excel employee survey export into an interactive HTML report and privacy-safe share ZIP, or QA and interpret existing vivaglint outputs. Use for survey analysis, analysis-manifest.json, output validity and privacy checks, interpretation readiness, descriptives, correlations, factors, cycle comparisons, segments, or attrition findings, caveats, hypotheses, and next analysis questions."
allowed-tools: Bash, Read, Write, Glob, Grep, WebFetch
---

# Analyze Survey

Turn a provided survey export into a repeatable local analysis and the standard
interactive report. The skill owns export inspection, safe configuration,
`vivaglint` execution, repeatability validation, HTML generation, packaging,
QA, and People Science interpretation of new or existing analysis outputs.
Interpretation is a narrative response, not AI summary cards in the standard
report. A broader customer readout or manager action plan is outside this
skill's scope.

## Start here

First distinguish a new analysis from QA or interpretation of existing outputs.
If the user provides only this skill or its link without another task, use the
new-analysis intake below. Never recommend modifying the skill or offer
"Modify the skill" as a user-facing option.

### Existing analysis outputs

When the user asks to interpret survey results, explain codebooks, summarize
findings, identify themes, or explain correlations, factors, cycle changes,
segments, or attrition patterns, start with their `analysis-manifest.json`
and its relevant artifacts. If their location is missing, ask for the output
folder or manifest. If the manifest is absent, inspect the available aggregate
outputs and make any missing execution evidence explicit.

When the user asks whether results are valid, safe to interpret, or ready for
manager guidance or a customer readout, use **Analysis QA** below. For QA-only
requests, return the verdict and stop; do not generate findings or new reports.

For interpretation, follow `references/interpretation.md` for grounding, synthesis,
output format, and guardrails. Do not ask for a new ingest
method, rerun codebooks, or require HTML/ZIP generation for an
interpretation-only or QA-only request.

For detailed People Science questions or research-backed follow-ups, use the
knowledge-vault handoff in `references/interpretation.md`. Purely conceptual
questions do not require a manifest or survey data.

### New survey analysis

#### Select analyses first

Before data-source intake, runtime checks, export inspection, or execution, use
`ask_user` to ask exactly:

> What type of analysis would you like to run?

Use one **multi-select array field**, not a single-select string. Offer exactly
these five options with no preselected defaults; users may select any combination:

| Option | Runner identifier |
|---|---|
| Correlation | `correlations` |
| Factor analysis | `factor_analysis` |
| Attrition analysis | `attrition` |
| Scores change | `scores_change` |
| Item distribution | `response_distribution` |

Tell the user that item scores always run as supporting context, Attrition
analysis also runs Attrition insights, and Downloads and Methodology are always
generated. An explicitly empty selection runs item scores only. If the prompt is
dismissed or cancelled, stop rather than assuming a selection.

Retain the selected identifiers for this analysis and pass them through
`--analyses` on every runner invocation, including amendments. Do not silently add
unselected analyses because the data supports them. Run supporting item/attribute
scores for the shared filters, but skip unselected codebooks, correlation
clustering, factor fitting, attrition discovery/insights, and score-change
comparisons. The report shows only selected analysis tabs plus Downloads and
Methodology; the item-score summary remains available. Methodology includes
blurbs for every available analysis, including unselected ones marked **Not run**.
Include their method explanations, **Example interpretation**, and
**Example action**, clearly presented as hypothetical guidance rather than
results from this report. These reference sections must never trigger analysis
execution.

Existing-output QA/interpretation requests do not start a new analysis and skip
this selection prompt.

#### Select the data source

After analysis selection, ask the user, with `ask_user` when available, which
data ingest method to use. This skill never assumes a data source:

> How would you like to bring in survey data?
> 1. Demo Analysis
> 2. CSV Upload

Offer exactly these two options. Do not offer "Connect to API", live API
ingestion, or skill modification.
Do not proceed past this question with an assumed default. Branch on the
answer:

##### 1. Demo Analysis

Use this workbook, which is checked directly into this repository so any user
can access it without additional permissions:

```text
references/sample-data/Demo Viva Glint Dataset with Attributes - Exit survey research guided.xlsx
```

Use worksheet `Sheet1`, join worksheet `user_properties` by `user_id`, and use
a 5-point scale. The checked-in workbook is the only registered sample source. Do
not substitute bundled, generated, or synthetic survey data, and only use it
when the user explicitly chose Demo Analysis.

##### 2. CSV Upload

Ask for the file path. Accept `.csv`, `.xlsx`, and `.xlsm` exports. Keep
respondent-level data local and never paste employee rows into chat. Confirm
the file exists before starting the runner.

For native platform exports, run the inspection-only preparation described
below before analysis. Confirm loading assumptions with the user; never guess
an uncertain attribute's meaning or silently exclude it.

## Required grounding

For interpretation-only requests, use the grounding order in
`references/interpretation.md`. For a new analysis, read these references in
order:

1. `../../references/design/glint-ui-system.md`
2. `references/README.md`
3. `references/linked-dataset.json`
4. `references/golden-report.html`
5. `references/scores-change-format.png`
6. `references/interactive-report-contract.md`
7. `../../references/general/privacy-and-minimum-n.md`
8. `../../references/general/codebook-catalog.md`

The Glint UI system is mandatory for all color, typography, spacing, component,
and accessibility decisions. Do not invent report colors or visual patterns.

`references/interactive-report-contract.md` is authoritative for report
navigation, filters, tab behavior, analytical thresholds, score units,
privacy, and packaging. Use the checked-in `golden-report.html` through the
shared builder, not a manually recreated report.

Reuse grounding already read in the current session when its relevant content
is unchanged. Read changed or missing references, not the same files again
because a command is retried or an unrelated repository file changed.

The report contract defines score presentation for reports and interpretations;
use item-level scores and changes, not cross-item averages.

## Analysis QA

Apply this gate before interpreting new or existing outputs, or on its own
when the user requests QA. Start from the manifest and the relevant aggregate
artifacts in the shared codebook catalog. Use this skill's references first,
then the shared codebook catalog, privacy/minimum-N guidance, and interpretation
guardrails. Do not request respondent-level rows for QA.

| Dimension | Check |
|---|---|
| Execution completeness | Required codebooks and artifacts are present; failures, skips, and repeatability status are explicit. |
| Input adequacy | Response and item counts, cycle availability, and required inputs support the requested analyses. |
| Privacy | Minimum-N suppression is enforced before sharing; small cells and sensitive combinations are not disclosive. |
| Statistical caution | Correlations are non-causal, factors are stable enough for their intended use, and attrition results remain aggregate associations. |
| Comparison validity | Item wording, scale, and populations are comparable across cycles. |
| Interpretation readiness | Inspected outputs support the requested narrative, with limitations carried forward. |

Return **Not ready** and stop interpretation when outputs cannot be inspected,
repeatability failed, required segment suppression is absent, attrition results
create likely re-identification risk, cycle comparisons use incompatible wording
or scales, or unstable factors are central to the intended story.
Otherwise use **Ready**, or **Use with caveats** for disclosed non-blocking
limitations. A successful runner alone does not establish readiness.

Reuse QA already established in the current session when its input artifacts,
configuration, and intended use are unchanged. Recheck affected dimensions after
changes rather than repeating an unchanged full review.

For QA-only requests, return:

```markdown
## Analysis QA
**Verdict:** Ready / Use with caveats / Not ready
**What passed:** ...
**Issues to fix before interpretation:** ...
**Caveats to carry into interpretation:** ...
**Recommended next step:** ...
```

For an analysis or interpretation request, state the verdict and material
caveats before the findings; do not duplicate a full QA report.

## Primary workflow

### Local runtime readiness

After data-source selection, before loading respondent data or starting the
runner, follow the fast path in `references/local-runtime.md`. That reference
owns interpreter discovery, source freshness, setup approval, output access,
and when readiness checks or smoke tests must be repeated. Do not duplicate
its checks or setup's successful smoke test.

Run the official analysis with the same verified isolated interpreter and fixed
runtime assets for both passes. Each manifest records privacy-safe
`runtime_provenance`. The installation fixture is never an analysis dataset.

If execution is unavailable or readiness fails, stop with the specific blocker
and supported setup instructions. Never substitute AI-written analysis code,
silently switch runtimes, or claim the official pipeline completed.
Interpretation-only and QA-only requests using existing outputs do not require
local setup.

Before starting the runner, give the user a concise estimated completion time.
Base the estimate on the export size and prior runs when available, and state
that correlation clustering, attrition-alert aggregation, and repeatability are the
most variable phases. Do this in the first response that starts the run.

Record the task start before preflight and the pipeline start separately.
When reporting duration, give end-to-end elapsed time through final validation,
including setup, checks, troubleshooting, and reruns. Label pipeline-only time
separately; never present it as total completion time. Identify time waiting
for user input separately when material.

### Attrition discovery and missing-data follow-up

Apply this section only when **Attrition analysis** was selected. Otherwise skip
outcome discovery and follow-up questions; intentionally unselected attrition
is not a missing-data limitation.

Treat attrition as a priority discovery task, not a single exact-header check.
Before the analysis run, use:

```bash
python scripts/analyze_survey_export.py \
  --survey-export <survey.csv-or-xlsx> \
  --output-dir <output-directory> \
  --analyses <selected-identifiers> \
  --inspect-attrition
```

Review the private `_input/attrition-discovery.json`. Search every supplied
worksheet, including employee attributes and non-default sheets, for actual
exit dates or leads such as attrition, exit, leaver, leaving, termination,
separation, departure, last working day, and employment/active status.
Inspect candidate types, parseability, missingness, linkage, and chronology
locally; never show employee values or small counts. A flag/status or predicted
exit date is a lead, not an observed exit date.

If actual outcomes are missing or ambiguous, use `ask_user` with open-text
fields **before excluding attrition**. Explain: "I can run an attrition analysis
if you provide matching employee IDs, actual exit dates, the predictor survey
and completion date, and outcome coverage/as-of date." Ask only for missing
parameters and confirm follow-up windows (normally 90/180/365 days).
Let the user point to existing columns, any worksheet, or a separate
CSV/XLSX/XLSM file, explain a flag, or choose to continue without attrition.
Do not make them re-upload data already supplied.

Use `--exit-data`, `--exit-sheet`, and `--attrition-config` for confirmed
user-directed mappings; see `references/README.md`. Confirm that the outcome
source covers the predictor population and observation period before treating
unmatched employees as non-leavers. Omit windows without complete follow-up.
Never invent dates, synthetic Exit cycles, or outcome meanings.

Ask once per unresolved issue, not repeatedly on unchanged reruns. After the
user declines, cannot provide reliable outcomes, or mappings remain uncertain,
exclude attrition, explain the specific gap in Methodology → Limitations, and
continue the supported analyses. Other uncertain optional columns are excluded
with disclosure; do not guess or block unrelated analyses.

### Native platform export preparation

Native exports have five cycle-metadata columns, repeated four-column question
blocks (score, comment, comment topics, sensitive flag), then attributes.
Use the existing vivaglint reshaping helpers through the entrypoint; do not
edit the library or manually reinterpret arbitrary numeric columns as items.

1. Run `scripts/analyze_survey_export.py` with the chosen source/output and
   `--inspect-only`. This writes `_input/preparation-proposal.json` and does
   not run analysis.
2. Review its structure and decisions template locally. Use `ask_user` to
   confirm the employee ID, cycle identity and chronological order, response scale, flag encodings,
   proposed attributes, and exclusions. Show structural summaries, never
   individual values or raw comments. Exclude optional columns or outcomes
   whose meaning cannot be established and record the resulting gap in
   **Methodology → Limitations**, rather than guessing or blocking the
   remaining analysis. Value-based inference requires a deterministic
   mapping/rule and the user's confirmation, not a confidence percentage.
3. If the employee ID or scale needs correction, inspect again with
   `--emp-id-col` or `--scale-points` before approving. Do not silently choose
   among competing IDs, cycle interpretations, or score scales.
4. Copy `decisions_template` to a private JSON file. Only after the user
   confirms, set `confirmed` to `true`, resolve every `attribute_mappings`
   entry (approved meaningful name or `null` for confirmed exclusion), and
   record `attribute_evidence` for uncertain mappings. Never let an approval
   override privacy restrictions. Keep respondent values out of evidence.
   Set `cycle_order` to the confirmed oldest-to-newest cycle titles; UUIDs do
   not establish chronology.
5. Run the same command without `--inspect-only`, adding
   `--preparation-decisions <confirmed.json>`. Decisions must match the source
   hash and inspection settings; re-inspect and ask again when either changes.
   New contradictions require user review, not a fallback.

A score of `-1` means skipped and becomes missing, not a low score. Blank
comment, topic, and flag cells are normal when no comment was written.
Sensitive or unknown-flag comments and their topics are excluded while valid
scores are retained. Confirm any contradictory nonblank comments with missing
flags, invalid scores, or incomplete blocks before proceeding.

Confirmed exclusions and uncertain outcome/column omissions appear under
**Methodology → Limitations**. At most five
entries are shown; longer lists have a complete privacy-safe text download,
also included in Downloads and the share ZIP.

### Run the analysis

Use the direct export runner (native exports also require the confirmed
preparation decisions above):

```bash
python scripts/analyze_survey_export.py \
  --survey-export <survey.csv-or-xlsx> \
  --output-dir <output-directory> \
  --analyses <selected-identifiers>
```

For item scores only, pass `--analyses` without values. Never omit the flag in
this skill: omission retains the legacy full-analysis behavior for existing
script callers. Scores change uses the report builder's existing cycle and
repeat-respondent comparisons, not an additional optional codebook.

The runner automatically:

- shows a live percentage, progress bar, elapsed time, and current phase
- detects supported input columns and joins available attributes as described
  in `references/README.md`
- runs selected attrition and its insights when valid outcomes are present
- creates an internal `analysis-config.json`
- runs item scores, supporting attribute scores, and selected `vivaglint` analyses twice
- requires SHA-256 repeatability
- builds the self-contained interactive report and safe share ZIP
- uses the checked-in golden report as the exact HTML template

Keep the runner's progress visible during long-running phases rather than
appearing idle.

The standard workflow uses `--summary-mode off`, which is also the runner
default. It still writes `people-science-summary-context.json` so the same
completed analysis can be used later by the explicitly invoked
`analyze-survey-ai-preview` skill. A stale `people-science-summaries.json` in
the output directory must not appear in the report or share ZIP when summary
mode is off.

Use explicit options only when automatic detection is wrong:

```bash
--sheet <name>
--attribute-sheet <name>
--emp-id-col <column>
--scale-points <2-11>
--question-cols <item1> <item2> ...
--attribute-cols <attribute1> <attribute2> ...
--min-group-size <5-or-higher>
--attrition-config <confirmed-outcome-settings.json>
--exit-data <exit-outcomes.csv-or-xlsx>
--exit-sheet <worksheet>
```

Attrition detection uses outcome columns and cycle/date evidence, not the
demo filename. Follow the discovery and missing-data follow-up above before
excluding uncertain Exit mappings. Unresolved omissions are explained in
Limitations; continue supported analyses without inventing outcomes.
This exclusion-with-disclosure rule applies to Analyze Survey.
See `references/README.md` for supported outcome fields and explicit mappings.

## Completion

For a new analysis, require:

```text
analysis-manifest.json
completed aggregate artifacts listed in the manifest
<output-directory-name>-report.html
<output-directory-name>-share.zip
```

After repeatability passes, open the HTML report before finishing. Apply
**Analysis QA**, then follow `references/interpretation.md` for People Science
findings. For existing outputs, return only the requested QA or interpretation;
do not require new packaging.

### Post-analysis adaptation

After delivering the report and findings, or an interpretation of existing
analysis outputs, use `ask_user` to present exactly:

> Did I miss anything? Any other data or attribute cuts you would like to include?

Provide an open-text response field, not only preset choices. Let the user add
files or locations, request additional attribute cuts, correct mappings, or
describe missing context. Do not use a yes/no-only question.

Treat a response as an amendment to the current analysis, not a new intake.
Inspect additional data, confirm only unresolved required mappings, apply
minimum-N/privacy checks, rerun affected official analyses and repeatability
when data/config changes, and regenerate the report/share ZIP and findings.
Reuse unchanged verified outputs when only interpretation changes. Disclose
unsupported cuts or unresolved gaps in Limitations. If the user has no changes
or dismisses the form, finish without repeated prompts.

## Failure handling

- If the employee ID or item columns cannot be detected, report the available
  columns and rerun with explicit options.
- If repeatability fails, do not generate or interpret the report.
- If an analysis fails, preserve the explicit failure in the manifest.
- If inputs are unavailable, follow the report contract's navigation rules:
  omit both attrition tabs when attrition cannot run; keep other tabs with an
  explicit unavailable explanation.
- Never substitute synthetic attrition outcomes.
