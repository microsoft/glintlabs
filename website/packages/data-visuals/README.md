# Glint Labs data visuals

A code-backed library and browsable catalog for accessible, interactive Glint
Labs research visuals.

The required design-to-production workflow is documented in
[`docs/figma-to-publishing-studio.md`](docs/figma-to-publishing-studio.md).

## Current components

The library is organized into three levels:

- **Foundations** — shared tokens and visual primitives, including the
  canonical gradient outline and glow assets.
- **Glint Labs Core** — site-wide interface components shared across Glint
  Labs experiences.
- **2026 Annual Report** — publication-specific editorial and data-storytelling
  components.

### `GlintLabsNavigation`

Provides the canonical light-mode site navigation for Glint Labs. Its
1138 × 64 composition is linked to Figma node `1070:4963` and belongs to the
Glint Labs Core collection.

`http://127.0.0.1:4173/?fixture=glint-labs-navigation`

### `PullQuote`

Emphasizes an approved direct quotation with optional attribution and role.
Use it for human voice or expert interpretation, not paraphrased report copy.
Its canonical composition is linked to Figma node `1070:3429`.

The exact 655 × 192 reference fixture is available locally at:

`http://127.0.0.1:4173/?fixture=pull-quote`

### `LeadStatement`

Frames one approved section-level idea without treating it as a quotation or
statistic. Its canonical composition is linked to Figma node `798:64562`.

The exact 655 × 102 reference fixture is available locally at:

`http://127.0.0.1:4173/?fixture=lead-statement`

### `OutcomeMetricCard`

Connects one outcome principle to a verified numerator and denominator while
computing the displayed percentage. Its canonical composition is linked to
Figma node `1138:19427`.

The exact 364 × 232 reference fixture is available locally at:

`http://127.0.0.1:4173/?fixture=outcome-metric-card`

### `OutcomeFocusCard`

Names one intended talent outcome with the canonical directional illustration.
Its 236 × 233 composition is linked to Figma node `1136:6428`.

`http://127.0.0.1:4173/?fixture=outcome-focus-card`

### `DataQuoteCard`

Connects a research finding to an approved quotation and source. Its canonical
750 × 505 composition is linked to Figma node `1136:16622`.

`http://127.0.0.1:4173/?fixture=data-quote-card`

### `DataInsightCard`

Connects an observed signal pattern to an evidence-based interpretation and
response. Its canonical 752 × 390 composition is linked to Figma node
`1144:20688`.

`http://127.0.0.1:4173/?fixture=data-insight-card`

### `RightFitGuardrails`

Frames five listening guardrails around one central right-fit decision
standard. Its canonical 752 × 775 composition is linked to Figma node
`1146:4385`.

`http://127.0.0.1:4173/?fixture=right-fit-guardrails`

### `SkillPriorityStack`

Connects three closely ranked capability priorities to practical knowledge and
behaviors without overstating the difference between percentages. Its
canonical 752 × 757 composition is linked to Figma node `1146:4897`.

`http://127.0.0.1:4173/?fixture=skill-priority-stack`

## Library principles

- Code is canonical for behavior, accessibility, and data contracts.
- Figma documents approved visual composition and report-width behavior.
- Components use structured data; values are never embedded in drawing logic.
- Interaction cannot carry information unavailable to keyboard and screen
  reader users.
- Every chart provides a semantic data-table fallback.
- Editorial interpretation and source notes remain separate from sourced data.
- Components support the 752 px Annual Report column and responsive widths down
  to 320 px.

## Local development

```powershell
npm install
npm run dev
```

The catalog runs at the URL printed by Vite.

Every component panel includes desktop, 640 px tablet, and 320 px mobile
viewport controls. Responsive states can also be opened directly with
`?preview=tablet` or `?preview=mobile`.

## Validation

```powershell
npm run lint
npm test
npm run build
```

`npm run build` produces:

- `dist/` — browsable catalog
- `dist-lib/` — JavaScript and CSS library bundle
- `dist-types/` — TypeScript declarations

## Adding a visual

1. Frame the evidence and document what the visual must not imply.
2. Create the responsive and stress states in Figma.
3. Add a machine-readable `VisualDefinition` to `src/lib/registry.ts`.
4. Define the typed data contract and explicit validation.
5. Build reusable primitives before adding chart-specific markup.
6. Keep state in a provider and expose explicit compound components.
7. Add keyboard interaction, live selected detail, and a table fallback.
8. Add catalog guidance for when to use and when not to use the visual.
9. Test semantics, keyboard behavior, controlled state, and invalid data.
10. Add a Publishing Studio adapter and verified end-to-end fixture.
11. Link the published Figma component to code through Code Connect.
