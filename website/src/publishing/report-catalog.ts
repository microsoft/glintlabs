import {
  publishedReports,
  type ReportCatalogItem,
} from "../app/reports/reports-data.ts";
import type { DraftPublication } from "../project/publication-package.ts";
import { publicationCardBadge } from "../project/publication-flow.ts";
import { listApprovedPublications } from "./approved-publication.ts";
import { getLaunchReports, isLaunchReportSource } from "../launch-reports/reports.ts";

export function publicationCatalogItem(
  publication: DraftPublication,
  { preview = false, now = new Date() }: { preview?: boolean; now?: Date } = {},
): ReportCatalogItem {
  const { reportId, thumbnail, catalog } = publication;
  return {
    badge: publicationCardBadge(publication.displayDate, publication.eyebrow),
    category: publication.reportStyle === "annual-report-2026" ? "annual" : "research-drop",
    description: publication.summary,
    ...(publication.employeeCount !== undefined ? { employeeCount: publication.employeeCount } : {}),
    featured: catalog.featured &&
      (!catalog.featuredUntil || catalog.featuredUntil >= now.toISOString().slice(0, 10)),
    href: preview ? `/reports/preview/${reportId}/report` : `/reports/${publication.slug}`,
    id: reportId,
    thumbnail: {
      alt: thumbnail.alt,
      presentation: thumbnail.presentation,
      src: `/${preview ? "report-preview-assets" : "reports-assets"}/${reportId}/${thumbnail.assetPath.slice("assets/".length)}`,
    },
    title: publication.title,
  };
}

export async function loadReportCatalog({
  rootDirectory,
  now = new Date(),
}: { rootDirectory?: string; now?: Date } = {}): Promise<ReportCatalogItem[]> {
  const approved = await listApprovedPublications({ rootDirectory });
  const reports = approved.filter(report => !isLaunchReportSource(report.publication.slug, report.manifest.source.fileName)).toSorted((left, right) =>
    right.publication.approval.confirmedAt.localeCompare(left.publication.approval.confirmedAt) ||
    right.publication.displayDate.localeCompare(left.publication.displayDate) ||
    left.publication.reportId.localeCompare(right.publication.reportId),
  );
  return [
    ...reports.map(({ publication }) => publicationCatalogItem(publication, { now })),
    ...getLaunchReports().map(report => report.catalog),
    ...publishedReports,
  ];
}
