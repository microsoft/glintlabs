import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);
const inventory = JSON.parse(
  await readFile(new URL("../docs/migration/source-inventory.json", import.meta.url), "utf8"),
);
assert.equal(inventory.sourceCommit, "0ef824b3ad840a6a75d16261168bd0219f2ee510");
assert.equal(inventory.files.length, 684);
const destinations = new Set();
let unchanged = 0;
for (const file of inventory.files) {
  assert(!destinations.has(file.destination), `Duplicate destination: ${file.destination}`);
  destinations.add(file.destination);
  const url = new URL(file.destination, root);
  assert(url.href.startsWith(root.href), `Destination outside repository: ${file.destination}`);
  const hash = createHash("sha256").update(await readFile(url)).digest("hex");
  assert.equal(hash, file.destinationSha256, `Migration hash mismatch: ${fileURLToPath(url)}`);
  if (hash === file.sourceSha256) unchanged++;
  else assert(file.intentionalDifference, `Undocumented difference: ${file.destination}`);
}
console.log(`Verified ${inventory.files.length} source mappings: ${unchanged} byte-identical, ${inventory.files.length - unchanged} documented differences.`);
