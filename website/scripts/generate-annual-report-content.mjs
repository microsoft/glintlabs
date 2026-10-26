import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractDocx } from "../src/extraction/extract-docx.ts";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourcePath = process.argv[2];

if (!sourcePath) {
  throw new Error(
    "Pass the approved Word document path: npm run content:annual-report -- <file.docx>",
  );
}

const fileName = path.basename(sourcePath);
const bytes = await readFile(sourcePath);
const result = await extractDocx(fileName, bytes);
const publicAssetDirectory = path.join(
  repositoryRoot,
  "public",
  "annual-report-2026",
  "word-assets",
);

await mkdir(publicAssetDirectory, { recursive: true });

const imageDescriptions = new Map([
  [
    "block-31-image-0",
    "Quadrant chart showing where listening practices are gaining momentum, comparing current adoption with net momentum across established, momentum, at-risk, and emerging practices.",
  ],
  [
    "block-68-image-1",
    "Rank movement chart showing employee-listening priorities shifting toward AI adoption and organizational transformation over the next 12 to 18 months.",
  ],
]);

for (const block of result.manifest.blocks) {
  if (block.type !== "image") {
    continue;
  }

  const separatorIndex = block.dataUrl.indexOf(",");
  if (separatorIndex < 0) {
    throw new Error(`Image ${block.fileName} does not contain a valid data URL.`);
  }

  const assetPath = path.join(publicAssetDirectory, block.fileName);
  await writeFile(
    assetPath,
    Buffer.from(block.dataUrl.slice(separatorIndex + 1), "base64"),
  );
  block.dataUrl = `/annual-report-2026/word-assets/${block.fileName}`;
  block.alt = imageDescriptions.get(block.id) ?? block.alt;
}

result.manifest.metadata = {
  ...result.manifest.metadata,
  author: {
    name: "Microsoft Viva Glint People Science",
    handle: "@MicrosoftViva",
  },
  publishedDate: "2026",
  readTimeMinutes: 28,
  topics: ["Employee listening", "Workforce intelligence", "AI"],
};

const outputPath = path.join(
  repositoryRoot,
  "src",
  "annual-report-2026",
  "approved-content.json",
);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result.manifest, null, 2)}\n`);

console.log(
  `Generated ${path.relative(repositoryRoot, outputPath)} from ${fileName} (${result.manifest.source.sha256}).`,
);
