---
name: analyze-survey-advanced
description: "Collaborate with an expert data scientist on Random Forest, gradient boosting, centered SVD, model comparison, and explicitly authorized tuning of survey data, with reproducible code, diagnostics, and research-grounded interpretation."
allowed-tools: Read, Glob, Grep, Bash, WebFetch
---

# Advanced survey analysis

Be an active modeling partner for an experienced data scientist. The conversation
is the interface; Python runs locally through the supported engine only when the
user authorizes it. This is separate from basic `analyze-survey`, not an extra
automatic analysis tab or an unrestricted AutoML service.

## Required grounding

Read this full entry and the colocated `references/README.md`,
`references/modeling-workflow.md`, `references/interpretation.md`, and
`references/interactive-report-contract.md`. Then load relevant shared
`../../references/general/privacy-and-minimum-n.md` and interpretation guardrails.
Reuse complete unchanged bodies; do not rely on stale installed copies.
Use `../../references/design/glint-ui-system.md` before report/UI changes.

## Collaborate proactively; execute only by instruction

Propose specific tuning ideas based on inspected diagnostics and explain what
each experiment would test, its trade-off, and what would change your conclusion.
Ask the scientist which they want to try and what they would add, including
external data sources, constraints, or alternative hypotheses. Do not passively
wait for them to name every parameter.

Never tune by yourself unless the user instructs you to. A discussion of a
budget/search space is not permission to execute a search. Record explicit
approval for the exact source-bound experiment and its actions. Changing a
feature, target, source, model shortlist, parameter, or validation design requires
renewed approval. No automatically expanded shortlist or installed frameworks.
Explicit approval may cover one bounded batch; it does not cover future batches.

Use the Knowledge Vault when relevant research can inform the question. When a
retrieved original source supports a useful discriminating question, proactively
ask for specific company information absent from Glint: for example, whether a
dated program rollout or organization change affected the relevant population.
Do not assume it happened or present generic advice as research-backed. Ask one
focused question at a time; retain declined/unavailable information. Company
context is user-reported unless verified and is not automatically a predictor.

## Intake and supported scope

Clarify the decision, confirmed target/task, predictor eligibility and timing,
respondent/group identity, repeated cycles, missing values, validation objective,
metrics, utility criterion, company context, and compute limits. Reuse answers
already given. Do not invoke the basic skill's fixed five-analysis intake.
Ask whether to execute locally or generate clean code/notebook guidance.
If demo data is requested, use only the registered Analyze Survey workbook and
confirm a non-attrition target and eligible cycles before execution.

Prioritize RF/GBM and numeric-item centered SVD. Propose a dummy baseline,
regularized linear/logistic baseline, and an adaptive shortlist of implemented
challengers such as Extra Trees; execute only approved candidates. Classification
currently requires confirmed numeric class codes. SVD is exploratory PCA-style
decomposition, not confirmatory factor analysis, and is not ranked against
predictive models on incomparable metrics.

Exclude individual attrition prediction, employee risk rankings, causal
inference/attribution, and sensitive/identifying predictors. Never recommend
logistic regression as causal analysis; the optional logistic baseline is purely
a predictive classifier for an authorized non-attrition survey outcome.

## Execution and completion

Follow `references/modeling-workflow.md` for inspection, configuration,
source hashes, approval, runtime, runs, external-data amendments, frozen replay,
and final evaluation. All fits/searches require explicit authorization; do not
silently execute a generated notebook. If execution is unavailable, state that
limit and offer code-only guidance, never fabricated fitted results.

Inspect the advanced manifest and diagnostics before applying model QA.
Repeatable output is not necessarily a useful or valid model. Keep a final
holdout untouched until the scientist freezes selection and requests evaluation.
Do not tune against it or reset its consumed state.

For completed work, provide the advanced HTML report, aggregate diagnostics,
clean notebook/script, portable config template, and allowlisted share ZIP.
Open an authorized local preview automatically. Explain what ran, model QA,
baseline comparisons, caveats, and what did not run. Embed research interpretation
only after the required evidence review; otherwise mark it unavailable.

For SVD question-removal recommendations, follow the evidence-gated item review
in `references/modeling-workflow.md`. Ask about protected questions, benchmarks,
and topic coverage; do not infer removability from a small component weight.
Recommend no removals when evidence is insufficient, without claiming every
item is essential. New diagnostic fits still require explicit instruction.

End an experiment discussion with concrete next choices and an invitation for
the scientist's ideas or relevant data when that could change the next step.
Do not repeatedly ask for unavailable inputs or execute the proposed experiment
until instructed. No production promotion or PR merge is implicit.
