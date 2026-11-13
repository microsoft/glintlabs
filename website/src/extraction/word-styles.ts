import { XMLParser } from "fast-xml-parser";
import type { WordStyleTarget } from "../manifest/report-manifest.ts";

type Node = Record<string, unknown>;
export type WordFormatting = {
  bold?: boolean; italic?: boolean; superscript?: boolean; subscript?: boolean;
};
type Style = {
  id: string; name: string; basedOn?: string; target: WordStyleTarget; formatting: WordFormatting; outline?: number;
};
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", removeNSPrefix: true });
const node = (value: unknown): Node => value && typeof value === "object" && !Array.isArray(value) ? value as Node : {};
const list = (value: unknown): Node[] => (Array.isArray(value) ? value : value ? [value] : []).map(node);
const nameKey = (value: string) => value.toLowerCase().replace(/[\s_-]/g, "");
export function defaultWordStyleTarget(name: string): WordStyleTarget {
  switch (nameKey(name)) {
    case "title": return "report-title";
    case "nospacing": case "date": return "metadata";
    case "normal": case "bodytext": return "body";
    case "heading1": return "section-heading";
    case "heading2": return "subsection-heading";
    case "booktitle": case "footnotetext": return "references";
    default: return "keep";
  }
}
function enabled(value: unknown) {
  return !["0", "false", "off"].includes(String(node(value).val ?? "true").toLowerCase());
}
export function wordFormatting(properties: Node, inherited: WordFormatting = {}): WordFormatting {
  const result = { ...inherited };
  if ("b" in properties) result.bold = enabled(properties.b);
  if ("i" in properties) result.italic = enabled(properties.i);
  if ("vertAlign" in properties) {
    const value = node(properties.vertAlign).val;
    result.superscript = value === "superscript";
    result.subscript = value === "subscript";
  }
  return result;
}
export function readWordStyles(xml?: string) {
  const document = xml ? node(parser.parse(xml)) : {};
  const definitions = new Map(list(node(document.styles).style)
    .map(value => [String(value.styleId), value]));
  const resolved = new Map<string, Style>();
  function resolve(id: string, visiting = new Set<string>()): Style {
    const cached = resolved.get(id);
    if (cached) return cached;
    const definition = definitions.get(id) ?? {};
    const name = String(node(definition.name).val ?? id);
    if (visiting.has(id) || visiting.size >= 64) return { id, name, target: defaultWordStyleTarget(name), formatting: {} };
    visiting.add(id);
    const basedOn = node(definition.basedOn).val;
    const parent = typeof basedOn === "string" ? resolve(basedOn, visiting) : undefined;
    const ownTarget = defaultWordStyleTarget(id) !== "keep" ? defaultWordStyleTarget(id) : defaultWordStyleTarget(name);
    const outlineValue = node(node(definition.pPr).outlineLvl).val;
    const outline = outlineValue === undefined ? parent?.outline : Number(outlineValue);
    const target = ownTarget !== "keep" ? ownTarget :
      outline === 0 ? "section-heading" : outline === 1 ? "subsection-heading" : parent?.target ?? "keep";
    const value: Style = {
      id, name, ...(typeof basedOn === "string" ? { basedOn } : {}),
      target, formatting: wordFormatting(node(definition.rPr), parent?.formatting), outline,
    };
    visiting.delete(id);
    resolved.set(id, value);
    return value;
  }
  return { get: (id: string) => resolve(id) };
}

export function orderedWordProperties(value: unknown): Node {
  const result: Node = {};
  for (const child of list(value)) {
    for (const [key, entry] of Object.entries(child)) {
      if (key !== ":@") result[key] = node(child[":@"]).val === undefined ? node(entry) : node(child[":@"]);
    }
  }
  return result;
}
