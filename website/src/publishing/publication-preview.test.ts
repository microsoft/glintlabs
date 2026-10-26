import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  approvePublicationForLocalWebsite, listApprovedPublications, loadApprovedPublication,
} from "./approved-publication.ts";

import JSZip from "jszip";

import {
  canonicalJson,
  createApprovedContentRecord,
  sha256Text,
  snapshotApprovedContent,
} from "../integrity/approved-content.ts";
import {
  reportManifestSchema,
  type ReportManifest,
} from "../manifest/report-manifest.ts";
import { draftPublicationSchema, preparePublicationPackage, type DraftPublication } from "../project/publication-package.ts";
import { createStudioProject } from "../project/studio-project.ts";
import { extractDocx } from "../extraction/extract-docx.ts";
import {
  ingestUnsignedPublicationPreview,
  loadPublicationPreview,
} from "./publication-preview.ts";
import { loadReportCatalog, publicationCatalogItem } from "./report-catalog.ts";
import { copyApprovedReports } from "./pages-export.ts";

const imageBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6fcAAAAASUVORK5CYII=",
  "base64",
);
const imageHash = createHash("sha256").update(imageBytes).digest("hex");
const reportId = "861a178c-bb41-4df2-8c5e-5aff2f1d1b35";

test("Pages exports only explicitly approved exact revisions and rejects tampered exported content", async () => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "glint-pages-approval-"));
  const exported = path.join(rootDirectory, "pages-publications");
  try {
    const { preview } = await ingestUnsignedPublicationPreview(await syntheticZip(), { rootDirectory });
    await assert.rejects(copyApprovedReports(rootDirectory, exported, reportId), /explicitly approved/);
    await approvePublicationForLocalWebsite({
      reportId, revision: 1, packageFingerprint: preview.packageFingerprint, approveForWebsite: true,
    }, { rootDirectory });
    const assets = path.join(rootDirectory, "public", "reports-assets", reportId);
    await writeFile(path.join(assets, "unlisted-private-note.txt"), "Never export undeclared files.");
    assert.equal(await copyApprovedReports(rootDirectory, exported, reportId), 1);
    const report = await loadApprovedPublication(reportId, { rootDirectory: exported });
    assert.equal(report?.publication.approval.packageFingerprint, preview.packageFingerprint);
    await assert.rejects(readFile(path.join(exported, "public", "reports-assets", reportId, "unlisted-private-note.txt")));
    assert.equal(await copyApprovedReports(exported, path.join(rootDirectory, "reader")), 1);
    const manifestPath = path.join(exported, "content", "reports", reportId, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.blocks.find((block: { type: string }) => block.type === "paragraph").text = "Changed after approval.";
    await writeFile(manifestPath, JSON.stringify(manifest));
    await assert.rejects(copyApprovedReports(exported, path.join(rootDirectory, "tampered-reader")));
  } finally {
    await rm(rootDirectory, { recursive: true, force: true });
  }
});

test("Home and Reports consume the validated catalog, with Home limited to featured reports", async () => {
  const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const reports = await readFile(new URL("../app/reports/page.tsx", import.meta.url), "utf8");
  assert.match(home, /export default async function Home/);
  assert.match(home, /const featuredReports = \(await loadReportCatalog\(\)\)\.filter\(\(report\) => report\.featured\)/);
  assert.match(home, /featuredReports\.map\(\(report\) => <StudyCard key=\{report\.id\} report=\{report\}/);
  assert.match(home, /const showFeaturedPlaceholders = featuredReports\.length === 0 &&\s+process\.env\.GLINT_LABS_UNSIGNED_PREVIEW === "1"/);
  assert.match(reports, /export default async function ReportsPage/);
  assert.match(reports, /const reports = await loadReportCatalog\(\)/);
  assert.match(reports, /<ReportsCatalog reports=\{reports\} \/>/);
});

test("all three P0 reports are featured on Home while retaining one illustrated Reports entry each", async () => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "glint-p0-featured-"));
  try {
    const catalog = await loadReportCatalog({ rootDirectory });
    const featured = catalog.filter(report => report.featured);
    assert.deepEqual(featured.map(report => report.href), [
      "/reports/fighting-ai-slop-with-meta-cognition-around-ai",
      "/reports/empowering-managers-for-an-ai-first-future",
      "/reports/tracking-the-rise-of-perceived-ai-value-at-work",
    ]);
    for (const report of featured) {
      assert.equal(catalog.filter(item => item.id === report.id).length, 1);
      assert.ok(report.thumbnail);
      assert.equal(report.thumbnail.presentation, "illustration");
      assert.match(report.thumbnail.src, /^\/figma\/illustrations\/blue\//);
    }
  } finally { await rm(rootDirectory, { recursive: true, force: true }); }
});

