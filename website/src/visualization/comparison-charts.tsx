import type { CSSProperties } from "react";
import type { ReportBlock } from "../manifest/report-manifest";
import styles from "./comparison-charts.module.css";

type ComparisonBlock = Extract<ReportBlock, {
  type: "grouped-column-comparison" | "grouped-bar-comparison" | "comparison-panel-group";
}>;

export function percentagePointDifference(first: number, second: number) {
  const difference = Number((first - second).toFixed(10));
  return `${difference > 0 ? "+" : ""}${difference}pp`;
}

export function ComparisonChart({ block }: { block: ComparisonBlock }) {
  const seriesKeys = ["A", "B", "C"] as const;
  const presentation = block.presentation;
  const title = presentation?.title ?? block.title;
  const panelStyle = block.type === "comparison-panel-group" ? presentation?.panelStyle ?? "bars" : undefined;
  const horizontal = block.type === "grouped-bar-comparison" || panelStyle === "bars";
  const panels = block.type === "comparison-panel-group";
  const groups = panels ? block.panels.map(panel => ({
    id: panel.id, label: panel.title, series: panel.series, values: panel.values,
  })) : block.groups.map(group => ({ ...group, series: block.series }));
  const sourceBars = block.type === "grouped-bar-comparison" && groups.length === 1 &&
    Boolean(presentation?.sourceBars || block.verifiedSource?.imageReconstruction);
  const legacyAnnotation = sourceBars && !presentation?.sourceBars && groups[0].values.length === 2 &&
    /^[+-]?\d+(?:\.\d+)?\s*pp$/i.test(presentation?.note.trim() ?? "") ? presentation?.note.trim() : undefined;
  const annotation = sourceBars && groups[0].values.length === 2
    ? presentation?.sourceBars?.annotation ?? legacyAnnotation : undefined;
  const sourceColors = presentation?.sourceBars?.useSourceColors === false ? undefined : presentation?.sourceBars?.colors;
  function valueLabel(id: string, index: number, value: number) {
    const raw = block.verifiedSource?.rows.find(row => row.id === id)?.cells[index + 1]?.replace(/%\s*$/, "").trim();
    return `${raw && Number(raw) === value ? raw : value}%`;
  }
  function legend(series: string[], id: string) {
    return <ul className={styles.legend} aria-label={panels ? `Legend: ${id}` : "Series legend"}>
      {series.map((label, index) => <li key={index}><i data-series={index} aria-hidden="true" />
        {!sourceBars ? <span className={styles.seriesKey} data-series-key={index} aria-hidden="true">{seriesKeys[index]}</span>
          : null}{label}</li>)}
    </ul>;
  }
  return <figure className={styles.figure} data-comparison-type={block.type}
    data-comparison-layout={sourceBars ? "source-bars" : undefined}
    style={sourceColors ? { "--comparison-primary": sourceColors[0], "--comparison-secondary": sourceColors[1],
      "--comparison-third": sourceColors[2] } as CSSProperties : undefined}
    data-palette={presentation?.palette ?? "brand"} data-panel-style={panelStyle}
    data-density={presentation?.density ?? "comfortable"}>
    <figcaption className={styles.heading}>
      <h3>{title}</h3>
      {(presentation?.subtitle ?? block.subtitle) ? <p>{presentation?.subtitle ?? block.subtitle}</p> : null}
    </figcaption>
    <div className={styles.groups} data-horizontal={horizontal || undefined} data-panels={panels || undefined}>
      {groups.map(group => <section key={group.id} className={styles.group} aria-label={group.label}>
        {horizontal || panels ? <h4>{group.label}</h4> : null}
        <div className={horizontal ? styles.bars : panelStyle === "percentages" ? styles.percentages : styles.columns}>
          {group.values.map((value, index) => <div key={index} className={styles.mark}
            style={{ "--comparison-value": `${value}%` } as CSSProperties}
            aria-label={`${group.series[index]}: ${valueLabel(group.id, index, value)}`}>
            <span className={styles.seriesLabel}>{group.series[index]}</span>
            <i data-series={index} aria-hidden="true" />
            <strong>{!sourceBars ? <span className={styles.seriesKey} data-series-key={index} aria-hidden="true">
              {seriesKeys[index]}</span> : null}{valueLabel(group.id, index, value)}</strong>
          </div>)}
          {sourceBars && annotation && group.values.length === 2 ? <span className={styles.comparisonArrow}
            role="img" aria-label={`${group.series[0]} to ${group.series[1]}: ${annotation} (percentage points)`}
            data-comparison-arrow={annotation}
            style={{ "--comparison-first": `${group.values[0]}%`, "--comparison-second": `${group.values[1]}%` } as CSSProperties}>
            <i className={styles.connectorStart} aria-hidden="true" />
            <i className={styles.connectorSpine} aria-hidden="true" />
            <i className={styles.connectorEnd} aria-hidden="true" />
            <span className={styles.annotationLabel} aria-hidden="true">{annotation}</span>
          </span> : null}
        </div>
        {!horizontal && !panels ? <h4>{group.label}</h4> : null}
        {presentation?.showDifference && !annotation && group.values.length === 2 ? <p className={styles.difference}
          aria-label={`${group.series[0]} minus ${group.series[1]}: ${percentagePointDifference(group.values[0], group.values[1])} (percentage points)`}>
          {percentagePointDifference(group.values[0], group.values[1])}
        </p> : null}
        {panels ? legend(group.series, group.label) : null}
      </section>)}
    </div>
    {!panels ? legend(block.series, title) : null}
    {presentation?.note && !legacyAnnotation ? <p className={styles.note}>{presentation.note}</p> : null}
    <p className={styles.source}>{block.sourceNote}</p>
    {block.verifiedSource?.synthetic ? <p className={styles.source}>Synthetic example · Not research findings</p> : null}
    <div className={styles.accessibleData}>
      <table>
        <caption>{title} · Percentage values in source order</caption>
        <thead><tr><th scope="col">Category</th><th scope="col">Series</th><th scope="col">Percentage</th></tr></thead>
        <tbody>{groups.flatMap(group => group.values.map((value, index) => <tr key={`${group.id}-${index}`}>
          <th scope="row">{group.label}</th><td>{group.series[index]}</td><td>{valueLabel(group.id, index, value)}</td>
        </tr>))}</tbody>
      </table>
    </div>
  </figure>;
}
