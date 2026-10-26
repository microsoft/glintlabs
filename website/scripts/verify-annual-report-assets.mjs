import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(
  root,
  "docs",
  "release",
  "annual-report-assets.json",
);
const entryPoint = "src/app/annual-report-2026/page.tsx";
const writeMode = process.argv.includes("--write");

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const runtimeUrl = argumentValue("--runtime-url");
const cdpPort = argumentValue("--cdp-port");
const outputPath = argumentValue("--output");

const extensions = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".css",
];
const indexExtensions = extensions
  .filter(Boolean)
  .map((extension) => path.join("index" + extension));
const assetPattern =
  /\/(?:figma|annual-report-2026)\/[A-Za-z0-9_./-]+\.(?:avif|jpe?g|png|svg|webp)/g;
const mediaTypes = {
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function repositoryPath(absolutePath) {
  return path.relative(root, absolutePath).replaceAll(path.sep, "/");
}

function absolutePath(relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

function publicPathToRepositoryPath(publicPath) {
  return `public${publicPath}`;
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

async function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return undefined;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    ...extensions.map((extension) => `${base}${extension}`),
    ...indexExtensions.map((indexFile) => path.join(base, indexFile)),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    if ((await stat(candidate)).isFile()) return candidate;
  }
  throw new Error(
    `Cannot resolve ${specifier} imported by ${repositoryPath(fromFile)}.`,
  );
}

async function collectSourceGraph() {
  const pending = [absolutePath(entryPoint), absolutePath("src/app/site-theme.css")];
  const files = new Set();

  while (pending.length > 0) {
    const file = pending.pop();
    if (!file || files.has(file)) continue;
    files.add(file);
    const text = await readFile(file, "utf8");
    const specifiers = [
      ...text.matchAll(/\bfrom\s+["']([^"']+)["']/g),
      ...text.matchAll(/\bimport\s+["']([^"']+)["']/g),
    ].map((match) => match[1]);

    for (const specifier of specifiers) {
      const imported = await resolveImport(file, specifier);
      if (imported && !files.has(imported)) pending.push(imported);
    }
  }

  return [...files].sort();
}

function addReference(references, publicPath, file, text, index, detail) {
  const reference = {
    path: repositoryPath(file),
    line: lineNumber(text, index),
    detail,
  };
  const existing = references.get(publicPath) ?? [];
  if (
    !existing.some(
      (candidate) =>
        candidate.path === reference.path &&
        candidate.line === reference.line &&
        candidate.detail === reference.detail,
    )
  ) {
    existing.push(reference);
  }
  references.set(publicPath, existing);
}

async function discoverSourceReferences(files) {
  const references = new Map();

  for (const file of files) {
    const text = await readFile(file, "utf8");

    for (const match of text.matchAll(assetPattern)) {
      addReference(
        references,
        match[0],
        file,
        text,
        match.index,
        "literal production reference",
      );
    }

    if (
      text.includes(
        "const asset = (name: string) => `/figma/annual-canonical/interaction-${name}.svg`",
      )
    ) {
      for (const match of text.matchAll(/\basset\("([^"]+)"\)/g)) {
        addReference(
          references,
          `/figma/annual-canonical/interaction-${match[1]}.svg`,
          file,
          text,
          match.index,
          "dynamic interaction helper",
        );
      }
    }

    for (const match of text.matchAll(/\billustration\("([^"]+)", "([^"]+)"\)/g)) {
      for (const publicPath of [
        `/figma/annual-canonical/${match[1]}.svg`,
        `/figma/annual-blue/${match[2]}.svg`,
      ]) {
        addReference(references, publicPath, file, text, match.index, "palette illustration helper");
      }
    }

    for (const line of text.split(/\r?\n/)) {
      if (line.includes("/figma/annual-canonical/interaction-${[")) {
        const offset = text.indexOf(line);
        for (const match of line.matchAll(/"([^"]+)"/g)) {
          addReference(
            references,
            `/figma/annual-canonical/interaction-${match[1]}.svg`,
            file,
            text,
            offset + match.index,
            "dynamic interaction icon map",
          );
        }
      }

      if (line.includes("/figma/annual-canonical/priority-${")) {
        const offset = text.indexOf(line);
        for (const match of line.matchAll(/:\s*"([^"]+)"/g)) {
          addReference(
            references,
            `/figma/annual-canonical/priority-${match[1]}.svg`,
            file,
            text,
            offset + match.index,
            "dynamic priority icon map",
          );
        }
      }
    }
  }

  for (const entries of references.values()) {
    entries.sort(
      (left, right) =>
        left.path.localeCompare(right.path) || left.line - right.line,
    );
  }
  return references;
}

