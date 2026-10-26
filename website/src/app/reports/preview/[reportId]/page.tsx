import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { MarketingFooter } from "../../../_components/marketing-footer";
import { PublicSiteHeader } from "../../../_components/public-site-shell";
import {
  ReportsCatalog,
} from "../../reports-catalog";
import { loadReportCatalog, publicationCatalogItem } from "../../../../publishing/report-catalog.ts";
import reportsStyles from "../../reports-page.module.css";
import {
  loadPublicationPreview,
} from "../../../../publishing/publication-preview.ts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reports catalog preview | Glint Labs",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function PublicationCatalogPreview({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const preview = await loadPublicationPreview(reportId);
  if (!preview) {
    notFound();
  }

  const previewReport = publicationCatalogItem(preview.publication, { preview: true });
  const reports = await loadReportCatalog();

  return (
    <div className={reportsStyles.page}>
      <PublicSiteHeader />

      <main className={reportsStyles.main}>
        <Image
          alt=""
          aria-hidden="true"
          className={reportsStyles.backgroundGrid}
          fill
          priority
          sizes="100vw"
          src="/figma/homepage-v2/reports-background.svg"
          unoptimized
        />

        <div className={reportsStyles.content}>
          <header className={reportsStyles.intro}>
            <h1>Reports</h1>
            <h2>
              People Science research for consequential workplace decisions.
              Glint Labs reports bring together evidence, interpretation, and
              practical implications.
            </h2>
          </header>

          <div className={reportsStyles.divider} />
          <ReportsCatalog reports={[previewReport, ...reports.filter((report) => report.id !== reportId)]} />
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