test("isolated Word-to-website rehearsal keeps drafts off the catalog until exact-revision approval", async () => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "glint-word-rehearsal-"));
  try {
    const originalCatalog = await loadReportCatalog({ rootDirectory });
    const originalCatalogIds = originalCatalog.map(report => report.id);
    const originalFeaturedCount = originalCatalog.filter(report => report.featured).length;
    const docx = new JSZip();
    docx.file("word/document.xml", `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>
      <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Synthetic launch rehearsal</w:t></w:r></w:p>
      <w:p><w:r><w:t>Test-only source content. </w:t></w:r><w:hyperlink r:id="rId1"><w:r><w:t>Source reference</w:t></w:r></w:hyperlink></w:p>
    </w:body></w:document>`);
    docx.file("word/_rels/document.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="https://example.com/source" TargetMode="External"/></Relationships>');
    const extracted = await extractDocx("synthetic-launch-rehearsal.docx", await docx.generateAsync({ type: "uint8array" }));
    const project = createStudioProject({
      id: reportId,
      importedManifestSha256: await sha256Text(canonicalJson(extracted.manifest)),
      approvedContent: await createApprovedContentRecord(extracted.manifest),
      publicationSourceEvidence: extracted.publicationSourceEvidence,
      manifest: extracted.manifest,
      status: "draft",
    });
    const prepared = await preparePublicationPackage({
      project,
      metadata: {
        slug: "synthetic-launch-rehearsal",
        title: "Synthetic launch rehearsal",
        summary: "Test-only content, never a release report.",
        eyebrow: "Test fixture",
        displayDate: "2026-10-24",
        author: { name: "Test author" },
        readTimeMinutes: 1,
        topics: ["Testing"],
        thumbnail: {
          source: `data:image/png;base64,${imageBytes.toString("base64")}`,
          alt: "Synthetic one-pixel test image",
          altConfirmed: true,
        },
        catalog: { featured: true, featuredUntil: null },
      },
      imageReviews: [],
    });
    const { preview } = await ingestUnsignedPublicationPreview(prepared.zipBytes, { rootDirectory });
    assert.deepEqual((await loadReportCatalog({ rootDirectory })).map((report) => report.id), originalCatalogIds);
    await approvePublicationForLocalWebsite({
      reportId, revision: prepared.publication.revision,
      packageFingerprint: preview.packageFingerprint, approveForWebsite: true,
    }, { rootDirectory });
    const reports = await loadReportCatalog({ rootDirectory });
    const featured = reports.filter((report) => report.featured);
    assert.equal(featured.length, originalFeaturedCount + 1);
    assert.equal(featured[0].href, "/reports/synthetic-launch-rehearsal");
    assert.equal(featured[0].thumbnail?.src, `/reports-assets/${reportId}/${imageHash}.png`);
    assert.equal(reports.length, originalCatalogIds.length + 1);
    const approved = await loadApprovedPublication(reportId, { rootDirectory });
    assert.ok(approved?.manifest.blocks.some((block) =>
      block.type === "paragraph" && block.links?.some((link) => link.href === "https://example.com/source"),
    ));
    assert.equal(project.status, "draft");
    assert.deepEqual(project.publishReceipts, []);
  } finally { await rm(rootDirectory, { recursive: true, force: true }); }
});

