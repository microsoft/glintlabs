import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  publishedPreviewSchema,
  type PublishedPreview,
} from "./published-preview.ts";

const publishedReportsDirectory = path.join(
  process.env.LOCALAPPDATA ?? os.tmpdir(),
  "GlintLabsPublishingStudio",
  "published-reports",
);

function previewPath(id: string) {
  const safeId = publishedPreviewSchema.shape.id.parse(id);
  return path.join(publishedReportsDirectory, `${safeId}.json`);
}

export async function savePublishedPreview(value: unknown) {
  const preview = publishedPreviewSchema.parse(value);
  await mkdir(publishedReportsDirectory, { recursive: true });
  const destination = previewPath(preview.id);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(preview), "utf8");
  await rename(temporary, destination);
  return preview;
}

export async function loadPublishedPreview(
  id: string,
): Promise<PublishedPreview | undefined> {
  try {
    return publishedPreviewSchema.parse(
      JSON.parse(await readFile(previewPath(id), "utf8")),
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return undefined;
    }
    throw error;
  }
}
