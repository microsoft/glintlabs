import { NextResponse } from "next/server";
import { listApprovedPublications } from "../../../../publishing/approved-publication.ts";
import { publishedReportSummary } from "../../../../publishing/studio-report-library.ts";
import { publishingApiError } from "../../../../publishing/publishing-api-error.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reports = await listApprovedPublications();
    return NextResponse.json({ reports: reports.map(publishedReportSummary) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) { return publishingApiError(error); }
}
