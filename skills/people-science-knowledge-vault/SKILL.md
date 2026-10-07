---
name: people-science-knowledge-vault
description: "Find and synthesize externally shareable People Science knowledge. Use when the user asks what People Science research, guidance, or published articles say about an employee-experience topic."
allowed-tools: Read, Glob, Grep, WebFetch
---

# People Science Knowledge Vault

Find relevant published knowledge, synthesize it with appropriate caution, and cite
the source articles directly. For complex or ambiguous research questions, act as a
researcher/consultant and work the scope out with the user before answering (see
Step 0 below). The skill defines the source hierarchy and answer contract, and
ships a generated catalog of already-known resources
(`references/catalog.json`, rendered for humans in
`references/prioritized-resources.md`), a saved copy of the live workbook's
`External` worksheet (`references/external-tab-snapshot.json`), and the
retrieval rules in `references/source-priority.md`.

## Use when

- the user asks what published People Science guidance says about a topic
- the user wants relevant Viva or People Science articles
- the user wants an evidence-backed summary from externally shareable sources
- the user asks for source material that can be shared outside Microsoft

Do not use this skill for raw survey analysis, analysis QA, or interpretation of an
`analysis-manifest.json`. Use the dedicated analysis skills for those jobs.

## Required source priority

Inspect `references/` first, especially `source-priority.md`. Use
`references/prioritized-resources.md` for a quick, human-readable view of
already-known resources, and `references/catalog.json` if you need the same
list in a structured form with `priority_tier` and `research_questions`
fields. `references/external-tab-snapshot.json` is the saved, raw copy of the
workbook's `External` worksheet that `catalog.json` is derived from.

Resources are ranked by a single scale, taken from the workbook's
`Priority to add to context library` column (column J) and carried in
`catalog.json` as `priority_tier`:

1. **`top5`** - the small set of resources judged most essential.
2. **`high`**
3. **`medium`**
4. **`low`**
5. **`curated`** - hand-selected resources confirmed by the content owner as
   high-value that are not present in the workbook snapshot at all; treat
   these as roughly `top5`-equivalent in authority.

Prefer the higher `priority_tier` resource whenever more than one could answer
the question. See `source-priority.md` for the full routing table of which
`theme` to reach for given a research question, the supplementary curated
resources, and the secondary live-retrieval checks (Microsoft Viva Blog
category page, Microsoft Learn, Adoption Center) that are useful for material
published after the snapshot was taken, but are not re-ranked by column J.

Do not use workbook rows from any worksheet other than `External`.

## Retrieval process

### Step 0: sense intent before answering

Many questions this skill receives look simple but are not. Before
retrieving anything, check whether the question:

- Uses a value-laden or ambiguous term (e.g., "good", "effective", "ready")
  whose meaning the user hasn't defined yet.
- Spans a process with distinct phases or stakeholders (e.g., an AI rollout
  has very different implications pre-launch vs. post-adoption; HR and IT may
  want different evidence).
- Could reasonably be answered several different, mutually exclusive ways
  depending on unstated context (audience, timeframe, desired outcome).

If so, **do not retrieve-and-answer in one pass.** Act like a researcher and
consultant: name the ambiguity you see, propose how you'd disambiguate it,
and ask 1-3 concrete clarifying questions, treating the user as a thought
partner working toward the answer together. Only proceed straight to
retrieval for narrow, well-scoped factual questions (e.g., "What does the
Glint benchmark documentation say about sample size thresholds?").

Once the question's scope is clear (either because it was narrow to begin
with, or after the user has answered your clarifying questions), continue
with the steps below.

### Steps 1+: retrieve and synthesize

1. Translate the (now-scoped) question into a small set of specific concepts
   and close variants.
2. Use `source-priority.md`'s routing table to identify which `theme`(s) in
   `catalog.json` are in scope, then filter and sort candidate entries by
   `priority_tier` (`top5` > `high` > `medium` > `low`, `curated` treated as
   `top5`-equivalent).
3. Retrieve the full published article body for each relevant candidate
   URL. Catalog/snapshot metadata helps route retrieval but is not a
   substitute for article evidence.
4. If the snapshot plainly lacks coverage, or the question needs material
   newer than the snapshot's `retrieved_at` date, run the secondary live
   checks described in `source-priority.md` (Viva Blog category page,
   Microsoft Learn, Adoption Center) and say explicitly that you did so.
5. Deduplicate by canonical article URL. If a resource appears in more than
   one place, treat it at its highest `priority_tier`.
6. Synthesize only claims supported by retrieved article bodies and attach
   citations directly to those claims.

If pagination, authentication, or connector limits prevent complete source
retrieval, state the coverage gap. Never claim the full vault was searched
when it was not.

## Output format

When Step 0 determined the question needs disambiguation first, respond as a
thought partner instead of a finished report:

```markdown
## Let's scope this together

<Name the ambiguity you see and why it matters for the answer.>

1. <Clarifying question 1>
2. <Clarifying question 2>
3. <Clarifying question 3 (optional)>

<Optional: a tentative framing or starting hypothesis to react to.>
```

Once the question is scoped (narrow to begin with, or clarified by the
user), use the full evidence-backed summary format:

```markdown
## People Science knowledge summary

<Direct answer in two or three sentences.>

### <Finding>

<Concise synthesis with appropriate context and limitations.>

**Sources:** [Article title](URL); [Article title](URL)

### <Finding>

<Concise synthesis.>

**Sources:** [Article title](URL)

**Coverage:** <Sources searched, priority tiers used, and any material retrieval limitations.>
```

## Guardrails

- Use only externally published article bodies for substantive evidence.
- Never use rows from `All Items`, `Internal PSEs & POVs`, or any other workbook
  worksheet; the vault treats only article records from the `External` worksheet
  as eligible evidence.
- Do not skip Step 0 on complex or value-laden questions just to answer faster;
  a wrong-scope answer is worse than a short clarifying detour.
- Do not expose unpublished drafts, internal-only links, participant identities,
  customer-identifiable information, or employee-identifiable information.
- Distinguish research findings from recommendations and author commentary.
- Do not convert correlation or descriptive evidence into causal claims.
- Preserve the population, date, product context, and limitations of each article.
- Do not fabricate article text, statistics, quotations, authors, or publication
  dates.
- Keep quotations short and link to the complete published article.

## Future extension points

- [Done] Generated catalog of canonical URLs and article metadata
  (`references/catalog.json`, `scripts/build_knowledge_vault_resources.py`).
- [Done] Duplicate detection against `analyze-survey`'s source index
  (`check_catalog_matches_source_index` in the build script and
  `tests/test_knowledge_vault_catalog.py`).
- [Done] Retrieval-quality tests covering catalog integrity, workbook-schema
  consistency, and generated-file freshness (`tests/test_knowledge_vault_catalog.py`).
- Add a true automated refresh and dead-link check that fetches each catalog URL
  over the network on a schedule (the current staleness check only compares dates,
  it does not re-fetch pages).
- Add topic aliases for common synonyms (e.g., "manager effectiveness" vs.
  "people leader effectiveness") to improve retrieval-query translation.
- Add a reviewed cache of article bodies if repository policy permits it.
