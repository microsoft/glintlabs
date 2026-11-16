import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import JSZip from "jszip";

import { extractDocx } from "../extraction/extract-docx.ts";
import { canonicalJson, createApprovedContentRecord, evaluateApprovedContentIntegrity } from "../integrity/approved-content.ts";
import { reportManifestSchema, type ReportManifest } from "../manifest/report-manifest.ts";
import {
  draftPublicationSchema,
  preparePublicationPackage,
  publicationReadiness,
  validateDraftPublicationPackage,
} from "./publication-package.ts";
import type { PublicationImageReview } from "./publication-preparation.ts";
import {
  createStudioProject, parseStudioProject, studioEditingSnapshot, studioImageReviews, updateStudioProject,
} from "./studio-project.ts";

const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6fcAAAAASUVORK5CYII=", "base64");
const assetHash = createHash("sha256").update(bytes).digest("hex");
const source = `data:image/png;base64,${bytes.toString("base64")}`;
const metadata = {
  slug: "synthetic-package-test",
  title: "Synthetic package test",
  summary: "Synthetic content for package integration tests, not a release report.",
  eyebrow: "Test fixture",
  displayDate: "2026-05-12",
  author: { name: "Test author", handle: "@test" },
  readTimeMinutes: 2,
  topics: ["Testing"],
  thumbnail: { source, alt: "Synthetic one-pixel test image", altConfirmed: true },
  catalog: { featured: false, featuredUntil: null },
};
const imageReviews: PublicationImageReview[] = [{
  blockId: "image-1",
  assetSha256: assetHash,
  alt: "Synthetic one-pixel test image",
  kind: "non-data",
}];

function fixtureManifest(): ReportManifest {
  return reportManifestSchema.parse({
    schemaVersion: "0.1.0",
    source: { fileName: "synthetic.docx", sizeBytes: 100, sha256: "a".repeat(64) },
    metadata: { title: metadata.title, status: "draft" },
    blocks: [
      { id: "heading-1", type: "heading", level: 1, text: metadata.title, source: { part: "word/document.xml", index: 0 } },
      {
        id: "image-1",
        type: "image",
        dataUrl: source,
        alt: imageReviews[0].alt,
        fileName: "synthetic.png",
        sourceAssetSha256: assetHash,
        width: 1,
        height: 1,
        contentKind: "non-data",
        placement: "hero",
        eyebrow: "Test fixture",
        source: { part: "word/document.xml", index: 1 },
      },
      { id: "text-1", type: "paragraph", text: "Exact source words and order.", source: { part: "word/document.xml", index: 2 } },
    ],
    reviewItems: [],
    extraction: { paragraphCount: 2, imageCount: 1, unsupportedCount: 0 },
  });
}

async function fixtureProject(manifest = fixtureManifest()) {
  return createStudioProject({
    id: "861a178c-bb41-4df2-8c5e-5aff2f1d1b35",
    importedManifestSha256: "b".repeat(64),
    approvedContent: await createApprovedContentRecord(manifest),
    publicationSourceEvidence: { sourceSha256: manifest.source.sha256, hyperlinkCount: 0 },
    manifest,
    status: "draft",
  });
}

test("Studio saves descriptions and optional CSV before publication details exist without changing approved source data", async () => {
  const original = await fixtureProject();
  const accessibleData = {
    sourceKind: "verified-upload" as const, title: "Source values", unit: "number" as const,
    columns: ["Factor", "Coefficient"], rows: [{ id: "one", cells: ["Trust", "-0.12"] }], sha256: "c".repeat(64),
  };
  const reviews = [{ ...imageReviews[0], description: "Trust has a coefficient of -0.12.", kind: "data-bearing" as const, accessibleData }];
  const project = parseStudioProject(JSON.parse(JSON.stringify(updateStudioProject(original, {
    manifest: original.manifest, status: original.status,
    acceptedReviewItemIds: original.acceptedReviewItemIds, imageReviews: reviews,
  }))));
  assert.equal(project.publicationPreparation, undefined);
  assert.deepEqual(studioImageReviews(project), reviews);
  assert.notEqual(studioEditingSnapshot(project), studioEditingSnapshot(original));
  assert.deepEqual(project.manifest, original.manifest);
  assert.equal(canonicalJson(project.approvedContent), canonicalJson(original.approvedContent));
  assert.equal(evaluateApprovedContentIntegrity(project.manifest, project.approvedContent).status, "intact");
  const result = await preparePublicationPackage({ project, metadata, imageReviews: studioImageReviews(project) });
  const image = result.manifest.blocks.find(block => block.type === "image");
  assert.equal(image?.alt, reviews[0].description);
  assert.deepEqual(image?.accessibleData, accessibleData);
  assert.equal((await validateDraftPublicationPackage(result.zipBytes)).publication.reportId, project.id);
});

