import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getLaunchReport } from "./reports.ts";

export async function launchReportAsset(request: Request, slug: string, fileName: string) {
  const report = getLaunchReport(slug);
  const asset = report?.manifest.blocks.find(block =>
    block.type === "image" && block.dataUrl === `/launch-report-assets/${report.slug}/${fileName}`,
  );
  if (!report || !asset || asset.type !== "image") return new Response("Not found", { status: 404 });
  const bytes = await readFile(path.join(process.cwd(), "src", "launch-reports", "assets", report.slug, fileName));
  if (createHash("sha256").update(bytes).digest("hex") !== asset.sourceAssetSha256) {
    throw new Error("The launch report image no longer matches its Word source.");
  }
  const headers = {
    "Content-Type": fileName.endsWith(".png") ? "image/png" : "image/jpeg",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": report.privatePreview ? "private, no-store" : "public, max-age=31536000, immutable",
    ETag: `"${asset.sourceAssetSha256}"`,
    ...(report.privatePreview ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
  };
  if (!report.privatePreview && request.headers.get("if-none-match") === headers.ETag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(bytes, { headers: { ...headers, "Content-Length": String(bytes.length) } });
}
