import type { ChartTable } from "../visualization/chart-authoring.ts";
import { parseChartValue, type ChartValueType, type VerifiedDataVisualType } from "../visualization/verified-data-visual.ts";
import { PercentageComparisonGrid } from "../visualization/canonical-report-components";
import { IllustratedStatistics } from "../visualization/illustrated-statistics";
import { CoefficientHeatmap } from "../visualization/coefficient-heatmap";
import { heatmapPresentationSchema, type HeatmapPresentation } from "../manifest/report-manifest";
import styles from "./report-renderer.module.css";

export type ChartDraftPreviewData = {
  blockId: string;
  type: VerifiedDataVisualType;
  title: string;
  subtitle?: string;
  leadIns?: [string, string];
  note?: string;
  palette?: string;
  illustrations?: Record<string, string>;
  valueLabel?: string;
  table: ChartTable;
  unit: ChartValueType;
  heatmapPresentation?: HeatmapPresentation;
};

export function ChartDraftPreview({ draft }: { draft: ChartDraftPreviewData }) {
  if (draft.type === "coefficient-heatmap") {
    const table = draft.table.columns.length ? draft.table : {
      columns: ["Factor", "Period 1", "Period 2", "Period 3"],
      rows: Array.from({ length: 2 }, (_, index) => ({ id: `missing-${index}`, cells: ["", "", "", ""] })),
    };
    return <div className={`${styles.canonicalVisual} ${styles.interactiveVisual} ${styles.chartAuthoring} ${styles.selected}`}
      data-report-component={draft.type}>
      <CoefficientHeatmap draft={{ id: draft.blockId, table, presentation: draft.heatmapPresentation ?? heatmapPresentationSchema.parse({
        title: draft.title.trim() || "Add chart title", subtitle: draft.subtitle, note: draft.note,
      }) }} />
    </div>;
  }
  const grouped = draft.type === "grouped-column-comparison";
  const grid = draft.type === "percentage-comparison-grid";
  const paired = draft.type === "paired-percentage-comparison";
  const rings = draft.type === "percentage-ring-group";
  const illustrated = draft.type === "illustrated-statistics";
  const valuePrompt = draft.type === "horizontal-bar-chart" && draft.unit === "number" ? "Add number" : "Add percentage";
  const requiredRows = grouped || grid ? 4 : paired ? 2 : rings || illustrated ? draft.table.rows.length === 2 ? 2 : 3 : undefined;
  const shapeFits = draft.table.columns.length === (grouped ? 3 : 2) &&
    (!requiredRows || draft.table.rows.length === requiredRows) &&
    (draft.type === "horizontal-bar-chart" || draft.unit === "percentage");
  const rows = shapeFits ? draft.table.rows : Array.from({ length: requiredRows ?? 2 }, (_, index) => ({
    id: `missing-${index}`, cells: grouped ? ["", "", ""] : ["", ""],
  }));
  function missingValue(raw: string | undefined) {
    return parseChartValue(raw ?? "", draft.unit) === undefined;
  }
  function value(raw: string | undefined) {
    return missingValue(raw) ? valuePrompt
      : `${raw!.replace(/%\s*$/, "").trim()}${draft.unit === "percentage" ? "%" : ""}`;
  }
  const figure = illustrated ? <IllustratedStatistics draft id={draft.blockId}
    title={draft.title.trim() || "Add chart title"} illustrations={draft.illustrations} valueLabel={draft.valueLabel}
    note={draft.note} findings={rows.map(row => ({
      id: row.id, value: value(row.cells[1]), description: row.cells[0].trim() || "Describe this finding",
      valueMissing: missingValue(row.cells[1]), descriptionMissing: !row.cells[0].trim(),
    }))} /> : grid ? <PercentageComparisonGrid draft title={draft.title.trim() || "Add chart title"}
    leadIns={draft.leadIns} note={draft.note} palette={draft.palette}
    findings={rows.map(row => ({
      id: row.id, value: value(row.cells[1]), description: row.cells[0].trim() || "Describe this finding",
      valueMissing: missingValue(row.cells[1]), descriptionMissing: !row.cells[0].trim(),
    }))} /> : <figure className={styles.draftChart} data-chart-draft={draft.type} aria-label="Draft chart preview with missing-value placeholders">
    <figcaption className={styles.draftChartHeading}>
      <h3>{draft.title.trim() || "Add chart title"}</h3>
      {draft.subtitle?.trim() ? <p>{draft.subtitle}</p> : null}
    </figcaption>
    <div className={styles.draftChartBody} data-chart-type={draft.type}>
      {rows.map((row, index) => <div key={row.id} className={styles.draftChartItem}>
        {paired && draft.leadIns?.[index] ? <p>{draft.leadIns[index]}</p> : null}
        {rings ? <div className={styles.draftRing}>
          <svg viewBox="0 0 154 154" aria-hidden="true">
            <circle cx="77" cy="77" r="63" />
          </svg>
          <strong data-chart-placeholder={missingValue(row.cells[1]) || undefined}>{value(row.cells[1])}</strong>
        </div> : paired ? <strong className={styles.draftFinding}
          data-chart-placeholder={missingValue(row.cells[1]) || undefined}>{value(row.cells[1])}</strong>
          : grouped ? <div className={styles.draftColumns}>{[1, 2].map(column => <div key={column}>
            <span data-chart-placeholder={missingValue(row.cells[column]) || undefined}>{value(row.cells[column])}</span><i aria-hidden="true" />
          </div>)}</div>
          : <><span data-chart-placeholder={!row.cells[0].trim() || undefined}>{row.cells[0].trim() || "Add category"}</span>
            <i className={styles.draftBar} aria-hidden="true" />
            <strong data-chart-placeholder={missingValue(row.cells[1]) || undefined}>{value(row.cells[1])}</strong></>}
        {paired || rings || grouped ? <span data-chart-placeholder={!row.cells[0].trim() || undefined}>
          {row.cells[0].trim() || (grouped ? "Add category" : "Describe this finding")}
        </span> : null}
      </div>)}
    </div>
    {grouped ? <div className={styles.draftChartLegend}>
      {[1, 2].map(column => <span key={column}
        data-chart-placeholder={!draft.table.columns[column]?.trim() || undefined}>
        {draft.table.columns[column]?.trim() || "Add series name"}
      </span>)}
    </div> : null}
    {draft.note?.trim() ? <p className={styles.draftChartNote}>{draft.note}</p> : null}
  </figure>;
  return <div className={`${styles.canonicalVisual} ${styles.interactiveVisual} ${styles.chartAuthoring} ${styles.selected}`}
    data-report-component={draft.type}>
    {figure}
  </div>;
}
