# Studio/site integration handoff

## Current checkpoint: October 22, 2026

The current flow uses one **Publish report** dialog, without a stepper or
separate review page. **Preview report** is optional; **Publish report** is the
explicit exact-revision approval action. Contextual owner-key unlock prepares
the revision but never publishes. The normal connected server requires the
owner key; the earlier key-skipping session described below is no longer the
current configuration.

Report-image descriptions and optional CSV data now belong in Studio's image
editor, not in publishing. Valid imported descriptions need no additional
review. Publishing with a missing description opens the affected image editor
and focuses its description field. **Done** applies the changes and returns
focus to the publishing action. CSV values and units are not inferred from
images, and image-only charts do not require a CSV.

Image settings can be saved before publication metadata exists. Existing
publishing descriptions, chart data, catalog settings, and package revision
history remain compatible. Data overrides do not rewrite the immutable source
manifest or approved-content snapshot.

The connected test build is `.next-studio-images-ready`. Production-build
checks and isolated synthetic browser checks covered description routing and
focus, saved-project compatibility, CSV errors and exact values, explicit
publication after unlock, responsive image editing, and automated accessibility.
No user report was published by these checks. Permanent production deployment
and the report's documented release approvals remain separate gates.

The sections below record earlier implementations and evidence. Their
steppers, inline publishing-image controls, temporary key-skipping settings,
process IDs, and build directories are historical, not current instructions.

## Earlier connected publishing update

The latest implementation now connects Word upload, package readiness,
owner-protected website staging, exact-revision approval, stable report pages,
and the Reports catalog. Existing integration changes are preserved.
The local/tunnel site now contains an explicitly approved report at
`/reports/ai-skills-training`. A permanent production deployment remains
unconfigured. The UI fixes below do not add release approval or change report
content.

### Earlier simplified publishing and Blue artwork

The latest flow is **Set up report -> Preview and publish**, without checkbox
confirmations or mandatory image-type questions. Original Word images and
descriptions are included automatically. Actual missing descriptions, source
hash problems, invalid metadata, unresolved blockers, and invalid supplied data
still stop preparation. The optional **Images from Word** section expands for
problems; CSV remains optional and failed replacements preserve previous data.
Legacy confirmation fields remain readable but are not required or fabricated.

The dialog header is now just **Publish report**. The redundant Studio label
and introductory sentence are removed; the stepper and step-specific guidance
remain. The heading still supplies the dialog's accessible name, with no
dangling description reference. Edge checks verify the simplified header.

The upload screen's **Saved reports** section is temporarily removed. Saving,
browser storage, and the loaded report's recent-document menu are unchanged.
Source lint, type checking, and the separate production build passed. A fresh
Edge check saved a draft, returned to the upload screen, verified the section
was absent, and confirmed that the saved preparation remained in IndexedDB.
Evidence: `publishing-ux-no-saved-reports-live-results.json` and its screenshots.
All 37 originally recorded report/asset files remain unchanged; additional
user-created report records are preserved rather than removed to match an old
baseline.

Image descriptions are now editable directly beside each image in publishing.
Missing-description validation opens the image section and focuses its text
field; there is no **Add description in Studio** or **Edit in Studio** detour.
An unfinished description can be saved and reopened as a draft. A meaningful
description clears its blocker immediately and is included in the staged
report. Description edits invalidate the staged revision.

Preparation stores an explicit description override, separate from the legacy
source `alt` field. Description-only records need no image classification.
Packaging preserves image bytes, included chart data, original classifications,
Word originals, and the original source-approval snapshot. The packaged
manifest/provenance and revision bind the description that will be published.

The gallery now offers only the 56 Blue spot illustrations from Figma node
`1658:50849` in file `rkrC8mdVsXC1rAITLp04Sq`; **Images from report** is no
longer a catalog-image option. Local PNG exports preserve the original
artwork; picker icons are 48px and catalog artwork is 128px.
The draft catalog preview reuses the public `StudyCard` and matches Figma
node `1655:36861`: light card, 20px corners, calendar/series badge, dynamic
title and three-line summary, and Explore the study treatment. The preview
does not navigate or publish.
The selected presentation is packaged
with the thumbnail, including revision/fingerprint changes. Catalog artwork
does not replace the original Word cover in either the preview or approved
reader. Older artwork URLs and records remain compatible and unchanged.
Existing report-image thumbnails can still be opened, but new preparation
requires a current illustration. New style selections offer only
**New Fluent Colors**; saved legacy reports retain their original style.

