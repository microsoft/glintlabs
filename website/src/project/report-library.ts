import { z } from "zod";
import { publicationEditingFingerprint, type StudioProject } from "./studio-project.ts";

export const publishedReportSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  summary: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  revision: z.number().int().positive(),
  packageFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  updatedAt: z.string().datetime(),
  displayDate: z.string(),
  eyebrow: z.string(),
  employeeCount: z.number().optional(),
  thumbnail: z.object({
    src: z.string().startsWith("/"),
    alt: z.string(),
    presentation: z.enum(["image", "illustration"]).optional(),
  }).optional(),
});
export const publishedReportListSchema = z.object({ reports: z.array(publishedReportSummarySchema) });
export type PublishedReportSummary = z.infer<typeof publishedReportSummarySchema>;
export type LibraryReport = {
  id: string;
  title: string;
  summary?: string;
  updatedAt: string;
  displayDate?: string;
  eyebrow?: string;
  employeeCount?: number;
  project?: StudioProject;
  publication?: PublishedReportSummary;
  unpublishedChanges: boolean;
  comparisonUnknown: boolean;
};

const HIDDEN_REPORT_PREFIX = "glint-publishing-studio:hidden-report:";

export function hiddenLibraryReports(storage: Storage) {
  const ids = new Set<string>();
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key?.startsWith(HIDDEN_REPORT_PREFIX) && storage.getItem(key) === "1") {
      ids.add(key.slice(HIDDEN_REPORT_PREFIX.length));
    }
  }
  return ids;
}

export function setLibraryReportHidden(storage: Storage, id: string, hidden: boolean) {
  if (hidden) storage.setItem(`${HIDDEN_REPORT_PREFIX}${id}`, "1");
  else storage.removeItem(`${HIDDEN_REPORT_PREFIX}${id}`);
  return hiddenLibraryReports(storage);
}

export async function reportLibrary(
  projects: StudioProject[], publications: PublishedReportSummary[],
): Promise<LibraryReport[]> {
  const byId = new Map(publications.map(publication => [publication.id, publication]));
  const reports = await Promise.all(projects.map(async project => {
    const publication = byId.get(project.id);
    byId.delete(project.id);
    const saved = project.websitePublication;
    const metadata = project.publicationMetadataDraft ?? project.publicationPreparation?.metadata;
    return {
      id: project.id,
      title: metadata?.title.trim() || project.manifest.metadata.title,
      summary: metadata?.summary ?? publication?.summary,
      updatedAt: project.updatedAt,
      displayDate: metadata?.displayDate ?? project.manifest.metadata.publishedDate,
      eyebrow: metadata?.eyebrow ?? "Research Drop",
      employeeCount: project.manifest.metadata.employeeCount,
      project,
      publication,
      comparisonUnknown: Boolean(publication && !saved),
      unpublishedChanges: Boolean(publication && saved && (
        saved.revision !== publication.revision ||
        saved.packageFingerprint !== publication.packageFingerprint ||
        saved.editingFingerprint !== await publicationEditingFingerprint(project))),
    };
  }));
  return [...reports, ...[...byId.values()].map(publication => ({
    ...publication, publication, unpublishedChanges: false, comparisonUnknown: false,
  }))];
}
