# Website and Studio integration

## Scope and provenance

The maintainer subsequently confirmed the outstanding release and redistribution
approvals and explicitly requested merging and publishing. The approved hosting
decision is a public static reader on GitHub Pages, with authenticated Publishing
Studio remaining local. That later authorization supersedes the initial
local-only hold. Approval is the maintainer's attestation in this migration
conversation, not an independent legal or accessibility certification.

- Initial source: `ericschroen_microsoft/glintlabs-site-staging`, merged main revision
  `0ef824b3ad840a6a75d16261168bd0219f2ee510`, PR #2.
- Current source baseline: `7991c205b54b9efabffa1fdceb8208099ccf8848`, staging
  PR #3, containing polish commit `9705f3c837a698f347fe327ab1f25028640f8a7a`.
- Initial destination base: `microsoft/glintlabs/main`,
  `d1613e539d7a6fb1d8855f2cf1468495b262ae2e`.
- Initial migration branch: `users/bentankus/website-studio-migration`.
- The destination maintainer approved the isolated `website/` workspace and
  preservation of the source website/Studio design, including the dark Annual
  Report. This is a scoped migration exception, not a change to the plugin's
  Glint UI system or permission to introduce a site-wide dark theme.

All 684 tracked source files are mapped in `source-inventory.json`. Its source
hashes refer to the verified source checkout; destination hashes identify the
exact transferred bytes. Run `node scripts/verify-migration.mjs` from `website/`.
Original images, fonts, the local data-visuals package, and source evidence were
preserved during import. Subsequent intentional destination differences are
recorded in the inventory without changing the original source hashes. New tests
and export tooling are documented below. No original DOCX files are required for
normal builds. No ignored local data, credentials, build outputs, browser saves,
owner keys, or staged/published packages were transferred.

## Launch-polish follow-up

The follow-up branch `users/ericschroen/launch-report-polish` starts from the
merged migration at `a95f33f4d4868e040ad6b82810b85fed78062e85`. It applies only
the ten-file source delta between the initial import and current baseline:
existing Blue catalog illustrations and Home featuring, branded native figure
disclosures, Home-scale Research Drop titles, reference dividers/type, grid-seam
alignment and colors-only cumulative section-navigation highlighting.

Nine updated files match the new source exactly. The updated publication test
also retains the migration's approved-export integrity test. Inventory source
hashes now refer to the current source baseline; its original destination base
still records the initial import. The six documented migration differences,
build/export tooling, `/glintlabs/` handling, root plugin/Python files, original
report content/assets, dependency lockfile and owner/approval safeguards remain.
The static reader's source-revision marker advances to the same baseline.

The maintainer explicitly authorized merge and deployment once browser checks,
hosted CI and CLA pass, with Ben's review optional. This latest instruction
supersedes both the original draft-only hold and an intervening request for
pre-merge manual testing. It does not authorize an agent to sign the CLA or
bypass checks. All work already merged into destination main is retained;
separate feature branches are not silently included.

The follow-up adds a repeatable public-reader browser check as a separate
pre-merge release check. Site CI, main-only deployment conditions, permissions,
owner access and exact-revision publication approval remain unchanged. The
browser check is not automatically enforced by CI. The two inherited audit
failures remain disclosed in `validation.md`, not represented as passing.

## Intentional differences and additions

1. All source paths move under `website/`, except
   `.github/workflows/site-ci.yml`, which belongs at the destination root.
   The original Node application retains its root-relative routes. The separate
   Pages reader uses `/glintlabs/`; `website/` is only a filesystem workspace.
2. Site CI sets its run working directory and npm cache lockfile to `website/`,
   pins Node 22.23.4, and verifies the migration inventory. It keeps the source
   lint, test, public build, and production audit checks, and adds a verified
   public-reader build. PRs validate only. Main pushes upload `website/out` and
   deploy it to GitHub Pages with job-scoped Pages/OIDC permissions. Studio,
   API routes, private previews, owner state and ignored local packages are not
   deployment artifacts. No credentials or protection bypass is added.
   A scoped `.github/workflows/.gitattributes` retains the workflow's LF bytes
   after relocation, including Windows checkouts with automatic CRLF enabled.
