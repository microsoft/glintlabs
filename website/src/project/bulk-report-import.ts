import { extractDocx } from "../extraction/extract-docx.ts";
import type { ReportStyle } from "../report-system/report-style.ts";
import type { ProjectStorage } from "./project-storage.ts";
import { createStudioProject, type StudioProject } from "./studio-project.ts";

export type WordReportFile = Pick<File, "name" | "arrayBuffer">;
export type BulkImportResult =
  | { status: "saved"; fileName: string; project: StudioProject }
  | { status: "failed"; fileName: string; message: string };

export async function importWordReports(
  files: readonly WordReportFile[],
  {
    storage,
    reportStyle,
    onStart,
    onResult,
  }: {
    storage: Pick<ProjectStorage, "save">;
    reportStyle: ReportStyle;
    onStart?: (fileName: string, index: number) => void;
    onResult?: (result: BulkImportResult) => void;
  },
): Promise<BulkImportResult[]> {
  const results: BulkImportResult[] = [];
  // Extract and persist one document at a time to bound bitmap and ZIP memory.
  for (const [index, file] of files.entries()) {
    onStart?.(file.name, index);
    let result: BulkImportResult;
    try {
      const extracted = await extractDocx(file.name, await file.arrayBuffer());
      const project = createStudioProject({
        importedManifestSha256: extracted.manifestSha256,
        approvedContent: extracted.approvedContent,
        publicationSourceEvidence: extracted.publicationSourceEvidence,
        manifest: extracted.manifest,
        reportStyle,
        status: "draft",
      });
      await storage.save(project);
      result = { status: "saved", fileName: file.name, project };
    } catch (error) {
      result = {
        status: "failed",
        fileName: file.name,
        message:
          error instanceof Error
            ? error.message
            : "This report could not be imported or saved. Try this file again.",
      };
    }
    results.push(result);
    onResult?.(result);
  }
  return results;
}