**Publish to Glint Labs** is the explicit exact-revision approval action.
Opening a preview is optional. Saving, staging, and opening previews do not
publish. Editing preparation invalidates the staged revision.

The latest verified build is `.next-publish-report-header`. Its detached
launches stopped with exit code -1 and no application error. Another process
now owns port 3010 (observed PID 73228; recheck before any action) and responds,
but its Studio chunk list does not match this latest build. It was left
untouched to avoid competing with another session. Latest UI changes remain
saved, but are not currently verified as served by that replacement process.
Coordinate ownership before restarting port 3010.
Source lint, type checking, all
107 registered tests, package revision regressions, and the production build
passed. Fresh Edge checks on the final connected server verified automatic
images, optional CSV, staging failure/retry, intercepted exact-revision Publish
payloads, saved drafts without invented confirmations, and inline description
repair with saved/reopened drafts. An actual Word-description placeholder was
corrected in-flow and its replacement verified in the staged manifest.
Checks covered Studio widths 320-1440px, 96px catalog artwork on mobile/desktop,
and report widths through 1920px. Validation no longer scrolls the outer dialog
and clips its heading.

No live approval was sent. Owned synthetic staged records/assets and browser
profiles were removed. All 37 existing report/asset files remained byte-identical,
the approved report still returned 200, and ports 3113/3114 were preserved.
Microsoft tunnel authentication is unchanged; authenticated external tunnel
browsing was not independently verified.

Current non-approving checks:
`publishing-ux-ui-test.mjs http://127.0.0.1:3010 --live --compact --simplified-studio --no-confirmations --inline-descriptions`
and the same command with `--v1-csv`. Evidence:
`publishing-ux-inline-descriptions-live-results.json`,
`publishing-ux-inline-descriptions-csv-live-results.json`, and matching screenshots.
The earlier UI history below describes superseded confirmation behavior;
older helper modes without `--no-confirmations` do not match the current UI.

### Earlier owner-key-only test session

At Eric's request, the connected tunnel server temporarily skips only the
owner-key unlock. It runs the separately built `.next-publish-report-header` directory
with `npm run studio:start -- --skip-owner-key` and
`NEXT_DIST_DIR=.next-publish-report-header`. Previous connected builds were preserved.
Microsoft tunnel sign-in is unchanged.

The UI identifies the temporary setting and does not display an owner-key form
or a misleading lock button. Anyone with access to this test site can stage
and explicitly approve a report. Source/metadata readiness, asset validation,
image/data review, and final exact-revision approval remain required.
The owner-key change did not modify Word originals or prepared copies and did
not approve or publish a report.

Focused tests, lint, production-source type checking, and the isolated
production build passed. Live loopback checks against the tunnel's port 3010
verified access without an owner cookie, private preview images, rejected
invalid metadata/origins, and rejected missing approval. A fresh Edge profile
verified synthetic Word upload, the absent owner-key form, and metadata
readiness still blocking staging. Authenticated external tunnel browsing was
not independently tested.

To restore the key requirement, stop only this test server and run
`npm run studio:start` without the flag or `GLINT_LABS_SKIP_OWNER_KEY=1`.
Keep `NEXT_DIST_DIR=.next-publish-report-header` to retain the latest tested UI.
The key and normal signed-session flow remain intact. This session does not
authorize other agents to bypass content validation or enable the setting on public
hosting.

An earlier review-button fix brought the staged review heading into view,
moves keyboard focus to it, and replaces the footer's staging action with
**Open report review**. Staging errors also scroll into view and receive focus.
Fresh Edge checks reproduced the previous offscreen success and verified the
new success and error feedback. Opening a review does not check the final
approval box or publish the report. Synthetic staged test records/assets and
browser profiles were removed; the user's existing staged reports were kept.

The shared research-report reader now fills the page width on wide screens
instead of fixing the hero and header at 1440px. Navigation and editorial
content remain centered, with readable line lengths and responsive gutters.
The change is scoped to desktop read mode; Studio edit mode and Annual Report
styles are unchanged. Fresh Edge checks covered both the actual preview and
approved report from 320px through 1920px, including the narrow-desktop
breakpoint, without horizontal page overflow. No report package was changed.

### Earlier guided publishing UX and second improvement pass

The first guided dialog followed **Report details → Images and data → Review and
publish**, with a visible stepper and one primary footer action. Report details
include a live catalog-card preview, a suggested address offered for explicit
selection, inline validation, and separate optional homepage settings.
Advancing saves valid preparation progress to the existing browser database;
unsaved changes are identified and closing warns before discarding them.

