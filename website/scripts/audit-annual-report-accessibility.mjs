import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.argv[2] ?? "http://127.0.0.1:3010/annual-report-2026";
const port = Number(process.argv[3] ?? 9342);
const outputPath =
  process.argv[4] ??
  path.join("test-results", "annual-report-accessibility.json");
const viewports = [1440, 1280, 1024, 768, 390, 320];

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
      if (message.error) request.reject(new Error(JSON.stringify(message.error)));
      else request.resolve(message.result);
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

const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = pages.find((candidate) => candidate.type === "page");
assert(page, `No browser page is available on CDP port ${port}.`);

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) =>
  socket.addEventListener("open", resolve, { once: true }),
);
const cdp = new CdpClient(socket);

try {
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Page.navigate", { url });
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (
      await cdp.evaluate(
        "document.readyState === 'complete' && document.querySelector('main') !== null",
      )
    ) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const axeSource = await readFile(
    path.join("node_modules", "axe-core", "axe.min.js"),
    "utf8",
  );
  await cdp.evaluate(`${axeSource}\ntrue`);

  const results = [];
  let violations = [];
  for (const width of viewports) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.evaluate(
      "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
    );
    const result = await cdp.evaluate(`(() => {
      return {
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        mainCount: document.querySelectorAll("main").length,
        h1Count: document.querySelectorAll("h1").length,
        primaryNavigationCount: document.querySelectorAll('nav[aria-label="Primary"]').length,
        skipTargetExists: document.querySelector('a[href="#report-content"]') !== null
          && document.querySelector("#report-content") !== null,
        documentLanguage: document.documentElement.lang,
        hasTitle: document.title.trim().length > 0,
        headingOutlineValid: [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")]
          .map((heading) => Number(heading.tagName.slice(1)))
          .every((level, index, levels) => index === 0 || level <= levels[index - 1] + 1),
        colorScheme: getComputedStyle(document.querySelector("main")).colorScheme
      };
    })()`);
    results.push(result);

    if (width === viewports[0]) {
      violations = await cdp.evaluate(`(async () => {
        const summarize = ({ id, impact, help, nodes }) => ({
          id,
          impact,
          help,
          targets: nodes.map((node) => node.target.join(" "))
        });
        const roots = [
          document.querySelector('nav[aria-label="Primary"]'),
          document.querySelector("header"),
          ...document.querySelector("#report-content > div").children,
          document.querySelector("footer")
        ].filter(Boolean);
        const audits = [];
        for (const root of roots) {
          const audit = await axe.run(root, {
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
            },
            resultTypes: ["violations"]
          });
          audits.push(...audit.violations);
        }
        const unique = new Map();
        for (const violation of audits) {
          const summary = summarize(violation);
          const key = JSON.stringify(summary);
          unique.set(key, summary);
        }
        return [...unique.values()];
      })()`);
    }
  }

  await cdp.send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  const reducedMotion = await cdp.evaluate(`({
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    activeAnimations: document.getAnimations().filter(
      (animation) => animation.playState === "running"
    ).length
  })`);

  for (const result of results) {
    assert(
      result.documentWidth <= result.width,
      `Document overflows at ${result.width}px.`,
    );
    assert(
      result.bodyWidth <= result.width,
      `Body overflows at ${result.width}px.`,
    );
    assert.equal(
      result.mainCount,
      1,
      `Expected one main landmark at ${result.width}px.`,
    );
    assert.equal(result.h1Count, 1, `Expected one h1 at ${result.width}px.`);
    assert.equal(
      result.primaryNavigationCount,
      1,
      `Expected one primary navigation at ${result.width}px.`,
    );
    assert.equal(
      result.skipTargetExists,
      true,
      `Skip link is invalid at ${result.width}px.`,
    );
    assert.equal(result.documentLanguage, "en");
    assert.equal(result.hasTitle, true);
    assert.equal(result.headingOutlineValid, true);
    assert.equal(
      result.colorScheme,
      "dark",
      `Dark color scheme is missing at ${result.width}px.`,
    );
  }
  assert.deepEqual(violations, [], "axe found WCAG A/AA violations.");
  assert.equal(reducedMotion.scrollBehavior, "auto");
  assert.equal(reducedMotion.activeAnimations, 0);

  const report = {
    auditedAt: new Date().toISOString(),
    url,
    viewports: results,
    violations,
    reducedMotion,
    interpretation:
      "The 320px result represents 400% reflow for a 1280px reference viewport.",
  };
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        url,
        viewports: results.map(({ width }) => ({
          width,
        })),
        violations: violations.length,
        reducedMotion,
        outputPath,
      },
      null,
      2,
    ),
  );
} finally {
  socket.close();
}
