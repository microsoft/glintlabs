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

test("coefficient heatmaps preserve decimals, zero and unavailable cells through verification and restore", async () => {
  const table = {
    columns: ["Factor", "April '24", "July '25", "Nov '25"],
    rows: [
      { id: "safety", cells: ["Psychological Safety", "N/A", ".147", ".231"] },
      { id: "clarity", cells: ["Role Clarity", "", ".222", ".250"] },
      { id: "zero", cells: ["Other factor", "0", "-.125", ".350"] },
    ],
  };
  const before = structuredClone(table);
  const edited = await createStudioChartSource({
    id: source.id, table, sourceName: "Author-provided coefficient table", synthetic: false,
    unit: "number", visualType: "coefficient-heatmap",
  });
  const visual = createVerifiedDataVisual(edited, "coefficient-heatmap", "2026-11-07T04:45:00.000Z");
  assert.equal(visual.type, "coefficient-heatmap");
  assert.deepEqual(visual.rows.map(row => row.values), [[null, .147, .231], [null, .222, .250], [0, -.125, .350]]);
  assert.deepEqual(visual.columns, table.columns.slice(1));
  assert.deepEqual(reportBlockSchema.parse(visual), visual);
  assert.equal(verifiedVisualMatchesSource(visual), true);
  assert.equal(verifiedVisualMatchesSource({ ...visual, rows: visual.rows.map((row, index) =>
    index ? row : { ...row, values: [0, .147, .231] }) }), false);
  assert.deepEqual(table, before);
  assert.deepEqual(parseChartTable("Factor\tApril\tJuly\nSafety\tN/A\t.147\nClarity\t0\t.222", true, "coefficient-heatmap").rows.map(row => row.cells),
    [["Safety", "N/A", ".147"], ["Clarity", "0", ".222"]]);
});

test("coefficient heatmaps reject malformed matrices and percentages without interpreting missing data as zero", () => {
  const table = { columns: ["Factor", "April", "July"], rows: [
    { id: "safety", cells: ["Safety", "N/A", ".147"] },
    { id: "clarity", cells: ["Clarity", "0", ".222"] },
  ] };
  assert.deepEqual(validateChartTable(table, "number", "coefficient-heatmap"), []);
  for (const cell of ["14.7%", "unknown", "NaN", "Infinity"]) {
    const invalid = { ...table, rows: table.rows.map((row, index) => index ? row : { ...row, cells: ["Safety", cell, ".147"] }) };
    assert.ok(validateChartTable(invalid, "number", "coefficient-heatmap").length);
  }
  assert.ok(validateChartTable(table, "percentage", "coefficient-heatmap").length);
  assert.ok(validateChartTable({ ...table, rows: [{ id: "short", cells: ["Safety", ".147"] }, table.rows[1]] },
    "number", "coefficient-heatmap").length);
});

test("heatmap support does not change the default treatment of existing numeric bar sources", () => {
  const numeric = { ...source, data: { ...source.data, unit: "number" as const } };
  numeric.data.rows = [{ id: "one", cells: ["First", ".147"] }, { id: "two", cells: ["Second", ".231"] }];
  assert.deepEqual(compatibleVerifiedVisuals(numeric), ["horizontal-bar-chart"]);
  assert.ok(compatibleVerifiedVisuals(numeric, { ignoreRecommendation: true }).includes("coefficient-heatmap"));
  const missing = { ...numeric, data: { ...numeric.data, rows: [
    { id: "one", cells: ["First", "N/A"] }, { id: "two", cells: ["Second", ".231"] },
  ] } };
  assert.deepEqual(compatibleVerifiedVisuals(missing, { ignoreRecommendation: true }), ["coefficient-heatmap"]);
});

