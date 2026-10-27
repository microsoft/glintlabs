import type { ReportBlock } from "../manifest/report-manifest.ts";

export type WordTextRun = {
  text: string;
  bold: boolean;
  italic: boolean;
  superscript: boolean;
  href?: string;
};

type TextBlock = Extract<ReportBlock, { type: "paragraph" | "list-item" | "heading" }>;
const markup = /\[(open|close) (bold|italics|superscript|H3|bullet|bullets|sub-bullet|numeric bullet|image insert|table formatting)\]|\[close italics\[|\[open bullet(?=\s)/gi;

export function wordTextRuns(
  block: TextBlock,
  marks = { bold: false, italic: false, superscript: false },
): WordTextRun[] {
  const runs: WordTextRun[] = [];
  const links = "links" in block ? block.links ?? [] : [];
  let cursor = 0;
  function append(end: number) {
    while (cursor < end) {
      const link = links.find(item => item.start <= cursor && cursor < item.end);
      const nextLink = links.find(item => item.start > cursor);
      const boundary = Math.min(end, link?.end ?? nextLink?.start ?? end);
      runs.push({ text: block.text.slice(cursor, boundary), ...marks, ...(link ? { href: link.href } : {}) });
      cursor = boundary;
    }
  }
  for (const token of block.text.matchAll(markup)) {
    append(token.index);
    const active = token[1]?.toLowerCase() === "open";
    switch (token[0].toLowerCase() === "[close italics[" ? "italics" : token[2]?.toLowerCase()) {
      case "bold": marks.bold = active; break;
      case "italics": marks.italic = active; break;
      case "superscript": marks.superscript = active; break;
    }
    cursor = token.index + token[0].length;
  }
  append(block.text.length);
  while (runs.length && !runs[0].text.trim()) runs.shift();
  while (runs.length && !runs[runs.length - 1].text.trim()) runs.pop();
  if (runs.length) {
    runs[0].text = runs[0].text.trimStart();
    runs[runs.length - 1].text = runs[runs.length - 1].text.trimEnd();
  }
  if (runs.some(run => /\[(?:open|close)\b/i.test(run.text))) {
    throw new Error(`Unrecognized Word editorial markup in ${block.id}.`);
  }
  return runs;
}

export function wordPlainText(block: TextBlock) {
  return wordTextRuns(block).map(run => run.text).join("");
}
