import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";
import { readerFile, readerSource } from "./build-pages.mjs";

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
