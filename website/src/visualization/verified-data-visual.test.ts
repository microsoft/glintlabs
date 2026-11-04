import assert from "node:assert/strict";
import test from "node:test";
import { reportBlockSchema } from "../manifest/report-manifest.ts";
import { createStudioChartSource, parseChartTable, validateChartTable } from "./chart-authoring.ts";

import {
  compatibleVerifiedVisuals,
  createVerifiedDataVisual,
  verifiedVisualMatchesSource,
  type DataVisualSourceBlock,
} from "./verified-data-visual.ts";

const source: DataVisualSourceBlock = {
  id: "approved-data",
  type: "data-visual-source",
  data: {
    sourceKind: "word-table",
    title: "Manager optimism",
    unit: "percentage",
    columns: ["Category", "Percent favorable"],
    rows: [
      { id: "one", cells: ["Competitive advantage", "73%"] },
      { id: "two", cells: ["Advocate for agents", "62%"] },
      { id: "three", cells: ["Achieve more", "64%"] },
    ],
    sha256: "a".repeat(64),
  },
  provenance: { kind: "imported" },
  source: { part: "word/document.xml", index: 10 },
};

test("saves chart appearance separately without rewriting verified research data", () => {
  const visual = createVerifiedDataVisual(source, "horizontal-bar-chart", "2026-09-17T20:00:00.000Z");
  const presentation = {
    title: "An author-edited display title",
    subtitle: "An illustrative comparison",
    note: "Keep interpretation separate from the source.",
    palette: "brand",
    density: "comfortable",
    sort: "descending",
  };
  const restored = reportBlockSchema.parse({ ...visual, presentation });
  assert.deepEqual("presentation" in restored ? restored.presentation : undefined, presentation);
  assert.equal(verifiedVisualMatchesSource(restored), true);
  assert.equal(restored.type === "horizontal-bar-chart" && restored.title, "Manager optimism");
  assert.deepEqual(restored.type === "horizontal-bar-chart" && restored.verifiedSource?.rows, source.data.rows);
});

test("pasted percentage tables preserve quoted labels, precision, zero, and fractional percentages", () => {
  const table = parseChartTable('\uFEFFTeam,Percentage\r\n"Product, design",24.00%\r\n"Customer ""success""",0\r\nResearch,.25');
  assert.deepEqual(table.rows.map(row => row.cells), [
    ["Product, design", "24.00%"], ['Customer "success"', "0"], ["Research", ".25"],
  ]);
  assert.deepEqual(validateChartTable(table), []);
  assert.throws(() => parseChartTable('Team,Percent\n"Research,20'), /quotation/i);
  assert.throws(() => parseChartTable("Team,Percent\nA,20,30"), /two columns/i);
  for (const raw of ["", "101", "-1", "1e2", "1,0"]) {
    const invalid = { ...table, rows: table.rows.map((row, i) => i ? row : { ...row, cells: [row.cells[0], raw] }) };
    assert.ok(validateChartTable(invalid).some(error => error.row === 0 && error.column === 1));
  }
});

test("number chart values preserve signed decimals, precision, and source identity", async () => {
  const table = parseChartTable("Team,Amount\nResearch,1200.50\nSupport,-25.25\nProduct,0");
  assert.deepEqual(validateChartTable(table, "number"), []);
  const numericSource = await createStudioChartSource({
    id: source.id, table, sourceName: "Absolute values", synthetic: true, original: source, unit: "number",
  });
  assert.equal(numericSource.data.unit, "number");
  assert.deepEqual(compatibleVerifiedVisuals(numericSource), ["horizontal-bar-chart"]);
  const chart = reportBlockSchema.parse(createVerifiedDataVisual(numericSource, "horizontal-bar-chart", "2026-11-03T20:00:00.000Z"));
  assert.ok(chart.type === "horizontal-bar-chart");
  assert.deepEqual(chart.items.map(item => item.value), [1200.5, -25.25, 0]);
  assert.deepEqual(chart.verifiedSource?.rows, table.rows);
  assert.equal(chart.verifiedSource?.originalSource?.sha256, source.data.sha256);
  assert.equal(verifiedVisualMatchesSource(chart), true);
  assert.deepEqual(compatibleVerifiedVisuals({
    ...numericSource, data: { ...numericSource.data, recommendedVisualType: "percentage-ring-group" },
  }), [], "Absolute values must not be offered as percentage rings");
});

test("percentage bounds stay strict and number mode rejects percentages and non-finite values", () => {
  const table = parseChartTable("Team,Value\nResearch,1200.50\nSupport,-25.25");
  assert.equal(validateChartTable(table).filter(error => error.column === 1).length, 2);
  for (const raw of ["", "25%", "Infinity", "1e3", "1,200"]) {
    const invalid = { ...table, rows: table.rows.map((row, i) => i ? row : { ...row, cells: [row.cells[0], raw] }) };
    assert.ok(validateChartTable(invalid, "number").some(error => error.row === 0 && error.column === 1), raw);
  }
  const percentageChart = createVerifiedDataVisual(source, "horizontal-bar-chart", "2026-11-03T20:00:00.000Z");
  assert.ok(percentageChart.type === "horizontal-bar-chart");
  assert.equal(reportBlockSchema.safeParse({
    ...percentageChart, items: percentageChart.items.map((item, i) => i ? item : { ...item, value: 1200 }),
  }).success, false, "Absolute-value support must not relax percentage chart bounds");
});

