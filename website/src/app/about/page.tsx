import { Briefcase16Regular } from "@fluentui/react-icons/svg/briefcase";
import { Building16Regular } from "@fluentui/react-icons/svg/building";
import type { Metadata } from "next";
import Image from "next/image";

import { MarketingFooter } from "../_components/marketing-footer";
import { PublicSiteHeader } from "../_components/public-site-shell";
import { SiteArtwork } from "../_components/site-artwork";
import shell from "../_components/public-site-design.module.css";
import styles from "./about-page.module.css";

export const metadata: Metadata = {
  title: "About | Glint Labs",
  description:
    "Learn how Glint Labs turns People Science evidence into practical, inspectable resources for workplace decisions.",
};

const authors = [
  { name: "Caribay Garcia, PhD", photo: "caribay", contribution: "Glint Labs Author", role: "Head of People Science", linkedIn: "https://www.linkedin.com/in/caribaygarcia" },
  { name: "Megan Benzing, PhD", photo: "megan", contribution: "Glint Labs Author", role: "Senior People Scientist", linkedIn: "https://www.linkedin.com/in/megan-benzing" },
  { name: "Ben Tankus", photo: "ben", contribution: "Glint Labs Tool Author", role: "Senior Data Scientist", linkedIn: "https://www.linkedin.com/in/ben-tankus-1949a190" },
  { name: "Eric Schroen", photo: "eric", contribution: "Glint Labs Designer & Builder", role: "Senior Product Designer", linkedIn: "https://www.linkedin.com/in/ericschroen" },
] as const;

function TeamMember({ name, photo, contribution, role, linkedIn }: (typeof authors)[number]) {
  return (
    <article className={styles.member}>
      <div className={styles.portrait}>
        <Image src={`/figma/site-canonical/about/${photo}.png`} alt="" fill sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 25vw" unoptimized />
      </div>
      <div className={styles.memberDetails}>
        <h3>{name}</h3>
        <p className={styles.contribution}>{contribution}</p>
        <p><Briefcase16Regular aria-hidden="true" />{role}</p>
        <p><Building16Regular aria-hidden="true" />Microsoft</p>
        <p>
          <a
            aria-label={`View on LinkedIn: ${name} (opens in a new tab)`}
            className={styles.linkedInLink}
            href={linkedIn}
            rel="noopener noreferrer"
            target="_blank"
            title="Opens in a new tab"
          >
            <Image src="/figma/site-canonical/about/linkedin.svg" alt="" width={16} height={16} unoptimized />
            View on LinkedIn
          </a>
        </p>
      </div>
    </article>
  );
}

export default function AboutPage() {
  return (
    <div className={shell.page} data-figma-node-id="1777:45423">
      <PublicSiteHeader />
      <main className={shell.main}>
        <SiteArtwork variant="about" />
        <div className={shell.content}>
          <header className={`${shell.intro} ${shell.aboutIntro}`}>
            <h1>Ideas that move People Science forward</h1>
            <p>Glint Labs is a publishing space for evidence-based perspectives on employee listening and the future of work. We make the research, tools, and practical implications clear so leaders can make better workplace decisions.</p>
          </header>
          <div className={shell.divider} />
          <section className={styles.team} aria-labelledby="meet-the-team">
            <h2 id="meet-the-team">Meet the team</h2>
            <div className={styles.teamGrid}>{authors.map((author) => <TeamMember key={author.name} {...author} />)}</div>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
