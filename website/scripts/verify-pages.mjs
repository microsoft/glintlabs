import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLaunchReports } from "../src/launch-reports/reports.ts";
import { isStagingReader, readerBasePath } from "./pages-config.mjs";

const output = fileURLToPath(new URL("../out/", import.meta.url));
export async function verifyEnvironmentBadge(directory, repository = process.env.GITHUB_REPOSITORY) {
  if (isStagingReader(repository)) return;
  for (const relative of await readdir(directory, { recursive: true })) {
    if (!/\.(html|js|css|txt|json)$/.test(relative)) continue;
    const text = await readFile(path.join(directory, relative), "utf8");
    assert(!text.includes("data-glintlabs-environment"), `Staging badge leaked into production output: ${relative}`);
  }
}

export async function verifyPages(basePath = readerBasePath()) {
  await verifyEnvironmentBadge(output);
  const reports = getLaunchReports({ includePrivatePreview: false });
  const routes = ["", "reports", "tools", "about", "annual-report-2026", "tools/analyze-survey",
    ...reports.map(report => `reports/${report.slug}`), "reports/glps-rd-feb-26"];
  for (const route of routes) {
    const html = await readFile(path.join(output, route, "index.html"), "utf8");
    for (const match of html.matchAll(/(?:src|href)="(\/[^"]*)"/g)) {
      if (match[1].startsWith("//")) continue;
      const pathname = decodeURIComponent(new URL(match[1], "http://localhost").pathname);
      assert(pathname === basePath || pathname.startsWith(`${basePath}/`),
        `URL outside the reader base path in ${route}: ${match[1]}`);
      const file = path.join(output, pathname.slice(basePath.length));
      const info = await stat(file);
      if (info.isDirectory()) await stat(path.join(file, "index.html"));
    }
  }
  const top = await readdir(output);
  for (const forbidden of ["api", "studio", "preview", "published", "report-preview-assets"]) {
    assert(!top.includes(forbidden), `Private/server route exported: ${forbidden}`);
  }
  assert(!(await readdir(path.join(output, "reports"))).includes("preview"), "Private report preview exported.");
  let images = 0;
  for (const report of reports) {
    for (const block of report.manifest.blocks) {
      if (block.type !== "image") continue;
      const bytes = await readFile(path.join(output, ...block.dataUrl.slice(1).split("/")));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), block.sourceAssetSha256);
      images++;
    }
  }
  console.log(`Verified ${routes.length} public static routes, ${images} original image hashes, local URLs under ${basePath || "/"}, and absence of private/server routes.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await verifyPages();
