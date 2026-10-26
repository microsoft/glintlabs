import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractDocx } from "../src/extraction/extract-docx.ts";

const directory = process.argv[2];
if (!directory) throw new Error("Pass the directory containing the three P0 Word documents.");
const reports = [
  ["GLPS_RD_Nov '25.docx", "empowering-managers-for-an-ai-first-future", false],
  ["GLPS_RD_Feb '26.docx", "fighting-ai-slop-with-meta-cognition-around-ai", false],
  ["GLPS_RD_April '26.docx", "tracking-the-rise-of-perceived-ai-value-at-work", false],
];
const generated = [];
for (const [fileName, slug, privatePreview] of reports) {
  const bytes = await readFile(path.join(directory, fileName));
  const { manifest, publicationSourceEvidence } = await extractDocx(fileName, new Uint8Array(bytes));
  const assets = path.resolve("src/launch-reports/assets", slug);
  await mkdir(assets, { recursive: true });
  for (const block of manifest.blocks) {
    if (block.type !== "image") continue;
    const image = Buffer.from(block.dataUrl.split(",")[1], "base64");
    const hash = createHash("sha256").update(image).digest("hex");
    if (hash !== block.sourceAssetSha256) throw new Error(`Source image mismatch: ${fileName}/${block.fileName}`);
    const asset = `${hash}${path.extname(block.fileName)}`;
    await writeFile(path.join(assets, asset), image);
    block.dataUrl = `/launch-report-assets/${slug}/${asset}`;
  }
  generated.push({ slug, privatePreview, manifest, publicationSourceEvidence });
}
await writeFile(
  "src/launch-reports/source-data.ts",
  "// Generated from the P0 Word originals; retain source hashes and editorial markup for fidelity checks.\nexport const launchReportSources = " + JSON.stringify(generated, null, 2) + ";\n",
);
