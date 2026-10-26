import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { loadPublishedPreview } from "../../../../publishing/published-preview-store.ts";
import { ReportRenderer } from "../../../../report-system/report-renderer";
import styles from "./report-preview.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Published report preview | Glint Labs",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function PublishedReportPreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const preview = await loadPublishedPreview(id);
  if (!preview) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <header className={styles.previewBar}>
        <div>
          <strong>Glint Labs preview environment</strong>
          <span>Published {new Date(preview.publishedAt).toLocaleString()}</span>
        </div>
        <Link href={`/published/${preview.id}#featured`}>
          Back to homepage
        </Link>
      </header>
      <ReportRenderer
        manifest={preview.manifest}
        mode="read"
        reportStyle={preview.reportStyle}
      />
    </main>
  );
}
