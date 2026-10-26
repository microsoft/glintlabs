# Local migration validation

## Revision and boundary

Source: `0ef824b3ad840a6a75d16261168bd0219f2ee510`.
Destination base: `d1613e539d7a6fb1d8855f2cf1468495b262ae2e`.
Branch: `users/bentankus/website-studio-migration`.
These are local Windows results using Node 22.23.4 and npm 10.9.9.
No dependencies were upgraded. No report was published, no credentials were
copied or printed, and no authentication/approval checks were bypassed.

## Initial full-runtime checks

| Check | Measured result |
| --- | --- |
| `npm ci` | Pass; 361 packages installed from unchanged lockfile, zero audit findings |
| `node scripts/verify-migration.mjs` | Pass; 684 mappings, 680 byte-identical source files, four documented differences |
| `npm test` | Pass; 276 tests, zero failures/skips |
| `npm run lint` | Pass |
| Clean public `npm run build` | Pass, including type checking; unsigned-preview and owner-skip environment variables unset |
| `NEXT_DIST_DIR=.next-local-studio npm run studio:build` (PowerShell assignment) | Pass, including type checking; no owner bypass |
| `npm audit --omit=dev --audit-level=high` | Pass; zero vulnerabilities |
| Destination `python -m pytest tests -q -p no:cacheprovider` | 147 passed in 117.62 seconds; two existing invalid-date parsing warnings |
| Original destination files | Unchanged against destination base; original dirty checkout preserved |
| Hosted destination CI | Not run at initial validation; actual PR/main results must be checked separately |

Both builds were repeated after the documented tracing-root and TypeScript
include adaptations. The final build has no inferred-home-lockfile warning
and no build-time tracked-source rewrite. The source package's installed
Next 15.5.28 does not contain the `dist/docs` directory mentioned by its agent
guidance; the tracing-root adaptation follows the version-15 official
`next-config-js/output` reference. No original application implementation was changed.

## Public and connected browser evidence

Both servers were loopback-only: public mode at port 3011 and connected Studio
at port 3010. Port ownership was checked before starting. Connected Studio used
new validation-local machine owner state, not a transferred key.

Each mode passed:

- 10 HTTP routes: Home, Reports, Tools, About, Annual Report, Studio, the three
  direct launch reports, and the February legacy alias.
- All three launch catalog entries appear exactly once. November is public
  without a private notice, robots noindex metadata, or noindex response header.
- 36 image responses: all 18 original images directly and through `/_next/image`
  return 200 and match their source SHA-256 hashes byte-for-byte.
- Nine unauthenticated checks: owner GET and stage/approve POST return 401;
  owner-only preview routes/assets and optimized private assets return 404.
- 40 responsive route states at 320, 390, 768, and 1440 pixels: all requested
  routes load, images finish loading, and no page-level overflow is detected.
- Every rendered launch-report text block and source hyperlink wording/target
  matches the committed source mapping. Chart aspect ratios, exact expandable
  descriptions, headings/metadata, and desktop section navigation pass. Hero
  photography retains the source cover treatment rather than being incorrectly
  tested as an uncropped inline chart.
- Each of the three launch reports and the alias has zero scoped axe WCAG
  A/AA violations at all four widths.
- 36 participant-modal states: three initiating controls, three tabs, four
  widths. Correct initial sample, exact approved summary, n/Orgs labels, one
  shared dialog, sticky header, hidden scrollbar, 48px fade, fade clearing at the
  end, Escape dismissal, and initiating-control focus restoration pass. Scoped
  modal axe reports zero violations.
- No captured runtime, console-error, failed-network, or HTTP-error events
  during successful browser checks.

Additional public-mode Analyze Survey checks pass at all four widths: explicit
terminal/GitHub Copilot CLI guidance, exact skill URL and starter prompt written
to the real clipboard, Visit GitHub target/new-tab behavior, copy announcements,
simulated clipboard-denial/manual-copy recovery, Escape and asynchronous focus
restoration, and zero scoped modal axe violations.

The retained Annual Report accessibility audit passes at 1440, 1280, 1024, 768,
390, and 320 pixels: zero scoped WCAG violations, valid page semantics, no
page-level horizontal overflow, automatic reduced-motion scrolling, and zero
active animations in reduced-motion mode.

