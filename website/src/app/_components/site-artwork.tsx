import Image from "next/image";

import styles from "./site-artwork.module.css";

export function SiteArtwork({
  variant,
}: {
  variant: "home" | "reports" | "tools" | "about" | "section";
}) {
  return (
    <div aria-hidden="true" className={`${styles.artwork} ${styles[variant]}`}>
      <span className={styles.grid} />
      {variant === "home" ? (
        <Image className={styles.diagonalGrid} src="/figma/site-canonical/home/group6.svg" alt="" width={946} height={946} unoptimized />
      ) : null}
      <span className={styles.glowTop} />
      {variant === "home" || variant === "about" ? <span className={styles.glowLeft} /> : null}
      {variant !== "section" ? <span className={styles.glowBottom} /> : null}
    </div>
  );
}
