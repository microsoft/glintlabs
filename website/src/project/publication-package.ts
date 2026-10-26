import JSZip from "jszip";
import { z } from "zod";

import {
  canonicalJson,
  evaluateApprovedContentIntegrity,
  sha256Text,
  snapshotApprovedContent,
} from "../integrity/approved-content.ts";
import { reportManifestSchema } from "../manifest/report-manifest.ts";
import { reportStyleSchema } from "../report-system/report-style.ts";
import {
  publicationDateSchema,
  applyImageReview,
  publicationImageReviewSchema,
  publicationMetadataSchema,
  sha256Schema,
  type PublicationImageReview,
  type PublicationPreparation,
} from "./publication-preparation.ts";
import { parseStudioProject, type StudioProject } from "./studio-project.ts";
import { estimateReportReadingTime } from "./report-reading-time.ts";
import { needsImageDescription, publicationDetailsIssues } from "./publication-flow.ts";

const assetPathSchema = z.string().regex(/^assets\/[a-f0-9]{64}\.(png|jpg|webp|gif)$/);
const mimeTypeSchema = z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]);
export const publicationAssetSchema = z.object({
  path: assetPathSchema,
  sha256: sha256Schema,
  mimeType: mimeTypeSchema,
  sizeBytes: z.number().int().positive(),
}).strict();

// Preparation is unsigned. Only the website's explicit release workflow adds approval.
export const draftPublicationSchema = z.object({
  schemaVersion: z.literal("1"),
  reportId: z.string().uuid(),
  slug: publicationMetadataSchema.shape.slug,
  revision: z.number().int().positive(),
  reportStyle: reportStyleSchema,
  manifestFile: z.literal("manifest.json"),
  title: publicationMetadataSchema.shape.title,
  summary: publicationMetadataSchema.shape.summary,
  eyebrow: publicationMetadataSchema.shape.eyebrow,
  displayDate: publicationDateSchema,
  author: publicationMetadataSchema.shape.author,
  readTimeMinutes: z.number().int().positive(),
  employeeCount: publicationMetadataSchema.shape.employeeCount,
  topics: z.array(z.string().trim().min(1)).max(3),
  thumbnail: z.object({
    assetPath: assetPathSchema,
    alt: z.string().trim().min(1),
    presentation: publicationMetadataSchema.shape.thumbnail.shape.presentation,
  }).strict(),
  catalog: publicationMetadataSchema.shape.catalog,
  provenance: z.object({
    sourceSha256: sha256Schema,
    approvedContentSha256: sha256Schema,
  }).strict(),
  assets: z.array(publicationAssetSchema).min(1),
}).strict();

export type DraftPublication = z.infer<typeof draftPublicationSchema>;
type PublicationAsset = z.infer<typeof publicationAssetSchema>;
export type PublicationReadinessIssue = { field: string; message: string };
export type AssetReader = (source: string) => Promise<{ bytes: Uint8Array; mimeType: string }>;

