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
  "GLPS_RD_May '26.docx": { paragraphs: 70, text: "40ddbca29c94aaef15c28e7694068595f8e69528e03917d9f7709d2f9ac0915c", source: "14aaf4097ab8ae3d4af6c8b70f95ea1202168a9f10577d7c005df5921315d0cf" },
  "GLPS_RD_Oct '25.docx": { paragraphs: 29, text: "75080d9a43a05cc54be2607bd1a444ded9b643e83c31e1e691154eb662a8e2e0", source: "0a03f7ff1430334d05361dce8b0b064535b53de6f7e9981f6d8a9b1fe01e360d" },
  "GLPS_RD_March '26.docx": { paragraphs: 49, text: "b23b8ab37fe784a0b3a0c9bccbf9edcd7afe37931b25aca66a626fd683eee963", source: "8877b26ade045fabfb07c403c89201b487f5025aaaebb87db22d62d0f4f6bb69" },
};
const allReports = getLaunchReports({ includePrivatePreview: true });
const november = allReports.find(report => report.slug === "empowering-managers-for-an-ai-first-future")!;
const may = allReports.find(report => report.slug === "the-human-conditions-behind-ai-value-at-work")!;
const october = allReports.find(report => report.slug === "amplifying-clarity-and-impact-of-ai-agents-by-aligning-on-desired-outcomes")!;
const march = allReports.find(report => report.slug === "evolving-transformational-leadership-in-the-age-of-ai")!;
const p0Slugs = new Set([
  "empowering-managers-for-an-ai-first-future",
  "fighting-ai-slop-with-meta-cognition-around-ai",
  "tracking-the-rise-of-perceived-ai-value-at-work",
]);

