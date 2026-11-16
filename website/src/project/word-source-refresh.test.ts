import assert from "node:assert/strict";
import test from "node:test";

import { reportBlockSchema, reportManifestSchema, type ReportManifest } from "../manifest/report-manifest.ts";
import { createVerifiedDataVisual } from "../visualization/verified-data-visual.ts";
import { createStudioChartSource } from "../visualization/chart-authoring.ts";
import { createApprovedContentRecord, evaluateApprovedContentIntegrity } from "../integrity/approved-content.ts";
import { refreshWordSource } from "./word-source-refresh.ts";
import { wordStyleView } from "./word-style-mapping.ts";

function source(): ReportManifest {
  return reportManifestSchema.parse({
    schemaVersion: "0.1.0",
    source: { fileName: "report.docx", sizeBytes: 100, sha256: "a".repeat(64) },
    metadata: { title: "Research report", status: "draft" },
    blocks: [
      { id: "heading", type: "heading", level: 1, text: "Research report",
        source: { part: "word/document.xml", index: 0, paragraphId: "H1" } },
      { id: "paragraph", type: "paragraph", text: "Original narrative.",
        source: { part: "word/document.xml", index: 1, paragraphId: "P1" } },
      { id: "chart", type: "data-visual-source",
        source: { part: "word/document.xml", index: 2, paragraphId: "C1" },
        data: { sourceKind: "word-chart", title: "Confidence", unit: "percentage",
          columns: ["Training", "Confidence"], recommendedVisualType: "horizontal-bar-chart",
          rows: [{ id: "a", cells: ["Trained", "81.23%"] }, { id: "b", cells: ["Untrained", "48.11%"] }],
          sha256: "b".repeat(64) } },
    ],
    reviewItems: [],
    extraction: { paragraphCount: 2, imageCount: 0, unsupportedCount: 0 },
  });
}

function revision(baseline: ReportManifest) {
  const incoming = structuredClone(baseline);
  incoming.source.sha256 = "c".repeat(64);
  const paragraph = incoming.blocks[1];
  assert.equal(paragraph.type, "paragraph");
  paragraph.text = "Updated narrative from Word.";
  const chart = incoming.blocks[2];
  assert.equal(chart.type, "data-visual-source");
  chart.data.rows[1].cells[1] = "52%";
  chart.data.sha256 = "d".repeat(64);
  return incoming;
}

test("Word refresh discards legacy style overrides even when unchanged and detects styles in older drafts", () => {
  const baseline = source();
  baseline.wordStyles = [{ id: "Normal", name: "Normal", target: "body" }];
  const originalParagraph = baseline.blocks[1];
  assert.ok(originalParagraph.type === "paragraph");
  originalParagraph.wordStyle = "Normal";
  const current = { ...baseline, wordStyleMappings: { Normal: "subsection-heading" as const } };
  const unchanged = refreshWordSource({ current, sourceManifest: baseline, incoming: baseline });
  assert.equal(unchanged.unchanged, true);
  assert.equal(unchanged.manifest.wordStyleMappings, undefined);
  assert.equal(wordStyleView(unchanged.manifest).blocks[1].type, "paragraph");
  const incoming = revision(baseline);
  const refreshed = refreshWordSource({ current, sourceManifest: baseline, incoming });
  assert.equal(refreshed.manifest.wordStyleMappings, undefined);
  assert.equal(wordStyleView(refreshed.manifest).blocks[1].type, "paragraph");
  assert.deepEqual(refreshed.conflicts, []);
  const legacy = source();
  const detected = structuredClone(legacy);
  detected.wordStyles = [{ id: "Normal", name: "Normal", target: "body" }];
  const detectedParagraph = detected.blocks[1];
  assert.ok(detectedParagraph.type === "paragraph");
  detectedParagraph.wordStyle = "Normal";
  const upgraded = refreshWordSource({ current: legacy, sourceManifest: legacy, incoming: detected });
  assert.equal(upgraded.manifest.wordStyles?.length, 1);
  assert.equal(upgraded.manifest.blocks[1].type === "paragraph" && upgraded.manifest.blocks[1].wordStyle, "Normal");
});

