import assert from "node:assert/strict";
import test from "node:test";

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
