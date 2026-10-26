import { createHash, randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";
import { z } from "zod";

import { canonicalJson } from "../integrity/approved-content.ts";
import {
  reportManifestSchema,
  type ReportManifest,
} from "../manifest/report-manifest.ts";
import {
  draftPublicationSchema,
  validateDraftPublicationPackage,
} from "../project/publication-package.ts";

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const previewRecordSchema = z.object({
  schemaVersion: z.literal("1"),
  packageFingerprint: sha256Schema,
  stagedFingerprint: sha256Schema,
  publication: draftPublicationSchema,
}).strict();

export type PublicationPreview = {
  manifest: ReportManifest;
  packageFingerprint: string;
  publication: z.infer<typeof draftPublicationSchema>;
};

type IngestOptions = {
  rootDirectory?: string;
};

function previewContentRoot(rootDirectory: string) {
  return path.join(rootDirectory, "content", "report-previews");
}

function previewAssetRoot(rootDirectory: string) {
  return path.join(rootDirectory, "public", "report-preview-assets");
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function packageFingerprint(
  publication: z.infer<typeof draftPublicationSchema>,
  manifest: ReportManifest,
) {
  return createHash("sha256")
    .update(canonicalJson({ manifest, publication }))
    .digest("hex");
}

export function rewriteAssetReferences(
  value: unknown,
  fromPrefix: string,
  toPrefix: string,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteAssetReferences(item, fromPrefix, toPrefix));
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      if (
        key === "dataUrl" &&
        typeof child === "string" &&
        child.startsWith(fromPrefix)
      ) {
        return [
          key,
          `${toPrefix}${child.slice(fromPrefix.length)}`,
        ];
      }
      return [key, rewriteAssetReferences(child, fromPrefix, toPrefix)];
    }),
  );
}

export function validateWebsitePreviewManifest(manifest: ReportManifest) {
  for (const block of manifest.blocks) {
    if (block.type !== "image") {
      continue;
    }
    if (
      block.accessibleData &&
      block.accessibleData.rows.some(
        (row) => row.cells.length !== block.accessibleData!.columns.length,
      )
    ) {
      throw new Error(
        `Accessible data for image ${block.id} must have one cell per column.`,
      );
    }
  }
}

async function readIdentityRecords(directory: string) {
  if (!(await exists(directory))) {
    return [] as { reportId: string; slug: string }[];
  }
  const records: { reportId: string; slug: string }[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const publicationPath = path.join(
      directory,
      entry.name,
      "publication.json",
    );
    if (!(await exists(publicationPath))) {
      continue;
    }
    const value = JSON.parse(await readFile(publicationPath, "utf8")) as {
      reportId?: unknown;
      slug?: unknown;
    };
    if (typeof value.reportId !== "string" || typeof value.slug !== "string") {
      throw new Error(`Stored publication identity is invalid: ${publicationPath}.`);
    }
    records.push({ reportId: value.reportId, slug: value.slug });
  }
  return records;
}

async function assertIdentityAvailable(
  rootDirectory: string,
  reportId: string,
  slug: string,
) {
  const records = [
    ...(await readIdentityRecords(
      path.join(rootDirectory, "content", "reports"),
    )),
    ...(await readIdentityRecords(previewContentRoot(rootDirectory))),
  ];
  const idConflict = records.find(
    (record) => record.reportId === reportId && record.slug !== slug,
  );
  if (idConflict) {
    throw new Error(
      `Report ${reportId} already owns slug ${idConflict.slug}; its stable slug cannot change.`,
    );
  }
  const slugConflict = records.find(
    (record) => record.slug === slug && record.reportId !== reportId,
  );
  if (slugConflict) {
    throw new Error(
      `Slug ${slug} already belongs to report ${slugConflict.reportId}.`,
    );
  }
}