Raw loopback evidence and the supplemental browser harness are retained in the
local Copilot session's `files/` directory as `migration-public-results.json`,
`migration-connected-results.json`, `migration-setup-results.json`, and
`validate-migration.mjs`. Original audit output is ignored under
`website/test-results/`. These are local evidence, not hosted CI or a live
production preview.

## Inherited failures: not weakened or represented as passing

1. `npm run assets:annual-report` fails because the source dependency graph and
   `docs/release/annual-report-assets.json` disagree. The identical verifier
   fails at the exact detached source revision as well. The graph includes
   different principle-link assets and SVG/WebP paths, among other differences.
   No asset, manifest, approval state, or integrity check was regenerated to
   hide this discrepancy. All transferred files retain their inventory hashes;
   all 18 launch-image hashes pass independently. The old 51-runtime-asset
   register must not be described as current validated evidence.
2. `npm run accessibility:interactions` fails its touch-target assertion with a
   zero-by-zero rectangle at the 390-pixel viewport. The unchanged original
   source harness reproduces it. Diagnostics show it measures hidden desktop
   navigation links (Reports/Tools/About) as touch targets. The visible Glint
   Labs link measures approximately 192.8 by 44 pixels. The retained harness
   was not weakened or edited. Its remaining post-failure checks are not
   claimed as completed; supplemental participant and setup keyboard/focus
   checks are separately identified above.

## Approved Pages architecture and final local evidence

The maintainer subsequently confirmed outstanding release/redistribution
approvals, authorized merge/publication and selected GitHub Pages. The approved
architecture is a separate static public reader at `/glintlabs/`, local
authenticated Studio, and explicit approval/export/PR publication. That later
authorization supersedes the initial local-only hold. It is owner attestation,
not independent legal evidence or a claim that historical audit failures passed.

Final website tests: **281 passed, zero failed/skipped** (the original 276 plus
four reader-build tests and one approved-export test). Lint and the original
full Node production build pass. Dependencies/lockfile remain unchanged.
The final connected Studio build also passes with its separate distribution
and no owner bypass. The final production audit reports zero vulnerabilities.
The refreshed inventory verifies 684 mappings: 678 byte-identical and six
documented differences. All 684 staged source blobs match their raw working
bytes, including LF preservation; no original destination files are staged.
The static build generates 18 pages, with Studio/API/private-preview routes
absent. Its artifact verifier checks the ten required public routes, project
URL prefixing and all 18 original launch-image hashes. No unsigned-preview or
owner-skip mode is used. The original connected application remains available;
no original route implementation was replaced to accommodate Pages.

The static browser harness passes:

- Ten HTTP routes, 18 byte-for-byte original images and ten absent-route/API
  checks. November has no private notice or noindex restriction. Catalog cards
  appear once each; the February alias works without a duplicate card.
- Forty responsive route states at 320/390/768/1440 pixels, exact reader
  text/hyperlinks, image alt text/aspect ratios, expandable descriptions, scoped
  report axe, section navigation, 36 participant-dialog states and setup-modal
  clipboard/error/focus checks.
- Five real client link navigations under `/glintlabs/`, including Home,
  Reports, Tools, About and Annual Report, with no captured runtime, console,
  failed-network or HTTP-error events.

Pages correctly has no owner endpoint (404), publishing API or optimized
private-image route; the full local Studio still uses the original 401 owner
authentication boundary measured above. No local drafts, ignored publication
packages, credentials or environment files were included. The newly approved
export path rejects staged-only/tampered records and copies declared assets
only; no new report package was published during migration.

Static evidence is session-local `pages-browser-results.json`,
`validate-pages.mjs` and `pages-final-tests.log`. One harness run completed all
browser assertions but failed writing an absolute Windows output path; that
evidence-output bug was corrected and the complete run repeated successfully.
The original runtime harness and evidence were preserved.

## Remaining limitations and delivery verification

The two inherited source-check failures above remain unmodified and are not
passing checks. Manual Narrator/NVDA, High Contrast, zoom and comprehensive
keyboard/touch review remain unverified; scoped axe is not accessibility
certification. Historical approval registers remain intact rather than being
rewritten with invented evidence. Studio remains local, not publicly hosted.

Actual PR CI, merged revision and Pages deployment must be verified on GitHub.
Local results are not hosted CI or live availability. The deployed artifact's
`release.json` identifies its build revision and original source commit.
See the integration document for local operation, export/PR workflow and
reviewed-revert rollback. Session-local browser/owner state remains outside Git;
none is a transferable credential or a migration deliverable.
