import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalVisualOptions,
  createCanonicalVisualBlock,
} from "../visualization/canonical-report-blocks.ts";
import { reportManifestSchema } from "./report-manifest.ts";

const minimumManifest = {
  schemaVersion: "0.1.0",
  source: {
    fileName: "frozen-report.docx",
    sizeBytes: 100,
    sha256: "a".repeat(64),
  },
  metadata: {
    title: "Frozen report",
    status: "draft",
  },
  blocks: [
    {
      id: "block-1",
      type: "heading",
      level: 1,
      text: "Frozen report",
      source: {
        part: "word/document.xml",
        index: 0,
      },
    },
  ],
  reviewItems: [],
  extraction: {
    paragraphCount: 1,
    imageCount: 0,
    unsupportedCount: 0,
  },
} as const;

test("accepts the minimum valid report manifest", () => {
  const result = reportManifestSchema.safeParse(minimumManifest);

  assert.equal(result.success, true);
});

test("retains Word paragraph spacing and native table treatment through reader parsing", () => {
  const table = {
    id: "table", type: "data-visual-source", source: { part: "word/document.xml", index: 1 },
    tablePresentation: { headerRow: true, showTitle: false, tone: "blue" },
    data: { sourceKind: "word-table", title: "Activities", unit: "unknown", sha256: "b".repeat(64),
      columns: ["Activity", "Gap"], rows: [{ id: "first", cells: ["Action plan", "+14pp"] }] },
  };
  const parsed = reportManifestSchema.parse({ ...minimumManifest, blocks: [
    { id: "text", type: "paragraph", text: "Methods.", paragraphBreakBefore: true, source: table.source }, table,
  ] });
  assert.equal("paragraphBreakBefore" in parsed.blocks[0] && parsed.blocks[0].paragraphBreakBefore, true);
  assert.equal(parsed.blocks[1].type === "data-visual-source" && parsed.blocks[1].tablePresentation?.tone, "blue");
  assert.equal(reportManifestSchema.safeParse({ ...minimumManifest,
    blocks: [{ ...table, data: { ...table.data, rows: [{ id: "bad", cells: ["Action plan", "+14pp", "N/A"] }] } }],
  }).success, false);
});

test("reader parsing retains saved header framing and hidden chart legends", () => {
  const presentation = { style: "original", crop: "landscape", focalPointX: 35, focalPointY: 0 };
  const manifest = reportManifestSchema.parse(JSON.parse(JSON.stringify({
    ...minimumManifest, blocks: [
      ...minimumManifest.blocks,
      { id: "photo", type: "image", fileName: "photo.png", dataUrl: "data:image/png;base64,eA==",
        width: 100, height: 100, alt: "Synthetic photo", placement: "hero", presentation,
        source: { part: "word/document.xml", index: 1 } },
      { id: "columns", type: "grouped-column-comparison", title: "Synthetic chart",
        subtitle: "Synthetic fixture", sourceNote: "Source: Synthetic fixture.",
        series: ["Favorable"], groups: [{ id: "first", label: "First", values: [80] }],
        presentation: { title: "Synthetic chart", showLegend: false },
        source: { part: "word/document.xml", index: 2 } },
    ],
  })));
  assert.equal(manifest.blocks[1].type, "image");
  assert.deepEqual(manifest.blocks[1].type === "image" && manifest.blocks[1].presentation, presentation);
  assert.equal(manifest.blocks[2].type === "grouped-column-comparison" && manifest.blocks[2].presentation?.showLegend, false);
});

test("accepts current Studio line charts and rejects mismatched period matrices", () => {
  const chart = {
    id: "synthetic-trend", type: "line-chart",
    source: { part: "studio", index: 1 },
    title: "Synthetic trend", subtitle: "", sourceNote: "Synthetic compatibility example.",
    periods: [{ id: "p1", label: "Period 1" }, { id: "p2", label: "Period 2" }],
    series: [{ id: "s1", label: "Example series", values: [25, 50] }],
  };
  assert.equal(reportManifestSchema.safeParse({ ...minimumManifest, blocks: [chart] }).success, true);
  assert.equal(reportManifestSchema.safeParse({
    ...minimumManifest, blocks: [{ ...chart, series: [{ ...chart.series[0], values: [25] }] }],
  }).success, false);
});

