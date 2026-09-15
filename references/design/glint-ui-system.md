# Glint UI system dependency

All Glintlabs reports and UI surfaces must load and follow the canonical
`glint-ui-system` skill before visual design or implementation work.

## Canonical source

- Repository:
  `https://github.com/employee-experience/EVE-Plugin-Marketplace`
- User-provided skill URL:
  `https://github.com/employee-experience/EVE-Plugin-Marketplace/tree/main/plugins/eve-design-studio/eve-design-dev/skills/glint-ui-system`
- Locally verified skill path:
  `plugins/eve-design-dev/skills/glint-ui-system/SKILL.md`
- Canonical implementation reference:
  `plugins/eve-design-dev/references/glint-ui-system.md`
- Verified source commit:
  `9e67a00125de2fd15130d675af57d190bc8ae294`

The upstream reference remains the source of truth. Recheck it when available
rather than allowing this repository guidance to drift.

## Required design rules

- Use Fluent UI v9 semantics and Glint's exact design tokens.
- Use Segoe UI exclusively.
- Use light mode; do not invent a dark theme.
- Do not invent colors, spacing, radii, shadows, or components.
- Use CSS custom properties rather than repeating raw values.
- Use the Glint spacing scale: 8, 12, 24, 32, 40, and 56 pixels.
- Use approved radii: 3, 8, 16, and 20 pixels.
- Use approved elevation values and avoid borders on cards.
- Make interactive controls keyboard accessible with visible focus states.
- Never rely on color alone; pair it with labels, values, symbols, or patterns.
- Use sentence case for UI labels and headings.

## Core report tokens

```css
:root {
  --colorNeutralBackground1: #FFFFFF;
  --colorNeutralBackground2: #FAFAFA;
  --colorNeutralForeground1: #242424;
  --colorNeutralForeground3: #616161;
  --colorNeutralForegroundDisabled: #8A8A8A;
  --colorBrandForeground1: #335CCC;
  --colorNeutralStroke1: #D1D1D1;
  --colorNeutralStroke2: #E0E0E0;
  --colorVivaBrandBackground2: #E5EEFF;
  --colorStatusWarningBackground: #FEFFBF;
  --shadow2: 0 0 2px rgba(0, 0, 0, 0.12),
    0 1px 2px rgba(0, 0, 0, 0.14);
  --shadow16: 0 0 2px rgba(0, 0, 0, 0.12),
    0 4px 8px rgba(0, 0, 0, 0.14);
  --borderRadiusSmall: 3px;
  --borderRadiusMedium: 8px;
  --borderRadiusLarge: 16px;
  --borderRadiusXLarge: 20px;
}
```

These tokens are a convenience subset, not a replacement for the complete
upstream reference.
