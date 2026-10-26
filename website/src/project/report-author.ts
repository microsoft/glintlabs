import type { ReportManifest } from "../manifest/report-manifest.ts";

export function reportAuthor(manifest: Pick<ReportManifest, "metadata">) {
  return manifest.metadata.author ?? { name: "Megan Benzing" };
}
