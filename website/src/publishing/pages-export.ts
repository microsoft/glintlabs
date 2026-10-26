import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { listApprovedPublications, loadApprovedPublication } from "./approved-publication.ts";

export async function copyApprovedReports(source: string, destination: string, reportId?: string) {
  const reports = reportId
    ? [await loadApprovedPublication(reportId, { rootDirectory: source })]
    : await listApprovedPublications({ rootDirectory: source });
  if (reports.some(report => !report)) {
    throw new Error("Only an explicitly approved, exact report revision can be exported. Staging is not approval.");
  }
  for (const report of reports) {
    if (!report) throw new Error("The approved report is missing.");
    const id = report.publication.reportId;
    const content = path.join(destination, "content", "reports", id);
    const assets = path.join(destination, "public", "reports-assets", id);
    await mkdir(content, { recursive: true });
    await mkdir(assets, { recursive: true });
    for (const name of ["publication.json", "manifest.json"]) {
      await writeFile(path.join(content, name), await readFile(path.join(source, "content", "reports", id, name)));
    }
    for (const asset of report.publication.assets) {
      const name = path.basename(asset.path);
      await writeFile(path.join(assets, name),
        await readFile(path.join(source, "public", "reports-assets", id, name)));
    }
    await loadApprovedPublication(id, { rootDirectory: destination });
  }
  return reports.length;
}