test("legacy publishing image settings become Studio settings and stay synchronized without losing metadata or revision", async () => {
  const original = await fixtureProject();
  const preparation = {
    metadata, imageReviews: [{ ...imageReviews[0], description: "Previously saved description" }],
    lastPackage: { revision: 4, fingerprint: "f".repeat(64) },
  };
  const legacy = parseStudioProject({ ...original, publicationPreparation: preparation });
  assert.equal(legacy.imageReviews, undefined);
  assert.deepEqual(studioImageReviews(legacy), preparation.imageReviews);
  const reviews = [{ ...preparation.imageReviews[0], description: "Updated in Studio" }];
  const updated = updateStudioProject(legacy, {
    manifest: legacy.manifest, status: legacy.status, acceptedReviewItemIds: [],
    imageReviews: reviews,
  });
  assert.deepEqual(updated.publicationPreparation, { ...preparation, imageReviews: reviews });
  assert.deepEqual(studioImageReviews(updated), reviews);
  const savedFromPublishing = updateStudioProject(updated, {
    manifest: updated.manifest, status: updated.status, acceptedReviewItemIds: [],
    publicationPreparation: { ...updated.publicationPreparation!, metadata: { ...metadata, summary: "Updated catalog summary" } },
  });
  assert.deepEqual(studioImageReviews(savedFromPublishing), reviews);
  assert.deepEqual(savedFromPublishing.imageReviews, savedFromPublishing.publicationPreparation?.imageReviews);
  assert.deepEqual(savedFromPublishing.publicationPreparation?.lastPackage, preparation.lastPackage);
  assert.equal(studioEditingSnapshot(savedFromPublishing), studioEditingSnapshot(updated));
});

test("Studio image data overrides preserve included Word values and the approved snapshot", async () => {
  const manifest = fixtureManifest();
  const image = manifest.blocks.find(block => block.type === "image");
  assert.ok(image);
  image.contentKind = "data-bearing";
  image.accessibleData = {
    sourceKind: "verified-upload", title: "Included source values", unit: "unknown",
    columns: ["Factor", "Coefficient"], rows: [{ id: "one", cells: ["Trust", "-0.12"] }], sha256: "c".repeat(64),
  };
  const project = await fixtureProject(manifest);
  const review = {
    ...imageReviews[0], description: "Trust has a coefficient of -0.12.", kind: "data-bearing" as const,
    accessibleData: { ...image.accessibleData, unit: "number" as const },
  };
  const saved = updateStudioProject(project, {
    manifest, acceptedReviewItemIds: [], status: "draft", imageReviews: [review],
  });
  assert.equal(evaluateApprovedContentIntegrity(saved.manifest, saved.approvedContent).status, "intact");
  assert.deepEqual(image.accessibleData.rows, review.accessibleData.rows);
  assert.equal(image.accessibleData.unit, "unknown");
  const result = await preparePublicationPackage({ project: saved, metadata, imageReviews: studioImageReviews(saved) });
  assert.equal(result.manifest.blocks.find(block => block.type === "image")?.accessibleData?.unit, "number");
});

test("valid bitmap data is packaged without checkbox confirmations or changing original source approval", async () => {
  const project = await fixtureProject();
  const original = canonicalJson(project.approvedContent);
  const accessibleData = {
    sourceKind: "verified-upload" as const, title: "Approved test coefficients", unit: "number" as const,
    columns: ["Factor", "Coefficient"], rows: [{ id: "value-1", cells: ["Trust", "-0.12"] }], sha256: "c".repeat(64),
  };
  const reviews = [{ ...imageReviews[0], kind: "data-bearing" as const, accessibleData }];
  const result = await preparePublicationPackage({ project, metadata, imageReviews: reviews });
  assert.equal(canonicalJson(project.approvedContent), original);
  const image = result.manifest.blocks.find((block) => block.type === "image");
  assert.ok(image?.type === "image");
  assert.equal(image.contentKind, "data-bearing");
  assert.deepEqual(image.accessibleData, accessibleData);
  assert.equal((await validateDraftPublicationPackage(result.zipBytes)).publication.reportId, project.id);
});

