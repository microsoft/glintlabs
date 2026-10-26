import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { OwnerRequestError } from "./owner-access.ts";

export function publishingApiError(error: unknown) {
  const status = error instanceof OwnerRequestError ? error.status
    : error instanceof ZodError || error instanceof SyntaxError ? 400 : 500;
  if (status === 500) console.error("Glint Labs website publishing failed.", error);
  return NextResponse.json({
    error: error instanceof Error ? error.message : "The website could not be updated. Try again.",
  }, { status });
}
