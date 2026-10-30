# People Science Knowledge Vault references

This folder defines the source hierarchy for `people-science-knowledge-vault`.

For repository-only discovery, read the [corpus guide](corpus-guide.md), browse
the [topic-first directory](topic-lookup.md), then open linked
[source profiles](theme-lookup.md) and their public publications. These files
ship with the skill and work directly on GitHub without private SharePoint,
local download folders, or extraction caches.

Start with `source-priority.md`. It is the authoritative retrieval contract:
relevant new-catalog Research Drops precede original-vault resources, whose saved
External column-J priorities remain unchanged, with curated additions treated as
top5-equivalent. It also defines supplementary
published-source checks, exclusions, and refresh rules.

Other files in this folder are generated or curated views of that same contract,
not replacements for it:

- `catalog.json` - a canonical, structured catalog of already-known resources
  (id/title/url/tier/theme/description), tagged by priority tier. It is kept in
  sync with `skills/analyze-survey/references/people-science-source-index.json`
  by `scripts/build_knowledge_vault_resources.py`, which fails if the two drift.
- `prioritized-resources.md` - a generated, human-readable ranked table built from
  `catalog.json`. Regenerate it with
  `python scripts/build_knowledge_vault_resources.py` after editing `catalog.json`;
  do not hand-edit it.
- `workbook-schema.json` - a machine-readable description of the People Science
  content workbook (worksheet name, expected columns, exclusions, observed date and
  record count, staleness rule), so workbook drift can be checked mechanically
  instead of only in prose.
- `theme-index.json` - reviewed ten-theme profiles for accessible catalog resources
  and 17 published Research Drop counterparts, with shared topics, evidence
  anchors/hashes, source context, study-family overlap, asset scope, and explicit
  gaps. This is editorial synthesis, not a full-text cache or a priority override.
- `theme-lookup.md` - generated, browsable view of that index. Read or search this
  file directly when the skill is installed without repository scripts.
- `topic-lookup.md` - generated concept-first directory linking shared topics to
  profiles in both collections, with recomputed overlap counts and research
  lineage. This is the normal browsing entry point, not 550 supposedly unique
  ideas.
- `corpus-guide.md` - reviewed collection scope, 42-files/17-bundles explanation,
  priority decisions, topic alignment, overlap interpretation, and exclusions.

## Searching and maintaining the theme lookup

From the repository root:

```text
python scripts/search_knowledge_vault.py "manager burnout"
python scripts/search_knowledge_vault.py --topic ai-skills --kind finding --group research-drop
python scripts/search_knowledge_vault.py --resource research-drop-4518613 --json
python scripts/search_knowledge_vault.py --topics
python scripts/search_knowledge_vault.py --coverage
python scripts/search_knowledge_vault.py --check
```

Queries require all non-stopword concepts to match within a resource, including
small documented aliases such as burnout/wellbeing and attrition/retention. Matching
themes are shown under that resource. Among relevant resources, existing catalog
tiers remain unchanged, but relevant new-catalog Drops precede the entire original
vault collection. Their null workbook tier is not a low global rank. `--limit` limits
resources, not their themes. No matches exit 1; invalid input, evidence gaps, or
validation errors exit 2 with an explanation.

Topic tags are many-to-many, not replacements for catalog categories. General
data privacy, confidentiality, and access controls use `privacy-confidentiality`;
`ai-governance` is reserved for AI-specific oversight and risks. General career
development uses `growth-development`, not automatically `ai-skills`. Additional
People Success concepts have explicit `meaningful-work`, `role-clarity`,
`empowerment`, and `connection` tags alongside existing `wellbeing`.

To refresh, retrieve the full public source and explicitly review body, context,
figures, and any claimed media coverage. Update the ten editorial themes,
provenance hashes, evidence anchors, and shared-study links in `theme-index.json`;
never fill an unavailable resource with inferred content. Keep canonical catalog
titles/URLs/priorities synchronized. `catalog_sha256` covers those public fields
and detects inventory/priority changes, not online freshness.

Regenerate both readable lookups with
`python scripts/search_knowledge_vault.py --write-reference`. Then run
`python -m pytest tests/test_knowledge_vault_catalog.py tests/test_knowledge_vault_themes.py`.
If the reviewed public-body extraction cache is available, also run
`python scripts/search_knowledge_vault.py --check --bodies-dir PATH_TO_CACHE`
to verify the extraction hashes and every anchor against its declared line/page
or reviewed transcript segment.
The cache format has `status`, `sha256` (retrieved response bytes), `body`,
`final_url`, and optional PDF `pages` with `page`/`text`; filenames are recorded
as basenames in each resource's provenance. Do not commit the full-body cache.
Reviewed webinar caches have `status: machine_transcribed`, the clean public
recording `url`, and `segments` with `text`, `start`, and `end`. Their separate
provenance hashes the serialized segments, not the original video bytes.
Recording-backed themes carry an `s` segment locator and exact `start_seconds`.
Review the complete transcript before marking it reviewed; transcription alone
is not review, and visual-only content remains outside that audio review.
Ordinary `--check` validates structure and generated-file freshness; it does not
re-fetch URLs or independently re-verify unavailable source bodies.

Do not add internal or unpublished material to this folder. See
`tests/test_knowledge_vault_catalog.py` for the checks that enforce catalog
integrity and consistency with the workbook schema and `analyze-survey`'s index,
and `tests/test_knowledge_vault_themes.py` for theme coverage, evidence, and lookup
behavior.
