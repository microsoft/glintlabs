import { NextResponse } from "next/server";

import { savePublishedPreview } from "../../../publishing/published-preview-store.ts";
import { requireOwner, readPublishingBody } from "../../../publishing/owner-access.ts";
import { publishingApiError } from "../../../publishing/publishing-api-error.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const preview = await savePublishedPreview(JSON.parse(new TextDecoder().decode(await readPublishingBody(request, 50 * 1024 * 1024))));
    return NextResponse.json({
      homepagePath: `/published/${preview.id}`,
      reportPath: `/published/${preview.id}/report`,
    });
  } catch (error) {
    return publishingApiError(error);
  }
}
