import assert from "node:assert/strict";
import test from "node:test";
import { reportBlockSchema, type ReportBlock } from "../manifest/report-manifest.ts";
import { estimateReportReadingTime } from "./report-reading-time.ts";

const source = { part: "word/document.xml", index: 0 };
const body: ReportBlock = { id: "body", type: "paragraph", text: "word ".repeat(180), source };
const types = ["horizontal-bar-chart", "grouped-column-comparison", "grouped-bar-comparison",
  "comparison-panel-group", "paired-percentage-comparison", "percentage-comparison-grid",
  "percentage-ring-group", "illustrated-statistics"] as const;

for (const type of types) {
  test(`reading time follows added and hidden reader copy in ${type}`, () => {
    const chart = reportBlockSchema.parse({
      id: "chart", type, source, title: "Chart", subtitle: "Context", sourceNote: "Legacy citation",
      footnote: "Legacy citation", legend: "Favorable",
      items: [{ id: "first", label: "First", value: 50 }, { id: "second", label: "Second", value: 60 }],
      series: ["Favorable"], groups: [{ id: "group", label: "Group", values: [50] }],
      panels: [{ id: "panel", title: "Panel", series: ["First", "Second"], values: [50, 60] }],
      metrics: Array.from({ length: type === "percentage-comparison-grid" ? 4 : 2 },
        (_, index) => ({ id: `metric-${index}`, description: "Finding", value: 50 })),
      presentation: { title: "Chart", sourceNote: "citation ".repeat(40) },
    });
    const presentation = "presentation" in chart ? chart.presentation : undefined;
    const minutes = (block: ReportBlock) => estimateReportReadingTime({ blocks: [body, block] });
    assert.equal(minutes(chart), 2, "Displayed citations must count toward the unchanged 200 words/minute rate.");
    const hidden = reportBlockSchema.parse({ ...chart, sourceNote: "hidden ".repeat(240), footnote: "hidden ".repeat(240),
      presentation: { ...presentation, sourceNote: "" } });
    assert.equal(minutes(hidden), 1, "An empty reader override must not count the original citation.");
    assert.equal(minutes(reportBlockSchema.parse({ ...hidden,
      presentation: { ...presentation, sourceNote: "", note: "context ".repeat(40) } })), 2, "Displayed author notes must count.");
    assert.equal(minutes(reportBlockSchema.parse({ ...hidden, title: "hidden ".repeat(240) })), 1,
      "A presentation title replaces rather than adds to the original title.");
    if (type === "horizontal-bar-chart" || type === "grouped-column-comparison" ||
        type === "grouped-bar-comparison" || type === "comparison-panel-group") {
      assert.equal(minutes(reportBlockSchema.parse({ ...hidden,
        presentation: { ...presentation, sourceNote: "", xAxisLabel: "axis ".repeat(24) } })), 2, "Displayed axis labels must count.");
    }
  });
}

test("imported chart axes count but a hidden native-table title does not", () => {
  const chart = reportBlockSchema.parse({
    id: "source", type: "data-visual-source", source,
    data: { sourceKind: "word-chart", title: "Chart", unit: "percentage", sha256: "a".repeat(64),
      columns: ["Category", "Favorable"], rows: [{ id: "row", cells: ["First", "50%"] }] },
    presentation: { xAxisLabel: "axis ".repeat(24) },
  });
  assert.equal(estimateReportReadingTime({ blocks: [body, chart] }), 2);
  const table = reportBlockSchema.parse({ ...chart, tablePresentation: { headerRow: true, showTitle: false, tone: "blue" },
    data: { ...(chart.type === "data-visual-source" ? chart.data : {}), title: "hidden ".repeat(240) } });
  assert.equal(estimateReportReadingTime({ blocks: [body, table] }), 1);
});
