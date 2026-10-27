import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractDocx } from "../src/extraction/extract-docx.ts";
import { launchReportSources } from "../src/launch-reports/source-data.ts";

const directory = process.argv[2];
const p1Directory = process.argv[3];
if (!directory || !p1Directory) throw new Error("Pass the P0 and P1 Word document directories.");
const reports = [
  { fileName: "GLPS_RD_Nov '25.docx", slug: "empowering-managers-for-an-ai-first-future", directory, privatePreview: false, featured: true },
  { fileName: "GLPS_RD_Feb '26.docx", slug: "fighting-ai-slop-with-meta-cognition-around-ai", directory, privatePreview: false, featured: true },
  { fileName: "GLPS_RD_April '26.docx", slug: "tracking-the-rise-of-perceived-ai-value-at-work", directory, privatePreview: false, featured: true },
  { fileName: "GLPS_RD_May '26.docx", slug: "the-human-conditions-behind-ai-value-at-work", directory: p1Directory, privatePreview: false, featured: false },
  { fileName: "GLPS_RD_Oct '25.docx", slug: "amplifying-clarity-and-impact-of-ai-agents-by-aligning-on-desired-outcomes", directory: p1Directory, privatePreview: false, featured: false },
  { fileName: "GLPS_RD_March '26.docx", slug: "evolving-transformational-leadership-in-the-age-of-ai", directory: p1Directory, privatePreview: false, featured: false },
];
const generated = [];
for (const { fileName, slug, directory, privatePreview, featured } of reports) {
  // Published import evidence stays immutable when its original file is resaved.
  const existing = launchReportSources.find(source => source.slug === slug);
  if (existing) {
    generated.push({ ...existing, privatePreview, featured });
    continue;
  }
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
  generated.push({ slug, privatePreview, featured, manifest, publicationSourceEvidence });
}
await writeFile(
  "src/launch-reports/source-data.ts",
  "// Generated from the P0 and P1 Word originals; retain source hashes and editorial markup for fidelity checks.\nexport const launchReportSources = " + JSON.stringify(generated, null, 2) + ";\n",
);
