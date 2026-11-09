import assert from "node:assert/strict";
import test from "node:test";

import { reportManifestSchema } from "../manifest/report-manifest.ts";
import { createApprovedContentRecord } from "../integrity/approved-content.ts";
import {
  BrowserProjectStorage,
  LocalProjectStorage,
} from "./project-storage.ts";
import { createStudioProject, hasStudioProjectChanges, parseStudioProject, publicationEditingFingerprint, studioEditingSnapshot, updateStudioProject } from "./studio-project.ts";
import { publicationMetadataSchema } from "./publication-preparation.ts";
import { publishedReportSummarySchema, reportLibrary } from "./report-library.ts";
import { estimateReportReadingTime } from "./report-reading-time.ts";
import { DEFAULT_STUDIO_REPORT_STYLE, reportStyleLabel, reportStyleOptions, selectableReportStyleOptions } from "../report-system/report-style.ts";
import { applyWordStyleMappings, wordStyleView } from "./word-style-mapping.ts";

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

test("approved Word mappings replace legacy customization on rendering, save and reopen without rewriting evidence", async () => {
  const source = reportManifestSchema.parse({
    ...manifest,
    blocks: [
      { id: "title", type: "paragraph", wordStyle: "Title", text: "Real Word title", source: { part: "word/document.xml", index: 0 } },
      { id: "author", type: "paragraph", wordStyle: "NoSpacing", text: "Author: Test author\nPublish date: May 12, 2026", source: { part: "word/document.xml", index: 1 } },
      { id: "brief", type: "paragraph", wordStyle: "Normal", text: "Research Drop in Brief:", source: { part: "word/document.xml", index: 2 } },
      { id: "bullet", type: "list-item", level: 0, wordStyle: "Normal", text: "Actual finding", source: { part: "word/document.xml", index: 3 } },
      { id: "section", type: "heading", level: 1, wordStyle: "Heading1", text: "Actual section", source: { part: "word/document.xml", index: 4 } },
      { id: "refs", type: "paragraph", wordStyle: "BookTitle", text: "References", source: { part: "word/document.xml", index: 5 } },
      { id: "legal", type: "paragraph", wordStyle: "Normal", text: "Unchanged legal text.", source: { part: "word/document.xml", index: 6 } },
    ],
    wordStyles: [
      { id: "Title", name: "Title", target: "report-title" }, { id: "NoSpacing", name: "No Spacing", target: "metadata" },
      { id: "Normal", name: "Normal", target: "body" }, { id: "Heading1", name: "Heading 1", target: "section-heading" },
      { id: "BookTitle", name: "Book Title", target: "references" },
    ],
  });
  const approved = await createApprovedContentRecord(source);
  const legacy = reportManifestSchema.parse({ ...source, metadata: { ...source.metadata, title: "Wrong customized title" },
    wordStyleMappings: { Normal: "metadata", Heading1: "subsection-heading", BookTitle: "report-title", "$research-brief": "keep" } });
  const view = wordStyleView(legacy);
  assert.equal(view.metadata.title, "Real Word title");
  assert.equal(view.metadata.publishedDate, "2026-05-12");
  assert.deepEqual(view.blocks.map(block => block.id), ["brief", "bullet", "section", "refs", "legal"]);
  assert.equal(view.blocks.find(block => block.id === "section")?.type, "heading");
  const section = view.blocks.find(block => block.id === "section");
  assert.ok(section?.type === "heading" && section.level === 2);
  assert.ok(view.blocks.find(block => block.id === "refs")?.type === "heading");
  const mapped = applyWordStyleMappings(legacy);
  assert.equal(mapped.wordStyleMappings, undefined);
  assert.deepEqual(mapped.blocks, source.blocks);
  assert.deepEqual(await createApprovedContentRecord(mapped), approved, "Presentation mapping is not a new source attestation.");
  const project = createStudioProject({ manifest: legacy, sourceManifest: source, approvedContent: approved,
    importedManifestSha256: "b".repeat(64), status: "draft" });
  const reopened = parseStudioProject(JSON.parse(JSON.stringify({ ...project, manifest: legacy })));
  assert.equal(project.manifest.wordStyleMappings, undefined);
  assert.equal(reopened.manifest.wordStyleMappings, undefined);
  assert.equal(reopened.manifest.metadata.title, "Real Word title");
  assert.deepEqual(reopened.sourceManifest, source);
  assert.deepEqual(reopened.approvedContent, approved);
  assert.equal(wordStyleView({ ...legacy, wordStyles: undefined }).metadata.title, "Real Word title");
});

