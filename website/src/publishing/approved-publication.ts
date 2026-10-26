import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { z } from "zod";

import { canonicalJson } from "../integrity/approved-content.ts";
import { reportManifestSchema } from "../manifest/report-manifest.ts";
import { draftPublicationSchema, validateDraftPublicationPackage } from "../project/publication-package.ts";
import { OwnerRequestError } from "./owner-access.ts";
import {
  loadPublicationPreview,
  replacePublicationDirectories,
  rewriteAssetReferences,
  validateWebsitePreviewManifest,
} from "./publication-preview.ts";

export const websiteApprovalSchema = z.object({
  statementVersion: z.literal("1"),
  confirmedAt: z.string().datetime(),
  packageFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export const approvedPublicationSchema = draftPublicationSchema.extend({ approval: websiteApprovalSchema });
export const approveWebsiteRequestSchema = z.object({
  reportId: z.string().uuid(),
  revision: z.number().int().positive(),
  packageFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  approveForWebsite: z.literal(true),
}).strict();
type Options = { rootDirectory?: string };

async function directories(root: string) {
  try { return await readdir(path.join(root, "content", "reports"), { withFileTypes: true }); }
  catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

export async function loadApprovedPublication(reportId: string, options: Options = {}) {
  if (!z.string().uuid().safeParse(reportId).success) throw new OwnerRequestError("Choose a valid report.", 400);
  const root = path.resolve(options.rootDirectory ?? process.cwd());
  const directory = path.join(root, "content", "reports", reportId);
  let publicationText: string;
  try { publicationText = await readFile(path.join(directory, "publication.json"), "utf8"); }
  catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
  const publication = approvedPublicationSchema.parse(JSON.parse(publicationText));
  if (publication.reportId !== reportId) throw new Error("Stored publication identity does not match its directory.");
  const manifest = reportManifestSchema.parse(JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8")));
  validateWebsitePreviewManifest(manifest);
  const packageManifest = reportManifestSchema.parse(rewriteAssetReferences(
    manifest, `/reports-assets/${reportId}/`, "/assets/",
  ));
  const { approval, ...draft } = publication;
  const zip = new JSZip();
  zip.file("publication.json", canonicalJson(draft));
  zip.file("manifest.json", canonicalJson(packageManifest));
  for (const asset of draft.assets) {
    zip.file(asset.path, await readFile(path.join(root, "public", "reports-assets", reportId, path.basename(asset.path))));
  }
  await validateDraftPublicationPackage(await zip.generateAsync({ type: "uint8array" }));
  const fingerprint = createHash("sha256").update(canonicalJson({ manifest: packageManifest, publication: draft })).digest("hex");
  if (fingerprint !== approval.packageFingerprint) throw new Error("Website approval does not match this exact report revision.");
  return { publication, manifest };
}

export async function listApprovedPublications(options: Options = {}) {
  const root = path.resolve(options.rootDirectory ?? process.cwd());
  const ids = (await directories(root)).filter((entry) =>
    entry.isDirectory() && !entry.name.startsWith(".") && !entry.name.includes(".backup-"),
  ).map((entry) => {
    if (!z.string().uuid().safeParse(entry.name).success) throw new Error(`Invalid publication directory: ${entry.name}.`);
    return entry.name;
  }).sort();
  const reports = await Promise.all(ids.map(async (id) => {
    const report = await loadApprovedPublication(id, { rootDirectory: root });
    if (!report) throw new Error(`Report ${id} is incomplete.`);
    return report;
  }));
  const slugs = new Set<string>();
  for (const report of reports) {
    if (slugs.has(report.publication.slug)) throw new Error("Multiple approved reports own the same slug.");
    slugs.add(report.publication.slug);
  }
  return reports;
}

export async function approvePublicationForLocalWebsite(input: unknown, options: Options = {}) {
  const request = approveWebsiteRequestSchema.parse(input);
  const root = path.resolve(options.rootDirectory ?? process.cwd());
  const lockPath = path.join(root, ".publication-preview.lock");
  const lock = await open(lockPath, "wx").catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      throw new OwnerRequestError("Another report is being saved. Try again when it finishes.", 409);
    }
    throw error;
  });
  try {
    const preview = await loadPublicationPreview(request.reportId, { rootDirectory: root });
    if (!preview) throw new OwnerRequestError("Stage the report for review before publishing.", 404);
    if (preview.publication.revision !== request.revision || preview.packageFingerprint !== request.packageFingerprint) {
      throw new OwnerRequestError("The report changed after staging. Review the latest revision before publishing.", 409);
    }
    const existing = await listApprovedPublications({ rootDirectory: root });
    for (const report of existing) {
      if ((report.publication.reportId === request.reportId && report.publication.slug !== preview.publication.slug) ||
          (report.publication.slug === preview.publication.slug && report.publication.reportId !== request.reportId)) {
        throw new OwnerRequestError("This report ID or address belongs to another report.", 409);
      }
    }
    const prior = existing.find((report) => report.publication.reportId === request.reportId);
    if (prior && prior.publication.revision >= request.revision) {
      if (prior.publication.approval.packageFingerprint === request.packageFingerprint) return prior;
      throw new OwnerRequestError("A newer or conflicting revision is already on the website.", 409);
    }
    const publication = approvedPublicationSchema.parse({
      ...preview.publication,
      approval: { statementVersion: "1", confirmedAt: new Date().toISOString(), packageFingerprint: request.packageFingerprint },
    });
    const manifest = reportManifestSchema.parse(rewriteAssetReferences(
      preview.manifest, `/report-preview-assets/${request.reportId}/`, `/reports-assets/${request.reportId}/`,
    ));
    const token = randomUUID();
    const contentRoot = path.join(root, "content", "reports");
    const assetRoot = path.join(root, "public", "reports-assets");
    const contentStage = path.join(contentRoot, `.${request.reportId}-${token}`);
    const assetStage = path.join(assetRoot, `.${request.reportId}-${token}`);
    try {
      await mkdir(contentStage, { recursive: true });
      await mkdir(assetStage, { recursive: true });
      await writeFile(path.join(contentStage, "publication.json"), `${canonicalJson(publication)}\n`);
      await writeFile(path.join(contentStage, "manifest.json"), `${canonicalJson(manifest)}\n`);
      for (const asset of publication.assets) {
        const bytes = await readFile(path.join(root, "public", "report-preview-assets", request.reportId, path.basename(asset.path)));
        if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256 || bytes.length !== asset.sizeBytes) {
          throw new Error("An asset changed during publication. Stage and review the report again.");
        }
        await writeFile(path.join(assetStage, path.basename(asset.path)), bytes);
      }
      await replacePublicationDirectories({
        contentStage, assetStage,
        contentTarget: path.join(contentRoot, request.reportId),
        assetTarget: path.join(assetRoot, request.reportId),
      });
    } catch (error) {
      await rm(contentStage, { recursive: true, force: true });
      await rm(assetStage, { recursive: true, force: true });
      throw error;
    }
    return { publication, manifest };
  } finally { await lock.close(); await rm(lockPath); }
}