test("heatmap scale settings survive restore while invalid ranges and precision cannot be saved", async () => {
  const data = await createStudioChartSource({
    id: "heatmap-settings", sourceName: "Coefficients", synthetic: false, unit: "number", visualType: "coefficient-heatmap",
    table: { columns: ["Factor", "Period"], rows: [
      { id: "negative", cells: ["Negative", "-.125"] }, { id: "missing", cells: ["Missing", "N/A"] },
    ] },
  });
  const visual = createVerifiedDataVisual(data, "coefficient-heatmap", "2026-11-07T04:45:00.000Z");
  const presentation = { title: "Configured heatmap", scaleMin: -.2, scaleMax: .4, decimals: 2,
    missingLabel: "Unavailable", legendLabel: "Coefficient", subtitle: "", note: "" };
  const restored = reportBlockSchema.parse(JSON.parse(JSON.stringify({ ...visual, presentation })));
  assert.equal(restored.type, "coefficient-heatmap");
  assert.deepEqual(restored.presentation, presentation);
  assert.deepEqual(restored.rows.map(row => row.values), [[-.125], [null]]);
  assert.equal(verifiedVisualMatchesSource(restored), true);
  for (const invalid of [
    { scaleMin: .4 }, { scaleMin: .5 }, { scaleMax: Infinity },
    { scaleMin: -Number.MAX_VALUE, scaleMax: Number.MAX_VALUE }, { decimals: 1.5 }, { decimals: 7 },
  ]) {
    assert.equal(reportBlockSchema.safeParse({ ...visual, presentation: { ...presentation, ...invalid } }).success, false);
  }
});

test("bar supporting text survives source creation, verification and restore without changing chart values", async () => {
  const supportingText = "Identify themes\n\nShare findings with the team\nRead <strong>the source</strong>.";
  const table = {
    columns: ["Category", "Percentage"],
    rows: [
      { id: "analysis", cells: ["Analysis", "74.00%"], supportingText: `  ${supportingText}  ` },
      { id: "action", cells: ["Action taking", "43"], supportingText: " \n " },
    ],
  };
  const before = structuredClone(table);
  const edited = await createStudioChartSource({
    id: source.id, table, sourceName: "Reviewed chart", synthetic: false,
  });
  assert.equal(edited.data.rows[0].supportingText, supportingText);
  assert.equal(edited.data.rows[1].supportingText, undefined, "Empty supporting text leaves a regular bar");
  const visual = createVerifiedDataVisual(edited, "horizontal-bar-chart", "2026-11-04T22:00:00.000Z");
  assert.ok(visual.type === "horizontal-bar-chart");
  assert.equal(visual.items[0].supportingText, supportingText);
  assert.deepEqual(visual.items.map(item => item.value), [74, 43]);
  assert.deepEqual(reportBlockSchema.parse(visual), visual);
  assert.equal(verifiedVisualMatchesSource(visual), true);
  assert.equal(verifiedVisualMatchesSource({
    ...visual,
    items: visual.items.map((item, index) => index ? item : { ...item, supportingText: "Unreviewed text" }),
  }), false, "Supporting text cannot change while retaining source approval");
  const changed = await createStudioChartSource({
    id: source.id, sourceName: "Reviewed chart", synthetic: false,
    table: { ...table, rows: table.rows.map((row, index) => index ? row : { ...row, supportingText: "Updated text" }) },
  });
  assert.notEqual(changed.data.sha256, edited.data.sha256, "The evidence hash includes supporting text");
  assert.deepEqual(table, before, "Preparing supporting text does not mutate the input");
});

