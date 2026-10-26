"use client";

import {
  Calendar16Regular,
  HourglassHalf16Regular,
  PersonEdit16Regular,
} from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";

import styles from "./report-side-nav.module.css";

type ReportSection = {
  href: string;
  label: string;
};

type ReportSideNavProps = {
  authorHandle?: string;
  authorName: string;
  authors?: { name: string; role: string }[];
  dark?: boolean;
  publishedDate: string;
  readTimeMinutes: number;
  sections: ReportSection[];
};

export function ReportSideNav({
  authorHandle,
  authorName,
  authors,
  dark = false,
  publishedDate,
  readTimeMinutes,
  sections,
}: ReportSideNavProps) {
  const [activeSectionIndex, setActiveSectionIndex] = useState(-1);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const document = navRef.current?.ownerDocument;
    const window = document?.defaultView;
    if (!document || !window) return;
    let animationFrame = 0;

    const updateActiveSection = () => {
      animationFrame = 0;
      let nextActiveIndex = -1;

      for (const [index, section] of sections.entries()) {
        const target = document.getElementById(
          decodeURIComponent(section.href.replace(/^#/, "")),
        );

        if (target && target.getBoundingClientRect().top <= 160) {
          nextActiveIndex = index;
        } else if (target) {
          break;
        }
      }

      const scroller = document.scrollingElement ?? document.documentElement;
      if (
        sections.length > 0 &&
        scroller.scrollTop > 0 &&
        scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop <= 2
      ) {
        nextActiveIndex = sections.length - 1;
      }

      setActiveSectionIndex((currentIndex) =>
        currentIndex === nextActiveIndex ? currentIndex : nextActiveIndex,
      );
    };

    const scheduleUpdate = () => {
      if (animationFrame === 0) {
        animationFrame = window.requestAnimationFrame(updateActiveSection);
      }
    };

    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [sections]);

  return (
    <aside className={`${styles.sideNav} ${dark ? styles.dark : ""}`} ref={navRef}>
      <div className={`${styles.metadata} ${authors?.length ? styles.credits : ""}`}>
        {!authors?.length ? (
          <div className={styles.icons} aria-hidden="true">
            <span>
              <PersonEdit16Regular />
            </span>
            <span>
              <Calendar16Regular />
            </span>
            <span>
              <HourglassHalf16Regular />
            </span>
          </div>
        ) : null}
        <div className={styles.details}>
          {authors?.length ? (
            <div className={styles.authors}>
              {authors.map(({ name, role }) => (
                <div className={styles.creditedAuthor} key={name}>
                  <span>{name}</span>
                  <span className={styles.authorRole}>{role}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.author}>
              <span>{authorName}</span>
              {authorHandle ? <span>{authorHandle}</span> : null}
            </div>
          )}
          <span>
            {publishedDate} • {readTimeMinutes} min read
          </span>
        </div>
      </div>
      <div className={styles.divider} aria-hidden="true" />
      {sections.length > 0 ? (
        <nav aria-label="Report sections">
          <ol className={styles.sections}>
            {sections.map((section, index) => (
              <li key={section.href}>
                <a
                  aria-current={
                    index === activeSectionIndex ? "location" : undefined
                  }
                  className={
                    index < activeSectionIndex ? styles.pastSection : undefined
                  }
                  href={section.href}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
    </aside>
  );
}
