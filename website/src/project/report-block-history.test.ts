import assert from "node:assert/strict";
import test from "node:test";

import { reportManifestSchema } from "../manifest/report-manifest.ts";
import {
  removeReportBlock,
  restoreReportBlock,
} from "./report-block-history.ts";

const manifest = reportManifestSchema.parse({
  schemaVersion: "0.1.0",
  source: {
    fileName: "report.docx",
    sizeBytes: 100,
    sha256: "a".repeat(64),
  },
  metadata: {
    title: "Report",
    status: "draft",
  },
  blocks: [
    {
      id: "heading",
      type: "heading",
      level: 1,
      text: "Report",
      source: { part: "word/document.xml", index: 0 },
    },
    {
      id: "paragraph",
      type: "paragraph",
      text: "Editable report text.",
      source: { part: "word/document.xml", index: 1 },
    },
    {
      id: "section",
      type: "heading",
      level: 2,
      text: "Section",
      source: { part: "word/document.xml", index: 2 },
    },
  ],
  reviewItems: [
    {
      id: "review-paragraph",
      severity: "warning",
      message: "Review this paragraph.",
      blockId: "paragraph",
    },
  ],
  extraction: {
    paragraphCount: 3,
    imageCount: 0,
    unsupportedCount: 0,
  },
});

test("removes a block and its associated review items", () => {
  const result = removeReportBlock(manifest, "paragraph");

  assert.deepEqual(
    result.manifest.blocks.map((block) => block.id),
    ["heading", "section"],
  );
  assert.deepEqual(result.manifest.reviewItems, []);
  assert.equal(result.removed?.index, 1);
  assert.equal(result.removed?.reviewItems[0].id, "review-paragraph");
});

test("restores a removed block at its original position", () => {
  const result = removeReportBlock(manifest, "paragraph");
  assert.ok(result.removed);

  const restored = restoreReportBlock(result.manifest, result.removed);

  assert.deepEqual(
    restored.blocks.map((block) => block.id),
    ["heading", "paragraph", "section"],
  );
  assert.equal(restored.reviewItems[0].id, "review-paragraph");
});
