# Advanced model QA and People Science interpretation

Before interpretation inspect `advanced-analysis-manifest.json`, aggregate
diagnostics, development/holdout state, the approved design, and limitations.
The runner's bounded diagnostic verdict is not a certification of scientific
validity. Independently review:

- Leakage, grouping/timing, effective class/group support, missingness and
  selection/coverage, target validity, and population comparability.
- Baseline lift and the scientist's utility threshold, training/validation
  gap, residual behavior or classification calibration, and instability.
- Whether a frozen-fit replay passed and whether the holdout is genuinely
  untouched versus already consumed. Fold SD is not a confidence interval.
- Suppression before serialization and safe notebook/ZIP contents.
- Whether analytical choices, including SVD rank and shortlist direction, have
  traceable data/diagnostic evidence and a confirmed objective. Approval alone
  is not evidence of quality. Carry missing or incomparable option metrics
  forward explicitly; ask for missing context rather than inventing a rationale.

Return **Not ready** and stop findings for invalid validation, leaked targets,
failed repeatability, missing central evidence, or unsafe outputs. Use **Use
with caveats** for exploratory or development-only results and explain their
limits. Do not present poor/no-improvement models as meaningful discoveries.
No fit has run in code-only mode, so no fitted findings can be interpreted.

## Mandatory consultation for interpretation and tuning

Consult the colocated Knowledge Vault before helping interpret results or
proposing, prioritizing or explaining tuning choices, including SVD component
labels, rank/scaling trade-offs and question-removal review. This applies to
demos and follow-ups as well as initial results; users need not request research.
Do not restart intake or refit unchanged models merely to consult the vault.

Read and follow `../../people-science-knowledge-vault/SKILL.md`, including its
required-reference gate, `references/research-workflow.md`, and common
reference bodies from the same revision. Reuse full valid bodies still in
context; loading notes are not source bodies. Retrieve original eligible public
source bodies before claims; catalog summaries alone are not evidence. Apply
the vault's relevance and source-priority rules and cite sources beside supported
claims, preserving their scope and limitations.

Use the vault to inform content meaning, coverage and useful checks, not to
choose a component count, invent weight thresholds or justify removal without
model evidence and confirmed constraints. Technical tuning proposals must still
follow inspected diagnostics and the user's objective; new fits require approval.

Call supported guidance People Science-grounded, not People Science-approved.
Do not imply a People Science expert approved this interpretation or model
unless that specific review is documented. Vault consultation and citations
do not certify scientific validity.

If a required body cannot be loaded, or no applicable source can be retrieved,
state what is missing and withhold research-dependent claims/recommendations.
Continue only with verified numerical observations, basic context checks or
clearly labeled data-only technical limits; do not present them as People
Science-grounded. Ask for a relevant supplied source or missing context when
that would resolve the blocker. Keep report interpretation unavailable until
the required review and source-grounded narrative actually exist.

Supply only privacy-safe aggregate modeling diagnostics to narrative generation.
Keep observation, user-provided company context, published guidance, hypotheses,
and recommended verification distinct. Permutation importance measures predictive
dependence, not causal influence. Correlated items can redistribute importance.
SVD labels are tentative; component signs/order do not prove stable constructs.
Knowledge Vault research can inform interpretation and a useful question, not
establish that a model is valid or that a local cause has been identified.

When applicable research supports a discriminating request, proactively ask for
specific missing company information or an authorized external source. Explain
what it could change. Do not collect unnecessary employee data or send company
context/results to public search. Interpretive context stays out of models until
the scientist explicitly approves an eligible, time-valid modeling amendment.
For low-score explanations, inspect authorized aggregate comment themes where
available or ask once for a redacted export/themes. Raw comments never enter
model fitting, public retrieval, or shared report narratives.

## Write a natural interpretation

Lead with what the inspected results mean for the user's question. Use concise,
connected paragraphs that read like an explanation to a colleague, with sources
beside the guidance they support. Weave in only the uncertainty, constraints and
next checks that could change the decision. Keep published guidance, the user's
results and your suggested application distinguishable in the prose.

Do not expose an Observation / Interpretation / Hypothesis / Next check / Caveat
template, manufacture a hypothesis, or repeat generic action-taking instructions.
Evidence review remains mandatory; removing labels does not remove caveats or
permit unsupported conclusions. Show the interpretation immediately after SVD,
above Model comparison, in both navigation and page order.

For embedding, create a narrative matching
`schemas/advanced-interpretation.schema.json`, bound to the exact config and
summary hashes. Each new `claims` entry contains a natural-language paragraph in
`text` and its `sources`. Legacy five-field entries remain readable for
compatibility, without displaying the field labels. Review original source bodies
and required guidance and approve the text for privacy-safe sharing before
setting those attestations. They are
host review records, not an automated proof of model attention or source truth.
The local serializer validates structure, hashes and source hosts, not whether
the scientific interpretation is correct. Approved sources follow the existing
Knowledge Vault hierarchy, not a new internet search.

Use `--mode interpret --narrative <reviewed.json>` with the original config/run
and approval actions `interpret` and `share`. This regenerates artifacts without
refitting or rereading respondent data. The report always renders meaningful
diagnostics when research retrieval is unavailable, but marks research-backed
interpretation unavailable and does not invent citations.
