import Link from "next/link";
import Image from "next/image";
import { clarityEnabled, telemetryEnabled } from "@/telemetry/config";

import styles from "./marketing-footer.module.css";

export function MarketingFooter({ disableLinks = false }: { disableLinks?: boolean }) {
  function footerLink(href: string, label: string, external = false) {
    if (disableLinks) return <span aria-disabled="true" role="link">{label}</span>;
    return external
      ? <a href={href} rel="noreferrer" target="_blank">{label}</a>
      : <Link href={href}>{label}</Link>;
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.footerLead}>
        <h2>Turn People Science research into better workplace decisions.</h2>
        <div className={styles.disclaimer}>
          <Image src="/figma/site-canonical/home/group.svg" alt="Microsoft" width={81} height={18} unoptimized />
          <p>Disclaimer: The materials on this page are provided as-is, without warranty of any kind, including merchantability or fitness for a particular purpose. Microsoft will not provide any support for these materials.</p>
          {telemetryEnabled && <p>Public-site analytics run automatically using Supabase. Random browser IDs expire
            after 18 calendar months; only keyed hashes are stored with events, retained for 90 days.
            No survey data, names, email addresses, or full URLs are sent. Supabase receives IP addresses
            to handle requests and uses a separate daily-changing hash for short-lived rate limits.
            Browser privacy signals and existing refusals are honored. Counts represent browsers, not people.</p>}
          {clarityEnabled && <p>Microsoft Clarity measures public-page interactions using heatmaps
            and session recordings. Clarity limits tracking without consent in regions where it requires
            consent and may use cookies elsewhere. Browser privacy signals and existing refusals are honored.
            See the Privacy Statement below.</p>}
        </div>
      </div>

      <nav aria-label="Footer" className={styles.footerLinks}>
        <div>
        {footerLink("/reports", "Reports")}
        {footerLink("/tools", "Tools")}
        {footerLink("/about", "About Glint Labs")}
        {footerLink("https://github.com/microsoft/glintlabs", "GitHub repository", true)}
        </div>
        <div>
        {footerLink("https://www.microsoft.com/en-us/legal/terms-of-use", "Terms and Conditions", true)}
        {footerLink("https://privacy.microsoft.com/en-us/privacystatement", "Privacy Statement", true)}
        </div>
      </nav>
    </footer>
  );
}
