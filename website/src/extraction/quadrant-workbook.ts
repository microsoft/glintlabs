import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { StructuredData } from "../manifest/report-manifest.ts";
import { quadrantCacheMatches, quadrantHeaders, quadrantTableErrors } from "../visualization/quadrant-data.ts";
export { quadrantCacheMatches } from "../visualization/quadrant-data.ts";

const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, trimValues: false });
type Xml = Record<string, unknown>;
function objects(value: unknown): Xml[] {
  return (Array.isArray(value) ? value : value ? [value] : []).filter(item => typeof item === "object");
}
function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(text).join("");
  if (value && typeof value === "object") return Object.entries(value)
    .filter(([key]) => !key.startsWith("@_")).map(([, item]) => text(item)).join("");
  return "";
}
function spreadsheetText(value: unknown) {
  const node = value as Xml | undefined;
  return text(node?.t) + objects(node?.r).map(run => text(run.t)).join("");
}
export function packageTarget(from: string, target: string) {
  if (/^[a-z][a-z\d+.-]*:|^\/\/|\\/i.test(target)) throw new Error("External workbook paths must be connected explicitly.");
  const parts = target.startsWith("/") ? [] : from.split("/").slice(0, -1);
  for (const part of target.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) throw new Error("The workbook contains an invalid package path.");
      parts.pop();
    } else parts.push(part);
  }
  return parts.join("/");
}
export function relationshipPart(path: string) {
  const slash = path.lastIndexOf("/");
  return `${path.slice(0, slash + 1)}_rels/${path.slice(slash + 1)}.rels`;
}
export async function quadrantHash(bytes: Uint8Array | ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(new Uint8Array(bytes)).buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
function columnIndex(reference: string) {
  const letters = reference.replace(/\$/g, "").match(/^[A-Z]+/i)?.[0];
  if (!letters) throw new Error("The Excel table contains an invalid cell reference.");
  return [...letters.toUpperCase()].reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}
export type QuadrantWorkbookTable = Pick<StructuredData, "columns" | "rows" | "workbook" | "synthetic">;

export async function readQuadrantWorkbook(fileName: string, input: ArrayBuffer | Uint8Array): Promise<QuadrantWorkbookTable[]> {
  if (!/\.xlsx$/i.test(fileName) || input.byteLength > 15 * 1024 * 1024) throw new Error("Choose an Excel (.xlsx) workbook under 15 MB.");
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(input); } catch { throw new Error("This file isn't a readable Excel (.xlsx) workbook."); }
  const files = Object.values(zip.files);
  if (files.length > 1000 || files.some(file => file.name.includes("..") || file.unsafeOriginalName?.includes(".."))) {
    throw new Error("This workbook package isn't supported.");
  }
  // JSZip exposes inflated sizes before decoding, so reject ZIP bombs before allocating their contents.
  const inflated = files.reduce((total, file) => total +
    ((file as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0), 0);
  if (inflated > 50 * 1024 * 1024) throw new Error("This workbook expands beyond the supported size.");
  async function read(path: string): Promise<Xml> {
    const file = zip.file(path);
    if (!file) return {};
    return parser.parse(await file.async("string")) as Xml;
  }
  async function relationships(path: string) {
    const root = (await read(relationshipPart(path))).Relationships as Xml | undefined;
    return new Map(objects(root?.Relationship).filter(rel => rel["@_TargetMode"] !== "External")
      .map(rel => [String(rel["@_Id"]), packageTarget(path, String(rel["@_Target"]))]));
  }
  const workbook = (await read("xl/workbook.xml")).workbook as Xml | undefined;
  if (!workbook) throw new Error("This file isn't a standard Excel (.xlsx) workbook.");
  const sheetPaths = await relationships("xl/workbook.xml");
  const sharedRoot = (await read("xl/sharedStrings.xml")).sst as Xml | undefined;
  const shared = objects(sharedRoot?.si).map(spreadsheetText);
  const styleRoot = (await read("xl/styles.xml")).styleSheet as Xml | undefined;
  const formats = new Map(objects((styleRoot?.numFmts as Xml | undefined)?.numFmt)
    .map(format => [Number(format["@_numFmtId"]), String(format["@_formatCode"])]));
  const styles = objects((styleRoot?.cellXfs as Xml | undefined)?.xf);
  const sha256 = await quadrantHash(input);
  const tables: QuadrantWorkbookTable[] = [];
  for (const sheet of objects((workbook.sheets as Xml | undefined)?.sheet)) {
    const path = sheetPaths.get(String(sheet["@_id"]));
    if (!path) continue;
    const sheetXml = (await read(path)).worksheet as Xml | undefined;
    if (!sheetXml) continue;
    const cells = new Map<string, { value: string; formula: boolean }>();
    for (const row of objects((sheetXml.sheetData as Xml | undefined)?.row)) {
      for (const cell of objects(row.c)) {
        const type = cell["@_t"];
        let value = type === "s" ? shared[Number(text(cell.v))] ?? ""
          : type === "inlineStr" ? spreadsheetText(cell.is) : text(cell.v);
        const style = styles[Number(cell["@_s"] ?? 0)];
        const numberFormat = Number(style?.["@_numFmtId"]);
        const percentage = numberFormat === 9 || numberFormat === 10 ||
          (formats.get(numberFormat) ?? "").replace(/"[^"]*"|\\./g, "").includes("%");
        if (type !== "s" && type !== "inlineStr" && percentage && value && Number.isFinite(Number(value))) {
          value = `${Number((Number(value) * 100).toPrecision(15))}%`;
        }
        cells.set(String(cell["@_r"]).replace(/\$/g, "").toUpperCase(),
          { value: type === "e" ? "" : value, formula: cell.f !== undefined });
      }
    }
    const related = await relationships(path);
    for (const tablePart of objects((sheetXml.tableParts as Xml | undefined)?.tablePart)) {
      const tablePath = related.get(String(tablePart["@_id"]));
      if (!tablePath) continue;
      const table = (await read(tablePath)).table as Xml | undefined;
      if (!table) continue;
      const columns = objects((table.tableColumns as Xml | undefined)?.tableColumn).map(column => String(column["@_name"]));
      if (!quadrantHeaders.every((heading, index) => columns[index]?.trim().toLowerCase() === heading.toLowerCase())) continue;
      const [start, end] = String(table["@_ref"]).replace(/\$/g, "").split(":");
      const firstRow = Number(start?.match(/\d+$/)?.[0]), lastRow = Number(end?.match(/\d+$/)?.[0]);
      const firstColumn = columnIndex(start);
      if (!Number.isInteger(firstRow) || !Number.isInteger(lastRow) || lastRow - firstRow > 51 ||
          columnIndex(end) - firstColumn + 1 !== columns.length) throw new Error("The quadrant table has an unsupported range.");
      const rows = [];
      const endRow = lastRow - Number(table["@_totalsRowCount"] ?? 0);
      for (let row = firstRow + 1; row <= endRow; row++) {
        const values = columns.map((_, column) => {
          let number = firstColumn + column + 1, letters = "";
          while (number) { letters = String.fromCharCode(65 + (number - 1) % 26) + letters; number = Math.floor((number - 1) / 26); }
          const cell = cells.get(`${letters}${row}`);
          if (cell?.formula && !cell.value) throw new Error("Save the workbook in Excel to calculate its formulas, then connect it again.");
          return cell?.value.trim() ?? "";
        });
        if (values.every(value => !value)) continue;
        rows.push({ id: values[0], cells: values });
      }
      const errors = quadrantTableErrors({ columns, rows });
      if (errors.length) throw new Error(`${table["@_displayName"]}: ${errors[0].message}`);
      tables.push({ columns, rows,
        synthetic: rows.some(row => /^example-[a-d]$/.test(row.cells[0]) && /^Example [A-D]$/.test(row.cells[1])),
        workbook: {
        fileName, tableName: String(table["@_displayName"] ?? table["@_name"]), sha256,
      } });
    }
  }
  if (!tables.length) throw new Error("No standard quadrant data table was found. Start with the Excel template and keep its five named columns plus numerical breakdowns.");
  return tables;
}

export function selectQuadrantTable(tables: QuadrantWorkbookTable[], options: { tableName?: string; cache?: StructuredData } = {}) {
  const matches = tables.filter(table => (!options.tableName || table.workbook?.tableName === options.tableName) &&
    (!options.cache || quadrantCacheMatches(table, options.cache)));
  if (matches.length !== 1) throw new Error(matches.length
    ? "More than one quadrant table matches. Keep a single matching quadrant table in this workbook before connecting."
    : "The Excel table doesn't match the Word chart. Update the linked chart in Word and save both files, then reconnect Excel.");
  return matches[0];
}