3. The imported `AGENTS.md` retains the source Next guidance and adds the
   maintainer-approved scoped design decision.
4. `next.config.ts` fixes output-file tracing to the website working directory,
   preventing Next from selecting an unrelated parent/home lockfile as its
   workspace root. No route, preview, owner-auth, or publication checks change.
5. `tsconfig.publication-preview.json` adds the required
   `.next-local-studio/types/**/*.ts` include. Next otherwise rewrites this
   source file during the required connected build. Existing includes remain.
6. `package.json` adds Pages build/export/preview/browser-check commands and four focused build
   tests to the existing test command; dependencies and lockfile are unchanged.
   `publication-preview.test.ts` adds one approved-export integrity test without
   changing existing assertions.
7. This integration record, the inventory, its verifier, and validation evidence
   are integration-only additions. The source README and release registers were
   initially retained unchanged. The [website README](../../README.md) now
   describes the official public repository and current deployment boundaries.
   Historical release registers have contextual notes; their original entries
   and approval evidence remain intact. These documentation differences are
   recorded in the inventory while retaining original source hashes.

There were no pre-existing destination path collisions. At initial migration,
the destination's root instructions, README, MIT license, Analyze Survey skills,
Python tooling, examples, schemas, and tests were left untouched. No source
license file was tracked; this migration does not assert licensing or
redistribution rights for the vendored package, fonts, photographs, Figma
exports, or quotations.

## Current content and release decisions

The exact source revision and current validation supersede historical handoff
commits/test counts and obsolete UI instructions. Do not revert the current
experience to match older registers.

All three direct launch reports remain in Reports and are explicitly featured
on Home in the current source baseline, using the existing Blue illustrations.
This does not change other reports' Reports-by-default behavior: featuring a
Studio publication still requires its separate catalog option and approval.
November's text and images are explicitly cleared for public repository use;
its earlier private-only restriction is superseded. April retains the selected
April 14, 2025 header date. The February alias stays supported without a second
catalog card. The source text/link fingerprints and 18 image hashes are retained.
No importer was added or report regenerated. Analyze Survey continues to link
to the destination skill and uses the existing destination engine.

November clearance and the approved LSEG/Technology quotations do not clear
Caribay or unrelated materials. The source approval register contains historical
wording; current source and owner-approved updates govern those specific cases.
The maintainer's subsequent confirmation covers the outstanding approvals
needed for the requested public integration/release. The historical
`../release/asset-provenance.md` and `../release/publication-content-blockers.md`
registers are retained unchanged; this port neither invents evidence links nor
rewrites pending quotations. No confidential agreements belong in Git.

GitHub Pages hosts only the public reader. Connected Studio still needs a local
Node server and its API routes; it is not a static export. Public Studio hosting,
shared server-side storage, DNS changes and production credentials are outside
this approved architecture. Manual accessibility work and inherited audit
limitations remain identified in `validation.md`.
Source Actions were runner-policy blocked, not passing CI. Destination hosted CI
must be reported from actual destination runs, not inferred from local results.

The source's loopback port 3010, filesystem publication storage, cookie/session
behavior, and explicit origin allowlist (including its historical tunnel origin)
are retained, not silently retargeted to a production host. An approved hosting
decision for a future public Studio must address that allowlist and durable
storage. None of those runtime settings is used by the static reader.

## GitHub Pages reader and publication

Run from `website/`:

```powershell
npm run pages:build
npm run pages:preview
```

For the repeatable browser check, stop the preview first and run
`npm run pages:test:browser` after `npm run pages:build`. It starts and stops its
own loopback preview on port 3011 and a temporary headless Chrome profile.
Chrome must already be installed; set `CHROME_PATH` if it is not in a detected
location. No browser, dependency, owner key or publication data is installed or
copied. Port conflicts fail rather than attaching to or stopping another server.
The check covers ten routes at four widths, original image hashes, catalog
cards, report titles/references, native keyboard disclosures, forced colors
and cumulative colors-only section navigation. Evidence is written to ignored
`test-results/reader-browser.json`. Run this separate release check against the
actual exported reader before merging; the unchanged Site CI does not run it.
It is scoped regression proof, not full accessibility certification.

