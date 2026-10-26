# Integrate Glint Labs website, local Studio and public GitHub Pages reader

The maintainer confirmed outstanding release/redistribution approvals and
explicitly authorized merge and GitHub Pages publication. The subsequent
approved architecture keeps authenticated Studio local and publishes only the
static reader. This supersedes the original local-only migration hold.

## Change

Port the exact merged source `0ef824b3ad840a6a75d16261168bd0219f2ee510`
from Eric's staging PR #2 into isolated `website/`, based on official main
`d1613e539d7a6fb1d8855f2cf1468495b262ae2e`.

Preserve the existing Analyze Survey plugin, Python engine/tooling, examples,
tests, README, instructions, and license. Preserve all website/Studio routes,
source report copy/links/images, assets, local visualization package, original
tests, browser draft persistence, owner authentication, source integrity, validated asset
serving, and exact-revision approval. No redesign, dependency upgrade, importer,
account changes, or automatic publication of local Studio reports.
Add an isolated static-reader build for `/glintlabs/` without removing or
weakening the original Node/Studio application.

The destination maintainer approved `website/` and source-design preservation,
including the scoped dark Annual Report exception; plugin UI rules are
unchanged. See [integration.md](integration.md) for that decision and local
run/stop and Eric's account-linking/editing handoff.

## Fidelity and intentional differences

The [source inventory](source-inventory.json) maps all 684 tracked source files
with source/destination SHA-256 hashes. 678 are byte-identical. Six differences:
root-relocated CI with website paths, Node 22.23.4 and main-only Pages deployment;
scoped AGENTS guidance; website-local output tracing; connected-build TypeScript
path; new npm scripts/test selector; one additional approved-export test.
Integration documentation, export/build/preview/verification tooling and four
focused static-build tests are additions. No original application
implementation, content, assets, dependency versions or lockfile were changed.
An adjacent `.gitattributes` preserves the relocated workflow's LF bytes on
Windows as well as Linux.

All three launch Research Drops remain direct Reports pages, unfeatured by
default. November's specific public clearance is preserved; April keeps 2025;
February's legacy URL has no duplicate card. No browser drafts or ignored
published/staged packages were migrated.

## Local evidence

See [validation.md](validation.md) for exact results and limitations:
281 website tests and 147 existing Python tests pass; lint, clean public build,
connected build, production audit (zero vulnerabilities), and inventory pass.
Both modes pass route, source text/link, 18 image/hash, responsive, scoped
accessibility, participant-modal, and unauthenticated protection checks.
Analyze Survey clipboard and error/focus behavior pass. The Annual Report axe
audit passes at six widths.

Two additional retained source checks fail unchanged: the historical Annual
asset register disagrees with current source, and the original interaction
harness measures hidden desktop links as zero-sized mobile targets. Neither
was weakened. Manual accessibility review is outstanding. Source Actions never
executed under its runner policy; destination hosted CI must be verified on
this PR and the main-branch deployment.

## Publication and operational boundary

PRs run inventory, lint, all tests, full Node build, production audit and static
reader build without deployment. A main push uploads only `website/out` and
deploys through GitHub Actions to `https://microsoft.github.io/glintlabs/`.
Public Studio/API/private-preview routes are absent. No local draft, owner key,
browser profile, ignored publication or environment file enters the artifact.

Future publication requires local exact-revision approval, an explicit selected
report export, review/PR and merge. Nothing is exported merely by saving,
previewing, unlocking or staging. A reviewed revert and redeployment rolls back
the reader. Local run/stop and Eric's separate-clone/account-linking instructions
are in the integration document. No existing checkout or uncommitted work was
replaced. Manual accessibility work and inherited source-check failures remain
limitations rather than claimed green checks.
