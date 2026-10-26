# Explicitly approved publications for GitHub Pages

This directory starts empty of report data. The three source-mapped launch
reports are already direct website pages and are not duplicated here.

Run local authenticated Studio, stage and review a report, then explicitly
approve its exact revision. Only then run:

```powershell
npm run pages:export -- <approved-report-uuid>
```

The command verifies the existing approval fingerprint, source integrity,
manifest, and every declared asset using the same loader as the runtime site.
Only the selected approved report and declared assets are copied here. It does
not approve, stage, or deploy anything. Review the changes and send a PR.

The Pages build reads this directory, not local browser storage, private
previews, drafts, or ignored local publications. A merged PR deploys the public
reader. Studio, owner APIs, and private previews are never part of that artifact.
