# Annual Report asset reachability and pruning

## Runtime evidence

The production route at `/annual-report-2026` was audited from commit
`e9849bbdfdc8f4877a89553a779c4090efde5595` in a fresh Chromium session. The
audit scrolled the complete report, opened and closed the continuous-listening
dialog, and opened and closed momentum details.

The route requested 51 repository assets:

- 50 files under `public/figma/annual-canonical`; and
- `public/figma/nav-viva-glint-annual-report.svg`.

The exact paths, hashes, sizes, source references, and approval state are in
`annual-report-assets.json`. `npm run assets:annual-report` verifies source
coverage, files, hashes, and approval evidence. Its optional runtime mode also
compares a live Chromium route against the manifest:

```powershell
node scripts/verify-annual-report-assets.mjs `
  --runtime-url http://127.0.0.1:3010/annual-report-2026 `
  --cdp-port 9350 `
  --output test-results/annual-report-assets.json
```

## Pruning decision

| Previous public path | Evidence | Disposition |
|---|---|---|
| `public/figma/annual-canonical/hero.png` | No code or runtime request uses the PNG. `hero.webp` is the lossless runtime derivative, and decoded pixels are identical. | Move to `docs/release/source-assets/annual-report-2026/hero.png`; retain as non-served source provenance. |
| `public/figma/annual-canonical/shell-grid.svg` | No code or runtime request uses the SVG. `shell-grid-browser.webp` is the browser-rasterized runtime derivative. | Move to `docs/release/source-assets/annual-report-2026/shell-grid.svg`; retain as non-served source provenance. |
| `public/figma/annual-canonical/shell-grid-glow.svg` | No code or runtime request uses it. The file contains an empty `<g>` and draws no visible content. | Delete. |

No other asset was removed. In particular:

- `public/annual-report-2026` remains because it supports dynamic report
  rendering or retains approved Word-source provenance;
- `packages/data-visuals/public` remains because other production routes and
  package fixtures use it; and
- other `public/figma` assets remain because other site routes use them or
  because their design-reference status has not been disproven.

An asset being absent from the canonical Annual Report runtime is not, by
itself, sufficient deletion evidence.
