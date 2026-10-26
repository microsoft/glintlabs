import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";
import { parseSitePalette } from "./site-palette.ts";

const theme = readFileSync(new URL("./site-theme.css", import.meta.url), "utf8");

test("site palette defaults to Blue and retains an explicit, private Legacy option", () => {
  assert.equal(parseSitePalette(undefined), "blue");
  assert.equal(parseSitePalette("blue"), "blue");
  assert.equal(parseSitePalette("legacy"), "legacy");
  for (const invalid of ["", "Blue", "legacy ", "unknown"]) assert.throws(() => parseSitePalette(invalid), /must be blue or legacy/);
});

test("palettes stay separate from Studio and publication style tokens", () => {
  assert.match(theme, /\[data-site-palette="legacy"\]/);
  assert.match(theme, /--annual-accent: #5c8df8;/);
  assert.match(theme, /--annual-accent: #9299f7;/);
  assert.doesNotMatch(theme, /--(?:report|studio)-[\w-]+\s*:/);
});

test("all palette decoration sources are persistent non-empty local assets", () => {
  const urls = [...theme.matchAll(/url\("([^"]+)"\)/g)];
  assert.ok(urls.length > 20);
  for (const [, path] of urls) {
    assert.ok(path.startsWith("/figma/"));
    assert.ok(statSync(new URL(`../../public${path}`, import.meta.url)).size > 0, path);
  }
});

test("the Featured grid stays top-anchored without changing other artwork or intercepting input", () => {
  const artwork = readFileSync(new URL("./_components/site-artwork.module.css", import.meta.url), "utf8");
  assert.match(artwork, /\.section \.grid \{ top: 0; bottom: auto; background-image: url\("\/figma\/site-canonical\/home\/union1\.svg"\); \}/);
  assert.match(artwork, /\.grid \{[^}]*right: 0; bottom: 0;/);
  assert.match(artwork, /\.artwork \{[^}]*overflow: clip; pointer-events: none;/);
});

test("the hero's warm edge glow continues seamlessly into Featured using the same exported asset", () => {
  const artwork = readFileSync(new URL("./_components/site-artwork.module.css", import.meta.url), "utf8");
  const component = readFileSync(new URL("./_components/site-artwork.tsx", import.meta.url), "utf8");
  assert.match(artwork, /\.home \.glowBottom \{ right: -846px; bottom: -846px; width: 1692px; height: 1692px; background-image: var\(--site-hero-glow-right\); \}/);
  assert.match(artwork, /\.section \.glowTop \{ top: -846px; right: -846px; width: 1692px; height: 1692px; background-image: var\(--site-hero-glow-right\); \}/);
  assert.match(component, /^\s*<span className=\{styles\.glowTop\} \/>$/m);
});

function contrast(first: string, second: string) {
  const luminance = (color: string) => color.match(/[\da-f]{2}/gi)!.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

test("small copy uses accessible brand ink on paper and dark ink on medium-blue matrix cells", () => {
  assert.ok(contrast("#294482", "#ffffff") >= 4.5);
  assert.ok(contrast("#565ba2", "#ffffff") >= 4.5);
  assert.ok(contrast("#000000", "#5c8df8") >= 4.5);
  assert.ok(contrast("#ffffff", "#294482") >= 4.5);
});

test("priority value bars contrast with their darker palette-aware parent tracks", () => {
  const blueTheme = theme.slice(0, theme.indexOf('[data-site-palette="legacy"]'));
  const track = blueTheme.match(/--annual-chart-track:\s*(#[\da-f]{6});/)![1];
  const bar = blueTheme.match(/--annual-priority-rise:\s*(#[\da-f]{6});/)![1];
  assert.ok(contrast(bar, track) >= 4.5);
  assert.ok(contrast(bar, track) > contrast(bar, "#294482"));
});
