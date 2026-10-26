import assert from "node:assert/strict";
import test from "node:test";

import { reportManifestSchema } from "../manifest/report-manifest.ts";
import { createApprovedContentRecord } from "../integrity/approved-content.ts";
import {
  BrowserProjectStorage,
  LocalProjectStorage,
} from "./project-storage.ts";
import { createStudioProject, hasStudioProjectChanges, parseStudioProject, studioEditingSnapshot } from "./studio-project.ts";
import { estimateReportReadingTime } from "./report-reading-time.ts";
import { DEFAULT_STUDIO_REPORT_STYLE, reportStyleLabel, reportStyleOptions, selectableReportStyleOptions } from "../report-system/report-style.ts";

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
      id: "block-1",
      type: "heading",
      level: 1,
      text: "Report",
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
});

test("reading time uses 200 words per minute, rounds up and never shows zero", () => {
  for (const [count, minutes] of [[0, 1], [1, 1], [199, 1], [200, 1], [201, 2], [400, 2], [401, 3]]) {
    const blocks = count === 0 ? [] : [{
      id: "text", type: "paragraph" as const, text: "word ".repeat(count),
      source: { part: "word/document.xml", index: 0 },
    }];
    assert.equal(estimateReportReadingTime({ blocks }), minutes);
  }
  assert.equal(estimateReportReadingTime({ blocks: [{
    id: "text", type: "paragraph", text: "— … ! ? ".repeat(300),
    source: { part: "word/document.xml", index: 0 },
  }] }), 1);
});

test("reading time includes readable component and chart text without inspecting image bytes or duplicate evidence", () => {
  const source = { part: "word/document.xml", index: 0 };
  const image = {
    id: "image", type: "image" as const, alt: "hidden ".repeat(1000), fileName: "ignored ".repeat(1000),
    width: 1, height: 1, dataUrl: "data:image/png;base64,AA==", source,
  };
  Object.defineProperty(image, "dataUrl", { get() { throw new Error("Reading time must not inspect image payloads."); } });
  assert.equal(estimateReportReadingTime({ blocks: [image] }), 1);
  assert.equal(estimateReportReadingTime({ blocks: [{
    id: "callout", type: "data-callout", variant: "detailed", paragraphs: ["word ".repeat(201)], source,
  }] }), 2);
  assert.equal(estimateReportReadingTime({ blocks: [{
    id: "data", type: "data-visual-source", source, data: {
      sourceKind: "word-table", title: "Values", unit: "number", columns: ["Label", "Value"],
      rows: [{ id: "ignored ".repeat(1000), cells: ["word ".repeat(201), "10"] }], sha256: "a".repeat(64),
    },
  }] }), 2);
  assert.equal(estimateReportReadingTime({ blocks: [{
    id: "chart", type: "horizontal-bar-chart", source, title: "Values",
    items: [{ id: "one", label: "First", value: 10 }, { id: "two", label: "Second", value: 20 }],
    legend: "Favorability", sourceNote: "Source", verifiedSource: {
      sourceKind: "word-table", title: "duplicate ".repeat(1000), unit: "percentage",
      columns: ["Label", "Value"], rows: [{ id: "one", cells: ["First", "10"] }], sha256: "a".repeat(64),
      verifiedAt: "2026-10-23T12:00:00.000Z",
    },
  }] }), 1);
});

