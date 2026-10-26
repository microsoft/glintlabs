import Link from "next/link";

import { AnnualStudyBadges, StudyCard, StudyPhoto } from "../_components/study-card";
import { previewReportPlaceholders, publishedReports, type ReportCatalogItem } from "./reports-data";
import styles from "./reports-page.module.css";

export function ReportsCatalog({ reports = publishedReports }: { reports?: readonly ReportCatalogItem[] }) {
  const annualReport = reports.find((report) => report.id === "annual-report-2026");
  const remainingReports = reports.filter((report) => report.id !== annualReport?.id);
  const placeholders = !remainingReports.length && process.env.GLINT_LABS_UNSIGNED_PREVIEW === "1"
    ? previewReportPlaceholders : [];

  return (
    <section className={styles.catalog} aria-label="Reports catalog">
      <div className={styles.catalogResults}>
        {annualReport ? (
          <article className={styles.feature}>
            <StudyPhoto priority />
            <div className={styles.featureContent}>
              <div className={styles.featureHeader}>
                <h2>{annualReport.title}</h2>
                <p>{annualReport.description}</p>
                <AnnualStudyBadges />
              </div>
              <Link className={styles.cardAction} href={annualReport.href}>Explore the report</Link>
            </div>
          </article>
        ) : null}
        {remainingReports.length || placeholders.length ? (
          <div className={styles.reportGrid}>
            {remainingReports.map((report) => <StudyCard report={report} key={report.id} headingLevel="h2" />)}
            {placeholders.map((report) => <StudyCard report={report} key={report.id} headingLevel="h2" placeholder />)}
          </div>
        ) : null}
        {!reports.length && !placeholders.length ? (
          <div className={styles.empty} role="status">
            <p>Reports will appear here when they are published.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
