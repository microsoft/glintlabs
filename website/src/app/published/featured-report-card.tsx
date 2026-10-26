import Image from "next/image";
import Link from "next/link";

import type { FeaturedThumbnail } from "../../publishing/published-preview.ts";
import styles from "./homepage-preview.module.css";

type ResearchCardTag = {
  icon: string;
  label: string;
};

type ResearchCardVisual =
  | {
      alt: string;
      kind: "asset";
      src: string;
    }
  | {
      kind: "thumbnail";
      thumbnail: FeaturedThumbnail;
    };

export function ResearchCard({
  buttonLabel = "Explore the study",
  description,
  href,
  tags,
  title,
  visual,
}: {
  buttonLabel?: string;
  description: string;
  href: string;
  tags: ResearchCardTag[];
  title: string;
  visual: ResearchCardVisual;
}) {
  return (
    <Link className={styles.researchCard} href={href}>
      <span className={styles.researchCardBody}>
        <span className={styles.researchCardVisual}>
          {visual.kind === "thumbnail" ? (
            <Image
              alt={visual.thumbnail.alt}
              fill
              sizes="96px"
              src={visual.thumbnail.src}
              style={{
                objectPosition: `${visual.thumbnail.focalPointX}% ${visual.thumbnail.focalPointY}%`,
              }}
              unoptimized
            />
          ) : (
            <Image
              alt={visual.alt}
              height={96}
              src={visual.src}
              unoptimized
              width={96}
            />
          )}
        </span>
        <span className={styles.researchCardCopy}>
          <strong>{title}</strong>
          <span className={styles.researchCardDescription}>{description}</span>
        </span>
        <span className={styles.researchCardTags}>
          {tags.map((tag) => (
            <span className={styles.researchTag} key={tag.label}>
              <Image
                alt=""
                aria-hidden="true"
                height={16}
                src={tag.icon}
                unoptimized
                width={16}
              />
              {tag.label}
            </span>
          ))}
        </span>
      </span>
      <span className={styles.primaryButton}>{buttonLabel}</span>
    </Link>
  );
}

export function FeaturedReportCard({
  description,
  eyebrow,
  href,
  thumbnail,
  title,
}: {
  description: string;
  eyebrow: string;
  href?: string;
  thumbnail: FeaturedThumbnail;
  title: string;
}) {
  return (
    <ResearchCard
      description={description}
      href={href ?? "#"}
      tags={[
        {
          icon: "/figma/homepage/featured-topic.svg",
          label: eyebrow,
        },
        {
          icon: "/figma/homepage/featured-people.svg",
          label: "People Science",
        },
        {
          icon: "/figma/homepage/featured-globe.svg",
          label: "Global research",
        },
      ]}
      title={title}
      visual={{ kind: "thumbnail", thumbnail }}
    />
  );
}
