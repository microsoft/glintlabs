import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./public-site-shell.module.css";
import { SiteNavigation } from "./site-navigation";

export function PublicSiteHeader() {
  return <SiteNavigation variant="core" />;
}

export function PublicSiteFooter() {
  return (
    <footer className={styles.footer}>
      <div>
        <Link className={styles.footerBrand} href="/">
          Glint Labs
        </Link>
        <p>People Science for informed workplace decisions.</p>
      </div>
      <nav aria-label="Footer" className={styles.footerLinks}>
        <Link href="/reports">Reports</Link>
        <Link href="/tools">Tools</Link>
        <a
          href="https://github.com/microsoft/glintlabs"
          rel="noreferrer"
          target="_blank"
        >
          GitHub source
        </a>
      </nav>
    </footer>
  );
}

export function PublicSiteShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.site}>
      <PublicSiteHeader />
      {children}
      <PublicSiteFooter />
    </div>
  );
}
