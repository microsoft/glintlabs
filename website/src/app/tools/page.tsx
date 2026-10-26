import type { Metadata } from "next";

import { MarketingFooter } from "../_components/marketing-footer";
import { PublicSiteHeader } from "../_components/public-site-shell";
import { SiteArtwork } from "../_components/site-artwork";
import { ToolsCatalog } from "./tools-catalog";
import styles from "../_components/public-site-design.module.css";

export const metadata: Metadata = {
  title: "Tools | Glint Labs",
  description:
    "Explore guided People Science workflows with clear inputs, outputs, assumptions, safeguards, and review steps.",
};

export default function ToolsPage() {
  return (
    <div className={styles.page} data-figma-node-id="1429:20520">
      <PublicSiteHeader />
      <main className={styles.main}>
        <SiteArtwork variant="tools" />
        <div className={styles.content}>
          <header className={`${styles.intro} ${styles.toolsIntro}`}>
            <h1>Practical resources for People&nbsp;Science</h1>
            <p>Glint Labs combines People Science expertise with AI-assisted analysis. Use these tools as an AI thought partner to make sense of employee feedback, uncover patterns, and identify priorities. Turn insights into recommendations, reports, and meaningful action.</p>
          </header>
          <div className={styles.divider} />
          <ToolsCatalog />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