test("bar breakdowns preserve reviewed labels, precision and parent values through save and restore", async () => {
  const table = {
    columns: ["Category", "Percentage"],
    rows: [
      { id: "analysis", cells: ["Analysis", "74.00%"], breakdown: [
        { id: "themes", label: "Identify themes", value: "62.50%" },
        { id: "sentiment", label: "Analyze sentiment", value: "0" },
      ] },
      { id: "action", cells: ["Action taking", "43"] },
    ],
  };
  const before = structuredClone(table);
  const edited = await createStudioChartSource({
    id: source.id, table, sourceName: "Reviewed chart", synthetic: false,
  });
  assert.deepEqual(edited.data.rows[0].breakdown, table.rows[0].breakdown);
  const visual = createVerifiedDataVisual(edited, "horizontal-bar-chart", "2026-11-04T22:00:00.000Z");
  assert.ok(visual.type === "horizontal-bar-chart");
  assert.deepEqual(visual.items[0].breakdown, [
    { id: "themes", label: "Identify themes", value: 62.5 },
    { id: "sentiment", label: "Analyze sentiment", value: 0 },
  ]);
  assert.deepEqual(visual.items.map(item => item.value), [74, 43],
    "Breakdowns do not recalculate or invent parent values");
  const restored = reportBlockSchema.parse(visual);
  assert.deepEqual(restored, visual);
  assert.equal(verifiedVisualMatchesSource(restored), true);
  assert.deepEqual(table, before, "Preparing the chart does not mutate its input");
  assert.equal(verifiedVisualMatchesSource({
    ...visual,
    items: visual.items.map((item, index) => index ? item : {
      ...item, breakdown: item.breakdown!.map(detail => ({ ...detail, value: detail.value + 1 })),
    }),
  }), false, "Changed breakdown values cannot retain source approval");
  const changed = await createStudioChartSource({
    id: source.id, sourceName: "Reviewed chart", synthetic: false,
    table: { ...table, rows: table.rows.map((row, index) => index ? row : {
      ...row, breakdown: row.breakdown!.map(detail => ({ ...detail, value: "12" })),
    }) },
  });
  assert.notEqual(changed.data.sha256, edited.data.sha256, "The evidence hash includes breakdown data");
});

test("bar breakdowns reject missing or invalid values without treating them as zero", async () => {
  for (const detail of [
    { id: "detail", label: "", value: "24" },
    { id: "detail", label: "Finding", value: "" },
    { id: "detail", label: "Finding", value: "101%" },
    { id: "detail", label: "Finding", value: "-1" },
  ]) {
    await assert.rejects(() => createStudioChartSource({
      id: source.id, sourceName: "Reviewed chart", synthetic: false,
      table: { columns: source.data.columns, rows: source.data.rows.map((row, index) => index ? row : {
        ...row, breakdown: [detail],
      }) },
    }), /breakdown/i);
  }
  const numeric = await createStudioChartSource({
    id: source.id, sourceName: "Reviewed numbers", synthetic: false, unit: "number",
    table: { columns: ["Category", "Number"], rows: [
      { id: "first", cells: ["First", "-10"], breakdown: [{ id: "detail", label: "Change", value: "-2.50" }] },
      { id: "second", cells: ["Second", "20"] },
    ] },
  });
  const visual = createVerifiedDataVisual(numeric, "horizontal-bar-chart", "2026-11-04T22:00:00.000Z");
  assert.ok(visual.type === "horizontal-bar-chart");
  assert.equal(visual.items[0].breakdown?.[0].value, -2.5);
  assert.equal(reportBlockSchema.safeParse(visual).success, true);
});

test("paired comparisons require exactly two independently valid percentage findings", () => {
  const pair = { ...source, data: { ...source.data, rows: source.data.rows.slice(0, 2) } };
  assert.ok(compatibleVerifiedVisuals(pair).includes("paired-percentage-comparison"));
  for (const data of [
    { ...pair.data, unit: "number" as const },
    source.data,
    { ...pair.data, rows: pair.data.rows.slice(0, 1) },
    { ...pair.data, rows: [{ id: "one", cells: ["First", "101"] }, pair.data.rows[1]] },
  ]) {
    assert.equal(compatibleVerifiedVisuals({ ...pair, data }).includes("paired-percentage-comparison"), false);
  }
});

