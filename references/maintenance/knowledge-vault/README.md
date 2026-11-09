# Publisher-only Knowledge Vault maintenance

These instructions are for authorized publishers, not skill users. These files,
private ownership fields, extraction caches, and repository scripts are not
part of the link-only runtime context. Public users need only the skill link
and an assistant with compatible public-source retrieval tools.

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
guide. This folder's catalog retains ownership provenance; the catalog builder
exports only public fields to `skills/people-science-knowledge-vault/references/catalog.json`.

## Review and regeneration

Retrieve the full public source and review body, figures, context, and any
claimed media coverage. Update themes, evidence hashes, anchors, review dates,
and study-family links. Never infer content for an inaccessible resource.
Keep catalog titles/URLs/priorities synchronized with `analyze-survey`.

```text
python scripts/build_knowledge_vault_resources.py
python scripts/search_knowledge_vault.py --write-reference
python scripts/check_knowledge_vault_context.py
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
and review date in the public context's `media-alternatives.json`, with `redistribution_verified: true`
only after human review; retain source attribution, review
date, coverage, and a SHA-256 hash. Do not add private material or claim coverage
of figures/video from audio text alone. Unverified assets stay explicit gaps.

No approved transcripts are available at this revision. Do not create or ship
them without verified permission.

Each `approved` entry requires `resource_id`, `source_url`, `path` (under
the skill's `references/media/`), `sha256`, `redistribution_verified`, `permission_url`,
`permission_summary`, `permission_reviewed_at`, `text_reviewed_at`, `coverage`
(`complete-audio-transcript` or `bounded-audio-excerpt`), and `coverage_notes`.
Dates use `YYYY-MM-DD`. Remove that resource's `gaps` entry only when its approved
text passes the context checker. The gate enforces a recorded human decision; it cannot
independently determine legal permission from a URL.

## Publish the link-only library

Commit the regenerated skill `references` folder with its source changes, run the focused
tests and context checker, and merge the reviewed PR. No ZIP, release tag,
download artifact, or per-user installation is part of this workflow. The
stable skill link reads main; branch/tag/commit links must keep context on
the same ref. Raw links support agents that cannot extract GitHub's page UI.

The small entry, topic pages, and source pages are generated from the full
reviewed index. Keep them within the checker budget so ordinary web retrieval
does not need to load the large combined indexes. Do not silently drop sources,
priorities, study-family context, or existing recording gaps to meet that budget.
CI validates the link graph and permission records on PRs and runs content-aware
public-source checks weekly. It does not publish an executable hosted assistant
or guarantee that every chat host can follow a URL.