async function digestFile(file) {
  const bytes = await readFile(file);
  return {
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function categoryFor(publicPath) {
  const name = path.posix.basename(publicPath);
  if (name === "hero.webp") return "photography";
  if (
    name === "microsoft.svg" ||
    name === "nav-viva-glint-annual-report.svg"
  ) {
    return "brand-mark";
  }
  if (/^(interaction-|matrix-|priority-)/.test(name)) return "figma-icon";
  if (/^img/.test(name)) return "figma-illustration";
  return "figma-decoration";
}

function requiredApprovers(category) {
  if (category === "photography") {
    return [
      "Design/Figma owner",
      "Asset licensing or Legal/Privacy",
      "Accessibility/content reviewer",
      "Release owner",
    ];
  }
  if (category === "brand-mark") {
    return [
      "Microsoft Brand/Trademark",
      "Legal",
      "Release owner",
    ];
  }
  return ["Design/Figma owner", "Legal/IP", "Release owner"];
}

function defaultApproval(category) {
  return {
    status: "blocked",
    requiredApproverRoles: requiredApprovers(category),
    approver: null,
    approvalDate: null,
    evidence: [],
    blocksPublication: true,
  };
}

function defaultSource(publicPath) {
  const siteFrame = publicPath.match(/^\/figma\/site-canonical\/(home|reports|tools|about)\//)?.[1];
  const canonicalNode = siteFrame
    ? { home: "310:14672", reports: "1487:30116", tools: "1429:20520", about: "1655:35684" }[siteFrame]
    : publicPath.startsWith("/figma/annual-blue/") ? "1655:41913" : undefined;
  return {
    kind: "figma-export",
    fileKey: "rkrC8mdVsXC1rAITLp04Sq",
    reportNode: canonicalNode ?? "843:18509",
    canonicalSnapshotNode: canonicalNode ?? "1584:78960",
    assetNode: null,
    status: "asset-node-unresolved",
  };
}

async function buildAsset(publicPath, references, existing) {
  const repositoryFile = publicPathToRepositoryPath(publicPath);
  const file = absolutePath(repositoryFile);
  assert(existsSync(file), `Missing production asset ${repositoryFile}.`);
  const metrics = await digestFile(file);
  const category = existing?.category ?? categoryFor(publicPath);
  const source = defaultSource(publicPath);
  const migratedSource = source.canonicalSnapshotNode !== "1584:78960" &&
    existing?.source?.canonicalSnapshotNode === "1584:78960";
  return {
    publicPath,
    repositoryPath: repositoryFile,
    category,
    mediaType: mediaTypes[path.extname(repositoryFile).toLowerCase()],
    ...metrics,
    references: references.get(publicPath) ?? existing?.references ?? [],
    source: migratedSource ? source : existing?.source ?? source,
    approval: existing?.approval ?? defaultApproval(category),
  };
}

async function refreshSourceOnlyAsset(asset) {
  const file = absolutePath(asset.repositoryPath);
  assert(
    existsSync(file),
    `Missing retained source asset ${asset.repositoryPath}.`,
  );
  const metrics = await digestFile(file);
  return {
    ...asset,
    mediaType: mediaTypes[path.extname(asset.repositoryPath).toLowerCase()],
    ...metrics,
  };
}

function validateApproval(item) {
  const approval = item.approval;
  assert(approval, `${item.repositoryPath} is missing approval metadata.`);
  assert(
    Array.isArray(approval.requiredApproverRoles) &&
      approval.requiredApproverRoles.length > 0,
    `${item.repositoryPath} is missing required approver roles.`,
  );

  if (approval.status === "approved") {
    assert(approval.approver, `${item.repositoryPath} lacks an approver.`);
    assert(
      approval.approvalDate,
      `${item.repositoryPath} lacks an approval date.`,
    );
    assert(
      Array.isArray(approval.evidence) && approval.evidence.length > 0,
      `${item.repositoryPath} claims approval without evidence.`,
    );
    assert.equal(
      approval.blocksPublication,
      false,
      `${item.repositoryPath} is approved but still marked blocking.`,
    );
  } else {
    assert.equal(
      approval.blocksPublication,
      true,
      `${item.repositoryPath} is unresolved but does not block publication.`,
    );
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(entryPath)));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

async function validateManifest(manifest, references) {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.scope.entryPoint, entryPoint);

  const ignored = new Map(
    manifest.scope.ignoredReferences.map((entry) => [
      entry.publicPath,
      entry.reason,
    ]),
  );
  for (const [publicPath, reason] of ignored) {
    assert(reason.trim(), `${publicPath} lacks an exclusion reason.`);
    assert(
      references.has(publicPath),
      `${publicPath} is excluded but no longer appears in the source graph.`,
    );
  }

  const expectedPaths = [...references.keys()]
    .filter((publicPath) => !ignored.has(publicPath))
    .sort();
  const manifestPaths = manifest.assets
    .map((asset) => asset.publicPath)
    .sort();
  assert.deepEqual(
    manifestPaths,
    expectedPaths,
    "Production source references and manifest assets differ. Run npm run assets:annual-report:update after reviewing the change.",
  );
  assert.equal(
    new Set(manifestPaths).size,
    manifestPaths.length,
    "Manifest contains duplicate public paths.",
  );

  for (const asset of manifest.assets) {
    assert.equal(
      asset.repositoryPath,
      publicPathToRepositoryPath(asset.publicPath),
      `${asset.publicPath} has an unexpected repository path.`,
    );
    const file = absolutePath(asset.repositoryPath);
    assert(existsSync(file), `Missing ${asset.repositoryPath}.`);
    const metrics = await digestFile(file);
    assert.equal(
      asset.bytes,
      metrics.bytes,
      `${asset.repositoryPath} byte length changed.`,
    );
    assert.equal(
      asset.sha256,
      metrics.sha256,
      `${asset.repositoryPath} checksum changed.`,
    );
    assert.equal(
      asset.mediaType,
      mediaTypes[path.extname(asset.repositoryPath).toLowerCase()],
      `${asset.repositoryPath} has an incorrect media type.`,
    );
    assert(
      Array.isArray(asset.references) && asset.references.length > 0,
      `${asset.repositoryPath} lacks production references.`,
    );
    assert(asset.source, `${asset.repositoryPath} lacks source metadata.`);
    validateApproval(asset);
  }

  for (const asset of manifest.sourceOnlyAssets) {
    const file = absolutePath(asset.repositoryPath);
    assert(existsSync(file), `Missing ${asset.repositoryPath}.`);
    assert(
      !asset.repositoryPath.startsWith("public/"),
      `${asset.repositoryPath} is source-only but remains publicly served.`,
    );
    const metrics = await digestFile(file);
    assert.equal(asset.bytes, metrics.bytes);
    assert.equal(asset.sha256, metrics.sha256);
    validateApproval(asset);
  }

  const annualCanonicalDirectory = absolutePath(
    "public/figma/annual-canonical",
  );
  const servedCanonicalPaths = (await listFiles(annualCanonicalDirectory))
    .map((file) => `/${repositoryPath(file).replace(/^public\//, "")}`)
    .sort();
  const manifestedCanonicalPaths = manifestPaths
    .filter((publicPath) =>
      publicPath.startsWith("/figma/annual-canonical/"),
    )
    .sort();
  assert.deepEqual(
    servedCanonicalPaths,
    manifestedCanonicalPaths,
    "public/figma/annual-canonical contains an unmanifested or unused file.",
  );

  return {
    productionAssets: manifest.assets.length,
    sourceOnlyAssets: manifest.sourceOnlyAssets.length,
    sourceFiles: manifest.scope.sourceFiles.length,
    ignoredReferences: manifest.scope.ignoredReferences.length,
  };
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.sequence = 0;
    this.pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const request = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) {
        request.reject(new Error(JSON.stringify(message.error)));
      } else {
        request.resolve(message.result);
      }
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ??
          result.exceptionDetails.text,
      );
    }
    return result.result.value;
  }
}