test("all direct Research Drops retain independently verified Word text and source hashes", () => {
  assert.equal(allReports.length, 6);
  for (const report of allReports) {
    const expected = fingerprints[report.manifest.source.fileName];
    const text = report.manifest.blocks.flatMap(block => "text" in block ? [block.text] : []);
    assert.equal(text.length, expected.paragraphs);
    assert.equal(createHash("sha256").update(text.join("\n")).digest("hex"), expected.text);
    assert.equal(report.manifest.source.sha256, expected.source);
    assert.equal(report.manifest.reviewItems.length, 0);
    assert.ok(report.manifest.blocks.every(block => block.type !== "unsupported" && block.type !== "visual-placeholder"));
    assert.equal(report.catalog.featured, p0Slugs.has(report.slug));
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
  assert.equal(imageCount, 30);
});

test("Research Drop cards use existing Blue illustrations without replacing the original report heroes", async () => {
  const expected: Record<string, { id: string; alt: string }> = {
    "empowering-managers-for-an-ai-first-future": { id: "people", alt: "People illustration." },
    "fighting-ai-slop-with-meta-cognition-around-ai": { id: "document-edit-text", alt: "Document edit text illustration." },
    "tracking-the-rise-of-perceived-ai-value-at-work": { id: "data", alt: "Data illustration." },
    "the-human-conditions-behind-ai-value-at-work": { id: "sign-in", alt: "Sign in illustration." },
    "amplifying-clarity-and-impact-of-ai-agents-by-aligning-on-desired-outcomes": { id: "agents-workflow", alt: "Agents workflow illustration." },
    "evolving-transformational-leadership-in-the-age-of-ai": { id: "compass", alt: "Compass illustration." },
  };
  for (const report of allReports) {
    const { id, alt } = expected[report.slug];
    const src = `/figma/illustrations/blue/${id}.png`;
    assert.deepEqual(report.catalog.thumbnail, { src, alt, presentation: "illustration" });
    const bytes = await readFile(new URL(`../../public${src}`, import.meta.url));
    assert.equal(bytes.readUInt32BE(16), 512);
    assert.equal(bytes.readUInt32BE(20), 512);
    const hero = report.manifest.blocks.find(block => block.type === "image" && block.placement === "hero");
    assert.ok(hero?.type === "image" && hero.dataUrl.startsWith(`/launch-report-assets/${report.slug}/`));
    assert.match(hero.fileName, /\.jpeg$/);
  }
});

test("all source reference lists receive reference styling, including reports without a References heading", async () => {
  const expected: Record<string, string[]> = {
    "empowering-managers-for-an-ai-first-future": ["block-62", "block-63", "block-64", "block-65"],
    "fighting-ai-slop-with-meta-cognition-around-ai": ["block-78", "block-79", "block-80", "block-81"],
    "tracking-the-rise-of-perceived-ai-value-at-work": ["block-81", "block-82", "block-83", "block-84", "block-85", "block-86"],
    "the-human-conditions-behind-ai-value-at-work": ["block-74", "block-75", "block-76", "block-77", "block-78", "block-79", "block-80", "block-81"],
    "amplifying-clarity-and-impact-of-ai-agents-by-aligning-on-desired-outcomes": ["block-46", "block-47"],
    "evolving-transformational-leadership-in-the-age-of-ai": ["block-65", "block-66", "block-67", "block-68", "block-69", "block-70"],
  };
  for (const report of allReports) {
    assert.deepEqual([...report.referenceBlockIds], expected[report.slug]);
    for (const id of report.referenceBlockIds) {
      assert.equal(report.manifest.blocks.find(block => block.id === id)?.type, "paragraph");
      assert.equal(report.textRuns[id][0].superscript, true);
    }
  }
  const renderer = await readFile(new URL("../report-system/report-renderer.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("./launch-report.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../report-system/report-renderer.module.css", import.meta.url), "utf8");
  assert.match(page, /referenceBlockIds=\{report\.referenceBlockIds\}/);
  assert.match(renderer, /startsReferences \? styles\.referencesStart/);
  assert.match(renderer, /startsReferences \|\| \(block\.type === "heading" && block\.level <= 2\)/);
  assert.match(css, /\.sectionStart:first-child:not\(\.referencesStart\)/);
  assert.match(css, /\.referencesBlock \.paragraph,\s*\.referencesList \{[^}]*font-size: 12px;[^}]*line-height: 18px;/);
});

test("figure descriptions retain native disclosure semantics with a branded Fluent control", async () => {
  const renderer = await readFile(new URL("../report-system/report-renderer.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../report-system/report-renderer.module.css", import.meta.url), "utf8");
  assert.match(renderer, /<details className=\{`\$\{styles\.accessibleData\} \$\{styles\.figureDescription\}`\}>/);
  assert.match(renderer, /<span>Read figure description<\/span>\s*<ChevronDown16Regular aria-hidden="true" \/>/);
  assert.match(css, /\.figureDescription summary\s*\{[^}]*font-size: 14px;[^}]*font-weight: 400;[^}]*list-style: none;/);
  assert.match(css, /\.figureDescription summary::-webkit-details-marker\s*\{\s*display: none;/);
  assert.match(css, /\.figureDescription\[open\] summary svg\s*\{\s*transform: rotate\(180deg\);/);
  assert.match(css, /@container report \(max-width: 600px\)\s*\{\s*\.figureDescription summary\s*\{\s*min-height: 44px;/);
});

test("brief headings and side-nav labels share colon-free presentation without rewriting Word evidence", async () => {
  const renderer = await readFile(new URL("../report-system/report-renderer.tsx", import.meta.url), "utf8");
  assert.match(renderer, /function headingLabel\(/);
  assert.match(renderer, /isResearchBriefHeading\(block\) \? headingLabel\(block\) : props\.textOverrides/);
  assert.match(renderer, /label: headingLabel\(heading\)/);
  assert.match(renderer, /href: `#report-block-\$\{heading\.id\}`/);
  for (const source of launchReportSources) {
    assert.ok(source.manifest.blocks.some(block => "text" in block && block.text === "Research Drop in Brief:"));
    const report = allReports.find(item => item.slug === source.slug)!;
    assert.ok(report.manifest.blocks.some(block => block.type === "heading" && block.text === "Research Drop in Brief:"));
  }
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
  assert.equal(linkCount, 31);
});

test("April uses the corrected 2026 publication year without rewriting source evidence", () => {
  const report = allReports.find(item => item.slug.startsWith("tracking-"))!;
  assert.equal(report.manifest.metadata.publishedDate, "04/14/26");
  assert.equal(report.coverDetails[0], "April 14, 2026 • Research Drop");
  assert.equal(report.catalog.badge, "April 2026 • Research Drop");
  assert.equal(report.isoDate, "2026-04-14");
  assert.equal(report.catalog.employeeCount, 2331);
  const source = launchReportSources.find(item => item.slug === report.slug)!;
  assert.ok(source.manifest.blocks.some(block => "text" in block &&
    block.text === "[April 14, 2025 • Research Drop] [2,331 Employees]"));
  assert.deepEqual(allReports.map(item => item.isoDate), ["2026-05-12", "2026-04-14", "2026-03-10", "2026-02-10", "2025-11-11", "2025-10-14"]);
});

test("March preserves its complete original table, source wording and formatting without Home featuring", () => {
  const source = launchReportSources.find(item => item.slug === march.slug)!;
  const rawText = source.manifest.blocks.flatMap(block => "text" in block ? [block.text] : []);
  assert.equal(rawText.length, 60);
  assert.equal(createHash("sha256").update(rawText.join("\n")).digest("hex"), "b9cfa26492a6ba4e486585f3959d72f90a219283a3ae02899822a4790624a5c6");
  assert.equal(march.catalog.title, "Evolving Transformational Leadership in the Age of AI");
  assert.equal(march.catalog.employeeCount, 1800);
  assert.equal(march.catalog.featured, false);
  assert.deepEqual(march.coverDetails, ["March 10, 2026 • Research Drop", "1,800 Employees"]);
  assert.deepEqual([...march.rowHeaderTableBlockIds], ["block-14"]);
  const table = march.manifest.blocks.find(block => block.id === "block-14");
  assert.ok(table?.type === "data-visual-source");
  assert.deepEqual(table, source.manifest.blocks.find(block => block.id === table.id));
  assert.deepEqual([table.data.columns, ...table.data.rows.map(row => row.cells)], [
    ["Intellectual Stimulation", "Encouraging critical thinking and novel problem-solving"],
    ["Individualized Consideration", "Personalizing coaching and developmental support"],
    ["Inspirational Motivation", "Communicating a compelling vision and organizational direction"],
    ["Idealized Influence", "Modeling values and taking principled positions"],
  ]);
  assert.ok(march.manifest.blocks.every(block => !("text" in block) || !/\[(?:open|close) /i.test(block.text)));
  assert.equal(source.publicationSourceEvidence.hyperlinkCount, 8);
});

test("October preserves its source wording, figures, Wipro spotlight and archival context without Home featuring", () => {
  const source = launchReportSources.find(item => item.slug === october.slug)!;
  const rawText = source.manifest.blocks.flatMap(block => "text" in block ? [block.text] : []);
  assert.equal(rawText.length, 38);
  assert.equal(createHash("sha256").update(rawText.join("\n")).digest("hex"), "f143947b3637d255daa110e2f5c514cba4224cfe61cf10a03682ac1c784634d5");
  assert.equal(rawText[0], "[Amplifying Clarity and Impact of AI Agents by Aligning on Desired Outcomes]");
  assert.equal(october.catalog.title, "Amplifying Impact of AI Agents by Aligning on Desired Outcomes");
  assert.equal(october.manifest.metadata.title, october.catalog.title);
  const title = october.manifest.blocks[0];
  assert.ok(title.type === "heading");
  assert.equal(title.text, october.catalog.title);
  assert.equal(october.catalog.href, "/reports/amplifying-clarity-and-impact-of-ai-agents-by-aligning-on-desired-outcomes");
  assert.equal(october.catalog.employeeCount, 1800);
  assert.equal(october.catalog.featured, false);
  assert.deepEqual(october.coverDetails, ["October 14, 2025 • Research Drop", "1,800 Employees"]);
  assert.deepEqual(october.manifest.blocks.filter(block => block.type === "image").map(block => block.sourceAssetSha256), [
    "a33aba591aa886cea676bcdaa6eba47ea469b9d2ccad8ba24f74b81755424209",
    "2c09318a375a59822e80f214fd96441968b1cad27535812326a3501cb41e9945",
    "ab2324d98a9563330eebaf583a07012e560b36acf57613e721e32ca92c862ab1",
    "33aef82935fb8bc6935a923c0bfaf523a9608fdb1d325cd62f91950b4563a9d2",
    "bebf99f8d87f894b4683afa0d7f43adc0ee18dcc93444434f91e085a7feb8275",
  ]);
  assert.deepEqual(october.manifest.blocks.filter(block => block.type === "heading").map(block => block.id), [
    "block-0", "block-4", "block-13", "block-23", "block-31", "block-45",
  ]);
  for (const id of ["block-30", "block-37"]) {
    const divider = october.manifest.blocks.find(block => block.id === id);
    assert.ok(divider && "text" in divider);
    assert.equal(divider.text, "----");
  }
  assert.ok(october.textRuns["block-40"].every(run => run.bold));
  assert.match(october.textRuns["block-40"].map(run => run.text).join(""), /Stay tuned for our November Research Drop/);
  for (const id of ["block-42", "block-43"]) assert.ok(october.textRuns[id].every(run => run.italic));
  assert.equal(october.textRuns["block-46"][0].italic, false);
  assert.equal(october.textRuns["block-46"].some(run => run.href), false);
  assert.equal(source.publicationSourceEvidence.hyperlinkCount, 1);
  assert.ok(october.textRuns["block-47"].some(run => run.href === "https://www.capgemini.com/wp-content/uploads/2025/07/Final-Web-Version-Report-AI-Agents.pdf"));
});

test("May retains Word evidence, original dates, numbered findings and multi-paragraph italics", () => {
  const source = launchReportSources.find(item => item.slug === may.slug)!;
  const rawText = source.manifest.blocks.flatMap(block => "text" in block ? [block.text] : []);
  assert.equal(rawText.length, 73);
  assert.equal(createHash("sha256").update(rawText.join("\n")).digest("hex"), "5d311aa971c454008f5ad761b9b240a75b4de53877414a2ac34c6a484260d2fb");
  assert.equal(may.catalog.title, "The Human Conditions Behind AI Value at Work");
  assert.equal(may.catalog.employeeCount, 2331);
  assert.equal(may.catalog.featured, false);
  assert.deepEqual(may.coverDetails, ["May 12, 2026 • Research Drop", "2,331 Employees"]);
  assert.deepEqual([...may.orderedListBlockIds], ["block-26", "block-27", "block-28"]);
  for (const id of may.orderedListBlockIds) {
    assert.equal(may.manifest.blocks.find(block => block.id === id)?.type, "list-item");
  }
  for (const block of may.manifest.blocks) {
    if (!("text" in block) || block.source.index < 55 || block.source.index > 72) continue;
    assert.ok(may.textRuns[block.id].every(run => run.italic), block.id);
  }
  assert.equal(may.textRuns["block-74"][0].italic, false);
  assert.equal(may.manifest.blocks.some(block => "text" in block && /\[(?:open|close) /i.test(block.text)), false);
});

test("P0 rich-text formatting remains unchanged when document-spanning marks are supported", () => {
  for (const source of launchReportSources.filter(item => p0Slugs.has(item.slug))) {
    const report = allReports.find(item => item.slug === source.slug)!;
    assert.equal(report.orderedListBlockIds.size, 0);
    for (const block of source.manifest.blocks) {
      if (!("text" in block) || !report.textRuns[block.id]) continue;
      assert.deepEqual(report.textRuns[block.id], wordTextRuns(block), `${source.slug}/${block.id}`);
    }
  }
});

test("May applies only the author-confirmed 2024 AI-adoption citation correction and preserves source evidence", () => {
  const source = launchReportSources.find(item => item.slug === may.slug)!;
  const original = source.manifest.blocks.find(block => block.id === "block-45")!;
  assert.ok("text" in original);
  assert.match(original.text, /AI optimism and adoption\[open superscript\]2\[close superscript\]/);
  const displayed = may.manifest.blocks.find(block => block.id === original.id)!;
  assert.ok("text" in displayed);
  assert.equal(displayed.text, wordPlainText(original).replace("AI optimism and adoption2.", "AI optimism and adoption3."));
  assert.deepEqual(may.textRuns[original.id].filter(run => run.superscript).map(run => run.text), ["3", "8"]);
  assert.deepEqual(may.textRuns["block-32"].filter(run => run.superscript).map(run => run.text), ["2"]);
  const reference = may.manifest.blocks.find(block => block.id === "block-76")!;
  assert.ok("text" in reference && reference.text.includes("2024 Work Trend Index Annual Report"));
});

test("numbered markers normalize without losing text and emphasis can span paragraphs without leaking", () => {
  const source = { part: "word/document.xml", index: 0 };
  const marks = { bold: false, italic: false, superscript: false };
  const paragraph = (text: string) => ({ type: "paragraph" as const, id: "test", source, text });
  assert.equal(wordPlainText(paragraph("[open numeric bullet]First finding[close numeric bullet]")), "First finding");
  assert.ok(wordTextRuns(paragraph("[open italics]Methodology"), marks).every(run => run.italic));
  assert.ok(wordTextRuns(paragraph("Continued methodology[close italics]"), marks).every(run => run.italic));
  assert.ok(wordTextRuns(paragraph("References"), marks).every(run => !run.italic));
  const repaired = wordTextRuns(paragraph("[open italics]what[close italics[ and [open italics]how[close italics]"), marks);
  assert.equal(repaired.map(run => run.text).join(""), "what and how");
  assert.equal(repaired[0].italic, true);
  assert.equal(repaired[1].italic, false);
  assert.equal(repaired[2].italic, true);
  assert.equal(wordPlainText(paragraph("[open table formatting]")), "");
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
    assert.equal(getLaunchReports().length, 6);
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
    assert.equal(getLaunchReports().length, 6);
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
