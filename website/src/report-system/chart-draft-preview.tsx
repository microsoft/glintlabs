import type { ChartTable } from "../visualization/chart-authoring.ts";
import { parseChartValue, type ChartValueType, type VerifiedDataVisualType } from "../visualization/verified-data-visual.ts";
import { PercentageComparisonGrid } from "../visualization/canonical-report-components";
import styles from "./report-renderer.module.css";

export type ChartDraftPreviewData = {
  blockId: string;
  type: VerifiedDataVisualType;
  title: string;
  subtitle?: string;
  leadIns?: [string, string];
  note?: string;
  palette?: string;
  table: ChartTable;
  unit: ChartValueType;
};

export function ChartDraftPreview({ draft }: { draft: ChartDraftPreviewData }) {
  const grouped = draft.type === "grouped-column-comparison";
  const grid = draft.type === "percentage-comparison-grid";
  const paired = draft.type === "paired-percentage-comparison";
  const rings = draft.type === "percentage-ring-group";
  const requiredRows = grouped || grid ? 4 : paired ? 2 : rings ? 3 : undefined;
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
  const figure = grid ? <PercentageComparisonGrid draft title={draft.title.trim() || "Chart title"}
    leadIns={draft.leadIns} note={draft.note} palette={draft.palette}
    findings={rows.map(row => ({
      id: row.id, value: value(row.cells[1]), description: row.cells[0].trim() || "—",
    }))} /> : <figure className={styles.draftChart} data-chart-draft={draft.type} aria-label="Draft chart preview with missing-value placeholders">
    <figcaption className={styles.draftChartHeading}>
      <h3>{draft.title.trim() || "Chart title"}</h3>
      {draft.subtitle?.trim() ? <p>{draft.subtitle}</p> : null}
    </figcaption>
    <div className={styles.draftChartBody} data-chart-type={draft.type}>
      {rows.map((row, index) => <div key={row.id} className={styles.draftChartItem}>
        {paired && draft.leadIns?.[index] ? <p>{draft.leadIns[index]}</p> : null}
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
    {grouped ? <div className={styles.draftChartLegend}>
      {[1, 2].map(column => <span key={column}>{draft.table.columns[column]?.trim() || "—"}</span>)}
    </div> : null}
    {draft.note?.trim() ? <p className={styles.draftChartNote}>{draft.note}</p> : null}
  </figure>;
  return <div className={`${styles.canonicalVisual} ${styles.interactiveVisual} ${styles.chartAuthoring} ${styles.selected}`}
    data-report-component={draft.type}>
    {figure}
  </div>;
}
