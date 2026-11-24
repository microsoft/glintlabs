import type { ReportBlock } from "../manifest/report-manifest.ts";
import styles from "./report-renderer.module.css";

type TableBlock = Extract<ReportBlock, { type: "data-visual-source" }>;

export function ReportTable({ block }: { block: TableBlock }) {
  const { data } = block;
  const presentation = block.tablePresentation;
  const headerRow = presentation?.headerRow ?? true;
  return <figure className={styles.reportTable} data-table-tone={presentation?.tone ?? "blue"}>
    <div className={styles.accessibleDataScroller} role="region" aria-label={data.title} tabIndex={0}>
      <table>
        <caption className={presentation?.showTitle ? undefined : styles.visuallyHidden}>{data.title}</caption>
        {headerRow ? <thead><tr>{data.columns.map((column, index) =>
          column.trim() ? <th key={index} scope="col">{column}</th> : <td key={index}>{column}</td>)}</tr></thead> : null}
        <tbody>
          {!headerRow ? <tr>{data.columns.map((column, index) => <td key={index}>{column}</td>)}</tr> : null}
          {data.rows.map(row => <tr key={row.id}>{row.cells.map((cell, index) =>
            index === 0 && headerRow && cell.trim() ? <th key={index} scope="row">{cell}</th> : <td key={index}>{cell}</td>
          )}</tr>)}
        </tbody>
      </table>
    </div>
    {data.sourceNote ? <figcaption>{data.sourceNote}</figcaption> : null}
  </figure>;
}
