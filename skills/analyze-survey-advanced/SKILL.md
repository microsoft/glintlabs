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

## Chat-first delivery

Keep the full analysis conversation inline: intake, approved comparisons,
charts, People Science interpretation, caveats, and next choices belong in the
chat, not in an HTML report. Use the runner's default `--delivery chat` for
execution and follow-up interpretation/item review. Keep the private run,
manifest, aggregate diagnostics and clean reproduction code for auditability;
they are supporting artifacts, not a required user-facing report.

Render charts directly in the conversation from inspected aggregate diagnostics
using the host's inline plotting/image support. Do not invent chart data, use
generative images, or read employee rows merely to draw a chart. For SVD, show
the item-weight chart followed immediately by concise People Science-grounded
interpretation with citations, then the component summary and provisional
removal-review shortlist. Keep signed unit weights, the common 0-1 magnitude
scale, explained variance, and exploratory limits explicit. Apply the chart
semantics in `references/interactive-report-contract.md`.

If inline images are unavailable, disclose that limitation and show a labeled
text bar chart with signed values and a compact numeric table in the chat;
do not silently substitute an HTML file or a link-only answer. Never claim a
chart is displayed when only its file path was returned.

Do not generate/open HTML, launch a browser, or package a share ZIP by default.
Only produce those deliverables when the user explicitly requests them, using
`--delivery report` and the existing report contract. This changes presentation,
not fit/tune/interpret/share approval, model QA, privacy, or holdout requirements.

## Required grounding

Read this full entry and the colocated `references/README.md`,
`references/modeling-workflow.md`, `references/interpretation.md`, and
`references/interactive-report-contract.md`. Then load relevant shared
`../../references/general/privacy-and-minimum-n.md` and interpretation guardrails.
Reuse complete unchanged bodies; do not rely on stale installed copies.
Use `../../references/design/glint-ui-system.md` before report/UI changes.

## Evidence-led decision guardrail

Every decision in this skill must be evidence-led: use inspected data and
diagnostics, the user's confirmed objective and constraints, and applicable
safety requirements. Never substitute habit, convenience, arbitrary defaults,
or an unexplained recommendation for evidence. This includes component count,
scaling, features, model/parameter choices, validation, metrics, thresholds,
and shortlist membership or ordering.

If evidence or context is insufficient, ask the user for the missing information
and explain which decision it would resolve. When data cannot determine a
business trade-off, ask for the user's utility criterion rather than inventing
one. User approval permits execution; it does not establish analytical quality.
Privacy, consent, supported-engine limits, and holdout integrity remain mandatory.

Make decisions and deferrals explicit in the conversation: state the observed evidence,
what was chosen or left undecided, why, and the next information/check needed.
Missing context is not a negative finding. Do not hide a blocked decision behind
"No supported candidates identified"; ask for the specific context and explain
how to provide it, preserving provisional pair-level leads when supported.

Before selecting the number of SVD components, default to a comparison of counts
**1 through 8**, including demos. This is a comparison range, not a selected rank
or permission to fit. Present a clean table with cumulative variance explained,
marginal variance gain, reconstruction MSE/RMSE, their units/evaluation scope,
and trade-offs. Always follow it with an evidence-based recommendation when the
confirmed objective supports one, or concrete conditional guidance when it does
not. Do not leave the user with unexplained metrics or an unsupported "best" count.
Follow the component-choice workflow in the linked modeling reference. Obtain
approval for the exact bounded comparison before new fits; reuse comparable
verified runs. Mark unavailable metrics **Not computed** and unsupported counts
**Not feasible**, explaining why. Respect an explicitly narrower user scope.
Never silently choose three, five, or another count, change a confirmed count,
fabricate metrics, or run an automatic search to fill the table. Preserve the
same guardrail in demos.

## Mandatory Knowledge Vault guardrail

Before offering model interpretation or tuning guidance, consult the colocated
`../people-science-knowledge-vault/SKILL.md` and follow
`references/interpretation.md`. This is mandatory for all supported models,
including SVD, demos, follow-up questions and proactive tuning proposals; do not
wait for the user to request research. Reuse complete, applicable same-revision
guidance and reviewed source bodies still available in context.

Ground People Science claims in retrieved eligible sources and cite them beside
the claims they support. Separate observed diagnostics, published guidance,
hypotheses and technical proposals. Describe supported advice as
**People Science-grounded**, not **People Science-approved**: vault consultation
does not establish formal human approval or model validity.

If required references or sources are unavailable, or no applicable evidence is
found, disclose the gap and withhold research-dependent advice. Verified numeric
facts may still be explained as data-only, not People Science-grounded. Ask for
missing context when it would change the advice; never fabricate citations or
force an irrelevant source. Vault consultation does not authorize fitting or
override evidence-led choices, confirmed constraints or holdout integrity.

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

Follow the mandatory Knowledge Vault guardrail for these discussions. When a
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
Record the confirmed survey name and, when available, its invitation count and
respondent ID column in the optional config `survey` metadata. Missing invitation
coverage does not block analysis: show response rate as unavailable, never infer
it from the export's respondent count.
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

For completed work, deliver the chart and full discussion inline. Explain what
ran, model QA, baseline comparisons, caveats, and what did not run. Retain the
aggregate diagnostics, clean notebook/script and portable config template
locally; offer files only when requested. Present research interpretation
only after the required evidence review; otherwise mark it unavailable beside
the chart rather than inventing a People Science perspective.
Write the interpretation as concise, connected natural-language paragraphs with
citations beside the supported guidance. Explain what the results mean and the
material limits or next check without Observation / Interpretation / Hypothesis
blocks. For fitted SVD, place it directly beneath the item-weight chart in the
chat, before component summaries. When an HTML report is explicitly requested,
keep that same order inside Centered SVD exploration. Other requested reports
retain a separate interpretation section before Model comparison.

For every completed, QA-eligible SVD analysis, including demos and structure-only
explorations, always prepare and attach a ranked shortlist of the top three
questions to investigate for removal, not final retain/remove decisions.
Do not wait for a separate survey-shortening request or deliver the completed
SVD discussion with **Candidate shortlist not yet prepared**.
Follow the candidate workflow in `references/modeling-workflow.md`. Give each
candidate an observed reason and the evidence that would help the decision.
Use fewer than three when the available evidence or eligible item set warrants
it, including a reasoned assessed-zero outcome; never fill the list with
unsupported choices. Ask about protected questions,
benchmarks, and topic coverage, but incomplete content/stability checks need
not block a clearly provisional shortlist. Do not infer removability from a
small component weight. Obtain `interpret` and `share` approval for the original
experiment before attachment; if absent, state that the shortlist is pending
approval rather than claiming delivery is complete. Code-only, not-run, or
QA-ineligible SVD outputs must not have fabricated candidates. New diagnostic
fits still require explicit instruction.

End an experiment discussion with concrete next choices and an invitation for
the scientist's ideas or relevant data when that could change the next step.
Do not repeatedly ask for unavailable inputs or execute the proposed experiment
until instructed. No production promotion or PR merge is implicit.
