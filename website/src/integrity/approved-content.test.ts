import assert from "node:assert/strict";
import test from "node:test";

import { reportManifestSchema } from "../manifest/report-manifest.ts";
import { createDataVisualPreview } from "../visualization/data-visual-preview.ts";
import { createVerifiedDataVisual } from "../visualization/verified-data-visual.ts";
import {
  createApprovedContentRecord,
  evaluateApprovedContentIntegrity,
} from "./approved-content.ts";

const manifest = reportManifestSchema.parse({
  schemaVersion: "0.1.0",
  source: {
    fileName: "approved.docx",
    sizeBytes: 100,
    sha256: "a".repeat(64),
  },
  metadata: {
    title: "Approved report",
    status: "draft",
  },
  blocks: [
    {
      id: "heading",
      type: "heading",
      level: 1,
      text: "Approved report",
      source: { part: "word/document.xml", index: 0 },
    },
    {
      id: "image",
      type: "image",
      alt: "",
      fileName: "chart.png",
      dataUrl: "data:image/png;base64,AA==",
      sourceAssetSha256: "b".repeat(64),
      width: 800,
      height: 450,
      source: { part: "word/document.xml", index: 1 },
    },
  ],
  reviewItems: [],
  extraction: {
    paragraphCount: 1,
    imageCount: 1,
    unsupportedCount: 0,
  },
});

test("keeps presentation and accessibility changes outside approved semantics", async () => {
  const approvedContent = await createApprovedContentRecord(manifest);
  const changed = {
    ...manifest,
    blocks: manifest.blocks.map((block) =>
      block.type === "image"
        ? {
            ...block,
            alt: "Accessible description",
            presentation: {
              style: "glint-labs" as const,
              crop: "landscape" as const,
              focalPointX: 40,
              focalPointY: 60,
            },
          }
        : block,
    ),
  };

  assert.equal(
    evaluateApprovedContentIntegrity(changed, approvedContent).status,
    "intact",
  );
});

test("detects approved text drift", async () => {
  const approvedContent = await createApprovedContentRecord(manifest);
  const changed = {
    ...manifest,
    blocks: manifest.blocks.map((block) =>
      block.type === "heading" ? { ...block, text: "Changed report" } : block,
    ),
  };

  assert.equal(
    evaluateApprovedContentIntegrity(changed, approvedContent).status,
    "review-required",
  );
});

test("detects approved report hero drift", async () => {
  const heroManifest = reportManifestSchema.parse({
    ...manifest,
    blocks: manifest.blocks.map((block) =>
      block.type === "image"
        ? {
            ...block,
            placement: "hero",
            eyebrow: "Research Drop",
          }
        : block,
    ),
  });
  const approvedContent = await createApprovedContentRecord(heroManifest);
  const changed = {
    ...heroManifest,
    blocks: heroManifest.blocks.map((block) =>
      block.type === "image"
        ? { ...block, eyebrow: "Changed category" }
        : block,
    ),
  };

  assert.equal(
    evaluateApprovedContentIntegrity(changed, approvedContent).status,
    "review-required",
  );
});

test("fails closed without an approved source snapshot", () => {
  assert.equal(
    evaluateApprovedContentIntegrity(manifest, undefined).status,
    "unverified",
  );
});

test("automatically verifies deterministic guided data visuals", async () => {
  const dataManifest = reportManifestSchema.parse({
    ...manifest,
    blocks: [
      {
        id: "manager-optimism",
        type: "data-visual-source",
        data: {
          sourceKind: "word-table",
          title: "Manager optimism",
          unit: "percentage",
          columns: ["Measure", "Percent favorable"],
          rows: [
            { id: "row-1", cells: ["Competitive advantage", "73%"] },
            { id: "row-2", cells: ["Advocate for AI agents", "62%"] },
            { id: "row-3", cells: ["Achieve new goals", "64%"] },
          ],
          sha256: "c".repeat(64),
          recommendedVisualType: "percentage-ring-group",
        },
        provenance: { kind: "imported" },
        source: { part: "word/document.xml", index: 1 },
      },
    ],
    extraction: {
      paragraphCount: 0,
      imageCount: 0,
      unsupportedCount: 0,
    },
  });
  const approvedContent = await createApprovedContentRecord(dataManifest);
  const source = dataManifest.blocks[0];
  assert.equal(source.type, "data-visual-source");
  if (source.type !== "data-visual-source") {
    return;
  }

  assert.equal(
    evaluateApprovedContentIntegrity(dataManifest, approvedContent).status,
    "intact",
  );

  const previewManifest = {
    ...dataManifest,
    blocks: [createDataVisualPreview(source, "percentage-ring-group")],
  };
  assert.equal(
    evaluateApprovedContentIntegrity(previewManifest, approvedContent).status,
    "review-required",
  );

  const verifiedManifest = {
    ...dataManifest,
    blocks: [
      createVerifiedDataVisual(
        source,
        "percentage-ring-group",
        new Date().toISOString(),
      ),
    ],
  };
  assert.equal(
    evaluateApprovedContentIntegrity(verifiedManifest, approvedContent).status,
    "intact",
  );
});

test("requires review for OCR-derived data visuals", async () => {
  const dataManifest = reportManifestSchema.parse({
    ...manifest,
    blocks: [
      {
        id: "ocr-chart",
        type: "data-visual-source",
        data: {
          sourceKind: "bitmap-ocr",
          title: "OCR chart",
          unit: "percentage",
          columns: ["Measure", "Percent favorable"],
          rows: [
            { id: "row-1", cells: ["Competitive advantage", "73%"] },
            { id: "row-2", cells: ["Advocate for AI agents", "62%"] },
            { id: "row-3", cells: ["Achieve new goals", "64%"] },
          ],
          sha256: "d".repeat(64),
          recommendedVisualType: "percentage-ring-group",
        },
        provenance: { kind: "imported" },
        source: { part: "word/document.xml", index: 1 },
      },
    ],
    extraction: {
      paragraphCount: 0,
      imageCount: 0,
      unsupportedCount: 0,
    },
  });
  const approvedContent = await createApprovedContentRecord(dataManifest);

  assert.deepEqual(
    evaluateApprovedContentIntegrity(dataManifest, approvedContent),
    {
      status: "review-required",
      reason: "data-verification-required",
      message:
        "Review the flagged structured data before publishing its coded visual.",
    },
  );
});
