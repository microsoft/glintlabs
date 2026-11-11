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

For the header overview, optional config `survey` metadata accepts a confirmed
`name`, `invited_count`, and `respondent_column`. Supplying `invited_count`
requires `respondent_column` and confirmation that invitations cover the same
single-survey population as the export. The runner rejects missing/duplicate
respondent IDs, multiple cycle titles/IDs, or responses exceeding invitations
instead of publishing a misleading rate. Without a confirmed denominator,
response rate stays unavailable. Do not equate observed respondents with
invitations or infer a survey name from a file path.

The manifest's aggregate `survey` overview records input response rows,
selected feature count, survey name, and a supported response rate. N is the
full input cohort, not just development rows or a claim of independent people.
For SVD the selected numeric survey features are questions; predictive runs
label the count as predictors, since approved external features may be present.
One unambiguous `survey_cycle_title` can supply a missing name. Code-only runs
do not read data and cannot report observed N or a response rate. Counts below
the configured privacy minimum remain null.

Group validation keeps repeated people together. For unseen organizations use
that grouping unit. Chronological validation respects whole date boundaries;
`unseen_groups: false` is allowed only for explicitly confirmed forecasting of
known people. Train-fitted imputers/scalers/encoders/SVD remain inside CV.
Do not pool repeated rows to claim more independent respondents.

## Evidence-led choices and component selection

Ground each analytical choice in inspected evidence and the confirmed decision
objective. Explain which artifact or diagnostic supports it, what remains
unknown, and what could change the choice. If information is missing, ask the
user for it instead of choosing an arbitrary default. Existing approval or an
earlier demo configuration is not evidence that a choice is good. Keep previously
confirmed settings fixed unless a supported comparison and renewed approval
justify changing them.

There is no fixed default SVD component count. First clarify what the user wants
to preserve or simplify and the acceptable reconstruction/stability trade-off.
Use inspected item count, effective support, existing variance/error diagnostics,
and content constraints to propose a small, justified set of candidate ranks.
If these inputs cannot support a shortlist, ask for the missing objective,
constraint, or evidence; do not manufacture a candidate range or a variance
cutoff. Technical reproducibility settings and compute limits must be explicit,
not described as empirically optimal.

Before asking the user to select a count, show one row per candidate in a compact
Markdown table. Replace placeholders with inspected results, not example numbers:

| Components | Variance explained (%) | Reconstruction MSE | RMSE | Evidence / trade-off |
| --- | --- | --- | --- | --- |
| Candidate count | Measured cumulative percentage or Not computed | Measured error or Not computed | Measured error or Not computed | What is gained, lost, or still untested |

State the shared dataset/cycle, development population, preprocessing/scaling,
and error units once beneath the table. Compare like with like: the same
source, rows, reserved split, feature set, and preprocessing. Label any
non-comparable option rather than ranking its raw metrics. For common unscaled
0-100 inputs, RMSE is in score points and MSE in score points squared;
standardized inputs have standardized error units. MSE may be calculated as
the square of an inspected reconstruction RMSE, with that derivation disclosed.
Cumulative variance for an existing retained prefix may be summed from its
reported component ratios; label it as a prefix of that fit, not a separately
validated rank. Do not invent other-rank reconstruction errors from variance
percentages alone.

The current SVD engine reports development in-sample reconstruction error,
not cross-validated or holdout reconstruction performance. Report that scope;
do not imply the config's fold count creates SVD validation. Missing stability
or generalization evidence stays **Not computed**, not zero or "passed".
Higher rank mechanically retains more variance and reduces training error;
neither the largest rank nor a presumed elbow is automatically the best choice.
Explain the observed marginal benefit and the unresolved complexity/content
trade-off, then ask the user which supported option fits their objective.

If comparison needs new fits, first request explicit authorization for the
exact source-bound candidate configs and bounded actions/budget. A request to
edit this skill or see options is not permission to fit or tune. Run only the
approved candidates through the supported engine in separate run directories
inside the same project, preserving its reserved holdout design. Do not use
the sealed holdout for rank selection, silently expand the range, or imply an
unsupported SVD rank grid/validation feature exists. Return with the measured
table and obtain the user's selection before presenting a final chosen rank.
Keep the evidence and choice rationale in the private approval/context record.

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

