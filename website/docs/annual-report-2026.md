# 2026 Annual Report

The production reader is available at `/annual-report-2026`.

## Sources

- Figma visual source: file `rkrC8mdVsXC1rAITLp04Sq`, node `843:18509`.
- Approved Word source: `Next Gen Employee Listening Narrative_v5COPY.docx`.
- Approved source SHA-256:
  `3ce32b3c7b95945a4b97507c9bfd465e5cc55486bf91b8688c2da890c72def14`.
- Canonical reusable components: `@glint-labs/data-visuals`.
- The hero uses the background-only Figma export at its canonical 1440 × 720
  composition, published as responsive AVIF assets with WebP fallbacks.

Regenerate the structured content model from an approved Word file:

```powershell
npm run content:annual-report -- "C:\path\to\approved-report.docx"
```

This writes the ordered manifest to
`src/annual-report-2026/approved-content.json` and extracts embedded source
figures to `public/annual-report-2026/word-assets`.

## Material assumptions and source conflicts

- The Word manuscript contains visual directions and unresolved customer-story
  placeholders. Those directions select a presentation pattern but are not
  shown as report copy.
- Figma uses placeholder body text. Word copy is rendered in the same section
  sequence and canonical 752 px reading column, with section heights expanding
  when the approved content requires more space.
- The two embedded bitmap visuals are retained only as source provenance. The
  published report replaces them with responsive, keyboard-operable coded
  visuals backed by the complete canonical datasets represented in the Word
  source.
- The cover summary uses the first three sentences of the approved opening
  paragraph; the complete paragraph remains in the first report section.
- Pending, unattributed customer-story prompts are omitted rather than invented.

## Responsive and accessibility behavior

- Desktop preserves the 1440 px Figma composition, 752 px reading column, and
  170 px sticky section rail.
- Tablet removes the rail and keeps the report in a centered reading column.
- Mobile stacks report visuals, preserves semantic source order, and avoids
  page-level horizontal scrolling.
- The reader includes a skip link, semantic headings, accessible navigation,
  keyboard-operable maturity scoring, descriptive image alternatives, tables
  for structured response evidence, visible focus, and reduced-motion support.
