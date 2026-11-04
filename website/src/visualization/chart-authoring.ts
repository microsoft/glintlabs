import { canonicalJson, sha256Text } from "../integrity/approved-content.ts";
import { compatibleVerifiedVisuals, parseChartValue, type ChartValueType, type DataVisualSourceBlock, type VerifiedDataVisualType } from "./verified-data-visual.ts";

export type ChartTable = Pick<DataVisualSourceBlock["data"], "columns" | "rows">;
export type ChartTableError = { row: number; column: number; message: string };

export function validateChartTable(table: ChartTable, unit: ChartValueType = "percentage", visualType: VerifiedDataVisualType = "horizontal-bar-chart"): ChartTableError[] {
  const errors: ChartTableError[] = [];
  const columns = visualType === "grouped-column-comparison" ? 3 : 2;
  if (table.columns.length !== columns || table.columns.some(value => !value.trim() || value.length > 100)) {
    errors.push({ row: -1, column: -1, message: `Use ${columns === 3 ? "three" : "two"} column headings, each between 1 and 100 characters.` });
  }
  const fixedRows = visualType === "percentage-ring-group" ? 3 : visualType === "grouped-column-comparison" ? 4 : visualType === "paired-percentage-comparison" ? 2 : undefined;
  if (fixedRows && table.rows.length !== fixedRows) {
    errors.push({ row: -1, column: -1, message: visualType === "grouped-column-comparison"
      ? "Use exactly four categories and two percentage series."
      : `Use exactly ${fixedRows === 3 ? "three" : "two"} percentage findings.` });
  } else if (table.rows.length < 2 || table.rows.length > 12) {
    errors.push({ row: -1, column: -1, message: "Use between 2 and 12 categories." });
  }
  if (visualType !== "horizontal-bar-chart" && unit !== "percentage") {
    errors.push({ row: -1, column: -1, message: "Use percentage values for this chart." });
  }
  const seen = new Set<string>();
  table.rows.forEach((row, index) => {
    const label = row.cells[0]?.trim() ?? "";
    const key = label.replace(/\s+/g, " ").toLocaleLowerCase("en-US");
    if (!label || label.length > 160 || seen.has(key)) {
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
      if (row.cells.length !== columns || raw.length > 24 || parseChartValue(raw, unit) === undefined) {
        errors.push({ row: index, column, message: unit === "percentage"
          ? "Enter a percentage from 0 to 100. Use a decimal point; do not leave missing values."
          : "Enter a number without % signs or commas." });
      }
    }
  });
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
  const columnCount = visualType === "grouped-column-comparison" ? 3 : 2;
  if (!records.length || records.some(row => row.length !== columnCount)) throw new Error(columnCount === 3
    ? "Use exactly three columns: category labels and two percentage series."
    : "Use exactly two columns: category labels and percentage values.");
  const columns = header ? records.shift()! : columnCount === 3 ? ["Category", "Series 1", "Series 2"] : ["Category", "Percentage (%)"];
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
      ...(row.supportingText?.trim() ? { supportingText: row.supportingText.trim() } : {}),
      ...(row.breakdown?.length ? { breakdown: row.breakdown.map(detail => ({
        id: detail.id, label: detail.label.trim(), value: detail.value.trim(),
      })) } : {}),
    })),
    evidenceImage: original?.data.evidenceImage,
    recommendedVisualType: visualType,
    sourceNote: `${synthetic ? "Synthetic example. Not research findings. " : ""}Source: ${sourceName.trim()}. ${originalSource ? "Edited in Studio; not unchanged Word values." : "Author-provided Studio table."}`,
    synthetic,
    originalSource,
  };
  const result: DataVisualSourceBlock = {
    id, type: "data-visual-source",
    data: { ...data, sha256: await sha256Text(canonicalJson(data)) },
    provenance: { kind: "studio" },
    source: { part: "studio", index: original?.source.index ?? 0 },
  };
  if (!compatibleVerifiedVisuals(result).includes(visualType)) {
    throw new Error(visualType === "paired-percentage-comparison"
      ? "Use exactly two percentage findings."
      : "This table is not compatible with the selected chart.");
  }
  return result;
}