test("creates and parses a versioned Studio project", () => {
  const project = createStudioProject({
    id: "9cf5d7ad-2329-4ec4-a43f-03bf0f47cfce",
    importedManifestSha256: "b".repeat(64),
    manifest,
    status: "draft",
  });

  test("editing snapshots track content, style and active review decisions, including reverts", () => {
    const project = createStudioProject({
      importedManifestSha256: "b".repeat(64),
      manifest: reportManifestSchema.parse({
        ...manifest,
        reviewItems: [
          { id: "review-1", severity: "warning", message: "Check the layout.", blockId: "block-1" },
          { id: "review-2", severity: "warning", message: "Check spacing.", blockId: "block-1" },
        ],
      }),
      status: "draft",
    });
    const baseline = studioEditingSnapshot(project);
    assert.notEqual(studioEditingSnapshot({ ...project, reportStyle: "new-fluent-colors" }), baseline);
    assert.notEqual(studioEditingSnapshot({
      ...project, manifest: { ...project.manifest, metadata: { ...project.manifest.metadata, title: "Changed" } },
    }), baseline);
    assert.notEqual(studioEditingSnapshot({ ...project, acceptedReviewItemIds: ["review-1"] }), baseline);
    assert.equal(studioEditingSnapshot({ ...project, acceptedReviewItemIds: ["removed-review"] }), baseline);
    assert.equal(
      studioEditingSnapshot({ ...project, acceptedReviewItemIds: ["review-1", "review-2"] }),
      studioEditingSnapshot({ ...project, acceptedReviewItemIds: ["review-2", "review-1"] }),
    );
    assert.equal(studioEditingSnapshot(parseStudioProject({ ...project, updatedAt: new Date().toISOString(), status: "ready" })), baseline);
    assert.equal(studioEditingSnapshot({ ...project, reportStyle: "research-report" }), baseline);
  });

  assert.equal(parseStudioProject(project).schemaVersion, "2");
  assert.equal(parseStudioProject(project).reportStyle, "research-report");
});

for (const { id, label } of reportStyleOptions) {
  test(`persists the selected style: ${label}`, () => {
    const project = createStudioProject({
      id: "9cf5d7ad-2329-4ec4-a43f-03bf0f47cfce",
      importedManifestSha256: "b".repeat(64),
      manifest,
      reportStyle: id,
      status: "draft",
    });

    assert.equal(parseStudioProject(JSON.parse(JSON.stringify(project))).reportStyle, id);
    assert.equal(reportStyleLabel(id), label);
  });
}

test("lightweight dirty tracking matches editing snapshots and recognizes exact reverts", () => {
  const saved = createStudioProject({
    importedManifestSha256: "b".repeat(64),
    manifest: reportManifestSchema.parse({
      ...manifest,
      reviewItems: [
        { id: "review-1", severity: "warning", message: "Check layout." },
        { id: "review-2", severity: "warning", message: "Check spacing." },
      ],
    }),
    acceptedReviewItemIds: ["review-1", "review-2"],
    status: "draft",
  });
  const variants = [
    saved,
    parseStudioProject(JSON.parse(JSON.stringify(saved))),
    { ...saved, acceptedReviewItemIds: ["review-2", "review-1", "removed-review"] },
    { ...saved, reportStyle: "new-fluent-colors" as const },
    { ...saved, acceptedReviewItemIds: [] },
    { ...saved, manifest: { ...saved.manifest, metadata: { ...saved.manifest.metadata, title: "Changed" } } },
    { ...saved, manifest: { ...saved.manifest, metadata: { status: saved.manifest.metadata.status, title: saved.manifest.metadata.title, author: undefined } } },
    { ...saved, manifest: { ...saved.manifest, blocks: [] } },
  ];
  for (const current of variants) {
    assert.equal(
      hasStudioProjectChanges(current, saved),
      studioEditingSnapshot(current) !== studioEditingSnapshot(saved),
    );
  }
  assert.equal(hasStudioProjectChanges(saved), true);
  assert.equal(hasStudioProjectChanges(saved, saved), false);
});

test("dirty tracking compares embedded image bytes without serialization or trusting an unchanged asset hash", (t) => {
  const saved = createStudioProject({
    importedManifestSha256: "b".repeat(64),
    manifest: reportManifestSchema.parse({
      ...manifest,
      blocks: [{
        id: "image-1", type: "image", alt: "Synthetic image", fileName: "image.png",
        dataUrl: `data:image/png;base64,${"A".repeat(1024 * 1024)}`,
        sourceAssetSha256: "c".repeat(64), width: 1, height: 1,
        source: { part: "word/document.xml", index: 0 },
      }],
    }),
    status: "draft",
  });
  const original = saved.manifest.blocks[0];
  assert.equal(original.type, "image");
  if (original.type !== "image") throw new Error("Expected image fixture.");
  const changed = (block: typeof original) => ({
    ...saved, manifest: { ...saved.manifest, blocks: [block] },
  });
  t.mock.method(JSON, "stringify", () => { throw new Error("Dirty tracking must not serialize image data."); });
  assert.equal(hasStudioProjectChanges({ ...saved, manifest: { ...saved.manifest } }, saved), false);
  assert.equal(hasStudioProjectChanges(changed({ ...original }), saved), false);
  assert.equal(hasStudioProjectChanges(changed({ ...original, alt: "Changed" }), saved), true);
  assert.equal(hasStudioProjectChanges(changed({
    ...original, dataUrl: original.dataUrl.slice(0, -1) + "B",
  }), saved), true);
  assert.equal(hasStudioProjectChanges(changed(original), saved), false);
});

