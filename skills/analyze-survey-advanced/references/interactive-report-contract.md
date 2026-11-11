# Advanced report contract

`scripts/build_advanced_analysis_report.py` renders only inspected aggregate
diagnostics into the colocated `report.html`. It never fits/tunes a model and
does not modify the basic golden template, tabs, or narrative defaults.

Use the canonical Glint UI reference and its tokens, Segoe UI, light mode,
accessible labels/focus, non-color status text, responsive dense tables and
offline behavior. Both navigation and content lead with SVD, followed by model
comparison, selected diagnostics, interpretation, methodology/limitations and
downloads. Each section starts with a short, plain-language purpose blurb that
explains what the view shows and how to use it, as in the basic report.
Keep SVD's exploratory limits and any not-run state explicit; leading with
the section does not authorize or imply a decomposition has been run.
Controls select already-computed views; no client-side training or unapproved
subgroup searching. CSV and full-table PNG exports include current context.

Every purpose blurb includes a **How to action these results** block.
Give conditional, practical guidance about interpreting patterns, choosing
bounded next experiments, resolving QA issues, or safely sharing outputs.
These are instructions, not findings about the current dataset or permission
to tune. Do not prescribe causal interventions or employee-level actions from
component weights or predictive importance.

## Header survey overview

Inside the top header, show **Survey name**, **Responses (N)**, **Questions
analyzed** for SVD (or **Predictors analyzed** for predictive models), and
**Response rate**. Use the manifest's aggregate `survey` overview, not browser
calculations against respondent rows. N counts the full input response cohort,
including reserved rows, not independent people or development-only support.
Keep that scope visible and preserve responsive reading order.

Use the confirmed survey name or an unambiguous source cycle title; never use
private filenames or paths as a fallback. Show **Not recorded** for an unknown
name and **Not available** for missing/suppressed counts or rates, not zero.
Response rate needs a confirmed invitation denominator for the same single
survey population and one response per identified respondent. Show the
denominator beside an available rate, or **Invitation count not recorded** when
it is absent. Code-only and legacy manifests without observed cohort metadata
must not fabricate N or response rates. Preserve these states in the share ZIP.

## SVD visual presentation

Show aligned horizontal item bars across components, then a compact component
summary table. Use one row per component, with explained variance and its five
highest-magnitude items (or all items when fewer than five are fitted), retaining
signed unit weights. Give the table CSV/PNG exports and horizontal scrolling on
narrow screens. Use one shared chart item order based on Component 1.
Bars show absolute **SVD unit weights** on a common 0-1 scale; labels and full
exports preserve signs and precision. Do not call them factor loadings or
reuse factor-loading strength thresholds. Signs are orientation, not good/bad.
Use formatted feature IDs when full question wording is unavailable, retaining
original IDs in the full signed-weight table.

Show component variance as a percentage of response variation, not employees,
practical importance, or a confirmed construct. Keep full variance/weight tables
and raw diagnostics in an expandable numeric-details section. Chart PNG and
complete weight-table CSV/PNG exports include the run/config context and all
computed items, not just the five-item summaries. A not-run decomposition
shows an explicit message, not empty or fabricated charts.

After the component summary table, show **Top three candidates for removal review**.
Display the analyst-supplied ordering, fitted question, observed reason, optional
comparison question, and evidence needed before deciding. Never label a candidate
as a removal decision, require every fitted question to be assessed, or imply
all three should be removed together. Known protected questions are excluded and
comparison anchors cannot themselves be shortlisted. Keep the introduction
concise and show incomplete protection/content reviews beside it as plain text,
without a redundant yellow candidate-count badge. Put the complete ranking
basis and limitations in a clearly labeled expandable section; retain them in
JSON and share exports. Show missing-assessment and assessed-zero states
explicitly. Paragraphs and lists use the same available section width, without
a paragraph-only width clamp or text truncation. SVD-profile
similarity is at most exploratory evidence to investigate, not measured response
correlation, duplicate content, or justification to delete.

When context blocks nominations, show **Please provide additional context to help
select the top three candidates for removal review**, a concise decision note
explaining the observation and why selection is pending, and specific requested
inputs. Explain how to reply in the originating chat or attach a question
list/codebook using question ID, exact wording, must-keep status/reason, and
distinct topic/action. Unknowns are allowed; never request employee-level data.
Do not present missing context as "No supported candidates identified."
Preserve up to three supplied `pair_leads` in a separate **Similar pairs to
investigate** table with CSV/PNG exports. Each unordered pair has an observed
reason and evidence needed; label it as a lead with neither member nominated.
Keep the directional shortlist table hidden when no questions are nominated,
not an empty "Not run" table. Retain the assessment JSON download and complete
ranking/limitations disclosure even for zero nominations.
Optional `context_request` and `pair_leads` remain source-bound within
`question-removal-candidates.json` and the manifest/share ZIP. Legacy assessments
remain valid: incomplete review flags plus zero nominations receive context
guidance; completed zero-nomination assessments retain their stated rationale.
Reject repeated/reversed, self, unfitted, or wholly protected pair leads.

Support up to three candidates, a reasoned assessed-zero outcome, and a distinct
not-yet-prepared state. Every completed, QA-eligible SVD analysis, including demos
and structure-only explorations, requires an attached shortlist assessment
before delivery; a missing assessment is an intermediate state, not completion.
If attachment approval is missing, disclose the pending approval. Code-only,
not-run, and QA-ineligible outputs must not invent candidates.
Do not invent candidates to fill three slots. Source-bound
shortlists have full CSV/PNG and JSON exports; long reasons and evidence must
wrap rather than clip in PNGs. The allowlisted ZIP includes
`question-removal-candidates.json` only for a valid attached shortlist. Stale
assessments, duplicate/unfitted/protected candidates, and invalid comparison
anchors block serialization. Existing `item_review`/`question-removal-review.json`
remain compatible historical artifacts, but do not automatically become the
shortlist or replace its candidate framing. Rendering performs no new
statistical tests, ranking calculations, model fitting or question deletion.

Survey-score targets with a verified 1-K scale use the 0-100 transformation
for results and error units. Native targets, AUC, probabilities, explained
variance, component weights and other non-score metrics retain their units.
No cross-item average score/index is generated. Missing/suppressed is not zero.

Share only aggregate metrics and eligible diagnostics. Tiny confusion cells
cause the entire matrix to be suppressed; do not expose its margins. Sparse
calibration bins cause the entire curve to be suppressed. No respondent
predictions, IDs, scores, component scores, raw comments, link keys, estimator
objects or private source paths belong in HTML/JSON/CSV/image exports or ZIPs.
No subset browser filters that could reconstruct hidden results.

The allowlisted package contains `OPEN_REPORT.html`, the distinct
`advanced-analysis-manifest.json`, aggregate diagnostics/comparison files, clean
unexecuted `experiment.ipynb` and `reproduce.py`, placeholder
`experiment-template.json`, and `SHARING_README.txt`. The template retains
source hashes and approved scientific configuration, not actual input locations.
Review feature/target names and narrative text for confidentiality before
sharing. Metadata and models are not automatically anonymous.

`_private` and project `_holdouts` never enter the ZIP. Existing/stale files
are not included unless explicitly allowlisted. Self-contained HTML includes
offline diagnostics downloads; notebook reproduction requires the complete
plugin, its exact engine/runtime and authorized private files.

The default interpretation status is unavailable. A separate reviewed narrative
can be embedded after model QA and the Knowledge Vault evidence review. Missing
research must not be disguised as an AI People Science finding. No external
analytics, remote fonts, network scripts, or employee-data services are included.