test("refresh updates Word text and chart values while preserving Studio chart presentation", () => {
  const baseline = source();
  const chart = baseline.blocks[2];
  assert.equal(chart.type, "data-visual-source");
  const styled = {
    ...createVerifiedDataVisual(chart, "horizontal-bar-chart", "2026-11-04T12:00:00.000Z"),
    presentation: { title: "Studio title", subtitle: "", note: "", palette: "teal" as const,
      sort: "descending" as const, density: "compact" as const },
  };
  const current = { ...baseline, blocks: [baseline.blocks[0], baseline.blocks[1], styled] };
  const refreshed = refreshWordSource({ current, sourceManifest: baseline, incoming: revision(baseline) });
  assert.deepEqual(refreshed.conflicts, []);
  assert.equal(refreshed.manifest.blocks[1].type === "paragraph" && refreshed.manifest.blocks[1].text,
    "Updated narrative from Word.");
  const updatedChart = refreshed.manifest.blocks[2];
  assert.equal(updatedChart.type, "horizontal-bar-chart");
  assert.equal(updatedChart.items[1].value, 52);
  assert.deepEqual(updatedChart.presentation, styled.presentation);
  assert.equal(updatedChart.verifiedSource?.rows[1].cells[1], "52%");
  assert.equal(current.blocks[1].type === "paragraph" && current.blocks[1].text, "Original narrative.");
});

test("Word value updates preserve Studio-selected layouts without mistaking copied source metadata for edits", async () => {
  for (const [type, count] of [
    ["paired-percentage-comparison", 2], ["percentage-ring-group", 3], ["percentage-comparison-grid", 4],
  ] as const) {
    const baseline = source();
    const chart = baseline.blocks[2];
    assert.equal(chart.type, "data-visual-source");
    chart.data.rows = Array.from({ length: count }, (_, index) => ({
      id: `row-${index}`, cells: [`Finding ${index + 1}`, `${index ? 50 : 0}%`],
    }));
    const copied = await createStudioChartSource({
      id: chart.id, table: chart.data, sourceName: chart.data.title,
      synthetic: false, original: chart, visualType: type,
    });
    const styled = reportBlockSchema.parse({
      ...createVerifiedDataVisual(copied, type, "2026-11-05T16:00:00.000Z"),
      source: chart.source,
      presentation: type === "percentage-ring-group"
        ? { title: "Keep my Studio title", subtitle: "", note: "", palette: "teal" as const,
          sort: "source" as const, density: "comfortable" as const }
        : { title: "Keep my Studio title", note: "", palette: "teal" as const,
          leadIns: ["", ""] as [string, string] },
    });
    assert.ok(styled.type === type);
    const current = { ...baseline, blocks: [...baseline.blocks.slice(0, 2), styled] };
    const incoming = revision(baseline);
    const updated = refreshWordSource({ current, sourceManifest: baseline, incoming });
    assert.deepEqual(updated.conflicts, [], type);
    const result = updated.manifest.blocks[2];
    assert.equal(result.type, type);
    assert.ok("metrics" in result);
    assert.equal(result.metrics[1].value, 52);
    assert.equal(result.metrics[0].value, 0);
    assert.deepEqual(result.presentation, styled.presentation);
    assert.equal((await evaluateApprovedContentIntegrity(updated.manifest,
      await createApprovedContentRecord(updated.sourceManifest))).status, "intact");

    const edited = structuredClone(current);
    const local = edited.blocks[2];
    assert.ok((local.type === "paired-percentage-comparison" || local.type === "percentage-ring-group" ||
      local.type === "percentage-comparison-grid") && local.verifiedSource);
    local.metrics[0].value = 10;
    local.verifiedSource.rows[0].cells[1] = "10%";
    assert.ok(refreshWordSource({ current: edited, sourceManifest: baseline, incoming }).conflicts
      .some(conflict => /both Word and Studio/.test(conflict.label)), "Real numerical edits still need a decision");
    const reshaped = structuredClone(incoming);
    const changedShape = reshaped.blocks[2];
    assert.equal(changedShape.type, "data-visual-source");
    changedShape.data.rows.push({ id: "extra", cells: ["Additional finding", "25%"] });
    assert.ok(refreshWordSource({ current, sourceManifest: baseline, incoming: reshaped }).conflicts
      .some(conflict => /changed the chart shape/.test(conflict.label)),
    "A genuinely incompatible layout must still need a decision");
  }
});

