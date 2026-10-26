# Glint Labs Publishing Studio

Five-day FHL prototype for turning a trusted People Science Word report into an
accessible, on-brand, fidelity-checked preview without manual design or coding.

## Repository status

This repository is the private development and staging source for the Glint Labs
site. It must remain private and must not be used as the production deployment
source. Before the site goes live, the reviewed website source must be merged
into the official `microsoft/glintlabs` repository.

The shared Glint Labs visualization package is vendored at
`packages/data-visuals` so a clean checkout builds without sibling repositories.
Generated report content, previews, publication assets, and local review
evidence are intentionally excluded from Git.

## Prototype contract

Word starts the report; Publishing Studio becomes the approved web version.
The application must:

- validate the uploaded `.docx`;
- record a stable SHA-256 source hash;
- extract ordered semantic content into a versioned report manifest;
- preserve source locators for inspectability;
- surface unsupported or ambiguous content;
- lock stakeholder-reviewed words, data, imported assets, and semantic order;
- allow image descriptions, crop, focal point, and approved visual treatment
  without changing the source asset;
- extract structured Word tables and Office chart caches as immutable data
  evidence;
- generate coded data visuals only from compatible structured data after the
  author verifies the extracted labels and values;
- preserve bitmap visuals as their original images without extracting or
  inferring chart values from pixels;
- require intact approved content, verified data visuals, and zero blockers
  before publishing;
- render only from the current Studio report manifest; and
- publish a hosted Glint Labs preview for the research library and optional
  homepage placement.

The same unchanged source must produce semantically identical imported manifest
content. Presentation settings are layered on that imported version without
changing the original Word file or approved semantic snapshot.

## Current status

The browser-local prototype imports the V5 Word fixture, creates a deterministic
manifest and immutable approved-content snapshot, and renders a locked report
canvas. The Word filename in the header opens Document details, while Issues
and Visuals appear there only when action is required. This keeps the centered
report surface primary without a persistent tool rail. Selecting an image opens
presentation and accessibility controls.
The canvas does not insert new assets between approved blocks; report
components originate in the reviewed Word source. Locked text has no selection
or editing affordance, while actionable images and visuals retain explicit
controls. Structured data sources offer only compatible coded visual
treatments, and their labels and values remain read-only. Issues use a separate
highlight to identify their report source, and readiness is derived from
integrity rather than an author-controlled toggle.

Studio projects use a versioned, validated save format behind a replaceable
storage interface. The browser adapter uses IndexedDB so retained bitmap
evidence is not constrained by the much smaller `localStorage` quota, and
migrates existing local saves automatically. A separate `/preview/[id]` route
renders the saved project without authoring controls and is marked `noindex`,
preparing the application for private hosted previews without coupling report
components to a hosting platform.

**Publish to Glint Labs** opens a single publishing dialog after any missing
report-image descriptions are completed in Studio. Authors enter catalog
details, optionally preview the report, and explicitly select **Publish report**
to approve the exact staged revision on the connected test site. Unlocking
publishing, saving a draft, and previewing never publish. The approved report
appears in the Reports catalog and can optionally be featured on the homepage.
This machine-local flow is not a permanent production deployment. Publication
ZIPs are prepared internally for website staging, not offered as a separate
download in Studio.

Approved structured data can be rendered with compatible Glint Labs templates,
currently including horizontal bars, percentage rings, and two-series grouped
columns. The coded component is generated deterministically from the locked
source table or Office chart cache. Bitmap visuals remain original images;
there is no bitmap-to-data conversion. Previously saved bitmap-derived charts
retain their reviewed data and source evidence for compatibility.

Fidelity review items now retain deterministic issue codes, severity, and
source locators. Authors can accept or reopen warnings without hiding them.
Blockers cannot be accepted away and prevent publishing.

The application uses a semantic Glint Labs token layer in `src/app/globals.css`.
Foundation colors map to separate Studio and report roles so the authoring
workspace, reader preview, and visualization components can evolve without
copying raw color values between components. Studio typography uses native
Fluent UI text presets; report typography maps Fluent type tokens to semantic
report roles.

## WYSIWYG report rendering

The Studio canvas and reader preview use the same `ReportRenderer`. The canvas
adds selection, presentation, and issue affordances without changing the report's
layout, so authored content retains the same geometry when opened as a reader.
New reports use **New Fluent Colors**. Saved Research report and 2026 Annual
Report projects retain their original styles and remain readable. The selected
style is saved with the Studio project and hosted publication but does not
alter the approved-content fingerprint.
Authors can switch the canvas between one-click Desktop (1440 px), Tablet
(1024 px), and Mobile (390 px) viewports while retaining the same review and
selection controls.

The desktop rendering contract follows the Glint Labs `2026 paper` Figma frame:

- a 1440 px continuous report canvas;
- a 672 px editorial cover;
- a 752 px primary reading column beginning at x=441;
- a 170 px section rail beginning at x=150;
- Georgia display typography with Segoe Sans editorial and data typography;
- 96 px major-section spacing and 1 px full-column dividers; and
- shared report colors, radii, and visual spacing tokens.

The Studio keeps the desktop canvas geometry and scales it to fit the available
workspace, including when a context panel is open. Below the minimum useful
authoring scale, the canvas scrolls horizontally rather than reflowing into a
different composition.

Published reports use container-based responsive layouts. Tablet readers keep the
two-part cover while removing the side rail; mobile readers receive a compact
Glint Labs header, stacked cover, single reading column, reduced editorial
spacing, and stacked data components without page-level horizontal scrolling.

## Local development

Requires Node.js 22 or newer.

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

The production Annual Report reader is available at
`http://localhost:3000/annual-report-2026`. Its approved content model, source
hash, Figma mapping, and implementation assumptions are documented in
`docs/annual-report-2026.md`.

## End-to-end author flow

1. Start from `docs/templates/glint-labs-report-template.docx`, build data
   visuals in Excel, and paste finalized visuals into Word as embedded editable
   charts.
2. Complete CELA and People Science review on that same Word document.
3. Upload the approved `.docx`.
4. Review extracted content and resolve blockers.
5. Apply presentation-safe photo settings, add missing image descriptions in
   the Studio image editor, or convert verified structured data with a
   compatible coded visual. Bitmap visuals remain original images; source CSV
   data can optionally be attached in the image editor without changing the
   approved source snapshot.
6. Select **Publish to Glint Labs**, enter the report's catalog details and
   illustration, and optionally choose **Preview report**.
7. Unlock publishing if prompted, then explicitly choose **Publish report**.
   Unlocking prepares the report but never supplies publication approval.

The published preview remains tied to the locked report manifest. Content
corrections require an updated reviewed Word source and a new import; the
Studio intentionally does not provide a post-approval content revision mode.

## Validation

```powershell
npm run lint
npm test
npm run build
```

Release integration, provenance, hosting, accessibility, and performance gates
are documented in [`docs/release`](docs/release).

## Project structure

```text
fixtures/           Local source documents; report files are ignored by Git
artifacts/          Local generated manifests and previews; ignored by Git
src/extraction/     DOCX validation, hashing, and deterministic OOXML parsing
src/integrity/      Approved-content snapshots, hashing, and drift detection
src/manifest/       Versioned manifest schema and canonicalization
src/report-system/  Semantic report components and manifest renderer
src/review/         Fidelity failures, warnings, and approval workflow
src/project/        Versioned Studio project contract and storage adapters
src/visualization/  Accessible, manifest-backed Glint Labs data visuals
```

## Source-data safety

Do not commit Word reports, extracted media, generated manifests, or previews.
The repository should remain private when it is published to GitHub.
