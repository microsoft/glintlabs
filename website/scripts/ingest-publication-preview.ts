import { readFile } from "node:fs/promises";
import path from "node:path";

import { ingestUnsignedPublicationPreview } from "../src/publishing/publication-preview.ts";

const packagePath = process.argv[2];
if (!packagePath) {
  throw new Error(
    "Usage: npm run publication:preview -- <path-to-unsigned-package.zip>",
  );
}

const absolutePackagePath = path.resolve(packagePath);
const result = await ingestUnsignedPublicationPreview(
  new Uint8Array(await readFile(absolutePackagePath)),
);

console.log(
  result.status === "unchanged"
    ? `Preview unchanged: /reports/preview/${result.preview.publication.reportId}`
    : `Preview staged: /reports/preview/${result.preview.publication.reportId}`,
);
console.log(
  `Report view: /reports/preview/${result.preview.publication.reportId}/report`,
);
console.log("This unsigned package is not approved and was not published.");
