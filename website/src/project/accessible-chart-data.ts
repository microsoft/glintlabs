import { structuredDataSchema } from "../manifest/report-manifest.ts";
import { sha256Text } from "../integrity/approved-content.ts";

export async function accessibleDataFromCsv(text: string, title: string, blockId: string, unit: "number" | "percentage" | "unknown") {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let closed = false;
  let wasQuoted = false;
  function finishCell() {
    row.push(wasQuoted ? cell : cell.trim());
    cell = ""; closed = false; wasQuoted = false;
  }
  const input = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"' && quoted && input[index + 1] === '"') { cell += '"'; index += 1; }
    else if (character === '"') {
      if (closed || (!quoted && cell.trim())) throw new Error("A CSV quote is misplaced. Export the data as a standard CSV and try again.");
      if (quoted) { quoted = false; closed = true; }
      else { quoted = true; wasQuoted = true; cell = ""; }
    } else if (character === "," && !quoted) { finishCell(); }
    else if (character === "\n" && !quoted) {
      finishCell();
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = "";
    } else if (closed) {
      if (!/\s/.test(character)) throw new Error("A CSV cell has text after its closing quote. Export the data again.");
    } else cell += character;
  }
  if (quoted) throw new Error("A CSV quote is unfinished. Export the data again.");
  finishCell();
  if (row.some(Boolean)) rows.push(row);
  const [columns, ...values] = rows;
  if (!columns || columns.length < 2 || values.length < 1 || columns.some((column) => !column) ||
      values.some((cells) => cells.length !== columns.length)) {
    throw new Error("Include a header row, at least two columns, and one value row. Each row must have the same number of cells.");
  }
  return structuredDataSchema.parse({
    sourceKind: "verified-upload", title, unit, columns,
    rows: values.map((cells, index) => ({ id: `${blockId}-data-${index + 1}`, cells })),
    sha256: await sha256Text(text),
  });
}
