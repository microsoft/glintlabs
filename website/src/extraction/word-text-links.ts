import { reportLinkHrefSchema, type ReportBlock } from "../manifest/report-manifest.ts";
import { orderedWordProperties, wordFormatting, type WordFormatting } from "./word-styles.ts";

type Node = Record<string, unknown>;
type Link = NonNullable<Extract<ReportBlock, { type: "paragraph" }>["links"]>[number];
type Field = { instruction: string; start?: number };
const isNode = (value: unknown): value is Node => typeof value === "object" && value !== null && !Array.isArray(value);

function attributes(node: Node) {
  return isNode(node[":@"]) ? node[":@"] : {};
}

function instructionHref(instruction: string) {
  const match = instruction.match(/\bHYPERLINK\s+(?:"([^"]+)"|([^\s\\]+))/i);
  const bookmark = instruction.match(/\\l\s+"([^"]+)"/i)?.[1];
  const destination = match?.[1] ?? match?.[2];
  return destination ? `${destination}${bookmark ? `#${bookmark}` : ""}` : bookmark ? `#${bookmark}` : undefined;
}

export function extractWordTextLinks(paragraph: Node, relationships: ReadonlyMap<string, string>,
  formatRun?: (properties: Node) => WordFormatting) {
  let raw = "";
  let hyperlinkCount = 0;
  const links: Link[] = [];
  const fields: Field[] = [];
  const marks: NonNullable<Extract<ReportBlock, { type: "paragraph" }>["marks"]> = [];
  let currentFormatting: WordFormatting = {};
  function appendLink(start: number, href: string | undefined) {
    if (start === raw.length || !href || !reportLinkHrefSchema.safeParse(href).success ||
        links.some((link) => start < link.end)) return;
    links.push({ start, end: raw.length, href });
  }
  function walk(value: unknown) {
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if (!isNode(value)) return;
    if ("pPr" in value || "rPr" in value || "drawing" in value) return;
    if ("r" in value) {
      const previous = currentFormatting;
      const properties = orderedWordProperties(
        Array.isArray(value.r) ? value.r.find(child => isNode(child) && "rPr" in child)?.rPr : undefined,
      );
      currentFormatting = formatRun ? formatRun(properties) : wordFormatting(properties);
      const start = raw.length;
      walk(value.r);
      const formatting = Object.fromEntries(Object.entries(currentFormatting).filter(([, enabled]) => enabled));
      if (raw.length > start && Object.keys(formatting).length) {
        const last = marks.at(-1);
        if (last?.end === start && JSON.stringify({ ...last, start: undefined, end: undefined }) === JSON.stringify(formatting)) last.end = raw.length;
        else marks.push({ start, end: raw.length, ...formatting });
      }
      currentFormatting = previous;
      return;
    }
    if ("footnoteReference" in value || "endnoteReference" in value) {
      const id = Number(attributes(value).id);
      if (Number.isInteger(id) && id > 0) {
        raw += String(id);
        currentFormatting.superscript = true;
        currentFormatting.subscript = false;
      }
      return;
    }
    if ("fldChar" in value) {
      const kind = attributes(value).fldCharType;
      if (kind === "begin") fields.push({ instruction: "" });
      if (kind === "separate" && fields.length > 0) fields[fields.length - 1].start = raw.length;
      if (kind === "end") {
        const field = fields.pop();
        if (field && /\bHYPERLINK\b/i.test(field.instruction)) {
          hyperlinkCount += 1;
          if (field.start !== undefined) appendLink(field.start, instructionHref(field.instruction));
        }
      }
      return;
    }
    if ("instrText" in value) {
      const field = fields[fields.length - 1];
      if (field) field.instruction += textContent(value.instrText);
      return;
    }
    if ("hyperlink" in value || "fldSimple" in value) {
      const simple = "fldSimple" in value;
      const attr = attributes(value);
      const instruction = typeof attr.instr === "string" ? attr.instr : "";
      const isLink = !simple || /\bHYPERLINK\b/i.test(instruction);
      const start = raw.length;
      const href = simple ? instructionHref(instruction)
        : typeof attr.id === "string" ? relationships.get(attr.id)
          : typeof attr.anchor === "string" ? `#${attr.anchor}` : undefined;
      walk(simple ? value.fldSimple : value.hyperlink);
      if (isLink) { hyperlinkCount += 1; appendLink(start, href); }
      return;
    }
    if ("t" in value) { raw += textContent(value.t); return; }
    if ("tab" in value) { raw += "\t"; return; }
    if ("br" in value || "cr" in value) { raw += "\n"; return; }
    for (const [key, child] of Object.entries(value)) if (key !== ":@") walk(child);
  }
  function textContent(value: unknown): string {
    if (Array.isArray(value)) return value.map(textContent).join("");
    if (!isNode(value)) return "";
    if (typeof value["#text"] === "string") return value["#text"];
    return Object.entries(value).filter(([key]) => key !== ":@").map(([, child]) => textContent(child)).join("");
  }
  walk(paragraph);
  const leading = raw.length - raw.trimStart().length;
  const text = raw.trim();
  const retained = links.map((link) => ({
    ...link, start: Math.max(0, link.start - leading), end: Math.min(text.length, link.end - leading),
  }))
    .filter((link) => link.start < link.end)
    .sort((a, b) => a.start - b.start);
  const retainedMarks = marks.map(mark => ({
    ...mark, start: Math.max(0, mark.start - leading), end: Math.min(text.length, mark.end - leading),
  })).filter(mark => mark.start < mark.end);
  return { text, links: retained, marks: retainedMarks, hyperlinkCount };
}
