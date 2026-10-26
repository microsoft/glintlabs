import type { Metadata } from "next";
import Link from "next/link";
import { loadReportCatalog } from "../publishing/report-catalog";

import { MarketingFooter } from "./_components/marketing-footer";
import { SiteArtwork } from "./_components/site-artwork";
import { SiteNavigation } from "./_components/site-navigation";
import { HeroTransitionLink } from "./_components/hero-transition-link";
import { AnnualStudyBadges, StudyCard, StudyPhoto } from "./_components/study-card";
import heroStyles from "./_components/annual-study-hero.module.css";
import { previewReportPlaceholders } from "./reports/reports-data";
import { ToolsCatalog } from "./tools/tools-catalog";
import styles from "./home-v1.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Glint Labs | People Science research and tools",
  description:
    "Explore research and practical tools from Glint People Science, including the 2026 Annual Report and Analyze Survey.",
};

export default async function Home() {
  const featuredReports = (await loadReportCatalog()).filter((report) => report.featured);
  const showFeaturedPlaceholders = featuredReports.length === 0 &&
    process.env.GLINT_LABS_UNSIGNED_PREVIEW === "1";

  return (
    <div className={styles.page} data-figma-node-id="310:14672">
      <SiteNavigation variant="core" />
      <main>
        <section className={heroStyles.hero} data-hero-route="/">
          <SiteArtwork variant="home" />
          <div className={heroStyles.inner}>
            <div className={heroStyles.copy}>
              <h1 tabIndex={-1}>The Next Generation of Employee Listening</h1>
              <p>
                The next generation of employee listening is not about collecting
                more signals. It is about building a system that can turn the
                right signals into credible action.
              </p>
              <AnnualStudyBadges />
              <HeroTransitionLink className={heroStyles.action} href="/annual-report-2026">
                Explore the report
              </HeroTransitionLink>
            </div>
            <StudyPhoto className={heroStyles.photo} priority />
          </div>
        </section>

        <div className={styles.sections}>
          <SiteArtwork variant="section" />
          <div className={styles.content}>
            {featuredReports.length > 0 || showFeaturedPlaceholders ? <>
              <section aria-labelledby="featured-studies-title" className={styles.featured} data-figma-node-id="1655:36332">
                <header className={styles.sectionHeader}>
                  <div>
                    <h2 id="featured-studies-title">Featured</h2>
                    <p>Start with our featured studies on AI transformation, human capability, and responsible adoption.</p>
                  </div>
                  <Link className={styles.viewAll} href="/reports">View all reports</Link>
                </header>
                <div className={styles.cardGrid}>
                  {featuredReports.map((report) => <StudyCard key={report.id} report={report} />)}
                  {showFeaturedPlaceholders ? previewReportPlaceholders.map((report) => <StudyCard key={report.id} placeholder report={report} />) : null}
                </div>
              </section>
              <div aria-hidden="true" className={styles.divider} />
            </> : null}
            <ToolsCatalog />
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