Image reviews now show the actual Word images, support enlargement, separate
classification from description confirmation, and display imported descriptions
readably without changing the source-approved description or its snapshot.
Missing or known review-placeholder descriptions cannot be confirmed away.
The **Edit description in Studio** action saves preparation and opens the
existing editor; it does not rewrite source content automatically.
New review records explicitly track `descriptionConfirmed`. Undefined retains
the prior explicit-review meaning for valid legacy records.

Chart review shows supplied CSV values, allows all rows to be inspected, and
resets data confirmation on replacement or unit changes. Values are never
estimated. ZIP export remains a secondary handoff option.

First-pass Edge testing verified the complete synthetic staging/approval flow
on isolated storage. Mobile inspection then exposed an easy-to-miss final
confirmation. The second pass brings that unchecked confirmation into view
and focuses it after preview activation, states the next action in the footer,
shortens image headers, prevents background scrolling, and improves touch
targets. Opening a preview never confirms approval. Changing preparation
invalidates the staged review and its approval state.

Registered regressions, source lint, production-source type checking, and the
production build passed. Final Edge checks covered 320–1440px, visible primary
actions, keyboard containment, focused metadata/CSV/staging failures, exact
CSV values, saved review progress, image-editor navigation, and mobile
confirmation visibility. Actual synthetic publication succeeded only on an
isolated loopback site. A separate check against port 3010 staged and removed
its own synthetic fixture without submitting approval.

All **37 existing report/asset files** were byte-identical after replacement
and live checks. `/reports/ai-skills-training` still returns 200. No real report
was published by this work, no Word original or prepared copy was changed,
and ports 3113/3114 were preserved. Temporary test servers and browser profiles
were stopped/removed. The connected server remains running on port 3010 from
`.next-v1-word-images-final` at that point; the current build and PID are listed above.
Microsoft tunnel authentication is unchanged and authenticated external tunnel
browsing was not independently verified.

Session evidence: `publishing-ux-pass1-results.json`,
`publishing-ux-pass2-results.json`, `publishing-ux-live-results.json`, screenshots,
`publishing-ux-ui-test.mjs`, and `publishing-preservation-check.mjs`.
The older `owner-key-ui-test.mjs` targets the superseded all-in-one dialog.
Use the new helper for this guided flow; approval tests require isolated
storage, while `--live --compact` never approves a fixture.

### Simplified Studio entry points

The legacy **Create preview** button, its legacy-homepage dialog, and unused
Studio wiring are removed. Previews remain in the guided **Publish to Glint
Labs** flow and use the current report and catalog renderers. Existing legacy
preview routes, API, and stored previews are preserved for existing links.

At Eric's request, **Bulk add reports** is temporarily removed from both the
start screen and the document menu. The underlying importer and stored drafts
are retained; single-document upload and saved reports remain available.

Source lint, production-source type checking, and the separate production
build passed. A fresh Edge profile verified that both removed buttons are
absent before and after upload, and that guided review, staging, responsive
layout, saved review progress, and image-editor navigation still work.
No approval was submitted. The owned synthetic staged fixture and browser
profile were removed, all 37 existing report/asset files remained byte-identical,
and the approved report still returned 200. Ports 3113/3114 were preserved.
Evidence: `publishing-ux-simplified-live-results.json` and matching screenshots.
Run `publishing-ux-ui-test.mjs http://127.0.0.1:3010 --live --simplified-studio --compact`
for this non-approving regression check.

### Earlier compact publishing flow and illustration picker

The current flow is **Set up report → Preview and publish**. Setup keeps the
title, short summary, catalog image, and its description visible. Author/date
details and extra options are expandable; validation opens the relevant
section and focuses missing required inputs. Required fields and confirmations
use `*` with native required semantics. A new address follows the title until
manually edited; saved addresses are never regenerated automatically.

The catalog picker restores the visual gallery of all 50 existing Glint Labs
illustrations and also supports images from the report. Illustration selection
fills an editable description and updates the card immediately; it does not
confirm review automatically. Changing the image resets its confirmation and
staged approval. The selected illustration bytes are included in the unsigned
package and served from staged report assets, not just referenced locally.

Report image/data checks are expandable within setup, not a separate step.
Unfinished checks expand when preparing a preview; completed saved checks need
not be repeated. Classification, meaningful descriptions, source integrity,
and exact-revision final approval are still required. Chart-data requirements
were subsequently relaxed for V1 as described below.
Preparing a preview saves the valid preparation and advances directly to the
preview/publish screen. No report is approved by opening the preview.

