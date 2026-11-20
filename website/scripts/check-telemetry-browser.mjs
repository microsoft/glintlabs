import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectorUrl, parseEvent, productionOrigin } from "../src/telemetry/contract.ts";
import { legacyConsentKeys, visitorKey } from "../src/telemetry/client.ts";

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
const clarityRequests = [];
const loadedDocuments = new Set();
const clarityExpected = process.env.GLINTLABS_PAGES_CLARITY === "true";
const telemetryExpected = process.env.GLINTLABS_PAGES_TELEMETRY !== "false";
let rejectClarity = false;
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
  if (request.url === "https://www.clarity.ms/tag/z4zyk0yyz7") {
    clarityRequests.push(request);
    await send("Fetch.fulfillRequest", {
      requestId, responseCode: rejectClarity ? 503 : 200,
      responseHeaders: [{ name: "Content-Type", value: "text/javascript" }],
      body: Buffer.from(rejectClarity ? "" : `(() => {
        const queued = window.clarity.q;
        window.__clarityCalls = [];
        window.clarity = (...args) => window.__clarityCalls.push(args);
        for (const args of queued) window.clarity(...args);
      })();`).toString("base64"),
    });
    return;
  }
  if (url.origin === local) {
    await send("Fetch.continueRequest", { requestId });
    return;
  }
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
  const { loaderId } = await send("Page.navigate", { url: url.href });
  await waitFor(() => loadedDocuments.has(loaderId), `Page did not finish loading: ${route}`);
  await waitFor(() => evaluate(`location.pathname === ${JSON.stringify(url.pathname)} &&
    document.readyState === "complete"`), `Page failed to load: ${route}`);
}

