import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import {
  listPublicationPreviewIds,
  loadPublicationPreview,
} from "../src/publishing/publication-preview.ts";

const command = process.argv[2];
if (command !== "build" && command !== "start") {
  throw new Error("Usage: run-publication-preview.ts <build|start>");
}
const port = Number(process.argv[3] ?? "3113");
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("The local preview port must be an integer from 1 to 65535.");
}

const ids = await listPublicationPreviewIds();
if (ids.length === 0) {
  throw new Error("Stage a validated unsigned package before building its preview.");
}
const previews = await Promise.all(ids.map(async (id) => {
  const preview = await loadPublicationPreview(id);
  if (!preview) {
    throw new Error(`Staged preview ${id} is missing.`);
  }
  return { reportId: id, packageFingerprint: preview.packageFingerprint };
}));
const buildDirectory = ".next-publication-preview";
const snapshotPath = path.join(buildDirectory, "publication-preview-build.json");
if (command === "start") {
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  if (JSON.stringify(snapshot) !== JSON.stringify(previews)) {
    throw new Error("Staged packages changed after the preview build. Rebuild before starting the preview.");
  }
  console.log(`Unsigned review only: http://127.0.0.1:${port} (loopback; not a public deployment).`);
}

const require = createRequire(import.meta.url);
const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    command,
    ...(command === "start" ? ["--hostname", "127.0.0.1", "--port", String(port)] : []),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      GLINT_LABS_UNSIGNED_PREVIEW: "1",
      NEXT_DIST_DIR: buildDirectory,
    },
  },
);
const exitCode = await new Promise<number>((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal) {
      reject(new Error(`Preview ${command} stopped by ${signal}.`));
    } else {
      resolve(code ?? 1);
    }
  });
});
if (exitCode === 0 && command === "build") {
  await writeFile(snapshotPath, JSON.stringify(previews), "utf8");
  console.log("Local-only production preview built. No release approval or deployment was created.");
}
process.exitCode = exitCode;