test("accepts an author name without a handle and retains existing handles", () => {
  for (const author of [{ name: "Test author" }, { name: "Test author", handle: "@retained" }]) {
    const parsed = reportManifestSchema.parse({ ...minimumManifest, metadata: { ...minimumManifest.metadata, author } });
    assert.deepEqual(parsed.metadata.author, author);
  }
  assert.equal(reportManifestSchema.safeParse({
    ...minimumManifest, metadata: { ...minimumManifest.metadata, author: { name: "", handle: "@retained" } },
  }).success, false);
});

test("accepts up to three Word-defined topic pages", () => {
  const result = reportManifestSchema.safeParse({
    ...minimumManifest,
    metadata: {
      ...minimumManifest.metadata,
      topics: ["AI transformation", "Leadership", "Employee listening"],
    },
  });

  assert.equal(result.success, true);
});

test("rejects more than three topic pages", () => {
  const result = reportManifestSchema.safeParse({
    ...minimumManifest,
    metadata: {
      ...minimumManifest.metadata,
      topics: ["AI", "Leadership", "Listening", "Future of work"],
    },
  });

  assert.equal(result.success, false);
});

test("rejects a source without a valid SHA-256 hash", () => {
  const result = reportManifestSchema.safeParse({
    ...minimumManifest,
    source: {
      ...minimumManifest.source,
      sha256: "not-a-hash",
    },
  });

  assert.equal(result.success, false);
});

test("accepts an interactive listening maturity scorecard", () => {
  const result = reportManifestSchema.safeParse({
    ...minimumManifest,
    blocks: [
      ...minimumManifest.blocks,
      {
        id: "block-scorecard",
        type: "listening-maturity-scorecard",
        title: "How effectively does listening create impact?",
        intro:
          "Score four listening capabilities from foundational to leading.",
        categories: [
          {
            id: "inclusive",
            title: "Inclusive participation and access",
            criteria: ["Easy to provide feedback"],
          },
          {
            id: "action",
            title: "Action and accountability",
            criteria: ["Communicate what changed"],
          },
          {
            id: "strategic",
            title: "Strategic impact",
            criteria: ["Connect listening to outcomes"],
          },
          {
            id: "adaptive",
            title: "Adaptive intelligence",
            criteria: ["Identify emerging risks"],
          },
        ],
        source: {
          part: "word/document.xml",
          index: 1,
        },
      },
    ],
  });

  assert.equal(result.success, true);
});

test("accepts a three-metric percentage ring visual", () => {
  const result = reportManifestSchema.safeParse({
    ...minimumManifest,
    blocks: [
      ...minimumManifest.blocks,
      {
        id: "block-percentage-rings",
        type: "percentage-ring-group",
        title: "Employees adopted AI faster with role-based practice.",
        metrics: [
          {
            id: "metric-1",
            value: 73,
            description: "Practiced with a real task from their role.",
          },
          {
            id: "metric-2",
            value: 62,
            description: "Compared AI-assisted and human-only approaches.",
          },
          {
            id: "metric-3",
            value: 64,
            description: "Built judgment about when AI was useful.",
          },
        ],
        footnote: "Source: Glint Labs research",
        source: {
          part: "word/document.xml",
          index: 1,
        },
      },
    ],
  });

  assert.equal(result.success, true);
});

test("accepts a non-destructive Glint Labs image treatment", () => {
  const result = reportManifestSchema.safeParse({
    ...minimumManifest,
    blocks: [
      ...minimumManifest.blocks,
      {
        id: "brand-photo",
        type: "image",
        alt: "Two colleagues discussing research findings.",
        fileName: "approved-photo.jpg",
        dataUrl: "data:image/jpeg;base64,AA==",
        width: 1600,
        height: 900,
        assetSource: "brand-central",
        presentation: {
          style: "glint-labs",
          crop: "landscape",
          focalPointX: 64,
          focalPointY: 42,
        },
        source: {
          part: "studio",
          index: 1,
        },
      },
    ],
  });

  assert.equal(result.success, true);
});

test("rejects image focal points outside the visible image", () => {
  const result = reportManifestSchema.safeParse({
    ...minimumManifest,
    blocks: [
      ...minimumManifest.blocks,
      {
        id: "brand-photo",
        type: "image",
        alt: "Two colleagues discussing research findings.",
        fileName: "approved-photo.jpg",
        dataUrl: "data:image/jpeg;base64,AA==",
        width: 1600,
        height: 900,
        presentation: {
          style: "glint-labs",
          crop: "landscape",
          focalPointX: 101,
          focalPointY: 42,
        },
        source: {
          part: "studio",
          index: 1,
        },
      },
    ],
  });

  assert.equal(result.success, false);
});