async function changePreference(key, choice) {
  await evaluate(`(() => {
    const key = ${JSON.stringify(key)};
    ${choice ? `localStorage.setItem(key,JSON.stringify({choice:${JSON.stringify(choice)},expires:Date.now()+86400000}));`
      : "localStorage.removeItem(key);"}
    window.dispatchEvent(new StorageEvent("storage",{key}));
  })()`);
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
    if (message.method === "Page.lifecycleEvent" && message.params.name === "load") loadedDocuments.add(message.params.loaderId);
    if (message.method === "Fetch.requestPaused") {
      void intercept(message.params).catch(error => failures.push(new Error(
        `Intercept failed: ${message.params.request.url}`,
        { cause: error },
      )));
    }
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
  await send("Page.setLifecycleEventsEnabled", { enabled: true });
  await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
  await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 900, deviceScaleFactor: 1, mobile: false });
  if (telemetryExpected) {
  await go("/?email=never-send&utm_source=private-name");
  await waitFor(() => events.length === 1,
    "Build with GLINTLABS_PAGES_TELEMETRY=true before running telemetry browser checks.");
  assert.equal(await evaluate(`!!document.getElementById("analytics-preferences") ||
    !!document.querySelector('[aria-label="Analytics preferences"],[aria-label="Site analytics"]')`),
    false, "A floating analytics widget or consent panel remains.");
  assert.equal(await evaluate(`document.querySelector("footer").textContent.includes("Public-site analytics run automatically")`),
    true, "The non-overlay footer disclosure is missing.");
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  const axe = await readFile(path.join(root, "node_modules/axe-core/axe.min.js"), "utf8");
  await evaluate(`${axe}\ntrue`);
  assert.deepEqual(await evaluate(`(async () => (await axe.run(
    document.querySelector("footer"),
    {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations)()`), []);
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  assert.equal(events[0].event, "page_view");
  assert.equal(events[0].v, 2);
  const firstBrowser = events[0].visitor_id;
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(visitorKey)})).id`), firstBrowser);
  for (const key of legacyConsentKeys) {
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(key)})`), null, "Fabricated a consent record.");
  }
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
  await waitFor(() => events.length === 3, "Automatic reload did not track.");
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
  assert.ok(events.slice(0, 6).every(event => event.visitor_id === firstBrowser), "ID changed across navigation or reload.");
  await evaluate(`document.querySelector("dialog").dispatchEvent(new Event("cancel",{cancelable:true}))`);
  rejecting = false;
  await changePreference(legacyConsentKeys[0], "denied");
  await waitFor(() => evaluate(`localStorage.getItem(${JSON.stringify(visitorKey)}) === null`), "Legacy refusal did not delete the browser ID.");
  await evaluate(`localStorage.setItem(${JSON.stringify(visitorKey)},"suppression-check")`);
  await go("/about/");
  await waitFor(() => evaluate(`localStorage.getItem(${JSON.stringify(visitorKey)}) === null`), "Legacy refusal did not stop the reloaded tracker.");
  await pause();
  assert.equal(events.length, 6, "Legacy refusal did not stop collection after reload.");
  await changePreference(legacyConsentKeys[1], "granted");
  await pause();
  assert.equal(events.length, 6, "A newer grant overrode an older active refusal.");
  await changePreference(legacyConsentKeys[0], null);
  await waitFor(() => events.length === 7, "Clearing a refusal did not resume tracking.");
  assert.notEqual(events[6].visitor_id, firstBrowser, "Reused a deleted browser ID.");
  await changePreference(legacyConsentKeys[1], "denied");
  await waitFor(() => evaluate(`localStorage.getItem(${JSON.stringify(visitorKey)}) === null`), "Version-2 refusal did not delete the ID.");
  await evaluate(`localStorage.setItem(${JSON.stringify(visitorKey)},"suppression-check")`);
  await go("/");
  await waitFor(() => evaluate(`localStorage.getItem(${JSON.stringify(visitorKey)}) === null`), "Version-2 refusal did not stop the reloaded tracker.");
  await pause();
  assert.equal(events.length, 7, "Version-2 refusal did not stop collection.");
  await changePreference(legacyConsentKeys[1], null);
  await waitFor(() => events.length === 8, "Clearing the second refusal did not resume tracking.");
  const privacy = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: 'Object.defineProperty(navigator,"globalPrivacyControl",{get:()=>true});',
  });
  await go("/");
  await waitFor(() => evaluate(`localStorage.getItem(${JSON.stringify(visitorKey)}) === null`), "GPC did not stop the reloaded tracker.");
  await pause();
  assert.equal(events.length, 8, "GPC did not stop automatic collection.");
  assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(visitorKey)})`), null, "GPC did not delete the browser ID.");
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: privacy.identifier });
  await evaluate(`localStorage.setItem(${JSON.stringify(visitorKey)},"suppression-check")`);
  const dnt = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: 'Object.defineProperty(navigator,"doNotTrack",{get:()=>"1"});',
  });
  await go("/about/");
  await waitFor(() => evaluate(`localStorage.getItem(${JSON.stringify(visitorKey)}) === null`), "DNT did not stop the reloaded tracker.");
  await pause();
  assert.equal(events.length, 8, "DNT did not stop automatic collection.");
  assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(visitorKey)})`), null);
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: dnt.identifier });
  const unavailable = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: 'Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Storage unavailable","SecurityError");}});',
  });
  await go("/");
  await waitFor(() => warnings.some(message => message.includes("Existing preferences unavailable")), "Unreadable preferences were not diagnosed.");
  assert.equal(events.length, 8, "Unreadable preferences bypassed a possible refusal.");
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: unavailable.identifier });
  const unwritable = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: 'Storage.prototype.setItem=function(){throw new DOMException("Storage full","QuotaExceededError");};',
  });
  await go("/about/");
  await waitFor(() => events.length === 9, "Anonymous event fallback did not run when ID saving failed.");
  assert.equal(events[8].v, 1);
  assert.equal(events[8].visitor_id, undefined);
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: unwritable.identifier });
  await go("/", local);
  await pause();
  assert.equal(await evaluate(`!!document.querySelector('[aria-label="Site analytics"]')`), false);
  assert.equal(events.length, 9, "Local preview sent telemetry.");
  assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(visitorKey)})`), null, "Local preview created a browser ID.");
  assert.ok(!JSON.stringify(events).includes("never-send"));
  }
  await go("/");
  await waitFor(() => evaluate('!!document.querySelector("footer")'), "Public footer did not render.");
  assert.equal(await evaluate('document.querySelectorAll("button[data-glintlabs-feedback]").length'), 2,
    "Analyze Survey needs thumbs up/down controls, without restoring a Knowledge Vault card.");
  const up = 'document.querySelector(\'button[data-glintlabs-feedback="tool_analyze_survey_thumbs_up"]\')';
  const down = 'document.querySelector(\'button[data-glintlabs-feedback="tool_analyze_survey_thumbs_down"]\')';
  const reasonForm = 'document.querySelector(\'[popover][role="dialog"]:popover-open form\')';
  const feedbackCalls = () => evaluate('(window.__clarityCalls ?? []).filter(args => args[0] === "event")');
  const expectFeedback = async names => {
    assert.deepEqual(await feedbackCalls(), clarityExpected ? names.map(name => ["event", name]) : []);
  };
  const confirmation = () => waitFor(() => evaluate(`!${reasonForm} &&
    document.querySelector("[popover]:popover-open")?.textContent === "Thanks for the feedback"`),
  "Feedback must show its text-only acknowledgment.");
  const pressEscape = async () => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await waitFor(() => evaluate('!document.querySelector("[popover]:popover-open")'), "Feedback did not dismiss.");
  };
  const clickAt = async selector => {
    const position = await evaluate(`(() => {
      const element = ${selector};
      element.scrollIntoView({block:"center",behavior:"instant"});
      const r = element.getBoundingClientRect();
      const x = r.x+r.width/2, y = r.y+r.height/2;
      if (!element.contains(document.elementFromPoint(x,y))) {
        throw Error("Feedback pointer target is obscured: " + JSON.stringify({
          selector:${JSON.stringify(selector)},x,y,hit:document.elementFromPoint(x,y)?.outerHTML.slice(0,200)
        }));
      }
      return {x,y};
    })()`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...position });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...position });
  };
  const expectedRatings = ["tool_analyze_survey_thumbs_up", "tool_analyze_survey_thumbs_down"];
  const expectedReasons = [
    ...expectedRatings, "tool_analyze_survey_thumbs_down_reason_not_useful",
    "tool_analyze_survey_thumbs_down_reason_hard_to_use",
  ];
  for (const width of [320, 390, 768, 1440]) {
    for (const route of ["/", "/tools/"]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await go(route);
      if (clarityExpected) await waitFor(() => evaluate("Array.isArray(window.__clarityCalls)"), "Clarity did not initialize.");
      assert.equal(await evaluate('document.querySelectorAll("button[data-glintlabs-feedback]").length'), 2);
      assert.equal(await evaluate('document.querySelectorAll(\'button[data-glintlabs-feedback*="knowledge_vault"]\').length'), 0);
      await clickAt(up);
      await confirmation();
      await expectFeedback([expectedRatings[0]]);
      assert.equal(await evaluate(`${up}.getAttribute("aria-pressed")`), "true");
      const placement = await evaluate(`(() => {
        const panel = document.querySelector("[popover]:popover-open");
        const r = panel.getBoundingClientRect(), anchor = ${up}.getBoundingClientRect();
        const centered = anchor.x + (anchor.width - r.width) / 2;
        const left = Math.max(16, Math.min(centered, innerWidth - 16 - r.width));
        return {fits:r.left >= 15 && r.right <= innerWidth-15, centered:Math.abs(r.left-left)<2,
          noIcon:!panel.querySelector("svg"), announced:document.querySelector('[role="status"]').textContent};
      })()`);
      assert.deepEqual(placement, { fits: true, centered: true, noIcon: true, announced: "Thanks for the feedback on Analyze Survey." });
      if (width === 320 && route === "/") {
        const start = Date.now();
        await waitFor(() => evaluate('!document.querySelector("[popover]:popover-open")'), "Acknowledgment did not auto-dismiss.");
        assert.ok(Date.now() - start >= 2500, "Acknowledgment disappeared too early.");
        assert.equal(await evaluate(`${up}.getAttribute("aria-pressed")`), "true");
      } else await pressEscape();
      await evaluate(`${up}.click()`);
      await confirmation();
      await expectFeedback([expectedRatings[0]]);
      await pressEscape();
      await evaluate(`${down}.focus()`);
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
      await waitFor(() => evaluate(`!!${reasonForm}`), "Keyboard activation did not open reasons.");
      await expectFeedback(expectedRatings);
      assert.equal(await evaluate(`${reasonForm}.querySelector("button[type=submit]").disabled`), true);
      await evaluate(`${reasonForm}.requestSubmit()`);
      assert.equal(await evaluate(`!!${reasonForm}`), true, "Empty submission must not acknowledge or close.");
      await clickAt(`${reasonForm}.querySelector("legend")`);
      assert.equal(await evaluate(`!!${reasonForm}`), true, "Internal text clicks must not dismiss reasons.");
      await clickAt(`${reasonForm}.querySelector("label")`);
      assert.equal(await evaluate(`${reasonForm}.querySelector('input[value="not_useful"]').checked`), true);
      await evaluate(`${reasonForm}.querySelector('input[value="not_useful"]').click()`);
      assert.equal(await evaluate(`${reasonForm}.querySelector("button[type=submit]").disabled`), true);
      await evaluate(`${reasonForm}.querySelector('input[value="not_useful"]').click();
        ${reasonForm}.querySelector('input[value="hard_to_use"]').click()`);
      await expectFeedback(expectedRatings);
      await evaluate(`(() => {
        const form = ${reasonForm};
        form.requestSubmit(); form.requestSubmit();
      })()`);
      await confirmation();
      await expectFeedback(expectedReasons);
      assert.equal(await evaluate(`document.activeElement === ${down}`), true);
      await pressEscape();
      await evaluate(`${down}.click()`);
      await waitFor(() => evaluate(`!!${reasonForm}`), "Selected thumb must reopen reasons.");
      await pressEscape();
      assert.equal(await evaluate(`document.activeElement === ${down}`), true);
      await expectFeedback(expectedReasons);
      await evaluate(`${down}.click()`);
      await waitFor(() => evaluate(`!!${reasonForm}`), "Reasons did not reopen.");
      await clickAt('document.querySelector("h2")');
      await waitFor(() => evaluate(`!${reasonForm}`), "Outside click did not dismiss reasons.");
      await evaluate(`${down}.click()`);
      await waitFor(() => evaluate(`!!${reasonForm}`), "Reasons did not reopen for accessibility check.");
      await evaluate(`${await readFile(path.join(root, "node_modules/axe-core/axe.min.js"), "utf8")}\ntrue`);
      assert.deepEqual(await evaluate(`(async () => (await axe.run(
        document.querySelector('[popover][role="dialog"]:popover-open'),
        {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations)()`), []);
      await pressEscape();
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, "Feedback caused horizontal overflow.");
    }
  }
  for (const [width, height] of [[320, 568], [1440, 480]]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width === 320 });
    await send("Emulation.setTouchEmulationEnabled", { enabled: true });
    await go("/tools/");
    if (clarityExpected) await waitFor(() => evaluate("Array.isArray(window.__clarityCalls)"), "Clarity did not initialize.");
    const point = await evaluate(`(() => {
      ${down}.scrollIntoView({block:"center",behavior:"instant"});
      const r=${down}.getBoundingClientRect();
      return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`);
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await waitFor(() => evaluate(`!!${reasonForm}`), "Touch did not open feedback.");
    assert.equal(await evaluate(`(() => {
      const r=${reasonForm}.parentElement.getBoundingClientRect();
      return r.left>=15 && r.right<=innerWidth-15 && r.top>=15 && r.bottom<=innerHeight-15;
    })()`), true, "Short-screen reasons must fit the viewport.");
    await evaluate(`${reasonForm}.querySelector('input[value="technical_issue"]').click()`);
    await clickAt(`${reasonForm}.querySelector("button[type=submit]")`);
    await confirmation();
    await expectFeedback([expectedRatings[1], "tool_analyze_survey_thumbs_down_reason_technical_issue"]);
    await pressEscape();
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  }
  if (clarityExpected) {
    await go("/tools/");
    await waitFor(() => evaluate("Array.isArray(window.__clarityCalls)"), "Clarity did not reload.");
    await evaluate(`${down}.click()`);
    await waitFor(() => evaluate(`!!${reasonForm}`), "Reason form did not open.");
    await evaluate(`document.dispatchEvent(new CustomEvent("glintlabs:tool-feedback-reasons",
      {detail:{tool:"knowledge-vault",reasons:["not_useful"]}}))`);
    await expectFeedback([expectedRatings[1]]);
    await evaluate(`${reasonForm}.querySelector('input[value="technical_issue"]').click();
      localStorage.setItem(${JSON.stringify(legacyConsentKeys[0])},JSON.stringify({choice:"denied",expires:Date.now()+86400000}));
      ${reasonForm}.requestSubmit()`);
    await confirmation();
    await expectFeedback([expectedRatings[1]]);
    assert.equal(await evaluate('window.__clarityCalls.some(args => args[0] === "stop")'), true,
      "Reason submission must recheck privacy.");
    await changePreference(legacyConsentKeys[0], null);
    await evaluate(`${up}.click()`);
    await confirmation();
    await expectFeedback([expectedRatings[1]]);
  }
  await send("Emulation.clearDeviceMetricsOverride");
  await go("/");
  await waitFor(() => evaluate('!!document.querySelector("footer")'), "Footer did not render after feedback checks.");
  if (clarityExpected) {
    await waitFor(() => evaluate("Array.isArray(window.__clarityCalls)"), "Build with GLINTLABS_PAGES_CLARITY=true.");
    assert.deepEqual(await evaluate("window.__clarityCalls"), [], "Clarity consent or custom identifiers were fabricated.");
    assert.equal(clarityRequests.at(-1).headers.Referer, undefined, "Tag request leaked the document URL.");
    assert.equal(await evaluate('document.querySelector("footer").textContent.includes("Microsoft Clarity")'), true);
    let before = clarityRequests.length;
    await evaluate(`(() => {
      const link = [...document.querySelectorAll("a[href]")].find(link =>
        new URL(link.href).pathname.replace(/\\/$/,"") === "/glintlabs/reports");
      link.click();
    })()`);
    await waitFor(() => evaluate('location.pathname.replace(/\\/$/,"") === "/glintlabs/reports"'), "SPA navigation failed.");
    await pause();
    assert.equal(clarityRequests.length, before, "SPA navigation loaded a duplicate Clarity tag.");
    assert.deepEqual(await evaluate("window.__clarityCalls"), [], "SPA navigation changed regional consent defaults.");
    await changePreference(legacyConsentKeys[0], "denied");
    await waitFor(() => evaluate('window.__clarityCalls.some(args => args[0] === "stop")'), "Clarity did not stop on refusal.");
    assert.equal(await evaluate('!!document.querySelector(\'script[src="https://www.clarity.ms/tag/z4zyk0yyz7"]\')'), false);
    await changePreference(legacyConsentKeys[0], null);
    await pause();
    assert.equal(clarityRequests.length, before, "Stopped Clarity restarted without a reload.");
    for (const source of [
      'Object.defineProperty(navigator,"globalPrivacyControl",{get:()=>true});',
      'Object.defineProperty(navigator,"doNotTrack",{get:()=>"1"});',
      `localStorage.setItem(${JSON.stringify(legacyConsentKeys[1])},JSON.stringify({choice:"denied",expires:Date.now()+86400000}));`,
      'Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Storage unavailable","SecurityError");}});',
    ]) {
      const blocked = await send("Page.addScriptToEvaluateOnNewDocument", { source });
      await go("/about/");
      await pause();
      assert.equal(clarityRequests.length, before, "Clarity bypassed a browser privacy signal or existing refusal.");
      await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: blocked.identifier });
    }
    await go("/about/");
    await changePreference(legacyConsentKeys[1], null);
    await waitFor(() => evaluate("Array.isArray(window.__clarityCalls)"), "Clarity did not load after clearing the refusal on a fresh page.");
    await go("/", local);
    await pause();
    before = clarityRequests.length;
    for (const route of ["/studio/", "/preview/private/", "/reports/unreviewed/"]) {
      await go(route);
      await pause();
      assert.equal(clarityRequests.length, before, "Clarity loaded on an unreviewed/private route.");
    }
    await go("/", local);
    await pause();
    assert.equal(clarityRequests.length, before, "Clarity loaded in a local preview.");
    await evaluate(`${up}.click()`);
    await confirmation();
    assert.equal(clarityRequests.length, before, "Local feedback bypassed the production-only guard.");
    rejectClarity = true;
    const eventCount = events.length;
    await go("/tools/");
    await waitFor(() => warnings.some(message => message.includes("Clarity unavailable")), "Clarity failure was not diagnosed.");
    await evaluate(`${up}.click()`);
    await confirmation();
    assert.deepEqual(await evaluate('window.clarity.q.filter(args => args[0] === "event")'), [],
      "Feedback must not queue events after the Clarity tag fails.");
    if (telemetryExpected) await waitFor(() => events.length > eventCount, "Clarity failure blocked Supabase.");
    assert.equal(await evaluate('!!document.querySelector(\'[data-glintlabs-event="analyze_survey_click"]\')'), true);
    assert.equal(await evaluate(`!!document.getElementById("analytics-preferences") ||
      !!document.querySelector('[aria-label="Analytics preferences"],[aria-label="Site analytics"]')`), false);
  } else {
    await pause();
    assert.equal(clarityRequests.length, 0, "Disabled build loaded Clarity.");
    assert.equal(await evaluate('document.querySelector("footer").textContent.includes("Microsoft Clarity")'), false);
  }
  if (!telemetryExpected) assert.equal(events.length, 0, "Disabled Supabase tracker sent events.");
  if (failures.length) throw failures[0];
  console.log(`Telemetry browser checks passed (Supabase=${telemetryExpected}, Clarity=${clarityExpected}): Analyze Survey feedback across 8 responsive states and 2 short touch viewports, keyboard/pointer behavior, axe, fixed events and repeat suppression, no consent UI, regional consent left to Clarity, production/route/privacy gates, lifecycle and failure isolation. All vendor requests intercepted; no test data sent to Supabase or Clarity. Vendor geolocation itself requires live regional verification.`);
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