export function publicationReadiness(
  project: StudioProject,
  metadata: unknown,
  imageReviews: readonly PublicationImageReview[],
): PublicationReadinessIssue[] {
  const issues: PublicationReadinessIssue[] = [];
  issues.push(...publicationDetailsIssues(metadata));
  const integrity = evaluateApprovedContentIntegrity(project.manifest, project.approvedContent);
  if (integrity.status !== "intact") {
    issues.push({ field: "integrity", message: integrity.message });
  }
  for (const issue of project.manifest.reviewItems) {
    if (issue.severity === "blocker") {
      issues.push({ field: issue.blockId ?? "review", message: issue.message });
    }
  }
  const sourceEvidence = project.publicationSourceEvidence;
  if (!sourceEvidence || sourceEvidence.sourceSha256 !== project.manifest.source.sha256) {
    issues.push({
      field: "source",
      message: "Re-import the Word source to check whether its hyperlinks can be preserved.",
    });
  } else if (sourceEvidence.hyperlinkCount > 0 && (
    sourceEvidence.representedHyperlinkCount !== sourceEvidence.hyperlinkCount ||
    project.manifest.blocks.reduce((count, block) => count +
      (block.type === "paragraph" || block.type === "list-item" ? block.links?.length ?? 0
        : block.type === "references" ? block.references.filter((reference) => reference.href).length : 0), 0) !== sourceEvidence.hyperlinkCount
  )) {
    issues.push({
      field: "hyperlinks",
      message: `${sourceEvidence.hyperlinkCount} source hyperlinks must all be retained. Re-import the Word document and review any unsupported links.`,
    });
  }
  for (const block of project.manifest.blocks) {
    if (block.type === "unsupported" || block.type === "visual-placeholder") {
      issues.push({ field: block.id, message: "Resolve this unsupported content or visual placeholder before export." });
    }
    if (block.type !== "image") {
      continue;
    }
    const review = imageReviews.find((item) => item.blockId === block.id);
    if (block.accessibleData && review && (review.kind === "non-data" ||
      (review.kind === "data-bearing" && !review.accessibleData))) {
      issues.push({ field: block.id, message: "Keep this image's included source data and review it before exporting." });
    }
    if (needsImageDescription(review?.description ?? block.alt)) {
      issues.push({ field: block.id, message: "This image needs a description of what it communicates." });
    }
    if (!block.sourceAssetSha256) {
      issues.push({ field: block.id, message: "This image needs a verified source asset hash." });
    }
    if (
      review && (
      !publicationImageReviewSchema.safeParse(review).success ||
      review.assetSha256 !== block.sourceAssetSha256
      )
    ) {
      issues.push({ field: block.id, message: `Saved image settings for ${block.fileName} do not match its current source asset.` });
    }
    const data = review?.accessibleData ?? block.accessibleData;
    if (data && data.rows.some(row => row.cells.length !== data.columns.length)) {
      issues.push({
        field: block.id,
        message: "Each chart data row must have one cell per column.",
      });
    }
  }
  return issues;
}

function mimeFromBytes(bytes: Uint8Array): z.infer<typeof mimeTypeSchema> {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) {
    return "image/png";
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return "image/jpeg";
  }
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return "image/webp";
  }
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") {
    return "image/gif";
  }
  throw new Error("An asset is not a supported image. Use PNG, JPEG, WebP, or GIF.");
}

async function hashBytes(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readImage(source: string, readAsset?: AssetReader) {
  if (source.startsWith("data:")) {
    const match = source.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$/);
    if (!match) {
      throw new Error("An embedded image has an unsupported MIME type or invalid base64 encoding.");
    }
    return { bytes: Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0)), mimeType: match[1] };
  }
  if (
    !/^\/[A-Za-z0-9][A-Za-z0-9/_. -]*$/.test(source) ||
    source.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error("Assets must be embedded images or same-site file paths, not temporary, external, or machine-local URLs.");
  }
  if (!readAsset) {
    throw new Error(`Asset bytes are required for ${source}.`);
  }
  return readAsset(source);
}

