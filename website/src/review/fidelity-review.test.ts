import assert from "node:assert/strict";
import test from "node:test";

import type {
  ReportBlock,
  ReviewItem,
} from "../manifest/report-manifest.ts";
import {
  activeAcceptedReviewItemIds,
  resolveReviewItemsForBlock,
} from "./fidelity-review.ts";

const source = {
  part: "word/document.xml",
  index: 1,
};

test("resolves an image-description warning when the author adds alt text", () => {
  const warning: ReviewItem = {
    id: "review-image",
    code: "missing-image-description",
    severity: "warning",
    message: "Image does not have a description.",
    blockId: "image-1",
    source,
  };
  const image: ReportBlock = {
    id: "image-1",
    type: "image",
    alt: "A line chart showing an increase over time.",
    fileName: "chart.png",
    dataUrl: "data:image/png;base64,AA==",
    width: 100,
    height: 100,
    source,
  };

  assert.deepEqual(resolveReviewItemsForBlock([warning], image), []);
});

test("keeps extraction fidelity warnings after an author edits text", () => {
  const warning: ReviewItem = {
    id: "review-style",
    code: "style-flattened",
    severity: "warning",
    message: 'Paragraph style "Quote" was rendered as body text.',
    blockId: "paragraph-1",
    source,
  };
  const paragraph: ReportBlock = {
    id: "paragraph-1",
    type: "paragraph",
    text: "Edited text",
    source,
  };

  assert.deepEqual(resolveReviewItemsForBlock([warning], paragraph), [warning]);
});

test("drops accepted issue ids that are no longer active", () => {
  const warning: ReviewItem = {
    id: "review-active",
    severity: "warning",
    message: "Needs review.",
  };

  assert.deepEqual(
    activeAcceptedReviewItemIds(
      [warning],
      ["review-resolved", "review-active"],
    ),
    ["review-active"],
  );
});

test("resolves a bitmap blocker after verified structured data replaces it", () => {
  const blocker: ReviewItem = {
    id: "review-bitmap",
    code: "bitmap-visual-needs-data",
    severity: "blocker",
    message: "Structured data required.",
    blockId: "bitmap",
  };
  const block: ReportBlock = {
    id: "bitmap",
    type: "data-visual-source",
    data: {
      sourceKind: "bitmap-ocr",
      title: "Verified data",
      unit: "percentage",
      columns: ["Category", "Percent"],
      rows: [
        { id: "one", cells: ["Trust", "73%"] },
        { id: "two", cells: ["Readiness", "62%"] },
      ],
      sha256: "a".repeat(64),
      evidenceImage: {
        fileName: "chart.png",
        dataUrl: "data:image/png;base64,AA==",
        width: 800,
        height: 450,
        sourceAssetSha256: "b".repeat(64),
      },
    },
    source: { part: "word/document.xml", index: 4 },
  };

  assert.deepEqual(resolveReviewItemsForBlock([blocker], block), []);
});