function syntheticManifest(contentKind: "non-data" | "data-bearing" | undefined) {
  return reportManifestSchema.parse({
    schemaVersion: "0.1.0",
    source: {
      fileName: "synthetic.docx",
      sizeBytes: 100,
      sha256: "a".repeat(64),
    },
    metadata: {
      title: "Synthetic package test",
      status: "draft",
      author: { name: "Test author", handle: "@test" },
      publishedDate: "2026-05-12",
      readTimeMinutes: 2,
      topics: ["Testing"],
    },
    blocks: [
      {
        id: "heading-1",
        type: "heading",
        level: 1,
        text: "Synthetic package test",
        source: { part: "word/document.xml", index: 0 },
      },
      {
        id: "image-1",
        type: "image",
        alt: "Synthetic one-pixel test image",
        fileName: "synthetic.png",
        dataUrl: `/assets/${imageHash}.png`,
        width: 1,
        height: 1,
        sourceAssetSha256: imageHash,
        ...(contentKind ? { contentKind } : {}),
        placement: "hero",
        eyebrow: "Test fixture",
        source: { part: "word/document.xml", index: 1 },
      },
      {
        id: "text-1",
        type: "paragraph",
        text: "Read the exact source.",
        links: [
          {
            start: 9,
            end: 21,
            href: "https://example.com/source",
          },
        ],
        source: { part: "word/document.xml", index: 2 },
      },
    ],
    reviewItems: [],
    extraction: {
      paragraphCount: 2,
      imageCount: 1,
      unsupportedCount: 0,
    },
  });
}

async function syntheticZip(
  manifest: ReportManifest = syntheticManifest("non-data"),
  summary = "Synthetic content for ingestion tests, not a release report.",
  overrides: Partial<DraftPublication> = {},
) {
  const publication = draftPublicationSchema.parse({
    schemaVersion: "1",
    reportId,
    slug: "synthetic-package-test",
    revision: 1,
    reportStyle: "research-report",
    manifestFile: "manifest.json",
    title: manifest.metadata.title,
    summary,
    eyebrow: "Test fixture",
    displayDate: manifest.metadata.publishedDate,
    author: manifest.metadata.author,
    readTimeMinutes: manifest.metadata.readTimeMinutes,
    topics: manifest.metadata.topics,
    thumbnail: {
      assetPath: `assets/${imageHash}.png`,
      alt: "Synthetic one-pixel test image",
    },
    catalog: { featured: false, featuredUntil: null },
    provenance: {
      sourceSha256: manifest.source.sha256,
      approvedContentSha256: await sha256Text(
        canonicalJson(snapshotApprovedContent(manifest)),
      ),
    },
    assets: [
      {
        path: `assets/${imageHash}.png`,
        sha256: imageHash,
        mimeType: "image/png",
        sizeBytes: imageBytes.length,
      },
    ],
    ...overrides,
  });
  const zip = new JSZip();
  zip.file("publication.json", `${canonicalJson(publication)}\n`);
  zip.file("manifest.json", `${canonicalJson(manifest)}\n`);
  zip.file(`assets/${imageHash}.png`, imageBytes);
  return zip.generateAsync({ type: "uint8array" });
}

test("only explicit exact-revision approval enters the website; repeat approval is idempotent and later updates require review", async () => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "glint-approval-"));
  try {
    const originalCatalog = await loadReportCatalog({ rootDirectory });
    const originalCatalogIds = originalCatalog.map(report => report.id);
    const originalFeaturedIds = originalCatalog.filter(report => report.featured).map(report => report.id);
    const { preview: staged } = await ingestUnsignedPublicationPreview(await syntheticZip(), { rootDirectory });
    assert.deepEqual(await listApprovedPublications({ rootDirectory }), []);
    assert.deepEqual((await loadReportCatalog({ rootDirectory })).map((report) => report.id), originalCatalogIds);
    const request = { reportId, revision: 1, packageFingerprint: staged.packageFingerprint, approveForWebsite: true };
    await assert.rejects(approvePublicationForLocalWebsite({ ...request, approveForWebsite: false }, { rootDirectory }));
    await assert.rejects(approvePublicationForLocalWebsite({ ...request, revision: 2 }, { rootDirectory }), /changed after staging/);
    await assert.rejects(approvePublicationForLocalWebsite({ ...request, packageFingerprint: "b".repeat(64) }, { rootDirectory }), /changed after staging/);
    assert.deepEqual(await listApprovedPublications({ rootDirectory }), []);
    const approved = await approvePublicationForLocalWebsite(request, { rootDirectory });
    const catalog = await loadReportCatalog({ rootDirectory });
    assert.equal(catalog.length, originalCatalogIds.length + 1);
    assert.equal(catalog[0].featured, false);
    assert.deepEqual(catalog.filter(report => report.featured).map(report => report.id), originalFeaturedIds);
    assert.equal(catalog[0].href, "/reports/synthetic-package-test");
    assert.equal(catalog[0].thumbnail?.src, `/reports-assets/${reportId}/${imageHash}.png`);
    assert.equal(approved.publication.approval.packageFingerprint, staged.packageFingerprint);
    assert.deepEqual((await approvePublicationForLocalWebsite(request, { rootDirectory })).publication, approved.publication);
    assert.equal((await listApprovedPublications({ rootDirectory })).length, 1);
    assert.ok(approved.manifest.blocks.some((block) => block.type === "image" && block.dataUrl?.startsWith(`/reports-assets/${reportId}/`)));
    const { preview: next } = await ingestUnsignedPublicationPreview(await syntheticZip(undefined, "Updated synthetic summary.", { revision: 2 }), { rootDirectory });
    assert.equal((await loadReportCatalog({ rootDirectory }))[0].description, catalog[0].description);
    await assert.rejects(approvePublicationForLocalWebsite(request, { rootDirectory }), /changed after staging/);
    assert.equal((await loadApprovedPublication(reportId, { rootDirectory }))?.publication.revision, 1);
    const updated = await approvePublicationForLocalWebsite({ ...request, revision: 2, packageFingerprint: next.packageFingerprint }, { rootDirectory });
    assert.equal(updated.publication.revision, 2);
    const updatedCatalog = await loadReportCatalog({ rootDirectory });
    assert.equal(updatedCatalog.length, originalCatalogIds.length + 1);
    assert.equal(updatedCatalog[0].description, "Updated synthetic summary.");
    await writeFile(path.join(rootDirectory, "public", "reports-assets", reportId, `${imageHash}.png`), "corrupt");
    await assert.rejects(loadApprovedPublication(reportId, { rootDirectory }));
    await assert.rejects(loadReportCatalog({ rootDirectory }));
  } finally { await rm(rootDirectory, { recursive: true, force: true }); }
});

