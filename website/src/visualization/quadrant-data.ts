import type { ReportBlock, StructuredData } from "../manifest/report-manifest.ts";

export const quadrantHeaders = ["Point ID", "Label", "X value", "Y value", "Description"];
type Table = Pick<StructuredData, "columns" | "rows">;
export type QuadrantBlock = Extract<ReportBlock, { type: "quadrant-scatter-plot" }>;
export type QuadrantPresentation = NonNullable<QuadrantBlock["presentation"]>;

export function quadrantNumber(raw: string) {
  const text = raw.trim().replace(/%\s*$/, "");
  if (text.length > 32 || !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) return undefined;
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
}

export function quadrantCacheMatches(table: Table, cache: StructuredData) {
  if (table.rows.length !== cache.rows.length) return false;
  const pairs = table.rows.map(row => [quadrantNumber(row.cells[2]), quadrantNumber(row.cells[3])]);
  return cache.rows.every(row => {
    const x = quadrantNumber(row.cells[2]), y = quadrantNumber(row.cells[3]);
    const index = pairs.findIndex(pair => pair[0] !== undefined && pair[1] !== undefined &&
      x !== undefined && y !== undefined && Math.abs(pair[0] - x) <= Math.max(1, Math.abs(x)) * 1e-10 &&
      Math.abs(pair[1] - y) <= Math.max(1, Math.abs(y)) * 1e-10);
    if (index < 0) return false;
    pairs.splice(index, 1);
    return true;
  });
}

export function quadrantTableErrors(table: Table) {
  const errors: { row: number; column: number; message: string }[] = [];
  if (table.columns.length < 6 || table.columns.length > 25 ||
    quadrantHeaders.some((heading, index) => table.columns[index]?.trim().toLowerCase() !== heading.toLowerCase()) ||
    table.columns.some(heading => !heading.trim() || heading.length > 100) ||
    new Set(table.columns.map(heading => heading.trim().toLowerCase())).size !== table.columns.length) {
    errors.push({ row: -1, column: -1,
      message: "Use the standard columns: Point ID, Label, X value, Y value, Description, followed by up to 20 named breakdown columns." });
  }
  if (table.rows.length < 2 || table.rows.length > 50) {
    errors.push({ row: -1, column: -1, message: "Use between 2 and 50 points." });
  }
  const ids = new Set<string>();
  for (const [row, point] of table.rows.entries()) {
    const id = point.cells[0]?.trim();
    if (!id || id.length > 100 || ids.has(id)) errors.push({ row, column: 0, message: "Use a unique, stable Point ID of up to 100 characters." });
    if (id) ids.add(id);
    if (!point.cells[1]?.trim() || point.cells[1].length > 160) errors.push({ row, column: 1, message: "Add a point label of up to 160 characters." });
    if (point.cells.length !== table.columns.length || (point.cells[4]?.length ?? 0) > 2000) {
      errors.push({ row, column: -1, message: "Keep one value per column and descriptions under 2,000 characters." });
    }
    for (let column = 2; column < table.columns.length; column++) {
      if (column === 4) continue;
      const raw = point.cells[column] ?? "";
      const value = quadrantNumber(raw);
      if (value === undefined || raw.length > 32 || column >= 5 &&
        (value < 0 || (raw.includes("%") || table.columns[column].includes("%")) && value > 100)) {
        errors.push({ row, column, message: column < 4 ? "Enter a finite X/Y number; negative values and zero are supported."
          : "Enter a nonnegative breakdown value. Percentages must be between 0 and 100." });
      }
    }
  }
  return errors;
}

export function quadrantPoints(table: Table): QuadrantBlock["points"] {
  return table.rows.map(row => ({
    id: row.cells[0].trim(), label: row.cells[1].trim(),
    x: quadrantNumber(row.cells[2])!, y: quadrantNumber(row.cells[3])!,
    description: row.cells[4].trim(),
    breakdown: row.cells.slice(5).map((value, index) => ({
      label: table.columns[index + 5].trim(), value: quadrantNumber(value)!, displayValue: value.trim(),
    })),
  }));
}

export function listeningPortfolioError(table: Table) {
  const headings = table.columns.map(value => value.toLowerCase().replace(/[^a-z]/g, ""));
  const columns = ["notusing", "scalingback", "maintaining", "expanding"].map(name => headings.indexOf(name));
  if (columns.some(index => index < 5)) return "The listening preset needs Not using, Scaling back, Maintaining, and Expanding breakdown columns.";
  for (const row of table.rows) {
    const values = columns.map(index => quadrantNumber(row.cells[index]));
    if (values.some(value => value === undefined || value < 0 || value > 100)) return "Listening breakdowns must be percentages between 0 and 100.";
    const [notUsing, scaling, maintaining, expanding] = values as number[];
    if (Math.abs(notUsing + scaling + maintaining + expanding - 100) > .21 ||
        Math.abs(quadrantNumber(row.cells[2])! - (expanding - scaling)) > .21 ||
        Math.abs(quadrantNumber(row.cells[3])! - (scaling + maintaining + expanding)) > .21) {
      return "Listening coordinates must match the breakdowns: X = Expanding minus Scaling back; Y = Expanding + Maintaining + Scaling back. Breakdowns should total 100%.";
    }
  }
}

function median(values: number[]) {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function scale(values: number[]) {
  const low = Math.min(...values), high = Math.max(...values);
  const range = high - low || Math.max(Math.abs(high) * .2, 1);
  const magnitude = 10 ** Math.floor(Math.log10(range / 5));
  const step = [1, 2, 5, 10].find(value => value * magnitude >= range / 5)! * magnitude;
  const min = low >= 0 ? Math.max(0, Math.floor((low - range * .15) / step) * step)
    : Math.floor((low - range * .15) / step) * step;
  const max = Math.ceil((high + range * .15) / step) * step;
  return { min, max, ticks: Array.from({ length: Math.round((max - min) / step) + 1 },
    (_, index) => Number((min + index * step).toPrecision(15))) };
}

export function quadrantGeometry(points: QuadrantBlock["points"], presentation?: QuadrantBlock["presentation"]) {
  const x = points.map(point => point.x), y = points.map(point => point.y);
  const xSplit = presentation?.splitMode === "manual" ? presentation.xSplit! : median(x);
  const ySplit = presentation?.splitMode === "manual" ? presentation.ySplit! : median(y);
  return { x: scale([...x, xSplit]), y: scale([...y, ySplit]), xSplit, ySplit };
}

export const quadrantPresets = {
  general: {
    xLabel: "X value", yLabel: "Y value", xUnit: "number", yUnit: "number",
    quadrants: ["Low X, high Y", "High X, high Y", "Low X, low Y", "High X, low Y"],
  },
  listening: {
    xLabel: "Net expansion", yLabel: "Current use", xUnit: "percentage-points", yUnit: "percentage",
    quadrants: ["High effort with practical limits", "Foundational, expanding touchpoints",
      "Unstructured signals yet to scale", "Technology-driven innovation"],
  },
} as const;
