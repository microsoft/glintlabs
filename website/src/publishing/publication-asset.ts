import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { loadApprovedPublication } from "./approved-publication.ts";
import { ownerSessionValid } from "./owner-access.ts";
import { loadPublicationPreview } from "./publication-preview.ts";
import { isPrivateLaunchReportSource, launchSourceVisible } from "../launch-reports/reports.ts";

export async function publicationAsset(request: Request, reportId: string, fileName: string, preview: boolean) {
  if (!z.string().uuid().safeParse(reportId).success || !/^[a-f0-9]{64}\.[a-z0-9]+$/.test(fileName)) {
    return new Response("Not found", { status: 404 });
  }
  if (preview && !await ownerSessionValid(request.headers.get("cookie"))) return new Response("Not found", { status: 404 });
  const report = preview ? await loadPublicationPreview(reportId) : await loadApprovedPublication(reportId);
  if (!preview && report && !launchSourceVisible(report.publication.slug, report.manifest.source.fileName)) {
    return new Response("Not found", { status: 404 });
  }
  const asset = report?.publication.assets.find((item) => item.path === `assets/${fileName}`);
  if (!report || !asset) return new Response("Not found", { status: 404 });
  const privateAsset = preview || isPrivateLaunchReportSource(report.publication.slug, report.manifest.source.fileName);
  const bytes = await readFile(path.join(process.cwd(), "public", preview ? "report-preview-assets" : "reports-assets", reportId, fileName));
  if (bytes.length !== asset.sizeBytes || createHash("sha256").update(bytes).digest("hex") !== asset.sha256) {
    throw new Error("The publication asset no longer matches its reviewed package.");
  }
  return new Response(bytes, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(bytes.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": privateAsset ? "private, no-store" : "public, max-age=31536000, immutable",
      ...(privateAsset ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
    },
  });
}