test("employee count survives staging and exact-revision approval into preview and public catalog cards", async () => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "glint-employee-count-"));
  try {
    const { preview } = await ingestUnsignedPublicationPreview(
      await syntheticZip(undefined, undefined, { employeeCount: 12500 }), { rootDirectory },
    );
    assert.equal(publicationCatalogItem(preview.publication, { preview: true }).employeeCount, 12500);
    assert.equal((await loadPublicationPreview(reportId, { rootDirectory }))?.publication.employeeCount, 12500);
    await approvePublicationForLocalWebsite({
      reportId, revision: 1, packageFingerprint: preview.packageFingerprint, approveForWebsite: true,
    }, { rootDirectory });
    assert.equal((await loadReportCatalog({ rootDirectory }))[0].employeeCount, 12500);
    assert.equal((await loadApprovedPublication(reportId, { rootDirectory }))?.publication.employeeCount, 12500);
    assert.equal(publicationCatalogItem({ ...preview.publication, employeeCount: undefined }).employeeCount, undefined);
  } finally { await rm(rootDirectory, { recursive: true, force: true }); }
});

test("catalog features expire after the inclusive end date without hiding the report", async () => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "glint-catalog-feature-"));
  try {
    const originalCatalog = await loadReportCatalog({ rootDirectory });
    const originalCatalogCount = originalCatalog.length;
    const originalFeaturedIds = originalCatalog.filter(report => report.featured).map(report => report.id);
    const { preview } = await ingestUnsignedPublicationPreview(await syntheticZip(undefined, undefined, {
      catalog: { featured: true, featuredUntil: "2026-10-20" },
      thumbnail: { assetPath: `assets/${imageHash}.png`, alt: "Test illustration", presentation: "illustration" },
    }), { rootDirectory });
    await approvePublicationForLocalWebsite({
      reportId, revision: 1, packageFingerprint: preview.packageFingerprint, approveForWebsite: true,
    }, { rootDirectory });
    const onEndDate = await loadReportCatalog({ rootDirectory, now: new Date("2026-10-20T23:59:59Z") });
    assert.equal(onEndDate.find((report) => report.featured)?.id, reportId);
    assert.equal(onEndDate.find((report) => report.id === reportId)?.badge, "May 2026 \u2022 Test fixture");
    assert.equal(onEndDate[0].thumbnail?.presentation, "illustration");
    const expired = await loadReportCatalog({ rootDirectory, now: new Date("2026-10-21T00:00:00Z") });
    assert.equal(expired.length, originalCatalogCount + 1);
    assert.equal(expired.find(report => report.id === reportId)?.featured, false);
    assert.deepEqual(expired.filter(report => report.featured).map(report => report.id), originalFeaturedIds);
    assert.equal(expired.find((report) => report.id === "annual-report-2026")?.href, "/annual-report-2026");
    const previewItem = publicationCatalogItem(preview.publication, { preview: true, now: new Date("2026-10-20T00:00:00Z") });
    assert.equal(previewItem.badge, "May 2026 \u2022 Test fixture");
    assert.equal(publicationCatalogItem({
      ...preview.publication, displayDate: "2025-11-11", eyebrow: "Research Drop",
    }).badge, "November 2025 \u2022 Research Drop");
    assert.equal(previewItem.href, `/reports/preview/${reportId}/report`);
    assert.equal(previewItem.thumbnail?.src, `/report-preview-assets/${reportId}/${imageHash}.png`);
    assert.equal(publicationCatalogItem({
      ...preview.publication, catalog: { featured: true, featuredUntil: null },
    }, { now: new Date("2030-01-01") }).featured, true);
    assert.equal(publicationCatalogItem({
      ...preview.publication, catalog: { featured: false, featuredUntil: "2026-10-20" },
    }, { now: new Date("2026-10-20") }).featured, false);
  } finally { await rm(rootDirectory, { recursive: true, force: true }); }
});