function assetExtension(mimeType: z.infer<typeof mimeTypeSchema>) {
  return { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" }[mimeType];
}

async function imageReferences(value: unknown, visit: (source: string, hash?: string) => Promise<string>): Promise<unknown> {
  if (Array.isArray(value)) {
    const items: unknown[] = [];
    for (const item of value) {
      items.push(await imageReferences(item, visit));
    }
    return items;
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  const result: Record<string, unknown> = {};
  const sourceHash = "sourceAssetSha256" in value && typeof value.sourceAssetSha256 === "string"
    ? value.sourceAssetSha256
    : undefined;
  for (const [key, child] of Object.entries(value)) {
    result[key] = key === "dataUrl" && typeof child === "string"
      ? await visit(child, sourceHash)
      : await imageReferences(child, visit);
  }
  return result;
}

export async function preparePublicationPackage({
  project: inputProject,
  metadata: inputMetadata,
  imageReviews,
  readAsset,
}: {
  project: StudioProject;
  metadata: unknown;
  imageReviews: readonly PublicationImageReview[];
  readAsset?: AssetReader;
}) {
  const project = parseStudioProject(inputProject);
  const issues = publicationReadiness(project, inputMetadata, imageReviews);
  if (issues.length > 0) {
    throw new Error(`Publication package is not ready:\n${issues.map((issue) => `${issue.field}: ${issue.message}`).join("\n")}`);
  }
  const metadata = {
    ...publicationMetadataSchema.parse(inputMetadata),
    readTimeMinutes: estimateReportReadingTime(project.manifest),
  };
  const approvedContent = project.approvedContent;
  if (!approvedContent || await sha256Text(canonicalJson(approvedContent.snapshot)) !== approvedContent.sha256) {
    throw new Error("The approved-content snapshot hash is invalid. Re-import the reviewed source.");
  }
  const annotatedManifest = reportManifestSchema.parse({
    ...project.manifest,
    blocks: project.manifest.blocks.map((block) => {
      if (block.type !== "image") return block;
      const review = imageReviews.find((item) => item.blockId === block.id);
      return applyImageReview(block, review);
    }),
  });
  const reviewedContentSha256 = await sha256Text(canonicalJson(snapshotApprovedContent(annotatedManifest)));
  const files = new Map<string, { descriptor: PublicationAsset; bytes: Uint8Array }>();
  const sources = new Map<string, PublicationAsset>();
  async function includeImage(source: string, expectedHash?: string) {
    let descriptor = sources.get(source);
    if (!descriptor) {
      const image = await readImage(source, readAsset);
      const mimeType = mimeFromBytes(image.bytes);
      if (mimeType !== image.mimeType.split(";")[0].trim().toLowerCase()) {
        throw new Error(`Image bytes do not match their declared MIME type: ${source.startsWith("data:") ? "embedded image" : source}.`);
      }
      const sha256 = await hashBytes(image.bytes);
      descriptor = publicationAssetSchema.parse({
        path: `assets/${sha256}.${assetExtension(mimeType)}`,
        sha256,
        mimeType,
        sizeBytes: image.bytes.length,
      });
      files.set(descriptor.path, { descriptor, bytes: image.bytes });
      sources.set(source, descriptor);
    }
    if (expectedHash && expectedHash !== descriptor.sha256) {
      throw new Error("Image bytes no longer match their source asset hash.");
    }
    return descriptor;
  }
  const rewritten = await imageReferences(annotatedManifest, async (source, sourceHash) => {
    const asset = await includeImage(source, sourceHash);
    return `/${asset.path}`;
  });
  const manifest = reportManifestSchema.parse({
    ...reportManifestSchema.parse(rewritten),
    metadata: {
      title: metadata.title,
      status: "draft",
      author: metadata.author,
      publishedDate: metadata.displayDate,
      readTimeMinutes: metadata.readTimeMinutes,
      topics: metadata.topics,
    },
  });
  if (await sha256Text(canonicalJson(snapshotApprovedContent(manifest))) !== reviewedContentSha256) {
    throw new Error("Packaging changed approved report semantics. Re-import the source and review the asset evidence.");
  }
  const thumbnail = await includeImage(metadata.thumbnail.source);
  const assets = [...files.values()].map((file) => file.descriptor).sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const envelope = {
    schemaVersion: "1",
    reportId: project.id,
    slug: metadata.slug,
    reportStyle: project.reportStyle,
    manifestFile: "manifest.json",
    title: metadata.title,
    summary: metadata.summary,
    eyebrow: metadata.eyebrow,
    displayDate: metadata.displayDate,
    author: metadata.author,
    readTimeMinutes: metadata.readTimeMinutes,
    topics: metadata.topics,
    ...(metadata.employeeCount !== undefined ? { employeeCount: metadata.employeeCount } : {}),
    thumbnail: {
      assetPath: thumbnail.path, alt: metadata.thumbnail.alt,
      ...(metadata.thumbnail.presentation ? { presentation: metadata.thumbnail.presentation } : {}),
    },
    catalog: metadata.catalog,
    provenance: {
      sourceSha256: manifest.source.sha256,
      approvedContentSha256: reviewedContentSha256,
    },
    assets,
  };
  const fingerprint = await sha256Text(canonicalJson({ publication: envelope, manifest }));
  const previous = project.publicationPreparation?.lastPackage;
  const revision = previous
    ? previous.fingerprint === fingerprint ? previous.revision : previous.revision + 1
    : 1;
  const publication = draftPublicationSchema.parse({ ...envelope, revision });
  const zip = new JSZip();
  const zipOptions = { date: new Date("1980-01-01T00:00:00.000Z"), createFolders: false };
  zip.file("publication.json", `${canonicalJson(publication)}\n`, zipOptions);
  zip.file("manifest.json", `${canonicalJson(manifest)}\n`, zipOptions);
  for (const asset of assets) {
    zip.file(asset.path, files.get(asset.path)!.bytes, zipOptions);
  }
  const zipBytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  await validateDraftPublicationPackage(zipBytes);
  const preparation: PublicationPreparation = {
    metadata,
    imageReviews: [...imageReviews],
    lastPackage: { revision, fingerprint },
  };
  return { zipBytes, publication, manifest, preparation, fileName: `${metadata.slug}-r${revision}.zip` };
}

export async function validateDraftPublicationPackage(zipBytes: Uint8Array) {
  const zip = await JSZip.loadAsync(zipBytes, { checkCRC32: true });
  const publicationEntry = zip.file("publication.json");
  const manifestEntry = zip.file("manifest.json");
  if (!publicationEntry || !manifestEntry) {
    throw new Error("The package must contain publication.json and manifest.json.");
  }
  const publication = draftPublicationSchema.parse(JSON.parse(await publicationEntry.async("string")));
  const manifest = reportManifestSchema.parse(JSON.parse(await manifestEntry.async("string")));
  if (manifest.reviewItems.some((issue) => issue.severity === "blocker") ||
    manifest.blocks.some((block) => block.type === "unsupported" || block.type === "visual-placeholder")) {
    throw new Error("The package contains unresolved blocking content.");
  }
  if (
    manifest.source.sha256 !== publication.provenance.sourceSha256 ||
    await sha256Text(canonicalJson(snapshotApprovedContent(manifest))) !== publication.provenance.approvedContentSha256
  ) {
    throw new Error("Package content does not match its source and approved-content provenance.");
  }
  if (
    manifest.metadata.title !== publication.title ||
    manifest.metadata.publishedDate !== publication.displayDate ||
    manifest.metadata.readTimeMinutes !== publication.readTimeMinutes ||
    canonicalJson(manifest.metadata.author) !== canonicalJson(publication.author) ||
    canonicalJson(manifest.metadata.topics) !== canonicalJson(publication.topics)
  ) {
    throw new Error("Publication and manifest metadata must match.");
  }
  const assets = new Map<string, PublicationAsset>();
  for (const asset of publication.assets) {
    if (assets.has(asset.path)) {
      throw new Error("The package declares a duplicate asset.");
    }
    const entry = zip.file(asset.path);
    if (!entry) {
      throw new Error(`Missing package asset: ${asset.path}.`);
    }
    const bytes = await entry.async("uint8array");
    if (
      await hashBytes(bytes) !== asset.sha256 ||
      bytes.length !== asset.sizeBytes ||
      mimeFromBytes(bytes) !== asset.mimeType ||
      asset.path !== `assets/${asset.sha256}.${assetExtension(asset.mimeType)}`
    ) {
      throw new Error(`Asset hash, MIME type, filename, or size is invalid: ${asset.path}.`);
    }
    assets.set(asset.path, asset);
  }
  const referenced = new Set([publication.thumbnail.assetPath]);
  if (!assets.has(publication.thumbnail.assetPath)) {
    throw new Error("The thumbnail asset is not declared.");
  }
  await imageReferences(manifest, async (source, sourceHash) => {
    const asset = assets.get(source.slice(1));
    if (!source.startsWith("/assets/") || !asset || (sourceHash && sourceHash !== asset.sha256)) {
      throw new Error("A manifest image does not reference its declared package asset.");
    }
    referenced.add(asset.path);
    return source;
  });
  const actualEntries = Object.values(zip.files).filter((entry) => !entry.dir).map((entry) => entry.name).sort();
  const expectedEntries = ["publication.json", "manifest.json", ...assets.keys()].sort();
  if (canonicalJson(actualEntries) !== canonicalJson(expectedEntries) || referenced.size !== assets.size) {
    throw new Error("The ZIP contains undeclared files or unreferenced assets.");
  }
  return { publication, manifest };
}
