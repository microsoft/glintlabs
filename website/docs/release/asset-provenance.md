# Asset provenance and public-release approval

> Historical source approval register. The original entries and evidence
> requirements below are retained, not rewritten or marked approved by this
> note. Later owner-confirmed release decisions are documented in the
> [integration record](../migration/integration.md#current-content-and-release-decisions).
> Those decisions apply only to their stated scope; new or unrelated material
> still requires its own review and approval.

## Inventory

| Path | Current inventory | Intended source |
|---|---:|---|
| `public/figma` | 207 files after Annual Report pruning | Glint Labs and Annual Report Figma exports |
| `public/annual-report-2026` | 8 files: 2 AVIF, 1 JPG, 3 PNG, 2 WebP | Approved report photography and responsive derivatives |
| `packages/data-visuals/public` | 6 files: 1 PNG, 5 SVG | Vendored shared visualization assets |
| `src/annual-report-2026/approved-content.json` | 1 structured content snapshot | Approved Word source, SHA-256 documented in `docs/annual-report-2026.md` |
| `docs/release/annual-report-assets.json` | 51 runtime assets plus 2 non-served provenance originals | Exact canonical-route asset manifest and approval state |

The canonical Annual Report route manifest is verified by
`npm run assets:annual-report`. The pruning evidence and retained-source
decisions are documented in `annual-report-asset-pruning.md`.

Generated report previews, draft assets, source Word files, extracted media,
test output, local builds, environment files, and credentials are excluded by
`.gitignore` and must remain excluded from the public repository.

## Approval register

No approval is implied by an asset being present in this private repository.
The release owner must replace every `TBD` with an approver, evidence link, and
approval date before public release.

| Category | Evidence required | Owner | Status |
|---|---|---|---|
| Figma exports | File/node ownership, export authorization, and confirmation that exported layers may be published | TBD | Blocked |
| Report photography | License or Microsoft ownership, subject/model release, approved crop, alt text, and public-web rights | TBD | Blocked |
| Illustrations and icons | Source library or designer, license, modification rights, and redistribution permission | TBD | Blocked |
| Microsoft and Viva Glint marks | Brand/trademark approval for placement, color, clear space, and linking context | TBD | Blocked |
| Fonts | Web embedding and redistribution rights for every non-system font or approved fallback decision | TBD | Blocked |
| Annual Report copy and data | People Science approval, methodology review, privacy review, and final publication approval | TBD | Blocked |
| Customer quotations and names | Written customer permission for quote, attribution, and public use | TBD | Blocked |
| Shared data-visual package | Upstream ownership, license, and permission to vendor into the official repository | TBD | Blocked |

## Known content blocker

The canonical report source currently includes the attribution text
`NEED PERMISSION FROM CUSTOMER / Rio Tinto`. This is a release blocker. Obtain
written permission and replace the placeholder with approved attribution, or
remove the quotation through the approved content-review process. Do not infer
permission from prior internal use.

## File-level evidence

For each public asset, the release evidence should record:

- repository-relative path;
- source file and Figma node, document page, or upstream package commit;
- creator or owning team;
- license or internal-use basis;
- whether modification and public redistribution are allowed;
- required attribution;
- content, accessibility, brand, privacy, and legal approvers;
- approval date and durable evidence link; and
- checksum for final approved binary assets when replacement would be material.

Store approval links in the official work item or pull request rather than in
filenames or source comments. Do not commit confidential approval messages,
customer agreements, source documents, or credentials.

## Release rule

Public release is blocked while any used asset or content category remains
`TBD`, while a customer permission is unresolved, or when the final binary does
not match the reviewed asset. Removing an unused asset from the shipped bundle
is acceptable; marking an unverified asset as approved is not.
