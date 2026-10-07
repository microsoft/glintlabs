# Source priority

See `catalog.json` for the machine-readable list of already-known resources
and `prioritized-resources.md` for a human-readable, ranked view of the same
data. This file is the authoritative retrieval contract; the other two files
are generated or curated views that must never override it.

## First priority: Microsoft Viva Blog

Category URL:

```text
https://techcommunity.microsoft.com/category/microsoft-viva/blog/microsoftvivablog
```

Treat every article discoverable through this category and its pagination as eligible
first-priority knowledge. Retrieve the full published article body before using it as
evidence. Category cards, search snippets, titles, and metadata are discovery aids,
not sufficient evidence by themselves.

The category is a live source. Re-enumerate it for each substantive retrieval or use a
future generated catalog that records when it was refreshed. Do not describe the
corpus as complete if pagination or article retrieval is incomplete.

### Curated externally facing Microsoft resources

These resources are also first-priority sources. The SharePoint and OneDrive links
in `catalog.json`'s `internal_record` field were confirmed by the content owner as
externally facing; sensitivity labels on those stored copies must not be treated
as evidence that publication is prohibited. However, an automated retrieval agent
generally cannot authenticate into SharePoint/OneDrive, so **cite and retrieve the
public link below, not the internal record.**

- [Research Readout - Agentic Teaming & Trust Research](https://techcommunity.microsoft.com/t5/s/gxcuf89792/attachments/gxcuf89792/MicrosoftVivaBlog/1027.2/2/2025%20Agentic%20Teaming%20%26%20Trust%20Research%20Report%20-%20Chapter%204.pdf)
- [The state of AI change readiness](https://adoption.microsoft.com/files/viva/The-state-of-AI-change-readiness-eBook.pdf)
- [Building a holistic listening ecosystem](https://techcommunity.microsoft.com/t5/s/gxcuf89792/attachments/gxcuf89792/MicrosoftVivaBlog/894/1/Holistic%20Listening%20Infographic_09292023%201.pdf)
- [Redefining High Performance in the New Era of Work](https://www.microsoft.com/content/dam/microsoft/final/en-us/microsoft-brand/documents/Microsoft-HPO-Guide-Oct-2023.pdf)

The gated SharePoint/OneDrive originals are retained as the internal record of
ownership and approval, not for retrieval:

- [Research Readout - Agentic Teaming & Trust Research - SharePoint edition](https://microsoft.sharepoint-df.com/:p:/t/EVE/cQo8rhtwEQp7SZ1mDH29q9d-EgUCp5GF8S9cyVEiRqtmuWvNjg)
- [The state of AI change readiness - SharePoint edition](https://microsoft.sharepoint-df.com/:b:/r/teams/EVE/Shared%20Documents/Forms/AllItems.aspx?id=%2Fteams%2FEVE%2FShared%20Documents%2FPeople%20Science%20%F0%9F%A7%91%E2%80%8D%F0%9F%94%AC%2FPS%20Product%20and%20TL%2FAI%20Adoption%20Research%2FFinalized%20Materials%20%2D%20AI%20Readiness%20Research%2FThe%20state%20of%20AI%20change%20readiness%20%28eBook%20%2D%20Aug%202024%29%20Viva%20People%20Science%2Epdf&parent=%2Fteams%2FEVE%2FShared%20Documents%2FPeople%20Science%20%F0%9F%A7%91%E2%80%8D%F0%9F%94%AC%2FPS%20Product%20and%20TL%2FAI%20Adoption%20Research%2FFinalized%20Materials%20%2D%20AI%20Readiness%20Research&p=true&share=cQoOYaEpcMkwRopK9Sr1h%2Dj2EgUCA2ISCikX62Zs3GD5xwsKZw)
- [Building a holistic employee listening ecosystem - SharePoint edition](https://microsoft.sharepoint-df.com/:b:/r/teams/EVE/Shared%20Documents/Forms/AllItems.aspx?id=%2Fteams%2FEVE%2FShared%20Documents%2FPeople%20Science%20%F0%9F%A7%91%E2%80%8D%F0%9F%94%AC%2FPS%20Product%20and%20TL%2FFY24%2FHolistic%20listening%20eBook%2FHolistic%2DEmployee%2DListening%2Debook%2Dfinal%2D2023%2Epdf&parent=%2Fteams%2FEVE%2FShared%20Documents%2FPeople%20Science%20%F0%9F%A7%91%E2%80%8D%F0%9F%94%AC%2FPS%20Product%20and%20TL%2FFY24%2FHolistic%20listening%20eBook&p=true&share=cQr6pCSULloPSoqGk0enM6JhEgUCfsekVZauuEfc5iD8Xa8R0w)
- [Redefining High Performance in the New Era of Work - OneDrive edition](https://microsoft-my.sharepoint-df.com/:b:/r/personal/meganbenzing_microsoft_com/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fmeganbenzing%5Fmicrosoft%5Fcom%2FDocuments%2FAttachments%2FMicrosoft%2DHPO%2DGuide%2DOct%2D2023%2Epdf&parent=%2Fpersonal%2Fmeganbenzing%5Fmicrosoft%5Fcom%2FDocuments%2FAttachments&share=cQrVmWzwLaEAR42Fk6tTP22nEgUC0qh9WCk8ob9yHoELNnWn4A)

## Second priority: Microsoft Learn & Adoption Center documentation

Official Microsoft product documentation under these hosts is directly citable
second-priority evidence:

- `https://learn.microsoft.com/en-us/viva/glint/*`
- `https://learn.microsoft.com/en-us/viva/pulse/*`
- `https://adoption.microsoft.com/*`

This tier formalizes a practice other skills in this repository already rely on
(see `../../analyze-survey/references/people-science-source-index.json`, which
cites several `learn.microsoft.com` and `adoption.microsoft.com` pages). It is
ranked above the workbook because it is public, durable, and does not depend on
internal access, while still being official rather than crawled blog content.

## Third priority: external workbook articles

Workbook URL:

```text
https://microsoft.sharepoint-df.com/:x:/t/EVE/cQpI5FMS_jROSLEqT1-GT-KsEgUClfK5_gr5DhPyL0MFgifvGw
```

Workbook observed on 2026-09-10:

```text
People_Science_Content_full_index.xlsx
```

Use **only** the worksheet named:

```text
External
```

The observed range was `External!A1:N36`, containing one header row and 35 article
records. Expected columns include:

- `Theme`
- `Title`
- `URL`
- `Channel`
- `Author`
- `PublicationDate`
- `Description`
- `ModernizeNote`
- `Skills`
- `Priority to add to context library`
- `Notes / Rational`
- `Knowledge Priority`
- `Knowledge Priority Basis`
- `Knowledge Priority Reason`

Use workbook metadata to select relevant candidates, then retrieve the full article
from `URL` before citing or interpreting it. Skip rows without a valid externally
reachable article URL.

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
2. Deduplicate identical articles across the two source tiers.
3. When an article appears in both tiers, classify it as first priority.
4. When sources disagree, prefer the first-priority published article and describe
   meaningful differences rather than silently blending them.
