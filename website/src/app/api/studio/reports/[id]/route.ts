import { NextResponse } from "next/server";
import { loadApprovedPublication, removeApprovedPublication } from "../../../../../publishing/approved-publication.ts";
import { restorePublishedReaderStudioProject, restorePublishedStudioProject } from "../../../../../publishing/studio-report-library.ts";
import { OwnerRequestError, ownerSessionValid, readPublishingBody, requireOwner } from "../../../../../publishing/owner-access.ts";
import { publishingApiError } from "../../../../../publishing/publishing-api-error.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    if (!await ownerSessionValid(request.headers.get("cookie"))) {
      throw new OwnerRequestError("Enter your publishing code to open this report in Studio.", 401);
    }
    const { id } = await context.params;
    const report = await loadApprovedPublication(id);
    if (!report) throw new OwnerRequestError("This report is no longer on Glint Labs. Refresh your reports.", 404);
    const restore = new URL(request.url).searchParams.get("version") === "published"
      ? restorePublishedReaderStudioProject : restorePublishedStudioProject;
    return NextResponse.json({ project: await restore(report) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) { return publishingApiError(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    await requireOwner(request);
    const { id } = await context.params;
    const input = JSON.parse(new TextDecoder().decode(await readPublishingBody(request, 4096)));
    if (input.reportId !== id) throw new OwnerRequestError("Choose the report you want to remove.", 400);
    return NextResponse.json(await removeApprovedPublication(input));
  } catch (error) { return publishingApiError(error); }
}
