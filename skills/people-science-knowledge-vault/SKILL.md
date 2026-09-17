---
name: people-science-knowledge-vault
description: "Find and synthesize externally shareable People Science knowledge. Use when the user asks what People Science research, guidance, or published articles say about an employee-experience topic."
allowed-tools: Read, Glob, Grep, WebFetch
---

# People Science Knowledge Vault

Find relevant published knowledge, synthesize it with appropriate caution, and cite
the source articles directly. This skill is an initial scaffold: it defines the source
hierarchy and answer contract, while leaving room for a future indexed catalog,
automated refresh, and richer retrieval.

## Use when

- the user asks what published People Science guidance says about a topic
- the user wants relevant Viva or People Science articles
- the user wants an evidence-backed summary from externally shareable sources
- the user asks for source material that can be shared outside Microsoft

Do not use this skill for raw survey analysis, analysis QA, or interpretation of an
`analysis-manifest.json`. Use the dedicated analysis skills for those jobs.

## Required source priority

Inspect `skills/people-science-knowledge-vault/references/` first, especially
`source-priority.md`.

Use sources in this strict order:

1. **First priority:** every article discoverable from the Microsoft Viva Blog
   category page at
   `https://techcommunity.microsoft.com/category/microsoft-viva/blog/microsoftvivablog`.
2. **Second priority:** only article records from the `External` worksheet in the
   People Science content workbook identified in `source-priority.md`.
3. **Tertiary context:** `references/general/`, only when it does not conflict with
   the published sources above.

First-priority sources outrank second-priority sources when they overlap or disagree.
Do not use workbook rows from any worksheet other than `External`.

## Retrieval process

1. Translate the question into a small set of specific concepts and close variants.
2. Enumerate Microsoft Viva Blog article links from the category page, following
   pagination until no new article links are found.
3. Keep article URLs under the Microsoft Viva Blog path and retrieve the full article
   body for relevant candidates.
4. Resolve the workbook and inspect only its `External` worksheet.
5. Use the workbook's `Title`, `URL`, `Theme`, `Description`, `Skills`, and knowledge
   priority fields to identify relevant second-priority candidates.
6. Retrieve the full published article body from each selected workbook URL. Workbook
   metadata helps route retrieval but is not a substitute for article evidence.
7. Deduplicate by canonical article URL. If an article appears in both sources, treat
   it as first priority.
8. Synthesize only claims supported by retrieved article bodies and attach citations
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

## Future extension points

- Add a generated catalog of canonical URLs and article metadata.
- Add an automated refresh and dead-link check.
- Add topic aliases and retrieval-quality tests.
- Add duplicate detection across the two source tiers.
- Add a reviewed cache of article bodies if repository policy permits it.
