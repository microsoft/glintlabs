"use client";

import { useEffect, useState } from "react";
import styles from "./staging-badge.module.css";

export function StagingBadge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible([
      "musical-potato-nkv2vk5.pages.github.io",
      "localhost",
      "127.0.0.1",
      "[::1]",
    ].includes(window.location.hostname));
  }, []);

  return visible ? <span className={styles.badge} data-glintlabs-environment="staging">Staging</span> : null;
}