test("creates an unsigned deterministic ZIP with the original project identity and schema-valid manifest", async () => {
  const project = await fixtureProject();
  const before = canonicalJson(project);
  const first = await preparePublicationPackage({ project, metadata, imageReviews });
  const second = await preparePublicationPackage({ project, metadata, imageReviews });
  assert.deepEqual(first.zipBytes, second.zipBytes);
  assert.equal(first.publication.reportId, project.id);
  assert.equal(first.publication.revision, 1);
  assert.equal(first.fileName, "synthetic-package-test-r1.zip");
  assert.ok(!("approval" in first.publication));
  assert.equal(canonicalJson(project), before);
  assert.equal(project.status, "draft");
  assert.deepEqual(project.publishReceipts, []);
  const zip = await JSZip.loadAsync(first.zipBytes);
  assert.deepEqual(Object.keys(zip.files), [
    "publication.json", "manifest.json", `assets/${assetHash}.png`,
  ]);
  const manifest = reportManifestSchema.parse(JSON.parse(await zip.file("manifest.json")!.async("string")));
  assert.deepEqual(manifest.blocks.map((block) => block.id), project.manifest.blocks.map((block) => block.id));
  assert.equal(manifest.metadata.publishedDate, "2026-05-12");
  assert.deepEqual(manifest.metadata.author, metadata.author);
  const image = manifest.blocks.find((block) => block.type === "image");
  assert.equal(image?.dataUrl, `/assets/${assetHash}.png`);
  assert.equal(first.publication.thumbnail.assetPath, `assets/${assetHash}.png`);
  assert.equal(first.publication.assets.length, 1, "Thumbnail and report image share one asset");
  assert.deepEqual(first.publication.assets[0], {
    path: `assets/${assetHash}.png`, sha256: assetHash, mimeType: "image/png", sizeBytes: bytes.length,
  });
  assert.deepEqual(await zip.file(`assets/${assetHash}.png`)!.async("nodebuffer"), bytes);
  assert.deepEqual((await validateDraftPublicationPackage(first.zipBytes)).publication, first.publication);
});

test("preserves New Fluent Colors through a publication ZIP roundtrip", async () => {
  const original = await fixtureProject();
  const project = updateStudioProject(original, {
    acceptedReviewItemIds: original.acceptedReviewItemIds,
    manifest: original.manifest,
    status: original.status,
    reportStyle: "new-fluent-colors",
  });
  const result = await preparePublicationPackage({ project, metadata, imageReviews });
  const restored = await validateDraftPublicationPackage(result.zipBytes);
  assert.equal(result.publication.reportStyle, "new-fluent-colors");
  assert.equal(restored.publication.reportStyle, "new-fluent-colors");
});

  test("legacy checkbox flags remain readable but are neither required nor fabricated", async () => {
    const project = await fixtureProject();
    assert.deepEqual(publicationReadiness(project, metadata, imageReviews), []);
    const pending = [{ ...imageReviews[0], descriptionConfirmed: false }];
    assert.deepEqual(publicationReadiness(project, metadata, pending), []);
    const before = canonicalJson(project.approvedContent);
    const result = await preparePublicationPackage({
      project, metadata: { ...metadata, thumbnail: { ...metadata.thumbnail, altConfirmed: false } }, imageReviews: pending,
    });
    assert.equal(result.preparation.metadata.thumbnail.altConfirmed, false);
    assert.equal(result.preparation.imageReviews[0].descriptionConfirmed, false);
    assert.equal(canonicalJson(project.approvedContent), before);
  });

  test("placeholder image descriptions cannot be confirmed away", async () => {
    const manifest = fixtureManifest();
    const image = manifest.blocks.find(block => block.type === "image");
    assert.ok(image?.type === "image");
    image.alt = "[Human accessibility review required for source image at paragraph 40.]";
    const project = await fixtureProject(manifest);
    const reviews = [{ ...imageReviews[0], alt: image.alt, descriptionConfirmed: true }];
    assert.ok(publicationReadiness(project, metadata, reviews).some(issue =>
      issue.message.includes("needs a description")));
    await assert.rejects(preparePublicationPackage({ project, metadata, imageReviews: reviews }), /not ready/);
  });
