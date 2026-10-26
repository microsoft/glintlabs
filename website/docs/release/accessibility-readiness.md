# Accessibility readiness

## Automated checks

Run the production build, start it, and launch Chromium with a remote debugging
port. Then run:

```powershell
npm run accessibility:audit -- http://127.0.0.1:3010/annual-report-2026 9342
```

The audit:

- runs axe WCAG 2.0, 2.1, and 2.2 A/AA rules at 1440, 768, 390, and 320 CSS
  pixels;
- fails on page-level horizontal overflow;
- verifies one main landmark, one H1, primary navigation, a valid skip target,
  and the dark native-control color scheme;
- verifies reduced-motion mode removes smooth scrolling and leaves no active
  animations; and
- treats 320 CSS pixels as the WCAG reflow equivalent of 400% zoom on a
  1280-pixel reference viewport.

Run the keyboard, focus-restoration, touch-target, semantic-heading, image-alt,
and forced-colors automation against the same browser session:

```powershell
npm run accessibility:interactions -- `
  http://127.0.0.1:3010/annual-report-2026 `
  9342 `
  test-results/annual-report-interactions.json
```

Results are written to `test-results/annual-report-accessibility.json`, which is
local release evidence and is intentionally excluded from Git.

## Existing browser interaction coverage

The Annual Report browser harness verifies:

- native radio keyboard selection and announced results;
- keyboard open, focus containment, Escape close, and focus restoration for
  the continuous-listening dialog;
- keyboard-reachable momentum points, expanded state, close controls, outside
  click dismissal, Escape dismissal, and trigger focus restoration;
- section anchors clearing the fixed navigation;
- no horizontal overflow at 1440, 768, 390, and 320 pixels;
- fixed navigation remaining visible and clickable while scrolling;
- details/disclosure behavior, structured tables, and exact report data; and
- all report images loading successfully without browser runtime errors.

## Manual release checks

Automation does not replace assistive-technology review. Complete these checks
on the exact official-repository release candidate and attach the evidence to
the pull request:

- [ ] Keyboard-only: traverse the whole page in source order; confirm no traps,
  hidden focus, or fixed-navigation obstruction.
- [ ] Windows High Contrast and forced colors: confirm text, controls, focus,
  selected states, charts, and table meaning remain perceivable.
- [ ] 200% text zoom and 400% browser zoom: confirm reflow, readable dialogs,
  usable charts, and no two-dimensional page scrolling.
- [ ] Reduced motion: confirm no non-essential motion or smooth scrolling.
- [ ] Screen reader with Narrator + Edge: confirm landmarks, heading order,
  navigation names, dialogs, disclosures, rating groups, chart controls,
  tables, image alternatives, and live results.
- [ ] Screen reader with NVDA + Firefox or Chrome: repeat the critical report
  reading and interaction path.
- [ ] Touch at 320 and 390 pixels: confirm controls are operable without
  gesture-only alternatives and overlays remain dismissible.
- [ ] Content review: confirm meaningful photography alternatives and
  decorative assets are correctly distinguished.

## Release status

Automated release-preparation results from October 17, 2026:

- 0 axe WCAG A/AA violations across the page shell and report sections;
- no horizontal overflow at 1440, 768, 390, or 320 CSS pixels;
- valid language, title, heading outline, landmarks, primary navigation, and
  skip-link target at each viewport;
- dark native-control color scheme present;
- reduced-motion mode uses automatic scrolling with 0 active animations;
- 101 Annual Report browser checks passed with 0 runtime errors; and
- 122 momentum interaction and responsive checks passed.

The manual checklist remains a production release gate. Record reviewer names,
dates, browser/assistive-technology versions, findings, and fixes here or link
them from the official pull request. Production release is blocked by any
unresolved WCAG A/AA violation, keyboard trap, inaccessible approved content,
or missing manual screen-reader review.

## October 17 release-preparation working tree

The release-preparation tree based on
`e9849bbdfdc8f4877a89553a779c4090efde5595` adds these scoped fixes:

- replaced paragraph elements nested inside report headings with phrasing
  content;
- expanded effective hit areas for rating options, the inline dialog trigger,
  dialog and popover close controls, momentum points, momentum keys, and Annual
  Report navigation;
- changed the skip-link reveal to `:focus-visible`; and
- added forced-colors selected-state, focus-token, rule, and link treatment.

Automated evidence on the isolated production build:

- 0 axe WCAG A/AA violations at 1440, 768, 390, and 320 CSS pixels;
- no horizontal overflow at those viewports;
- keyboard activation, Escape dismissal, and trigger-focus restoration pass
  for both the continuous-listening dialog and momentum details;
- keyboard radio selection updates the polite live result;
- report headings contain no paragraph children, all images have `alt`, and
  icon-only buttons have accessible names;
- tested navigation and custom-control effective hit areas are at least 44 by
  44 CSS pixels at the 390-pixel viewport;
- forced-colors emulation preserves selected-state contrast and visible focus;
- reduced-motion mode has automatic scrolling and 0 active animations; and
- the runtime requests exactly the 51 assets in
  `annual-report-assets.json`.

This evidence is from an uncommitted working tree. Re-run both audit commands
after the release commit is created and record that exact commit in the
official pull request.