test("Word refresh preserves ring styling when linked findings change between two and three", async () => {
  for (const [before, after] of [[3, 2], [2, 3]]) {
    const baseline = source();
    const chart = baseline.blocks[2];
    assert.equal(chart.type, "data-visual-source");
    const third = { id: "c", cells: ["Third finding", "25%"] };
    if (before === 3) chart.data.rows.push(third);
    const styled = {
      ...createVerifiedDataVisual(chart, "percentage-ring-group", "2026-11-05T16:00:00.000Z"),
      presentation: { title: "Keep my Studio title", subtitle: "", note: "", palette: "teal" as const,
        sort: "source" as const, density: "comfortable" as const },
    };
    const incoming = revision(baseline);
    const incomingChart = incoming.blocks[2];
    assert.equal(incomingChart.type, "data-visual-source");
    if (after === 2) incomingChart.data.rows.pop();
    else incomingChart.data.rows.push(third);
    const refreshed = refreshWordSource({
      current: { ...baseline, blocks: [...baseline.blocks.slice(0, 2), styled] },
      sourceManifest: baseline, incoming,
    });
    assert.deepEqual(refreshed.conflicts, [], "A supported donut count change needs no review");
    const result = refreshed.manifest.blocks[2];
    assert.equal(result.type, "percentage-ring-group");
    assert.deepEqual(result.metrics.map(metric => metric.value), after === 2 ? [81.23, 52] : [81.23, 52, 25]);
    assert.deepEqual(result.presentation, styled.presentation);
    assert.equal(evaluateApprovedContentIntegrity(refreshed.manifest,
      await createApprovedContentRecord(refreshed.sourceManifest)).status, "intact");
  }
});

test("Word refresh preserves illustrated-statistics choices without introducing a review step", async () => {
  for (const count of [2, 3]) {
    const baseline = source();
    const chart = baseline.blocks[2];
    assert.equal(chart.type, "data-visual-source");
    if (count === 3) chart.data.rows.push({ id: "c", cells: ["Third finding", "25%"] });
    const styled = {
      ...createVerifiedDataVisual(chart, "illustrated-statistics", "2026-11-05T18:00:00.000Z"),
      presentation: { title: "Keep my illustrated findings", subtitle: "", note: "Keep this note.",
        valueLabel: "selected", illustrations: { a: "celebration", b: "trophy" },
        palette: "brand" as const, sort: "source" as const, density: "comfortable" as const },
    };
    const refreshed = refreshWordSource({
      current: { ...baseline, blocks: [...baseline.blocks.slice(0, 2), styled] },
      sourceManifest: baseline, incoming: revision(baseline),
    });
    assert.deepEqual(refreshed.conflicts, []);
    const result = refreshed.manifest.blocks[2];
    assert.equal(result.type, "illustrated-statistics");
    assert.equal(result.metrics.length, count);
    assert.equal(result.metrics[1].value, 52);
    assert.deepEqual(result.presentation, styled.presentation);
    assert.equal(evaluateApprovedContentIntegrity(refreshed.manifest,
      await createApprovedContentRecord(refreshed.sourceManifest)).status, "intact");
  }
});

test("stable Word paragraph IDs retain styles when inserted paragraphs change positional IDs", async () => {
  const baseline = source();
  const current = structuredClone(baseline);
  const chart = current.blocks[2];
  assert.equal(chart.type, "data-visual-source");
  current.blocks[2] = {
    ...createVerifiedDataVisual(chart, "horizontal-bar-chart", "2026-11-04T12:00:00.000Z"),
    presentation: { title: "Confidence", subtitle: "", note: "Keep me", palette: "blue",
      density: "compact", sort: "ascending" },
  };
  const incoming = revision(baseline);
  incoming.blocks[1].id = "new-paragraph-location";
  incoming.blocks[2].id = "new-chart-location";
  for (const block of incoming.blocks.slice(1)) block.source.index++;
  incoming.blocks.splice(1, 0, {
    id: "paragraph", type: "paragraph", text: "Inserted paragraph.",
    source: { part: "word/document.xml", index: 1, paragraphId: "NEW" },
  });

  const refreshed = refreshWordSource({ current, sourceManifest: baseline, incoming });
  assert.deepEqual(refreshed.conflicts, []);
  assert.equal(new Set(refreshed.manifest.blocks.map(block => block.id)).size, 4);
  assert.equal(refreshed.manifest.blocks[2].id, "paragraph");
  const refreshedChart = refreshed.manifest.blocks[3];
  assert.equal(refreshedChart.type, "horizontal-bar-chart");
  assert.equal(refreshedChart.id, "chart");
  assert.equal(refreshedChart.presentation?.palette, "blue");
  assert.equal(evaluateApprovedContentIntegrity(refreshed.manifest,
    await createApprovedContentRecord(refreshed.sourceManifest)).status, "intact");
});

