import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { launchReportAsset } from "./assets.ts";
import { getLaunchReport, getLaunchReports, isLaunchReportSlug, isLaunchReportSource, launchSourceVisible } from "./reports.ts";
import { launchReportSources } from "./source-data.ts";
import { wordPlainText, wordTextRuns } from "./word-format.ts";

const fingerprints: Record<string, { paragraphs: number; text: string; source: string }> = {
  "GLPS_RD_April '26.docx": { paragraphs: 63, text: "4602b759865eca070a4eb5717520d326393917fd80438e9ffab4cacf1b18a46a", source: "ada87229c122545428a73dfa14e321c94b2f6b7853c20a2cbd6d2d46a384738c" },
  "GLPS_RD_Feb '26.docx": { paragraphs: 60, text: "beb7f8d391490722216f77487590d4a852671e9c04f0b171761df1c3874678d1", source: "7212e84cd07793b3a0066f493d9d735e2d0047fa327138a589053c14c650938d" },
  "GLPS_RD_Nov '25.docx": { paragraphs: 46, text: "91f964dbb930b729efce75de978bef747862969c62fe0cbf8248cfff14d27da7", source: "cc5e764f88ebc1a0ce56c03008ad447e7ce92816fbbe45b703a60ba79f5ff080" },
};
const allReports = getLaunchReports({ includePrivatePreview: true });
const november = allReports.find(report => report.slug === "empowering-managers-for-an-ai-first-future")!;

test("all three required launch reports retain independently verified Word text and source hashes", () => {
  assert.equal(allReports.length, 3);
  for (const report of allReports) {
    const expected = fingerprints[report.manifest.source.fileName];
    const text = report.manifest.blocks.flatMap(block => "text" in block ? [block.text] : []);
    assert.equal(text.length, expected.paragraphs);
    assert.equal(createHash("sha256").update(text.join("\n")).digest("hex"), expected.text);
    assert.equal(report.manifest.source.sha256, expected.source);
    assert.equal(report.manifest.reviewItems.length, 0);
    assert.ok(report.manifest.blocks.every(block => block.type !== "unsupported" && block.type !== "visual-placeholder"));
    assert.equal(report.catalog.featured, false);
    assert.equal(report.privatePreview, false);
  }
});

test("every source image remains byte-identical, with its Word dimensions and a usable description", async () => {
  let imageCount = 0;
  for (const report of allReports) {
    for (const block of report.manifest.blocks) {
      if (block.type !== "image") continue;
      imageCount++;
      const bytes = await readFile(new URL(`./assets/${report.slug}/${block.dataUrl.split("/").pop()}`, import.meta.url));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), block.sourceAssetSha256);
      assert.ok(block.width > 0 && block.height > 0 && block.alt);
      if (block.placement !== "hero") assert.ok(report.descriptions[block.id]);
      assert.equal(block.presentation?.crop ?? "original", "original");
    }
  }
  assert.equal(imageCount, 18);
});

test("Word link targets and linked wording survive removal of editorial formatting tags", () => {
  let linkCount = 0;
  for (const source of launchReportSources) {
    const report = allReports.find(item => item.slug === source.slug)!;
    assert.equal(source.publicationSourceEvidence.hyperlinkCount, source.publicationSourceEvidence.representedHyperlinkCount);
    for (const raw of source.manifest.blocks) {
      if (!("links" in raw) || !raw.links) continue;
      for (const link of raw.links) {
        linkCount++;
        const text = wordPlainText({ type: "paragraph", id: raw.id, source: raw.source, text: raw.text!.slice(link.start, link.end) });
        const actual = report.textRuns[raw.id].filter(run => run.href === link.href).map(run => run.text).join("");
        assert.equal(actual.trim(), text.trim());
      }
    }
  }
  assert.equal(linkCount, 15);
});

test("April keeps the exact 2025 source date selected by the user", () => {
  const report = allReports.find(item => item.slug.startsWith("tracking-"))!;
  assert.equal(report.manifest.metadata.publishedDate, "04/14/25");
  assert.equal(report.coverDetails[0], "April 14, 2025 • Research Drop");
  assert.equal(report.catalog.employeeCount, 2331);
});

