import type { ReportBlock } from "../manifest/report-manifest.ts";

export type ParagraphBlock = Extract<ReportBlock, { type: "paragraph" }>;
export type TextCalloutRange = { start: number; end: number };
export type TextCalloutSelection = Array<TextCalloutRange & { blockId: string }>;

export function setTextCallout(block: ParagraphBlock, range: TextCalloutRange, enabled: boolean): ParagraphBlock {
  if (!Number.isInteger(range.start) || !Number.isInteger(range.end) || range.start < 0 ||
    range.end > block.text.length || range.start >= range.end || !block.text.slice(range.start, range.end).trim()) {
    throw new Error("Select the text you want to format.");
  }
  const callouts: TextCalloutRange[] = [];
  if (enabled) {
    for (const next of [...(block.callouts ?? []), range].toSorted((a, b) => a.start - b.start)) {
      const previous = callouts.at(-1);
      if (previous && next.start <= previous.end) previous.end = Math.max(previous.end, next.end);
      else callouts.push({ start: next.start, end: next.end });
    }
  } else {
    for (const current of block.callouts ?? []) {
      if (current.end <= range.start || current.start >= range.end) callouts.push({ ...current });
      else {
        if (current.start < range.start) callouts.push({ start: current.start, end: range.start });
        if (range.end < current.end) callouts.push({ start: range.end, end: current.end });
      }
    }
  }
  const result = { ...block };
  const visible = callouts.filter(item => block.text.slice(item.start, item.end).trim());
  if (visible.length) result.callouts = visible;
  else delete result.callouts;
  return result;
}

export function textCalloutSegments(block: ParagraphBlock) {
  const segments: Array<TextCalloutRange & { callout: boolean }> = [];
  let start = 0;
  for (const range of block.callouts ?? []) {
    if (start < range.start) segments.push({ start, end: range.start, callout: false });
    segments.push({ ...range, callout: true });
    start = range.end;
  }
  if (start < block.text.length) segments.push({ start, end: block.text.length, callout: false });
  return segments;
}