test("dirty tracking preserves legacy image reviews, exact chart values and ordered source blocks", () => {
  const saved = createStudioProject({
    importedManifestSha256: "b".repeat(64), manifest, status: "draft",
    imageReviews: [{
      blockId: "image-1", assetSha256: "c".repeat(64), alt: "Chart",
      description: "Source values", accessibleData: {
        sourceKind: "verified-upload", title: "Coefficients", unit: "number",
        columns: ["Factor", "Value"], rows: [{ id: "one", cells: ["Trust", "-0.12"] }], sha256: "d".repeat(64),
      },
    }],
  });
  const [review] = saved.imageReviews ?? [];
  assert.ok(review?.accessibleData);
  const data = review.accessibleData;
  assert.equal(hasStudioProjectChanges({ ...saved, imageReviews: [{
    ...review, accessibleData: { ...data, rows: [{ id: "one", cells: ["Trust", "-0.13"] }] },
  }] }, saved), true);
  assert.equal(hasStudioProjectChanges({
    ...saved, imageReviews: undefined,
    publicationPreparation: {
      metadata: {
        slug: "synthetic-report", title: "Synthetic report", summary: "Synthetic catalog summary.",
        eyebrow: "", displayDate: "2026-10-22", author: { name: "Synthetic author" },
        readTimeMinutes: 1, topics: [], thumbnail: { source: "synthetic.png", alt: "Synthetic illustration" },
        catalog: { featured: false, featuredUntil: null },
      },
      imageReviews: [review],
    },
  }, saved), false);
  const second = { ...manifest.blocks[0], id: "second" };
  const ordered = { ...saved, manifest: { ...manifest, blocks: [manifest.blocks[0], second] } };
  assert.equal(hasStudioProjectChanges({
    ...ordered, manifest: { ...ordered.manifest, blocks: [second, manifest.blocks[0]] },
  }, ordered), true);
});

test("offers only New Fluent Colors for new reports without removing saved legacy styles", () => {
  assert.equal(DEFAULT_STUDIO_REPORT_STYLE, "new-fluent-colors");
  assert.deepEqual(selectableReportStyleOptions.map((option) => option.id), ["new-fluent-colors"]);
  assert.deepEqual(reportStyleOptions.map((option) => option.id), ["research-report", "annual-report-2026", "new-fluent-colors"]);
  for (const reportStyle of ["research-report", "annual-report-2026"] as const) {
    const project = createStudioProject({
      importedManifestSha256: "b".repeat(64),
      manifest,
      reportStyle,
      status: "draft",
    });
    assert.equal(parseStudioProject(project).reportStyle, reportStyle);
  }
});

test("preserves saved bitmap-derived chart data and source evidence without an OCR feature", () => {
  const legacyManifest = reportManifestSchema.parse({
    ...manifest,
    blocks: [{
      id: "legacy-chart",
      type: "data-visual-source",
      data: {
        sourceKind: "bitmap-ocr",
        title: "Previously verified chart",
        unit: "percentage",
        columns: ["Category", "Percent"],
        rows: [
          { id: "one", cells: ["Trust", "73%"] },
          { id: "two", cells: ["Readiness", "62%"] },
        ],
        sha256: "c".repeat(64),
        evidenceImage: {
          fileName: "legacy-chart.png",
          dataUrl: "data:image/png;base64,AA==",
          width: 640,
          height: 480,
          sourceAssetSha256: "d".repeat(64),
        },
      },
      provenance: { kind: "derived", sourceBlockId: "legacy-image" },
      source: { part: "word/document.xml", index: 1 },
    }],
  });
  const project = createStudioProject({
    importedManifestSha256: "b".repeat(64),
    manifest: legacyManifest,
    status: "draft",
  });
  assert.deepEqual(
    parseStudioProject(JSON.parse(JSON.stringify(project))).manifest.blocks,
    legacyManifest.blocks,
  );
});