test("No Spacing only consumes valid labeled front matter, not body paragraphs or impossible dates", () => {
  const source = reportManifestSchema.parse({
    ...manifest, wordStyles: [{ id: "NoSpacing", name: "No Spacing", target: "metadata" }],
    blocks: [
      { id: "date", type: "paragraph", wordStyle: "NoSpacing", text: "Publish date: February 30, 2026", source: { part: "word/document.xml", index: 0 } },
      { id: "body", type: "paragraph", wordStyle: "NoSpacing", text: "Regular body text.", source: { part: "word/document.xml", index: 1 } },
      { id: "late", type: "paragraph", wordStyle: "NoSpacing", text: "Author: A quoted label in the body", source: { part: "word/document.xml", index: 2 } },
    ],
  });
  const mapped = applyWordStyleMappings(source);
  assert.equal(mapped.metadata.publishedDate, undefined);
  assert.equal(mapped.metadata.author, undefined);
  assert.equal(wordStyleView(mapped).blocks.length, 3);
});

test("saved Date styles override stale dates anywhere without changing original source evidence", async () => {
  const source = reportManifestSchema.parse({
    ...manifest, metadata: { ...manifest.metadata, publishedDate: "2026-11-07" },
    wordStyles: [{ id: "Date", name: "Date", target: "keep" }],
    blocks: [...manifest.blocks,
      { id: "body", type: "paragraph", text: "Report content.", source: { part: "word/document.xml", index: 1 } },
      { id: "date", type: "paragraph", wordStyle: "Date", text: "Publish date: 11/11/25", source: { part: "word/document.xml", index: 2 } },
    ],
  });
  const approvedContent = await createApprovedContentRecord(source);
  const project = createStudioProject({ manifest: source, sourceManifest: source, approvedContent,
    importedManifestSha256: "b".repeat(64), status: "draft" });
  const reopened = parseStudioProject(JSON.parse(JSON.stringify(project)));
  assert.equal(reopened.manifest.metadata.publishedDate, "2025-11-11");
  assert.deepEqual(wordStyleView(reopened.manifest).blocks.map(block => block.id), ["block-1", "body"]);
  assert.deepEqual(reopened.manifest.blocks, source.blocks);
  assert.deepEqual(reopened.sourceManifest, source);
  assert.deepEqual(reopened.approvedContent, approvedContent);
  assert.deepEqual(await createApprovedContentRecord(reopened.manifest), approvedContent);
});

test("saved drafts retain the Word baseline separately from Studio edits", () => {
  const project = createStudioProject({
    importedManifestSha256: "b".repeat(64),
    manifest: { ...manifest, metadata: { ...manifest.metadata, title: "Studio title" } },
    status: "draft",
    ...{ sourceManifest: manifest },
  });
  const reopened = JSON.parse(JSON.stringify(parseStudioProject(project)));
  assert.deepEqual(reopened.sourceManifest, manifest);
  assert.equal(reopened.manifest.metadata.title, "Studio title");
});

test("the report library joins local drafts and live revisions by ID without treating ready or staged drafts as published", async () => {
  const project = createStudioProject({ importedManifestSha256: "b".repeat(64), manifest, status: "ready" });
  const draft = (await reportLibrary([project], []))[0];
  assert.equal(draft.publication, undefined);
  const live = {
    id: project.id, title: "Live title", slug: "live-report", revision: 1,
    packageFingerprint: "c".repeat(64), updatedAt: "2026-11-06T12:00:00.000Z",
    displayDate: "2026-02-01", eyebrow: "Research Drop",
  };
  const joined = await reportLibrary([project], [live]);
  assert.equal(joined.length, 1);
  assert.equal(joined[0].title, "Report");
  assert.equal(joined[0].publication?.title, "Live title");
  assert.equal(joined[0].comparisonUnknown, true);
  assert.equal(joined[0].unpublishedChanges, false, "Missing history must not fabricate a content difference.");
  assert.equal((await reportLibrary([], [live]))[0].publication?.id, project.id);
});

