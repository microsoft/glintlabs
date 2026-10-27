import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectorUrl, parseEvent, productionOrigin } from "../src/telemetry/contract.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const local = "http://127.0.0.1:3011";
const chrome = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
  process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
  process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe"),
].find(candidate => candidate && existsSync(candidate));
assert(chrome, "Set CHROME_PATH to a Chromium browser executable.");
const profile = await mkdtemp(path.join(tmpdir(), "glintlabs-telemetry-check-"));
const children = [];
const failures = [];
const pending = new Map();
const events = [];
const warnings = [];
let socket;
let sequence = 0;
let rejecting = false;
let stopping = false;
const pause = () => new Promise(resolve => setTimeout(resolve, 100));

function start(command, args) {
  const child = spawn(command, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stderr.on("data", chunk => { output = (output + chunk).slice(-4096); });
  child.once("error", error => failures.push(error));
  child.once("exit", (code, signal) => {
    if (!stopping) failures.push(new Error(`${path.basename(command)} exited (${code ?? signal}): ${output}`));
  });
  children.push(child);
  return child;
}

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (failures.length) throw failures[0];
    if (await predicate()) return;
    await pause();
  }
  throw new Error(message);
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}

async function intercept({ requestId, request }) {
  const url = new URL(request.url);
  if (request.url === collectorUrl) {
    const headers = [
      { name: "Access-Control-Allow-Origin", value: productionOrigin },
      { name: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
      { name: "Access-Control-Allow-Headers", value: "content-type" },
      { name: "Content-Type", value: "application/json" },
    ];
    if (request.method === "POST") {
      const event = JSON.parse(request.postData);
      assert.ok(parseEvent(event), "Browser sent an invalid event.");
      events.push(event);
    }
    await send("Fetch.fulfillRequest", {
      requestId, responseCode: request.method === "OPTIONS" ? 204 : rejecting ? 503 : 202,
      responseHeaders: headers, ...(request.method === "OPTIONS" ? {} : {
        body: Buffer.from(JSON.stringify({ code: rejecting ? "disabled" : "accepted" })).toString("base64"),
      }),
    });
    return;
  }
  assert.equal(url.origin, productionOrigin, "Unexpected intercepted origin.");
  const response = await fetch(local + url.pathname + url.search);
  await send("Fetch.fulfillRequest", {
    requestId, responseCode: response.status,
    responseHeaders: [{ name: "Content-Type", value: response.headers.get("content-type") ?? "application/octet-stream" }],
    body: Buffer.from(await response.arrayBuffer()).toString("base64"),
  });
}

async function go(route, origin = productionOrigin) {
  const url = new URL(`${origin}/glintlabs${route}`);
  await send("Page.navigate", { url: url.href });
  await waitFor(() => evaluate(`location.pathname === ${JSON.stringify(url.pathname)} &&
    document.readyState === "complete"`), `Page failed to load: ${route}`);
}

async function settings() {
  await evaluate(`document.querySelector('[aria-label="Analytics preferences"] > button').click()`);
  await waitFor(() => evaluate(`!!document.getElementById("analytics-preferences") &&
    document.activeElement.textContent === "Reject optional analytics"`), "Settings did not open with keyboard focus.");
}

async function choose(allow) {
  await evaluate(`document.querySelectorAll('#analytics-preferences button')[${allow ? 1 : 0}].click()`);
  await waitFor(() => evaluate(`!document.getElementById("analytics-preferences")`), "Choice did not close settings.");
}

try {
  let listening = false;
  start(process.execPath, ["scripts/serve-pages.mjs"]).stdout.on("data", chunk => {
    if (chunk.toString().includes("Pages preview:")) listening = true;
  });
  await waitFor(() => listening, "Cannot start preview; port 3011 must be free.");
  start(chrome, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
    ...(process.env.CI ? ["--no-sandbox"] : []),
  ]);
  let port;
  await waitFor(async () => {
    const file = path.join(profile, "DevToolsActivePort");
    if (!existsSync(file)) return false;
    port = (await readFile(file, "utf8")).split("\n")[0];
    return !!port;
  }, "Browser did not start.");
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(page => page.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Fetch.requestPaused") void intercept(message.params).catch(error => failures.push(error));
    if (message.method === "Runtime.exceptionThrown") failures.push(new Error(JSON.stringify(message.params)));
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "warning") {
      warnings.push(message.params.args.map(argument => argument.value).join(" "));
    }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [
    { urlPattern: `${productionOrigin}/*` }, { urlPattern: `${collectorUrl}*` },
  ] });
  await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 900, deviceScaleFactor: 1, mobile: false });
  await go("/?email=never-send&utm_source=private-name");
  await waitFor(() => evaluate(`!!document.getElementById("analytics-preferences")`),
    "Build with GLINTLABS_PAGES_TELEMETRY=true before running telemetry browser checks.");
  assert.equal(events.length, 0, "Sent data before consent.");
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  const axe = await readFile(path.join(root, "node_modules/axe-core/axe.min.js"), "utf8");
  await evaluate(`${axe}\ntrue`);
  assert.deepEqual(await evaluate(`(async () => (await axe.run(
    document.querySelector('[aria-label="Analytics preferences"]'),
    {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations)()`), []);
  await choose(false);
  await go("/");
  await waitFor(() => evaluate(`!!document.querySelector('[aria-label="Analytics preferences"]')`), "Preferences not mounted.");
  assert.equal(await evaluate(`!!document.getElementById("analytics-preferences")`), false, "Rejection was not persisted.");
  assert.equal(events.length, 0);
  await settings();
  assert.equal(await evaluate("document.activeElement.textContent"), "Reject optional analytics", "Settings lost keyboard focus.");
  await choose(true);
  await waitFor(() => events.length === 1, "Grant did not send the current page view.");
  assert.equal(events[0].event, "page_view");
  assert.deepEqual(Object.keys(await evaluate(`JSON.parse(localStorage.getItem("glintlabs.analytics-consent.v1"))`)).sort(), ["choice", "expires"]);
  await evaluate(`(() => {
    const link = [...document.querySelectorAll("a[href]")].find(link =>
      new URL(link.href).pathname.replace(/\\/$/,"") === "/glintlabs/reports");
    if (!link) throw Error("Missing Reports navigation link");
    link.click();
  })()`);
  await waitFor(() => events.length === 2, "Client navigation did not send exactly one page view.");
  assert.equal(events[1].page_path, "/reports");
  await evaluate(`location.hash = "never-send-this-fragment"`);
  await pause();
  assert.equal(events.length, 2, "Hash-only navigation duplicated the page view.");
  await go("/tools/analyze-survey/");
  await waitFor(() => events.length === 3, "Consented reload did not track.");
  await evaluate(`(() => {
    const link = document.querySelector('a[href="https://github.com/microsoft/glintlabs/blob/main/skills/analyze-survey/SKILL.md"]');
    if (!link) throw Error("Missing skill link");
    link.addEventListener("click", event => event.preventDefault(), {once:true});
    link.click();
  })()`);
  await waitFor(() => events.length === 4, "Skill navigation was not classified.");
  assert.equal(events[3].event, "skill_link_click");
  await go("/");
  await waitFor(() => events.length === 5, "Home reload did not track.");
  rejecting = true;
  await evaluate(`document.querySelector('[data-glintlabs-event="analyze_survey_click"]').click()`);
  await waitFor(() => events.length === 6 && warnings.length > 0, "Collector failure was not diagnosed.");
  await waitFor(() => evaluate(`!!document.querySelector("dialog[open]")`), "Analytics failure blocked the Analyze Survey dialog.");
  assert.equal(events[5].event, "analyze_survey_click");
  await evaluate(`document.querySelector("dialog").dispatchEvent(new Event("cancel",{cancelable:true}))`);
  rejecting = false;
  await settings();
  await choose(false);
  await go("/about/");
  await waitFor(() => evaluate(`!!document.querySelector('[aria-label="Analytics preferences"]')`), "Revoked page did not load.");
  await pause();
  assert.equal(events.length, 6, "Withdrawal did not stop collection.");
  await settings();
  await choose(true);
  await waitFor(() => events.length === 7, "Re-grant did not track the current page.");
  const privacy = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: 'Object.defineProperty(navigator,"globalPrivacyControl",{get:()=>true});',
  });
  await go("/");
  await waitFor(() => evaluate(`!!document.querySelector('[aria-label="Analytics preferences"]')`), "Privacy page did not load.");
  await pause();
  assert.equal(events.length, 7, "GPC did not override persisted consent.");
  await settings();
  assert.equal(await evaluate(`document.querySelectorAll('#analytics-preferences button')[1].disabled`), true);
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: privacy.identifier });
  await go("/", local);
  await evaluate(`localStorage.setItem("glintlabs.analytics-consent.v1",JSON.stringify({
    choice:"granted",expires:Date.now()+86400000
  }))`);
  await go("/", local);
  await pause();
  assert.equal(await evaluate(`!!document.querySelector('[aria-label="Analytics preferences"]')`), false);
  assert.equal(events.length, 7, "Local preview sent telemetry.");
  assert.ok(!JSON.stringify(events).includes("never-send"));
  if (failures.length) throw failures[0];
  console.log("Telemetry browser checks passed: opt-in/reject persistence, withdrawal, navigation deduplication, real skill/tool clicks, GPC, local suppression, failure isolation, and 320px consent accessibility. All events intercepted; none sent to Supabase.");
} finally {
  stopping = true;
  socket?.close();
  for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error("Browser closed.")); }
  await Promise.all(children.map(child => new Promise(resolve => {
    if (child.exitCode !== null || !child.pid) { resolve(); return; }
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
    child.kill("SIGTERM");
  })));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