test("reuses the same revision for unchanged packages and increments once when package content changes", async () => {
  const project = await fixtureProject();
  const first = await preparePublicationPackage({ project, metadata, imageReviews });
  const saved = updateStudioProject(project, {
    manifest: project.manifest,
    acceptedReviewItemIds: [],
    status: "draft",
    publicationPreparation: first.preparation,
  });
  const repeat = await preparePublicationPackage({ project: saved, metadata, imageReviews });
  assert.equal(repeat.publication.revision, 1);
  assert.deepEqual(repeat.zipBytes, first.zipBytes);
  const changedMetadata = { ...metadata, summary: "A different reviewed catalog summary." };
  const changed = await preparePublicationPackage({ project: saved, metadata: changedMetadata, imageReviews });
  assert.equal(changed.publication.revision, 2);
  assert.notEqual(changed.preparation.lastPackage?.fingerprint, first.preparation.lastPackage?.fingerprint);
  const updated = updateStudioProject(saved, {
    manifest: saved.manifest,
    acceptedReviewItemIds: [],
    status: "draft",
    publicationPreparation: changed.preparation,
  });
  assert.equal((await preparePublicationPackage({ project: updated, metadata: changedMetadata, imageReviews })).publication.revision, 2);
});

test("optional employee counts survive saving and packaging, and count changes advance the revision", async () => {
  const project = await fixtureProject();
  const originalContent = canonicalJson(project.approvedContent);
  const first = await preparePublicationPackage({ project, metadata, imageReviews });
  assert.equal(Object.hasOwn(first.publication, "employeeCount"), false);
  const saved = updateStudioProject(project, {
    manifest: project.manifest, acceptedReviewItemIds: [], status: "draft",
    publicationPreparation: first.preparation,
  });
  const withCount = await preparePublicationPackage({
    project: saved, metadata: { ...metadata, employeeCount: 12500 }, imageReviews,
  });
  assert.equal(withCount.publication.employeeCount, 12500);
  assert.equal(withCount.publication.revision, first.publication.revision + 1);
  assert.equal((await validateDraftPublicationPackage(withCount.zipBytes)).publication.employeeCount, 12500);
  const counted = parseStudioProject(JSON.parse(JSON.stringify(updateStudioProject(saved, {
    manifest: saved.manifest, acceptedReviewItemIds: [], status: "draft",
    publicationPreparation: withCount.preparation,
  }))));
  assert.equal(counted.publicationPreparation?.metadata.employeeCount, 12500);
  assert.equal(canonicalJson(counted.approvedContent), originalContent);
  const repeat = await preparePublicationPackage({
    project: counted, metadata: withCount.preparation.metadata, imageReviews,
  });
  assert.deepEqual(repeat.zipBytes, withCount.zipBytes);
  const cleared = await preparePublicationPackage({
    project: counted, metadata: { ...metadata, employeeCount: undefined }, imageReviews,
  });
  assert.equal(Object.hasOwn(cleared.publication, "employeeCount"), false);
  assert.equal(cleared.publication.revision, withCount.publication.revision + 1);
  for (const employeeCount of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(preparePublicationPackage({
      project, metadata: { ...metadata, employeeCount }, imageReviews,
    }), /employeeCount/);
    assert.equal(draftPublicationSchema.safeParse({ ...withCount.publication, employeeCount }).success, false);
  }
});

test("requires real metadata without accepting renderer defaults or impossible calendar dates", async () => {
  const project = await fixtureProject();
  for (const invalid of [
    { ...metadata, title: "" },
    { ...metadata, summary: "" },
    { ...metadata, summary: "s".repeat(221) },
    { ...metadata, slug: "../report" },
    { ...metadata, displayDate: "2026-02-30" },
    { ...metadata, author: { name: "" } },
    { ...metadata, readTimeMinutes: 0 },
    { ...metadata, topics: ["a", "b", "c", "d"] },
    { ...metadata, thumbnail: { ...metadata.thumbnail, alt: "" } },
  ]) {
    await assert.rejects(preparePublicationPackage({ project, metadata: invalid, imageReviews }), /not ready/);
  }
});

test("packages author names without handles and computes reading time instead of using a stale manual value", async () => {
  const manifest = fixtureManifest();
  manifest.metadata.readTimeMinutes = 99;
  manifest.blocks[2] = { ...manifest.blocks[2], type: "paragraph", text: "word ".repeat(401).trim() };
  const project = await fixtureProject(manifest);
  const original = canonicalJson(project);
  const result = await preparePublicationPackage({
    project, metadata: { ...metadata, author: { name: "Test author" }, readTimeMinutes: 99 }, imageReviews,
  });
  assert.deepEqual(result.publication.author, { name: "Test author" });
  assert.deepEqual(result.manifest.metadata.author, { name: "Test author" });
  assert.equal(result.publication.readTimeMinutes, 3);
  assert.equal(result.manifest.metadata.readTimeMinutes, 3);
  assert.equal(result.preparation.metadata.readTimeMinutes, 3);
  const packaged = await validateDraftPublicationPackage(result.zipBytes);
  assert.deepEqual(packaged.manifest.metadata.author, { name: "Test author" });
  assert.equal(packaged.publication.readTimeMinutes, 3);
  assert.equal(canonicalJson(project), original);
});

