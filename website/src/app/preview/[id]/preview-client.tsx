"use client";

import { Body1, Caption1, Subtitle1 } from "@fluentui/react-text";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BrowserProjectStorage } from "../../../project/project-storage.ts";
import type { StudioProject } from "../../../project/studio-project.ts";
import { ReportRenderer } from "../../../report-system/report-renderer";
import styles from "./preview.module.css";

export function PreviewClient({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<StudioProject>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void new BrowserProjectStorage(window.localStorage)
      .load(projectId)
      .then((storedProject) => {
        if (active) {
          setProject(storedProject);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "This local preview could not be opened.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  if (error) {
    return (
      <main className={styles.message}>
        <Subtitle1 as="h1" block>
          Preview unavailable
        </Subtitle1>
        <Body1 block>{error}</Body1>
        <Link href="/">Back to Publishing Studio</Link>
      </main>
    );
  }

  if (!project) {
    return (
      <main className={styles.message} role="status">
        <Subtitle1 as="h1" block>
          Opening preview…
        </Subtitle1>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.previewBar}>
        <div>
          <Subtitle1>Glint Labs</Subtitle1>
          <Caption1 block>
            {project.status === "ready"
              ? "Integrity-verified local preview"
              : "Review-required local preview"}
          </Caption1>
        </div>
        <Link href="/">Back to Editing</Link>
      </header>
      <div className={styles.canvas}>
        <div className={styles.reportSurface}>
          <ReportRenderer
            manifest={project.manifest}
            mode="read"
            reportStyle={project.reportStyle}
          />
        </div>
      </div>
    </main>
  );
}