test("rejects an unsupported Studio project version", () => {
  assert.throws(
    () => parseStudioProject({ schemaVersion: "99" }),
    /version "99" is not supported/,
  );
});

test("preserves acknowledged review items in a saved project", () => {
  const project = createStudioProject({
    id: "9cf5d7ad-2329-4ec4-a43f-03bf0f47cfce",
    importedManifestSha256: "b".repeat(64),
    manifest,
    status: "draft",
    acceptedReviewItemIds: ["review-1"],
  });

  assert.deepEqual(parseStudioProject(project).acceptedReviewItemIds, [
    "review-1",
  ]);
});

test("loads version 1 projects created before acknowledgements were added", () => {
  const project = createStudioProject({
    id: "9cf5d7ad-2329-4ec4-a43f-03bf0f47cfce",
    importedManifestSha256: "b".repeat(64),
    manifest,
    status: "draft",
  });
  const legacyProject: Record<string, unknown> = {
    ...project,
    schemaVersion: "1",
    status: "ready",
  };
  delete legacyProject.approvedContent;
  delete legacyProject.sourceApproval;
  delete legacyProject.publishReceipts;
  delete legacyProject.acceptedReviewItemIds;

  const migrated = parseStudioProject(legacyProject);
  assert.equal(migrated.schemaVersion, "2");
  assert.equal(migrated.status, "draft");
  assert.equal(migrated.approvedContent, undefined);
  assert.deepEqual(migrated.acceptedReviewItemIds, []);
});

test("saves, lists, and reopens a Studio project through the storage interface", () => {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
  const projects = new LocalProjectStorage(storage);
  const project = createStudioProject({
    id: "9cf5d7ad-2329-4ec4-a43f-03bf0f47cfce",
    importedManifestSha256: "b".repeat(64),
    manifest,
    status: "ready",
  });

  projects.save(project);

  assert.equal(projects.list()[0].id, project.id);
  assert.equal(projects.load(project.id).status, "ready");
});

test("stores browser projects outside localStorage", async () => {
  const records = new Map<string, unknown>();
  const legacyStorage: Storage = {
    get length() {
      return 0;
    },
    clear() {},
    getItem() {
      return null;
    },
    key() {
      return null;
    },
    removeItem() {},
    setItem() {
      throw new Error("BrowserProjectStorage must not write to localStorage.");
    },
  };
  const projects = new BrowserProjectStorage(legacyStorage, {
    async list() {
      return [...records.values()];
    },
    async load(id) {
      return records.get(id);
    },
    async save(project) {
      records.set(project.id, project);
    },
  });
  const project = createStudioProject({
    id: "9cf5d7ad-2329-4ec4-a43f-03bf0f47cfce",
    importedManifestSha256: "b".repeat(64),
    manifest,
    status: "ready",
  });

  await projects.save(project);

  assert.equal((await projects.list())[0].id, project.id);
  assert.equal((await projects.load(project.id)).status, "ready");
});

test("persists source attestation, approved snapshot, and publish receipts", async () => {
  const approvedContent = await createApprovedContentRecord(manifest);
  const project = createStudioProject({
    id: "9cf5d7ad-2329-4ec4-a43f-03bf0f47cfce",
    approvedContent,
    importedManifestSha256: "b".repeat(64),
    manifest,
    sourceApproval: {
      confirmedAt: "2026-09-17T20:00:00.000Z",
      statementVersion: "1",
    },
    status: "ready",
    publishReceipts: [
      {
        approvedContentSha256: approvedContent.sha256,
        fileName: "report.html",
        publishedAt: "2026-09-17T20:05:00.000Z",
        sourceSha256: manifest.source.sha256,
      },
    ],
  });
  const parsed = parseStudioProject(project);

  assert.equal(parsed.approvedContent?.sha256, approvedContent.sha256);
  assert.equal(parsed.sourceApproval?.statementVersion, "1");
  assert.equal(parsed.publishReceipts[0].fileName, "report.html");
});
