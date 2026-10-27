# Annual Report publication-content blocker register

> Historical source blocker register. Locations and states below describe the
> staging snapshot, not an updated audit of the current public reader. See the
> [integration record](../migration/integration.md#current-content-and-release-decisions)
> for later owner-confirmed decisions. Original entries remain intact; this note
> neither grants blanket clearance nor removes approval requirements for new or
> unrelated content.

This register distinguishes content rendered by `/annual-report-2026` from
draft source material retained in the repository. Runtime hiding, omission by
the canonical component, or an internal-use disclaimer does not constitute
publication approval.

## Rendered release blockers

| Priority | Location | Production reach | Required decision | Approval role |
|---|---|---|---|---|
| P0 | `src/annual-report-2026/canonical-figma.tsx:166-183` | Rendered quotation and visible `NEED PERMISSION FROM CUSTOMER / Rio Tinto` attribution | Obtain written permission and approved attribution, or remove the quotation through content review | Customer/account owner, Legal/Privacy, People Science content owner |
| P0 | `src/annual-report-2026/canonical-figma.tsx:1514` | Visible editorial instruction: `ADD THIS IS ILLUSTRATIVE (look at V5 doc)` | Replace with approved reader copy or remove after content-owner confirmation | People Science/content owner |
| P0 | `src/annual-report-2026/canonical-figma.tsx:1821-1825` | Visible draft topic text attributed to Caribay Garcia and labeled `PLACEHOLDER` | Replace with an approved quotation/story or remove through content review | Named contributor, People Science/content owner, Legal/Privacy |
| P0 | `src/annual-report-2026/canonical-figma.tsx:384-401,550-570,594-609,1528-1546` | Other rendered practitioner/customer quotations and anonymized organizational roles; the approved LSEG and Technology quotations are excluded from this blocker | Confirm quote text, attribution/anonymization, and written public-use permission for each remaining quotation | Customer/account owner, Legal/Privacy, People Science/content owner |
| P0 | `src/annual-report-2026/canonical-figma.tsx:421-436` | Rendered named Microsoft employee quotation | Confirm final wording, title, attribution, and publication consent | Named contributor, People Science/content owner, Microsoft communications/Legal as required |
| P0 | `src/annual-report-2026/canonical-report-interactions.tsx:267,277-278` | Visible appendix notes state that demographic rows are incomplete or unavailable | Supply approved complete data, or approve publication of an explicitly limited appendix with reader-ready wording | Research/methodology owner, People Science/content owner |
| P0 | `src/annual-report-2026/canonical-report-interactions.tsx:258-261` | Rendered methodology and legal text; current copyright language authorizes internal reference use while the target is a public website | Approve methodology, sample descriptions, claims, copyright language, and public-web terms | Research/methodology owner, CELA/Legal, Privacy |
| P1 | `src/app/annual-report-2026/page.tsx:49` | Rendered author, handle, publication date, and read time; date is hardcoded as `10/18/26` | Confirm final author metadata and launch date, then use approved date formatting | Content/release owner |
| P1 | `src/app/annual-report-2026/page.tsx:58-59` | Rendered Microsoft mark and public disclaimer | Approve mark usage and final disclaimer; the disclaimer is not trademark approval | Brand/Trademark, CELA/Legal |
| P0 | `src/annual-report-2026/canonical-figma.tsx` and `src/annual-report-2026/canonical-report-data.ts` | All report claims, percentages, labels, and coded datasets are rendered | Complete final People Science, methodology, privacy, and publication review against the approved source | People Science/content owner, research/methodology owner, Privacy |

## Retained draft-input blockers

`src/annual-report-2026/approved-content.json` is not imported by the canonical
production route, but it is the retained manuscript snapshot and is explicitly
marked draft. It must not be represented as the final approved publication
source.

| Priority | JSON path and file location | Runtime status | Required decision |
|---|---|---|---|
| P0 | `$.metadata.status` at `approved-content.json:10` | Not rendered; release-source status is `draft` | Replace with a final owner-approved source snapshot and regenerate derived content, or explicitly retire this file as non-release provenance |
| P0 | `$.blocks[20,43,48,72,88,91,101,114,179].text` at lines `286,560,623,933,1134,1173,1298,1459,2292` | Some quotations overlap rendered content; others remain only in draft input | Confirm source, wording, attribution/anonymization, and written public-use permission |
| P0 | `$.blocks[185,194,199,212].text` at lines `2370,2483,2546,2710` | Not rendered; unresolved customer/EFA/Toshiba/Caribay/Liz story prompts remain in release input | Supply approved stories or remove the prompts from the final source |
| P1 | All 17 blocks with `type: "visual-placeholder"` at lines `162,370,393,448,652,842,949,1239,1364,1400,1475,1632,1889,2157,2202,2549,2726` | Not rendered by the canonical route | Resolve each source direction or remove it from the final approved snapshot |
| P1 | `$.blocks[*].dataUrl` at lines `415,877` | Not rendered; points to retained Word-source bitmaps | Keep only as documented provenance or remove from the final publication input after owner review |

Additional noncanonical component copies remain in
`src/annual-report-2026/annual-report.tsx` and
`src/annual-report-2026/annual-report-components.tsx`, including placeholder
attributions. They are not reachable from the canonical route, but they must
not be reused for publication without the same content and permission review.

## Clearance rule

The release owner should record one of `approve`, `rewrite`, `anonymize`, or
`remove` for every P0 item. Approval evidence belongs in the official work item
or pull request, not in this public repository. Publication remains blocked
until the exact release candidate contains no visible editorial instructions,
placeholder attribution, unresolved customer permission, draft source status,
or unreviewed methodology claim.
