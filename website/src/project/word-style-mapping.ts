import { reportManifestSchema, type ReportBlock, type ReportManifest, type WordStyleTarget } from "../manifest/report-manifest.ts";
import { defaultWordStyleTarget } from "../extraction/word-styles.ts";

const isText = (block: ReportBlock): block is Extract<ReportBlock, { type: "heading" | "paragraph" | "list-item" }> =>
  block.type === "heading" || block.type === "paragraph" || block.type === "list-item";
const isBrief = (text: string) => /^research\s+drop\s+in\s+brief\s*:?\s*$/i.test(text);
const isReferences = (text: string) => /^references\s*:?\s*$/i.test(text);

function publicationDate(value: string) {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const numeric = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/);
  const named = value.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const month = named ? months.findIndex(item => item === named[1].toLowerCase() || item.slice(0, 3) === named[1].toLowerCase()) + 1 : 0;
  const parts = iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : numeric ? [Number(numeric[3]) + (numeric[3].length === 2 ? 2000 : 0), Number(numeric[1]), Number(numeric[2])]
    : named && month ? [Number(named[3]), month, Number(named[2])] : undefined;
  if (!parts) return undefined;
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return date.getUTCFullYear() === parts[0] && date.getUTCMonth() + 1 === parts[1] && date.getUTCDate() === parts[2]
    ? date.toISOString().slice(0, 10) : undefined;
}

function mappedSource(manifest: ReportManifest) {
  const styles = new Map(manifest.wordStyles?.map(style => [style.id, style]));
  const metadata = { ...manifest.metadata };
  const hidden = new Set<string>();
  const targets = new Map<string, WordStyleTarget>();
  let frontMatter = true;
  let titleFound = false;
  let styledDate: string | undefined;
  for (const block of manifest.blocks) {
    if (!isText(block)) continue;
    const style = block.wordStyle ? styles.get(block.wordStyle) : undefined;
    const standardTarget = defaultWordStyleTarget(block.wordStyle ?? "");
    const namedTarget = defaultWordStyleTarget(style?.name ?? "");
    const target = standardTarget !== "keep" ? standardTarget : namedTarget !== "keep" ? namedTarget : style?.target ?? "keep";
    targets.set(block.id, target);
    if ([block.wordStyle, style?.name].some(name => name?.toLowerCase().replace(/[\s_-]/g, "") === "date")) {
      const value = block.text.trim().replace(/^(?:publish(?:ed)?\s+date|date)\s*:\s*/i, "");
      if (value) { styledDate ??= publicationDate(value) ?? value; hidden.add(block.id); continue; }
    }
    if (target === "report-title") {
      if (!titleFound) { metadata.title = block.text; titleFound = true; }
      hidden.add(block.id);
      continue;
    }
    if (block === manifest.blocks[0] && block.type === "heading" && block.level === 1 && block.text === metadata.title) continue;
    if (frontMatter && target !== "references") {
      const lines = block.text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      let recognized = true;
      const fields: Partial<ReportManifest["metadata"]> = {};
      for (const line of lines) {
        const author = line.match(/^author\s*:\s*(.+)$/i);
        const date = line.match(/^(?:publish(?:ed)?\s+date|date)\s*:\s*(.+)$/i);
        if (author) fields.author = { name: author[1].trim() };
        else if (date && publicationDate(date[1].trim())) fields.publishedDate = publicationDate(date[1].trim());
        else if (!/^(?:reading time|read time(?: minutes)?)\s*:/i.test(line)) recognized = false;
      }
      if (recognized && lines.length) { Object.assign(metadata, fields); hidden.add(block.id); continue; }
    }
    frontMatter = false;
  }
  if (styledDate) metadata.publishedDate = styledDate;
  return { metadata, hidden, targets };
}

export function applyWordStyleMappings(manifest: ReportManifest) {
  if (!manifest.wordStyles && !manifest.wordStyleMappings && !manifest.blocks.some(block => isText(block) && block.wordStyle)) return manifest;
  const next = { ...manifest, wordStyleMappings: undefined };
  return reportManifestSchema.parse({
    ...next, metadata: mappedSource(next).metadata,
  });
}

export function wordReferenceTextIds(manifest: ReportManifest): Set<string> {
  const styles = new Map(manifest.wordStyles?.map(style => [style.id, style]));
  const isFootnoteStyle = (id: string) => [id, styles.get(id)?.name]
    .some(name => name?.toLowerCase().replace(/[\s_-]/g, "") === "footnotetext");
  return new Set(manifest.blocks.filter(block => isText(block) && block.wordStyle && isFootnoteStyle(block.wordStyle)).map(block => block.id));
}

export function wordStyleView(manifest: ReportManifest): ReportManifest {
  if (!manifest.wordStyles && !manifest.blocks.some(block => isText(block) && block.wordStyle)) return manifest;
  const { metadata, hidden, targets } = mappedSource(manifest);
  const hasTitle = hidden.size > 0 && manifest.blocks.some(block => targets.get(block.id) === "report-title");
  return {
    ...manifest,
    metadata,
    wordStyleMappings: undefined,
    blocks: manifest.blocks.flatMap((block, index): ReportBlock[] => {
      if (hidden.has(block.id)) return [];
      if (!isText(block)) return [block];
      const target = targets.get(block.id);
      const brief = isBrief(block.text) && manifest.blocks[index + 1]?.type === "list-item";
      const references = target === "references" && isReferences(block.text);
      const legacyCover = !hasTitle && index === 0 && block.type === "heading" && block.level === 1 &&
        block.text === metadata.title;
      if (legacyCover) return [block];
      if (block.wordOutline === 9 && !brief && !references) return [block];
      if (brief || references || target === "section-heading" || target === "subsection-heading") {
        const marks = block.marks;
        const fullyBold = block.text.split("").every((character, index) =>
          !character.trim() || marks?.some(mark => mark.bold && mark.start <= index && mark.end > index));
        return [{
          ...block, type: "heading", level: block.type === "heading" && block.wordOutline !== undefined && !brief && !references
            ? Math.min(6, block.level + 1) : target === "subsection-heading" && !brief && !references ? 3 : 2,
          marks: fullyBold
            ? marks?.map(mark => ({ ...mark, bold: undefined })).filter(mark => mark.italic || mark.superscript || mark.subscript)
            : marks,
        }];
      }
      if (target === "body" && block.type === "heading") {
        return [{
          id: block.id, source: block.source, type: "paragraph", text: block.text,
          wordStyle: block.wordStyle, marks: block.marks, links: block.links,
        }];
      }
      return [block];
    }),
  };
}
