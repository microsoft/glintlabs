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

Use published guidance to help review a questionnaire's purpose, wording, and
topic coverage, even before response data is available. Ask for the actual items
before recommending specific removals or additions. Do not use this skill for raw
survey analysis, analysis QA, or interpretation of an `analysis-manifest.json`.
Route quantitative analysis of the user's survey data to `analyze-survey` when
that skill is available; do not imply it has been connected when it has not.

## Required source priority

Inspect `references/` first, especially `source-priority.md`. Use
`references/prioritized-resources.md` for a quick, human-readable view of
already-known resources, and `references/catalog.json` if you need the same
list in a structured form with `priority_tier` and `research_questions`
fields. `references/external-tab-snapshot.json` is the saved, raw copy of the
workbook's `External` worksheet that `catalog.json` is derived from.

First filter relevance and applicability, then prefer the new catalog's reviewed
Research Drops over original-vault resources. Collection priority is a retrieval
preference, not proof of evidence quality or current product validity. Do not
force an irrelevant Drop into an answer.

Within the original vault, preserve the scale taken from the workbook's
`Priority to add to context library` column (column J) and carried in
`catalog.json` as `priority_tier`:

1. **`top5`** - the small set of resources judged most essential.
2. **`high`**
3. **`medium`**
4. **`low`**
5. **`curated`** - hand-selected resources confirmed by the content owner as
   high-value that are not present in the workbook snapshot at all; treat
   these as roughly `top5`-equivalent in authority.

Prefer the higher `priority_tier` among relevant original-vault resources, after
the new catalog's collection precedence. See `source-priority.md` for which
`theme` to reach for given a research question, the supplementary curated
resources, and the secondary live-retrieval checks (Microsoft Viva Blog
category page, Microsoft Learn, Adoption Center) that are useful for material
published after the snapshot was taken, but are not re-ranked by column J.

Do not use workbook rows from any worksheet other than `External`.

## Quick theme lookup

Start with the [corpus guide](references/corpus-guide.md) for scope and evidence
boundaries, then the [topic-first directory](references/topic-lookup.md) to find
sources by shared concept. Both are repository-relative, browsable on GitHub,
and bundled with this skill. No local download folder, private SharePoint access,
or extraction cache is required for discovery.

Use `references/theme-lookup.md` to browse ten reviewed, source-specific themes
per accessible resource, or search `references/theme-index.json` by topic,
resource ID, theme label, or summary. Both files ship with the skill; no script
execution is required. The index includes the catalog plus 17 published Research
Drop counterparts. An unavailable webinar-series directory is recorded as a gap
with zero themes, not populated from its unrelated redirect.

Each theme records its kind (finding, recommendation, framework, documentation,
method, commentary, hypothesis, case study, or signpost), shared topic tags, and
a short evidence anchor with a line/page/transcript locator. Read the resource's
context and asset scope, not just the theme label. `L` locators refer to nonblank
lines of the reviewed body extraction, not browser source lines; `p` locators are
PDF pages.
Use the short anchor to locate the passage after retrieving the public source.
For explicitly reviewed webinars, `s` locators identify machine-transcript
segments with a recording URL and start time. Retrieve that recording for
audio-backed claims, not just the recap. Machine transcription can miss words;
it does not certify visual-only content or exact quantitative claims.

These are editorial navigation summaries, not statistically calculated topics or
ten independent findings. Directory and operational pages can have ten supported
topics without containing ten research results. Check `study_families` before
describing agreement as independent empirical corroboration. The index deliberately
excludes internal-labeled sections and unpublished supporting material.

The 550 source-level summaries are not 550 distinct ideas. The 42 original Drop
files were grouped into 17 bundles with ten themes per published counterpart,
not ten per file; this does not certify lossless coverage of slides or audio.
All 33 shared topics occur in both collections, and 13 Drops link to a study
family represented in the original vault at the recorded review. Use the
generated directory/coverage report for current counts. Broad topic overlap and
shared samples do not establish claim-level duplication or independent evidence.
Consolidate repeated ideas in answers while retaining source links, distinct
analyses, caveats, and contradictory results. No redundancy percentage or
claim-level semantic consolidation is certified.

Keep the source-priority contract: relevant new-catalog Research Drops come first;
within the original vault preserve existing column-J priorities. Research Drops
keep null workbook priority, but that is not lower collection priority. Disclose
which collections were reviewed. Neither the themes nor their hashes replace retrieving and
checking the full published body; linked media coverage is explicit and bounded.

When working in the repository, an optional standard-library CLI supports quick
lookup:

```text
python scripts/search_knowledge_vault.py "psychological safety"
python scripts/search_knowledge_vault.py --topic hr-it
python scripts/search_knowledge_vault.py --resource research-drop-4493933
python scripts/search_knowledge_vault.py --coverage
```

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

If missing context would materially change the answer, explain the uncertainty
in plain language and ask the focused questions needed to choose a useful path.
Help the user get started: offer concrete options or a safe first check when
possible, rather than making them design the whole approach. If they say they do
not know where to start, help them decide what to look at; do not repeatedly ask
for the same missing context before offering guidance.