test("multiple active features use the latest website approval and retain every catalog entry", async () => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "glint-catalog-order-"));
  const secondId = "12dbd429-c17f-4aad-84f1-e2323c016528";
  try {
    const originalCatalogCount = (await loadReportCatalog({ rootDirectory })).length;
    for (const id of [reportId, secondId]) {
      const { preview } = await ingestUnsignedPublicationPreview(await syntheticZip(undefined, undefined, {
        reportId: id,
        slug: id === reportId ? "synthetic-package-test" : "second-synthetic-test",
        catalog: { featured: true, featuredUntil: null },
      }), { rootDirectory });
      await approvePublicationForLocalWebsite({
        reportId: id, revision: 1, packageFingerprint: preview.packageFingerprint, approveForWebsite: true,
      }, { rootDirectory });
    }
    const reports = await loadReportCatalog({ rootDirectory });
    assert.equal(reports.length, originalCatalogCount + 2);
    assert.equal(reports.find((report) => report.featured)?.id, secondId);
    assert.equal(new Set(reports.map((report) => report.id)).size, originalCatalogCount + 2);
  } finally { await rm(rootDirectory, { recursive: true, force: true }); }
});

test("website approval rejects missing approvals and tampered exact package fingerprints", async () => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "glint-approval-integrity-"));
  try {
    const { preview: staged } = await ingestUnsignedPublicationPreview(await syntheticZip(), { rootDirectory });
    const approved = await approvePublicationForLocalWebsite({
      reportId, revision: 1, packageFingerprint: staged.packageFingerprint, approveForWebsite: true,
    }, { rootDirectory });
    const file = path.join(rootDirectory, "content", "reports", reportId, "publication.json");
    const { approval, ...unsigned } = approved.publication;
    await writeFile(file, canonicalJson(unsigned));
    await assert.rejects(listApprovedPublications({ rootDirectory }));
    await assert.rejects(loadReportCatalog({ rootDirectory }));
    await writeFile(file, canonicalJson({ ...unsigned, approval: { ...approval, packageFingerprint: "f".repeat(64) } }));
    await assert.rejects(loadApprovedPublication(reportId, { rootDirectory }), /does not match/);
  } finally { await rm(rootDirectory, { recursive: true, force: true }); }
});

test("keeps stable report identity and rejects older or conflicting preview revisions", async () => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "glint-preview-identity-"));
  try {
    const latest = await syntheticZip(undefined, undefined, { revision: 2 });
    await ingestUnsignedPublicationPreview(latest, { rootDirectory });
    const storedPath = path.join(rootDirectory, "content", "report-previews", reportId, "publication.json");
    const before = await readFile(storedPath, "utf8");
    await assert.rejects(
      ingestUnsignedPublicationPreview(await syntheticZip(), { rootDirectory }),
      /is newer than package revision/,
    );
    await assert.rejects(
      ingestUnsignedPublicationPreview(
        await syntheticZip(undefined, undefined, { slug: "another-slug", revision: 3 }),
        { rootDirectory },
      ),
      /stable slug cannot change/,
    );
    await assert.rejects(
      ingestUnsignedPublicationPreview(
        await syntheticZip(undefined, undefined, { reportId: "861a178c-bb41-4df2-8c5e-5aff2f1d1b36" }),
        { rootDirectory },
      ),
      /already belongs to report/,
    );
    assert.equal(await readFile(storedPath, "utf8"), before);
  } finally {
    await rm(rootDirectory, { recursive: true, force: true });
  }
});

