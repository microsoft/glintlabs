import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;

test("tunnel port refuses legacy builds but accepts the complete connected build", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "glint-build-config-"));
  try {
    const exports = {};
    const env = { PORT: "3010", NEXT_DIST_DIR: ".test-build", GLINT_LABS_UNSIGNED_PREVIEW: "1" };
    vm.runInNewContext(compiled, { exports, require, process: { env, cwd: () => root } });
    const config = exports.default;
    assert.throws(() => config("phase-production-server"), /older build has no publishing APIs/);
    await mkdir(path.join(root, ".test-build", "server"), { recursive: true });
    const manifest = path.join(root, ".test-build", "server", "app-paths-manifest.json");
    await writeFile(manifest, JSON.stringify({ "/api/studio/owner/route": "owner.js" }));
    assert.throws(() => config("phase-production-server"), /connected Studio build/);
    await writeFile(manifest, JSON.stringify(Object.fromEntries(
      ["owner", "stage", "approve"].map((action) => [`/api/studio/${action}/route`, `${action}.js`]),
    )));
    assert.equal(config("phase-production-server").distDir, ".test-build");
    env.PORT = "3114";
    await rm(manifest);
    assert.equal(config("phase-production-server").distDir, ".test-build");
    env.PORT = "3010";
    assert.equal(config("phase-production-build").distDir, ".test-build");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("owner-key test mode is rejected outside a private Studio build or server", () => {
  const exports = {};
  const env = { GLINT_LABS_SKIP_OWNER_KEY: "1", NEXT_DIST_DIR: ".test-build", PORT: "3114" };
  vm.runInNewContext(compiled, { exports, require, process: { env, cwd: () => os.tmpdir() } });
  const config = exports.default;
  assert.throws(() => config("phase-production-build"), /only allowed for a private Studio test server/);
  assert.throws(() => config("phase-production-server"), /only allowed for a private Studio test server/);
  env.GLINT_LABS_UNSIGNED_PREVIEW = "1";
  assert.equal(config("phase-production-server").distDir, ".test-build");
  env.GLINT_LABS_SKIP_OWNER_KEY = "0";
  delete env.GLINT_LABS_UNSIGNED_PREVIEW;
  assert.equal(config("phase-production-server").distDir, ".test-build");
});
