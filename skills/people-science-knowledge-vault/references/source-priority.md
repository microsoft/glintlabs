# Source priority

See `catalog.json` for the machine-readable list of resources and
`prioritized-resources.md` for a human-readable, ranked view of the same data.
This file is the authoritative retrieval contract; the other two files are
generated or curated views that must never override it.

## What this hierarchy governs

This contract ranks published research and guidance, including the research
required to interpret user-authorized Glint screenshots or aggregate results.
User evidence establishes only what is observed in its displayed scope; it is
not another research collection and never proves a local cause.

For product mechanics, verify current official documentation for the specific
product, program, metric, and role. Research collection rank cannot override
current product definitions or privacy controls. Glint, Pulse, and 360 guidance
is not interchangeable. Distinguish product documentation from research findings.

## Collection precedence: new catalog before the original vault

Filter for relevance and applicability before ranking. Among sources that answer
the question, use this order:

1. **New catalog:** the reviewed published Research Drops registered with
   `group: research-drop` in `theme-index.json`.
2. **Original vault:** the `catalog.json` resources, retaining their existing
   column-J order: `top5` / `curated`-equivalent > `high` > `medium` > `low`.

The collection preference is an explicit user-directed retrieval policy, not a
claim that every Drop is newer, stronger evidence, or suitable for every question.
An irrelevant Drop never displaces applicable vault documentation or research.
Preserve populations, methods, dates, product validity, and contradictory evidence.
Within the new collection, use relevance; do not invent workbook priorities.
A Drop's null `priority_tier` means no workbook rank, not lower global priority.
Unreviewed live discoveries do not automatically join the new catalog.

Start with the small linked topics/source pages in `README.md`; consult
`corpus-guide.md` for scope. The generated `topic-lookup.md`, `theme-lookup.md`,
and `theme-index.json` are optional bulk views when full retrieval is supported.
These repository files and their public source links do not depend on private
SharePoint or a local extraction cache. Ownership records are provenance only.
`prioritized-resources.md` lists only the original vault and preserves its order.

## Original-vault source: the repository context catalog

Use this context folder's `catalog.json` for original-vault metadata. Its priorities
were derived from the publisher's saved `External` worksheet and do not
require access to that workbook. Normal users must not refresh a private
workbook, retrieve ownership records, or install Work IQ.

If the review is old or coverage is insufficient, check the public sources
below and disclose the review date and any gap. Workbook maintenance belongs
to authorized publishers, separately documented in the repository's
`references/maintenance/knowledge-vault/README.md`; it is not a public runtime
dependency.

### Within the original vault: column J drives priority, not channel

Column J, `Priority to add to context library`, is the authoritative ranking
signal within that collection. Its levels are the tier order stated above.

`catalog.json` carries this as each entry's `priority_tier` field. When two
original-vault resources could both answer a question, prefer the higher
`priority_tier`; this does not override the new catalog's collection precedence.

Curated resources (outside the External-tab snapshot, hand-selected by the content owner) rank with top5. Cite and retrieve the public link, not private ownership records.

### Publisher-approved first-party public summaries

The original vault also includes explicitly approved repository publications
with channel `repository-publication` and priority `curated`. The current
[Human Judgment in AI Evaluation](https://raw.githubusercontent.com/microsoft/glintlabs/main/publications/people-science/human-judgment-in-ai-evaluation.md)
source is a standalone public prose summary of a proposed practitioner framework.
It is guidance, not a new empirical study or a validated rating instrument.

Retrieve the complete public summary before using its claims. Cite that edition
and stay within its content; do not request the underlying full paper, infer
missing figures, or treat its cited research as independently verified. These
sources require explicit publisher approval and an exact registered public URL;
arbitrary repository files and private intake remain ineligible. A repository
source review is not a claim that its public URL was checked before publication.

## Secondary, supplementary check: live Microsoft sources

These live sources are useful **in addition to** the combined reviewed index, mainly to catch
material published after `retrieved_at`, or when the snapshot plainly lacks
coverage of the question:

- Microsoft Viva Blog category page:
  `https://techcommunity.microsoft.com/category/microsoft-viva/blog/microsoftvivablog`
  - Treat every article discoverable through this category and its
    pagination as eligible evidence. Retrieve the full published article body
    before using it; category cards, search snippets, titles, and metadata
    are discovery aids, not sufficient evidence by themselves.
- Official Microsoft Learn and Adoption Center documentation:
  `learn.microsoft.com/en-us/viva/glint/*`, `learn.microsoft.com/en-us/viva/pulse/*`,
  `adoption.microsoft.com/*`.

Do not present a live-only check as if it were the full vault; when you use
one, say so explicitly in the coverage note, since it is not re-ranked by
column J.

## Explicit exclusions

Private publisher workbooks, unpublished drafts, internal-only records, and private
extraction caches are not eligible research-library evidence. User-authorized
organizational context is separate from this research-library exclusion and
remains subject to the optional WorkIQ rules above. Only the publisher's
`External` worksheet informs the saved original-vault catalog; maintenance
must not import other worksheets.

Authorized user screenshots, aggregate results, and analysis artifacts remain
separate case evidence, handled under the skill's privacy and analysis boundaries.
They must not be added to the public library or sent to public research queries.

## Precedence and deduplication

1. Canonicalize URLs by removing tracking parameters and normalizing host/path.
2. Deduplicate identical articles across the catalog, reviewed index, and any live
   checks.
3. Filter relevance and applicability, prefer registered new-catalog Research
   Drops, then retain `top5` / `curated`-equivalent > `high` > `medium` > `low`
   within the original vault. Use relevance within equal priority.
4. When sources disagree, describe methodological and contextual differences
   rather than silently blending them or treating collection rank as proof.
   Apply the preference only among sources applicable to the claim.