Open `http://127.0.0.1:3011/glintlabs/`. Check port 3011 first. Stop this foreground
preview with Ctrl+C. An agent-started preview must be stopped through its
recorded shell session, never by killing every Node process.

`scripts/build-pages.mjs` creates an ignored temporary reader workspace; it does
not modify the original app. Only that generated copy excludes private/server
route entrypoints, adapts the three dynamic public routes to static generation,
and prefixes local image/CSS URLs. Next's `basePath` handles links and scripts.
The generated hero-transition pathname normalization preserves behavior under
the Pages prefix. Original report copy, hyperlinks, images and Studio modules
are not rewritten in the tracked source. The original fonts/design are retained.
The build rejects unsigned-preview/owner-skip mode and verifies public routes,
project-relative URLs, original image hashes and absence of private/server
routes. `out/release.json` identifies the CI revision; local builds use null.

The three launch reports are direct content, not Studio publications. To add
other reports, use local Studio with its owner authentication and explicit
exact-revision approval, then run:

```powershell
npm run pages:export -- <approved-report-uuid>
```

Review the selected report's export under `pages-publications/`, including its
public-release clearance, and submit it through a feature branch and PR. Only
approved records, manifests and declared hash-checked images are copied.
Browser-saved drafts and ignored staged/published packages are not exported
automatically. Saving, unlocking, staging and previewing still do not publish.
The main-branch workflow publishes only after merge; no importer was added.

Repository Pages must use **GitHub Actions**, not a legacy root/branch build.
The destination is `https://microsoft.github.io/glintlabs/`; no custom domain
or DNS change is required. A rollback is a reviewed revert of the relevant
main-branch change, followed by the same validated Pages deployment. Studio
state remains local and is not part of the Pages rollback.

## Local validation and operation

Use Node 22.23.4 or a newer 22.x; do not update dependencies:

```powershell
Set-Location <official-clone>\website
npm ci
node scripts/verify-migration.mjs
npm test
npm run lint
npm run build
npm audit --omit=dev --audit-level=high
```

The public build must have `GLINT_LABS_UNSIGNED_PREVIEW` and
`GLINT_LABS_SKIP_OWNER_KEY` unset. Use a separate distribution for connected
Studio; check port ownership first and do not stop another user's process:

```powershell
Get-NetTCPConnection -LocalPort 3010 -State Listen -ErrorAction SilentlyContinue
$env:NEXT_DIST_DIR = ".next-local-studio"
npm run studio:build
npm run studio:start
```

Open `http://127.0.0.1:3010`. Leave owner authentication enabled. The server
creates/reuses this machine's own key, never Eric's. To unlock, the local owner
can use `npm run studio:owner-key` privately and enter it in Studio; do not
include its output in logs, screenshots, issues, or this repository. Unlocking,
saving, staging, and previewing do not approve or publish. No publication is
part of migration validation.

Stop the foreground server with Ctrl+C in its terminal. For an agent-started
server, stop its recorded shell session, not all Node processes. Remove
`NEXT_DIST_DIR` from that terminal after stopping. A public smoke server can
instead use `npm run start -- --hostname 127.0.0.1 --port 3011` with preview
environment variables and `NEXT_DIST_DIR` unset. See `validation.md` for measured
results and evidence limitations.

## Eric's ongoing editing workflow

Keep the private staging checkout intact. After official integration, use a
separate clone of `microsoft/glintlabs`, fetch current main, create feature
branches, and submit PRs; do not repurpose the private staging checkout.

The portal's linked public-contributing identity must be confirmed with
Microsoft's approved open-source account-linking process. Do not infer identity
from an email suffix or assume `ericschroen_microsoft` is suitable. Enterprise
Managed Users have public/outside-enterprise contribution restrictions; repo
Admin permissions cannot remove those restrictions. Link the permitted public
GitHub account, use authorized portal elevation or request Write access, then
authenticate Git/GitHub CLI and Copilot with that identity. No account switching
or permission changes are part of this port.