test("accepts every canonical report component", () => {
  const blocks = canonicalVisualOptions.map((option, index) =>
    createCanonicalVisualBlock(option.kind, `canonical-${index}`, {
      part: "studio",
      index,
    }),
  );
  const result = reportManifestSchema.safeParse({
    ...minimumManifest,
    blocks: [...minimumManifest.blocks, ...blocks],
  });

  assert.equal(result.success, true);
});

test("accepts safe structured links and rejects invalid or overlapping ranges", () => {
  const linkedManifest = {
    ...minimumManifest,
    blocks: [
      ...minimumManifest.blocks,
      {
        id: "linked-paragraph",
        type: "paragraph",
        text: "Read the source",
        links: [{ start: 9, end: 15, href: "https://example.com/source" }],
        source: { part: "word/document.xml", index: 1 },
      },
    ],
  };
  assert.equal(reportManifestSchema.safeParse(linkedManifest).success, true);
  assert.equal(
    reportManifestSchema.safeParse({
      ...linkedManifest,
      blocks: [
        ...minimumManifest.blocks,
        {
          ...linkedManifest.blocks[1],
          links: [
            { start: 0, end: 8, href: "javascript:alert(1)" },
            { start: 4, end: 12, href: "https://example.com" },
          ],
        },
      ],
    }).success,
    false,
  );
});

test("V1 accepts data-bearing bitmap images with or without structured data", () => {
  const dataImage = {
    id: "data-image",
    type: "image",
    alt: "Heatmap comparing two listening measures.",
    fileName: "heatmap.png",
    dataUrl: "/assets/heatmap.png",
    width: 1200,
    height: 800,
    contentKind: "data-bearing",
    source: { part: "word/document.xml", index: 1 },
  };
  assert.equal(
    reportManifestSchema.safeParse({
      ...minimumManifest,
      blocks: [...minimumManifest.blocks, dataImage],
    }).success,
    true,
  );
  assert.equal(
    reportManifestSchema.safeParse({
      ...minimumManifest,
      blocks: [
        ...minimumManifest.blocks,
        {
          ...dataImage,
          accessibleData: {
            sourceKind: "verified-upload",
            title: "Listening heatmap values",
            unit: "percentage",
            columns: ["Measure", "Group A", "Group B"],
            rows: [
              {
                id: "row-1",
                cells: ["Intent to stay", "72%", "64%"],
              },
            ],
            sha256: "b".repeat(64),
          },
        },
      ],
    }).success,
    true,
  );
});

test("accepts safe destinations on canonical references", () => {
  const result = reportManifestSchema.safeParse({
    ...minimumManifest,
    blocks: [
      ...minimumManifest.blocks,
      {
        id: "references",
        type: "references",
        title: "References",
        references: [
          {
            id: "reference-1",
            title: "Primary study",
            href: "https://example.com/study",
          },
          {
            id: "reference-2",
            title: "Supporting study",
            href: "/reports/supporting-study",
          },
        ],
        source: { part: "word/document.xml", index: 2 },
      },
    ],
  });
  assert.equal(result.success, true);
});

test("rejects canonical chart percentages outside 0 to 100", () => {
  const block = createCanonicalVisualBlock(
    "horizontal-bar-chart",
    "invalid-chart",
    { part: "studio", index: 1 },
  );
  block.items[0].value = 101;

  const result = reportManifestSchema.safeParse({
    ...minimumManifest,
    blocks: [...minimumManifest.blocks, block],
  });

  assert.equal(result.success, false);
});

test("accepts current variable comparison categories without losing legacy four-category support", () => {
  const block = createCanonicalVisualBlock(
    "grouped-column-comparison",
    "invalid-comparison",
    { part: "studio", index: 1 },
  );

  for (const groups of [block.groups, block.groups.slice(0, 3)]) {
    assert.equal(reportManifestSchema.safeParse({
      ...minimumManifest, blocks: [...minimumManifest.blocks, { ...block, groups }],
    }).success, true);
  }
  assert.equal(reportManifestSchema.safeParse({
    ...minimumManifest, blocks: [...minimumManifest.blocks, { ...block, groups: [] }],
  }).success, false);
});
