import { canonicalJson, sha256Text } from "../integrity/approved-content.ts";
import { compatibleVerifiedVisuals, parseChartValue, parseHeatmapValue, type ChartValueType, type DataVisualSourceBlock, type VerifiedDataVisualType } from "./verified-data-visual.ts";
import { quadrantTableErrors } from "./quadrant-data.ts";

export type ChartTable = Pick<DataVisualSourceBlock["data"], "columns" | "rows">;
export type ChartTableError = { row: number; column: number; message: string };

export function validateChartTable(table: ChartTable, unit: ChartValueType = "percentage", visualType: VerifiedDataVisualType = "horizontal-bar-chart"): ChartTableError[] {
  if (visualType === "quadrant-scatter-plot") return quadrantTableErrors(table);
  const errors: ChartTableError[] = [];
  const heatmap = visualType === "coefficient-heatmap";
  const grouped = visualType === "grouped-column-comparison" || visualType === "grouped-bar-comparison";
  const panels = visualType === "comparison-panel-group";
  const line = visualType === "line-chart";
  const columns = heatmap || grouped || line ? table.columns.length : panels ? 3 : 2;
  if (grouped && (columns < 2 || columns > 4)) {
    errors.push({ row: -1, column: -1, message: "Use a category column and one to three percentage series." });
  }
  if (!panels && table.rows.some(row => row.seriesLabels)) {
    errors.push({ row: -1, column: -1, message: "Independent panel legends cannot be discarded when changing chart type." });
  }
  if ((grouped || panels) && table.rows.some(row => row.supportingText?.trim() || row.breakdown?.length)) {
    errors.push({ row: -1, column: -1, message: "This table includes supporting details. Keep its original chart to preserve those details." });
  }
  if (line && (columns < 2 || columns > 4 ||
    new Set(table.columns.map(value => value.trim().toLocaleLowerCase("en-US"))).size !== columns ||
    new Set(table.rows.map(row => row.id)).size !== table.rows.length || table.rows.some(row => !row.id))) {
    errors.push({ row: -1, column: -1, message: "Use a period column and 1–3 uniquely named percentage series, with unique period identifiers." });
  }
  if (heatmap && (columns < 2 || columns > 13 || unit !== "number" ||
    new Set(table.columns.map(value => value.trim().toLocaleLowerCase("en-US"))).size !== columns)) {
    errors.push({ row: -1, column: -1, message: "Use a factor column and 1–12 uniquely named periods, with number values." });
  }
  if (table.columns.length !== columns || table.columns.some(value => !value.trim() || value.length > 100)) {
    errors.push({ row: -1, column: -1, message: `Use ${grouped ? columns : columns === 3 ? "three" : "two"} column headings, each between 1 and 100 characters.` });
  }
  const fixedRows = visualType === "percentage-comparison-grid" ? 4 : visualType === "paired-percentage-comparison" ? 2 : undefined;
  if ((visualType === "percentage-ring-group" || visualType === "illustrated-statistics") &&
      (table.rows.length < 2 || table.rows.length > 3)) {
    errors.push({ row: -1, column: -1, message: "Use two or three percentage findings." });
  } else if (fixedRows && table.rows.length !== fixedRows) {
    errors.push({ row: -1, column: -1, message: `Use exactly ${fixedRows === 4 ? "four" : "two"} percentage findings.` });
  } else if (table.rows.length < (grouped || panels ? 1 : 2) || table.rows.length > 12) {
    errors.push({ row: -1, column: -1, message: `Use between ${grouped || panels ? 1 : 2} and 12 categories.` });
  }
  if (!heatmap && visualType !== "horizontal-bar-chart" && unit !== "percentage") {
    errors.push({ row: -1, column: -1, message: "Use percentage values for this chart." });
  }
  const seen = new Set<string>();
  table.rows.forEach((row, index) => {
    if (panels && (row.seriesLabels?.length !== 2 || row.seriesLabels.some(label => !label.trim() || label.length > 100))) {
      errors.push({ row: index, column: 0, message: "Give this panel its own two series names (1–100 characters each)." });
    }
    const label = row.cells[0]?.trim() ?? "";
    const key = label.replace(/\s+/g, " ").toLocaleLowerCase("en-US");
    if (!label || label.length > 160 || (!panels && seen.has(key))) {
      errors.push({ row: index, column: 0, message: "Use a unique category label between 1 and 160 characters." });
    }
    seen.add(key);
    if (visualType === "horizontal-bar-chart") {
      const detailIds = new Set<string>();
      const detailLabels = new Set<string>();
      row.breakdown?.forEach(detail => {
        const detailKey = detail.label.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
        if (!detail.id || detailIds.has(detail.id) || !detailKey || detail.label.length > 160 || detailLabels.has(detailKey)) {
          errors.push({ row: -1, column: -1, message: `${label || "This category"}: use unique breakdown labels between 1 and 160 characters.` });
        }
        if (detail.value.trim().length > 24 || parseChartValue(detail.value, unit) === undefined) {
          errors.push({ row: -1, column: -1, message: `${label || "This category"}: enter ${unit === "percentage" ? "a breakdown percentage from 0 to 100" : "a breakdown number without % signs or commas"}.` });
        }
        detailIds.add(detail.id);
        detailLabels.add(detailKey);
      });
    }
    for (let column = 1; column < columns; column++) {
      const raw = row.cells[column]?.trim() ?? "";
      if (row.cells.length !== columns || raw.length > 24 || (heatmap ? parseHeatmapValue(raw) : parseChartValue(raw, unit)) === undefined) {
        errors.push({ row: index, column, message: heatmap ? "Enter a coefficient such as .147, or N/A. Do not use percentages." : unit === "percentage"
          ? "Enter a percentage from 0 to 100. Use a decimal point; do not leave missing values."
          : "Enter a number without % signs or commas." });
      }
    }
  });
  if (heatmap && !table.rows.some(row => row.cells.slice(1).some(value => typeof parseHeatmapValue(value) === "number"))) {
    errors.push({ row: -1, column: -1, message: "Add at least one coefficient. Missing cells are shown as N/A, not zero." });
  }
  return errors;
}

