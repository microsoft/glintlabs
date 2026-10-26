import assert from "node:assert/strict";
import test from "node:test";
import { accessibleDataFromCsv } from "./accessible-chart-data.ts";
import { sha256Text } from "../integrity/approved-content.ts";

test("CSV preserves supplied values, quoted separators, multiline cells and source hash", async () => {
  const csv = 'Factor,Coefficient,Note\r\n"Trust, leadership",-0.12,"Line one\nLine two"\r\nVoice,0.34,"Said ""yes"""';
  const data = await accessibleDataFromCsv(csv, "Approved coefficients", "image-1", "number");
  assert.deepEqual(data.columns, ["Factor", "Coefficient", "Note"]);
  assert.deepEqual(data.rows[0].cells, ["Trust, leadership", "-0.12", "Line one\nLine two"]);
  assert.equal(data.rows[1].cells[2], 'Said "yes"');
  assert.equal(data.sha256, await sha256Text(csv));
  assert.equal(data.sourceKind, "verified-upload");
});
test("CSV blocks missing headers, ragged rows and unfinished/misplaced quotes", async () => {
  for (const csv of ["Label\nValue", "Label,Value", ",Value\nA,2", "Label,Value\nA,2,3", 'Label,Value\n"A,2', 'Label,Value\nA"oops,2', 'Label,Value\n"A"bad,2']) {
    await assert.rejects(accessibleDataFromCsv(csv, "Data", "image-1", "unknown"));
  }
});
