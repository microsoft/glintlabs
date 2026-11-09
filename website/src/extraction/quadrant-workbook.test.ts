import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { quadrantExcelTemplate } from "../visualization/quadrant-template.ts";
import { listeningPortfolioError, quadrantGeometry } from "../visualization/quadrant-data.ts";
import { quadrantPresentationSchema } from "../manifest/report-manifest.ts";
import { createVerifiedDataVisual, compatibleVerifiedVisuals, verifiedVisualMatchesSource } from "../visualization/verified-data-visual.ts";
import { createApprovedContentRecord, evaluateApprovedContentIntegrity } from "../integrity/approved-content.ts";
import { connectedQuadrantSources, hydrateFolderQuadrants, quadrantWorkbookSource } from "../project/quadrant-workbook-source.ts";
import { refreshWordSource } from "../project/word-source-refresh.ts";
import { extractDocx } from "./extract-docx.ts";
import { packageTarget, quadrantCacheMatches, readQuadrantWorkbook, selectQuadrantTable } from "./quadrant-workbook.ts";

async function wordFixture(embedded: boolean) {
  const bytes = await quadrantExcelTemplate();
  const workbook = await JSZip.loadAsync(bytes);
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
  zip.file("word/document.xml", `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:p><w:r><w:t>Quadrant research</w:t></w:r></w:p><w:p><w:r><w:drawing><a:graphic><a:graphicData><c:chart r:id="chart"/></a:graphicData></a:graphic></w:drawing></w:r></w:p></w:body></w:document>`);
  zip.file("word/_rels/document.xml.rels", '<Relationships><Relationship Id="chart" Target="charts/chart1.xml"/></Relationships>');
  const chart = (await workbook.file("xl/charts/chart1.xml")!.async("string")).replace("</c:chartSpace>",
    '<c:externalData xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="workbook"/></c:chartSpace>');
  zip.file("word/charts/chart1.xml", chart);
  zip.file("word/charts/_rels/chart1.xml.rels", `<Relationships><Relationship Id="workbook" Target="${embedded ? "../embeddings/data.xlsx" : "file:///Users/example/private.xlsx"}"${embedded ? "" : ' TargetMode="External"'}/></Relationships>`);
  if (embedded) zip.file("word/embeddings/data.xlsx", bytes);
  return extractDocx("Quadrant.docx", await zip.generateAsync({ type: "uint8array" }));
}

test("a connected source folder resolves a pending Word quadrant without a per-chart Excel picker", async () => {
  const baseline = (await wordFixture(false)).manifest;
  const cached = baseline.blocks.find(block => block.type === "data-visual-source");
  assert.ok(cached?.type === "data-visual-source");
  const bytes = await quadrantExcelTemplate();
  const folder = {
    name: "Report sources",
    queryPermission: async () => "granted" as const,
    requestPermission: async () => { throw new Error("Do not ask again for granted folder access."); },
    getFileHandle: async (name: string) => {
      assert.equal(name, "private.xlsx", "Read only the workbook identified by Word.");
      return { name, getFile: async () => new File([Uint8Array.from(bytes)], name) };
    },
  };
  const sources = await connectedQuadrantSources(baseline, undefined, folder);
  assert.ok(sources[cached.id], "The linked folder should supply the complete point table automatically.");
  assert.deepEqual(sources[cached.id].data.rows[0].cells.slice(5), ["10%", "20%", "60%", "10%"]);
  assert.equal(sources[cached.id].source.part, "word/document.xml");
});

test("folder hydration preserves approved Word evidence and automatically selects a valid listening preset", async () => {
  const baseline = (await wordFixture(false)).manifest;
  const bytes = await quadrantExcelTemplate();
  const folder = { name: "Sources", getFileHandle: async (name: string) => ({
    name, getFile: async () => new File([Uint8Array.from(bytes)], name),
  }) };
  const hydrated = await hydrateFolderQuadrants(baseline, folder);
  const chart = hydrated.blocks.find(block => block.type === "quadrant-scatter-plot");
  assert.ok(chart?.type === "quadrant-scatter-plot");
  assert.equal(chart.presentation?.preset, "listening");
  assert.equal(chart.points[1].x, 15);
  assert.equal(chart.wordSource?.linkedWorkbookFileName, "private.xlsx");
  assert.equal(evaluateApprovedContentIntegrity(hydrated, await createApprovedContentRecord(baseline)).status, "intact");
  assert.ok(baseline.blocks.some(block => block.type === "data-visual-source"), "Never mutate the imported Word evidence.");

  const previous = { ...baseline, blocks: baseline.blocks.filter(block => block.type !== "data-visual-source") };
  const refreshed = refreshWordSource({
    current: previous, sourceManifest: previous, incoming: baseline,
    incomingQuadrantSources: await connectedQuadrantSources(baseline, undefined, folder),
  });
  assert.equal(refreshed.conflicts.length, 0);
  assert.ok(refreshed.manifest.blocks.some(block => block.type === "quadrant-scatter-plot"),
    "A new linked quadrant added to Word also connects during refresh.");
});