async function verifyRuntimeAssets(manifest) {
  assert(runtimeUrl, "--runtime-url is required for runtime verification.");
  assert(cdpPort, "--cdp-port is required for runtime verification.");
  const pages = await (
    await fetch(`http://127.0.0.1:${Number(cdpPort)}/json/list`)
  ).json();
  const page = pages.find((candidate) => candidate.type === "page");
  assert(page, `No browser page is available on CDP port ${cdpPort}.`);

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) =>
    socket.addEventListener("open", resolve, { once: true }),
  );
  const cdp = new CdpClient(socket);

  try {
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Page.navigate", { url: runtimeUrl });
    for (let attempt = 0; attempt < 150; attempt += 1) {
      if (
        await cdp.evaluate(
          "document.readyState === 'complete' && document.querySelector('#report-content') !== null",
        )
      ) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    await cdp.evaluate(`(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
        scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      scrollTo(0, 0);
      const continuous = [...document.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "continuous listening"
      );
      continuous?.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
      document.querySelector('dialog button[aria-label^="Close"]')?.click();
      document.querySelector("[data-momentum-trigger]")?.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
      document.querySelector(
        'button[aria-label="Close listening approach details"]'
      )?.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
    })()`);

    const runtimePaths = await cdp.evaluate(`(() => {
      const normalize = (value) => {
        try {
          const url = new URL(value, location.href);
          if (url.pathname === "/_next/image") {
            return new URLSearchParams(url.search).get("url");
          }
          return url.pathname;
        } catch {
          return value;
        }
      };
      const resources = performance
        .getEntriesByType("resource")
        .map((entry) => normalize(entry.name));
      const images = [...document.images].map((image) =>
        normalize(image.currentSrc || image.src)
      );
      return [...new Set([...resources, ...images].filter(
        (assetPath) =>
          assetPath?.startsWith("/figma/") ||
          assetPath?.startsWith("/annual-report-2026/")
      ))].sort();
    })()`);

    const expectedPaths = new Set(manifest.assets.map((asset) => asset.publicPath));
    assert.deepEqual(
      runtimePaths.filter((assetPath) => !expectedPaths.has(assetPath)),
      [],
      "Runtime requested an asset missing from the release manifest.",
    );
    assert(runtimePaths.length > 0, "The route did not request any manifested assets.");
    return {
      runtimeUrl,
      runtimeAssets: runtimePaths.length,
      conditionalSourceAssetsNotRequested: manifest.assets.length - runtimePaths.length,
    };
  } finally {
    socket.close();
  }
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const sourceFiles = await collectSourceGraph();
const references = await discoverSourceReferences(sourceFiles);

if (writeMode) {
  const existing = new Map(
    manifest.assets.map((asset) => [asset.publicPath, asset]),
  );
  const ignored = new Set(
    manifest.scope.ignoredReferences.map((entry) => entry.publicPath),
  );
  const publicPaths = [...references.keys()]
    .filter((publicPath) => !ignored.has(publicPath))
    .sort();
  manifest.scope.sourceFiles = sourceFiles.map(repositoryPath);
  manifest.assets = await Promise.all(
    publicPaths.map((publicPath) =>
      buildAsset(publicPath, references, existing.get(publicPath)),
    ),
  );
  manifest.sourceOnlyAssets = await Promise.all(
    manifest.sourceOnlyAssets.map(refreshSourceOnlyAsset),
  );
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const refreshedManifest = JSON.parse(await readFile(manifestPath, "utf8"));
const result = {
  static: await validateManifest(refreshedManifest, references),
};
if (runtimeUrl || cdpPort) {
  result.runtime = await verifyRuntimeAssets(refreshedManifest);
}
if (outputPath) {
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
}
console.log(JSON.stringify(result, null, 2));
