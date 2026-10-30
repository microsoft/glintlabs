import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Beaker20Regular } from "@fluentui/react-icons/svg/beaker";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import vm from "node:vm";
import { readerFile, readerSource, readerTelemetryConfig } from "./build-pages.mjs";

test("analytics requires an explicit public-reader build flag and rejects ambiguous configuration", () => {
  for (const value of [undefined, "", "false"]) {
    assert.match(readerTelemetryConfig(value), /telemetryEnabled = false;/);
    assert.match(readerTelemetryConfig("false", value), /clarityEnabled = false;/);
  }
  assert.match(readerTelemetryConfig("true"), /telemetryEnabled = true;\nexport const clarityEnabled = false;/);
  assert.match(readerTelemetryConfig("false", "true"), /telemetryEnabled = false;\nexport const clarityEnabled = true;/);
  assert.match(readerTelemetryConfig("true", "true"), /telemetryEnabled = true;\nexport const clarityEnabled = true;/);
  assert.throws(() => readerTelemetryConfig("yes"), /must be true or false/);
  assert.throws(() => readerTelemetryConfig("true", "yes"), /GLINTLABS_PAGES_CLARITY must be true or false/);
});

test("browser icon uses the Fluent beaker and the requested gray-circle treatment", async () => {
  const icon = await readFile(new URL("../src/app/icon.svg", import.meta.url), "utf8");
  const beaker = renderToStaticMarkup(createElement(Beaker20Regular));
  assert.equal(icon.match(/\bd="([^"]+)"/)?.[1], beaker.match(/\bd="([^"]+)"/)?.[1]);
  assert.match(icon, /viewBox="0 0 26 26"/);
  assert.match(icon, /<circle cx="13" cy="13" r="13" fill="#f3f3f3"\s*\/>/);
  assert.match(icon, /transform="translate\(3 3\)" fill="#222"/);
});

test("favicon fallback contains PNG frames at standard browser tab sizes", async () => {
  const icon = await readFile(new URL("../src/app/favicon.ico", import.meta.url));
  assert.equal(icon.readUInt16LE(0), 0);
  assert.equal(icon.readUInt16LE(2), 1);
  assert.equal(icon.readUInt16LE(4), 3);
  for (const [index, size] of [16, 32, 48].entries()) {
    const entry = 6 + index * 16;
    assert.equal(icon[entry], size);
    assert.equal(icon[entry + 1], size);
    const length = icon.readUInt32LE(entry + 8);
    const offset = icon.readUInt32LE(entry + 12);
    assert.ok(offset >= 54 && offset + length <= icon.length);
    assert.equal(icon.subarray(offset, offset + 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(icon.readUInt32BE(offset + 16), size);
    assert.equal(icon.readUInt32BE(offset + 20), size);
  }
});

test("reader excludes every server/private route without excluding public reports", () => {
  for (const route of ["api/studio/approve/route.ts", "api/report-assets/id/file/route.ts", "studio/page.tsx",
    "reports/preview/id/page.tsx", "preview/id/page.tsx", "published/id/page.tsx",
    "launch-report-assets/slug/file/route.ts", "report-preview-assets/id/file/route.ts", "reports-assets/id/file/route.ts"]) {
    assert.equal(readerFile(path.join("src", "app", ...route.split("/"))), false, route);
  }
  assert.equal(readerFile(path.join("src", "middleware.ts")), false);
  assert.equal(readerFile(path.join("src", "app", "reports", "[slug]", "page.tsx")), true);
});

test("reader image adaptation preserves client directives, copy, links and dynamic image expressions", () => {
  const source = '"use client";\nexport default function Example(){return <><p>Unchanged "source" text.</p><a href="https://example.com">Source</a><img src={`/figma/${name}.svg`} alt="Original alt" /><Image src={block.dataUrl} /></>}';
  const output = readerSource(source, "example.tsx");
  assert(output.startsWith('"use client";'));
  assert.match(output, /pagesAssetPath\(`\/figma\/\$\{name\}\.svg`\)/);
  assert.match(output, /pagesAssetPath\(block.dataUrl\)/);
  assert.match(output, /href="https:\/\/example.com"/);
  assert.match(output, /Unchanged "source" text\./);
  const result = ts.transpileModule(output, { compilerOptions: { jsx: ts.JsxEmit.React } });
  assert(result.outputText);
});

test("reader prefixes only local CSS URLs and preserves encoded/external assets", () => {
  const source = 'a{background:url("/figma/a.svg")}b{background:url(/annual-report-2026/b.webp)}c{background:url(https://example.com/c.svg)}d{background:url(data:image/png;base64,AA==)}';
  const output = readerSource(source, "example.css");
  assert.match(output, /url\("\/glintlabs\/figma\/a\.svg"\)/);
  assert.match(output, /url\(\/glintlabs\/annual-report-2026\/b\.webp\)/);
  assert.match(output, /url\(https:\/\/example.com\/c\.svg\)/);
  assert.match(output, /url\(data:image\/png;base64,AA==\)/);
});

test("reader normalizes the hero transition pathname under the Pages prefix", () => {
  const output = readerSource('export const from = window.location.pathname;', "hero-transition-link.tsx");
  assert.match(output, /pagesSitePath\(window.location.pathname\)/);
  const compiled = ts.transpileModule(output, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, window: { location: { pathname: "/glintlabs/" } },
    require: () => ({ pagesSitePath: value => value.slice("/glintlabs".length) }),
  });
  assert.equal(exports.from, "/");
});
