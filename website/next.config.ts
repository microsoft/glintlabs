import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  const privatePreview = process.env.GLINT_LABS_UNSIGNED_PREVIEW === "1";
  const distDir = process.env.NEXT_DIST_DIR ?? ".next";
  if (process.env.GLINT_LABS_SKIP_OWNER_KEY === "1" && !privatePreview) {
    throw new Error("Skipping the owner key is only allowed for a private Studio test server. Use npm run studio:start -- --skip-owner-key.");
  }
  if (phase === PHASE_PRODUCTION_SERVER && process.env.PORT === "3010") {
    const routesFile = path.join(process.cwd(), distDir, "server", "app-paths-manifest.json");
    const routes = existsSync(routesFile) ? JSON.parse(readFileSync(routesFile, "utf8")) : {};
    if (!["owner", "stage", "approve"].every((action) => routes[`/api/studio/${action}/route`])) {
      throw new Error(
        "Port 3010 requires the connected Studio build. This older build has no publishing APIs. Run npm run studio:build, then npm run studio:start; do not restart .next-publication-preview on the tunnel port.",
      );
    }
  }
  if (phase === PHASE_PRODUCTION_BUILD && !privatePreview) {
    const hasUnsignedContent = [
      path.join(process.cwd(), "content", "report-previews"),
      path.join(process.cwd(), "public", "report-preview-assets"),
    ].some((directory) => existsSync(directory) && readdirSync(directory).length > 0);
    if (hasUnsignedContent) {
      throw new Error(
        "Unsigned preview content must not enter a public build. Use npm run publication:preview:build for a local-only review build.",
      );
    }
  }

  return {
    distDir,
    outputFileTracingRoot: process.cwd(),
    ...(privatePreview
      ? { typescript: { tsconfigPath: "tsconfig.publication-preview.json" } }
      : {}),
  };
}