test("saving local edits after publication identifies unpublished changes without changing the live revision", async () => {
  const project = createStudioProject({ importedManifestSha256: "b".repeat(64), manifest, status: "ready" });
  const live = {
    id: project.id, title: "Report", slug: "live-report", revision: 1,
    packageFingerprint: "c".repeat(64), updatedAt: "2026-11-06T12:00:00.000Z",
    displayDate: "2026-02-01", eyebrow: "Research Drop",
  };
  project.websitePublication = {
    revision: 1, packageFingerprint: live.packageFingerprint,
    editingFingerprint: await publicationEditingFingerprint(project),
  };
  const saved = parseStudioProject(JSON.parse(JSON.stringify(project)));
  assert.equal((await reportLibrary([saved], [live]))[0].unpublishedChanges, false);
  const edited = structuredClone(saved);
  edited.manifest.blocks[0] = { ...edited.manifest.blocks[0], text: "Updated draft heading" } as typeof edited.manifest.blocks[0];
  assert.equal((await reportLibrary([edited], [live]))[0].unpublishedChanges, true);
  assert.equal(live.title, "Report");
  assert.equal(live.revision, 1);
  assert.equal(saved.manifest.blocks[0].type === "heading" && saved.manifest.blocks[0].text, "Report");
  assert.equal((await reportLibrary([edited], []))[0].publication, undefined, "Removing a live report leaves its editable draft.");
});

