import Link from "next/link";

import { PublicSiteShell } from "./public-site-shell";
import styles from "./public-site-shell.module.css";

export function UnderConstructionPage({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <PublicSiteShell>
      <main className={styles.main}>
        <div className={styles.construction}>
          <span className={styles.eyebrow}>In development</span>
          <h1>{title} is coming soon</h1>
          <p>{description}</p>
          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/">
              Back to Glint Labs
            </Link>
            <Link
              className={styles.secondaryButton}
              href="/annual-report-2026"
            >
              Explore the 2026 Annual Report
            </Link>
          </div>
        </div>
      </main>
    </PublicSiteShell>
  );
}