Targeted package/helper regressions, source lint, type checking, and the separate
production build passed. Fresh Edge checks covered the two-step flow, required
markers, generated/manually preserved addresses, both image-selection modes,
all 50 illustrations, packaged/staged selected-image bytes, expanded validation,
CSV review, staging failure/retry, keyboard containment, and widths 320-1440px.
The final confirmation remained unchecked, mobile focus remained visible,
and changing an illustration required fresh approval. Saved progress and image
editor access still worked. No approval was submitted; the owned staged fixture
and browser profile were removed. All 37 existing report/asset files remained
byte-identical, the existing approved report returned 200, and ports 3113/3114
were preserved. Evidence: `publishing-ux-compact-live-results.json` and matching
screenshots. Current non-approving check:
`publishing-ux-ui-test.mjs http://127.0.0.1:3010 --live --simplified-studio --compact`.

### Earlier V1 original chart-image update

At Eric's request, V1 can package, stage, and explicitly publish the original
Word chart image without requiring a CSV or conversion to a structured chart.
The image remains classified as data-bearing; it is not relabeled as decorative
to bypass validation. Meaningful description review, source hashes, package
validation, and exact-revision final approval remain required. The UI explains
that image-only charts may not be fully accessible.

CSV upload is now an optional expandable enhancement. Existing source data
cannot be discarded during packaging. Supplied data still requires explicit
confirmation and complete rows; a failed replacement preserves prior values
and clears confirmation rather than silently dropping the data.
The shared manifest, package readiness, and website validation now consistently
allow image-only charts. The website retains its existing bitmap renderer and
renders structured tables only when data is supplied.

All 102 registered regressions, source lint, type checking, and the separate
production build passed. Isolated tests verified image-only staging and actual
explicit publication. Fresh Edge checks on the final port-3010 build verified
staging without any CSV, byte-identical original chart assets, optional data
upload, failed-replacement preservation, keyboard/mobile behavior, and unchanged
final approval. No live approval was submitted. Owned synthetic staged records
and profiles were removed; all 37 existing report/asset files stayed byte-identical,
the existing approved report returned 200, and ports 3113/3114 were preserved.
Evidence: `publishing-ux-image-only-live-results.json` and
`publishing-ux-v1-optional-csv-live-results.json`. Append `--image-only` or
`--v1-csv` to the current compact live helper command for these checks.

Before this temporary test session, the connected build was verified on
port 3010 with owner-key access enabled. Backend checks
confirmed owner authorization, accepted tunnel-origin login with a Secure
HttpOnly cookie, owner-only preview access, denied anonymous writes, and a
working catalog. Evidence is in `connected-live-health-results.json`.

**Server coordination remains important:** the parallel terminal previously
replaced port 3010 with the older `.next-publication-preview` server. That build
returns 404 for `/api/studio/owner` and lacks connected publishing. Manage
port 3010 from only one terminal using `npm run studio:start` with
`NEXT_DIST_DIR=.next-publish-report-header` for the current tested UI. The runner's
default is `.next-connected-studio-final`; rebuild that directory before using
the default if it is stale. Do not restart the old unsigned-preview build
on that port. Existing loopback preview servers on 3113 and 3114 were preserved.
Next configuration now fails startup on port 3010 if the selected build lacks
the owner/stage/approve routes. This prevents an older build from silently
removing the integrated workflow; the failure explicitly identifies the correct
build/start commands.

| Responsibility | Implementation |
| --- | --- |
| Unsigned package schema and validation | `src\project\publication-package.ts` |
| Owner key/session/origin/body limits | `src\publishing\owner-access.ts` |
| Owner login, stage, exact approval | `src\app\api\studio\owner\route.ts`, `stage\route.ts`, `approve\route.ts` |
| Reviewed, repository-backed publication | `src\publishing\approved-publication.ts` |
| Stable reader and catalog | `src\app\reports\[slug]\page.tsx`, `src\app\reports\page.tsx` |
| Newly added asset serving without restart | `src\publishing\publication-asset.ts` and report/preview asset routes |
| Connected production build/start | `scripts\run-connected-studio.ts` |
| Word hyperlink preservation | `src\extraction\word-text-links.ts`, `src\extraction\extract-docx.ts` |
| Approved CSV bitmap equivalents | `src\project\accessible-chart-data.ts`, Studio package dialog |

