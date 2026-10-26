import { publicationAsset } from "../../../../publishing/publication-asset.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ reportId: string; fileName: string }> }) {
  const { reportId, fileName } = await context.params;
  return publicationAsset(request, reportId, fileName, true);
}