test("long summaries in saved drafts remain editable without truncation but cannot be packaged", async () => {
  const project = await fixtureProject();
  const longMetadata = { ...metadata, summary: "s".repeat(221) };
  const saved = updateStudioProject(project, {
    manifest: project.manifest, status: project.status, acceptedReviewItemIds: project.acceptedReviewItemIds,
    publicationPreparation: { metadata: longMetadata, imageReviews },
  });
  const reopened = parseStudioProject(JSON.parse(JSON.stringify(saved)));
  assert.equal(reopened.publicationPreparation?.metadata.summary, longMetadata.summary);
  assert.equal(canonicalJson(reopened.approvedContent), canonicalJson(project.approvedContent));
  await assert.rejects(preparePublicationPackage({ project: reopened, metadata: longMetadata, imageReviews }), /summary: Keep the short summary to 220 characters or fewer/);
  const shortened = { ...longMetadata, summary: "s".repeat(220) };
  const result = await preparePublicationPackage({ project: reopened, metadata: shortened, imageReviews });
  assert.equal(result.publication.summary, shortened.summary);
  assert.deepEqual(reopened.publicationPreparation?.metadata.summary, longMetadata.summary);
});

test("blockers cannot be accepted away and unresolved components cannot be packaged", async () => {
  const manifest = fixtureManifest();
  manifest.reviewItems.push({ id: "blocker", severity: "blocker", message: "Missing verified data." });
  const project = await fixtureProject(manifest);
  project.acceptedReviewItemIds.push("blocker");
  await assert.rejects(preparePublicationPackage({ project, metadata, imageReviews }), /Missing verified data/);
  const unsupported = fixtureManifest();
  unsupported.blocks.push({ id: "unsupported", type: "unsupported", description: "Unknown content", source: { part: "word/document.xml", index: 3 } });
  await assert.rejects(preparePublicationPackage({ project: await fixtureProject(unsupported), metadata, imageReviews }), /unsupported content/);
});

test("requires source-link evidence and blocks source hyperlinks pending coordinated representation", async () => {
  const project = await fixtureProject();
  project.publicationSourceEvidence = undefined;
  assert.ok(publicationReadiness(project, metadata, imageReviews).some((issue) => issue.field === "source"));
  await assert.rejects(preparePublicationPackage({ project, metadata, imageReviews }), /Re-import/);
  project.publicationSourceEvidence = { sourceSha256: project.manifest.source.sha256, hyperlinkCount: 8 };
  await assert.rejects(preparePublicationPackage({ project, metadata, imageReviews }), /8 source hyperlinks/);
});

test("stale source hashes in saved image settings block readiness", async () => {
  const project = await fixtureProject();
  await assert.rejects(preparePublicationPackage({
    project, metadata, imageReviews: [{ ...imageReviews[0], assetSha256: "c".repeat(64) }],
  }), /do not match its current source asset/);
});

test("Word images package automatically without image classification or review records", async () => {
  const manifest = fixtureManifest();
  const image = manifest.blocks.find(block => block.type === "image");
  assert.ok(image);
  delete image.contentKind;
  const project = await fixtureProject(manifest);
  const { altConfirmed, ...thumbnail } = metadata.thumbnail;
  assert.equal(altConfirmed, true);
  const result = await preparePublicationPackage({ project, metadata: { ...metadata, thumbnail }, imageReviews: [] });
  const stored = result.manifest.blocks.find(block => block.type === "image");
  assert.equal(stored?.contentKind, undefined);
  assert.equal(stored?.alt, image.alt);
  assert.deepEqual(result.preparation.imageReviews, []);
  assert.equal(result.preparation.metadata.thumbnail.altConfirmed, undefined);
  assert.deepEqual(project.publishReceipts, []);
  await validateDraftPublicationPackage(result.zipBytes);
});