test("unchanged refresh retains remapped IDs across later Word revisions", async () => {
  const baseline = source();
  const incoming = revision(baseline);
  incoming.blocks.forEach((block, index) => { block.id = `reindexed-${index}`; block.source.index++; });
  incoming.blocks.splice(1, 0, {
    id: "inserted", type: "paragraph", text: "Inserted Word content.",
    source: { part: "word/document.xml", index: 1, paragraphId: "NEW" },
  });
  const first = refreshWordSource({ current: baseline, sourceManifest: baseline, incoming });
  const unchanged = refreshWordSource({ current: first.manifest, sourceManifest: first.sourceManifest, incoming });
  assert.equal(evaluateApprovedContentIntegrity(unchanged.manifest,
    await createApprovedContentRecord(unchanged.sourceManifest)).status, "intact");
  const later = structuredClone(incoming);
  later.source.sha256 = "e".repeat(64);
  const chart = later.blocks[3];
  assert.equal(chart.type, "data-visual-source");
  chart.data.rows[1].cells[1] = "61%";
  chart.data.sha256 = "f".repeat(64);
  const next = refreshWordSource({ current: unchanged.manifest, sourceManifest: unchanged.sourceManifest, incoming: later });
  assert.deepEqual(next.conflicts, []);
  assert.equal(next.manifest.blocks.length, 4);
  const result = next.manifest.blocks.find(block => block.id === "chart");
  assert.equal(result?.type === "data-visual-source" && result.data.rows[1].cells[1], "61%");
});

function twoTables(sameLabels = false) {
  const baseline = source();
  const chart = baseline.blocks[2];
  assert.equal(chart.type, "data-visual-source");
  delete chart.source.paragraphId;
  chart.data.sourceKind = "word-table";
  delete chart.data.recommendedVisualType;
  const second = structuredClone(chart);
  second.id = "second-chart";
  second.source.index = 3;
  second.data.rows = [
    { id: "a", cells: [sameLabels ? "Trained" : "Managers", "55%"] },
    { id: "b", cells: [sameLabels ? "Untrained" : "Employees", "45%"] },
  ];
  second.data.sha256 = "e".repeat(64);
  baseline.blocks.push(second);
  const current = structuredClone(baseline);
  current.blocks = baseline.blocks.map(block => block.type === "data-visual-source" ? {
    ...createVerifiedDataVisual(block, "horizontal-bar-chart", "2026-11-04T12:00:00.000Z"),
    presentation: { title: block.data.title, subtitle: "", note: "Keep styling", palette: "teal" as const,
      sort: "descending" as const, density: "compact" as const },
  } : block);
  const incoming = structuredClone(baseline);
  incoming.source.sha256 = "c".repeat(64);
  incoming.blocks.forEach((block, index) => {
    block.id = `reindexed-${index}`;
    block.source.index++;
    if (block.type === "data-visual-source") {
      block.data.rows[0].cells[1] = index === 2 ? "70%" : "60%";
      block.data.sha256 = (index === 2 ? "f" : "d").repeat(64);
    }
  });
  return { current, incoming, sourceManifest: baseline };
}

test("changing multiple Word tables retains matched Studio charts and styling without review", () => {
  const refreshed = refreshWordSource(twoTables());
  assert.deepEqual(refreshed.conflicts, []);
  const charts = refreshed.manifest.blocks.filter(block => block.type === "horizontal-bar-chart");
  assert.equal(charts.length, 2);
  assert.deepEqual(charts.map(chart => chart.items[0].value), [70, 60]);
  assert.ok(charts.every(chart => chart.presentation?.palette === "teal" && chart.presentation.note === "Keep styling"));
});

