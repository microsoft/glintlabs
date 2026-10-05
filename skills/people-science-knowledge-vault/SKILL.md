---
name: people-science-knowledge-vault
description: "Find and synthesize externally shareable People Science knowledge. Use when the user asks what People Science research, guidance, or published articles say about an employee-experience topic."
allowed-tools: Read, Glob, Grep, WebFetch, Bash
---

# People Science Knowledge Vault

Find relevant published knowledge, synthesize it with appropriate caution, and cite
the source articles directly. This skill defines the source hierarchy and answer
contract, backed by a generated discovery catalog, topic aliases, and a
dedup/dead-link tool; it still relies on live retrieval for evidence.

## Use when

- the user asks what published People Science guidance says about a topic
- the user wants relevant Viva or People Science articles
- the user wants an evidence-backed summary from externally shareable sources
- the user asks for source material that can be shared outside Microsoft

Do not use this skill for raw survey analysis, analysis QA, or interpretation of an
`analysis-manifest.json`. Use the dedicated analysis skills for those jobs.

## Required source priority

Inspect `references/` first, especially `source-priority.md`,
`topic-aliases.md`, and the generated `catalog.json`.

Use sources in this strict order:

1. **First priority:** every article discoverable from the Microsoft Viva Blog
   category page at
   `https://techcommunity.microsoft.com/category/microsoft-viva/blog/microsoftvivablog`.
2. **Second priority:** only article records from the `External` worksheet in the
   People Science content workbook identified in `source-priority.md`.
3. **Tertiary context:** `../../references/general/`, only when it does not conflict with
   the published sources above.

First-priority sources outrank second-priority sources when they overlap or disagree.
Do not use workbook rows from any worksheet other than `External`.

## Retrieval process

1. Translate the question into a small set of specific concepts and close variants.
   Expand it further using `references/topic-aliases.md` so close synonyms (e.g.
   "burnout" / "employee wellbeing") are not missed.
2. Optionally check `references/catalog.json` first as a discovery aid: it is a
   generated, deduplicated index of previously observed articles built by
   `scripts/knowledge_vault_catalog.py`. Use it only to shortlist candidates and
   never as a substitute for live retrieval -- it can be stale, and any entry with
   `"status"` starting with `dead:` or `error:` must be treated as unavailable
   until re-verified.
3. Enumerate Microsoft Viva Blog article links from the category page, following
   pagination until no new article links are found.
4. Keep article URLs under the Microsoft Viva Blog path and retrieve the full article
   body for relevant candidates.
5. Resolve the workbook and inspect only its `External` worksheet.
6. Use the workbook's `Title`, `URL`, `Theme`, `Description`, `Skills`, and knowledge
   priority fields to identify relevant second-priority candidates.
7. Retrieve the full published article body from each selected workbook URL. Workbook
   metadata helps route retrieval but is not a substitute for article evidence.
8. Deduplicate by canonical article URL using the same canonicalization rules as
   `scripts/knowledge_vault_catalog.py` (`canonicalize_url`). If an article appears
   in both sources, treat it as first priority.
9. Synthesize only claims supported by retrieved article bodies and attach citations
   directly to those claims.

If pagination, authentication, or connector limits prevent complete source retrieval,
state the coverage gap. Never claim the full vault was searched when it was not.

## Output format

```markdown
## People Science knowledge summary

<Direct answer in two or three sentences.>

### <Finding>

<Concise synthesis with appropriate context and limitations.>

**Sources:** [Article title](URL); [Article title](URL)

### <Finding>

<Concise synthesis.>

**Sources:** [Article title](URL)

**Coverage:** <Sources searched and any material retrieval limitations.>
```

## Guardrails

- Use only externally published article bodies for substantive evidence.
- Never use rows from `All Items`, `Internal PSEs & POVs`, or any other workbook
  worksheet as second-priority evidence.
- Do not expose unpublished drafts, internal-only links, participant identities,
  customer-identifiable information, or employee-identifiable information.
- Distinguish research findings from recommendations and author commentary.
- Do not convert correlation or descriptive evidence into causal claims.
- Preserve the population, date, product context, and limitations of each article.
- Do not fabricate article text, statistics, quotations, authors, or publication
  dates.
- Keep quotations short and link to the complete published article.
- Treat `references/catalog.json` as a discovery index, never as evidence. Do not
  cite a catalog entry whose `status` is `dead:*` or `error:*` without re-retrieving
  and confirming the article is reachable again.

## Generated catalog and tooling

`scripts/knowledge_vault_catalog.py` operationalizes the deduplication rule in
`references/source-priority.md`:

- `canonicalize_url()` normalizes host casing, strips tracking query parameters, and
  drops a trailing slash so the same article is recognized across the two tiers.
- `build_catalog()` merges Viva Blog and workbook inputs, keeping the first-priority
  tier's title/theme/description when an article appears in both, and recording the
  other tier in `also_listed_in`.
- `check-links` re-checks every catalog URL and annotates `status`/`last_checked` so
  stale or dead links are flagged rather than silently cited.

Regenerate the catalog by re-running `build` against freshly enumerated Viva Blog
articles and a freshly exported `External` worksheet; do not hand-edit
`catalog.json`. `references/catalog.schema.json` documents the record shape.

## Future extension points

- Schedule a recurring `check-links` run and a recurring Viva Blog re-enumeration so
  `references/catalog.json` does not silently go stale.
- Add a reviewed cache of article bodies if repository policy permits it.
- Expand `references/topic-aliases.md` as real queries surface missing synonyms.