export function parseChartTable(input: string, header = true, visualType: VerifiedDataVisualType = "horizontal-bar-chart"): ChartTable {
  const text = input.replace(/^\uFEFF/, "");
  if (text.length > 200000) throw new Error("Use a table smaller than 200 KB, with up to 12 data rows.");
  const counts: Record<string, number> = { "\t": 0, ",": 0, ";": 0 };
  let quoted = false;
  for (const char of text.split(/\r?\n/)[0] || "") {
    if (char === '"') quoted = !quoted;
    else if (!quoted && Object.hasOwn(counts, char)) counts[char]++;
  }
  const delimiter = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  quoted = false;
  const records: string[][] = [];
  let cells: string[] = [], cell = "", closed = false;
  const finishCell = () => { cells.push(cell.trim()); cell = ""; closed = false; };
  const finishRow = () => {
    finishCell();
    if (cells.some(Boolean)) records.push(cells);
    cells = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; closed = true; }
      } else cell += char;
    } else if (char === '"' && !cell.trim() && !closed) {
      quoted = true; cell = "";
    } else if (char === delimiter) finishCell();
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      finishRow();
    } else if (char === '"' || (closed && !/\s/.test(char))) {
      throw new Error("Check the quotation marks. Quote the whole cell when it contains a separator.");
    } else cell += char;
  }
  if (quoted) throw new Error("A quoted cell is unfinished. Close its quotation mark.");
  if (cell || cells.length) finishRow();
  const heatmap = visualType === "coefficient-heatmap";
  const grouped = visualType === "grouped-column-comparison" || visualType === "grouped-bar-comparison";
  const line = visualType === "line-chart";
  const columnCount = heatmap || grouped || line ? records[0]?.length ?? 0 : visualType === "comparison-panel-group" ? 3 : 2;
  if (grouped && (columnCount < 2 || columnCount > 4)) throw new Error("Use a category column and one to three percentage series.");
  if (line && (columnCount < 2 || columnCount > 4)) throw new Error("Use a period column and 1–3 percentage series.");
  if (heatmap && (columnCount < 2 || columnCount > 13)) throw new Error("Use a factor column and 1–12 period columns.");
  if (!records.length || records.some(row => row.length !== columnCount)) throw new Error(grouped
    ? `Use exactly ${columnCount} columns: category labels and ${columnCount - 1} percentage series.`
    : columnCount === 3
    ? "Use exactly three columns: category labels and two percentage series."
    : "Use exactly two columns: category labels and percentage values.");
  const columns = header ? records.shift()!
    : line ? ["Period", ...Array.from({ length: columnCount - 1 }, (_, index) => `Series ${index + 1}`)]
    : heatmap ? ["Factor", ...Array.from({ length: columnCount - 1 }, (_, index) => `Period ${index + 1}`)]
    : grouped ? ["Category", ...Array.from({ length: columnCount - 1 }, (_, index) => `Series ${index + 1}`)]
    : columnCount === 3 ? ["Category", "Series 1", "Series 2"] : ["Category", "Percentage (%)"];
  if (records.length > 12 || columns.some(value => !value || value.length > 100) ||
      records.some(row => row[0].length > 160 || row.slice(1).some(value => value.length > 24))) {
    throw new Error("Use up to 12 rows, headings up to 100 characters, labels up to 160, and values up to 24.");
  }
  return { columns, rows: records.map((cells, index) => ({ id: `row-${index + 1}`, cells })) };
}