export async function replacePublicationDirectories({
  assetStage,
  assetTarget,
  contentStage,
  contentTarget,
}: {
  assetStage: string;
  assetTarget: string;
  contentStage: string;
  contentTarget: string;
}) {
  const suffix = `.backup-${randomUUID()}`;
  const contentBackup = `${contentTarget}${suffix}`;
  const assetBackup = `${assetTarget}${suffix}`;
  const hadContent = await exists(contentTarget);
  const hadAssets = await exists(assetTarget);
  let contentInstalled = false;
  let assetsInstalled = false;

  try {
    if (hadContent) {
      await rename(contentTarget, contentBackup);
    }
    if (hadAssets) {
      await rename(assetTarget, assetBackup);
    }
    await rename(contentStage, contentTarget);
    contentInstalled = true;
    await rename(assetStage, assetTarget);
    assetsInstalled = true;
  } catch (error) {
    if (assetsInstalled) {
      await rm(assetTarget, { recursive: true, force: true });
    }
    if (contentInstalled) {
      await rm(contentTarget, { recursive: true, force: true });
    }
    if (hadContent && (await exists(contentBackup))) {
      await rename(contentBackup, contentTarget);
    }
    if (hadAssets && (await exists(assetBackup))) {
      await rename(assetBackup, assetTarget);
    }
    throw error;
  } finally {
    await rm(contentStage, { recursive: true, force: true });
    await rm(assetStage, { recursive: true, force: true });
  }
  if (hadContent) {
    await rm(contentBackup, { recursive: true, force: true });
  }
  if (hadAssets) {
    await rm(assetBackup, { recursive: true, force: true });
  }
}

export async function ingestUnsignedPublicationPreview(
  zipBytes: Uint8Array,
  options: IngestOptions = {},
) {
  const rootDirectory = path.resolve(options.rootDirectory ?? process.cwd());
  const validated = await validateDraftPublicationPackage(zipBytes);
  validateWebsitePreviewManifest(validated.manifest);
  const lockPath = path.join(rootDirectory, ".publication-preview.lock");
  const lock = await open(lockPath, "wx").catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      throw new Error("Another publication preview import is in progress. Retry after it finishes.");
    }
    throw error;
  });
  try {
    return await stageUnsignedPublicationPreview(zipBytes, validated, {
      ...options,
      rootDirectory,
    });
  } finally {
    await lock.close();
    await rm(lockPath);
  }
}

async function stageUnsignedPublicationPreview(
  zipBytes: Uint8Array,
  { publication, manifest }: Awaited<ReturnType<typeof validateDraftPublicationPackage>>,
  options: IngestOptions & { rootDirectory: string },
) {
  const { rootDirectory } = options;
  await assertIdentityAvailable(
    rootDirectory,
    publication.reportId,
    publication.slug,
  );

  const fingerprint = await packageFingerprint(publication, manifest);
  const contentTarget = path.join(
    previewContentRoot(rootDirectory),
    publication.reportId,
  );
  const assetTarget = path.join(
    previewAssetRoot(rootDirectory),
    publication.reportId,
  );
  if (await exists(contentTarget)) {
    const existing = await loadPublicationPreview(
      publication.reportId,
      options,
    );
    if (!existing) {
      throw new Error("The existing preview could not be loaded.");
    }
    if (existing.publication.revision > publication.revision) {
      throw new Error(
        `Preview revision ${existing.publication.revision} is newer than package revision ${publication.revision}.`,
      );
    }
    if (existing.publication.revision === publication.revision) {
      if (existing.packageFingerprint === fingerprint) {
        return { preview: existing, status: "unchanged" as const };
      }
      throw new Error(
        `Preview revision ${publication.revision} conflicts with different package content.`,
      );
    }
  }

  const zip = await JSZip.loadAsync(zipBytes, { checkCRC32: true });
  const token = randomUUID();
  const contentStage = path.join(
    previewContentRoot(rootDirectory),
    `.${publication.reportId}-${token}`,
  );
  const assetStage = path.join(
    previewAssetRoot(rootDirectory),
    `.${publication.reportId}-${token}`,
  );
  await mkdir(contentStage, { recursive: true });
  await mkdir(assetStage, { recursive: true });

  try {
    const stagedManifest = reportManifestSchema.parse(
      rewriteAssetReferences(
        manifest,
        "/assets/",
        `/report-preview-assets/${publication.reportId}/`,
      ),
    );
    const stagedFingerprint = await packageFingerprint(
      publication,
      stagedManifest,
    );
    const record = previewRecordSchema.parse({
      schemaVersion: "1",
      packageFingerprint: fingerprint,
      stagedFingerprint,
      publication,
    });
    await writeFile(
      path.join(contentStage, "publication.json"),
      `${canonicalJson(publication)}\n`,
      "utf8",
    );
    await writeFile(
      path.join(contentStage, "manifest.json"),
      `${canonicalJson(stagedManifest)}\n`,
      "utf8",
    );
    await writeFile(
      path.join(contentStage, "preview.json"),
      `${canonicalJson(record)}\n`,
      "utf8",
    );
    for (const asset of publication.assets) {
      const entry = zip.file(asset.path);
      if (!entry) {
        throw new Error(`Missing package asset: ${asset.path}.`);
      }
      await writeFile(
        path.join(assetStage, path.basename(asset.path)),
        await entry.async("uint8array"),
      );
    }

    await mkdir(path.dirname(contentTarget), { recursive: true });
    await mkdir(path.dirname(assetTarget), { recursive: true });
    await replacePublicationDirectories({
      assetStage,
      assetTarget,
      contentStage,
      contentTarget,
    });
  } catch (error) {
    await rm(contentStage, { recursive: true, force: true });
    await rm(assetStage, { recursive: true, force: true });
    throw error;
  }

  const preview = await loadPublicationPreview(publication.reportId, options);
  if (!preview) {
    throw new Error("The staged preview could not be loaded after ingestion.");
  }
  return { preview, status: "staged" as const };
}

