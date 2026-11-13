import { Fragment } from "react";
import Image from "next/image";

import { statisticIllustration } from "./statistic-illustrations.ts";
import styles from "./illustrated-statistics.module.css";

export function IllustratedStatistics({
  id, title, findings, illustrations, valueLabel = "selected", note, sourceNote, synthetic, draft,
}: {
  id: string;
  title: string;
  findings: { id: string; value: string; description: string; valueMissing?: boolean; descriptionMissing?: boolean }[];
  illustrations?: Record<string, string>;
  valueLabel?: string;
  note?: string;
  sourceNote?: string;
  synthetic?: boolean;
  draft?: boolean;
}) {
  return <figure className={styles.visual} aria-labelledby={`${id}-title`}
    data-chart-draft={draft ? "illustrated-statistics" : undefined} data-column-count={findings.length}>
    <h3 id={`${id}-title`} className={styles.title}>{title}</h3>
    <div className={styles.columns}>
      {findings.map((finding, index) => {
        const illustration = statisticIllustration(illustrations?.[finding.id], index);
        return <Fragment key={finding.id}>
          {index > 0 ? <span className={styles.divider} aria-hidden="true" /> : null}
          <div className={styles.column}>
            <Image className={styles.illustration} src={illustration.src} alt="" width={128} height={128} unoptimized />
            <strong className={styles.value} data-chart-placeholder={finding.valueMissing || undefined}>
              {finding.value}{!finding.valueMissing && valueLabel.trim() ? ` ${valueLabel.trim()}` : ""}
            </strong>
            <p className={styles.description} data-chart-placeholder={finding.descriptionMissing || undefined}>
              {finding.description}
            </p>
          </div>
        </Fragment>;
      })}
    </div>
    {note?.trim() || sourceNote || synthetic ? <figcaption className={styles.footnote}>
      {note?.trim() ? <p>{note}</p> : null}
      {sourceNote && sourceNote !== note ? <p>{sourceNote}</p> : null}
      {synthetic ? <p>Synthetic example data. Not research findings.</p> : null}
    </figcaption> : null}
  </figure>;
}
