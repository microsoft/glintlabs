import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";

import { importWordReports, type WordReportFile } from "./bulk-report-import.ts";
import { BrowserProjectStorage } from "./project-storage.ts";
import type { StudioProject } from "./studio-project.ts";
import { reportStyleOptions } from "../report-system/report-style.ts";

async function wordFile(name: string): Promise<WordReportFile> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types" />',
  );
  zip.file(
    "word/_rels/document.xml.rels",
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships" />',
  );
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
      <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Test report</w:t></w:r></w:p>
      <w:p><w:r><w:t>Visual: Add an approved chart.</w:t></w:r></w:p>
    </w:body></w:document>`,
  );
  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return { name, arrayBuffer: async () => buffer };
}

for (const { id: reportStyle, label } of reportStyleOptions) {
  test(`bulk import persists ${label} drafts with source evidence and review items`, async () => {
    const records = new Map<string, unknown>();
    const legacyStorage: Storage = {
      length: 0,
      clear() {},
      getItem: () => null,
      key: () => null,
      removeItem() {},
      setItem() {
        throw new Error("Reports must not be written to localStorage.");
      },
    };
    const storage = new BrowserProjectStorage(legacyStorage, {
      list: async () => [...records.values()],
      load: async (id) => records.get(id),
      save: async (project) => { records.set(project.id, project); },
    });
    const progress: string[] = [];
    const results = await importWordReports(
      [await wordFile("first.docx"), await wordFile("second.docx")],
      {
        storage,
        reportStyle,
        onStart: (name, index) => { progress.push(`start:${index}:${name}`); },
        onResult: (result) => { progress.push(`${result.status}:${result.fileName}`); },
      },
    );

    assert.ok(results.every((result) => result.status === "saved"), JSON.stringify(results));
    assert.deepEqual(progress, [
      "start:0:first.docx", "saved:first.docx",
      "start:1:second.docx", "saved:second.docx",
    ]);
    const projects = await storage.list();
    assert.equal(projects.length, 2);
    assert.notEqual(projects[0].id, projects[1].id);
    for (const result of results) {
      assert.equal(result.status, "saved");
      const project = await storage.load(result.project.id);
      assert.equal(project.status, "draft");
      assert.equal(project.reportStyle, reportStyle);
      assert.equal(project.manifest.source.fileName, result.fileName);
      assert.ok(project.approvedContent);
      assert.ok(project.manifest.reviewItems.length > 0);
      assert.deepEqual(project.acceptedReviewItemIds, []);
      assert.deepEqual(project.publishReceipts, []);
      assert.equal(project.sourceApproval, undefined);
    }
  });
}

test("an invalid document does not prevent later reports from being saved", async () => {
  const saved: StudioProject[] = [];
  const results = await importWordReports([
    await wordFile("first.docx"),
    { name: "broken.docx", arrayBuffer: async () => new ArrayBuffer(0) },
    await wordFile("last.docx"),
  ], {
    storage: { save: async (project) => { saved.push(project); } },
    reportStyle: "research-report",
  });

  assert.deepEqual(results.map((result) => result.status), ["saved", "failed", "saved"]);
  assert.deepEqual(saved.map((project) => project.manifest.source.fileName), [
    "first.docx", "last.docx",
  ]);
  assert.ok(results[1].status === "failed" && results[1].message.length > 0);
});

test("storage failure is reported without rolling back earlier drafts or stopping later files", async () => {
  const saved: StudioProject[] = [];
  const results = await importWordReports([
    await wordFile("first.docx"),
    await wordFile("full.docx"),
    await wordFile("last.docx"),
  ], {
    storage: {
      async save(project) {
        if (project.manifest.source.fileName === "full.docx") {
          throw new Error("Browser storage is full.");
        }
        saved.push(project);
      },
    },
    reportStyle: "research-report",
  });

  assert.equal(saved.length, 2);
  assert.deepEqual(results.map((result) => result.status), ["saved", "failed", "saved"]);
  assert.deepEqual(results[1], {
    status: "failed", fileName: "full.docx", message: "Browser storage is full.",
  });
});

test("file read failures are reported and an empty batch does not write storage", async () => {
  let saves = 0;
  const options = {
    storage: { save: async () => { saves += 1; } },
    reportStyle: "research-report" as const,
  };
  assert.deepEqual(await importWordReports([], options), []);
  const results = await importWordReports([
    { name: "unreadable.docx", arrayBuffer: async () => { throw new Error("File could not be read."); } },
  ], options);
  assert.deepEqual(results, [{
    status: "failed", fileName: "unreadable.docx", message: "File could not be read.",
  }]);
  assert.equal(saves, 0);
});