## Top three SVD candidates for removal review

For every completed, QA-eligible SVD analysis, including demos and structure-only
explorations, prepare and attach the three strongest supported
**candidates to investigate**, in priority order, rather than issuing final
retain/remove decisions for every fitted question. Do not wait for a separate
survey-shortening request. Explain why each is worth
reviewing and what evidence would help decide. This is a shortlist, not a
joint recommendation to drop all three. Nothing is deleted or refitted.

Inspect the existing QA-eligible SVD diagnostics, available wording, approved
same-population redundancy diagnostics, and known constraints. Rank by the
strongest available evidence and state the actual ranking basis. Prefer
observed response redundancy plus overlapping content when those checks exist.
When only SVD output is available, a provisional host/analyst assessment may
use similar retained-component profiles as a lead to investigate, explicitly
not as measured item correlations or evidence of interchangeable wording.
Explain that omitted dimensions may distinguish the items. Do not equate low
weights with redundancy, invent cutoffs or confidence scores, or claim absent
checks were completed. The report displays the supplied analyst ordering;
it does not calculate a statistical ranking or run tests.

A similar-profile pair does not by itself identify which member to nominate.
Use observed item-specific evidence and confirmed protection/content constraints
to justify that direction. If they cannot discriminate, explain the ambiguity
and ask the user for the missing information instead of arbitrarily choosing a
member. A reasoned fewer/zero assessment is safer than unsupported nominations.

For each candidate, provide:

- The fitted question ID and an observed, specific reason for its priority.
- A comparison question, where relevant, outside the shortlist. This is not a
  confirmed substitute. Keep comparison anchors outside the shortlist so it
  does not implicitly discard both representatives.
- Concrete **evidence needed**: exact wording and same-population response
  redundancy; distinct topic/action, benchmark and trend coverage; and
  development-only stability/utility checks for the proposed reduced set.
  Tailor these checks to the candidate instead of presenting generic advice.

Ask which topics, questions or benchmarks are protected. Exclude known
protected items, but do not claim that protection or content coverage has been
reviewed when it has not. Incomplete coverage or after-removal stability checks
can be evidence still needed rather than a reason to block every candidate.
Correlated items may cover distinct content; an item poorly represented by the
chosen rank may contain important unique information. Final removal still
requires content and reduced-set validation, and may ultimately be rejected
for every shortlisted question. New diagnostic fitting requires instruction;
do not use the sealed holdout to develop the shortlist.

Use fewer than three candidates if too few eligible items or too little
supporting evidence exists. An empty assessed shortlist is valid: explain why
in `ranking_basis` and `limitations`. A missing assessment is a distinct
**Candidate shortlist not yet prepared** state, not evidence to retain all.
That state is intermediate, not a completed QA-eligible SVD deliverable.
Code-only, not-run, or QA-ineligible outputs cannot support a shortlist; disclose
the blocker rather than inventing candidates.

Record the ordered shortlist using
`schemas/advanced-item-candidates.schema.json`. Bind it to the original config
and `digest(manifest["summary"])`, list up to three distinct fitted questions,
and record unresolved checks honestly. Only attest to privacy-safe sharing
and reviews that actually occurred. Reasons/evidence must contain no employee
data, private paths or unapproved company context. Validation checks structure
and source binding, not the truth or quality of scientific judgements.

With explicit `interpret` and `share` approval for the original experiment,
use `--mode review-items --item-candidates candidates.json`. This attaches the
shortlist and rebuilds HTML/ZIP without reading respondent inputs or refitting.
Before delivering any completed QA-eligible SVD report, prepare and attach the
shortlist; merely rebuilding the template does not create candidates. If
`interpret` and `share` approval is missing, request it and disclose the pending
attachment rather than claiming completion. Existing `--item-review` assessments
remain supported for compatibility and their known protected items still
apply, but final retain/remove decisions are not the new shortlist UI.

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
