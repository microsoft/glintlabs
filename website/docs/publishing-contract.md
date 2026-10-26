# Glint Labs publishing contract

Status: **Approved for implementation**

Approved October 8, 2026: use the source-controlled publication-package
mechanism defined below for the pilot integration. This approval applies to the
publishing architecture only. It does not approve the May 2026 pilot or any
other report for public release.

This contract coordinates the Glint Labs public website workstream and the
Publishing Studio workstream. It defines the smallest durable path from an
approved Studio project to a deployed report page and Reports catalog entry.
It does not approve any report for public release.

## Approved decisions and constraints

The following decisions come from the project owner and are treated as
requirements:

- The canonical integration checkout is
  `C:\src\glint-labs-publishing-studio-latest`.
- The integration branch is `integration/latest-studio-ui`.
- Existing uncommitted website, Studio, and Annual Report changes must be
  preserved.
- Publishing follows this boundary:
  Word report → template preparation → Studio review → explicit owner approval
  → publication on Glint Labs.
- A report is published only when it has a durable report URL, appears in the
  Reports catalog, and is included in the deployed website.
- Browser-saved drafts, downloaded HTML, machine-local JSON, and local preview
  routes are not public publication.
- Studio must not auto-publish bulk imports.
- Protected or non-importable Word files must not be bypassed.
- The May 2026 pilot remains a draft until the owner explicitly approves its
  public release.
- The existing versioned report manifest and shared `ReportRenderer` remain
  the rendering foundation. A second report renderer must not be created.

## Current architecture

As of October 22, 2026:

- Studio drafts are stored in browser storage.
- Studio no longer exposes the legacy **Create preview** action. Existing
  machine-local `PublishedPreview` routes and `/api/published-reports` remain
  available for existing links; they are not site publication.
- The **Bulk add reports** buttons are temporarily removed. Single-document
  upload and previously saved drafts remain available.
- The upload screen's **Saved reports** section is temporarily removed.
  Browser-saved projects, Save draft, and the document menu are retained;
  this UI change does not delete saved reports.
- **Publish to Glint Labs** first directs any missing image description to the
  affected image in Studio. Otherwise it opens one **Publish report** dialog
  containing catalog metadata, contextual owner unlock, optional preview,
  unsigned website staging, and explicit exact-revision approval.
  Required fields use `*` and native required semantics. New report addresses
  start from the title; saved and manually edited addresses remain stable.
  The catalog-image picker currently offers only the 56 Blue spot
  illustrations from the approved Figma library, with 48px picker artwork and
  128px catalog artwork. The draft preview reuses the public `StudyCard`,
  including its series badge, summary, and Explore the study treatment.
  Existing report-image thumbnails remain readable; choose a current
  illustration before saving new publishing preparation.
  Changing the image invalidates the staged revision;
  the chosen bytes are packaged with the report. Catalog illustrations do not
  replace the original Word cover in the full report.
  Author/date details and extra options are expandable. Original Word images
  and valid descriptions are included automatically. Report-image preparation
  belongs only in the Studio image editor, not in the publishing dialog.
  There are no checkbox confirmations or mandatory image-type questions.
  **Publish report** explicitly approves the exact staged revision;
  opening the preview is optional and never publishes.
  Unlocking prepares the report but never publishes. Saving preparation does
  not supply release approval.
- The publishing-style picker currently offers only **New Fluent Colors**.
  Saved Research report and 2026 Annual Report projects retain their original
  style and remain readable.
- `/published/[id]` and `/published/[id]/report` read that machine-local JSON
  and are explicitly non-indexed preview routes.
- `/reports` enumerates validated, explicitly approved repository records
  alongside the existing Annual Report. `/reports/<slug>` uses the same reader
  as the unsigned preview.
- The private staging repository has source control and CI, but no production
  deployment workflow, static-export configuration, or configured durable
  content service.

These mechanisms are useful for previewing but are not the public publishing
pipeline.

### Temporary owner-key testing

For a private test session, `npm run studio:start -- --skip-owner-key` skips
only the owner-key unlock. It sets `GLINT_LABS_SKIP_OWNER_KEY=1` alongside
`GLINT_LABS_UNSIGNED_PREVIEW=1` and binds the connected server to loopback.
The UI identifies this setting instead of showing the key form or a misleading
lock control. Microsoft tunnel sign-in is not changed.

Anyone who can access this test site can stage and explicitly approve reports.
Metadata, content and asset validation, image/data review, and exact-revision
publication approval remain required. Skipping the key is not release approval.
Do not use this setting on public hosting; configuration rejects it outside
private-preview mode.

