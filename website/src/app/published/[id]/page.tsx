import {
  ArrowTrending24Regular,
  Bookmark24Regular,
  ChevronRight20Regular,
  Drafts16Regular,
  Drafts28Regular,
  Flash16Regular,
  Flash28Regular,
  OrganizationHorizontal20Regular,
  Search20Filled,
  SlideSearch16Regular,
  SlideSearch28Regular,
} from "@fluentui/react-icons";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { featuredListing } from "../../../publishing/featured-listing.ts";
import { loadPublishedPreview } from "../../../publishing/published-preview-store.ts";
import { FeaturedReportCard, ResearchCard } from "../featured-report-card";
import styles from "../homepage-preview.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Glint Labs",
  robots: {
    follow: false,
    index: false,
  },
};

const featuredTags = {
  globe: "/figma/homepage/featured-globe.svg",
  people: "/figma/homepage/featured-people.svg",
  topic: "/figma/homepage/featured-topic.svg",
};

const trendingItems = [
  {
    detail: "Shared 275 times",
    title: "Building confidence during AI transformation",
    type: "organization",
  },
  {
    detail: "Shared 213 times",
    title: "The human skills that matter more with AI",
    type: "organization",
  },
  {
    detail: "Trending on LinkedIn",
    title: "Designing AI workflows around real work",
    type: "linkedin",
  },
  {
    detail: "Trending on LinkedIn",
    title: "Measuring value beyond adoption",
    type: "linkedin",
  },
] as const;

const toolCards = [
  {
    badge: "Skill",
    buttonLabel: "View skill",
    description:
      "Turn employee survey data into checked findings and a clear reporting story.",
    image: "/figma/homepage/tool-survey.png",
    theme: "green",
    title: "Survey analysis",
    type: "skill",
  },
  {
    badge: "Prompt",
    buttonLabel: "View prompt",
    description:
      "Shape survey findings into a concise leadership narrative with evidence and caveats.",
    image: "/figma/homepage/tool-story.png",
    theme: "cyan",
    title: "Executive insight story",
    type: "prompt",
  },
  {
    badge: "Advanced analysis",
    buttonLabel: "Start analysis",
    description:
      "Compare a listening program with synthetic benchmarks to identify strengths and gaps.",
    image: "/figma/homepage/tool-benchmark.png",
    theme: "violet",
    title: "Listening strategy benchmark",
    type: "analysis",
  },
] as const;

const resourceRows = [
  {
    description:
      "Guided methods for common People Science and employee-experience tasks.",
    title: "Skills",
    type: "skill",
  },
  {
    description:
      "Starting points for asking sharper questions and developing evidence-informed work.",
    title: "Prompts",
    type: "prompt",
  },
  {
    description:
      "Reusable approaches and code samples for working with people data responsibly.",
    title: "Analysis resources",
    type: "analysis",
  },
] as const;

const researchLinks = [
  "Latest research",
  "All studies",
  "Research topics",
  "Methods",
  "Data ethics",
  "Publications",
  "Research team",
];

const resourceLinks = [
  "Skills library",
  "Prompt library",
  "Analysis guides",
  "About Glint Labs",
  "Meet the team",
  "Contact us",
  "Privacy",
];

function SectionHeading({
  action,
  description,
  icon,
  title,
}: {
  action?: string;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <header className={styles.sectionHeader}>
      <div className={styles.sectionHeading}>
        <div className={styles.sectionTitle}>
          {icon}
          <h2>{title}</h2>
        </div>
        <p>{description}</p>
      </div>
      {action ? <a href="#featured">{action}</a> : null}
    </header>
  );
}

function ToolBadgeIcon({ type }: { type: (typeof toolCards)[number]["type"] }) {
  if (type === "skill") {
    return <Flash16Regular />;
  }
  if (type === "prompt") {
    return <Drafts16Regular />;
  }
  return <SlideSearch16Regular />;
}

function ResourceIcon({
  type,
}: {
  type: (typeof resourceRows)[number]["type"];
}) {
  if (type === "skill") {
    return <Flash28Regular />;
  }
  if (type === "prompt") {
    return <Drafts28Regular />;
  }
  return <SlideSearch28Regular />;
}