test("percentage comparison grids preserve four independent findings, row headings and evidence", async () => {
  const table = {
    columns: ["Finding", "Percentage"],
    rows: [
      { id: "meeting", cells: ["Discussed team feedback", "38.00%"] },
      { id: "plan", cells: ["Created an action plan", "29"] },
      { id: "accountable", cells: ["Accountable for follow-through", "80"] },
      { id: "changes", cells: ["Saw meaningful changes", "75.125"] },
    ],
  };
  const edited = await createStudioChartSource({
    id: "four-findings", table, sourceName: "Reviewed action-taking findings", synthetic: false,
    visualType: "percentage-comparison-grid",
  });
  const visual = createVerifiedDataVisual(edited, "percentage-comparison-grid", "2026-11-05T03:40:00.000Z");
  assert.ok(visual.type === "percentage-comparison-grid");
  assert.deepEqual(visual.metrics.map(metric => metric.value), [38, 29, 80, 75.125]);
  const presentation = {
    title: "The action-taking paradox", leadIns: ["In the last six months, only...", "Yet..."],
    note: "Independent findings, not parts of a total.", palette: "brand",
  };
  const restored = reportBlockSchema.parse({ ...visual, presentation });
  assert.ok(restored.type === "percentage-comparison-grid");
  assert.deepEqual(restored.presentation, presentation);
  assert.deepEqual(restored.verifiedSource?.rows, table.rows);
  assert.equal(verifiedVisualMatchesSource(restored), true);
  assert.equal(verifiedVisualMatchesSource({
    ...restored, metrics: restored.metrics.map((metric, index) => index ? metric : { ...metric, value: 39 }),
  }), false, "A metric change cannot keep its source approval");
  for (const invalid of [
    { ...table, rows: table.rows.slice(0, 3) },
    { columns: ["Finding", "First", "Second"], rows: table.rows.map(row => ({ ...row, cells: [...row.cells, "40"] })) },
    { ...table, rows: table.rows.map((row, index) => index ? row : { ...row, cells: ["Missing", ""] }) },
    { ...table, rows: table.rows.map((row, index) => index ? row : { ...row, cells: ["Out of range", "101"] }) },
  ]) {
    assert.ok(validateChartTable(invalid, "percentage", "percentage-comparison-grid").length);
  }
  assert.ok(validateChartTable(table, "number", "percentage-comparison-grid").length);
});

test("paired comparisons preserve precision, provenance and independent totals through save and restore", async () => {
  const edited = await createStudioChartSource({
    id: source.id,
    table: parseChartTable("Finding,Percentage\nSee an opportunity,83.00%\nHave a clear plan,43%"),
    sourceName: "Synthetic paired findings", synthetic: true, original: source,
    visualType: "paired-percentage-comparison",
  });
  const visual = createVerifiedDataVisual(edited, "paired-percentage-comparison", "2026-11-03T20:00:00.000Z");
  assert.ok(visual.type === "paired-percentage-comparison");
  assert.deepEqual(visual.metrics.map(metric => metric.value), [83, 43]);
  const presentation = { title: "Opportunity and readiness", leadIns: ["While...", "Only..."], note: "Independent findings.", palette: "brand" };
  const restored = reportBlockSchema.parse({ ...visual, presentation });
  assert.ok(restored.type === "paired-percentage-comparison");
  assert.deepEqual(restored.presentation, presentation);
  assert.equal(restored.verifiedSource?.rows[0].cells[1], "83.00%");
  assert.equal(restored.verifiedSource?.originalSource?.sha256, source.data.sha256);
  assert.equal(verifiedVisualMatchesSource(restored), true);
  assert.equal(verifiedVisualMatchesSource({
    ...restored, metrics: restored.metrics.map((metric, i) => i ? metric : { ...metric, value: 84 }),
  }), false);
  assert.equal(verifiedVisualMatchesSource({ ...restored, footnote: "Changed source note" }), false);
  for (const raw of ["-1", "101", "1e2", ""]) {
    await assert.rejects(() => createStudioChartSource({
      id: source.id, table: parseChartTable(`Finding,Percentage\nFirst,${raw}\nSecond,43`),
      sourceName: "Invalid pair", synthetic: true, visualType: "paired-percentage-comparison",
    }));
  }
  await assert.rejects(() => createStudioChartSource({
    id: source.id, table: { columns: source.data.columns, rows: source.data.rows },
    sourceName: "Three findings", synthetic: true, visualType: "paired-percentage-comparison",
  }));
});

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

