import { NextResponse } from "next/server";
import { requireOwner, readPublishingBody } from "../../../../publishing/owner-access.ts";
import { publishingApiError } from "../../../../publishing/publishing-api-error.ts";
import { ingestUnsignedPublicationPreview } from "../../../../publishing/publication-preview.ts";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const result = await ingestUnsignedPublicationPreview(await readPublishingBody(request, 50 * 1024 * 1024));
    const publication = result.preview.publication;
    return NextResponse.json({
      reportId: publication.reportId, revision: publication.revision,
      packageFingerprint: result.preview.packageFingerprint,
      title: publication.title,
      previewPath: `/reports/preview/${publication.reportId}/report`,
      catalogPreviewPath: `/reports/preview/${publication.reportId}`,
      status: "staged",
    });
  } catch (error) { return publishingApiError(error); }
}
