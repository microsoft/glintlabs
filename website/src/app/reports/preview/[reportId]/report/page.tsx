import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  loadPublicationPreview,
} from "../../../../../publishing/publication-preview.ts";
import { ReportRenderer } from "../../../../../report-system/report-renderer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Report preview | Glint Labs",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function PublicationReportPreview({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const preview = await loadPublicationPreview(reportId);
  if (!preview) {
    notFound();
  }

  return (
    <main>
      <ReportRenderer
        coverTitle={preview.publication.title}
        coverEyebrow={preview.publication.eyebrow}
        coverSummary={preview.publication.summary}
        coverImageAlt={preview.publication.thumbnail.presentation === "illustration" ? undefined : preview.publication.thumbnail.alt}
        coverImageSrc={preview.publication.thumbnail.presentation === "illustration" ? undefined : `/report-preview-assets/${reportId}/${preview.publication.thumbnail.assetPath.slice("assets/".length)}`}
        manifest={preview.manifest}
        mode="read"
        reportStyle={preview.publication.reportStyle}
      />
    </main>
  );
}