test("inline descriptions fix missing Word descriptions without rewriting source approval or classifying images", async () => {
  const manifest = fixtureManifest();
  const image = manifest.blocks.find(block => block.type === "image");
  assert.ok(image);
  image.alt = "[Human accessibility review required for source image at paragraph 40.]";
  delete image.contentKind;
  const project = await fixtureProject(manifest);
  const original = canonicalJson(project);
  const description = "83% of employees without burnout feel adequately trained in AI, compared with 55% experiencing high burnout.";
  const reviews = [{ blockId: image.id, assetSha256: assetHash, alt: image.alt, description }];
  assert.deepEqual(publicationReadiness(project, metadata, reviews), []);
  const result = await preparePublicationPackage({ project, metadata, imageReviews: reviews });
  const packagedImage = result.manifest.blocks.find(block => block.type === "image");
  assert.equal(packagedImage?.alt, description);
  assert.equal(packagedImage?.contentKind, undefined);
  assert.equal(packagedImage?.sourceAssetSha256, assetHash);
  assert.equal(canonicalJson(project), original);
  assert.equal(result.preparation.imageReviews[0].descriptionConfirmed, undefined);
  await validateDraftPublicationPackage(result.zipBytes);
  const saved = updateStudioProject(project, {
    manifest: project.manifest, acceptedReviewItemIds: [], status: "draft", publicationPreparation: result.preparation,
  });
  const changed = await preparePublicationPackage({
    project: saved, metadata, imageReviews: [{ ...reviews[0], description: "An updated description of the original image." }],
  });
  assert.equal(changed.publication.revision, result.publication.revision + 1);
});

test("inline descriptions preserve included structured data and original image classification", async () => {
  const manifest = fixtureManifest();
  const image = manifest.blocks.find(block => block.type === "image");
  assert.ok(image);
  image.contentKind = "data-bearing";
  image.accessibleData = {
    sourceKind: "verified-upload", title: "Source chart values", unit: "number",
    columns: ["Factor", "Coefficient"], rows: [{ id: "value-1", cells: ["Trust", "-0.12"] }], sha256: "c".repeat(64),
  };
  const project = await fixtureProject(manifest);
  const result = await preparePublicationPackage({
    project, metadata,
    imageReviews: [{ blockId: image.id, assetSha256: assetHash, alt: image.alt, description: "The source chart shows Trust with a coefficient of -0.12." }],
  });
  const stored = result.manifest.blocks.find(block => block.type === "image");
  assert.equal(stored?.contentKind, "data-bearing");
  assert.deepEqual(stored?.accessibleData, image.accessibleData);
});

test("unfinished inline descriptions can be saved but cannot be staged, and descriptions cannot bypass source hashes", async () => {
  const manifest = fixtureManifest();
  const image = manifest.blocks.find(block => block.type === "image");
  assert.ok(image);
  image.alt = "";
  const project = await fixtureProject(manifest);
  const review = { blockId: image.id, assetSha256: assetHash, alt: "", description: "" };
  const saved = updateStudioProject(project, {
    manifest: project.manifest, acceptedReviewItemIds: [], status: "draft",
    publicationPreparation: { metadata, imageReviews: [review] },
  });
  assert.equal(saved.publicationPreparation?.imageReviews[0].description, "");
  for (const description of ["", " ", "[Human accessibility review required for this image.]"]) {
    await assert.rejects(preparePublicationPackage({
      project: saved, metadata, imageReviews: [{ ...review, description }],
    }), /needs a description/);
  }
  await assert.rejects(preparePublicationPackage({
    project, metadata, imageReviews: [{ ...review, description: "A meaningful description.", assetSha256: "c".repeat(64) }],
  }), /do not match its current source asset/);
});

test("illustration presentation is packaged separately without replacing the original Word cover", async () => {
  const project = await fixtureProject();
  const result = await preparePublicationPackage({
    project, metadata: { ...metadata, thumbnail: { source, alt: "Data illustration.", presentation: "illustration" } }, imageReviews: [],
  });
  assert.equal(result.publication.thumbnail.presentation, "illustration");
  assert.equal(result.manifest.blocks.find(block => block.type === "image")?.alt, imageReviews[0].alt);
  assert.equal((await validateDraftPublicationPackage(result.zipBytes)).publication.thumbnail.presentation, "illustration");
  const saved = updateStudioProject(project, {
    manifest: project.manifest, acceptedReviewItemIds: [], status: "draft", publicationPreparation: result.preparation,
  });
  const changed = await preparePublicationPackage({
    project: saved, metadata: { ...metadata, thumbnail: { source, alt: "Data illustration.", presentation: "image" } }, imageReviews: [],
  });
  assert.equal(changed.publication.revision, result.publication.revision + 1);
  assert.notEqual(changed.preparation.lastPackage?.fingerprint, result.preparation.lastPackage?.fingerprint);
});

