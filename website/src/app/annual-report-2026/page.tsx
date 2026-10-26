import type { Metadata, Viewport } from "next";
import Image from "next/image";

import { SiteNavigation } from "../_components/site-navigation";
import { MarketingFooter } from "../_components/marketing-footer";
import heroStyles from "../_components/annual-study-hero.module.css";
import { CanonicalReportBody, canonicalSections } from "../../annual-report-2026/canonical-figma";
import { ParticipantDetailsProvider, ParticipantDetailsTrigger } from "../../annual-report-2026/canonical-report-interactions";
import { ReportSideNav } from "../../report-system/report-side-nav";
import reportStyles from "../../annual-report-2026/canonical-report.module.css";
import styles from "./annual-report-page.module.css";

export const metadata: Metadata = {
  title: "The next generation of employee listening | Glint Labs",
  description:
    "The 2026 Glint Labs Annual Report on building a right-fit employee-listening system for a faster, AI-enabled world of work.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#000000",
};

export default function AnnualReport2026Page() {
  return (
    <ParticipantDetailsProvider>
    <main className={`${styles.page} ${reportStyles.report}`}>
      <a className={styles.skipLink} href="#report-content">
        Skip to report content
      </a>
      <SiteNavigation variant="annual-report-2026" />
      <header className={heroStyles.hero} data-hero-route="/annual-report-2026">
        <div className={reportStyles.heroArtwork} aria-hidden="true">
          <span className={reportStyles.heroGrid} />
          <Image className={reportStyles.heroDiagonal} src="/figma/annual-blue/hero-diagonal.svg" alt="" width={946} height={946} unoptimized />
          <span className={reportStyles.heroGlowTop} />
          <span className={reportStyles.heroGlowLeft} />
          <span className={reportStyles.heroGlowRight} />
        </div>
        <div className={heroStyles.inner}>
          <div className={`${heroStyles.copy} ${heroStyles.withoutAction}`}>
            <h1 tabIndex={-1}>The Next Generation of Employee Listening</h1>
            <p>The next generation of employee listening is not about collecting more signals. It is about building a system that can turn the right signals into credible action.</p>
            <div className={reportStyles.badges}>
              <span><Image src="/figma/annual-blue/hero-calendar.svg" alt="" width={16} height={16} unoptimized />2026 • Next Gen Employee Listening Report</span>
              <ParticipantDetailsTrigger sampleIndex={0}><Image src="/figma/annual-blue/hero-person.svg" alt="" width={16} height={16} unoptimized />100+ Listening Leaders<Image className={reportStyles.badgeChevron} src="/figma/annual-canonical/interaction-chevron-down.svg" alt="" width={16} height={16} unoptimized /></ParticipantDetailsTrigger>
              <ParticipantDetailsTrigger sampleIndex={1}><Image src="/figma/annual-blue/hero-people.svg" alt="" width={16} height={16} unoptimized />500 Employees<Image className={reportStyles.badgeChevron} src="/figma/annual-canonical/interaction-chevron-down.svg" alt="" width={16} height={16} unoptimized /></ParticipantDetailsTrigger>
            </div>
          </div>
          <div className={`${reportStyles.heroPhoto} ${heroStyles.photo}`}>
            <Image data-hero-image src="/figma/annual-blue/hero.png" alt="Two colleagues discussing work together beside a laptop." width={1024} height={684} priority unoptimized />
            <span className={reportStyles.photoGlowTop} aria-hidden="true" />
            <span className={reportStyles.photoGlowBottom} aria-hidden="true" />
          </div>
        </div>
      </header>
      <div className={reportStyles.layout}>
        <div className={reportStyles.rail}>
          <ReportSideNav
            authorName="Megan Benzing, PhD"
            authors={[
              { name: "Megan Benzing, PhD", role: "Principal Author" },
              { name: "Caribay Garcia, PhD", role: "Author" },
            ]}
            dark
            publishedDate="10/18/26"
            readTimeMinutes={20}
            sections={canonicalSections}
          />
        </div>
        <article className={reportStyles.content} id="report-content" tabIndex={-1}>
          <CanonicalReportBody />
        </article>
      </div>
      <MarketingFooter />
    </main>
    </ParticipantDetailsProvider>
  );
}