test("edited Studio data retains original-source identity without claiming unchanged Word provenance", async () => {
  const before = structuredClone(source);
  const input = {
    id: source.id,
    table: parseChartTable("Team\tPercentage\nResearch\t24.00%\nSupport\t0"),
    sourceName: "Synthetic workplace research",
    synthetic: true,
    original: source,
  };
  const edited = await createStudioChartSource(input);
  assert.equal(edited.data.sourceKind, "verified-upload");
  assert.equal(edited.source.part, "studio");
  assert.equal(edited.data.rows[0].cells[1], "24.00%");
  assert.equal(edited.data.originalSource?.sha256, source.data.sha256);
  assert.equal(edited.data.synthetic, true);
  assert.notEqual(edited.data.sha256, source.data.sha256);
  assert.equal(edited.data.sha256, (await createStudioChartSource(input)).data.sha256);
  assert.equal(verifiedVisualMatchesSource(createVerifiedDataVisual(edited, "horizontal-bar-chart", "2026-09-17T20:00:00.000Z")), true);
  assert.deepEqual(source, before);
  const restored = reportBlockSchema.parse(edited);
  assert.ok(restored.type === "data-visual-source" && restored.data.synthetic);
  await assert.rejects(() => createStudioChartSource({ ...input, table: parseChartTable("Team,Percent\nA,24\nA,30") }), /unique/i);
});

test("editing chart data retains original bitmap evidence in the saved verified source", async () => {
  const evidenceImage = {
    fileName: "original-chart.png",
    dataUrl: "data:image/png;base64,AAAA",
    width: 800, height: 600, sourceAssetSha256: "b".repeat(64),
  };
  const edited = await createStudioChartSource({
    id: source.id,
    table: parseChartTable("Team,Percentage\nResearch,24.00%\nSupport,0"),
    sourceName: "Synthetic workplace research",
    synthetic: true,
    original: { ...source, data: { ...source.data, evidenceImage } },
  });
  const restored = reportBlockSchema.parse(createVerifiedDataVisual(
    edited, "horizontal-bar-chart", "2026-09-17T20:00:00.000Z",
  ));
  assert.ok(restored.type === "horizontal-bar-chart");
  assert.deepEqual(restored.verifiedSource?.evidenceImage, evidenceImage);
  assert.equal(restored.verifiedSource?.originalSource?.sha256, source.data.sha256);
});

test("offers only visual treatments compatible with approved data shape", () => {
  assert.deepEqual(compatibleVerifiedVisuals(source), [
    "horizontal-bar-chart",
    "percentage-ring-group",
  ]);
});

test("honors the visual treatment selected in the guided Word template", () => {
  assert.deepEqual(
    compatibleVerifiedVisuals({
      ...source,
      data: {
        ...source.data,
        recommendedVisualType: "percentage-ring-group",
      },
    }),
    ["percentage-ring-group"],
  );
});

test("creates a coded visual without changing approved labels or values", () => {
  const visual = createVerifiedDataVisual(
    source,
    "percentage-ring-group",
    "2026-09-17T20:00:00.000Z",
  );

  assert.deepEqual(
    visual.metrics.map((metric) => [metric.description, metric.value]),
    [
      ["Competitive advantage", 73],
      ["Advocate for agents", 62],
      ["Achieve more", 64],
    ],
  );
  assert.equal(verifiedVisualMatchesSource(visual), true);
});

test("detects data drift in a verified coded visual", () => {
  const visual = createVerifiedDataVisual(
    source,
    "horizontal-bar-chart",
    "2026-09-17T20:00:00.000Z",
  );
  const changed = {
    ...visual,
    items: visual.items.map((item, index) =>
      index === 0 ? { ...item, value: 74 } : item,
    ),
  };

  assert.equal(verifiedVisualMatchesSource(changed), false);
});

test("detects source-note drift in a verified coded visual", () => {
  const visual = createVerifiedDataVisual(
    {
      ...source,
      data: {
        ...source.data,
        sourceNote: "Source: approved Excel chart.",
      },
    },
    "horizontal-bar-chart",
    "2026-09-17T20:00:00.000Z",
  );

  assert.equal(
    verifiedVisualMatchesSource({
      ...visual,
      sourceNote: "Source: changed after approval.",
    }),
    false,
  );
});

test("preserves the approved grouped-column subtitle", () => {
  const groupedSource: DataVisualSourceBlock = {
    ...source,
    data: {
      ...source.data,
      title: "Readiness by psychological safety",
      subtitle: "Average percent favorable",
      columns: ["Measure", "Psychologically safe", "Everyone else"],
      rows: [
        { id: "one", cells: ["Individual readiness", "76%", "60%"] },
        { id: "two", cells: ["Team readiness", "76%", "56%"] },
        { id: "three", cells: ["Individual value", "82%", "71%"] },
        { id: "four", cells: ["Team value", "85%", "72%"] },
      ],
      recommendedVisualType: "grouped-column-comparison",
    },
  };
  const visual = createVerifiedDataVisual(
    groupedSource,
    "grouped-column-comparison",
    "2026-09-17T20:00:00.000Z",
  );

  assert.equal(visual.subtitle, "Average percent favorable");
  assert.equal(verifiedVisualMatchesSource(visual), true);
  assert.equal(
    verifiedVisualMatchesSource({
      ...visual,
      subtitle: "Changed after approval",
    }),
    false,
  );
});
