import { NextResponse } from "next/server";
import { requireOwner, readPublishingBody } from "../../../../publishing/owner-access.ts";
import { publishingApiError } from "../../../../publishing/publishing-api-error.ts";
import { approvePublicationForLocalWebsite } from "../../../../publishing/approved-publication.ts";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const report = await approvePublicationForLocalWebsite(
      JSON.parse(new TextDecoder().decode(await readPublishingBody(request, 4096))),
    );
    return NextResponse.json({
      reportPath: `/reports/${report.publication.slug}`,
      catalogPath: "/reports",
      revision: report.publication.revision,
      status: "approved-local",
      productionDeployed: false,
    });
  } catch (error) { return publishingApiError(error); }
}
