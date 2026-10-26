# Performance readiness

## Annual Report hero optimization

The October 17, 2026 release-preparation pass identified two avoidable costs in
the first viewport:

- the decorative grid was a lazy-loaded SVG and became the largest contentful
  paint element after expensive vector rasterization; and
- the hero photograph was a 534,573-byte PNG.

The optimized implementation:

- preloads a browser-rasterized, lossless WebP grid;
- removes an empty exported grid-glow layer;
- uses a lossless WebP version of the hero photograph; and
- leaves the large decorative glow filters lazy so they do not block the
  initial document render.

The original PNG and SVG remain in the repository as source provenance. The
browser loads the optimized derivatives.

## Measured result

Measurements used the production build at 1440 × 1000 CSS pixels in a fresh,
warmed Chromium profile with cache disabled and simulated 4G:

| Metric | Before | After | Change |
|---|---:|---:|---:|
| Largest Contentful Paint | 2,312 ms | 972 ms | 58% faster |
| Hero photograph transfer | 534,873 bytes | 313,696 bytes | 41% smaller |
| Hero photograph response end | 1,178 ms | 925 ms | 21% earlier |
| Page load event | 2,307 ms | 1,221 ms | 47% earlier |

The exact result varies by device, network, cache, and host. The comparison is
useful because both runs used the same production server, browser, viewport,
and simulated network profile.

## Visual-preservation evidence

- Decoded `docs/release/source-assets/annual-report-2026/hero.png` and
  `public/figma/annual-canonical/hero.webp` pixels are identical: mean and
  maximum channel error are both 0.
- Hero geometry is unchanged.
- The full hero's mean absolute RGB error against the canonical Figma capture
  improved from 7.76 to 7.47.
- The hero photograph's Figma error remains 3.25.
- All 101 Annual Report checks and 122 momentum interaction checks pass.
- The production build has no browser runtime errors in the report harness.

## Release checks

Re-run the hero profile and visual evidence on the official-repository preview
because CDN caching, compression, authentication, and deployment region can
change real-user performance. Record Core Web Vitals after launch and alert on
material LCP regressions rather than relying only on laboratory measurements.
