# Publisher-only Knowledge Vault maintenance

These instructions are for authorized publishers, not skill users. These files,
private ownership fields, extraction caches, and repository scripts are not
included in the standalone public runtime bundle. Public users need only the
complete skill folder and compatible public-source retrieval tools.

## Original-vault workbook

The source workbook is `People_Science_Content_full_index.xlsx`. Its protected
location and access requirements are recorded in `workbook-schema.json`.
Use only its `External` worksheet. Do not retrieve or import:

- `All Items`
- `Asset List`
- `EVE Delivery Prioritization`
- `Sheet1`
- `Internal PSEs & POVs`
- `Survey Programs`

The workbook is IRM/RMS-protected. Only an authorized Microsoft 365 service
acting under an entitled identity can read it; plain HTTP and local spreadsheet
parsers are not substitutes for access authorization. Do not direct external
users to authenticate to it or work around its protections.

On the schema's 90-day expiry, authorized publishers refresh
`external-tab-snapshot.json`, update the schema's observed date/range/count,
and rederive catalog priorities from column J. The two files live beside this
guide. The repository catalog retains ownership provenance; the bundle builder
exports an allowlist of public fields and omits publisher-only records.

## Review and regeneration

Retrieve the full public source and review body, figures, context, and any
claimed media coverage. Update themes, evidence hashes, anchors, review dates,
and study-family links. Never infer content for an inaccessible resource.
Keep catalog titles/URLs/priorities synchronized with `analyze-survey`.

```text
python scripts/build_knowledge_vault_resources.py
python scripts/search_knowledge_vault.py --write-reference
python scripts/check_knowledge_vault_sources.py --output source-check.json
python -m pytest tests/test_knowledge_vault_catalog.py tests/test_knowledge_vault_themes.py tests/test_knowledge_vault_portability.py
```

The live checker verifies extracted article/PDF evidence anchors and reports
redirects, extraction failures, and media player-only coverage separately.
It does not independently review research, figures, or audio and must not
automatically promote a new source to reviewed.

If a reviewed body/transcript cache is available, optionally run
`python scripts/search_knowledge_vault.py --check --bodies-dir PATH_TO_CACHE`.
Do not commit the cache. Cache basenames/hashes are provenance pointers, not
bundled files or online freshness checks.

## Rights-reviewed text alternatives

Before adding source text, independently verify permission for redistribution
of the particular text/transcript. Public access and the repository MIT license
are insufficient. Record the public permission URL, the reviewed grant/scope,
and review date in `media-alternatives.json`, with `redistribution_verified: true`
only after human review; retain source attribution, review
date, coverage, and a SHA-256 hash. Do not add private material or claim coverage
of figures/video from audio text alone. Unverified assets stay explicit gaps.

No approved transcripts are available at this revision. Do not create or ship
them without verified permission.

Each `approved` entry requires `resource_id`, `source_url`, `path` (under
`references/media/`), `sha256`, `redistribution_verified`, `permission_url`,
`permission_summary`, `permission_reviewed_at`, `text_reviewed_at`, `coverage`
(`complete-audio-transcript` or `bounded-audio-excerpt`), and `coverage_notes`.
Dates use `YYYY-MM-DD`. Remove that resource's `gaps` entry only when its approved
text passes the builder. The gate enforces a recorded human decision; it cannot
independently determine legal permission from a URL.

## Standalone releases

Update `skills/people-science-knowledge-vault/bundle.json`'s version whenever
the bundled payload changes. Build the ZIP with
`python scripts/build_knowledge_vault_bundle.py --output-dir dist`.
CI validates the complete bundle and publishes build artifacts. A publisher
can create a `knowledge-vault-vVERSION` tag to trigger an anonymous-download
GitHub release; the workflow rejects a tag that disagrees with the manifest.
Do not reuse a version for changed content or call a local artifact published.
