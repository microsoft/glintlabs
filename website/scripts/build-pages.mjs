import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { getLaunchReports } from "../src/launch-reports/reports.ts";
import { launchReportAsset } from "../src/launch-reports/assets.ts";
import { copyApprovedReports } from "../src/publishing/pages-export.ts";
import { listApprovedPublications } from "../src/publishing/approved-publication.ts";
import { publicPath } from "../src/telemetry/contract.ts";
import { verifyPages } from "./verify-pages.mjs";

export const pagesBasePath = "/glintlabs";
export function readerTelemetryConfig(value) {
  assert(value === undefined || value === "" || value === "false" || value === "true",
    "GLINTLABS_PAGES_TELEMETRY must be true or false.");
  return `export const telemetryEnabled = ${value === "true"};\n`;
}
const root = fileURLToPath(new URL("../", import.meta.url));
const excludedRoutes = new Set([
  "api", "studio", "preview", "published", "report-preview-assets",
  "reports-assets", "launch-report-assets",
]);

export function readerFile(relative) {
  const parts = relative.split(path.sep);
  if (parts[0] !== "src") return true;
  if (parts[1] === "middleware.ts") return false;
  if (parts[1] !== "app") return true;
  const privateRoute = excludedRoutes.has(parts[2]) || (parts[2] === "reports" && parts[3] === "preview");
  return !privateRoute || !/^(page|route|layout)\.[jt]sx?$/.test(parts.at(-1));
}

export function readerSource(text, filename) {
  if (filename.endsWith(".css")) {
    return text.replace(/url\((["']?)(\/(?!\/)[^)"']+)\1\)/g,
      (_match, quote, url) => `url(${quote}${pagesBasePath}${url}${quote})`);
  }
  if (!filename.endsWith(".tsx")) return text;
  const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let images = false;
  let hero = false;
  const transformed = ts.transform(source, [(context) => {
    const visit = (node) => {
      if (ts.isJsxAttribute(node) && node.name.getText(source) === "src" && node.initializer) {
        const value = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
        if (value) {
          images = true;
          return ts.factory.updateJsxAttribute(node, node.name, ts.factory.createJsxExpression(undefined,
            ts.factory.createCallExpression(ts.factory.createIdentifier("pagesAssetPath"), undefined, [value])));
        }
      }
      if (filename.endsWith("hero-transition-link.tsx") && ts.isPropertyAccessExpression(node) &&
          node.getText(source) === "window.location.pathname") {
        hero = true;
        return ts.factory.createCallExpression(ts.factory.createIdentifier("pagesSitePath"), undefined, [node]);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit);
  }]);
  try {
    if (!images && !hero) return text;
    const result = transformed.transformed[0];
    const names = [images && "pagesAssetPath", hero && "pagesSitePath"].filter(Boolean);
    const declaration = ts.factory.createImportDeclaration(undefined,
      ts.factory.createImportClause(false, undefined, ts.factory.createNamedImports(
        names.map(name => ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(name))))),
      ts.factory.createStringLiteral("@/pages-asset-path"));
    const statements = [...result.statements];
    const firstCode = statements.findIndex(statement =>
      !ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression));
    statements.splice(firstCode < 0 ? statements.length : firstCode, 0, declaration);
    return ts.createPrinter().printFile(ts.factory.updateSourceFile(result, statements));
  } finally {
    transformed.dispose();
  }
}

async function rewriteSources(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await rewriteSources(file);
    else if (/\.(tsx|css)$/.test(entry.name)) {
      const original = await readFile(file, "utf8");
      const updated = readerSource(original, file);
      if (updated !== original) await writeFile(file, updated);
    }
  }
}

async function runNext(directory) {
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
  for (const key of ["NEXT_DIST_DIR", "GLINT_LABS_UNSIGNED_PREVIEW", "GLINT_LABS_SKIP_OWNER_KEY", "GLINT_LABS_OWNER_KEY"]) {
    delete env[key];
  }
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build"], {
      cwd: directory, env, stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(new Error(`Pages reader build failed (${code}).`)));
  });
}

