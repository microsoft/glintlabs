import { getLaunchReport } from "../launch-reports/reports.ts";
import { publicationCatalogItem } from "./report-catalog.ts";
import type { loadApprovedPublication } from "./approved-publication.ts";

export function publishedReportSummary({ publication, homepage }: NonNullable<Awaited<ReturnType<typeof loadApprovedPublication>>>) {
  return {
    id: publication.reportId, title: publication.title, slug: publication.slug,
    summary: getLaunchReport(publication.slug)?.catalog.description ?? publication.summary,
    revision: publication.revision, packageFingerprint: publication.approval.packageFingerprint,
    updatedAt: publication.approval.confirmedAt, displayDate: publication.displayDate,
    eyebrow: publication.eyebrow, employeeCount: publication.employeeCount, homepage,
    thumbnail: getLaunchReport(publication.slug)?.catalog.thumbnail ?? publicationCatalogItem(publication).thumbnail,
  };
}
