import type { ChartTable } from "../visualization/chart-authoring.ts";
import { parseChartValue, type ChartValueType, type VerifiedDataVisualType } from "../visualization/verified-data-visual.ts";
import styles from "./report-renderer.module.css";

export type ChartDraftPreviewData = {
  blockId: string;
  type: VerifiedDataVisualType;
  title: string;
  table: ChartTable;
  unit: ChartValueType;
};

export function ChartDraftPreview({ draft }: { draft: ChartDraftPreviewData }) {
  const grouped = draft.type === "grouped-column-comparison";
  const paired = draft.type === "paired-percentage-comparison";
  const rings = draft.type === "percentage-ring-group";
  const requiredRows = grouped ? 4 : paired ? 2 : rings ? 3 : undefined;
  const shapeFits = draft.table.columns.length === (grouped ? 3 : 2) &&
    (!requiredRows || draft.table.rows.length === requiredRows) &&
    (draft.type === "horizontal-bar-chart" || draft.unit === "percentage");
  const rows = shapeFits ? draft.table.rows : Array.from({ length: requiredRows ?? 2 }, (_, index) => ({
    id: `missing-${index}`, cells: grouped ? ["", "", ""] : ["", ""],
  }));
  function value(raw: string | undefined) {
    const number = parseChartValue(raw ?? "", draft.unit);
    return number === undefined ? "—" : `${raw!.replace(/%\s*$/, "").trim()}${draft.unit === "percentage" ? "%" : ""}`;
  }
  return <figure className={styles.draftChart} data-chart-draft={draft.type} aria-label="Draft chart preview with missing-value placeholders">
    <figcaption className={styles.draftChartHeading}>
      <span>Draft preview</span>
      <h3>{draft.title.trim() || "Chart title"}</h3>
    </figcaption>
    <div className={styles.draftChartBody} data-chart-type={draft.type}>
      {rows.map(row => <div key={row.id} className={styles.draftChartItem}>
        {rings ? <div className={styles.draftRing}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="48" />
          </svg>
          <strong>{value(row.cells[1])}</strong>
        </div> : paired ? <strong className={styles.draftFinding}>{value(row.cells[1])}</strong>
          : grouped ? <div className={styles.draftColumns}>{[1, 2].map(column => <div key={column}>
            <span>{value(row.cells[column])}</span><i aria-hidden="true" />
          </div>)}</div>
          : <><span>{row.cells[0].trim() || "—"}</span><i className={styles.draftBar} aria-hidden="true" /><strong>{value(row.cells[1])}</strong></>}
        {paired || rings || grouped ? <span>{row.cells[0].trim() || "—"}</span> : null}
      </div>)}
    </div>
    <p className={styles.draftChartHelp}>Missing values are shown as —. Complete the data to apply this chart.</p>
  </figure>;
}