test("Studio rings support two or three findings and preserve independent percentages and appearance", async () => {
  const table = parseChartTable("Finding,Percentage\nFirst,83.00%\nSecond,43\nThird,0", true, "percentage-ring-group");
  for (const count of [2, 3]) {
    const findings = { ...table, rows: table.rows.slice(0, count) };
    assert.deepEqual(validateChartTable(findings, "percentage", "percentage-ring-group"), []);
    const edited = await createStudioChartSource({
      id: "rings", table: findings, sourceName: "Ring findings", synthetic: false, visualType: "percentage-ring-group",
    });
    const visual = createVerifiedDataVisual(edited, "percentage-ring-group", "2026-11-04T20:00:00.000Z");
    const presentation = { title: "Independent findings", note: "Independent percentages.", palette: "brand", density: "comfortable", sort: "source", subtitle: "" };
    const restored = reportBlockSchema.parse({ ...visual, presentation });
    assert.ok(restored.type === "percentage-ring-group");
    assert.equal(restored.metrics.length, count);
    assert.deepEqual(restored.presentation, presentation);
    assert.equal(restored.verifiedSource?.rows[0].cells[1], "83.00%");
    assert.equal(verifiedVisualMatchesSource(restored), true);
    for (const metrics of [restored.metrics.slice(0, 1),
      Array.from({ length: 4 }, (_, index) => ({ ...restored.metrics[0], id: `too-many-${index}` }))]) {
      assert.equal(reportBlockSchema.safeParse({ ...restored, metrics }).success, false);
    }
  }
  for (const rows of [table.rows.slice(0, 1), [...table.rows, { id: "four", cells: ["Fourth", "100"] }]]) {
    assert.ok(validateChartTable({ ...table, rows }, "percentage", "percentage-ring-group").length);
  }
});

test("quadrant charts preserve stable point IDs, signed coordinates and numerical breakdowns", async () => {
  const table = { columns: ["Point ID", "Label", "X value", "Y value", "Description", "Maintaining", "Expanding"],
    rows: [
      { id: "alpha", cells: ["alpha", "First approach", "-5.25", "90.00", "First explanation", "70%", "30%"] },
      { id: "beta", cells: ["beta", "Second approach", "20", "80", "Second explanation", "60%", "40%"] },
    ] };
  const source = await createStudioChartSource({
    id: "quadrant", table, sourceName: "Quadrant evidence", synthetic: false,
    unit: "number", visualType: "quadrant-scatter-plot",
  });
  const visual = createVerifiedDataVisual(source, "quadrant-scatter-plot", "2026-11-05T19:00:00.000Z");
  assert.equal(visual.type, "quadrant-scatter-plot");
  assert.deepEqual(visual.points.map(point => [point.id, point.x, point.y]), [["alpha", -5.25, 90], ["beta", 20, 80]]);
  assert.deepEqual(visual.points[0].breakdown.map(item => [item.label, item.value]), [["Maintaining", 70], ["Expanding", 30]]);
  const restored = reportBlockSchema.parse({ ...visual, presentation: {
    title: "Reusable quadrant", splitMode: "manual", xSplit: 0, ySplit: 85,
    xLabel: "Growth", yLabel: "Use", xUnit: "number", yUnit: "percentage",
  } });
  assert.equal(restored.verifiedSource?.rows[0].cells[3], "90.00");
  assert.equal(verifiedVisualMatchesSource(restored), true);
  assert.equal(verifiedVisualMatchesSource({ ...restored, points: [
    { ...restored.points[0], breakdown: [{ ...restored.points[0].breakdown[0], value: 71 }] }, restored.points[1],
  ] }), false);
  assert.ok(validateChartTable({ ...table, rows: [table.rows[0], { ...table.rows[1], cells: ["alpha", ...table.rows[1].cells.slice(1)] }] },
    "number", "quadrant-scatter-plot").length, "Duplicate point IDs are rejected");
});