test("library cards show saved Card details and retain summaries for published-only reports", async () => {
  const project = createStudioProject({ importedManifestSha256: "b".repeat(64), manifest, status: "draft" });
  const prepared = publicationMetadataSchema.parse({
    slug: "library-card", title: "Prepared title", summary: "Prepared summary.",
    displayDate: "2026-02-01", eyebrow: "Research Drop",
    author: { name: "Test author" }, readTimeMinutes: 1, topics: [],
    thumbnail: { source: "/figma/illustrations/blue/report.png", alt: "Report illustration." },
    catalog: { featured: false, featuredUntil: null },
  });
  project.publicationPreparation = { metadata: prepared, imageReviews: [] };
  project.publicationMetadataDraft = {
    ...prepared, title: "Saved Card title", summary: "Saved Card summary.", displayDate: "2026-05-01",
  };
  const live = publishedReportSummarySchema.parse({
    id: project.id, title: "Published title", summary: "Published summary.", slug: "library-card",
    revision: 1, packageFingerprint: "c".repeat(64), updatedAt: "2026-11-06T12:00:00.000Z",
    displayDate: "2026-02-01", eyebrow: "Research Drop",
  });
  const [saved] = await reportLibrary([project], [live]);
  assert.equal(saved.title, "Saved Card title");
  assert.equal(saved.summary, "Saved Card summary.");
  assert.equal(saved.displayDate, "2026-05-01");
  assert.equal((await reportLibrary([], [live]))[0].summary, "Published summary.");
  delete project.publicationMetadataDraft;
  assert.equal((await reportLibrary([project], [live]))[0].summary, "Prepared summary.");
  delete project.publicationPreparation;
  assert.equal((await reportLibrary([project], [live]))[0].summary, "Published summary.");
  assert.equal((await reportLibrary([project], []))[0].summary, undefined);
  assert.equal(publishedReportSummarySchema.parse({ ...live, summary: undefined }).summary, undefined,
    "Older responses without summaries remain readable.");
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

test("incomplete listing-card drafts survive saving and reopening without changing the Word report", async () => {
  const saved = createStudioProject({ importedManifestSha256: "b".repeat(64), manifest, status: "draft" });
  const metadata = {
    slug: "card-address", title: "A separate card title", summary: "", eyebrow: "Research Drop",
    displayDate: "", author: { name: "Synthetic author" }, readTimeMinutes: 1, topics: [],
    thumbnail: { source: "", alt: "" }, catalog: { featured: false, featuredUntil: null },
  };
  const values = new Map<string, string>();
  const storage = new LocalProjectStorage({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  } as Storage);
  const changed = updateStudioProject(saved, {
    manifest, status: "draft", acceptedReviewItemIds: [], publicationMetadataDraft: metadata,
  });
  storage.save(changed);
  const reopened = storage.load(saved.id);
  assert.deepEqual(reopened.publicationMetadataDraft, metadata);
  assert.deepEqual(reopened.manifest, saved.manifest);
  assert.equal(reopened.publicationPreparation, undefined);
  assert.equal(publicationMetadataSchema.safeParse(reopened.publicationMetadataDraft).success, false);
  assert.equal(hasStudioProjectChanges(changed, saved), true);
  assert.equal(hasStudioProjectChanges(reopened, changed), false);
  assert.notEqual(await publicationEditingFingerprint(changed), await publicationEditingFingerprint(saved));
});

test("saving card settings does not change a published fingerprint until their content changes", async () => {
  const metadata = {
    slug: "report", title: "Report", summary: "A short report summary.", eyebrow: "Research Drop",
    displayDate: "2026-02-01", author: { name: "Synthetic author" }, readTimeMinutes: 1, topics: [],
    thumbnail: { source: "synthetic.png", alt: "Synthetic illustration" },
    catalog: { featured: false, featuredUntil: null },
  };
  const saved = createStudioProject({
    importedManifestSha256: "b".repeat(64), manifest, status: "ready",
    publicationPreparation: { metadata, imageReviews: [] },
  });
  const same = updateStudioProject(saved, {
    manifest, status: "ready", acceptedReviewItemIds: [], publicationMetadataDraft: metadata,
  });
  assert.equal(await publicationEditingFingerprint(same), await publicationEditingFingerprint(saved));
  const changed = updateStudioProject(same, {
    manifest, status: "ready", acceptedReviewItemIds: [],
    publicationMetadataDraft: { ...metadata, title: "An updated card title" },
  });
  assert.notEqual(await publicationEditingFingerprint(changed), await publicationEditingFingerprint(saved));
});

test("deleting a browser draft removes its legacy copy without resurrecting it or deleting another draft", async () => {
  const values = new Map<string, string>();
  const legacyStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  } as Storage;
  const legacy = new LocalProjectStorage(legacyStorage);
  const project = createStudioProject({ importedManifestSha256: "b".repeat(64), manifest, status: "draft" });
  const other = createStudioProject({ importedManifestSha256: "c".repeat(64), manifest, status: "draft" });
  legacy.save(project);
  legacy.save(other);
  const records = new Map<string, unknown>([[project.id, project]]);
  const projects = new BrowserProjectStorage(legacyStorage, {
    async list() { return [...records.values()]; },
    async load(id) { return records.get(id); },
    async save(value) { records.set(value.id, value); },
    async remove(id) { records.delete(id); },
    async saveIfAbsent(value) {
      if (!records.has(value.id)) records.set(value.id, value);
      return records.get(value.id);
    },
    async replaceIfUnchanged(value, expected) {
      if (JSON.stringify(records.get(value.id)) !== JSON.stringify(expected)) return false;
      records.set(value.id, value);
      return true;
    },
  });
  await projects.remove(project.id);
  assert.deepEqual((await projects.list()).map(value => value.id), [other.id]);
  await assert.rejects(projects.load(project.id), /could not be found/);
  assert.equal((await projects.load(other.id)).id, other.id);
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
    async remove(id) {
      records.delete(id);
    },
    async saveIfAbsent(value) {
      if (!records.has(value.id)) records.set(value.id, value);
      return records.get(value.id);
    },
    async replaceIfUnchanged(value, expected) {
      if (JSON.stringify(records.get(value.id)) !== JSON.stringify(expected)) return false;
      records.set(value.id, value);
      return true;
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
  const downloaded = structuredClone(project);
  downloaded.manifest.metadata.title = "Downloaded server copy";
  assert.equal((await projects.restore(downloaded)).manifest.metadata.title, "Report");
  assert.equal((await projects.load(project.id)).manifest.metadata.title, "Report");
  const previous = await projects.load(project.id);
  assert.equal(await projects.replaceIfUnchanged(downloaded, previous), true);
  assert.equal((await projects.load(project.id)).manifest.metadata.title, "Downloaded server copy");
  assert.equal(await projects.replaceIfUnchanged(previous, previous), false, "A stale snapshot cannot overwrite the replacement");
  assert.equal((await projects.load(project.id)).manifest.metadata.title, "Downloaded server copy");
  await projects.remove(project.id);
  assert.equal(await projects.replaceIfUnchanged(previous, downloaded), false, "A removed draft is not recreated by a stale replacement");
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
