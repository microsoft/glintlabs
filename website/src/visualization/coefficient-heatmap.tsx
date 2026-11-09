import type { CSSProperties } from "react";
import { heatmapPresentationSchema, type HeatmapPresentation, type ReportBlock } from "../manifest/report-manifest";
import type { ChartTable } from "./chart-authoring";
import { parseHeatmapValue } from "./verified-data-visual";
import styles from "./coefficient-heatmap.module.css";

export function CoefficientHeatmap(props: {
  block: Extract<ReportBlock, { type: "coefficient-heatmap" }>;
} | {
  draft: { id: string; table: ChartTable; presentation: HeatmapPresentation };
}) {
  const isDraft = "draft" in props;
  const block = "block" in props ? props.block : {
    id: props.draft.id,
    title: props.draft.presentation.title,
    presentation: props.draft.presentation,
    columns: props.draft.table.columns.slice(1),
    rows: props.draft.table.rows.map(row => ({
      id: row.id, label: row.cells[0]?.trim() || "Add factor",
      values: props.draft.table.columns.slice(1).map((_, index) => parseHeatmapValue(row.cells[index + 1] ?? "")),
    })),
    sourceNote: "",
  };
  const factorLabel = "block" in props ? props.block.verifiedSource?.columns[0] ?? "Factor"
    : props.draft.table.columns[0]?.trim() || "Add factor column";
  const settings = heatmapPresentationSchema.parse({ title: block.title, ...block.presentation });
  const level = (value: number) => Math.min(4, Math.max(0, Math.floor(
    (value - settings.scaleMin) / (settings.scaleMax - settings.scaleMin) * 5 + Number.EPSILON * 8,
  )));
  const format = (value: number) => value === 0 ? value.toFixed(settings.decimals)
    : value.toFixed(settings.decimals).replace(/^(-?)0\./, "$1.");
  const endpoint = (value: number) => {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: settings.decimals, maximumFractionDigits: 6,
    }).format(value);
    return value === 0 ? formatted : formatted.replace(/^(-?)0\./, "$1.");
  };
  const legend = <>
    <span>{settings.legendLabel}</span>
    <div className={styles.scale}>
      <div className={styles.bands} aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => <span key={index} data-level={index} />)}
      </div>
      <div className={styles.endpoints}>
        {Array.from({ length: 5 }, (_, index) => <span key={index}>
          {endpoint(settings.scaleMin + (settings.scaleMax - settings.scaleMin) * index / 5)}
        </span>)}
      </div>
    </div>
  </>;
  return <figure className={styles.figure} data-coefficient-heatmap data-chart-draft={isDraft ? "coefficient-heatmap" : undefined}
    style={{ "--heatmap-period-count": Math.max(1, block.columns.length) } as CSSProperties}>
    <header className={styles.header}>
      <h2 id={`${block.id}-heatmap-title`}>{settings.title}</h2>
      {settings.subtitle ? <p>{settings.subtitle}</p> : null}
    </header>
    <div className={styles.scroll} role="region" aria-label="Heatmap values; scroll to see all periods" tabIndex={0}>
      <div className={styles.plot}>
      <table className={styles.matrix}
        aria-labelledby={`${block.id}-heatmap-title`}>
        <caption className={styles.screenReaderOnly}>
          {settings.legendLabel}. Scale ranges from {endpoint(settings.scaleMin)} to {endpoint(settings.scaleMax)}.
          Five equal-width color bands. Values outside the scale use its end colors. {settings.missingLabel} means not available.
        </caption>
        <thead><tr>
          <th scope="col" className={styles.corner}><span className={styles.screenReaderOnly}>{factorLabel}</span></th>
          {block.columns.map((column, index) => {
            const label = column.trim() || "Add period";
            const date = label.match(/^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{4}|['’]\d{2})$/i);
            return <th scope="col" key={index} aria-label={label}>
              <span className={date ? styles.fullPeriod : undefined}>{label}</span>
              {date ? <span className={styles.compactPeriod} aria-hidden={true}>
                <span>{date[1][0].toUpperCase() + date[1].slice(1, 3).toLowerCase()}</span><span>{date[2]}</span>
              </span> : null}
            </th>;
          })}
        </tr></thead>
        <tbody>{block.rows.map(row => <tr key={row.id}>
          <th scope="row">{row.label}</th>
          {row.values.map((value, index) => <td key={index} data-level={typeof value === "number" ? level(value) : undefined}
            className={typeof value === "number" ? undefined : styles.missing}
            title={value === undefined ? "Invalid coefficient" : value === null ? "Not available" : String(value)}>
            {value === undefined ? "Check coefficient" : value === null ? settings.missingLabel : format(value)}
          </td>)}
        </tr>)}</tbody>
      </table>
      <div className={`${styles.legend} ${styles.desktopLegend}`} aria-label="Color scale">{legend}</div>
      </div>
    </div>
    <div className={styles.mobileLegend} aria-label="Color scale">{legend}</div>
    {settings.note || block.sourceNote ? <figcaption className={styles.note}>{settings.note || block.sourceNote}</figcaption> : null}
  </figure>;
}
