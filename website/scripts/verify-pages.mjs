import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLaunchReports } from "../src/launch-reports/reports.ts";

const output = fileURLToPath(new URL("../out/", import.meta.url));
export async function verifyPages() {
  const reports = getLaunchReports({ includePrivatePreview: false });
  const routes = ["", "reports", "tools", "about", "annual-report-2026", "tools/analyze-survey",
    ...reports.map(report => `reports/${report.slug}`), "reports/glps-rd-feb-26"];
  for (const route of routes) {
    const html = await readFile(path.join(output, route, "index.html"), "utf8");
    for (const match of html.matchAll(/(?:src|href)="(\/[^"]*)"/g)) {
      assert(match[1].startsWith("/glintlabs/") || match[1].startsWith("//"),
        `Unprefixed URL in ${route}: ${match[1]}`);
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
  console.log(`Verified ${routes.length} public static routes, ${images} original image hashes, project-prefixed URLs, and absence of private/server routes.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await verifyPages();
