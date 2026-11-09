# Expert modeling workflow

## Prepare a concrete experiment

Start with the scientist's question, not an algorithm contest. Separate
cross-sectional association, unseen-respondent generalization, and future
forecasting. Confirm the target definition, exclusion of target-derived items,
permitted predictor meanings/timing, source/cycle comparability, and response
scale. Do not create unapproved composite scores or binarize an ordinal target.
Inspect missingness, class support, independent groups, nesting, duplication,
coverage, and plausible selection bias. Minimum-N is not a modeling sample-size rule.

Use CSV/XLSX/XLSM with explicit columns. Native platform exports first need the
existing `analyze_survey_export.py --inspect-only` preparation and user-confirmed
mappings; use the resulting private prepared survey without running the basic
analysis suite. Keep attributes as explicit approved joins, not implicit sheets.
Comments, identifiers, protected attributes, and post-outcome features are not
predictors. User authority does not override privacy or holdout integrity.

Create a config matching `schemas/advanced-analysis-config.schema.json`, with
actual SHA-256 source hashes, explicit features, group key, seed, minimum group
size, group/chronological validation, metric, utility threshold, candidate
parameters, and bounded rows/trials/threads/seconds. No silent defaults for these
scientific decisions. `utility_threshold` is the minimum absolute improvement
over the dummy baseline in the primary metric's units, not an invented guarantee.

Model methods: `dummy`, `linear`, `random_forest`, `gradient_boosting`, and
`extra_trees`. Each has an analyst-assigned ID, optional scalar `parameters`,
optional finite `grid`, and optional numeric-item SVD `components`.
SVD-only task uses an empty model list and `reconstruction_rmse`; it does not
enter a supervised leaderboard. RF/GBM complexity, feature selection, and SVD
rank are choices to discuss, not autonomous settings to optimize.

Group validation keeps repeated people together. For unseen organizations use
that grouping unit. Chronological validation respects whole date boundaries;
`unseen_groups: false` is allowed only for explicitly confirmed forecasting of
known people. Train-fitted imputers/scalers/encoders/SVD remain inside CV.
Do not pool repeated rows to claim more independent respondents.

## Runtime and source-bound approval

Use a separate virtual environment and the complete plugin:

```text
python -m venv .venv-advanced
<venv-python> -m pip install -r requirements-advanced-runtime.txt
<venv-python> -m pip check
```

Obtain permission before setup. Never modify the basic analysis environment.
The runner verifies the exact modeling source hash and records dependency
versions. Unsupported environments fail rather than silently switching engines.
When the engine pin changes, create a fresh advanced environment. Different
review commits may share a package version; a plain requirements reinstall can
leave the older engine installed. Never bypass the source-hash check.

Compute the config hash with the runner's `digest(config)` function. After the
user explicitly authorizes concrete actions, save a private approval JSON:

```json
{
  "approved": true,
  "config_sha256": "<digest of the exact approved config>",
  "actions": ["fit", "replay"]
}
```

Allowed action names are `code`, `fit`, `replay`, `tune`, `join`, `evaluate`,
`interpret`, and `share`. This record binds actions to content; it is not proof
that a human consented. The host/assistant must obtain actual user authorization
and may not manufacture approval from a budget, proposed idea, or this example.
Keep approvals and conversation context private.

```text
<venv-python> scripts/run_advanced_survey_analysis.py --config <config.json> --project-dir <private-project> --output-dir <private-project/new-run> --mode inspect
<venv-python> scripts/run_advanced_survey_analysis.py --config <config.json> --project-dir <private-project> --output-dir <private-project/new-run> --mode fit --approval <approval.json>
```

Inspection does not fit models; explicit joins still require join permission.
`code` generates an unexecuted notebook/script and a clearly marked Not-ready
report. `tune` additionally requires `tune` approval and an explicitly approved
finite parameter grid. `fit` must not run a grid. `replay` permission covers
rerunning only the frozen winning configuration to check deterministic results,
not rerunning the whole tuning campaign.

Budgets are checked between fits. A single native estimator fit is not forcibly
interrupted at a wall-clock deadline. CPU threads are bounded. Keyboard
interruption or a failure writes an explicit private status/error and exits
nonzero; partial work is not reported as successful. Internal random early
stopping, weighting, custom decision thresholds, and arbitrary external model
frameworks are not implemented in the first engine API. If required, discuss a
separate implementation instead of implying support.

## Proactively discuss tuning and additional context

After inspecting each result, offer a short ranked list of next experiments
with expected trade-offs and falsifiable checks. Examples only when diagnostics
support them: larger RF leaves for a training/validation gap; a slower GBM
learning rate with a bounded iteration trade-off; SVD rank/scaling comparisons;
or a supported challenger with a different inductive bias. Do not promise better
fit, treat more search as always useful, or auto-run the proposals.

Ask what the scientist would add: another hypothesis, a constraint, domain
knowledge, or an external dataset. Retrieve applicable Knowledge Vault research
before calling a context request research-backed. A specific missing fact, such
as dated rollout coverage, may distinguish explanations better than more tuning.
Explain that connection briefly and ask one focused question. Keep unanswered,
unavailable, declined, or user-reported context in the correct evidence state.

External modeling data needs explicit join approval, source hash, provenance,
rights/permissible use, definitions, complete link keys, many-to-one cardinality,
coverage and availability before the target/prediction time. In `joins`, declare
`source`, `key`, `columns`, `provenance_confirmed: true`,
`eligibility_confirmed: true`, and an `available_at` column when timestamped.
The latter is checked against the confirmed survey `time`; otherwise temporal
eligibility remains an explicit human review obligation. No implicit API access,
scraping, credential requests, or sensitive/granular linkage. Inspect unmatched
coverage privately and confirm its implications. Never convert interpretive
context into a predictor without this process.

Amendments require a new config hash and approval, a new run directory, and
affected QA. Do not overwrite experiment history. No private source labels,
paths, identities, or user context should enter public retrieval queries.

## Selection, final evaluation, and readiness

Compare on consistent CV folds and the approved primary metric. Keep baseline
lift, variability, generalization, resource cost, and the practical utility
criterion visible. A model may provide no useful improvement.

The runner writes `_private/frozen-config.json`. To evaluate a final winner,
approve its exact frozen config for `fit`, `replay`, and `evaluate` (plus `join`
if relevant), use a fresh run directory and `--mode evaluate --frozen-from
<development-run/_private/frozen-config.json>`. Final holdout evaluation cannot
choose among candidates. Development baseline comparisons remain development
comparisons, not claimed heldout baseline lift.

All runs for the same study must use the same private project. `_holdouts`
seals the source selection, grouping/timing inputs and holdout design on the
first executed run, so development iterations cannot quietly rotate test rows.
Use explicit `split_seed` to preserve that original split when an approved
experiment changes estimator `seed`; otherwise the latter also seeds the split.
Changing CV fold count is possible without changing the reserved population.
The same directory also
records the primary source hash as consumed before final evaluation starts,
including failed attempts. Do not delete the ledger, change a source's encoding,
or create another project to evade it. This is a conservative project-local
guard, not a global proof that no analyst has seen the holdout. After holdout-
informed iteration, request genuinely new evaluation data for unbiased claims;
do not tune on or relabel the old test set.

Compare frozen-fit deterministic aggregate artifacts, not estimator bytes,
timestamps, or the whole search. Statistical stability across seeds/splits is
a different approved experiment. Model QA must additionally inspect leakage,
effective support, baseline usefulness, comparability, diagnostic stability,
and privacy. Carry the limitations forward; repeatability alone is not Ready.
