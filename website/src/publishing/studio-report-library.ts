import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, createApprovedContentRecord, sha256Text } from "../integrity/approved-content.ts";
import { reportManifestSchema } from "../manifest/report-manifest.ts";
import { createStudioProject, publicationEditingFingerprint } from "../project/studio-project.ts";
import { publishedReportSummarySchema } from "../project/report-library.ts";
import type { loadApprovedPublication } from "./approved-publication.ts";
import { rewriteAssetReferences } from "./publication-preview.ts";
import { getLaunchReport } from "../launch-reports/reports.ts";
import { publicationCatalogItem } from "./report-catalog.ts";

type ApprovedReport = NonNullable<Awaited<ReturnType<typeof loadApprovedPublication>>>;

export function publishedReportSummary({ publication, homepage }: ApprovedReport) {
  return publishedReportSummarySchema.required({ homepage: true }).parse({
    id: publication.reportId, title: publication.title, slug: publication.slug,
    summary: getLaunchReport(publication.slug)?.catalog.description ?? publication.summary,
    revision: publication.revision, packageFingerprint: publication.approval.packageFingerprint,
    updatedAt: publication.approval.confirmedAt, displayDate: publication.displayDate,
    eyebrow: publication.eyebrow, employeeCount: publication.employeeCount, homepage,
    thumbnail: getLaunchReport(publication.slug)?.catalog.thumbnail ?? publicationCatalogItem(publication).thumbnail,
  });
}

export async function restorePublishedStudioProject(
  { publication, manifest }: ApprovedReport, options: { rootDirectory?: string } = {},
) {
  const { approval, revision, ...envelope } = publication;
  const packageManifest = rewriteAssetReferences(manifest, `/reports-assets/${publication.reportId}/`, "/assets/");
  const root = path.resolve(options.rootDirectory ?? process.cwd());
  const retainedAssets = new Map<string, string>();
  let retained: unknown = manifest;
  for (const asset of publication.assets) {
    const bytes = await readFile(path.join(root, "public", "reports-assets", publication.reportId, path.basename(asset.path)));
    if (bytes.length !== asset.sizeBytes || createHash("sha256").update(bytes).digest("hex") !== asset.sha256) {
      throw new Error("A published image changed. Refresh your reports before opening this copy.");
    }
    const url = `/reports-assets/${publication.reportId}/${path.basename(asset.path)}`;
    const embedded = `data:${asset.mimeType};base64,${bytes.toString("base64")}`;
    retainedAssets.set(url, embedded);
    retained = rewriteAssetReferences(retained, url, embedded);
  }
  const retainedManifest = reportManifestSchema.parse(retained);
  const thumbnailSource = retainedAssets.get(`/reports-assets/${publication.reportId}/${path.basename(publication.thumbnail.assetPath)}`);
  if (!thumbnailSource) throw new Error("The published thumbnail could not be retained.");
  const project = createStudioProject({
    id: publication.reportId,
    manifest: retainedManifest, sourceManifest: retainedManifest, reportStyle: publication.reportStyle,
    importedManifestSha256: await sha256Text(canonicalJson(retainedManifest)),
    approvedContent: await createApprovedContentRecord(retainedManifest),
    status: "draft",
    publicationPreparation: {
      metadata: {
        slug: publication.slug, title: publication.title, summary: publication.summary,
        eyebrow: publication.eyebrow, displayDate: publication.displayDate, author: publication.author,
        readTimeMinutes: publication.readTimeMinutes, employeeCount: publication.employeeCount,
        topics: publication.topics, catalog: publication.catalog,
        thumbnail: {
          source: thumbnailSource,
          alt: publication.thumbnail.alt, presentation: publication.thumbnail.presentation,
        },
      },
      imageReviews: [],
      lastPackage: {
        revision, fingerprint: await sha256Text(canonicalJson({ publication: envelope, manifest: packageManifest })),
      },
    },
  });
  project.websitePublication = {
    revision, packageFingerprint: approval.packageFingerprint,
    editingFingerprint: await publicationEditingFingerprint(project),
  };
  return project;
}

export async function restorePublishedReaderStudioProject(
  report: ApprovedReport, options: { rootDirectory?: string } = {},
) {
  const project = await restorePublishedStudioProject(report, options);
  const launch = getLaunchReport(report.publication.slug);
  if (!launch) return project;
  const root = path.resolve(options.rootDirectory ?? process.cwd());
  const retainedImages = new Map<string, string>();
  for (const block of launch.manifest.blocks) {
    if (block.type !== "image") continue;
    const fileName = path.basename(block.dataUrl);
    const bytes = await readFile(path.join(root, "src", "launch-reports", "assets", launch.slug, fileName));
    if (createHash("sha256").update(bytes).digest("hex") !== block.sourceAssetSha256) {
      throw new Error("A published reader image changed. Your local draft was kept.");
    }
    const extension = path.extname(fileName).toLowerCase();
    const mimeType = extension === ".jpeg" || extension === ".jpg" ? "image/jpeg"
      : extension === ".png" ? "image/png" : extension === ".gif" ? "image/gif"
        : extension === ".webp" ? "image/webp" : undefined;
    if (!mimeType) throw new Error("A published reader image couldn't be retained. Your local draft was kept.");
    retainedImages.set(block.id, `data:${mimeType};base64,${bytes.toString("base64")}`);
  }
  project.sourceManifest = reportManifestSchema.parse({
    ...launch.sourceManifest,
    blocks: launch.sourceManifest.blocks.map(block => block.type === "image"
      ? { ...block, dataUrl: retainedImages.get(block.id)! } : block),
  });
  project.importedManifestSha256 = await sha256Text(canonicalJson(project.sourceManifest));
  project.manifest = reportManifestSchema.parse({
    ...launch.manifest,
    metadata: {
      ...launch.manifest.metadata, publishedDate: launch.isoDate,
      employeeCount: launch.catalog.employeeCount,
    },
    blocks: launch.manifest.blocks.map(block => {
      if (block.type === "image") return { ...block, dataUrl: retainedImages.get(block.id)! };
      const runs = launch.textRuns[block.id];
      if (!runs || !("text" in block)) return block;
      let position = 0;
      const marks = runs.flatMap(run => {
        const start = position;
        position += run.text.length;
        return position > start && (run.bold || run.italic || run.superscript) ? [{
          start, end: position, ...(run.bold ? { bold: true as const } : {}),
          ...(run.italic ? { italic: true as const } : {}),
          ...(run.superscript ? { superscript: true as const } : {}),
        }] : [];
      });
      return { ...block, marks };
    }),
    readerPresentation: {
      showCoverDetails: true, figureDescriptions: launch.descriptions,
      orderedListBlockIds: [...launch.orderedListBlockIds],
      referenceBlockIds: [...launch.referenceBlockIds],
      rowHeaderTableBlockIds: [...launch.rowHeaderTableBlockIds],
    },
  });
  project.approvedContent = await createApprovedContentRecord(project.manifest);
  const preparation = project.publicationPreparation!;
  preparation.metadata = {
    ...preparation.metadata, title: project.manifest.metadata.title,
    summary: launch.catalog.description, displayDate: launch.isoDate,
    employeeCount: launch.catalog.employeeCount,
  };
  project.reportStyle = "new-fluent-colors";
  project.websitePublication!.editingFingerprint = await publicationEditingFingerprint(project);
  return project;
}
