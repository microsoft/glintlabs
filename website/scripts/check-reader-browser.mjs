import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLaunchReports } from "../src/launch-reports/reports.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const origin = "http://127.0.0.1:3011";
const prefix = "/glintlabs";
const reports = getLaunchReports({ includePrivatePreview: false });
const routes = [
  "/", "/reports", "/tools", "/about", "/annual-report-2026", "/tools/analyze-survey",
  ...reports.map((report) => `/reports/${report.slug}`), "/reports/glps-rd-feb-26",
];
const chromePath = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google/Chrome/Application/chrome.exe"),
].find((candidate) => candidate && existsSync(candidate));
assert(chromePath, "Install Chrome separately or set CHROME_PATH to a Chromium browser executable.");

const profile = await mkdtemp(path.join(tmpdir(), "glintlabs-reader-check-"));
const failures = [];
const errors = [];
const pending = new Map();
const states = [];
const navigation = [];
const exposure = [];
let preview;
let browser;
let socket;
let stopping = false;
let sequence = 0;
const pause = () => new Promise((resolve) => setTimeout(resolve, 100));

function start(command, args) {
  const child = spawn(command, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stderr.on("data", (chunk) => { output = (output + chunk).slice(-4096); });
  child.once("error", (error) => failures.push(error));
  child.once("exit", (code, signal) => {
    if (!stopping) failures.push(new Error(`${path.basename(command)} exited (${code ?? signal}): ${output}`));
  });
  return child;
}

async function waitFor(predicate, message) {
  let cause;
  for (let attempt = 0; attempt < 150; attempt++) {
    if (failures.length) throw failures[0];
    try {
      const value = await predicate();
      if (value) return value;
    } catch (error) {
      cause = error;
    }
    await pause();
  }
  throw new Error(message, { cause });
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Browser command timed out: ${method}`));
    }, 30_000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result.value;
}

async function key(key, code, number, text) {
  await send("Input.dispatchKeyEvent", {
    type: text ? "keyDown" : "rawKeyDown", key, code,
    windowsVirtualKeyCode: number, nativeVirtualKeyCode: number,
    ...(text ? { text, unmodifiedText: text } : {}),
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp", key, code, windowsVirtualKeyCode: number, nativeVirtualKeyCode: number,
  });
}

async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null || !child.pid) return;
  await new Promise((resolve) => {
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
    child.kill("SIGTERM");
  });
}

try {
  let listening = false;
  preview = start(process.execPath, ["scripts/serve-pages.mjs"]);
  preview.stdout.on("data", (chunk) => {
    if (chunk.toString().includes("Pages preview:")) listening = true;
  });
  await waitFor(() => listening, "Cannot start the reader preview; port 3011 must be free.");
  browser = start(chromePath, [
    "--headless=new", "--disable-gpu", "--disable-dev-shm-usage",
    "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0",
    ...(process.env.CI ? ["--no-sandbox"] : []),
    `--user-data-dir=${profile}`, "about:blank",
  ]);
  const port = await waitFor(async () =>
    (await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0],
  "Chrome did not expose its debugging port.");
  const page = await waitFor(async () => {
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    return pages.find((candidate) => candidate.type === "page" && candidate.url === "about:blank");
  }, "Chrome did not open a test page.");
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Cannot connect to Chrome.")), 15_000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("Chrome connection failed."));
    }, { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      errors.push(JSON.stringify(message.params.args));
    }
    if (message.method === "Network.responseReceived" && message.params.response.status >= 400) {
      errors.push(message.params.response.url);
    }
    if (message.method === "Network.loadingFailed" && message.params.errorText !== "net::ERR_ABORTED") {
      errors.push(message.params.errorText);
    }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  });
  socket.addEventListener("close", () => {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error("Chrome disconnected."));
    }
    pending.clear();
  });
  for (const method of ["Page.enable", "Runtime.enable", "Network.enable", "Page.bringToFront"]) {
    await send(method);
  }
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });

  const inventory = JSON.parse(await readFile(path.join(root, "docs/migration/source-inventory.json"), "utf8"));
  const release = await (await fetch(`${origin}${prefix}/release.json`)).json();
  assert.equal(release.sourceRevision, inventory.sourceCommit);
  assert.equal(release.revision, process.env.GITHUB_SHA ?? null);
  for (const route of routes) {
    assert.equal((await fetch(origin + prefix + route)).status, 200, route);
  }
  for (const route of ["/studio", "/api/studio/owner", "/api/studio/approve", "/reports/preview/invalid", "/preview/invalid"]) {
    assert.equal((await fetch(origin + prefix + route)).status, 404, route);
  }
  let sourceImages = 0;
  for (const report of reports) {
    for (const block of report.manifest.blocks.filter((block) => block.type === "image")) {
      const response = await fetch(origin + prefix + block.dataUrl);
      assert.equal(response.status, 200, block.dataUrl);
      assert.equal(createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex"), block.sourceAssetSha256);
      sourceImages++;
    }
  }
  assert.equal(sourceImages, 25);
  const axe = await readFile(path.join(root, "node_modules/axe-core/axe.min.js"), "utf8");
  for (const width of [320, 390, 768, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    for (const route of routes) {
      await evaluate("window.__readerPending = true");
      await send("Page.navigate", { url: origin + prefix + route });
      await waitFor(() => evaluate(
        `window.__readerPending !== true && location.pathname.replace(/\\/$/, "") === ${JSON.stringify(prefix + (route === "/" ? "" : route))} && document.readyState === "complete"`,
      ), `Navigation timeout: ${width}px ${route}`);
      await evaluate(`${axe}\ntrue`);
      await evaluate(`(async () => {
        const style = document.createElement("style");
        style.textContent = "*{scroll-behavior:auto!important}";
        document.head.append(style);
        await document.fonts.ready;
        for (const image of document.images) {
          const rect = image.getBoundingClientRect();
          if (!image.alt || !rect.width || !rect.height) {
            if (!(await fetch(image.src)).ok) throw Error("Broken decorative asset: " + image.src);
            continue;
          }
          if (!image.complete) image.scrollIntoView({block:"center"});
          for (let attempt = 0; attempt < 100 && (!image.complete || !image.naturalWidth); attempt++) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          if (!image.complete || !image.naturalWidth) throw Error("Broken image: " + image.src);
        }
        if (innerWidth !== ${width}) throw Error("Incorrect emulated viewport width");
        if (document.documentElement.scrollWidth > innerWidth + 1) throw Error("Horizontal overflow");
      })()`);
      if (route === "/" || route === "/reports") {
        await evaluate(`(async () => {
          const scope = ${route === "/" ? 'document.querySelector(\'section[aria-labelledby="featured-studies-title"]\')' : "document"};
          if (!scope) throw Error("Missing catalog");
          for (const report of ${JSON.stringify(reports.map((report) => report.catalog))}) {
            const headings = [...scope.querySelectorAll("article h2, article h3")].filter(el => el.textContent === report.title);
            if (${route === "/"} && !report.featured) {
              if (headings.length) throw Error("Reports-only drop appeared on Home: " + report.title);
              continue;
            }
            if (headings.length !== 1) throw Error("Missing or duplicate launch card: " + report.title);
            const card = headings[0].closest("article");
            const image = card.querySelector('img[src^="/glintlabs/figma/illustrations/blue/"]');
            if (!image || image.getAttribute("src") !== "/glintlabs" + report.thumbnail.src || image.alt !== report.thumbnail.alt) throw Error("Wrong card illustration");
            const rect = image.getBoundingClientRect();
            if (rect.width !== 128 || rect.height !== 128 || getComputedStyle(image).objectFit !== "contain") throw Error("Illustration crop changed");
            if (new URL(card.querySelector("a").href).pathname.replace(/\\/$/, "") !== "/glintlabs" + report.href) throw Error("Card link escaped Pages prefix");
            const audit = await axe.run(card, {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}});
            if (audit.violations.length) throw Error(JSON.stringify(audit.violations));
          }
        })()`);
      }
      const report = reports.find((report) => route === `/reports/${report.slug}`);
      if (report) {
        await evaluate(`(() => {
          const report = ${JSON.stringify({
            ids: [...report.referenceBlockIds],
            orderedIds: [...report.orderedListBlockIds],
            textBlocks: report.manifest.blocks.filter(block => "text" in block && !(block.type === "heading" && block.level === 1)),
            figures: report.manifest.blocks.filter(block => block.type === "image" && block.placement !== "hero").map(block => ({
              id: block.id, description: report.descriptions[block.id],
            })),
            briefId: report.manifest.blocks.find(block => block.type === "heading" && /^Research Drop in Brief:?$/i.test(block.text))?.id,
            hero: report.manifest.blocks.find((block) => block.type === "image" && block.placement === "hero").dataUrl,
          })};
          if (!document.querySelector('header img[src="/glintlabs' + report.hero + '"]')) throw Error("Original hero was replaced");
          const normalize = text => text.replace(/\\s+/g, " ").trim();
          for (const block of report.textBlocks) {
            const target = document.getElementById("report-block-" + block.id);
            if (!target) throw Error("Missing source block: " + block.id);
            if (/^-{3,}$/.test(block.text.trim())) {
              if (target.getAttribute("role") !== "separator" || target.textContent.trim() || getComputedStyle(target).borderTopWidth !== "1px") throw Error("Source divider was lost");
              if (target.nextElementSibling?.querySelector("h2") && getComputedStyle(target.nextElementSibling).borderTopWidth !== "0px") throw Error("Duplicated source divider");
              continue;
            }
            const expected = block.id === report.briefId ? "Research Drop in Brief" : block.text;
            if (normalize(target.textContent) !== normalize(expected)) throw Error("Changed source text: " + block.id);
          }
          for (const figure of report.figures) {
            const target = document.getElementById("report-block-" + figure.id);
            const image = target?.querySelector("img");
            const description = target?.querySelector('details[class*="figureDescription"] p');
            if (!image || description?.textContent !== figure.description) throw Error("Missing original figure or accessible description: " + figure.id);
            const rect = image.getBoundingClientRect();
            if (Math.abs(rect.width / rect.height - image.naturalWidth / image.naturalHeight) > .015) throw Error("Distorted original figure: " + figure.id);
          }
          for (const id of report.orderedIds) {
            const item = document.getElementById("report-block-" + id);
            if (!item || item.tagName !== "LI" || item.parentElement.tagName !== "OL") throw Error("Lost numbered finding: " + id);
          }
          const sections = [...document.querySelectorAll('nav[aria-label="Report sections"] a')];
          const briefHeading = document.getElementById("report-block-" + report.briefId)?.querySelector("h2");
          const briefLink = sections.find(link => link.getAttribute("href") === "#report-block-" + report.briefId);
          if (briefHeading?.textContent !== "Research Drop in Brief" || briefLink?.textContent !== "Research Drop in Brief") throw Error("Brief heading or navigation retained its colon");
          for (const link of sections) {
            const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
            if (!target || target.innerText.replace(/\\s+/g, " ").trim() !== link.innerText.replace(/\\s+/g, " ").trim()) throw Error("Section label does not match its heading");
          }
          const title = getComputedStyle(document.querySelector("h1"));
          if (title.fontSize !== (innerWidth <= 600 ? "40px" : "48px") || title.lineHeight !== (innerWidth <= 600 ? "48px" : "59px")) throw Error("Wrong hero scale");
          for (const id of report.ids) {
            const p = document.getElementById("report-block-" + id).querySelector("p");
            if (getComputedStyle(p).fontSize !== "12px" || getComputedStyle(p).lineHeight !== "18px") throw Error("Wrong reference typography");
          }
          const starts = document.querySelectorAll('[class*="referencesStart"]');
          if (starts.length !== 1 || getComputedStyle(starts[0]).borderTopWidth !== "1px") throw Error("Missing reference divider");
          const details = document.querySelector('details[class*="figureDescription"]');
          const summary = details.querySelector("summary");
          details.open = false;
          summary.scrollIntoView({block:"center"});
          summary.focus();
          const control = getComputedStyle(summary);
          if (control.fontSize !== "14px" || control.fontWeight !== "400" || control.borderRadius !== "12px" || control.outlineWidth !== "3px") throw Error("Disclosure style or focus changed");
          if (summary.getBoundingClientRect().height < (innerWidth <= 600 ? 44 : 32)) throw Error("Disclosure target too small");
          if (!summary.querySelector('svg[aria-hidden="true"]')) throw Error("Missing disclosure chevron");
        })()`);
        await key("Enter", "Enter", 13, "\r");
        assert(await evaluate(`document.querySelector('details[class*="figureDescription"]').open`));
        assert(Object.values(report.descriptions).includes(
          await evaluate(`document.querySelector('details[class*="figureDescription"] p').textContent`),
        ));
        assert.deepEqual(await evaluate(`(async () =>
          (await axe.run(document.querySelector('details[class*="figureDescription"]'),
          {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations)()`), []);
        await key(" ", "Space", 32);
        assert.equal(await evaluate(`document.querySelector('details[class*="figureDescription"]').open`), false);
        await send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
        assert.equal(await evaluate(`getComputedStyle(document.querySelector('details[class*="figureDescription"] summary')).borderTopWidth`), "1px");
        await send("Emulation.setEmulatedMedia", { features: [] });
      }
      if (route === "/annual-report-2026") {
        const grids = await evaluate(`(() => {
          const cases = [
            ["1581:67550", 0], ["1581:67763", 36], ["1581:68194", 84],
          ];
          return cases.map(([id, yellow]) => {
            const grid = document.querySelector('[data-node-id="' + id + '"]');
            if (!grid) throw Error("Missing exposure grid: " + id);
            const rows = [...grid.children];
            const style = getComputedStyle(grid);
            const rect = grid.getBoundingClientRect();
            if (rect.width !== 69 || rect.height !== 69 || style.borderRadius !== "6px" ||
                style.padding !== "3.75px" || !style.boxShadow.includes("rgb(92, 141, 248)")) {
              throw Error("Exposure outline or geometry changed: " + id);
            }
            if (rows.length !== 14 || rows.some(row => row.children.length !== 14)) {
              throw Error("Exposure grid must remain 14 by 14: " + id);
            }
            let highlighted = 0;
            rows.forEach((row, r) => [...row.children].forEach((dot, c) => {
              const isYellow = r >= 4 && r < 10 && (yellow === 84 || (yellow === 36 && c >= 4 && c < 10));
              const color = isYellow ? "rgb(255, 230, 165)" : "rgb(41, 68, 130)";
              const dotStyle = getComputedStyle(dot);
              if (dotStyle.backgroundColor !== color || dotStyle.width !== "3px" || dotStyle.height !== "3px") {
                throw Error("Exposure dot pattern changed: " + id + " row " + r + " column " + c);
              }
              if (isYellow) highlighted++;
            }));
            return { id, width: rect.width, height: rect.height, blue: 196 - highlighted, yellow: highlighted, outline: style.boxShadow };
          });
        })()`);
        exposure.push({ width, grids });
      }
      if (width === 1440 && (report || route === "/annual-report-2026")) {
        const count = await evaluate(`document.querySelectorAll('nav[aria-label="Report sections"] a').length`);
        assert(count > 1);
        for (const index of [0, 1, count - 1, 0]) {
          if (index === 0) {
            await evaluate(`document.querySelectorAll('nav[aria-label="Report sections"] a')[0].focus()`);
            await key("Enter", "Enter", 13, "\r");
          } else {
            await evaluate(`(() => {
              const link = document.querySelectorAll('nav[aria-label="Report sections"] a')[${index}];
              const target = document.getElementById(decodeURIComponent(link.getAttribute("href").slice(1)));
              scrollTo({top:target.getBoundingClientRect().top + scrollY - 120,behavior:"instant"});
            })()`);
          }
          await waitFor(() => evaluate(`document.querySelectorAll('nav[aria-label="Report sections"] a')[${index}].getAttribute("aria-current") === "location"`),
            `Section tracking failed: ${route} section ${index}`);
          await evaluate(`(async () => {
            const nav = document.querySelector('nav[aria-label="Report sections"]');
            const links = [...nav.querySelectorAll("a")];
            const selected = getComputedStyle(links[${index}]).color;
            const rest = nav.closest("aside").className.includes("dark") ? "rgb(246, 246, 248)" : "rgb(0, 0, 0)";
            if (selected === rest) throw Error("Indistinguishable navigation colors");
            for (const [i, link] of links.entries()) {
              const style = getComputedStyle(link);
              if (style.fontWeight !== "420" || style.backgroundColor !== "rgba(0, 0, 0, 0)" || style.boxShadow !== "none" ||
                  style.paddingLeft !== "0px" || style.marginLeft !== "0px" || style.display !== "inline" ||
                  style.borderLeftWidth !== "0px" || !style.textDecorationLine.includes("underline")) throw Error("Navigation is not colors-only");
              if (style.color !== (i <= ${index} ? selected : rest)) throw Error("Cumulative highlighting changed");
              if (i !== ${index} && link.hasAttribute("aria-current")) throw Error("Duplicate current section");
            }
            const audit = await axe.run(nav,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}});
            if (audit.violations.length) throw Error(JSON.stringify(audit.violations));
          })()`);
          navigation.push({ route, index });
        }
      }
      states.push({ route, width });
      console.log(`Verified ${width}px ${route}`);
    }
  }
  assert.deepEqual(errors, [], "Browser runtime, console, network, or HTTP errors.");
  if (failures.length) throw failures[0];
  const result = { states, navigation, exposure, sourceImages, privateRoutesAbsent: true, release, errors };
  await mkdir(path.join(root, "test-results"), { recursive: true });
  await writeFile(path.join(root, "test-results/reader-browser.json"), JSON.stringify(result, null, 2));
  console.log(`Reader browser checks passed: ${states.length} responsive states, ${navigation.length} navigation states, ${exposure.length * 3} exposure grids, ${sourceImages} original images.`);
} finally {
  stopping = true;
  socket?.close();
  await Promise.all([stop(browser), stop(preview)]);
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