export default async function PublishedHomepagePreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const preview = await loadPublishedPreview(id);
  if (!preview) {
    notFound();
  }
  const listing = featuredListing(preview.manifest);
  const reportHref = `/published/${preview.id}/report`;
  const today = new Date().toISOString().slice(0, 10);
  const isHomepageFeatured =
    preview.placement.homepage.featured &&
    (!preview.placement.homepage.featuredUntil ||
      preview.placement.homepage.featuredUntil >= today);

  return (
    <main className={styles.page}>
      <nav aria-label="Primary" className={styles.siteNav}>
        <a className={styles.brandTab} href="#top">
          Glint Labs
        </a>
        <div className={styles.navTabs}>
          <a href="#featured">People Science</a>
          <a href="#tools">Tools</a>
          <a href="#resources">Collaborations</a>
          <a href="#subscribe">Subscribe</a>
          <button aria-label="Search" type="button">
            <Search20Filled />
          </button>
        </div>
      </nav>

      <section className={styles.hero} id="top">
        <Image
          alt=""
          aria-hidden="true"
          className={styles.heroEllipseTop}
          height={946}
          priority
          src="/figma/homepage/hero-ellipse-4.svg"
          unoptimized
          width={946}
        />
        <Image
          alt=""
          aria-hidden="true"
          className={styles.heroEllipseLeft}
          height={998}
          priority
          src="/figma/homepage/hero-ellipse-6.svg"
          unoptimized
          width={998}
        />
        <Image
          alt=""
          aria-hidden="true"
          className={styles.heroEllipseRight}
          height={602}
          priority
          src="/figma/homepage/hero-ellipse-5.svg"
          unoptimized
          width={602}
        />
        <Image
          alt=""
          aria-hidden="true"
          className={styles.heroDecoration}
          height={946}
          priority
          src="/figma/homepage/hero-group-6.svg"
          unoptimized
          width={946}
        />

        <div className={styles.heroContent}>
          <div className={styles.heroCopy}>
            <span>2026 annual report</span>
            <h1>The next generation of employee listening</h1>
            <p>
              The next generation of employee listening is not about collecting
              more signals. It is about building a system that can turn the
              right signals into credible action.
            </p>
          </div>
          <a className={styles.primaryButton} href="#featured">
            Explore the report
          </a>
        </div>

        <div className={styles.heroImage}>
          <Image
            alt="Colleagues collaborating around a laptop"
            fill
            priority
            sizes="461px"
            src="/figma/homepage/hero-photo.png"
            unoptimized
          />
          <Image
            alt=""
            aria-hidden="true"
            className={styles.heroImageOverlayLarge}
            height={610}
            src="/figma/homepage/hero-overlay-7.svg"
            unoptimized
            width={610}
          />
          <Image
            alt=""
            aria-hidden="true"
            className={styles.heroImageOverlaySmall}
            height={230}
            src="/figma/homepage/hero-overlay-8.svg"
            unoptimized
            width={230}
          />
        </div>
      </section>

      <div className={styles.homeContent}>
        <section className={styles.featuredSection} id="featured">
          <SectionHeading
            action="View all studies"
            description="Start with our latest studies on AI transformation, human capability, and responsible adoption."
            icon={<Bookmark24Regular />}
            title="Featured"
          />
          <div className={styles.featuredGrid}>
            {isHomepageFeatured ? (
              <FeaturedReportCard
                description={listing.description}
                eyebrow={preview.placement.topics[0] ?? listing.eyebrow}
                href={reportHref}
                thumbnail={preview.thumbnail}
                title={listing.title}
              />
            ) : (
              <ResearchCard
                description="See how role-based practice, manager support, and clear guardrails turn AI interest into everyday value."
                href="#featured"
                tags={[
                  { icon: featuredTags.topic, label: "AI transformation" },
                  { icon: featuredTags.people, label: "9,600 employees" },
                  { icon: featuredTags.globe, label: "14 countries" },
                ]}
                title="From Experimentation to Everyday Impact"
                visual={{
                  alt: "",
                  kind: "asset",
                  src: "/figma/homepage/featured-data.svg",
                }}
              />
            )}
            <ResearchCard
              description="Explore why judgment, communication, and learning agility become more valuable as AI use grows."
              href="#featured"
              tags={[
                { icon: featuredTags.topic, label: "Human skills" },
                { icon: featuredTags.people, label: "7,200 employees" },
                { icon: featuredTags.globe, label: "11 countries" },
              ]}
              title="Human Skills in an AI Workplace"
              visual={{
                alt: "",
                kind: "asset",
                src: "/figma/homepage/featured-laptop.svg",
              }}
            />
            <ResearchCard
              description="Learn which policies and team habits help employees use AI confidently, safely, and transparently."
              href="#featured"
              tags={[
                { icon: featuredTags.topic, label: "AI transformation" },
                { icon: featuredTags.people, label: "9,600 employees" },
                { icon: featuredTags.globe, label: "14 countries" },
              ]}
              title="Trustworthy AI at Work"
              visual={{
                alt: "",
                kind: "asset",
                src: "/figma/homepage/featured-shield.svg",
              }}
            />
          </div>
        </section>

        <section className={styles.trendingSection}>
          <SectionHeading
            description="See what people are reading, sharing, and discussing across the workplace."
            icon={<ArrowTrending24Regular />}
            title="Trending"
          />
          <ol className={styles.trendingGrid}>
            {trendingItems.map((item, index) => (
              <li key={item.title}>
                <a href="#featured">
                  <span className={styles.trendingHeader}>
                    <strong>{index + 1}</strong>
                    <ChevronRight20Regular />
                  </span>
                  <span className={styles.trendingTitle}>{item.title}</span>
                  <span className={styles.trendingMeta}>
                    {item.type === "linkedin" ? (
                      <Image
                        alt=""
                        aria-hidden="true"
                        height={20}
                        src="/figma/homepage/linkedin.svg"
                        unoptimized
                        width={20}
                      />
                    ) : (
                      <OrganizationHorizontal20Regular />
                    )}
                    {item.detail}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.toolsSection} id="tools">
          <div className={styles.toolGrid}>
            {toolCards.map((tool) => (
              <article className={styles.toolCard} key={tool.title}>
                <div className={styles.toolImage}>
                  <Image
                    alt=""
                    fill
                    sizes="364px"
                    src={tool.image}
                    unoptimized
                  />
                </div>
                <div
                  className={`${styles.toolContent} ${styles[`toolTheme${tool.theme}`]}`}
                >
                  <Image
                    alt=""
                    aria-hidden="true"
                    className={styles.toolDecoration}
                    height={946}
                    src="/figma/homepage/tool-group-7.svg"
                    unoptimized
                    width={946}
                  />
                  <Image
                    alt=""
                    aria-hidden="true"
                    className={styles.toolEllipseTop}
                    height={374}
                    src="/figma/homepage/tool-ellipse-5.svg"
                    unoptimized
                    width={374}
                  />
                  <Image
                    alt=""
                    aria-hidden="true"
                    className={styles.toolEllipseBottom}
                    height={438}
                    src="/figma/homepage/tool-ellipse-6.svg"
                    unoptimized
                    width={438}
                  />
                  <div className={styles.toolCopy}>
                    <span className={styles.outlineBadge}>
                      <ToolBadgeIcon type={tool.type} />
                      {tool.badge}
                    </span>
                    <div>
                      <h2>{tool.title}</h2>
                      <p>{tool.description}</p>
                    </div>
                  </div>
                  <a className={styles.primaryButton} href="#resources">
                    {tool.buttonLabel}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.resourcesSection} id="resources">
          <div className={styles.resourcesInner}>
            <header className={styles.resourcesIntro}>
              <h2>Put insights to work</h2>
              <p>
                Use prompts, skills, and analysis resources created to help
                People Science and HR teams explore questions, work with
                evidence, and move from insight to action.
              </p>
            </header>
            <div className={styles.resourceRows}>
              {resourceRows.map((resource) => (
                <article className={styles.resourceRow} key={resource.title}>
                  <span className={styles.resourceIcon}>
                    <ResourceIcon type={resource.type} />
                  </span>
                  <div>
                    <h3>{resource.title}</h3>
                    <p>{resource.description}</p>
                  </div>
                  <a className={styles.primaryButton} href="#tools">
                    View all
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      <footer className={styles.siteFooter} id="subscribe">
        <div className={styles.footerStatement}>
          <h2>
            We turn People Science research into better workplace decisions.
          </h2>
          <a className={styles.footerButton} href="#top">
            About Glint Labs
          </a>
        </div>
        <div className={styles.footerDivider} />
        <div className={styles.footerLower}>
          <div className={styles.subscribeColumn}>
            <strong>Stay informed</strong>
            <p>
              Get new People Science research, practical tools, and
              evidence-based guidance each month.
            </p>
            <label className={styles.emailInput}>
              <span className={styles.visuallyHidden}>Work email</span>
              <input placeholder="Work email" type="email" />
              <Image
                alt=""
                aria-hidden="true"
                height={24}
                src="/figma/homepage/footer-arrow.svg"
                unoptimized
                width={24}
              />
            </label>
          </div>
          <nav aria-label="Footer" className={styles.footerLinks}>
            <div>
              {researchLinks.map((link) => (
                <a href="#featured" key={link}>
                  {link}
                </a>
              ))}
            </div>
            <div>
              {resourceLinks.map((link) => (
                <a href="#tools" key={link}>
                  {link}
                </a>
              ))}
            </div>
          </nav>
        </div>
      </footer>
    </main>
  );
}
