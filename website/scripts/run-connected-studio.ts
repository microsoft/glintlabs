import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { getOwnerKey } from "../src/publishing/owner-access.ts";
import { listApprovedPublications } from "../src/publishing/approved-publication.ts";
import { listPublicationPreviewIds, loadPublicationPreview } from "../src/publishing/publication-preview.ts";

const command = process.argv[2];
if (command !== "build" && command !== "start") throw new Error("Usage: run-connected-studio.ts <build|start>");
const skipOwnerKey = process.argv[3] === "--skip-owner-key";
if (process.argv.length > 3 && (!skipOwnerKey || command !== "start" || process.argv.length > 4)) {
  throw new Error("Use --skip-owner-key only with start for a private test session.");
}
await listApprovedPublications();
await Promise.all((await listPublicationPreviewIds()).map(async (id) => {
  if (!await loadPublicationPreview(id)) throw new Error(`Staged report ${id} is incomplete.`);
}));
if (command === "start" && !skipOwnerKey && process.env.GLINT_LABS_SKIP_OWNER_KEY !== "1") await getOwnerKey();
if (command === "start" && (skipOwnerKey || process.env.GLINT_LABS_SKIP_OWNER_KEY === "1")) {
  console.warn("Owner-key unlock is skipped for this private test server. Anyone with tunnel access can stage and approve reports. Report checks and final publication approval still apply.");
}
const require = createRequire(import.meta.url);
const child = spawn(process.execPath, [
  require.resolve("next/dist/bin/next"), command,
  ...(command === "start" ? ["--hostname", "127.0.0.1", "--port", "3010"] : []),
], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: "3010",
    GLINT_LABS_UNSIGNED_PREVIEW: "1",
    GLINT_LABS_SKIP_OWNER_KEY: skipOwnerKey ? "1" : process.env.GLINT_LABS_SKIP_OWNER_KEY ?? "0",
    NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? ".next-connected-studio-final",
  },
});
process.exitCode = await new Promise<number>((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => signal ? reject(new Error(`Studio stopped by ${signal}.`)) : resolve(code ?? 1));
});
