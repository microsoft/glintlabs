# Staging-to-production working rules

## Repositories

- Make all edits in `microsoft/glintlabs_staging`, the private staging repository.
- Never edit or commit directly in `microsoft/glintlabs`, the public production
  repository, and never push directly to its `main` branch.
- The staging working copy uses `origin` for
  `https://github.com/microsoft/glintlabs_staging.git` and `production` for
  `https://github.com/microsoft/glintlabs.git`. Verify these URLs before pushing.
- Follow `AGENTS.md` and applicable child-directory guidance.
- Keep explanations short. Lead with what changed and what the user needs to do.

## Making changes

1. Check the working tree and fetch staging before starting. Preserve unrelated
   uncommitted changes; never switch branches underneath another active session.
2. Create a new branch from current staging `main` for each requested change.
   Use an isolated worktree if needed to avoid disturbing existing work.
3. Implement and validate the change using the repository's existing checks.
4. Show the user the diff and validation results. Wait for explicit approval
   before merging the change into staging `main`.
5. After approval, merge into staging `main` and push only to staging. Report any
   branch protection or CI blocker rather than bypassing it.

The one-time commit adding these instructions directly to staging `main` is
explicitly authorized. Future changes use the branch-and-approval process.

## Promoting to production

Only start promotion when the user says "push to production" or explicitly
requests the equivalent.

1. Verify the remote URLs and fetch both `origin` and `production`. Use the
   fetched `origin/main` and `production/main` commits, not potentially stale
   local branches. Record both commit IDs so the reviewed and pushed content
   cannot change underneath the review.
2. Compare the exact trees of production `main` and staging `main`. Summarize
   every added, modified, deleted, or renamed file and give a plain-language
   summary of the changes. Also inspect commits unique to each branch. If
   production has commits absent from staging, stop and reconcile them through
   a staging branch and user approval before promoting; do not overwrite or
   silently omit production changes.
3. Before any push to production, scan the complete diff, changed files, and
   newly reachable commit history for secrets, internal-only links, internal
   data, and draft content. Review binary changes as well; do not claim they
   were scanned if they could not be inspected. Production is public, including
   release branches and their history. Warn the user with redacted findings and
   stop for remediation or explicit clearance of non-secret content. Never
   publish credentials or secrets, even if they were deleted in a later commit.
   State material scan limitations; never describe a best-effort scan as a
   guarantee.
4. Compute the release timestamp once, in `YYYYMMDD-HHMM` format, and reuse it
   for the branch and PR date. Note the timezone. Name the production branch
   `release/staging-YYYYMMDD-HHMM`. If it already exists, stop rather than
   overwriting it or silently choosing another name.
5. Push the exact reviewed staging commit to that new branch on `production`,
   never to production `main`. Do not force-push or mirror during promotion.
6. Open a PR in `microsoft/glintlabs` from the release branch into `main`, titled
   "Promote from staging – <date>". Use the same timestamp's date. Include the
   file list, plain-language summary, source and target commit IDs, validation
   results, and public-content review findings or limitations in the PR body.
7. Give the user the PR link and stop. Do not merge the PR, enable auto-merge,
   or otherwise trigger its merge unless the user explicitly says "merge it".
   Before an authorized merge, verify the intended PR and required checks;
   never bypass repository protections.

## Internal preview

Production uses GitHub Pages through `.github/workflows/site-ci.yml`.
Staging preview must remain access-controlled: a private repository does not
automatically imply a private Pages site. In staging Settings > Pages, use
GitHub Actions as the source and verify Pages visibility is Private before
deployment. Private Pages requires organization support through GitHub
Enterprise Cloud; if unavailable or blocked by policy, stop and involve an
organization administrator rather than publishing publicly. Verify the site's
base path matches its assigned private Pages URL before declaring preview ready.