export async function createStudioChartSource({
  id, table, sourceName, synthetic, original, unit = "percentage", visualType = "horizontal-bar-chart",
}: {
  id: string;
  table: ChartTable;
  sourceName: string;
  synthetic: boolean;
  original?: DataVisualSourceBlock;
  unit?: ChartValueType;
  visualType?: VerifiedDataVisualType;
}): Promise<DataVisualSourceBlock> {
  const errors = validateChartTable(table, unit, visualType);
  if (errors.length) throw new Error(errors[0].message);
  if (!sourceName.trim() || sourceName.length > 200) throw new Error("Add a source name of up to 200 characters.");
  const originalSource = original?.data.originalSource ?? (original ? {
    sourceKind: original.data.sourceKind, title: original.data.title, sha256: original.data.sha256,
  } : undefined);
  const data = {
    sourceKind: "verified-upload" as const,
    title: sourceName.trim(),
    unit,
    columns: table.columns.map(value => value.trim()),
    rows: table.rows.map(row => ({
      id: row.id, cells: row.cells.map(value => value.trim()),
      ...(row.seriesLabels ? { seriesLabels: row.seriesLabels.map(value => value.trim()) as [string, string] } : {}),
      ...(row.supportingText?.trim() ? { supportingText: row.supportingText.trim() } : {}),
      ...(row.breakdown?.length ? { breakdown: row.breakdown.map(detail => ({
        id: detail.id, label: detail.label.trim(), value: detail.value.trim(),
      })) } : {}),
    })),
    evidenceImage: original?.data.evidenceImage,
    imageReconstruction: original?.data.imageReconstruction,
    recommendedVisualType: visualType,
    sourceNote: `${synthetic ? "Synthetic example. Not research findings. " : ""}Source: ${sourceName.trim()}. ${original?.data.imageReconstruction
      ? "Edited in Studio after image reconstruction; current data may differ from the image-reviewed table."
      : originalSource ? "Edited in Studio; not unchanged Word values." : "Author-provided Studio table."}`,
    synthetic,
    originalSource,
  };
  const result: DataVisualSourceBlock = {
    id, type: "data-visual-source",
    data: { ...data, sha256: await sha256Text(canonicalJson(data)) },
    wordSource: original?.wordSource ?? (original?.source.part !== "studio" ? original?.data : undefined),
    provenance: { kind: "studio" },
    source: original?.source ?? { part: "studio", index: 0 },
  };
  if (!compatibleVerifiedVisuals(result).includes(visualType)) {
    throw new Error(visualType === "paired-percentage-comparison"
      ? "Use exactly two percentage findings."
      : "This table is not compatible with the selected chart.");
  }
  return result;
}
