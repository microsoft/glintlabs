# People Science corpus guide

This repository contains the reviewed discovery context. Start with the
[topic-first directory](topic-lookup.md), then open the linked
[source profiles](theme-lookup.md) and public publications. These files work
directly on GitHub in this skill's `references` folder; no local download folder, private
SharePoint access, transcript cache, or script execution is needed to browse.

The [context entry](README.md) provides small topic and source pages for
link-only retrieval. No ZIP, local installation, or repository clone is required.
The context is a reviewed navigation layer, not a copy of every original asset.
For substantive claims, retrieve the linked public source and confirm its body
and applicability. An inaccessible publication remains an explicit retrieval gap,
not permission to supply its claims from general knowledge.

## What is included

Current registered coverage, including the approved November 2026 public summary:

| Collection | Inventory | Reviewed resources | Source-level summaries |
| --- | ---: | ---: | ---: |
| Original vault | 40 | 39 | 430 |
| New Research Drops | 17 | 17 | 167 |
| Combined | 57 | 56 | 597 |

The October review recorded 550 entries, with ten per accessible resource.
The November 10 source-driven review produced 589 entries across 55 reviewed
resources, ranging from two to 26 per accessible resource.
Twenty-one resource counts decreased, nine stayed unchanged, and 25 increased.
These counts describe editorial coverage, not a quota for additions or updates.
Use as many distinct, grounded themes as each source warrants, without padding
or cutting useful material. Themes distinguish findings, frameworks,
recommendations, methods, commentary, hypotheses, case studies, documentation,
and signposts. **597 entries do not mean 597 distinct ideas or 597 independent
findings.** Editorial theme counts are not statistical estimates of conceptual
diversity.

All 55 article/PDF bodies in that re-review were retrieved and text-reviewed.
The 35 existing recording-backed themes retain their prior evidence; recordings
were not replayed for this re-review. Selected PDF figures were inspected, but
image-only figures and linked assets were not comprehensively refreshed.
Per-resource asset scopes disclose these boundaries. The change combines removal
of the quota with current-source review; it does not isolate a causal effect of
the quota or demonstrate improved assistant answer quality.

