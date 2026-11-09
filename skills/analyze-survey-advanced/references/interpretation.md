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

Return **Not ready** and stop findings for invalid validation, leaked targets,
failed repeatability, missing central evidence, or unsafe outputs. Use **Use
with caveats** for exploratory or development-only results and explain their
limits. Do not present poor/no-improvement models as meaningful discoveries.
No fit has run in code-only mode, so no fitted findings can be interpreted.

Read and follow `../../people-science-knowledge-vault/SKILL.md`, including its
required-reference gate, `references/research-workflow.md`,
`references/results-exploration.md` when interpreting results, and common
reference bodies from the same revision. Reuse full valid bodies still in
context; loading notes are not source bodies. Retrieve original eligible public
articles/PDFs before claims; catalog summaries alone are not evidence.

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

For embedding, create a narrative matching
`schemas/advanced-interpretation.schema.json`, bound to the exact config and
summary hashes. Review original source bodies and required guidance and approve
the text for privacy-safe sharing before setting those attestations. They are
host review records, not an automated proof of model attention or source truth.
The local serializer validates structure, hashes and source hosts, not whether
the scientific interpretation is correct. Approved sources follow the existing
Knowledge Vault hierarchy, not a new internet search.

Use `--mode interpret --narrative <reviewed.json>` with the original config/run
and approval actions `interpret` and `share`. This regenerates artifacts without
refitting or rereading respondent data. The report always renders meaningful
diagnostics when research retrieval is unavailable, but marks research-backed
interpretation unavailable and does not invent citations.