test("reserves identities already present in durable content without publishing a preview", async () => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "glint-preview-public-id-"));
  try {
    const directory = path.join(rootDirectory, "content", "reports", reportId);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "publication.json"), JSON.stringify({
      reportId,
      slug: "existing-public-slug",
    }));
    await assert.rejects(
      ingestUnsignedPublicationPreview(await syntheticZip(), { rootDirectory }),
      /stable slug cannot change/,
    );
    assert.equal(await loadPublicationPreview(reportId, { rootDirectory }), undefined);
  } finally {
    await rm(rootDirectory, { recursive: true, force: true });
  }
});

test("rejects damaged packages and added release approval without changing the existing preview", async () => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "glint-preview-invalid-"));
  try {
    const bytes = await syntheticZip();
    await ingestUnsignedPublicationPreview(bytes, { rootDirectory });
    const before = await loadPublicationPreview(reportId, { rootDirectory });
    const damaged = await JSZip.loadAsync(bytes);
    damaged.file(`assets/${imageHash}.png`, Buffer.from("Damaged asset"));
    await assert.rejects(
      ingestUnsignedPublicationPreview(await damaged.generateAsync({ type: "uint8array" }), { rootDirectory }),
      /Asset hash, MIME type, filename, or size is invalid/,
    );
    const signed = await JSZip.loadAsync(bytes);
    const publication = JSON.parse(await signed.file("publication.json")!.async("string"));
    publication.approval = { statementVersion: "1", confirmedAt: "2026-10-08T20:00:00Z" };
    signed.file("publication.json", JSON.stringify(publication));
    await assert.rejects(
      ingestUnsignedPublicationPreview(await signed.generateAsync({ type: "uint8array" }), { rootDirectory }),
    );
    assert.deepEqual(await loadPublicationPreview(reportId, { rootDirectory }), before);
  } finally {
    await rm(rootDirectory, { recursive: true, force: true });
  }
});

test("V1 stages and explicitly approves original chart images without structured data", async () => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "glint-preview-image-only-"));
  try {
    const result = await ingestUnsignedPublicationPreview(await syntheticZip(syntheticManifest("data-bearing")), { rootDirectory });
    const image = result.preview.manifest.blocks.find(block => block.type === "image");
    assert.equal(image?.contentKind, "data-bearing");
    assert.equal(image?.accessibleData, undefined);
    const approved = await approvePublicationForLocalWebsite({
      reportId, revision: result.preview.publication.revision,
      packageFingerprint: result.preview.packageFingerprint, approveForWebsite: true,
    }, { rootDirectory });
    assert.ok(approved);
    const stored = await loadApprovedPublication(reportId, { rootDirectory });
    assert.equal(stored?.manifest.blocks.find(block => block.type === "image")?.contentKind, "data-bearing");
  } finally {
    await rm(rootDirectory, { recursive: true, force: true });
  }
});

test("accepts structured bitmap equivalents and rejects incomplete data rows", async () => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "glint-preview-data-"));
  try {
    const manifest = syntheticManifest("non-data");
    const image = manifest.blocks.find((block) => block.type === "image");
    assert.ok(image);
    image.contentKind = "data-bearing";
    image.accessibleData = {
      sourceKind: "verified-upload",
      title: "Synthetic test coefficients",
      unit: "number",
      columns: ["Synthetic factor", "Coefficient"],
      rows: [{ id: "row-1", cells: ["Illustrative factor", "-0.12"] }],
      sha256: "b".repeat(64),
    };
    const result = await ingestUnsignedPublicationPreview(await syntheticZip(manifest), { rootDirectory });
    const stored = result.preview.manifest.blocks.find((block) => block.type === "image");
    assert.deepEqual(stored?.accessibleData, image.accessibleData);
    image.accessibleData.columns.push("Another synthetic column");
    await assert.rejects(
      ingestUnsignedPublicationPreview(await syntheticZip(manifest, undefined, { revision: 2 }), { rootDirectory }),
      /one cell per column/,
    );
  } finally {
    await rm(rootDirectory, { recursive: true, force: true });
  }
});

