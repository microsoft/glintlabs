---
name: analyze-survey
description: "Analyze a CSV or Excel employee survey export into an interactive HTML report and privacy-safe share ZIP, or interpret existing vivaglint outputs. Use for survey analysis, analysis-manifest.json, descriptives, correlations, factors, cycle comparisons, segments, or attrition findings, caveats, hypotheses, and next analysis questions."
allowed-tools: Bash, Read, Write, Glob, Grep, WebFetch
---

# Analyze Survey

Turn a provided survey export into a repeatable local analysis and the standard
interactive report. The skill owns export inspection, safe configuration,
`vivaglint` execution, repeatability validation, HTML generation, packaging,
and People Science interpretation of new or existing analysis outputs.
Interpretation is a narrative response, not AI summary cards in the standard
report. A broader customer readout or manager action plan is outside this
skill's scope.

## Start here

First distinguish a new analysis from interpretation of existing outputs.

### Existing analysis outputs

When the user asks to interpret survey results, explain codebooks, summarize
findings, identify themes, or explain correlations, factors, cycle changes,
segments, or attrition patterns, start with their `analysis-manifest.json`
and its relevant artifacts. If their location is missing, ask for the output
folder or manifest.

Follow `references/interpretation.md` for grounding, QA readiness, synthesis,
output format, and guardrails. Do not ask for a new ingest
method, rerun codebooks, or require HTML/ZIP generation for an
interpretation-only request.

For detailed People Science questions or research-backed follow-ups, use the
knowledge-vault handoff in `references/interpretation.md`. Purely conceptual
questions do not require a manifest or survey data.

### New survey analysis

This skill never assumes a data source. Always ask the user, with the
`ask_user` tool when available, which data ingest method to use before doing
anything else in a new analysis:

> How would you like to bring in survey data?
> 1. Upload my own CSV/XLSX export
> 2. Pull live data from the Glint API
> 3. Use the demo/sample dataset to test the skill

Do not proceed past this question with an assumed default. Branch on the
answer:

#### 1. CSV/XLSX upload

Ask for the file path. Accept `.csv`, `.xlsx`, and `.xlsm` exports. Keep
respondent-level data local and never paste employee rows into chat. Confirm
the file exists before starting the runner.

For native platform exports, run the inspection-only preparation described
below before analysis. Confirm loading assumptions with the user; never guess
an uncertain attribute's meaning or silently exclude it.

#### 2. Glint API

Pull data live via Microsoft Graph using the `vivaglint` MCP tools instead of
a file upload:

1. If credentials are not already configured for this session, ask the user
   for `tenant_id`, `client_id`, `client_secret`, and `experience_name`, then
   call `vivaglint-configure_api_credentials`. Never paste the client secret
   back into chat or write it into a committed file.
2. Ask which survey to pull and how: a specific `cycle_id`, a `survey_uuid`
   (which may span several cycles), or a `start_date`/`end_date` range. Also
   confirm `emp_id_col` and `scale_points` if they are not obvious.
3. Call `vivaglint-import_survey_api` with those inputs and a `save_zip_to`
   path so the pulled export lands on local disk. Survey/date-range mode may
   return several cycles; treat each as its own session.
4. Use the resulting local file as the `--survey-export` input to the runner
   below. All analysis still runs locally from that point on exactly like the
   upload path.

If the API call fails or credentials are missing, report the failure and ask
the user to re-enter credentials or switch to another ingest method; do not
silently fall back to the demo dataset.

#### 3. Demo/sample dataset

Use this workbook, which is checked directly into this repository so any user
can access it without additional permissions:

```text
references/sample-data/Demo Viva Glint Dataset with Attributes - Exit survey research guided.xlsx
```

Use worksheet `Sheet1`, join worksheet `user_properties` by `user_id`, and use
a 5-point scale. The checked-in workbook is the only registered sample source. Do
not substitute bundled, generated, or synthetic survey data, and only use it
when the user explicitly chose the demo/sample option.

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

## Primary workflow

### Local runtime readiness

After data-source selection, before loading respondent data or starting the
runner, follow `references/local-runtime.md`:

1. Confirm local command execution and permission to read the chosen input
   and write outputs. Reading a GitHub skill link is not a runtime installation.
2. Locate the complete plugin and check its actual source revision/content
   against the supported upstream version. Obtain approval for updates,
   preserve local changes, and update all assets together, never just the data.
3. Run `scripts/local_runtime.py check` using the intended analysis Python,
   including `--output-dir` to check output access.
4. If setup is missing, obtain approval before environment creation or
   dependency downloads, then use `scripts/local_runtime.py setup` with an
   approved `--env-dir`. Pass `--yes` only after approval. Use the isolated
   environment, not global Python or ad hoc package installation.
5. Require `scripts/local_runtime.py smoke` after setup, plugin updates, or
   dependency changes. Its synthetic installation fixture is never a substitute
   for the user's input or the registered demo workbook.
6. Run the official analysis with that same verified interpreter and fixed
   plugin revision. Each manifest records privacy-safe `runtime_provenance`.

If execution is unavailable or readiness fails, stop with the specific blocker
and supported setup instructions. Never substitute AI-written analysis code,
silently switch runtimes, or claim the official pipeline completed.
Interpretation-only requests using existing outputs do not require local setup.

Before starting the runner, give the user a concise estimated completion time.
Base the estimate on the export size and prior runs when available, and state
that correlation clustering, attrition-alert aggregation, and repeatability are the
most variable phases. Do this in the first response that starts the run.

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
   individual values or raw comments. Ask for a dictionary/mapping where
   meaning is uncertain. Value-based inference requires a deterministic
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

Confirmed exclusions appear under **Methodology → Limitations**. At most five
entries are shown; longer lists have a complete privacy-safe text download,
also included in Downloads and the share ZIP.

### Run the analysis

Use the direct export runner (native exports also require the confirmed
preparation decisions above):

```bash
python scripts/analyze_survey_export.py \
  --survey-export <survey.csv-or-xlsx> \
  --output-dir <output-directory>
```

The runner automatically:

- shows a live percentage, progress bar, elapsed time, and current phase
- detects supported input columns and joins available attributes as described
  in `references/README.md`
- runs attrition whenever valid Exit or termination outcomes are present
- creates an internal `analysis-config.json`
- runs the standard `vivaglint` analyses twice
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
```

## Completion

For a new analysis, require:

```text
analysis-manifest.json
completed aggregate artifacts listed in the manifest
<output-directory-name>-report.html
<output-directory-name>-share.zip
```

After repeatability passes, open the HTML report before finishing. Then follow
`references/interpretation.md` for QA and People Science findings.
For interpretation-only requests, return its narrative format instead.

## Failure handling

- If the employee ID or item columns cannot be detected, report the available
  columns and rerun with explicit options.
- If repeatability fails, do not generate or interpret the report.
- If an analysis fails, preserve the explicit failure in the manifest.
- If inputs are unavailable, follow the report contract's navigation rules:
  omit both attrition tabs when attrition cannot run; keep other tabs with an
  explicit unavailable explanation.
- Never substitute synthetic attrition outcomes.