The approved first-party
[Human Judgment in AI Evaluation public summary](https://raw.githubusercontent.com/microsoft/glintlabs/main/publications/people-science/human-judgment-in-ai-evaluation.md)
adds eight grounded themes. Its complete repository source was reviewed
separately; this does not refresh the earlier sources or certify a live URL
before publication. It proposes a practitioner framework, not new empirical
findings or a validated instrument. The summary is the eligible source edition;
the underlying full paper, figures, and references are not hosted or required.

The original series-directory URL redirects to a general Viva landing page.
It has zero themes and a recorded gap, rather than inferred themes.
The high-performance guide has a recovered official public PDF URL; its original
catalog URL is preserved separately. Four original-vault companion webinars have
reviewed machine transcripts with public recording links and timestamps.

The machine-readable [theme index](theme-index.json) preserves public source
URLs, summaries, context, shared topics, study families, asset scope, short
evidence anchors, and provenance hashes. The original [catalog](catalog.json)
provides saved public metadata. Workbook snapshots and ownership records are
publisher-maintenance inputs, not public runtime dependencies.

See [link-only use](public-use.md) for capability requirements. Approved text
alternatives, when available, are listed in [media alternatives](media-alternatives.json).
No recording transcript is currently approved for redistribution in this library.

## Why 42 original files become 17 Drops

The original Research Drops package contained:

| Asset type | Files |
| --- | ---: |
| Word blog documents | 17 |
| PowerPoint presentations | 16 |
| Audio episodes | 8 |
| Shortcut to the September 2024 presentation | 1 |
| Total | 42 |

These are multiple formats of 17 drop bundles, not 42 independent research
resources. For example, May 2026 has a blog, slides, and audio but one profile.
The profile's citable grounding is the corresponding published
article, including its reviewed public figures.

The original-asset audit informed coverage and exclusion decisions. It does not
certify that the public articles preserve every unique slide, chart, appendix,
note, or spoken detail. The 167 Drop themes are not 420 file-level themes, and
neither the source files nor private extraction caches are required or shipped.

## Topic alignment and overlap

Use the shared topics as the normal entry point; retain source-level entries in
the background for provenance and nuance. Topic tags are many-to-many and are
not replacements for the original catalog's broad categories.

The reviewed index has 33 topics, with 31 represented in both collections.
The Glint administration and Pulse administration topics currently occur only
in the original vault; Research Drops are not assigned those operational tags
merely because they discuss surveys or feedback.
Thirteen of the 17 Drops link to at least one study family already represented
in the original vault. The generated topic directory and CLI `--coverage`
recompute these descriptive counts from the index.

This is not a claim-level duplicate assessment. Broad tag overlap does not prove
identical findings, and different analyses of one sample are not independent
replications. April/May 2026 also incorporate a later sample, so shared lineage
does not make their content wholly redundant.

Examples of substantial overlap include AI transformation profiles with the
employee-reactions deck/readiness eBook, and HR/IT collaboration with the
existing HR/IT deck and webinar. Later Drops add analyses of AI feedback,
metacognition, leadership, friction, and value that are not interchangeable with
the original agentic-teaming Chapter 4. The original vault retains substantially
more operational coverage of administration, privacy, benchmarks, and survey
design.

Preserve these distinctions when tagging:

- `privacy-confidentiality`: general data privacy, survey confidentiality, and
  access controls. Use `ai-governance` only for AI-specific oversight and risks.
- `growth-development`: general career development and learning opportunities.
  Do not automatically classify these as `ai-skills`.
- `meaningful-work`, `role-clarity`, `empowerment`, and `connection`: explicit
  People Success concepts alongside existing `wellbeing`.

When answering, consolidate repeated ideas into concise takeaways and show
additional nuance or conflicting evidence separately. Deduplicate claims in the
answer without deleting source provenance. Do not invent a redundancy percentage
or a smaller set of supposedly unique claims: no claim-level semantic
consolidation has been certified.

## Retrieval priority

Filter relevance and applicability first. Then prefer the registered new
Research Drops over original-vault resources. Inside the original vault retain
the existing order: `top5` / `curated`-equivalent > `high` > `medium` > `low`.
The original catalog values and ordering are not rewritten.

A Drop's null workbook priority means it has no column-J rank, not that it is
globally low priority. Unreviewed live discoveries do not automatically inherit
the new collection's priority. The preference selects lead sources; it does not
make them more causal, current, or scientifically authoritative.

See the authoritative [source-priority contract](source-priority.md).

## External-facing content and evidence limits

Research Drops are externally facing. An appendix is not inherently internal:
an externally published appendix is eligible. Exclude explicitly internal-labeled,
unpublished sections, speaker notes, reviewer comments, ownership records, and
personal or customer-identifying material, not whole Drops merely because their
originals lived in SharePoint. Use the reviewed published counterpart to bound
what can enter this public lookup.

Keep sample, geography, date, product, and design limitations with each claim.
In particular:

- Shared publications are not independent studies. The registered family links
  preserve reused samples and distinguish analyses with different subsets.
- RIVA measures perceived individual AI benefits, not audited financial ROI.
- The April/May 2026 snapshots use independent samples, not repeated participants.
  May's separate adjusted associations are not unique causal contributions.
- Do not turn associations about safety, training, friction, retention, or value
  into causal prescriptions or validated individual predictions.
- Machine transcription/OCR can omit or misread words and numbers. Transcript
  review does not certify visual-only demos or other unreviewed linked assets.
- A source hash identifies a reviewed extraction; it is not a freshness check.
  An `L` locator belongs to that extraction, not browser source lines. Use the
  short anchor to find the passage in the public body. `p` means PDF page; `s`
  means reviewed transcript segment with a public recording and start time.

Other full article bodies, original Office/audio files, private links, and machine
transcripts are not republished here. Public source links remain necessary for
full evidence and current-source verification; the repository supplies portable
discovery context rather than a lossless, offline source archive.