test("validates stored assets and original package provenance again before loading", async () => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "glint-preview-tamper-"));
  try {
    await ingestUnsignedPublicationPreview(await syntheticZip(), { rootDirectory });
    const assetPath = path.join(rootDirectory, "public", "report-preview-assets", reportId, `${imageHash}.png`);
    await writeFile(assetPath, Buffer.from("Corrupted stored bytes"));
    await assert.rejects(loadPublicationPreview(reportId, { rootDirectory }), /Stored preview asset is invalid/);
    await writeFile(assetPath, imageBytes);
    const recordPath = path.join(rootDirectory, "content", "report-previews", reportId, "preview.json");
    const record = JSON.parse(await readFile(recordPath, "utf8"));
    record.packageFingerprint = "c".repeat(64);
    await writeFile(recordPath, JSON.stringify(record));
    await assert.rejects(
      loadPublicationPreview(reportId, { rootDirectory }),
      /package fingerprint is inconsistent/,
    );
  } finally {
    await rm(rootDirectory, { recursive: true, force: true });
  }
});
test("stages an unsigned package outside public report content and loads a deployment preview", async () => {
  const rootDirectory = await mkdtemp(
    path.join(os.tmpdir(), "glint-publication-preview-"),
  );
  try {
    const zipBytes = await syntheticZip();
    const first = await ingestUnsignedPublicationPreview(zipBytes, {
      rootDirectory,
    });
    assert.equal(first.status, "staged");
    assert.ok(!("approval" in first.preview.publication));
    assert.equal(
      first.preview.manifest.blocks.find((block) => block.type === "image")
        ?.dataUrl,
      `/report-preview-assets/${reportId}/${imageHash}.png`,
    );
    assert.deepEqual(
      await readFile(
        path.join(
          rootDirectory,
          "public",
          "report-preview-assets",
          reportId,
          `${imageHash}.png`,
        ),
      ),
      imageBytes,
    );
    await assert.rejects(
      readFile(
        path.join(
          rootDirectory,
          "content",
          "reports",
          reportId,
          "publication.json",
        ),
      ),
    );
    const repeat = await ingestUnsignedPublicationPreview(zipBytes, {
      rootDirectory,
    });
    assert.equal(repeat.status, "unchanged");
    assert.deepEqual(
      await loadPublicationPreview(reportId, { rootDirectory }),
      repeat.preview,
    );
    const storedManifestPath = path.join(
      rootDirectory,
      "content",
      "report-previews",
      reportId,
      "manifest.json",
    );
    const storedManifest = JSON.parse(
      await readFile(storedManifestPath, "utf8"),
    );
    storedManifest.metadata.title = "Tampered title";
    await writeFile(storedManifestPath, JSON.stringify(storedManifest));
    await assert.rejects(
      loadPublicationPreview(reportId, { rootDirectory }),
      /Stored preview content is inconsistent/,
    );
  } finally {
    await rm(rootDirectory, { recursive: true, force: true });
  }
});

test("rejects same-revision conflicts and accepts automatic Word images without classification", async () => {
  const rootDirectory = await mkdtemp(
    path.join(os.tmpdir(), "glint-publication-preview-"),
  );
  const unclassifiedRoot = await mkdtemp(
    path.join(os.tmpdir(), "glint-no-kind-"),
  );
  try {
    await ingestUnsignedPublicationPreview(
      await syntheticZip(syntheticManifest("non-data")),
      {
        rootDirectory,
      },
    );
    await assert.rejects(
      ingestUnsignedPublicationPreview(
        await syntheticZip(
          syntheticManifest("non-data"),
          "Conflicting same-revision summary.",
        ),
        { rootDirectory },
      ),
      /conflicts with different package content/,
    );
    const automatic = await ingestUnsignedPublicationPreview(
        await syntheticZip(syntheticManifest(undefined)),
        { rootDirectory: unclassifiedRoot },
    );
    assert.equal(automatic.preview.manifest.blocks.find(block => block.type === "image")?.contentKind, undefined);
  } finally {
    await rm(rootDirectory, { recursive: true, force: true });
    await rm(unclassifiedRoot, { recursive: true, force: true });
  }
});