test("illustrated statistics support two or three findings with independent presentation choices", async () => {
  for (const count of [2, 3]) {
    const table = parseChartTable("Finding,Percentage\nFirst,60.00%\nSecond,0\nThird,100");
    table.rows = table.rows.slice(0, count);
    const source = await createStudioChartSource({
      id: "illustrated", table, sourceName: "Illustrated findings", synthetic: false,
      visualType: "illustrated-statistics",
    });
    assert.ok(compatibleVerifiedVisuals(source).includes("illustrated-statistics"));
    const visual = createVerifiedDataVisual(source, "illustrated-statistics", "2026-11-05T18:00:00.000Z");
    const restored = reportBlockSchema.parse({ ...visual, presentation: {
      title: "A heading long enough to match the supplied multi-line Figma design. ".repeat(3),
      valueLabel: "selected", illustrations: { [table.rows[0].id]: "celebration", [table.rows[1].id]: "people" },
      note: "Independent findings; values do not need to total 100%.",
    } });
    assert.equal(restored.type, "illustrated-statistics");
    assert.equal(restored.metrics.length, count);
    assert.equal(restored.verifiedSource?.rows[0].cells[1], "60.00%");
    assert.equal(restored.presentation?.illustrations[table.rows[1].id], "people");
    assert.equal(verifiedVisualMatchesSource(restored), true, "Artwork is presentation, not edited evidence");
    assert.equal(verifiedVisualMatchesSource({ ...restored, metrics: [
      { ...restored.metrics[0], value: 61 }, ...restored.metrics.slice(1),
    ] }), false, "Numerical changes still require matching evidence");
    assert.equal(reportBlockSchema.safeParse({ ...restored, presentation: {
      ...restored.presentation, illustrations: { [table.rows[0].id]: "../unapproved.svg" },
    } }).success, false);
  }
  const table = parseChartTable("Finding,Percentage\nFirst,10\nSecond,20\nThird,30\nFourth,40");
  for (const count of [1, 4]) {
    assert.ok(validateChartTable({ ...table, rows: table.rows.slice(0, count) },
      "percentage", "illustrated-statistics").length);
  }
});

test("Studio comparison grids accept two percentage series without relaxing bar imports", async () => {
  const input = "Group,Current,Previous\nFirst,83.00%,43\nSecond,0,100\nThird,12.50,20\nFourth,75,60";
  assert.throws(() => parseChartTable(input), /two columns/i);
  const table = parseChartTable(input, true, "grouped-column-comparison");
  assert.deepEqual(validateChartTable(table, "percentage", "grouped-column-comparison"), []);
  const edited = await createStudioChartSource({
    id: "grid", table, sourceName: "Comparison data", synthetic: false, visualType: "grouped-column-comparison",
  });
  const visual = createVerifiedDataVisual(edited, "grouped-column-comparison", "2026-11-04T20:00:00.000Z");
  const presentation = { title: "Compare groups", subtitle: "Two series", note: "Author note", palette: "brand", density: "comfortable", sort: "source" };
  const restored = reportBlockSchema.parse({ ...visual, presentation });
  assert.ok(restored.type === "grouped-column-comparison");
  assert.deepEqual(restored.series, ["Current", "Previous"]);
  assert.deepEqual(restored.groups[0].values, [83, 43]);
  assert.deepEqual(restored.presentation, presentation);
  assert.equal(restored.verifiedSource?.rows[0].cells[1], "83.00%");
  assert.equal(verifiedVisualMatchesSource(restored), true);
  for (const invalid of [
    { ...table, rows: table.rows.slice(0, 3) },
    { ...table, rows: table.rows.map((row, i) => i ? row : { ...row, cells: ["First", "83", "101"] }) },
    { ...table, rows: table.rows.map((row, i) => i ? row : { ...row, cells: ["First", "83", ""] }) },
  ]) {
    await assert.rejects(() => createStudioChartSource({
      id: "invalid-grid", table: invalid, sourceName: "Invalid grid", synthetic: false, visualType: "grouped-column-comparison",
    }));
  }
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
    "illustrated-statistics",
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