export async function buildPages() {
  assert(process.env.GLINT_LABS_UNSIGNED_PREVIEW !== "1" && process.env.GLINT_LABS_SKIP_OWNER_KEY !== "1",
    "Pages must be built in public mode, without an owner bypass.");
  const reader = await mkdtemp(path.join(root, ".next-pages-reader-"));
  try {
    for (const name of ["src", "packages", "package.json", "tsconfig.json"]) {
      await cp(path.join(root, name), path.join(reader, name), {
        recursive: true,
        filter: file => !file.split(path.sep).includes("node_modules", root.split(path.sep).length) &&
          readerFile(path.relative(root, file)),
      });
    }
    await mkdir(path.join(reader, "public"), { recursive: true });
    for (const name of ["figma", "annual-report-2026", "glint-labs-header.svg"]) {
      await cp(path.join(root, "public", name), path.join(reader, "public", name), { recursive: true });
    }
    await copyApprovedReports(path.join(root, "pages-publications"), reader);
    if (process.env.GLINTLABS_PAGES_TELEMETRY === "true") {
      const reports = [
        ...getLaunchReports({ includePrivatePreview: false }).map(report => report.slug),
        ...(await listApprovedPublications({ rootDirectory: path.join(root, "pages-publications") }))
          .map(report => report.publication.slug),
      ];
      for (const slug of reports) {
        assert(publicPath(`/reports/${slug}`),
          `Review this public identifier in the shared telemetry contract before enabling analytics: ${slug}`);
      }
    }
    await writeFile(path.join(reader, "src", "telemetry", "config.ts"),
      readerTelemetryConfig(process.env.GLINTLABS_PAGES_TELEMETRY));
    for (const report of getLaunchReports({ includePrivatePreview: false })) {
      for (const block of report.manifest.blocks.filter(block => block.type === "image")) {
        assert.equal(block.type, "image");
        const name = path.posix.basename(block.dataUrl);
        const response = await launchReportAsset(new Request("http://localhost/"), report.slug, name);
        assert.equal(response.status, 200, `Source image is not public: ${block.fileName}`);
        const file = path.join(reader, "public", "launch-report-assets", report.slug, name);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, Buffer.from(await response.arrayBuffer()));
      }
    }
    for (const relative of ["src/app/page.tsx", "src/app/reports/page.tsx", "src/app/reports/[slug]/page.tsx"]) {
      const file = path.join(reader, ...relative.split("/"));
      const text = await readFile(file, "utf8");
      assert(text.includes('export const dynamic = "force-dynamic";'), `Review static route adaptation: ${relative}`);
      await writeFile(file, text.replace('export const dynamic = "force-dynamic";',
        'export const dynamic = "force-static";'));
    }
    await writeFile(path.join(reader, "src", "app", "reports", "[slug]", "page.tsx"),
      `${await readFile(path.join(reader, "src", "app", "reports", "[slug]", "page.tsx"), "utf8")}
import { getLaunchReports } from "../../../launch-reports/reports.ts";
export const dynamicParams = false;
export async function generateStaticParams() {
  const slugs = new Set([
    ...getLaunchReports({ includePrivatePreview: false }).map(report => report.slug),
    ...(await listApprovedPublications()).map(report => report.publication.slug),
    "glps-rd-feb-26",
  ]);
  return [...slugs].map(slug => ({ slug }));
}
`);
    await rewriteSources(path.join(reader, "src"));
    await writeFile(path.join(reader, "src", "pages-asset-path.ts"), `
const base = ${JSON.stringify(pagesBasePath)};
export function pagesAssetPath<T>(value: T): string | T {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    && value !== base && !value.startsWith(base + "/") ? base + value : value;
}
export function pagesSitePath(value: string) {
  const route = value === base || value.startsWith(base + "/") ? value.slice(base.length) : value;
  return route.replace(/\\/$/, "") || "/";
}
`);
    await writeFile(path.join(reader, "next.config.mjs"), `export default {
  output: "export", basePath: ${JSON.stringify(pagesBasePath)}, trailingSlash: true,
  images: { unoptimized: true }, outputFileTracingRoot: process.cwd(),
};\n`);
    const tsconfigFile = path.join(reader, "tsconfig.json");
    const tsconfig = JSON.parse(await readFile(tsconfigFile, "utf8"));
    tsconfig.exclude.push("**/*.test.ts", "**/*.test.tsx");
    await writeFile(tsconfigFile, JSON.stringify(tsconfig, null, 2));
    await runNext(reader);
    const output = path.join(root, "out");
    await rm(output, { recursive: true, force: true });
    await cp(path.join(reader, "out"), output, { recursive: true });
    await writeFile(path.join(output, ".nojekyll"), "");
    await writeFile(path.join(output, "release.json"), JSON.stringify({
      revision: process.env.GITHUB_SHA ?? null,
      sourceRevision: "7991c205b54b9efabffa1fdceb8208099ccf8848",
      delivery: "static-reader",
    }, null, 2));
    await verifyPages();
    console.log(`Public reader exported to ${output}; Studio and APIs remain local.`);
  } finally {
    await rm(reader, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildPages();
}