The setting is off by default. Stop the test server and start with
`npm run studio:start` without the flag or `GLINT_LABS_SKIP_OWNER_KEY=1` to
restore owner-key access. `NEXT_DIST_DIR` may select a separately built connected
test directory, avoiding replacement of an active server's build.

### Automatic Word-image preparation

Original Word images and their descriptions need no additional review record
or classification. Missing or known human-review-placeholder descriptions and
unverified source hashes remain blocked. Supplied image settings must still
pass their schema and match the current source asset hash.

Legacy `altConfirmed`, `descriptionConfirmed`, and `dataConfirmed` fields are
accepted for saved-draft compatibility but are no longer packaging gates.
The current UI does not manufacture confirmation values.

Imported descriptions may be decoded for display without altering source
content or approval snapshots. Image descriptions and optional chart CSV data
are edited in Studio's existing image editor before publishing opens.
Selecting **Publish to Glint Labs** with a missing description opens and focuses
the affected image editor; **Done** applies the changes and returns focus to
publishing. Description-only settings need no image classification.
Empty or placeholder descriptions still block packaging.

Studio projects can save `imageReviews` before catalog metadata exists. Legacy
`publicationPreparation.imageReviews` remain readable, and project updates
synchronize both representations while preserving catalog metadata and package
revision history. Saved reviews retain an explicit `description` override,
separate from the legacy source `alt` field. Packaging applies valid overrides to the
manifest and binds them to its provenance and revision without changing the
original Word file or original source-approval snapshot. Existing source data
and classification are preserved when only a description is changed.
Original chart bitmaps need no CSV for V1. Optional uploaded
values must pass structured-data validation; values and units are not inferred,
and existing source data cannot be discarded.

## Approved publishing mechanism

Use a validated, source-controlled publication package as the v1 durable
content source.

Studio prepares and exports one complete publication package. The website
imports that package into repository-owned content and asset paths, validates
the resulting diff, renders a deployment-equivalent preview, and waits for an
explicit owner confirmation before the publication commit or deployment.

This mechanism:

- works without treating a browser database or server-local filesystem as
  production storage;
- supports a static or server-rendered deployment because content exists at
  build time;
- creates reviewable history for every publication and update;
- avoids introducing a new CMS, authentication system, or second renderer;
- can later be automated through a pull request without changing the package
  contract.

ZIP preparation and unsigned staging remain preparation, not publication.
The connected local/tunnel flow now offers a separate explicit approval action.
Its response is `approved-local` with `productionDeployed: false`; it does not
claim a permanent deployment, commit, merge, or Git push.

## Studio handoff package

Studio hands the website one ZIP package with this shape:

```text
publication.json
manifest.json
assets/
  <sha256>.<extension>
```

### `publication.json`

Required fields:

```text
schemaVersion           "1"
reportId                UUID; stable Studio project identity
slug                    requested stable public slug
revision                positive integer
reportStyle             validated ReportStyle value
manifestFile            "manifest.json"
title                   public report title
summary                 catalog and metadata description
eyebrow                 public report label or series
displayDate             ISO date, YYYY-MM-DD
author.name             public display name
author.handle           public handle when applicable
readTimeMinutes         positive integer
topics                  zero to three public topic labels
thumbnail.assetPath     path within assets/
thumbnail.alt           meaningful alternative text
thumbnail.presentation  optional "image" or "illustration"; omitted for legacy records
catalog.featured        boolean
catalog.featuredUntil   ISO date or null
provenance.sourceSha256 SHA-256 of the imported source
provenance.approvedContentSha256
approval.statementVersion
approval.confirmedAt    ISO date-time
assets[]                path, SHA-256, MIME type, and byte size
```

`approval` is release approval, not merely source-content confirmation. Studio
must not populate it until the owner explicitly confirms that exact revision
for public release.

Unsigned Studio ZIPs omit `approval` entirely. Only the owner's explicit
website approval adds `statementVersion: "1"`, `confirmedAt`, and
`packageFingerprint`. That SHA-256 binds the full unsigned publication
envelope and original package manifest, including the revision. Source
confirmation and downloaded packages never supply it.

### `manifest.json`

- Must pass the existing versioned `reportManifestSchema`.
- Must preserve the source narrative wording and order unless an editorial
  change was approved in Studio.
- Must preserve block IDs across revisions when the source block remains the
  same.
- Must contain no unresolved blocker review items.
- Must reference every required asset declared in `publication.json`.
- Must include approved display metadata instead of relying on renderer
  fallbacks.
- Must retain link destinations in a structured form once hyperlink support is
  added to the manifest contract.
- The long-term accessibility goal for bitmap charts is approved structured
  data or an accessible equivalent. V1 permits the reviewed original image
  without that equivalent. Values must never be inferred from the bitmap.