test("folder refresh reads changed Excel evidence while keeping Studio presentation and requiring Word to match", async () => {
  const baseline = (await wordFixture(false)).manifest;
  let bytes = await quadrantExcelTemplate();
  const folder = { name: "Sources", getFileHandle: async (name: string) => ({
    name, getFile: async () => new File([Uint8Array.from(bytes)], name),
  }) };
  const current = await hydrateFolderQuadrants(baseline, folder);
  const chart = current.blocks.find(block => block.type === "quadrant-scatter-plot");
  assert.ok(chart?.type === "quadrant-scatter-plot" && chart.presentation);
  chart.presentation.title = "Keep my chart title";
  const zip = await JSZip.loadAsync(bytes);
  const sheet = (await zip.file("xl/worksheets/sheet1.xml")!.async("string"))
    .replace('<c r="C3"><v>15</v></c>', '<c r="C3"><v>25</v></c>')
    .replace('<c r="H3" t="inlineStr"><is><t>50%</t></is></c>', '<c r="H3" t="inlineStr"><is><t>40%</t></is></c>')
    .replace('<c r="I3" t="inlineStr"><is><t>25%</t></is></c>', '<c r="I3" t="inlineStr"><is><t>35%</t></is></c>')
    .replace("Replace every example row before publishing.", "Updated Excel explanation.");
  zip.file("xl/worksheets/sheet1.xml", sheet);
  bytes = await zip.generateAsync({ type: "uint8array" });
  const sources = await connectedQuadrantSources(current, undefined, folder);
  assert.throws(() => refreshWordSource({ current, sourceManifest: baseline, incoming: baseline, quadrantSources: sources }), /Excel doesn't match/);
  const incoming = structuredClone(baseline);
  incoming.source.sha256 = "e".repeat(64);
  const cached = incoming.blocks.find(block => block.type === "data-visual-source");
  assert.ok(cached?.type === "data-visual-source");
  cached.data.rows[1].cells[2] = "25";
  cached.data.sha256 = "f".repeat(64);
  cached.data.linkedWorkbookFileName = "new-master.xlsx";
  const refreshed = refreshWordSource({ current, sourceManifest: baseline, incoming, quadrantSources: sources,
    incomingQuadrantSources: await connectedQuadrantSources(incoming, undefined, folder) });
  const updated = refreshed.manifest.blocks.find(block => block.type === "quadrant-scatter-plot");
  assert.ok(updated?.type === "quadrant-scatter-plot");
  assert.equal(updated.points[1].x, 25);
  assert.equal(updated.points[1].description, "Updated Excel explanation.");
  assert.equal(updated.verifiedSource?.workbook?.fileName, "new-master.xlsx", "Follow Word's new workbook link, not the old connection.");
  assert.deepEqual(updated.presentation, chart.presentation);
  assert.deepEqual(refreshed.conflicts, []);
});

test("automatic folder import rejects mismatched Excel instead of rendering stale Word coordinates", async () => {
  const baseline = (await wordFixture(false)).manifest;
  const zip = await JSZip.loadAsync(await quadrantExcelTemplate());
  zip.file("xl/worksheets/sheet1.xml", (await zip.file("xl/worksheets/sheet1.xml")!.async("string"))
    .replace('<c r="C3"><v>15</v></c>', '<c r="C3"><v>25</v></c>'));
  const bytes = await zip.generateAsync({ type: "uint8array" });
  await assert.rejects(hydrateFolderQuadrants(baseline, {
    name: "Wrong folder", getFileHandle: async name => ({
      name, getFile: async () => new File([Uint8Array.from(bytes)], name),
    }),
  }), /match|matching/i);
});

test("the downloadable Excel template contains a real chart and imports its complete standard table", async () => {
  const bytes = await quadrantExcelTemplate();
  const table = selectQuadrantTable(await readQuadrantWorkbook("Research.xlsx", bytes));
  assert.equal(table.rows.length, 4);
  assert.equal(table.workbook?.tableName, "QuadrantData");
  assert.equal(table.rows[0].cells[2], "-10");
  assert.deepEqual(table.rows[0].cells.slice(5), ["10%", "20%", "60%", "10%"]);
  const source = await quadrantWorkbookSource(table, { id: "plot", title: "Evidence" });
  const chart = createVerifiedDataVisual(source, "quadrant-scatter-plot", "2026-11-05T19:00:00Z");
  assert.equal(chart.type, "quadrant-scatter-plot");
  assert.equal(verifiedVisualMatchesSource(chart), true);
  assert.equal(chart.verifiedSource?.synthetic, true, "Unreplaced template examples stay explicitly labeled as synthetic");
  assert.equal(listeningPortfolioError(table), undefined);
  const inconsistent = structuredClone(table);
  inconsistent.rows[0].cells[2] = "5";
  assert.match(listeningPortfolioError(inconsistent)!, /coordinates must match/);
  const geometry = quadrantGeometry(chart.points);
  assert.equal(geometry.xSplit, 10);
  assert.equal(geometry.ySplit, 87.5);
  const manual = quadrantPresentationSchema.parse({ title: "Fixed", splitMode: "manual", xSplit: 0, ySplit: 80 });
  assert.deepEqual([quadrantGeometry(chart.points, manual).xSplit, quadrantGeometry(chart.points, manual).ySplit], [0, 80]);
  const identical = quadrantGeometry([chart.points[0], { ...chart.points[0], id: "another" }]);
  assert.ok(identical.x.max > identical.x.min && identical.y.max > identical.y.min);
  assert.ok(geometry.x.min <= -10 && geometry.x.max >= 35);
});

test("Excel import handles sparse cells, shared strings, percentage styles, and calculated formulas", async () => {
  const zip = await JSZip.loadAsync(await quadrantExcelTemplate());
  zip.file("xl/sharedStrings.xml", '<sst><si><r><t>Shared </t></r><r><t>label</t></r></si></sst>');
  zip.file("xl/styles.xml", '<styleSheet><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="10"/></cellXfs></styleSheet>');
  const sheet = (await zip.file("xl/worksheets/sheet1.xml")!.async("string"))
    .replace('<c r="B2" t="inlineStr"><is><t>Example A</t></is></c>', '<c r="B2" t="s"><v>0</v></c>')
    .replace('<c r="F2" t="inlineStr"><is><t>10%</t></is></c>', '<c r="F2" s="1"><f>1/10</f><v>0.1</v></c>')
    .replace('<c r="E3" t="inlineStr"><is><t>Replace every example row before publishing.</t></is></c>', "");
  zip.file("xl/worksheets/sheet1.xml", sheet);
  const table = selectQuadrantTable(await readQuadrantWorkbook("Saved.xlsx", await zip.generateAsync({ type: "uint8array" })));
  assert.equal(table.rows[0].cells[1], "Shared label");
  assert.equal(table.rows[0].cells[5], "10%");
  assert.equal(table.rows[1].cells[4], "");
  assert.equal(table.rows[1].cells[5], "15%", "Sparse description must not shift numeric columns");
  zip.file("xl/worksheets/sheet1.xml", sheet.replace("<v>0.1</v>", ""));
  await assert.rejects(readQuadrantWorkbook("Uncalculated.xlsx", await zip.generateAsync({ type: "uint8array" })), /calculate its formulas/);
});

test("invalid and ambiguous Excel evidence requires correction instead of selecting or fabricating values", async () => {
  const zip = await JSZip.loadAsync(await quadrantExcelTemplate());
  const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
  zip.file("xl/worksheets/sheet1.xml", sheet.replace("<t>example-b</t>", "<t>example-a</t>"));
  await assert.rejects(readQuadrantWorkbook("Duplicate.xlsx", await zip.generateAsync({ type: "uint8array" })), /unique, stable Point ID/);
  zip.file("xl/worksheets/sheet1.xml", sheet.replace('<c r="C2"><v>-10</v></c>', '<c r="C2"><v>not a number</v></c>'));
  await assert.rejects(readQuadrantWorkbook("Invalid.xlsx", await zip.generateAsync({ type: "uint8array" })), /finite X\/Y/);
  const tables = await readQuadrantWorkbook("Valid.xlsx", await quadrantExcelTemplate());
  assert.throws(() => selectQuadrantTable([...tables, ...tables]), /More than one/);
  await assert.rejects(readQuadrantWorkbook("Wrong.docx", new Uint8Array()), /Excel/);
  assert.throws(() => packageTarget("xl/workbook.xml", "file:///private.xlsx"), /connected explicitly/);
  assert.throws(() => packageTarget("xl/workbook.xml", "../../outside.xml"), /invalid package path/);
});

test("Word automatically imports embedded scatter data but never follows external workbook paths", async () => {
  for (const embedded of [true, false]) {
    const extraction = await wordFixture(embedded);
    const chart = extraction.manifest.blocks.find(block => block.type === "data-visual-source");
    assert.ok(chart?.type === "data-visual-source");
    assert.equal(chart.data.recommendedVisualType, "quadrant-scatter-plot");
    assert.equal(chart.data.rows.length, 4);
    assert.equal(chart.data.rows[0].cells[2], "-10");
    assert.deepEqual(compatibleVerifiedVisuals(chart), embedded ? ["quadrant-scatter-plot"] : []);
    assert.equal(Boolean(chart.data.workbook), embedded);
    assert.equal(chart.data.linkedWorkbookFileName, embedded ? undefined : "private.xlsx");
    if (embedded) {
      const current = { ...extraction.manifest, blocks: extraction.manifest.blocks.map(block =>
        block.id === chart.id ? createVerifiedDataVisual(chart, "quadrant-scatter-plot", "2026-11-05T19:00:00Z") : block) };
      const evidence = await createApprovedContentRecord(extraction.manifest);
      assert.equal((await evaluateApprovedContentIntegrity(current, evidence)).status, "intact");
    }
  }
});

test("external Excel enrichment preserves Word evidence and refreshes median/manual presentation without review", async () => {
  const baseline = (await wordFixture(false)).manifest;
  const cached = baseline.blocks.find(block => block.type === "data-visual-source");
  assert.ok(cached?.type === "data-visual-source");
  const table = selectQuadrantTable(await readQuadrantWorkbook("Evidence.xlsx", await quadrantExcelTemplate()));
  const source = await quadrantWorkbookSource(table, { id: cached.id, title: cached.data.title, original: cached });
  const visual = createVerifiedDataVisual(source, "quadrant-scatter-plot", "2026-11-05T19:00:00Z");
  assert.equal(visual.type, "quadrant-scatter-plot");
  for (const mode of ["median", "manual"] as const) {
    const presentation = quadrantPresentationSchema.parse({ title: "Retain Studio settings", splitMode: mode,
      xSplit: 0, ySplit: 80, quadrants: ["A", "B", "C", "D"] });
    const styled = { ...visual, wordSource: cached.data, presentation };
    const current = { ...baseline, blocks: baseline.blocks.map(block => block.id === cached.id ? styled : block) };
    assert.equal((await evaluateApprovedContentIntegrity(current, await createApprovedContentRecord(baseline))).status, "intact");
    const incoming = structuredClone(baseline);
    incoming.source.sha256 = "e".repeat(64);
    const freshCache = incoming.blocks.find(block => block.id === cached.id);
    assert.ok(freshCache?.type === "data-visual-source");
    freshCache.data.rows[1].cells[2] = "25";
    freshCache.data.sha256 = "f".repeat(64);
    const changed = structuredClone(table);
    changed.rows[1].cells[2] = "25";
    changed.rows[1].cells[4] = "Updated description from Excel";
    const workbookSource = await quadrantWorkbookSource(changed, { id: cached.id, title: cached.data.title });
    const result = refreshWordSource({ current, sourceManifest: baseline, incoming, quadrantSources: { [cached.id]: workbookSource } });
    assert.deepEqual(result.conflicts, []);
    const refreshed = result.manifest.blocks.find(block => block.id === cached.id);
    assert.ok(refreshed?.type === "quadrant-scatter-plot");
    assert.deepEqual(refreshed.presentation, presentation);
    assert.equal(refreshed.points[1].id, "example-b");
    assert.equal(refreshed.points[1].description, "Updated description from Excel");
    assert.equal(quadrantGeometry(refreshed.points, refreshed.presentation).xSplit, mode === "median" ? 15 : 0);
    assert.equal((await evaluateApprovedContentIntegrity(result.manifest, await createApprovedContentRecord(result.sourceManifest))).status, "intact");
    assert.throws(() => refreshWordSource({ current, sourceManifest: baseline, incoming, quadrantSources: { [cached.id]: source } }), /doesn't match/);
    assert.equal(quadrantCacheMatches(table, cached.data), true);
    const breakdowns = structuredClone(table);
    breakdowns.rows[0].cells[5] = "11%";
    const revisedBreakdown = await quadrantWorkbookSource(breakdowns, { id: cached.id, title: cached.data.title });
    const excelOnly = refreshWordSource({ current, sourceManifest: baseline, incoming: baseline,
      quadrantSources: { [cached.id]: revisedBreakdown } });
    assert.equal(excelOnly.unchanged, false, "Excel breakdown changes refresh even when the Word file is unchanged");
    const updatedBreakdown = excelOnly.manifest.blocks.find(block => block.id === cached.id);
    assert.ok(updatedBreakdown?.type === "quadrant-scatter-plot");
    assert.equal(updatedBreakdown.points[0].breakdown[0].value, 11);
    assert.deepEqual(excelOnly.conflicts, []);
    const tampered = { ...styled, points: styled.points.map((point, index) => index ? point : { ...point, x: 123 }) };
    assert.equal(verifiedVisualMatchesSource(tampered), false);
  }
});
