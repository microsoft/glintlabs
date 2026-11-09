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