The coordinated manifest extension implemented for those requirements is:

- Paragraph and list-item blocks retain their existing `text` and may add
  ordered, non-overlapping `links[]` ranges with `start`, `end`, and a safe
  `href`.
- Canonical `references` entries may add the same safe `href` destination.
- Original Word images may omit `contentKind`; existing classifications are
  retained, and supplying optional chart data establishes `data-bearing`.
- For V1, an original chart image may keep its Word bitmap without requiring
  CSV or `accessibleData`. A meaningful source description remains required;
  image-only charts are not claimed to be fully accessible.
  Optional structured data uses the shared schema and must be valid when
  supplied. Existing source data cannot be silently discarded. The website
  renders supplied data as a keyboard-accessible, mobile-scrollable
  table adjacent to the bitmap.
- `accessibleData.rows[].cells` must contain one cell for every declared
  column.

Studio extraction remains responsible for producing these fields from the
approved source. The website does not infer link destinations, chart values,
labels, units, or source notes.

### Assets

- Every asset must be included in `assets/`.
- File names are content-addressed with their SHA-256 digest.
- Declared hashes and byte sizes must match the supplied files.
- Images require approved alternative text in the manifest or publication
  metadata.
- No asset may depend on a user's OneDrive path, browser object URL, temporary
  Figma URL, or machine-local file.

## Repository publication layout

After validation, the website importer writes or updates:

```text
content/reports/<reportId>/publication.json
content/reports/<reportId>/manifest.json
public/reports-assets/<reportId>/<sha256>.<extension>
```

The Reports catalog is generated from validated publication records. It is not
maintained as a second manually edited list.

Public routes:

```text
/reports
/reports/<slug>
```

The report page renders the stored manifest through the shared
`ReportRenderer` in read mode.

## Unsigned deployment preview

An unsigned package is staged separately from durable public content:

```text
content/report-previews/<reportId>/publication.json
content/report-previews/<reportId>/manifest.json
content/report-previews/<reportId>/preview.json
public/report-preview-assets/<reportId>/<sha256>.<extension>
```

The website-owned ingestion command is:

```text
npm run publication:preview -- <path-to-unsigned-package.zip>
```

It performs complete ZIP, schema, provenance, asset, stable-identity,
hyperlink, and bitmap-accessibility validation before replacing a preview.
Same-revision conflicting packages and older revisions fail. Re-ingesting the
same package is idempotent.

The generated routes are:

```text
/reports/preview/<reportId>
/reports/preview/<reportId>/report
```

Both routes use repository-backed content and production reader/catalog
components, declare `noindex, nofollow`, and display an unsigned-preview
notice. They are not included in the public Reports catalog. Staging this
preview does not create release approval, a publication receipt, a stable
public report route, or a release commit.

The original review server remains local-only. The owner subsequently requested
upload, review, and explicit publishing on the existing Microsoft-authenticated
tunnel. Application-level owner access protects its unsigned previews and
publishing APIs; `noindex` alone is never access control.

```text
npm run publication:preview:build
npm run publication:preview:start
```

These commands validate staged content and use an isolated
`.next-publication-preview` production build. The start command binds only to
`127.0.0.1:3113`; it rejects packages changed since the build. Production source
is type-checked using `tsconfig.publication-preview.json`; unit tests are run
separately rather than disabling type validation.
If that port is occupied, `npm run publication:preview:start -- 3114` selects
another port without changing the loopback-only binding.

Preview routes and assets require a signed owner session and otherwise return
404, including private images requested through the image optimizer. The
private-preview build flag is not authorization. Ordinary production builds fail while unsigned preview
content or assets are present, preventing accidental inclusion in a public
build. Do not deploy the private preview build or enable its flag on a public
host without the intended authorization boundary.

## Connected local/tunnel publishing

From the canonical checkout:

```text
npm run studio:build
npm run studio:start
npm run studio:owner-key
```

The connected build uses `.next-connected-studio-final`, separate from existing
`.next-publication-preview` servers. The start command binds port 3010 on
loopback for the existing tunnel. **Do not restart port 3010 using the old
`.next-publication-preview` build**: it does not contain the new publishing APIs.
Use only one workstream to manage the port-3010 listener.

The owner key is stored outside the repository in the hosting account's local
application-data directory. The helper prints its location, not its value.
Studio exchanges the key for an eight-hour signed HttpOnly owner cookie.
Writes require both owner authorization and an approved site origin.
The Microsoft tunnel sign-in remains intact; viewers do not need the owner key.

Studio sends the validated unsigned ZIP to `/api/studio/stage`. The owner
reviews the repository-backed report and catalog preview, then explicitly
approves that exact revision through `/api/studio/approve`. Approval installs
validated records and content-addressed assets into the repository publication
layout. Dynamic report/catalog and asset routes make that revision visible
without restarting or rebuilding the server.

