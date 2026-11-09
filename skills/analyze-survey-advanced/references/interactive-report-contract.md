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

## SVD visual presentation

Follow the basic report's factor-analysis layout: aligned horizontal item bars
across components, then component cards with explained variance and the five
highest-magnitude items. Use one shared item order based on Component 1.
Bars show absolute **SVD unit weights** on a common 0-1 scale; labels and full
exports preserve signs and precision. Do not call them factor loadings or
reuse factor-loading strength thresholds. Signs are orientation, not good/bad.
Use formatted feature IDs when full question wording is unavailable, retaining
original IDs in the full signed-weight table.

Show component variance as a percentage of response variation, not employees,
practical importance, or a confirmed construct. Keep full variance/weight tables
and raw diagnostics in an expandable numeric-details section. Chart PNG and
complete weight-table CSV/PNG exports include the run/config context and all
computed items, not just the five-item card summaries. A not-run decomposition
shows an explicit message, not empty or fabricated charts.

After the component cards, show **Question-removal recommendations**. Distinguish
an incomplete assessment, a reviewed no-removal outcome, evidence gaps, and
named removal recommendations. Never derive removal from SVD weight thresholds.
Show the question, decision, reason, and retained alternative; make the reviewed
redundancy, coverage, stability evidence and protected-item list inspectable.
These are analyst-reviewed assessments, not independently verified tests.
With no attached review, explicitly recommend no removals because the evidence
is insufficient, not because all items are proven necessary. Reviewed results
have CSV/PNG and JSON downloads; the allowlisted ZIP includes
`question-removal-review.json` only when a validated review exists. A stale
review, protected-item removal, or removal of its retained representative
blocks serialization. Rendering this section must not fit or change a model.

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