test("ambiguous changed tables flag styling loss instead of silently replacing Studio charts", () => {
  const input = twoTables(true);
  const refreshed = refreshWordSource(input);
  assert.ok(refreshed.conflicts.some(conflict => /couldn't be matched/.test(conflict.label)));
  assert.equal(input.current.blocks.filter(block => block.type === "horizontal-bar-chart").length, 2);
});

test("only overlapping edits conflict; unrelated Studio edits and inserted blocks survive", () => {
  const baseline = source();
  const current = structuredClone(baseline);
  const paragraph = current.blocks[1];
  assert.equal(paragraph.type, "paragraph");
  paragraph.text = "Studio-edited narrative.";
  current.blocks.splice(2, 0, {
    id: "studio-note", type: "paragraph", text: "Studio-only note.",
    source: { part: "studio", index: 0 }, provenance: { kind: "studio" },
  });
  const incoming = revision(baseline);
  incoming.blocks[1] = baseline.blocks[1];
  const independent = refreshWordSource({ current, sourceManifest: baseline, incoming });
  assert.deepEqual(independent.conflicts, []);
  assert.equal(independent.manifest.blocks[1].type === "paragraph" && independent.manifest.blocks[1].text,
    "Studio-edited narrative.");
  assert.equal(independent.manifest.blocks[2].id, "studio-note");
  const overlapping = refreshWordSource({ current, sourceManifest: baseline, incoming: revision(baseline) });
  assert.equal(overlapping.conflicts.length, 1);
  assert.match(overlapping.conflicts[0].label, /both Word and Studio/);
  assert.equal(current.blocks[1].type === "paragraph" && current.blocks[1].text, "Studio-edited narrative.");
});

test("Word refresh updates or clears the employee count while retaining independent Studio metadata", () => {
  const baseline = source();
  baseline.metadata.employeeCount = 464;
  const current = structuredClone(baseline);
  current.metadata.title = "My Studio title";
  for (const employeeCount of [500, undefined]) {
    const incoming = revision(baseline);
    incoming.metadata.employeeCount = employeeCount;
    const refreshed = refreshWordSource({ current, sourceManifest: baseline, incoming });
    assert.deepEqual(refreshed.conflicts, []);
    assert.equal(refreshed.manifest.metadata.employeeCount, employeeCount);
    assert.equal(refreshed.manifest.metadata.title, "My Studio title");
    assert.equal(current.metadata.employeeCount, 464);
  }
});

test("unchanged Word files leave Studio edits untouched and establish a baseline for older drafts", async () => {
  const baseline = source();
  const current = structuredClone(baseline);
  current.metadata.title = "My Studio title";
  const refreshed = refreshWordSource({
    current, incoming: baseline, approvedContent: await createApprovedContentRecord(baseline),
  });
  assert.equal(refreshed.unchanged, true);
  assert.equal(refreshed.manifest, current);
  assert.deepEqual(refreshed.sourceManifest, baseline);
});

test("older drafts refresh using their original approved Word evidence, not their edited content", async () => {
  const baseline = source();
  const current = structuredClone(baseline);
  const paragraph = current.blocks[1];
  assert.equal(paragraph.type, "paragraph");
  paragraph.text = "Studio edit made before source tracking.";
  const refreshed = refreshWordSource({
    current, incoming: revision(baseline), approvedContent: await createApprovedContentRecord(baseline),
  });
  assert.equal(refreshed.conflicts.length, 1);
  assert.match(refreshed.conflicts[0].label, /both Word and Studio/);
});

test("invalid updated percentages fail without mutating the current draft", () => {
  const baseline = source();
  const incoming = revision(baseline);
  const chart = incoming.blocks[2];
  assert.equal(chart.type, "data-visual-source");
  chart.data.rows[1].cells[1] = "101%";
  assert.throws(() => refreshWordSource({ current: baseline, sourceManifest: baseline, incoming }),
    /needs valid, supported source data/);
  const original = baseline.blocks[2];
  assert.equal(original.type === "data-visual-source" && original.data.rows[1].cells[1], "48.11%");
});

test("Word deletions respect Studio deletions and flag deleted sections with local content edits", () => {
  const baseline = source();
  const current = structuredClone(baseline);
  current.blocks.splice(1, 1);
  const incoming = revision(baseline);
  incoming.blocks[1] = baseline.blocks[1];
  assert.equal(refreshWordSource({ current, sourceManifest: baseline, incoming }).manifest.blocks.length, 2);
  assert.equal(refreshWordSource({ current, sourceManifest: baseline, incoming: revision(baseline) }).conflicts.length, 1);
  const edited = structuredClone(baseline);
  const paragraph = edited.blocks[1];
  assert.equal(paragraph.type, "paragraph");
  paragraph.text = "Studio edit";
  incoming.blocks.splice(1, 1);
  assert.match(refreshWordSource({ current: edited, sourceManifest: baseline, incoming }).conflicts[0].label,
    /removed in Word/);
});