Once the purpose is clear enough to give useful published guidance, retrieve it
and explain what still depends on missing information. Give practical suggestions
without assuming a cause or selecting an intervention that requires an unverified
explanation. Narrow factual questions can proceed directly to retrieval.

### Steps 1+: retrieve and synthesize

1. Translate the (now-scoped) question into a small set of specific concepts
   and close variants.
2. Browse `topic-lookup.md`, or search `theme-index.json` / `theme-lookup.md`,
   across both collections for
   relevant topics and source-specific themes. Catalog categories and research
   questions are navigation aids, not exclusive filters. Prefer relevant new
   Research Drops, then original-vault resources in their unchanged
   `top5` / `curated`-equivalent > `high` > `medium` > `low` order. Read the
   theme kind, context, asset scope, and shared-study links before selecting.
3. Retrieve the full published article body for each relevant candidate
   URL. Confirm that body text was actually returned before citing it or counting
   it as reviewed. Empty/error pages, titles, and search snippets are discovery
   results, not reviewed article bodies. Exclude them from claim support and
   source counts; disclose the gap rather than supplying the article's claims
   from general knowledge. Catalog/snapshot metadata helps route retrieval but
   is not a substitute for article evidence.
   For PDF- or recording-backed themes, also retrieve the declared public
   companion source; a recap alone cannot substantiate recording-only claims.
4. If the combined reviewed index lacks coverage, or the question needs material
   newer than its review date, run the secondary live
   checks described in `source-priority.md` (Viva Blog category page,
   Microsoft Learn, Adoption Center) and say explicitly that you did so.
5. Deduplicate by canonical article URL. Preserve registered collection
   precedence and the highest applicable original-vault tier; do not count
   duplicate appearances as separate evidence.
6. Synthesize only claims supported by retrieved full sources and attach
   citations directly to those claims.
7. Describe how many retrieved sources support the answer and distinguish
   research findings from published recommendations and author commentary. Lead
   with the best-supported pattern and state material disagreement or gaps.
   Agreement between articles does not by itself establish independent empirical
   validation. When one source supports the answer, say so plainly once; do not
   repeat the same finding under another heading.

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

Use plain, conversational language for an HR partner, analyst, or manager. Match
the format to the user's need rather than forcing every follow-up into a research
report. A clarification can be a short explanation, useful starting options, and
the question needed next; it does not need a "scope" heading.

Once there is enough context, lead with the direct answer. For practical requests,
give usable steps, choices, or sample wording. Separate what retrieved sources
say from your suggestions for applying them; published advice is not automatically
a tested intervention. Keep citations beside the claims they support. When drafting
scripts or summaries, keep hypothetical situations conditional and use placeholders
for results that have not been supplied; do not present them as observed team facts.

For a longer evidence summary, a compact format is:

```markdown
<Direct answer, with the key limitation when it matters.>

<Findings or practical guidance in the format that helps the user.>

**Sources:** [Article title](URL); [Article title](URL)

**Evidence:** <Plain-language note on sources reviewed and material gaps.>
```

Use descriptions such as "This comes from one published guide" or "Two retrieved
articles describe this pattern." Do not expose catalog priority labels or internal
routing details unless requested. Keep relevant population, date, product context,
and retrieval limitations; simplifying the language must not hide uncertainty.

For speculative extrapolation, retain the mode's explicit uncertainty, alternative
explanations, and questions to narrow them. Do not cite a hypothesis as though it
were an established finding. Short follow-ups can be concise without repeating a
full evidence summary, provided their evidence and application boundaries remain
clear.

## Guardrails

- Use only externally published article bodies, public PDFs, and explicitly
  reviewed public companion recordings for substantive evidence. Keep recording
  claims tied to recording citations; do not infer them from recap metadata.
- An appendix is not automatically internal. Published appendices are eligible;
  exclude explicitly internal-labeled unpublished sections, private notes,
  reviewer comments, and ownership details. Never retrieve a private original
  merely because it is listed as catalog provenance.
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
  reserved for claims directly supported by retrieved full sources.

## Future extension points

- [Done] Generated catalog of canonical URLs and article metadata
  (`references/catalog.json`, `scripts/build_knowledge_vault_resources.py`).
- [Done] Duplicate detection against `analyze-survey`'s source index
  (`check_catalog_matches_source_index` in the build script and
  `tests/test_knowledge_vault_catalog.py`).
- [Done] Retrieval-quality tests covering catalog integrity, workbook-schema
  consistency, and generated-file freshness (`tests/test_knowledge_vault_catalog.py`).
- [Done] Reviewed ten-theme routing index, public Research Drop lookup, explicit
  coverage gaps, study-family links, and deterministic search
  (`references/theme-index.json`, `scripts/search_knowledge_vault.py`,
  `tests/test_knowledge_vault_themes.py`).
- [Done] Repository-portable corpus guide and generated topic-first directory
  with cross-collection counts and shared research lineage
  (`references/corpus-guide.md`, `references/topic-lookup.md`).
- Add a true automated refresh and dead-link check that fetches each catalog URL
  over the network on a schedule (the current staleness check only compares dates,
  it does not re-fetch pages).
- Expand the lookup's topic aliases as additional reviewed terminology warrants.
- Add a reviewed cache of article bodies if repository policy permits it.
