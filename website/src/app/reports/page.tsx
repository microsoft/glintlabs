import type { Metadata } from "next";
import { loadReportCatalog } from "../../publishing/report-catalog";

import { MarketingFooter } from "../_components/marketing-footer";
import { PublicSiteHeader } from "../_components/public-site-shell";
import { SiteArtwork } from "../_components/site-artwork";
import { ReportsCatalog } from "./reports-catalog";
import styles from "../_components/public-site-design.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reports | Glint Labs",
  description:
    "Explore People Science reports that connect workplace evidence with practical questions, limitations, and implications.",
};

export default async function ReportsPage() {
  const reports = await loadReportCatalog();

  return (
    <div className={styles.page} data-figma-node-id="1487:30116">
      <PublicSiteHeader />
      <main className={styles.main}>
        <SiteArtwork variant="reports" />
        <div className={`${styles.content} ${styles.reportsContent}`}>
          <header className={`${styles.intro} ${styles.reportsIntro}`}>
            <h1>Research reports and insights on the future of work</h1>
            <p>Glint Labs brings a People Science perspective to the questions shaping work, connecting original research and data-driven insights to help leaders decide what&apos;s next.</p>
          </header>
          <div className={styles.divider} />
          <ReportsCatalog reports={reports} />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
