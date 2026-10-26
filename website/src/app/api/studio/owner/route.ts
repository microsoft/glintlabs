import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createOwnerSession,
  OWNER_COOKIE,
  OWNER_SESSION_SECONDS,
  ownerKeyMatches,
  ownerSessionValid,
  OwnerRequestError,
  readPublishingBody,
  requirePublishingOrigin,
} from "../../../../publishing/owner-access.ts";
import { publishingApiError } from "../../../../publishing/publishing-api-error.ts";
import { ownerKeySkippedForTesting } from "../../../../publishing/owner-key-test-mode.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const valid = await ownerSessionValid(request.headers.get("cookie"));
  return new NextResponse(null, {
    status: valid ? 204 : 401,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Glint-Labs-Owner-Key-Required": ownerKeySkippedForTesting() ? "false" : "true",
    },
  });
}

export async function POST(request: Request) {
  try {
    requirePublishingOrigin(request);
    const body = z.object({ key: z.string().min(1).max(256) }).strict().parse(
      JSON.parse(new TextDecoder().decode(await readPublishingBody(request, 1024))),
    );
    if (!await ownerKeyMatches(body.key)) throw new OwnerRequestError("That owner key didn't match. Try again.", 401);
    const response = NextResponse.json({ authorized: true });
    response.cookies.set(OWNER_COOKIE, await createOwnerSession(), {
      httpOnly: true, sameSite: "strict", secure: request.headers.get("origin")?.startsWith("https:"),
      path: "/", maxAge: OWNER_SESSION_SECONDS,
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) { return publishingApiError(error); }
}

export async function DELETE(request: Request) {
  try {
    requirePublishingOrigin(request);
    const response = NextResponse.json({ authorized: false });
    response.cookies.set(OWNER_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "strict" });
    return response;
  } catch (error) { return publishingApiError(error); }
}
