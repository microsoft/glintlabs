# Source priority

See `catalog.json` for the machine-readable list of resources and
`prioritized-resources.md` for a human-readable, ranked view of the same data.
This file is the authoritative retrieval contract; the other two files are
generated or curated views that must never override it.

## Primary source: the saved External-tab snapshot

The workbook that backs this vault is:

```text
https://microsoft.sharepoint-df.com/:x:/t/EVE/cQpI5FMS_jROSLEqT1-GT-KsEgUClfK5_gr5DhPyL0MFgifvGw
```

Observed workbook name: `People_Science_Content_full_index.xlsx`. Use **only**
the worksheet named `External`. This workbook is IRM/RMS-protected, so it
cannot be fetched with a plain unauthenticated request; see
`workbook-schema.json`'s `access_notes` for how to refresh it.

Rather than re-fetching the live workbook on every retrieval, this skill keeps
a point-in-time copy of every `External` row in
`references/external-tab-snapshot.json`, and a curated, enriched view of the
same rows (plus a few supplementary entries) in `references/catalog.json`.
**Prefer the local snapshot and catalog for normal retrieval.** Only re-open
the live workbook when the snapshot is stale (see `workbook-schema.json`'s
`staleness_check`) or a question needs material published after the
snapshot's `retrieved_at` date.

### Ranking: column J drives priority, not channel

Column J, `Priority to add to context library`, is the authoritative ranking
signal. It has four levels, from highest to lowest:

1. `top5` - the small set of resources judged most essential; always check
   these first and lean on them most heavily.
2. `high`
3. `medium`
4. `low`

`catalog.json` carries this as each entry's `priority_tier` field. When two
resources could both answer a question, prefer the higher `priority_tier`.
A fifth value, `curated`, marks resources that are **not** present in the
External-tab snapshot at all (see "Supplementary curated resources" below) -
treat `curated` as roughly `top5`-equivalent in authority, since these were
hand-selected by the content owner, but note they fall outside the workbook's
own ranking.

### Supplementary curated resources (not in the workbook snapshot)

Two resources predate/sit outside the External-tab snapshot but were
confirmed by the content owner as externally shareable and high-value:

- [Building a holistic employee listening ecosystem](https://techcommunity.microsoft.com/t5/s/gxcuf89792/attachments/gxcuf89792/MicrosoftVivaBlog/894/1/Holistic%20Listening%20Infographic_09292023%201.pdf)
- [Redefining High Performance in the New Era of Work](https://www.microsoft.com/content/dam/microsoft/final/en-us/microsoft-brand/documents/Microsoft-HPO-Guide-Oct-2023.pdf)

The SharePoint/OneDrive originals in `catalog.json`'s `internal_record` field
for these entries (and for the two workbook-sourced `top5` entries below) are
the internal record of ownership/approval, not for retrieval. An automated
retrieval agent generally cannot authenticate into SharePoint/OneDrive, so
**cite and retrieve the public link, not the internal record.**

Two further resources appear in the workbook as `top5` rows whose `URL`
column only holds an internal `.pptx` filename (no public link); their public
PDF substitutes are already catalogued:

- [Research Readout - Agentic Teaming & Trust Research](https://techcommunity.microsoft.com/t5/s/gxcuf89792/attachments/gxcuf89792/MicrosoftVivaBlog/1027.2/2/2025%20Agentic%20Teaming%20%26%20Trust%20Research%20Report%20-%20Chapter%204.pdf)
- [The state of AI change readiness](https://adoption.microsoft.com/files/viva/The-state-of-AI-change-readiness-eBook.pdf)

## Secondary, supplementary check: live Microsoft sources

These live sources are useful **in addition to** the snapshot, mainly to catch
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

## When to use which resource: research-question routing

Each `catalog.json` entry's `theme` and `research_questions` fields capture
*when* that resource is the right one to reach for. The themes group like
this:

| Theme | Reach for this when the user is asking about... |
| --- | --- |
| AI Transformation & Adoption | Whether/how AI helps or harms the organization, what "good" outcomes mean, how sentiment shifts across rollout phases, HR/IT collaboration on AI change |
| Measurement & Benchmarks | How scores compare to benchmarks, benchmark methodology, interpreting score movement |
| Frameworks & Definitions | What People Science is and the methodology behind its claims |
| Psychological Safety & Manager Enablement | How managers build trust and psychological safety on a team |
| Glint <-> Pulse Integration & Templates | Sustaining action-taking with Pulse follow-ups after a Glint survey |
| Survey Design & Methodology | Interpreting survey results in context, designing a survey program's cadence/constructs |
| Adoption & Enablement | HR/IT reactions to AI, organizational AI change-readiness, manager action-taking |
| Microsoft Learn (Glint) Set-up, Deployment | Tactical how-to for configuring, launching, or administering a Glint survey program |
| Microsoft Learn (Pulse) Set-up, Deployment | Tactical how-to for Pulse roles, privacy, or access |
| AI and trust / High performance / Employee listening (supplementary) | Agentic AI trust-building, organizational AI readiness, holistic listening ecosystem design, high-performance org design |

Before searching, use this table (and the complex-question judgment call in
`SKILL.md`'s retrieval process) to decide which themes are in scope, then
filter `catalog.json` entries by theme and sort by `priority_tier`.

## Explicit exclusions

Never retrieve secondary knowledge from these observed worksheets:

- `All Items`
- `Asset List`
- `EVE Delivery Prioritization`
- `Sheet1`
- `Internal PSEs & POVs`
- `Survey Programs`

The workbook may change over time. The rule is based on the worksheet name
`External`, not its current worksheet ID, range, row count, or column order.

## Precedence and deduplication

1. Canonicalize URLs by removing tracking parameters and normalizing host/path.
2. Deduplicate identical articles across the snapshot, catalog, and any live
   checks.
3. Rank by `priority_tier` first (`top5` > `high` > `medium` > `low`, with
   `curated` treated as `top5`-equivalent), then by relevance to the theme(s)
   in scope.
4. When sources disagree, prefer the higher `priority_tier` resource and
   describe meaningful differences rather than silently blending them.