The shared schema remains `0.1.0`; paragraph/list ranges and reference
destinations use the existing extension. Image reviews now project explicit
classification and confirmed structured data into the packaged manifest.
Original source approval is checked before reviewed annotations are hashed.
The shared reader exposes accessible data for hero images as well as body
images, and both reader routes use the same explicitly reviewed public title,
eyebrow, and summary.

The production build, source type checking, lint, and **92 registered tests**
passed. An isolated loopback production copy verified actual Edge UI Word
upload, owner unlock, CSV confirmation, private staging, explicit test-revision
approval, stable report/catalog visibility, hyperlink preservation, newly
added image loading, and no mobile page overflow. Its allowed origin was
emulated for testing; no synthetic report was approved on the tunnel.
Anonymous tunnel requests still reach Microsoft sign-in, which was not
bypassed. An authenticated external tunnel browser session has not been
independently verified.

The isolated test server and its dummy report/content/assets were removed.
Session evidence: `connected-studio-e2e-results.json` and
`connected-studio-e2e.mjs`. Previous synthetic ZIP/download artifacts below
remain unchanged; preparation ZIPs still omit approval.

### What Studio/May still needs

- All **7 of 7 May hyperlinks** are now represented on fresh Word extraction.
  Older browser drafts need fresh source evidence; do not mark old missing
  links as represented or rehash source drift away.
- May's heatmap still has **no approved accessible data**. V1 permits the
  original chart image without CSV; it is not claimed to be fully accessible.
  Optional CSV must use actual source coefficients/labels. No values were guessed.
- Choose May's slug, summary, and thumbnail description; original Word images
  no longer need an additional review questionnaire.
  Keep its display date May 12, 2026. The earlier UUID collision described
  below still needs coordination if that original draft identity is reused.
- Only the owner's explicit approval of the exact staged revision may place
  a real report on the local/tunnel site. Production deployment is still
  unconfigured; successful local approval returns `approved-local`, not a
  production deployment receipt.

## Historical unsigned-preview handoff (superseded where noted above)

The unsigned package now reaches a real, production-built website preview.
This is a **local-only review flow**, not public publication or release approval.
The shared integration checkout and its pre-existing changes are preserved.

## Working preview

- Catalog: <http://127.0.0.1:3114/reports/preview/679c6d16-69f6-40d3-899c-ad73bf97d339>
- Reader: <http://127.0.0.1:3114/reports/preview/679c6d16-69f6-40d3-899c-ad73bf97d339/report>
- Report: **Synthetic publication fixture**, revision **2**; not May.
- The production server binds only to `127.0.0.1`. Port 3113 was already occupied,
  so this server uses 3114 without stopping that existing process.

The original revision-1 ZIP remains unchanged. The compatible synthetic
revision adds an explicit non-data classification for its one-pixel test image
and a matching technical content fingerprint. No release approval was added.

Artifacts in
`C:\Users\ericschroen\.copilot\session-state\a1179301-a9f3-455d-9d01-a4460f8d6780\files`:

- `synthetic-publication-fixture-r2-compatible.zip`
- `website-compatible-publication-example.json`
- `private-website-preview-results.json`
- `unsigned-catalog-desktop.png`
- `unsigned-reader-desktop.png`
- `unsigned-reader-mobile.png`

## Website implementation

The checkout already contained the importer, preview routes, shared schema
extensions and reader support when this task began. This work completed the
local production-preview boundary, compatibility fixture and verification.

| Responsibility | Path |
| --- | --- |
| ZIP ingestion, identity/revision checks, stored-content validation | `src\publishing\publication-preview.ts` |
| Ingestion command | `scripts\ingest-publication-preview.ts` |
| Catalog preview | `src\app\reports\preview\[reportId]\page.tsx` |
| Shared-renderer report preview | `src\app\reports\preview\[reportId]\report\page.tsx` |
| Local production build/start | `scripts\run-publication-preview.ts` |
| Preview route/asset denial outside private mode | `src\middleware.ts` |
| Public-build guard and isolated production-source type checking | `next.config.ts`, `tsconfig.publication-preview.json` |

Commands:

```text
npm run publication:preview -- <unsigned-package.zip>
npm run publication:preview:build
npm run publication:preview:start -- 3114
```

Staging uses `content\report-previews\<reportId>` and
`public\report-preview-assets\<reportId>`, not durable public report content.
The importer rewrites manifest `/assets/<hash>.<ext>` references to the
report-specific preview asset path. Its exclusive lock prevents overlapping
imports; invalid/conflicting packages fail, and repeated ingestion is idempotent.
Stored package provenance and assets are revalidated before a preview build.

