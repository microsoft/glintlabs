import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { DraftPublication } from "../project/publication-package.ts";
import { publicationDateSchema } from "../project/publication-preparation.ts";

const storedHomepageSchema = z.object({
  featured: z.boolean(), featuredUntil: publicationDateSchema.nullable(),
  version: z.string().uuid(), packageFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export async function readHomepagePlacement(root: string, publication: DraftPublication & {
  approval: { packageFingerprint: string };
}) {
  try {
    const stored = storedHomepageSchema.parse(JSON.parse(await readFile(
      path.join(root, "content", "reports", publication.reportId, "homepage.json"), "utf8")));
    if (stored.packageFingerprint !== publication.approval.packageFingerprint) {
      throw new Error("Homepage placement does not match the approved report.");
    }
    return { featured: stored.featured, featuredUntil: stored.featuredUntil, version: stored.version };
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    return { ...publication.catalog, version: null };
  }
}
