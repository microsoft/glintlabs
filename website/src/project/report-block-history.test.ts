import assert from "node:assert/strict";
import test from "node:test";

import { reportBlockSchema, reportManifestSchema } from "../manifest/report-manifest.ts";
import { snapshotApprovedContent } from "../integrity/approved-content.ts";
import { setTextCallout, textCalloutSegments, type ParagraphBlock } from "./text-callout.ts";
import {
  removeReportBlock,
  restoreReportBlock,
} from "./report-block-history.ts";

const manifest = reportManifestSchema.parse({
  schemaVersion: "0.1.0",
  source: {
    fileName: "report.docx",
    sizeBytes: 100,
    sha256: "a".repeat(64),
  },
  metadata: {
    title: "Report",
    status: "draft",
  },
  blocks: [
    {
      id: "heading",
      type: "heading",
      level: 1,
      text: "Report",
      source: { part: "word/document.xml", index: 0 },
    },
    {
      id: "paragraph",
      type: "paragraph",
      text: "Editable report text.",
      source: { part: "word/document.xml", index: 1 },
    },
    {
      id: "section",
      type: "heading",
      level: 2,
      text: "Section",
      source: { part: "word/document.xml", index: 2 },
    },
  ],
  reviewItems: [
    {
      id: "review-paragraph",
      severity: "warning",
      message: "Review this paragraph.",
      blockId: "paragraph",
    },
  ],
  extraction: {
    paragraphCount: 3,
    imageCount: 0,
    unsupportedCount: 0,
  },
});

test("removes a block and its associated review items", () => {
  const result = removeReportBlock(manifest, "paragraph");

  assert.deepEqual(
    result.manifest.blocks.map((block) => block.id),
    ["heading", "section"],
  );
  assert.deepEqual(result.manifest.reviewItems, []);
  assert.equal(result.removed?.index, 1);
  assert.equal(result.removed?.reviewItems[0].id, "review-paragraph");
});

test("restores a removed block at its original position", () => {
  const result = removeReportBlock(manifest, "paragraph");
  assert.ok(result.removed);

  const restored = restoreReportBlock(result.manifest, result.removed);

  assert.deepEqual(
    restored.blocks.map((block) => block.id),
    ["heading", "paragraph", "section"],
  );
  assert.equal(restored.reviewItems[0].id, "review-paragraph");
});

test("selected-text callouts survive saving without changing approved wording, links or source identity", () => {
  const paragraph = {
    id: "paragraph", type: "paragraph" as const,
    text: "Before. Highlight this finding [1]. After.",
    links: [{ start: 8, end: 34, href: "https://example.com/research" }],
    source: { part: "word/document.xml", index: 1 },
  };
  const callouts = [{ start: 8, end: 34 }];
  const restored = reportBlockSchema.parse(setTextCallout(paragraph, callouts[0], true));
  assert.ok(restored.type === "paragraph");
  assert.deepEqual(restored.callouts, callouts);
  assert.equal(restored.text.slice(callouts[0].start, callouts[0].end), "Highlight this finding [1]");
  assert.equal(restored.text, paragraph.text);
  assert.deepEqual(restored.links, paragraph.links);
  assert.deepEqual(restored.source, paragraph.source);
  assert.deepEqual(
    snapshotApprovedContent({ ...manifest, blocks: [restored] }),
    snapshotApprovedContent({ ...manifest, blocks: [paragraph] }),
    "Callout formatting is presentation, not a change to approved content",
  );
});

test("callout ranges merge and split without rewriting Unicode text or mutating the original", () => {
  const paragraph: ParagraphBlock = {
    id: "paragraph", type: "paragraph", text: "Before. A finding 😀 and another finding. After.",
    links: [{ start: 8, end: 20, href: "https://example.com" }],
    source: { part: "word/document.xml", index: 1 },
  };
  const original = structuredClone(paragraph);
  const first = setTextCallout(paragraph, { start: 8, end: 20 }, true);
  const firstSnapshot = structuredClone(first);
  const merged = setTextCallout(first, { start: 18, end: 39 }, true);
  assert.deepEqual(merged.callouts, [{ start: 8, end: 39 }]);
  const split = setTextCallout(merged, { start: 23, end: 28 }, false);
  assert.deepEqual(split.callouts, [{ start: 8, end: 23 }, { start: 28, end: 39 }]);
  for (const formatted of [first, merged, split]) {
    assert.deepEqual(reportBlockSchema.parse(formatted), formatted);
    assert.equal(textCalloutSegments(formatted).map(part => formatted.text.slice(part.start, part.end)).join(""), paragraph.text);
    assert.deepEqual({ ...formatted, callouts: undefined }, { ...paragraph, callouts: undefined });
  }
  assert.deepEqual(setTextCallout(split, { start: 0, end: paragraph.text.length }, false), paragraph);
  assert.deepEqual(paragraph, original);
  assert.deepEqual(first, firstSnapshot);
});

test("removing a callout leaves surrounding whitespace unformatted rather than creating invalid ranges", () => {
  const paragraph: ParagraphBlock = { id: "paragraph", type: "paragraph", text: "  Finding  ", source: { part: "word/document.xml", index: 0 } };
  const formatted = setTextCallout(paragraph, { start: 0, end: paragraph.text.length }, true);
  const restored = setTextCallout(formatted, { start: 2, end: 9 }, false);
  assert.deepEqual(reportBlockSchema.parse(restored), paragraph);
  assert.equal(textCalloutSegments(restored).map(part => restored.text.slice(part.start, part.end)).join(""), paragraph.text);
});

test("callout editing and saved manifests reject empty, out-of-bounds and overlapping ranges", () => {
  const paragraph: ParagraphBlock = { id: "paragraph", type: "paragraph", text: "  Finding  ", source: { part: "word/document.xml", index: 0 } };
  for (const range of [{ start: -1, end: 4 }, { start: 3, end: 3 }, { start: 0, end: 99 }, { start: 0, end: 2 }, { start: 1.5, end: 4 }]) {
    assert.throws(() => setTextCallout(paragraph, range, true));
    assert.equal(reportBlockSchema.safeParse({ ...paragraph, callouts: [range] }).success, false);
  }
  assert.equal(reportBlockSchema.safeParse({ ...paragraph, callouts: [{ start: 2, end: 7 }, { start: 5, end: 9 }] }).success, false);
});
