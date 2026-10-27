# Official repository handoff

> Historical staging handoff. The source has since been integrated into the
> official public repository. The private-source hold and runner-policy status
> below describe that earlier handoff, not the current deployment. See the
> [integration decision](../migration/integration.md#scope-and-provenance)
> and the [current website README](../../README.md#repository-status).

## Release gate

This private repository is a recoverable staging source, not the production
source. The site must not go live until the reviewed source is merged into
[`microsoft/glintlabs`](https://github.com/microsoft/glintlabs).

The private staging repository contains `.github/workflows/site-ci.yml`, but
its current enterprise policy disables GitHub-hosted runners. Run
`39038073881` therefore failed before checkout with no workflow steps executed.
An administrator must enable a compatible runner, or the official repository
must provide one, before hosted CI can pass. The exact pushed commit was also
validated from a fresh local clone with the same install, lint, test, build,
and production-audit commands.

The validated release-preparation source is commit
`46c15ab8ec8b4a1958f688fb7206455443e79292`. Record the final handoff commit in
the official pull request before review begins.

## Proposed repository shape

The existing official repository contains the People Science plugin suite.
Preserve that suite and add the site as a separate top-level workspace:

```text
microsoft/glintlabs/
  website/
    docs/
    packages/
    public/
    scripts/
    src/
    package.json
    package-lock.json
    next.config.ts
    tsconfig.json
  ...existing plugin source
```

The exact directory name and workflow paths require approval from an official
repository maintainer. Do not replace or reorganize the plugin suite as part of
this website pull request.

## Design-system decision required

The official repository requires the Glint UI system for interface changes.
The shared Glint Labs navigation is documented as light-mode, while the
approved 2026 Annual Report is a dark editorial experience sourced from Figma.

Before opening the official pull request, a repository or design-system owner
must document one of these scoped decisions:

1. Approve the dark treatment as an Annual Report-only design exception while
   keeping the core site and shared Glint UI components light.
2. Provide an approved dark publication variant in the Glint UI system.
3. Direct a redesign of the report into the existing light system.

Do not silently treat the report as a new site-wide dark theme.

## Integration procedure

1. Obtain write access or pair with an existing `microsoft/glintlabs`
   maintainer who can push a branch.
2. Start from the latest `microsoft/glintlabs/main`; do not branch from the
   current private staging history.
3. Rebase or recreate the integration branch if `main` changes before final
   validation.
4. Copy the staging source into the approved top-level site directory,
   excluding ignored generated content, local builds, credentials, and review
   artifacts.
5. Move or adapt `.github/workflows/site-ci.yml` to the official repository
   root and set `working-directory` and npm cache paths for the chosen site
   directory.
6. Run the complete validation set from a clean checkout:

   ```powershell
   npm ci
   npm run lint
   npm test
   npm run build
   npm audit --omit=dev --audit-level=high
   ```

7. Run `npm run accessibility:audit -- <url> <cdp-port>` against the production
   build and complete the manual checks in
   `docs/release/accessibility-readiness.md`.
8. Open a draft pull request with the scope and approvals below. The site
   remains non-production until that pull request is reviewed and merged.

## Pull request contents

The pull request description must include:

- the problem: Glint Labs needs an official, reviewable source for the public
  site and 2026 Annual Report;
- the solution: a self-contained Next.js site in an isolated top-level
  directory that preserves the existing plugin suite;
- the final private-source commit and integration branch base;
- the approved directory structure and scoped design-system decision;
- build, test, audit, browser, and accessibility results;
- asset, content, legal, privacy, trademark, and customer-quote approvals;
- the selected hosting architecture and deployment owner;
- preview URL, rollback procedure, and monitoring owner;
- explicit confirmation that generated/private content is excluded; and
- a statement that merging the PR is necessary but does not itself authorize a
  production launch.

## Maintainer checklist

- [ ] Official repository write path confirmed.
- [ ] `website/` or alternate top-level structure approved.
- [ ] Dark Annual Report design decision recorded.
- [ ] Asset and content approval table has no unresolved release blockers.
- [ ] Hosting decision record is approved.
- [ ] Clean install, lint, 114 tests, build, and production audit pass.
- [ ] Automated and manual accessibility evidence is attached.
- [ ] Complete pull request description is present.
- [ ] Preview is reviewed before production deployment.
- [ ] Rollback owner and last-known-good artifact are identified.
