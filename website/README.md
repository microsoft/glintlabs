# Glint Labs website and Publishing Studio

This workspace contains the public Glint Labs website and local Publishing
Studio. Studio began as a five-day FHL prototype for turning a trusted People
Science Word report into an accessible, on-brand, fidelity-checked preview
without manual design or coding.

## Repository status

This workspace is part of the official public
[`microsoft/glintlabs`](https://github.com/microsoft/glintlabs) repository.
The [public website](https://microsoft.github.io/glintlabs/) is a static reader
deployed to GitHub Pages by Site CI after validation on `main`. Only the generated
`website/out` reader is uploaded.

Authenticated Publishing Studio, owner APIs, private previews, and local
publication storage require a local Node server and are excluded from that
deployment. Local-only describes their runtime, not the visibility of their
tracked source code.

The [integration record](docs/migration/integration.md) documents the approved
public-reader/local-Studio architecture and supersedes the original private
staging hold. Historical release records retain their original evidence and
decisions; they are not a blanket prohibition on the approved public reader.

The shared Glint Labs visualization package is vendored at
`packages/data-visuals` so a clean checkout builds without sibling repositories.
Private drafts, staging output, and local review evidence remain excluded from
Git. Explicitly approved Studio exports can be reviewed and committed through
the [Pages publication workflow](pages-publications/README.md).

## Supabase site analytics

Analytics is **off by default** in both Supabase and Pages. Ordinary Next builds,
Studio, previews, localhost, and other origins never collect. The only approved
collector is `glintlabs-telemetry` in project `kkthgbgkzzkfpmnbjmro`.

When the production flags are enabled, the public reader automatically sends
page views, Analyze Survey opens, skill-link clicks, and report-download clicks.
There is no consent prompt, floating analytics widget, or on-site opt-out control.
The tracker renders no UI. Plain text in the existing marketing footer explains
collection and storage beside the existing Microsoft Privacy Statement link.
Publishing this policy requires the site's privacy/legal owner's approval;
default-on persistent identifiers are not universally exempt from prior-consent
requirements. Opening a report is
a page view, not a second event. Download clicks measure intent, not completed
downloads; there are no invented download controls. Tool interest is not survey
execution. Event counts are not adoption or completed conversions.
Browser DNT/GPC signals and unexpired refusals under either previous consent
version still stop collection, abort pending requests, and delete the browser ID.
No new consent record is written or implied. Existing refusals retain their
original 180-day expiry. Unreadable or malformed preferences stop collection with
an explicit diagnostic rather than silently overriding a possible refusal.
A random UUID identifies a tracked browser/device for a fixed 18 calendar months,
clamped to the target month's final day when needed. Use does not extend its
expiry. It is created automatically only after the enabled-production,
reviewed-path, browser-privacy, and existing-refusal checks pass.
Stopping collection cannot recall events already received.

The collector HMAC-hashes the random ID with a separate server-only secret
before database insertion; it never stores the original UUID in event rows.
`glintlabs_telemetry.page_visitors` counts distinct browser hashes per page over
the retained 90-day event window. These are approximate tracked browsers,
not verified people or accounts. Changing devices/browsers, clearing storage,
ID expiry, or privacy-signal deletion and later recreation can increase counts. Old anonymous
events remain usable for event totals but cannot be retroactively deduplicated.
If preferences can be read but the ID cannot be saved, an explicit diagnostic is logged and anonymous
version-1 events continue; those events do not contribute to browser counts.
Compute distinct counts for the whole desired window; never sum daily distinct
counts. Use `supabase/reports/telemetry.sql` in the restricted SQL editor.

The shared contract in `src/telemetry/contract.ts` permits only reviewed public
paths, four event names, and predefined referral/campaign-source categories.
Queries, fragments, referrer URLs, survey data, employee data, free text,
timestamps supplied by visitors, and employee/account identifiers are never sent.
Version 2 additionally permits only a random UUID browser identifier; version 1
remains accepted for anonymous events from older pages.
Add newly approved public report paths to that contract when publishing; an
enabled Pages build refuses to ship unknown public report identifiers.

### Deploy safely to the approved existing project

Use the Supabase CLI from the repository root. Authenticate locally with
`npx supabase login`; never paste access tokens or privileged keys into chat,
source, GitHub variables, or browser code.
On Windows PowerShell, use `npx.cmd` if its execution policy blocks the
`npx.ps1` launcher; changing the execution policy is unnecessary.

1. Confirm project access/region with `npx supabase projects list`, then run
   `npx supabase link --project-ref kkthgbgkzzkfpmnbjmro`.
   Check for name conflicts with the new `glintlabs_telemetry` schema,
   `public.glintlabs_record_event` function, and function/job names before applying.
   Do not reset the database or reconcile another application's migrations.
2. Set `GLINTLABS_TELEMETRY_ENABLED=false` and a newly generated random
   `GLINTLABS_RATE_LIMIT_SECRET` and a separate `GLINTLABS_VISITOR_ID_SECRET`
   (each at least 32 random characters) using the project's
   Edge Function secrets UI. The runtime supplies `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY`; neither belongs in the site.
3. This is a shared project: inspect its migration history first. Apply only
   the reviewed telemetry migrations, in timestamp order, through
   the restricted SQL editor if its existing history differs. Do not blindly
   run `db push`, `migration repair`, or apply unrelated pending migrations.
   The first file creates isolated tables/RPC; the second requires `pg_cron`
   and schedules an hourly cleanup without modifying other jobs.
   The third adds only the nullable keyed visitor-hash column, compatible
   ingestion and the restricted distinct-browser view. Do not reapply the first
   two to an already-deployed schema. Provision the visitor-hash secret, apply
   the third migration, deploy the compatible collector, then release the new
   automatic client. Old version-1 events continue to work throughout.
   The authenticated CLI alternative is `supabase db query --linked
   --project-ref kkthgbgkzzkfpmnbjmro --file <reviewed-migration.sql>`.
   Direct SQL application does not modify shared Supabase migration history;
   check for already-applied resources before any later CLI migration operation.
4. Deploy `npx supabase functions deploy glintlabs-telemetry --project-ref
   kkthgbgkzzkfpmnbjmro`. `verify_jwt=false` is deliberate: this public event
   endpoint accepts unsigned visitors, not authenticated users. Origin checks
   and CORS are not authentication. Public roles cannot execute the ingestion
   RPC or read/write tables/views. Reporting is SQL-editor-only.
   Add `--use-api` to deploy without a local Docker daemon.
5. While the browser flag is still off, enable the backend secret and send one
   synthetic event using the shared contract. Verify its stored columns,
   rejection of invalid bodies, anonymous read/write/RPC denial, limits, and
   the retention job/run in `supabase/reports/telemetry.sql`. Remove the known
   synthetic test row by its returned SQL-editor row ID; do not delete real
   rows by broad date range. Only then enable Pages.
6. Set repository **Actions variable** `GLINTLABS_PAGES_TELEMETRY=true` and run
   Site CI on `main` after merging. Only this public Pages build replaces the
   disabled config module, and the flag is never enabled for PR builds.
   Verify first-visit collection without interaction, no consent or opt-out
   controls, preserved refusals, DNT/GPC suppression, and navigation/click events.
   Never include a service key or access token in that build.

To stop collection immediately, set the backend secret to `false`. To remove
the client and its disclosure, set the Actions variable to `false` and rebuild Pages.
Deployments do not automatically enable collection.

### Retention, operations, and interpretation

The private `glintlabs_telemetry` schema keeps raw events for 90 days, with hourly
deletion (expired rows may remain until the next successful run, at most an
hour during normal operation). Views always exclude events older than 90 days.
The hourly job removes rate counters older than 48 hours. No longer-lived
aggregates are created. Check cron run failures and Edge Function diagnostics;
a failed retention job must be fixed, not treated as a successful purge.
Supabase infrastructure/access logs, backups, and point-in-time recovery have
their own project-level retention. Confirm their policy with the shared-project
owner; deleting application rows does not erase provider backups or logs.
An 18-month browser-ID lifetime does not extend raw-event retention beyond
90 days. Keep the visitor-hash secret stable; rotating it changes hash identity
and can count a returning browser again within the retained reporting window.

The gateway necessarily sees network addresses. The collector does not log
bodies, addresses, user agents, or credentials. A secret-keyed HMAC changes daily
and is stored only in separate rate counters, never linked to event rows.
Limits are 30 submissions/address/minute, 300 globally/minute, and 10,000
globally/day, atomically enforced in PostgreSQL. Rejected address-level attempts
also consume global quota. These bound database writes/counter growth, not
Edge Function invocations or malicious traffic costs. CORS can be spoofed by
nonbrowser callers; forwarded address controls depend on the trusted gateway.
Bots, shared NATs, privacy preferences, blockers, caps, and failures make these
approximate event counts, not a census or bot-proof attribution system.

Run `npm test` and `npm run lint`. Telemetry database tests use embedded
PostgreSQL (PGlite) to execute the real schema, RPC, RLS/permissions, limits,
retention function, and reporting queries without Docker or production access.
They do not emulate the hosted gateway or run `pg_cron`; verify the schedule
and actual execution in the approved project before enabling production.
`GLINTLABS_PAGES_TELEMETRY=true npm run pages:build` (set the variable using your
shell syntax) validates the enabled static build. `npm run pages:test:browser`
checks the exported reader; `npm run pages:test:telemetry` checks the enabled
reader at its production origin using browser request interception. The test
serves every production request locally and intercepts all collector requests;
it never sends test visits to the real project. Set `CHROME_PATH` if needed.

## Microsoft Clarity regional tracking

Clarity project `z4zyk0yyz7` runs alongside Supabase only when the independent
production Pages build flag `GLINTLABS_PAGES_CLARITY=true` is enabled. Checked-in
configuration, ordinary Next builds, PR builds, Studio, private/unreviewed paths,
previews, localhost, DNT/GPC, and existing refusals never load the tag.
There is no consent box, banner, or new consent record. The existing footer
discloses Clarity beside the Microsoft Privacy Statement.

The tag uses Clarity's own IP-based regional consent enforcement. No Consent API
call grants consent or overrides geography. Under the currently documented
defaults, visitors in the EEA, UK, and Switzerland remain in limited cookieless
mode without consent; other visitors can receive cookie-based tracking if the
project's cookie setting permits it. Do not substitute browser language, timezone,
or a separate geolocation service. This follows Clarity's enforced regions,
not an exhaustive determination of every jurisdiction's privacy law.
The site's privacy owner must confirm requirements for its audience.

### Setup and rollout

1. In project `z4zyk0yyz7`, **Settings > Setup > Advanced settings > Cookies**
   must be **On** for cookie-based sessions outside consent-required regions.
   Turning it off makes tracking cookieless everywhere. Do not send an artificial
   `consentv2` grant to bypass regional enforcement.
2. Review masking, advertising/data-use settings, and the site's privacy notice
   with the project/privacy owner. Clarity captures public-page DOM, interactions,
   and URLs/referrers; the Supabase-only coarse URL/category restrictions and
   90-day retention do **not** apply to Clarity. No Supabase browser ID, account
   identifier, or custom identifier is forwarded. Private Studio and survey
   uploads are not in Pages.
3. Set repository Actions variable `GLINTLABS_PAGES_CLARITY=true` and merge the
   integration to `main`. Keep `GLINTLABS_PAGES_TELEMETRY` unchanged. The Clarity
   integration needs no Supabase schema or collector changes.
4. Verify live visits from an EEA/UK/Swiss connection and a non-enforced region.
   Confirm denied analytics storage/no `_clck` or `_clsk` cookies in the former,
   cookie-based sessions in the latter when the project permits them, and no
   consent UI. Inspect Clarity metadata as described in Microsoft's
   [Consent Mode documentation](https://learn.microsoft.com/en-us/clarity/setup-and-installation/consent-mode).
   Local intercepted tests validate our integration, not the vendor's geolocation
   or the authenticated project's settings.

Cookieless page views do not provide comparable unique-user, returning-user,
multi-page funnel, or time-per-session metrics. Segment interpretations by
tracking mode/region rather than treating Clarity as a census. Supabase remains
the existing event-count baseline; its browser counts are approximate too.

Privacy checks run before loading and again on navigation, focus, visibility,
and cross-tab preference updates. A refusal stops Clarity and removes the tag;
already transmitted data cannot be recalled, and stopping can flush prior buffered
events. Once stopped, Clarity does not restart until a reload passes the checks.
Tag-loading failure logs a diagnostic and leaves navigation/Supabase unaffected.
Disable the Actions flag and rebuild Pages to remove the integration.

For local checks, enable both build flags using your shell's environment syntax,
run `npm run pages:build`, then run `npm run pages:test:telemetry` with the same
flags. The browser check intercepts **all** page requests and uses a fake Clarity
tag; no test visits reach either analytics provider. A disabled build can be
checked with both flags `false`.

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

Publishing to the connected local test site does not update GitHub Pages.
For the public reader, export the explicitly approved revision through the
[Pages publication workflow](pages-publications/README.md), review its changes
in a pull request, and merge through Site CI. Unlocking Studio never replaces
the exact-revision approval or repository review.

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

Do not commit private Word report inputs, raw respondent data, credentials,
owner keys, browser saves, or unapproved generated content. Ignoring a file or
omitting it from the deployed reader does not make an already tracked file
private.

Reviewed public report content and assets may be tracked in this public
repository. Studio exports must follow the exact-revision approval and
[Pages publication workflow](pages-publications/README.md); private drafts and
local staging output must remain excluded.
