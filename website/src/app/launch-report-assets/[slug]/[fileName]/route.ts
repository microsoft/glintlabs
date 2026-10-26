import { launchReportAsset } from "../../../../launch-reports/assets.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string; fileName: string }> }) {
  const { slug, fileName } = await context.params;
  return launchReportAsset(request, slug, fileName);
}