The build uses `.next-publication-preview`, preserving other build directories.
Starting rejects staged package fingerprints changed since that build. Preview
routes and assets return 404 without private-preview mode; ordinary production
builds reject staged unsigned content/assets. `noindex` is not access control:
do not deploy this build or enable its flag on an unauthenticated public host.
Authenticated hosting remains a separate decision.

## Studio changes required before May can export

Read `docs\publishing-contract.md` and the current shared schemas first. This
website task did **not** alter Studio extraction, package generation, or review UI.

1. **Emit image classifications in the manifest.** Every packaged image needs
   `contentKind: "non-data"` or `"data-bearing"`. Keeping the classification only
   in `publicationPreparation.imageReviews` is insufficient: the importer rejects
   unclassified images. Bind the manifest value to the explicit image review.

2. **Preserve hyperlinks during extraction.** Paragraph/list-item `links[]`
   contain `start`, `end`, and `href`, with ordered, non-overlapping ranges into
   the exact block text. End offsets are exclusive and follow JavaScript UTF-16
   string indexing. Canonical reference items can also carry `href`.
   `reportLinkHrefSchema` validates allowed destination forms. Preserve the
   actual Word destinations; do not infer them from reference text. Update source
   evidence/readiness to prove lossless representation rather than unconditionally
   rejecting every source with a nonzero hyperlink count.

   Example for `text: "Read the exact source."`:

   ```json
   {
     "links": [
       { "start": 9, "end": 21, "href": "https://example.com/source" }
     ]
   }
   ```

3. **Supply approved accessible data for the heatmap.** A data-bearing image
   requires `accessibleData`, using `structuredDataSchema`: source kind, title,
   unit, columns, rows with stable IDs/cells, source hash, and optional subtitle
   or source note. Every row must have one cell per column. The shared reader
   renders an adjacent accessible table. Obtain the actual approved coefficient
   values and labels from the researcher/source; do not guess values or convert
   this heatmap into a percentage-chart template.

4. **Bind the new fields to content integrity and revisions.** The current shared
   integrity snapshot includes link destinations, image classification and
   accessible data. Re-import/migrate legacy drafts using reviewed source
   evidence and generate matching snapshots. Do not recompute a hash merely to
   conceal drift. Adding these fields changes the package fingerprint and must
   advance its revision. Preserve the real report's UUID across that migration.

5. **Retain the remaining gates.** The May display date stays `2026-05-12`.
   Its public slug, summary, thumbnail/alt and image reviews still need decisions.
   Homepage featuring remains undecided. The manifest still requires an author
   handle; handleless authors remain a coordinated schema task, not a fabricated
   value.

There is also an existing synthetic stage with ID
`861a178c-bb41-4df2-8c5e-5aff2f1d1b35`, which matches the previously recorded
browser-only May draft ID. It was preserved rather than removed or reassigned.
Coordinate its relocation/removal before importing the real May report with
that ID; the importer correctly refuses to reuse its reserved synthetic slug
for a different report.

Shared implementation paths:

- `src\manifest\report-manifest.ts`
- `src\manifest\report-manifest.test.ts`
- `src\integrity\approved-content.ts`
- `src\report-system\report-renderer.tsx`

The shared schema remains backward-compatible version `0.1.0`, while website
package readiness adds the stricter image-classification requirement.

## Verification and release boundary

**40 focused tests passed**, covering package validation, shared schemas,
integrity, ingestion, idempotency, identity/revision conflicts, invalid assets,
added approval rejection and structured bitmap equivalents. Production-source
type checking, focused lint and an actual Next.js production build passed.
Pre-existing unit-test typing errors remain outside the production-source
configuration; type validation was not disabled.

Actual Edge/HTTP checks verified the synthetic catalog and reader, asset hash,
structured hyperlink rendering, mobile-visible author/date/read time, no mobile
page overflow, no browser exceptions, and zero POST requests. The report is
absent from the public catalog and `/reports/synthetic-publication-fixture`
returns 404. A separate temporary production server with private mode disabled
returned 404 for preview pages and assets; that helper was stopped afterward.

The May source still has seven audited hyperlinks and no approved accessible
heatmap data. No May package was ingested and no report was publicly released.
No release approval, publication receipt, commit, push, merge, or deployment was
created. Remote, production host and deployment trigger remain undecided.