test("editorial marks preserve words, emphasis, citations, and the malformed November bullet", () => {
  const block = { type: "paragraph" as const, id: "test", source: { part: "word/document.xml", index: 0 }, text: "[open bullet Enabling [open bold]role modeling[close bold] with AI[open superscript]1[close superscript].[close bullet]" };
  const runs = wordTextRuns(block);
  assert.equal(wordPlainText(block), "Enabling role modeling with AI1.");
  assert.ok(runs.some(run => run.bold && run.text === "role modeling"));
  assert.ok(runs.some(run => run.superscript && run.text === "1"));
  assert.throws(() => wordPlainText({ ...block, text: "[open unknown]Content[close unknown]" }), /Unrecognized Word editorial markup/);
});

test("legacy report links resolve to the direct report without duplicating catalog entries", () => {
  assert.ok(isLaunchReportSlug("glps-rd-feb-26"));
  assert.equal(getLaunchReport("glps-rd-feb-26")?.slug, "fighting-ai-slop-with-meta-cognition-around-ai");
  assert.ok(isLaunchReportSource("an-old-address", "GLPS_RD_Nov '25.docx"));
  assert.equal(isLaunchReportSource("unrelated", "another.docx"), false);
});

async function withPreview(enabled: boolean, action: () => void | Promise<void>) {
  const previous = process.env.GLINT_LABS_UNSIGNED_PREVIEW;
  process.env.GLINT_LABS_UNSIGNED_PREVIEW = enabled ? "1" : "0";
  try { await action(); } finally {
    if (previous === undefined) delete process.env.GLINT_LABS_UNSIGNED_PREVIEW;
    else process.env.GLINT_LABS_UNSIGNED_PREVIEW = previous;
  }
}

test("November clearance makes its catalog entry and assets public without private-preview mode", async () => {
  await withPreview(false, async () => {
    assert.equal(getLaunchReports().length, 3);
    assert.equal(getLaunchReport(november.slug), november);
    assert.equal(launchSourceVisible(november.slug, november.manifest.source.fileName), true);
    assert.equal(launchSourceVisible("legacy-address", november.manifest.source.fileName), true);
    const hero = november.manifest.blocks.find(block => block.type === "image")!;
    const response = await launchReportAsset(new Request(`http://localhost${hero.dataUrl}`), november.slug, hero.dataUrl.split("/").pop()!);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control")!, /public.*immutable/);
    assert.equal(response.headers.get("x-robots-tag"), null);
  });
});

test("November remains publicly cleared when the connected Studio uses preview mode", async () => {
  await withPreview(true, async () => {
    assert.equal(getLaunchReports().length, 3);
    const hero = november.manifest.blocks.find(block => block.type === "image")!;
    const response = await launchReportAsset(new Request(`http://localhost${hero.dataUrl}`), november.slug, hero.dataUrl.split("/").pop()!);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control")!, /public.*immutable/);
    assert.equal(response.headers.get("x-robots-tag"), null);
    assert.equal(createHash("sha256").update(new Uint8Array(await response.arrayBuffer())).digest("hex"), hero.sourceAssetSha256);
  });
});

test("public source assets use their content hashes and reject unregistered paths", async () => {
  const report = allReports.find(item => !item.privatePreview)!;
  const image = report.manifest.blocks.find(block => block.type === "image")!;
  const fileName = image.dataUrl.split("/").pop()!;
  const request = new Request(`http://localhost${image.dataUrl}`);
  const first = await launchReportAsset(request, report.slug, fileName);
  assert.equal(first.status, 200);
  assert.match(first.headers.get("cache-control")!, /immutable/);
  assert.equal((await launchReportAsset(new Request(request, { headers: { "if-none-match": first.headers.get("etag")! } }), report.slug, fileName)).status, 304);
  assert.equal((await launchReportAsset(request, report.slug, "../source-data.ts")).status, 404);
  assert.equal((await launchReportAsset(request, "unknown", fileName)).status, 404);
});