test("V1 packages a reviewed chart bitmap without requiring CSV or changing its original bytes", async () => {
  const project = await fixtureProject();
  const before = canonicalJson(project.approvedContent);
  const reviews = [{ ...imageReviews[0], kind: "data-bearing" as const, descriptionConfirmed: true }];
  assert.deepEqual(publicationReadiness(project, metadata, reviews), []);
  const result = await preparePublicationPackage({ project, metadata, imageReviews: reviews });
  const image = result.manifest.blocks.find(block => block.type === "image");
  assert.equal(image?.contentKind, "data-bearing");
  assert.equal(image?.accessibleData, undefined);
  const zip = await JSZip.loadAsync(result.zipBytes);
  assert.deepEqual(await zip.file(`assets/${assetHash}.png`)!.async("nodebuffer"), bytes);
  assert.equal(canonicalJson(project.approvedContent), before);
  await validateDraftPublicationPackage(result.zipBytes);
});

test("V1 cannot discard structured data already included in the Word image", async () => {
  const manifest = fixtureManifest();
  const image = manifest.blocks.find(block => block.type === "image");
  assert.ok(image);
  image.contentKind = "data-bearing";
  image.accessibleData = {
    sourceKind: "word-chart", title: "Source values", unit: "number",
    columns: ["Factor", "Value"], rows: [{ id: "row-1", cells: ["A", "12"] }], sha256: "c".repeat(64),
  };
  const project = await fixtureProject(manifest);
  await assert.rejects(preparePublicationPackage({
    project, metadata, imageReviews: [{ ...imageReviews[0], kind: "data-bearing" }],
  }), /Keep this image's included source data/);
});

test("checks image byte signatures, declared MIME types, and source hashes before creating a package", async () => {
  const project = await fixtureProject();
  await assert.rejects(preparePublicationPackage({
    project, metadata: { ...metadata, thumbnail: { ...metadata.thumbnail, source: `data:image/jpeg;base64,${bytes.toString("base64")}` } }, imageReviews,
  }), /declared MIME type/);
  await assert.rejects(preparePublicationPackage({
    project, metadata: { ...metadata, thumbnail: { ...metadata.thumbnail, source: "data:image/png;base64,AA==" } }, imageReviews,
  }), /not a supported image/);
  const wrongHash = fixtureManifest();
  const image = wrongHash.blocks.find((block) => block.type === "image");
  assert.ok(image);
  image.sourceAssetSha256 = "c".repeat(64);
  await assert.rejects(preparePublicationPackage({
    project: await fixtureProject(wrongHash), metadata,
    imageReviews: [{ ...imageReviews[0], assetSha256: "c".repeat(64) }],
  }), /source asset hash/);
});

test("rejects external, temporary, machine-local, and traversal asset URLs", async () => {
  const project = await fixtureProject();
  for (const invalid of [
    "https://example.com/image.png", "blob:temporary", "file:///C:/report.png",
    "C:\\Users\\test\\OneDrive\\image.png", "//example.com/image.png", "/../image.png",
  ]) {
    await assert.rejects(preparePublicationPackage({
      project, metadata: { ...metadata, thumbnail: { ...metadata.thumbnail, source: invalid } }, imageReviews,
    }), /same-site file paths/);
  }
});

test("packages same-site asset bytes and fails explicitly when an asset cannot be loaded", async () => {
  const project = await fixtureProject();
  const withStaticThumbnail = { ...metadata, thumbnail: { ...metadata.thumbnail, source: "/figma/illustrations/blue/report.png" } };
  const result = await preparePublicationPackage({
    project, metadata: withStaticThumbnail, imageReviews,
    readAsset: async (path) => {
      assert.equal(path, "/figma/illustrations/blue/report.png");
      return { bytes, mimeType: "image/png" };
    },
  });
  assert.equal(result.publication.assets.length, 1);
  await assert.rejects(preparePublicationPackage({
    project, metadata: withStaticThumbnail, imageReviews,
    readAsset: async () => { throw new Error("Asset could not be loaded."); },
  }), /Asset could not be loaded/);
});

test("requires a replacement for retired illustrations before creating another publication package", async () => {
  const project = await fixtureProject();
  for (const source of ["/figma/illustrations/people.png", "/figma/illustrations/glacier/people.png"]) {
    await assert.rejects(preparePublicationPackage({
      project, metadata: { ...metadata, thumbnail: { ...metadata.thumbnail, source } }, imageReviews,
    }), /Choose an illustration from the new Glint Labs set/);
  }
});

test("rejects missing assets, mismatched hashes, MIME types, sizes, and undeclared files on ZIP validation", async () => {
  const { zipBytes } = await preparePublicationPackage({ project: await fixtureProject(), metadata, imageReviews });
  for (const property of ["sha256", "mimeType", "sizeBytes"]) {
    const zip = await JSZip.loadAsync(zipBytes);
    const publication = JSON.parse(await zip.file("publication.json")!.async("string"));
    publication.assets[0][property] = { sha256: "c".repeat(64), mimeType: "image/gif", sizeBytes: bytes.length + 1 }[property];
    zip.file("publication.json", JSON.stringify(publication));
    await assert.rejects(validateDraftPublicationPackage(await zip.generateAsync({ type: "uint8array" })), /Asset hash, MIME type, filename, or size/);
  }
  const missing = await JSZip.loadAsync(zipBytes);
  missing.remove(`assets/${assetHash}.png`);
  await assert.rejects(validateDraftPublicationPackage(await missing.generateAsync({ type: "uint8array" })), /Missing package asset/);
  const extra = await JSZip.loadAsync(zipBytes);
  extra.file("unexpected.html", "not a public page");
  await assert.rejects(validateDraftPublicationPackage(await extra.generateAsync({ type: "uint8array" })), /undeclared files/);
});

test("source confirmation and ready status never become public-release approval or a receipt", async () => {
  const project = await fixtureProject();
  project.status = "ready";
  project.sourceApproval = { statementVersion: "1", confirmedAt: "2026-10-08T20:00:00.000Z" };
  const before = canonicalJson(project);
  const result = await preparePublicationPackage({ project, metadata, imageReviews });
  assert.equal(canonicalJson(project), before);
  assert.ok(!("approval" in result.publication));
  assert.deepEqual(project.publishReceipts, []);
  assert.equal(draftPublicationSchema.safeParse({
    ...result.publication, approval: project.sourceApproval,
  }).success, false);
});

test("detects source content drift and corrupted approved snapshot hashes", async () => {
  const project = await fixtureProject();
  const text = project.manifest.blocks.find((block) => block.type === "paragraph");
  assert.ok(text);
  text.text = "Changed words";
  await assert.rejects(preparePublicationPackage({ project, metadata, imageReviews }), /no longer match/);
  const invalidHash = await fixtureProject();
  assert.ok(invalidHash.approvedContent);
  invalidHash.approvedContent.sha256 = "d".repeat(64);
  await assert.rejects(preparePublicationPackage({ project: invalidHash, metadata, imageReviews }), /snapshot hash is invalid/);
});

test("Word extraction audits rendered hyperlinks but excludes the template library", async () => {
  const zip = new JSZip();
  zip.file("word/document.xml", `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Link fixture</w:t></w:r></w:p>
    <w:p><w:hyperlink r:id="rId1"><w:r><w:t>Source reference</w:t></w:r></w:hyperlink></w:p>
    <w:p><w:r><w:instrText> HYPERLINK "https://example.com/field" </w:instrText></w:r></w:p>
    <w:p><w:fldSimple w:instr='HYPERLINK "https://example.com/simple"'><w:r><w:t>Simple link</w:t></w:r></w:fldSimple></w:p>
    <w:p><w:r><w:t>[GLPS TEMPLATE LIBRARY]</w:t></w:r></w:p>
    <w:p><w:hyperlink r:id="rId1"><w:r><w:t>Editorial instruction link</w:t></w:r></w:hyperlink></w:p>
    <w:p><w:r><w:t>[GLPS END TEMPLATE LIBRARY]</w:t></w:r></w:p>
  </w:body></w:document>`);
  zip.file("word/_rels/document.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="https://example.com/reference" TargetMode="External"/></Relationships>');
  const extraction = await extractDocx("link-fixture.docx", await zip.generateAsync({ type: "uint8array" }));
  assert.deepEqual(extraction.publicationSourceEvidence, {
    sourceSha256: extraction.manifest.source.sha256,
    hyperlinkCount: 2,
    representedHyperlinkCount: 2,
  });
  const links = extraction.manifest.blocks.flatMap((block) =>
    block.type === "paragraph" || block.type === "list-item" ? block.links ?? [] : []);
  assert.deepEqual(links.map((link) => link.href), ["https://example.com/reference", "https://example.com/simple"]);
});
