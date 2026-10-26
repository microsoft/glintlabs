import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listApprovedPublications } from "../../../publishing/approved-publication.ts";
import { ReportRenderer } from "../../../report-system/report-renderer";
import { LaunchReport } from "../../../launch-reports/launch-report";
import { getLaunchReport, isLaunchReportSlug } from "../../../launch-reports/reports.ts";

export const dynamic = "force-dynamic";

async function reportBySlug(slug: string) {
  return (await listApprovedPublications()).find((report) => report.publication.slug === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (isLaunchReportSlug(slug)) {
    const launch = getLaunchReport(slug);
    return launch ? { title: `${launch.manifest.metadata.title} | Glint Labs`, description: launch.catalog.description,
      ...(launch.privatePreview ? { robots: { index: false, follow: false } } : {}) } : {};
  }
  const report = await reportBySlug(slug);
  return report ? { title: `${report.publication.title} | Glint Labs`, description: report.publication.summary } : {};
}

export default async function ApprovedReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (isLaunchReportSlug(slug)) {
    const launch = getLaunchReport(slug);
    if (!launch) notFound();
    return <LaunchReport report={launch} />;
  }
  const report = await reportBySlug(slug);
  if (!report) notFound();
  const { publication, manifest } = report;
  return <ReportRenderer
    coverTitle={publication.title}
    coverEyebrow={publication.eyebrow}
    coverImageAlt={publication.thumbnail.presentation === "illustration" ? undefined : publication.thumbnail.alt}
    coverImageSrc={publication.thumbnail.presentation === "illustration" ? undefined : `/reports-assets/${publication.reportId}/${publication.thumbnail.assetPath.slice("assets/".length)}`}
    coverSummary={publication.summary}
    manifest={manifest}
    mode="read"
    reportStyle={publication.reportStyle}
  />;
}
