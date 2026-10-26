"use client";

import { Dismiss24Regular } from "@fluentui/react-icons/svg/dismiss";
import { Navigation24Regular } from "@fluentui/react-icons/svg/navigation";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { HeroTransitionLink } from "./hero-transition-link";

import styles from "./site-navigation.module.css";

type SiteNavigationProps = {
  className?: string;
  preview?: boolean;
  previewViewport?: boolean;
  variant: "annual-report-2026" | "core";
};

export function SiteNavigation({
  className,
  preview = false,
  previewViewport = false,
  variant,
}: SiteNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isMenuOpen) return;
    const navigation = navigationRef.current;
    const document = navigation?.ownerDocument;
    const window = document?.defaultView;
    if (!navigation || !document || !window) return;

    function dismissOutside(event: PointerEvent) {
      if (!navigation!.contains(event.target as Node)) setIsMenuOpen(false);
    }

    function dismissWithEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsMenuOpen(false);
      toggleRef.current?.focus();
    }

    const observer = new ResizeObserver(() => {
      if (toggleRef.current && window.getComputedStyle(toggleRef.current).display === "none") {
        setIsMenuOpen(false);
      }
    });
    observer.observe(navigation);
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissWithEscape);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissWithEscape);
    };
  }, [isMenuOpen]);

  const isAnnualReport = variant === "annual-report-2026";
  const navigationClassName = [
    styles.navigation,
    isAnnualReport ? styles.annualReport : styles.core,
    preview && !previewViewport ? styles.reportPreview : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const brandContent = (
    <>
      <Image
        alt=""
        aria-hidden="true"
        height={18}
        priority
        src={
          isAnnualReport
            ? "/figma/site-canonical/home/group.svg"
            : "/figma/site-canonical/home/group1.svg"
        }
        unoptimized
        width={81}
      />
      <span aria-hidden="true" className={styles.brandDivider} />
      <span translate="no">Glint Labs</span>
    </>
  );

  return (
    <nav
      aria-label="Primary"
      className={navigationClassName}
      data-figma-node-id={isAnnualReport ? "1655:43230" : "1470:17215"}
      data-menu-open={isMenuOpen ? "true" : undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsMenuOpen(false);
      }}
      ref={navigationRef}
    >
      <div className={styles.headerRow}>
        {preview ? (
          <span aria-disabled="true" className={`${styles.link} ${styles.brand}`} role="link">
            {brandContent}
          </span>
        ) : (
          <HeroTransitionLink
            className={`${styles.link} ${styles.brand}`}
            href="/"
            onClick={() => setIsMenuOpen(false)}
          >
            {brandContent}
          </HeroTransitionLink>
        )}
        <button
          aria-controls={menuId}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className={styles.menuToggle}
          onClick={() => setIsMenuOpen((open) => !open)}
          ref={toggleRef}
          type="button"
        >
          {isMenuOpen ? <Dismiss24Regular aria-hidden="true" /> : <Navigation24Regular aria-hidden="true" />}
        </button>
      </div>
      <div className={styles.items} id={menuId}>
        {[
          { href: "/reports", label: "Reports" },
          { href: "/tools", label: "Tools" },
          { href: "/about", label: "About" },
        ].map(({ href, label }) => preview ? (
          <span aria-disabled="true" className={styles.link} key={href} role="link">
            {label}
          </span>
        ) : (
          <Link className={styles.link} href={href} key={href} onClick={() => setIsMenuOpen(false)}>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
