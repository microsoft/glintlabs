import { canonicalJson, sha256Text } from "../integrity/approved-content.ts";
import { parseChartValue, type ChartValueType, type DataVisualSourceBlock } from "./verified-data-visual.ts";

export type ChartTable = {
  columns: string[];
  rows: { id: string; cells: string[] }[];
};
export type ChartTableError = { row: number; column: number; message: string };

export function validateChartTable(table: ChartTable, unit: ChartValueType = "percentage"): ChartTableError[] {
  const errors: ChartTableError[] = [];
  if (table.columns.length !== 2 || table.columns.some(value => !value.trim() || value.length > 100)) {
    errors.push({ row: -1, column: -1, message: "Use two column headings, each between 1 and 100 characters." });
  }
  if (table.rows.length < 2 || table.rows.length > 12) {
    errors.push({ row: -1, column: -1, message: "Use between 2 and 12 categories." });
  }
  const seen = new Set<string>();
  table.rows.forEach((row, index) => {
    const label = row.cells[0]?.trim() ?? "";
    const key = label.replace(/\s+/g, " ").toLocaleLowerCase("en-US");
    if (!label || label.length > 160 || seen.has(key)) {
      errors.push({ row: index, column: 0, message: "Use a unique category label between 1 and 160 characters." });
    }
    seen.add(key);
    const raw = row.cells[1]?.trim() ?? "";
    if (row.cells.length !== 2 || raw.length > 24 || parseChartValue(raw, unit) === undefined) {
      errors.push({ row: index, column: 1, message: unit === "percentage"
        ? "Enter a percentage from 0 to 100. Use a decimal point; do not leave missing values."
        : "Enter a number without % signs or commas." });
    }
  });
  return errors;
}

export function parseChartTable(input: string, header = true): ChartTable {
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
  if (!records.length || records.some(row => row.length !== 2)) throw new Error("Use exactly two columns: category labels and percentage values.");
  const columns = header ? records.shift()! : ["Category", "Percentage (%)"];
  if (records.length > 12 || columns.some(value => !value || value.length > 100) ||
      records.some(row => row[0].length > 160 || row[1].length > 24)) {
    throw new Error("Use up to 12 rows, headings up to 100 characters, labels up to 160, and values up to 24.");
  }
  return { columns, rows: records.map((cells, index) => ({ id: `row-${index + 1}`, cells })) };
}

export async function createStudioChartSource({
  id, table, sourceName, synthetic, original, unit = "percentage",
}: {
  id: string;
  table: ChartTable;
  sourceName: string;
  synthetic: boolean;
  original?: DataVisualSourceBlock;
  unit?: ChartValueType;
}): Promise<DataVisualSourceBlock> {
  const errors = validateChartTable(table, unit);
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
    rows: table.rows.map(row => ({ id: row.id, cells: row.cells.map(value => value.trim()) })),
    evidenceImage: original?.data.evidenceImage,
    recommendedVisualType: "horizontal-bar-chart" as const,
    sourceNote: `${synthetic ? "Synthetic example. Not research findings. " : ""}Source: ${sourceName.trim()}. ${originalSource ? "Edited in Studio; not unchanged Word values." : "Author-provided Studio table."}`,
    synthetic,
    originalSource,
  };
  return {
    id, type: "data-visual-source",
    data: { ...data, sha256: await sha256Text(canonicalJson(data)) },
    provenance: { kind: "studio" },
    source: { part: "studio", index: original?.source.index ?? 0 },
  };
}
