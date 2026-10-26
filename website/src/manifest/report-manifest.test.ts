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

test("requires the Figma-defined number of fixed comparison items", () => {
  const block = createCanonicalVisualBlock(
    "grouped-column-comparison",
    "invalid-comparison",
    { part: "studio", index: 1 },
  );

  const result = reportManifestSchema.safeParse({
    ...minimumManifest,
    blocks: [
      ...minimumManifest.blocks,
      { ...block, groups: block.groups.slice(0, 3) },
    ],
  });

  assert.equal(result.success, false);
});
