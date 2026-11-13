import type { ReportBlock } from "../manifest/report-manifest.ts";
import styles from "./percentage-ring-group.module.css";

type PercentageRingGroupBlock = Extract<
  ReportBlock,
  { type: "percentage-ring-group" }
>;

export function PercentageRingGroup({
  block,
}: {
  block: PercentageRingGroupBlock;
}) {
  const isStudioChart = block.source.part === "studio";
  const note = block.presentation?.note;
  const footnote = isStudioChart
    ? block.verifiedSource?.synthetic ? "Synthetic example · Not research findings" : undefined
    : block.footnote;
  const hasFootnote = Boolean(note || footnote);
  function displayValue(id: string, value: number) {
    const raw = block.verifiedSource?.rows.find(row => row.id === id)?.cells[1]?.replace(/%\s*$/, "").trim();
    return `${raw && Number(raw) === value ? raw : value}%`;
  }
  return (
    <figure
      className={styles.visual}
      aria-labelledby={`${block.id}-title`}
      aria-describedby={hasFootnote ? `${block.id}-footnote` : undefined}
    >
      <h3 className={styles.title} id={`${block.id}-title`}>
        {block.presentation?.title ?? block.title}
      </h3>
      <div className={styles.metrics} data-metric-count={block.metrics.length}>
        {block.metrics.map((metric, index) => (
          <div className={styles.metricGroup} key={metric.id}>
            {index > 0 ? <span className={styles.divider} aria-hidden="true" /> : null}
            <div className={styles.metric}>
              <div
                className={styles.ring}
                aria-label={displayValue(metric.id, metric.value)}
                role="img"
              >
                <svg aria-hidden="true" viewBox="0 0 154 154">
                  <defs>
                    <linearGradient
                      id={`${metric.id}-gradient`}
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop offset="0" stopColor="var(--report-ring-start, #16bbda)" />
                      <stop offset="1" stopColor="var(--report-ring-end, #149bb5)" />
                    </linearGradient>
                  </defs>
                  <circle className={styles.ringTrack} cx="77" cy="77" r="63" />
                  <circle
                    className={styles.ringValue}
                    cx="77"
                    cy="77"
                    pathLength="100"
                    r="63"
                    stroke={`url(#${metric.id}-gradient)`}
                    strokeDasharray={`${metric.value} ${100 - metric.value}`}
                    strokeDashoffset={metric.value}
                  />
                </svg>
                <strong>{displayValue(metric.id, metric.value)}</strong>
              </div>
              <p>{metric.description}</p>
            </div>
          </div>
        ))}
      </div>
      {hasFootnote ? <figcaption className={styles.footnote} id={`${block.id}-footnote`}>
        {note ? <p>{note}</p> : null}
        {footnote}
      </figcaption> : null}
    </figure>
  );
}