export async function loadPublicationPreview(
  reportId: string,
  options: IngestOptions = {},
): Promise<PublicationPreview | undefined> {
  if (!z.string().uuid().safeParse(reportId).success) {
    return undefined;
  }
  const rootDirectory = path.resolve(options.rootDirectory ?? process.cwd());
  const directory = path.join(previewContentRoot(rootDirectory), reportId);
  if (!(await exists(directory))) {
    return undefined;
  }
  const [recordValue, publicationValue, manifestValue] = await Promise.all([
    readFile(path.join(directory, "preview.json"), "utf8"),
    readFile(path.join(directory, "publication.json"), "utf8"),
    readFile(path.join(directory, "manifest.json"), "utf8"),
  ]);
  const record = previewRecordSchema.parse(JSON.parse(recordValue));
  const publication = draftPublicationSchema.parse(JSON.parse(publicationValue));
  const manifest = reportManifestSchema.parse(JSON.parse(manifestValue));
  if (
    publication.reportId !== reportId ||
    record.publication.reportId !== publication.reportId ||
    canonicalJson(record.publication) !== canonicalJson(publication)
  ) {
    throw new Error(`Stored preview metadata is inconsistent for ${reportId}.`);
  }
  validateWebsitePreviewManifest(manifest);
  if (
    record.stagedFingerprint !==
    await packageFingerprint(publication, manifest)
  ) {
    throw new Error(`Stored preview content is inconsistent for ${reportId}.`);
  }
  const originalManifest = reportManifestSchema.parse(rewriteAssetReferences(
    manifest,
    `/report-preview-assets/${reportId}/`,
    "/assets/",
  ));
  const packageZip = new JSZip();
  packageZip.file("publication.json", canonicalJson(publication));
  packageZip.file("manifest.json", canonicalJson(originalManifest));
  for (const asset of publication.assets) {
    const bytes = await readFile(
      path.join(
        previewAssetRoot(rootDirectory),
        reportId,
        path.basename(asset.path),
      ),
    );
    if (
      bytes.length !== asset.sizeBytes ||
      createHash("sha256").update(bytes).digest("hex") !== asset.sha256
    ) {
      throw new Error(`Stored preview asset is invalid: ${asset.path}.`);
    }
    packageZip.file(asset.path, bytes);
  }
  await validateDraftPublicationPackage(
    await packageZip.generateAsync({ type: "uint8array" }),
  );
  if (await packageFingerprint(publication, originalManifest) !== record.packageFingerprint) {
    throw new Error(`Stored preview package fingerprint is inconsistent for ${reportId}.`);
  }
  return {
    manifest,
    packageFingerprint: record.packageFingerprint,
    publication,
  };
}

export async function listPublicationPreviewIds(
  options: IngestOptions = {},
) {
  const rootDirectory = path.resolve(options.rootDirectory ?? process.cwd());
  const directory = previewContentRoot(rootDirectory);
  if (!(await exists(directory))) {
    return [];
  }
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isDirectory() && z.string().uuid().safeParse(entry.name).success,
    )
    .map((entry) => entry.name)
    .toSorted();
}
