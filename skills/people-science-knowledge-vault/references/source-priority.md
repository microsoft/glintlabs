# Source priority

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

## Second priority: external workbook articles

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
