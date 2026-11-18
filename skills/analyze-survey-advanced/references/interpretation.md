# Centered SVD QA and People Science interpretation

Before interpretation inspect `advanced-analysis-manifest.json`, aggregate
diagnostics, development/holdout state, the approved design, and limitations.
The runner's bounded diagnostic verdict is not a certification of scientific
validity. Independently review:

- Grouping/timing, effective respondent/group support, missingness,
  numeric-item eligibility, response scales, and population comparability.
- Variance retained, development in-sample reconstruction error, content
  coverage, and any available stability evidence; none establishes a validated
  construct or a question-removal decision by itself.
- Whether a frozen-fit replay passed and whether the holdout is genuinely
  untouched versus already consumed. Reconstruction is not cross-validated.
- Suppression before serialization and safe notebook/ZIP contents.
- Whether analytical choices, including SVD rank and shortlist direction, have
  traceable data/diagnostic evidence and a confirmed objective. Approval alone
  is not evidence of quality. Carry missing or incomparable option metrics
  forward explicitly; ask for missing context rather than inventing a rationale.

Return **Not ready** and stop findings for invalid design, ineligible items,
failed repeatability, missing central evidence, or unsafe outputs. Use **Use
with caveats** for exploratory or development-only results and explain their
limits. Do not present an uninterpretable decomposition as a meaningful discovery.
No fit has run in code-only mode, so no fitted findings can be interpreted.

## Mandatory consultation for interpretation and SVD comparisons

Consult the colocated Knowledge Vault before helping interpret results or
proposing, prioritizing or explaining SVD comparisons, including component
labels, rank/scaling trade-offs and question-removal review. This applies to
demos and follow-ups as well as initial results; users need not request research.
Do not restart intake or refit unchanged decompositions merely to consult the vault.

Read and follow `../../people-science-knowledge-vault/SKILL.md`, including its
required-reference gate, `references/research-workflow.md`, and common
reference bodies from the same revision. Reuse full valid bodies still in
context; loading notes are not source bodies. Retrieve original eligible public
source bodies before claims; catalog summaries alone are not evidence. Apply
the vault's relevance and source-priority rules and cite sources beside supported
claims, preserving their scope and limitations.

### Automatic retrieval and useful insights

Vault grounding is an automatic part of the SVD interpretation workflow, not an
optional follow-up. The analysis request authorizes bounded read-only retrieval
of relevant eligible public sources; do not pause for a separate source-reading
approval. This skill-specific authorization replaces only the vault's optional
deeper-retrieval approval prompt. It does not authorize fitting, new diagnostic
analyses, private sources, joins, or sharing.

1. Inspect the aggregate component weights, variance/reconstruction trade-offs,
   available exact wording, known protections, and unresolved content questions.
   Identify which interpretation could change the user's structural or
   survey-shortening decision.
2. Consult the complete same-revision vault entry and relevant small topic/source
   profiles. Filter relevance first, then apply its source-priority rules.
   Automatically retrieve up to three directly relevant original eligible public
   source bodies, or reuse applicable bodies already reviewed in context. Do not
   read the full library, force an irrelevant source, or send private results,
   item wording, comments, identities, or company context to public retrieval.
3. Use the reviewed evidence to explain what a material observed pattern may
   mean, which item-content distinctions it suggests checking, and what would
   change the interpretation. Cite the guidance beside the supported claim;
   distinguish the user's numeric findings from published guidance and your
   proposed application. Do not claim that a general source validates a component
   label, selects a rank, proves redundancy, or supports deleting an item.
4. Put the concise, connected People Science-grounded interpretation immediately
   below the item-weight chart, before component summaries and removal review.
   Prefer insights that distinguish plausible readings or improve the next
   decision, not boilerplate or a retelling of item IDs.

If retrieval fails or no applicable evidence is found, disclose the gap beside
the chart and retain a data-only explanation. Never fabricate a perspective,
force a citation, or claim the vault ran successfully merely because its entry
was loaded. Ask for missing question-level/company context only when it could
change the decision; preserve information already marked unavailable.

Use the vault to inform content meaning, coverage and useful checks, not to
choose a component count, invent weight thresholds or justify removal without
SVD evidence and confirmed constraints. Technical comparison proposals must still
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
The same unavailable state applies beside the inline chart in chat; an HTML
report is not required to present or discuss reviewed interpretation.

Supply only privacy-safe aggregate SVD diagnostics to narrative generation.
Keep observation, user-provided company context, published guidance, hypotheses,
and recommended verification distinct. Similar retained-component profiles do
not establish response redundancy or interchangeable question content.
SVD labels are tentative; component signs/order do not prove stable constructs.
Knowledge Vault research can inform interpretation and a useful question, not
establish that a model is valid or that a local cause has been identified.

When applicable research supports a discriminating request, proactively ask for
specific missing company information or an authorized external source. Explain
what it could change. Do not collect unnecessary employee data or send company
context/results to public search. Interpretive context stays out of SVD inputs;
only eligible numeric survey questions may be added through an approved amendment.
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
permit unsupported conclusions. In chat, show the interpretation immediately
below the inline chart and before component summaries. For explicitly
requested HTML with fitted SVD, show it below Item weights by component, inside
Centered SVD exploration and before Component summaries. Keep its navigation
anchor. Code-only reports retain a separate not-run interpretation
section, including the explicit unavailable state when
research or fitted results are missing.

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
and approval actions `interpret` and `share`. Use the default `--delivery chat`
to record the reviewed narrative and discuss it inline without HTML or a ZIP.
This regenerates aggregate artifacts without refitting or rereading respondent
data. Use `--delivery report` only for an explicitly requested HTML export.
When research retrieval is unavailable, retain meaningful diagnostics but mark
research-backed interpretation unavailable and do not invent citations.
