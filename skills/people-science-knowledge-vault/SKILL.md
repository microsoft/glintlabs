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
`analysis-manifest.json`. If the user wants to create an analysis or deep-dive a
topic in their own survey data, use the `analyze-survey` skill instead.

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
7. Label each finding as **corroborated** (supported by two or more retrieved
   articles) or **single-source evidence** (supported by only one). Lead the
   summary with the strongest corroborated pattern when one exists; state
   plainly when the retrieved evidence does not yet converge. When only one
   article supports the entire answer, state that once in the summary line
   and do not restate the same claim again under a separate finding heading.

If pagination, authentication, or connector limits prevent complete source
retrieval, state the coverage gap. Never claim the full vault was searched
when it was not.

### Optional mode: speculative extrapolation, worked out together

If the user explicitly asks to extrapolate, speculate, brainstorm, or
"be creative" beyond what the retrieved articles directly state (for
example, applying published findings to the user's own situation when no
article covers that specific case), you may enter this mode instead of, or
after, the standard evidence-backed summary. This mode trades source
coverage for exploratory reasoning, so it carries its own rules:

1. Clearly separate what the vault's articles actually say (cited,
   evidence-backed) from what you are extrapolating (uncited, speculative).
   Never attach a `**Sources:**` line to an extrapolated hypothesis.
2. Hedge every extrapolated claim explicitly — use language such as "this is
   one potential explanation" or "speculative, not an established finding."
   Do not state extrapolated hypotheses declaratively.
3. Offer multiple plausible hypotheses rather than converging on one, unless
   the user's answers have clearly narrowed it to a single best fit.
4. Treat this as a multi-turn, collaborative dialogue, not a one-shot
   answer: end your response with 1-3 targeted clarifying questions that
   would help confirm, rule out, or further narrow the hypotheses, and
   revise the working hypothesis as the user answers each one.
5. If the user's answers point strongly toward one hypothesis, say so
   plainly, but keep the overall framing hedged (e.g., "the working
   hypothesis forming here, still speculative, not a confirmed finding...").
6. When extrapolating about why a specific group/score pattern exists and
   the underlying survey dataset is available, check whether verbatim
   comments are available for that group/question before relying solely on
   vault articles and quantitative deltas. If no comment export is present
   in the available data, ask the user whether they have one to provide.
   Comments can corroborate or rule out a hypothesis faster than external
   research alone — but flag any data-quality concerns (e.g., templated or
   role-inconsistent text) plainly rather than treating comments as
   automatically reliable signal.

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
## Cross-source summary

<If 2+ articles support the answer: two or three declarative sentences
stating the strongest corroborated pattern, noting the support count (e.g.
"Two of three retrieved articles indicate...") and any material
disagreement or coverage gap.
If only 1 article is available: a single sentence giving the direct answer
and noting this is single-source evidence — do not restate it below.>

### <Declarative finding>

<Concise synthesis with appropriate context and limitations. Mark as
corroborated or single-source evidence per step 7 above.>

**Sources:** [Article title](URL); [Article title](URL)

### <Declarative finding (omit if only one finding/source total)>

<Concise synthesis.>

**Sources:** [Article title](URL)

**Evidence base:** Reviewed N articles across M priority tiers. <One short
sentence on coverage, disagreement, or retrieval limitations when material.>
```

When in speculative-extrapolation mode, use this collaborative format instead
(repeat across turns as the dialogue narrows):

```markdown
<Optional one-line pivot noting what the user's last answer ruled in/out.>

**Potential explanation N — <short label>**
<Hedged, speculative explanation. No Sources line. Explicitly flagged as
"this is one potential explanation" / not an established finding.>

<Repeat for 2-3 hypotheses, or fewer once the dialogue has narrowed things.>

<1-3 targeted clarifying questions to narrow the hypotheses further.>
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
- Never recommend advanced causal-analysis methods (e.g., logistic regression,
  mediation analysis, dominance/Shapley variance partitioning) against a user's
  survey or attrition data. Survey datasets are rarely complete enough to support
  these methods reliably, and recommending them risks a misleading analysis.
  Prefer descriptive comparisons (correlations, favorability cuts, comment
  themes) instead, and route deeper data work to the `analyze-survey` skill.
- When synthesizing against a user's own retrospective survey/dashboard data (e.g.,
  attrition multipliers), describe it as an association ("employees who responded
  unfavorably show a higher observed exit rate than those who responded favorably")
  rather than predictive/forecasting language ("predicts attrition," "predictor of
  who will leave"). This distinction is about how *we* characterize the user's data;
  preserve a source article's own wording (e.g., "top predictor of voluntary
  attrition") when quoting or citing that article directly.
- Preserve the population, date, product context, and limitations of each article.
- Do not fabricate article text, statistics, quotations, authors, or publication
  dates.
- Keep quotations short and link to the complete published article.
- Only enter speculative-extrapolation mode when the user explicitly asks for
  it; never blend unhedged speculation into the standard evidence-backed
  summary format.
- Never cite a source for an extrapolated/speculative claim; citations are
  reserved for claims directly supported by retrieved article bodies.

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
