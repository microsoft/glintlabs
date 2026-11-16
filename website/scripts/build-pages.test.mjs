import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";
import { readerFile, readerSource, readerTelemetryConfig } from "./build-pages.mjs";
import * as pagesVerifier from "./verify-pages.mjs";

test("private staging emits root asset URLs while production retains its project prefix", () => {
  for (const [repository, expectedBase] of [
    ["microsoft/glintlabs_staging", ""],
    ["microsoft/glintlabs", "/glintlabs"],
    ["example/fork", "/glintlabs"],
  ]) {
    const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", `
      const { pagesBasePath, readerSource } = await import("./scripts/build-pages.mjs");
      console.log(JSON.stringify({
        base: pagesBasePath,
        css: readerSource('a{background:url("/figma/example.svg")}', "example.css"),
      }));
    `], {
      cwd: new URL("../", import.meta.url),
      env: { ...process.env, GITHUB_REPOSITORY: repository },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      base: expectedBase,
      css: `a{background:url("${expectedBase}/figma/example.svg")}`,
    }, repository);
  }
});

test("only the exact staging repository adds an environment badge to the exported layout", () => {
  const layout = "<html><body><Providers>{children}</Providers></body></html>";
  for (const repository of [
    "microsoft/glintlabs_staging", "microsoft/glintlabs", "example/fork",
    "microsoft/glintlabs_staging-copy", "",
  ]) {
    const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", `
      const { readerSource } = await import("./scripts/build-pages.mjs");
      console.log(JSON.stringify(readerSource(${JSON.stringify(layout)}, "src/app/layout.tsx")));
    `], {
      cwd: new URL("../", import.meta.url),
      env: { ...process.env, GITHUB_REPOSITORY: repository },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    if (repository === "microsoft/glintlabs_staging") {
      assert.match(output, /import \{ StagingBadge \} from/);
      assert.match(output, /<StagingBadge\s*\/>/);
    } else {
      assert.equal(output, layout, repository);
    }
  }
});

test("production verification rejects staging badge code anywhere in the exported reader", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "glintlabs-environment-test-"));
  try {
    await mkdir(path.join(directory, "_next", "static"), { recursive: true });
    const file = path.join(directory, "_next", "static", "example.js");
    await writeFile(file, 'createElement("span", {"data-glintlabs-environment": "staging"})');
    await pagesVerifier.verifyEnvironmentBadge(directory, "microsoft/glintlabs_staging");
    for (const repository of ["microsoft/glintlabs", "example/fork", ""]) {
      await assert.rejects(pagesVerifier.verifyEnvironmentBadge(directory, repository), /Staging badge leaked/);
    }
    await writeFile(file, 'createElement("span", {}, "Glint Labs")');
    await pagesVerifier.verifyEnvironmentBadge(directory, "microsoft/glintlabs");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

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

test("browser icon uses the approved Glint Labs flask on a pale-gray circle", async () => {
  const icon = await readFile(new URL("../src/app/icon.svg", import.meta.url), "utf8");
  assert.match(icon, /<title>Glint Labs<\/title>/);
  assert.match(icon, /viewBox="0 0 26 26"/);
  assert.match(icon, /<circle cx="13" cy="13" r="13" fill="#f3f3f3"\/>/);
  assert.match(icon, /<path d="M14 3[^"]+" transform="translate\(3 3\)" fill="#222"/);
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
  const output = readerSource(source, "example.css", "/glintlabs");
  assert.match(output, /url\("\/glintlabs\/figma\/a\.svg"\)/);
  assert.match(output, /url\(\/glintlabs\/annual-report-2026\/b\.webp\)/);
  assert.match(output, /url\(https:\/\/example.com\/c\.svg\)/);
  assert.match(output, /url\(data:image\/png;base64,AA==\)/);
  assert.equal(readerSource(source, "example.css", ""), source);
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