This publishes to the currently running local/tunnel site only. Permanent
hosting, Git remote, release commits, merge policy, and deployment triggers
remain undecided. No real report, including May, was approved by integration
or automated testing.

Import operations use an exclusive repository lock. Stored previews are
revalidated, including original package provenance and asset bytes, before
building or serving the local preview.

## Stable identity and updates

- `reportId` is the primary identity and must never be reused for another
  report.
- `slug` becomes stable after first publication.
- The importer rejects a new package when its `reportId` conflicts with a
  different slug or its slug belongs to a different `reportId`.
- Publishing a higher revision with the same `reportId` updates the existing
  report and preserves its URL.
- Re-importing the same revision and hashes is idempotent.
- Older or conflicting revisions fail without modifying repository content.
- Content-addressed asset names prevent accidental replacement and allow
  unused assets to be identified safely.

## Approval and publication boundary

1. Studio imports and prepares the report.
2. Studio validates source integrity, review readiness, metadata, and assets.
3. Studio creates a publication package for the exact reviewed revision.
4. The website importer validates and stages an atomic repository diff.
5. The website presents the deployment-equivalent report page and catalog
   entry for review.
6. The owner explicitly approves or rejects that staged publication.
7. Only after approval may the change be committed, merged, and deployed.
8. The durable public URL and catalog entry are verified after deployment.

Steps 3–5 do not constitute public release. A Studio project marked `ready`
does not constitute release approval.

## Validation and failure behavior

Publication fails before any repository change when:

- schemas, hashes, MIME types, or asset sizes are invalid;
- required metadata is absent;
- the stable ID, slug, or revision conflicts with existing content;
- release approval is missing or does not apply to the package revision;
- a referenced asset is missing;
- the manifest contains unresolved blockers;
- supplied chart data is unconfirmed or contains incomplete rows;
- links or references required by the source cannot be represented faithfully.

The importer validates the complete package before writing, writes through a
temporary staging directory, and replaces the target atomically. A failed
import must not create a report route, catalog entry, partial asset set, or
success-shaped receipt.

Build-time validation must fail the deployment if stored publication content
becomes invalid.

## Pilot website findings

These were the original pilot findings. Subsequent hyperlink, reader, and V1
image-policy work is documented in `docs/public-site/studio-return-handoff.md`:

- Bitmap images render as images only; no accessible data equivalent is
  generated automatically.
- Paragraph and list blocks contain plain text only, so source hyperlinks
  cannot currently survive extraction and rendering.
- The report side rail, including author, date, and reading time, is hidden at
  smaller responsive widths without a mobile metadata replacement.
- Standard research reports explicitly limit section navigation to two items.

Before the May 2026 pilot can be release-ready:

- V1 may use the original Word heatmap image with a meaningful description.
  Structured data or an accessible equivalent remains the longer-term goal;
  optional supplied data must use actual source values.
- The shared manifest and extraction contract must represent source
  hyperlinks; the website must render them accessibly.
- The website must provide mobile-visible author, date, and reading time.
- The website must enumerate all eligible body sections in navigation.

## File ownership

### Website workstream owns

- `docs/publishing-contract.md`
- `content/reports/**`
- `public/reports-assets/**`
- `src/app/reports/**`
- the future stable report route under `src/app/reports/[slug]/**`
- repository publication-package validation and import code
- catalog generation and public metadata
- website deployment configuration
- reader-mode responsive behavior and accessibility in
  `src/report-system/**`

### Publishing Studio workstream owns

- `src/app/_components/publishing-studio.tsx`
- `src/app/_components/publishing-studio.module.css`
- `src/app/studio/**`
- `src/project/**`
- Word preparation and `src/extraction/**`
- editorial, integrity, and readiness review flows
- Studio package creation and package-specific tests

### Coordinated shared files

- `src/manifest/report-manifest.ts`
- manifest schema tests
- `src/report-system/report-renderer.tsx`
- `src/report-system/report-style.ts`
- publication envelope types or schemas shared by Studio and the website

Changes to shared files require coordination. Studio owns edit-mode behavior;
the website owns read-mode public behavior. Neither workstream should overwrite
uncommitted changes from the other.

## Not yet decided

- The production host and deployment trigger.
- The Git remote and target repository.
- Whether approved publication changes are committed locally, opened as pull
  requests, or ingested by a future authenticated service.
- Whether homepage featuring is part of the first pilot publication.
- The final public slug for the May 2026 pilot.

These decisions do not block agreement on the publication package and
source-controlled content contract, but production release cannot occur until
the host, repository, and deployment path are configured.
