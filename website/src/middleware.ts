import { NextResponse, type NextRequest } from "next/server";
import { ownerKeySkippedForTesting } from "./publishing/owner-key-test-mode.ts";

function checkedReportAsset(request: NextRequest, pathname: string) {
  const target = request.nextUrl.clone();
  target.pathname = pathname.replace(/^\/reports-assets\//, "/api/report-assets/");
  return NextResponse.rewrite(target);
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/reports-assets/")) {
    return checkedReportAsset(request, request.nextUrl.pathname);
  }
  if (request.nextUrl.pathname === "/_next/image") {
    const image = request.nextUrl.searchParams.get("url");
    if (!image) return NextResponse.next();
    let imagePath: string;
    try {
      imagePath = new URL(decodeURIComponent(new URL(image, "http://localhost").pathname), "http://localhost").pathname;
    } catch {
      return new NextResponse("Invalid image path", { status: 400 });
    }
    if (imagePath.startsWith("/reports-assets/") || imagePath.startsWith("/launch-report-assets/")) {
      return checkedReportAsset(request, imagePath);
    }
    if (!imagePath.startsWith("/report-preview-assets/")) return NextResponse.next();
  }
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie.includes("glint-labs-owner=") && !ownerKeySkippedForTesting()) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const access = await fetch(`http://127.0.0.1:${process.env.PORT ?? "3010"}/api/studio/owner`, {
      headers: { cookie }, cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    if (access.status !== 204) return new NextResponse("Not found", { status: 404 });
  } catch (error) {
    console.error("Owner access could not be checked.", error);
    return new NextResponse("Owner access is unavailable. Try again.", { status: 503 });
  }
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/reports/preview/:path*", "/report-preview-assets/:path*", "/reports-assets/:path*", "/published/:path*", "/preview/:path*", "/_next/image"],
};
