import { Calendar16Regular } from "@fluentui/react-icons/svg/calendar";
import { DataHistogram16Regular } from "@fluentui/react-icons/svg/data-histogram";
import { People16Regular } from "@fluentui/react-icons/svg/people";
import { PersonCircle16Regular } from "@fluentui/react-icons/svg/person-circle";
import Image from "next/image";
import Link from "next/link";

import type { ReportCatalogItem } from "../reports/reports-data";
import styles from "./study-card.module.css";

const employeeCountFormatter = new Intl.NumberFormat("en-US");

export function EmployeeCountBadge({ count }: { count?: number }) {
  if (count === undefined || !Number.isSafeInteger(count) || count <= 0) return null;
  return <span className={styles.badge}><People16Regular aria-hidden="true" />{employeeCountFormatter.format(count)} {count === 1 ? "Employee" : "Employees"}</span>;
}

export function AnnualStudyBadges() {
  return (
    <div className={styles.badges}>
      <span><Calendar16Regular aria-hidden="true" />2026 &bull; Next Gen Employee Listening Report</span>
      <span><PersonCircle16Regular aria-hidden="true" />100+ Listening Leaders</span>
      <span><People16Regular aria-hidden="true" />500 Employees</span>
    </div>
  );
}

export function StudyPhoto({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`${styles.photo} ${className}`}>
      <Image data-hero-image src="/figma/site-canonical/home/frame147.png" alt="Colleagues collaborating around a laptop" width={1024} height={684} priority={priority} unoptimized />
      <span aria-hidden="true" className={styles.photoGlowTop} />
      <span aria-hidden="true" className={styles.photoGlowBottom} />
    </div>
  );
}

export function StudyCard({
  report,
  headingLevel = "h3",
  placeholder = false,
  preview = false,
}: {
  report: ReportCatalogItem;
  headingLevel?: "h2" | "h3" | "h4";
  placeholder?: boolean;
  preview?: boolean;
}) {
  const illustration = report.thumbnail?.presentation === "illustration";
  const Heading = headingLevel;

  return (
    <article aria-label={placeholder ? "Report placeholder" : undefined} className={styles.card}>
      <div className={styles.cardContent}>
        {preview && !report.thumbnail ? <div className={styles.imagePlaceholder}>Choose a catalog image</div> : <Image
          alt={report.thumbnail?.alt ?? ""}
          aria-hidden={report.thumbnail ? undefined : true}
          className={report.thumbnail && !illustration ? styles.thumbnail : styles.illustration}
          src={report.thumbnail?.src ?? "/figma/site-canonical/home/report.svg"}
          width={128}
          height={128}
          unoptimized
        />}
        <div className={styles.cardBadges}>
          <span className={styles.badge}>{placeholder ? <DataHistogram16Regular aria-hidden="true" /> : <Image src="/figma/site-canonical/home/study-card-calendar.svg" alt="" width={16} height={16} unoptimized />}{report.badge}</span>
          {placeholder ? <span className={styles.badge}><People16Regular aria-hidden="true" />[n] Employees</span> : <EmployeeCountBadge count={report.employeeCount} />}
        </div>
        <div>
          <Heading>{report.title}</Heading>
          <p>{report.description}</p>
        </div>
      </div>
      {preview || placeholder ? <span className={styles.action}>Explore the study</span> : <Link className={styles.action} href={report.href} aria-label={`Explore the study: ${report.title}`}>
        Explore the study
      </Link>}
    </article>
  );
}
