import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLaunchReports } from "../src/launch-reports/reports.ts";
import { isStagingReader, readerBasePath } from "./pages-config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const origin = `http://127.0.0.1:${process.env.PORT ?? 3011}`;
const prefix = readerBasePath();
const staging = isStagingReader();
const reports = getLaunchReports({ includePrivatePreview: false });
const toolsOnly = process.argv.includes("--tools-only");
const routes = toolsOnly ? ["/", "/tools", "/tools/analyze-survey"] : [
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
const toolModals = [];
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

async function checkFeedbackFlow() {
  const popover = '[popover][role="dialog"]:popover-open';
  for (const name of ["tool_knowledge_vault_thumbs_down", "tool_analyze_survey_thumbs_down"]) {
    const button = `document.querySelector('button[data-glintlabs-feedback="${name}"]')`;
    const overflow = await evaluate("[document.documentElement.style.overflow, document.body.style.overflow]");
    const closed = async (restoreFocus = true) => {
      await waitFor(() => evaluate(`!document.querySelector('${popover}') && ${button}.getAttribute("aria-expanded") === "false"`),
        "Dismissal must close the feedback popover and reset its trigger.");
      if (restoreFocus) {
        await waitFor(() => evaluate(`document.activeElement === ${button}`),
          "Escape or Submit must restore focus to the initiating thumb.");
      }
      assert.deepEqual(await evaluate("[document.documentElement.style.overflow, document.body.style.overflow]"), overflow,
        "Optional feedback must not lock page scrolling.");
      assert.equal(await evaluate(`${button}.getAttribute("aria-pressed")`), "true", "Dismissal must preserve the initial rating.");
    };
    const open = async () => {
      await evaluate(`${button}.scrollIntoView({block:"center",behavior:"instant"}); ${button}.focus(); ${button}.click()`);
      await waitFor(() => evaluate('!!document.querySelector("dialog[open] input, [popover]:popover-open input")'),
        "Thumbs down must offer preset reasons.");
      assert.equal(await evaluate('!!document.querySelector("dialog:modal")'), false,
        "Optional feedback must be a nonmodal popover, not a blocking dialog.");
      await waitFor(() => evaluate(`!!document.querySelector('${popover}')`), "Feedback popover must open.");
    };
    const anchored = () => evaluate(`(() => {
      const bounds = document.querySelector('${popover}').getBoundingClientRect();
      const target = ${button}.getBoundingClientRect();
      const edge = document.documentElement.clientWidth;
      const gap = Math.min(Math.abs(bounds.top - target.bottom - 8), Math.abs(target.top - bounds.bottom - 8));
      return bounds.left >= 15.5 && bounds.right <= edge - 15.5 &&
        bounds.top >= 15.5 && bounds.bottom <= innerHeight - 15.5 && gap <= 0.5 &&
        (Math.abs(bounds.right - target.right) <= 0.5 || bounds.left <= 16.5 || bounds.right >= edge - 16.5);
    })()`);
    await open();
    assert.equal(await evaluate(`document.querySelector('${popover} button[type=submit]').disabled`), true,
      "Submit must be disabled until at least one reason is selected.");
    for (const target of ["legend", null, "button[type=submit]"]) {
      await evaluate(`document.querySelector('${popover} input').focus()`);
      const point = await evaluate(`(() => {
        const panel = document.querySelector('${popover}');
        const element = ${target ? `panel.querySelector('${target}')` : "panel"};
        element.scrollIntoView({block:"nearest",inline:"nearest",behavior:"instant"});
        const bounds = element.getBoundingClientRect();
        return {x:bounds.x + ${target ? "bounds.width / 2" : "8"},
          y:bounds.y + ${target ? "bounds.height / 2" : "8"}};
      })()`);
      await send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
      assert.equal(await evaluate(`!!document.querySelector('${popover}')`), true,
        `Clicking ${target ?? "popover padding"} must keep feedback open.`);
    }
    for (const checked of [true, false]) {
      const point = await evaluate(`(() => {
        const label = document.querySelector('${popover} label');
        label.scrollIntoView({block:"nearest",inline:"nearest",behavior:"instant"});
        const bounds = label.getBoundingClientRect();
        return {x:bounds.x + bounds.width/2,y:bounds.y + bounds.height/2};
      })()`);
      await send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
      assert.equal(await evaluate(`!!document.querySelector('${popover}')`), true,
        "Clicking a reason label must keep feedback open.");
      assert.equal(await evaluate(`document.querySelector('${popover} input').checked`), checked,
        "Clicking a reason label must toggle its checkbox.");
    }
    await evaluate(`document.querySelector('${popover} input').focus()`);
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('${popover} button'), button => button.textContent)`),
      ["Submit"], "Lightweight feedback needs only its Submit action.");
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('${popover} label'), label => label.textContent)`),
      ["Not useful to me", "Hard to use", "Something didn't work"],
      "Feedback must offer only the three approved reasons.");
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('${popover} legend')).fontWeight`),
      "600", "The feedback question must use semibold.");
    const appearance = await evaluate(`(() => {
      const panel = document.querySelector('${popover}');
      const button = getComputedStyle(panel.querySelector("button[type=submit]"));
      const style = getComputedStyle(panel);
      const anchor = ${button}.getBoundingClientRect();
      return {color:button.color, background:button.backgroundColor,
        shadow:style.boxShadow, backdrop:getComputedStyle(panel,"::backdrop").backgroundColor,
        padding:style.padding, radius:style.borderRadius, buttonRadius:button.borderRadius,
        width:panel.getBoundingClientRect().width, height:panel.getBoundingClientRect().height,
        availableHeight:Math.max(anchor.top - 24, innerHeight - anchor.bottom - 24), touch:innerWidth <= 600,
        modal:panel.getAttribute("aria-modal"), controlled:${button}.getAttribute("aria-controls") === panel.id,
        heading:!!panel.querySelector("h2"), toolContext:panel.textContent.includes(" skill")};
    })()`);
    assert.equal(appearance.width, 232, "Feedback must match the new Figma popover width.");
    assert.ok(Math.abs(appearance.height - Math.min(appearance.touch ? 260 : 212, appearance.availableHeight)) <= 0.5,
      `Feedback must match Figma spacing, with larger touch targets and short-viewport containment: ${JSON.stringify(appearance)}`);
    assert.equal(appearance.padding, "20px");
    assert.equal(appearance.radius, "16px");
    assert.equal(appearance.buttonRadius, "12px");
    assert.equal(await evaluate(`getComputedStyle(${button}).color`), "rgb(0, 0, 0)",
      "The selected thumb must remain black while feedback is open.");
    assert.equal(await evaluate(`(() => {
      const button = ${button};
      const filled = button.querySelector('[class*="filledIcon"]');
      const regular = button.querySelector('[class*="regularIcon"]');
      return getComputedStyle(filled).display !== "none" && getComputedStyle(regular).display === "none";
    })()`), true, "The selected thumb must remain filled while feedback is open.");
    assert.equal(appearance.modal, "false");
    assert.equal(appearance.controlled, true, "The thumb must identify its controlled popover.");
    assert.equal(appearance.heading, false, "The redundant Share feedback heading must be removed.");
    assert.equal(appearance.toolContext, false, "The repeated tool-name panel must be removed.");
    assert.notEqual(appearance.color, appearance.background, "Submit text must not disappear against its background.");
    assert.notEqual(appearance.shadow, "none", "Feedback must retain themed popover elevation.");
    assert.equal(appearance.backdrop, "rgba(0, 0, 0, 0)", "Optional feedback must not dim the page.");
    assert.deepEqual(await evaluate("[document.documentElement.style.overflow, document.body.style.overflow]"), overflow);
    await waitFor(anchored, "Feedback must anchor to its thumb, flip vertically, and stay inside the viewport.");
    if (await evaluate("innerWidth === 1440")) {
      const top = await evaluate(`${button}.getBoundingClientRect().top`);
      await evaluate("window.scrollBy({top:24,behavior:'instant'})");
      await waitFor(async () => Math.abs(await evaluate(`${button}.getBoundingClientRect().top`) - top) > 20,
        "The page must remain scrollable while reasons are open.");
      await waitFor(anchored, "Feedback must follow its thumb when the page scrolls.");
      const height = await evaluate("innerHeight");
      await send("Emulation.setDeviceMetricsOverride", { width: 1280, height, deviceScaleFactor: 1, mobile: false });
      await waitFor(anchored, "Feedback must stay attached when the viewport resizes.");
      await send("Emulation.setDeviceMetricsOverride", { width: 1440, height, deviceScaleFactor: 1, mobile: false });
      await waitFor(anchored, "Feedback must reanchor after restoring the viewport.");
    }
    assert.equal(await evaluate(`!!document.querySelector('${popover} textarea, ${popover} input:not([type=checkbox])')`), false,
      "Clarity-only feedback must not collect comments or attachments.");
    assert.equal(await evaluate(`document.activeElement === document.querySelector('${popover} input')`), true,
      "Reasons must receive initial keyboard focus.");
    await key("Tab", "Tab", 9);
    await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: 8 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: 8 });
    await key(" ", "Space", 32, " ");
    assert.equal(await evaluate(`document.querySelector('${popover} button[type=submit]').disabled`), false,
      "Selecting a reason must enable Submit.");
    await key(" ", "Space", 32, " ");
    assert.equal(await evaluate(`document.querySelector('${popover} button[type=submit]').disabled`), true,
      "Clearing the last checked reason must disable Submit again.");
    await evaluate(`document.querySelector('${popover} form').requestSubmit()`);
    assert.equal(await evaluate(`!!document.querySelector('${popover}')`), true,
      "An empty submission must not close feedback or show a submitted confirmation.");
    await key(" ", "Space", 32, " ");
    await evaluate(`document.querySelector('${popover} input[value="hard_to_use"]').click()`);
    assert.equal(await evaluate(`document.querySelectorAll('${popover} input:checked').length`), 2,
      "Reasons must support multiple choices and keyboard selection.");
    assert.equal(await evaluate(`(() => {
      const focused = document.activeElement;
      const indicator = getComputedStyle(focused.closest(".fui-Checkbox"), "::after");
      return parseFloat(indicator.borderTopWidth) >= 2 && indicator.borderTopStyle === "solid";
    })()`), true, "Keyboard selection must keep the Fluent checkbox focus indicator.");
    await evaluate(`(async () => {
      const submit = document.querySelector('${popover} button[type=submit]');
      getComputedStyle(submit).backgroundColor;
      await Promise.all(submit.getAnimations().map(animation => animation.finished.catch(() => {})));
    })()`);
    assert.deepEqual(await evaluate(`(async () => (await axe.run(document.querySelector('${popover}'),
      {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations)()`), []);
    await evaluate(`document.querySelector('${popover} button[type=submit]').focus()`);
    await key("Enter", "Enter", 13, "\r");
    await checkFeedbackSubmitted();
    await closed();
    await open();
    assert.equal(await evaluate(`document.querySelectorAll('${popover} input:checked').length`), 0,
      "A new reason submission must start with no stale choices.");
    await key("Escape", "Escape", 27);
    await closed();
    await open();
    await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: 8 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: 8 });
    await closed();
    await open();
    await evaluate(`document.querySelector('${popover} input').click()`);
    await evaluate(`document.querySelector('${popover} button[type=submit]').focus()`);
    await key("Tab", "Tab", 9);
    await closed(false);
    assert.equal(await evaluate(`document.activeElement === ${button}`), false,
      "Tab must continue into the page rather than trapping or returning focus.");
    await open();
    const outside = await evaluate(`(() => {
      const outside = document.createElement("button");
      outside.id = "feedback-outside-test";
      outside.textContent = "Outside feedback";
      outside.style.cssText = "position:fixed;left:16px;top:16px;z-index:1000";
      document.body.append(outside);
      const bounds = outside.getBoundingClientRect();
      return {x:bounds.x + bounds.width/2,y:bounds.y + bounds.height/2};
    })()`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", ...outside, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...outside, button: "left", clickCount: 1 });
    await closed(false);
    assert.equal(await evaluate('document.activeElement?.id'), "feedback-outside-test",
      "Click-outside dismissal must not steal focus from the clicked control.");
    await evaluate('document.getElementById("feedback-outside-test").remove()');
  }
}

async function checkFeedbackSubmitted() {
  await waitFor(() => evaluate('document.querySelector("[popover]:popover-open")?.textContent === "Thanks for the feedback"'),
    "Feedback must show the compact Thanks for the feedback confirmation.");
  assert.equal(await evaluate('!!document.querySelector("dialog[open]")'), false,
    "Submitted feedback must not open another modal.");
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('[role="status"]'))
    .some(status => status.textContent.startsWith("Thanks for the feedback on "))`), true,
    "Submitted feedback must have a polite screen-reader status.");
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('button[data-glintlabs-feedback][aria-pressed="true"]'))
    .every(button => {
      const style = getComputedStyle(button);
      return style.boxShadow === "none" && style.borderTopWidth === "0px";
    })`), true, "Selected thumbs must not have a persistent outline.");
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('button[data-glintlabs-feedback][aria-pressed="true"]'))
    .every(button => getComputedStyle(button).color === "rgb(0, 0, 0)")`), true,
    "Selected thumbs must use the site's black ink, not its blue accent.");
  const appearance = await evaluate(`(() => {
    const confirmation = document.querySelector("[popover]:popover-open");
    const bounds = confirmation.getBoundingClientRect();
    const style = getComputedStyle(confirmation);
    const thumb = confirmation.closest('[role="group"]').querySelector('button[aria-pressed="true"]');
    const anchor = thumb.getBoundingClientRect();
    return {width:bounds.width,height:bounds.height,radius:style.borderRadius,
      icons:confirmation.querySelectorAll("svg").length,font:style.fontSize,lineHeight:style.lineHeight,
      weight:style.fontWeight,padding:[style.paddingTop,style.paddingRight,style.paddingBottom,style.paddingLeft],
      anchorGap:Math.min(Math.abs(bounds.top - anchor.bottom - 8), Math.abs(anchor.top - bounds.bottom - 8)),
      centerDelta:bounds.left + bounds.width/2 - (anchor.left + anchor.width/2),
      left:bounds.left,right:bounds.right,viewport:document.documentElement.clientWidth,
      filled:getComputedStyle(thumb.querySelector('[class*="filledIcon"]')).display !== "none" &&
        getComputedStyle(thumb.querySelector('[class*="regularIcon"]')).display === "none",
      visible:bounds.left >= 15.5 && bounds.right <= document.documentElement.clientWidth - 15.5 &&
        bounds.top >= 15.5 && bounds.bottom <= innerHeight - 15.5,
      background:style.backgroundColor,shadow:style.boxShadow};
  })()`);
  assert.deepEqual([appearance.height, appearance.radius, appearance.icons,
    appearance.font, appearance.lineHeight, appearance.weight, ...appearance.padding],
  [46, "16px", 0, "14px", "20px", "400", "12px", "16px", "12px", "16px"],
  "The acknowledgment must be compact, text-only and regular weight.");
  assert.equal(appearance.visible, true);
  assert.ok(appearance.anchorGap <= 0.5 && (Math.abs(appearance.centerDelta) <= 0.5 ||
    (appearance.left <= 16.5 && appearance.centerDelta >= 0) ||
    (appearance.right >= appearance.viewport - 16.5 && appearance.centerDelta <= 0)),
  "The acknowledgment must center beneath its selected thumb, shifting or flipping only to stay in the viewport.");
  assert.equal(appearance.filled, true, "The selected thumb must remain filled during confirmation.");
  assert.equal(appearance.background, "rgb(255, 255, 255)", "Confirmation must inherit its Fluent theme.");
  assert.notEqual(appearance.shadow, "none");
}

async function checkFeedbackHover() {
  for (let index = 0; index < 4; index++) {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
    const before = await evaluate(`(() => {
      const button = document.querySelectorAll("button[data-glintlabs-feedback]")[${index}];
      button.scrollIntoView({ block: "center", behavior: "instant" });
      const bounds = button.getBoundingClientRect();
      button.addEventListener("pointerenter", () => {
        const tooltip = document.getElementById(button.getAttribute("aria-describedby"));
        const started = performance.now();
        window.__feedbackHoverDelay = null;
        const measure = () => {
          if (!tooltip.hidden && getComputedStyle(tooltip).visibility === "visible") {
            window.__feedbackHoverDelay = performance.now() - started;
          } else if (performance.now() - started < 2000) {
            requestAnimationFrame(measure);
          }
        };
        measure();
      }, { once: true });
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2,
        path: button.querySelector("svg path").getAttribute("d") };
    })()`);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: before.x, y: before.y });
    await waitFor(() => evaluate('Number.isFinite(window.__feedbackHoverDelay)'),
      "Feedback tooltip must appear after a short hover delay.");
    const delay = await evaluate('window.__feedbackHoverDelay');
    assert(delay >= 250 && delay < 1000, `Feedback tooltip must wait about 300ms, not ${delay}ms.`);
    const tooltip = await evaluate(`(() => {
      const button = document.querySelectorAll("button[data-glintlabs-feedback]")[${index}];
      const tooltip = document.getElementById(button.getAttribute("aria-describedby"));
      if (!tooltip || tooltip.getAttribute("role") !== "tooltip" ||
          !tooltip.getClientRects().length || getComputedStyle(tooltip).visibility !== "visible") {
        throw Error("Feedback hover must expose its accessible custom tooltip");
      }
      const style = getComputedStyle(tooltip);
      const bounds = tooltip.getBoundingClientRect();
      const card = button.closest("article").getBoundingClientRect();
      const target = button.getBoundingClientRect();
      const icons = [...button.querySelectorAll("svg")].filter(svg => svg.getBoundingClientRect().width);
      if (icons.length !== 1) throw Error("Feedback hover must show exactly one thumb glyph");
      const icon = icons[0];
      return {
        text: tooltip.textContent, background: style.backgroundColor,
        font: style.fontSize, lineHeight: style.lineHeight, radius: style.borderRadius, shadow: style.boxShadow,
        padding: [style.paddingTop, style.paddingRight],
        highlight: getComputedStyle(button, "::before").backgroundColor,
        path: icon.querySelector("path").getAttribute("d"),
        selected: button.getAttribute("aria-pressed"), nativeTitle: button.hasAttribute("title"),
        centerDelta: bounds.x + bounds.width / 2 - (target.x + target.width / 2),
        below: bounds.top >= target.bottom,
        contained: bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth &&
          [bounds.left + 1, bounds.right - 1].every(x =>
            tooltip.contains(document.elementFromPoint(x, bounds.y + bounds.height / 2))),
        geometry: { tooltip: bounds.toJSON(), card: card.toJSON(), viewport: innerWidth },
        x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2,
        bridgeX: target.x + target.width / 2,
        bridgeY: bounds.top < target.top ? target.top - 2 : target.bottom + 2,
      };
    })()`);
    assert.equal(tooltip.text, index % 2 ? "I don't like this tool" : "I like this tool");
    assert.equal(tooltip.background, "rgb(252, 253, 255)");
    assert.deepEqual([tooltip.font, tooltip.lineHeight, tooltip.radius, ...tooltip.padding],
      ["12px", "16px", "8px", "8px", "12px"]);
    assert.equal(tooltip.shadow,
      "rgba(0, 0, 0, 0.12) 0px 0px 2px 0px, rgba(0, 0, 0, 0.14) 0px 2px 4px 0px",
      "Feedback tooltips must use the slightly raised shadow4 elevation.");
    assert.equal(tooltip.highlight, "rgb(243, 243, 243)");
    assert.notEqual(tooltip.path, before.path, "Hover must switch the outline to the filled thumb.");
    assert.equal(tooltip.selected, "false", "Hover must not submit or select a rating.");
    assert.equal(tooltip.nativeTitle, false, "Do not show a second native tooltip.");
    if (index % 2) {
      assert(Math.abs(tooltip.centerDelta) <= 0.5,
        `Thumbs-down tooltip must be centered on its icon, not shifted ${tooltip.centerDelta}px.`);
      assert(tooltip.below, "The thumbs-down tooltip must appear below its icon.");
    }
    assert(tooltip.contained, `Feedback tooltip ${index} must not be clipped: ${JSON.stringify(tooltip.geometry)}`);
    const visible = `(() => {
      const button = document.querySelectorAll("button[data-glintlabs-feedback]")[${index}];
      const tooltip = document.getElementById(button.getAttribute("aria-describedby"));
      return !!tooltip.getClientRects().length && getComputedStyle(tooltip).visibility === "visible";
    })()`;
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: tooltip.bridgeX, y: tooltip.bridgeY });
    assert.equal(await evaluate(visible), true, "The pointer must cross the tooltip gap without dismissal.");
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: tooltip.x, y: tooltip.y });
    assert.equal(await evaluate(visible), true, "The tooltip must remain open when hovered.");
    await key("Escape", "Escape", 27);
    await waitFor(async () => !(await evaluate(visible)), "Escape must dismiss a hovered tooltip without moving focus.");
  }
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('[role="tooltip"]'))
    .every(tooltip => tooltip.hidden || getComputedStyle(tooltip).visibility === "hidden")`), true,
    "Feedback tooltips must hide immediately when the pointer leaves.");
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
  console.log(`Reader browser scope: ${toolsOnly ? "Tools interactions and shared catalog" : "all reader routes"}`);
  preview = start(process.execPath, ["scripts/serve-pages.mjs"]);
  preview.stdout.on("data", (chunk) => {
    if (chunk.toString().includes("Pages preview:")) listening = true;
  });
  await waitFor(() => listening, `Cannot start the reader preview; ${origin} must be free.`);
  browser = start(chromePath, [
    "--headless=new", "--disable-gpu", "--disable-dev-shm-usage",
    "--no-proxy-server", "--host-resolver-rules=MAP glintlabs-production.test 127.0.0.1",
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
  assert.equal(sourceImages, 38);
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
      if (staging) {
        await waitFor(() => evaluate('document.querySelector("[data-glintlabs-environment]")?.textContent === "Staging"'),
          `Missing staging badge: ${width}px ${route}`);
        await evaluate(`(() => {
          const badge = document.querySelector("[data-glintlabs-environment]");
          const style = getComputedStyle(badge);
          const rect = badge.getBoundingClientRect();
          if (style.position !== "fixed" || style.pointerEvents !== "none" || rect.left < 0 ||
              rect.bottom > innerHeight || rect.width > innerWidth) throw Error("Staging badge obstructs the reader");
        })()`);
        assert.deepEqual(await evaluate(`(async () => (await axe.run(document.querySelector("[data-glintlabs-environment]"),
          {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations)()`), []);
      } else {
        assert.equal(await evaluate('document.querySelector("[data-glintlabs-environment]")'), null);
      }
      if (route === "/" || route === "/tools") {
        assert.deepEqual(await evaluate(`(() => {
          const cards = [...document.querySelectorAll('[aria-labelledby="tools-library-title"] article')];
          return cards.map(card => {
            const content = card.querySelector('[class*="cardContent"]');
            const padding = getComputedStyle(content);
            const bounds = content.getBoundingClientRect();
            return {
              title: card.querySelector("h3").textContent,
              vertical: padding.paddingTop,
              bottom: padding.paddingBottom,
              left: padding.paddingLeft,
              right: padding.paddingRight,
              topInset: Math.round(content.firstElementChild.getBoundingClientRect().top - bounds.top),
              bottomInset: Math.round(bounds.bottom - content.lastElementChild.getBoundingClientRect().bottom),
            };
          });
        })()`), ["People Science Knowledge Vault", "Analyze Survey"].map(title => ({
          title,
          vertical: width <= 600 ? "24px" : "40px",
          bottom: width <= 600 ? "24px" : "40px",
          left: width <= 1100 ? "24px" : "40px",
          right: width <= 1100 ? "24px" : "40px",
          topInset: width <= 600 ? 24 : 40,
          bottomInset: width <= 600 ? 24 : 40,
        })), "Tool card order and padding must match the updated design.");
        await evaluate(`(() => {
          const buttons = [...document.querySelectorAll("button[data-glintlabs-feedback]")];
          if (buttons.length !== 4) throw Error("Both tool cards need thumbs up/down");
          for (const button of buttons) {
            const rect = button.getBoundingClientRect();
            const icons = [...button.querySelectorAll("svg")].filter(svg => svg.getBoundingClientRect().width);
            if (icons.length !== 1) throw Error("Feedback must show exactly one thumb glyph");
            const icon = icons[0].getBoundingClientRect();
            const minimum = innerWidth <= 600 ? 44 : 40;
            if (rect.width < minimum || rect.height < minimum || icon.width !== 20 || icon.height !== 20 ||
                !button.getAttribute("aria-label") || button.getAttribute("aria-pressed") !== "false") {
              throw Error("Feedback size, labels, icons or initial selection changed");
            }
          }
        })()`);
        await checkFeedbackHover();
        await key("Tab", "Tab", 9);
        await evaluate('document.querySelector("button[data-glintlabs-feedback]").focus()');
        await waitFor(() => evaluate(`(() => {
          const button = document.querySelector("button[data-glintlabs-feedback]");
          const tooltip = document.getElementById(button.getAttribute("aria-describedby"));
          return !!tooltip?.getClientRects().length && getComputedStyle(tooltip).visibility === "visible";
        })()`), "Keyboard focus must expose the feedback tooltip.");
        await key("Escape", "Escape", 27);
        await waitFor(() => evaluate(`(() => {
          const button = document.querySelector("button[data-glintlabs-feedback]");
          const tooltip = document.getElementById(button.getAttribute("aria-describedby"));
          return document.activeElement === button && !tooltip.getClientRects().length;
        })()`), "Escape must dismiss the focused tooltip without blurring the button.");
        await key("Enter", "Enter", 13, "\r");
        await waitFor(() => evaluate('document.querySelector("button[data-glintlabs-feedback]").getAttribute("aria-pressed") === "true"'),
          "Feedback is not keyboard accessible");
        const feedbackStarted = await evaluate("performance.now()");
        await checkFeedbackSubmitted();
        assert.deepEqual(await evaluate(`(async () => (await axe.run(document.querySelector('[role="group"][aria-label^="Feedback on"]'),
          {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations)()`), []);
        assert.equal(await evaluate('document.activeElement === document.querySelector("button[data-glintlabs-feedback]")'), true,
          "The submitted confirmation must not steal focus from its thumb.");
        if (route === "/tools" && width === 390) {
          await waitFor(() => evaluate('!document.querySelector("[popover]:popover-open")'),
            "The submitted confirmation must dismiss automatically.");
          const elapsed = await evaluate("performance.now()") - feedbackStarted;
          assert.ok(elapsed >= 2700 && elapsed < 4500,
            `Submitted feedback must dismiss after about three seconds, not ${elapsed}ms.`);
          assert.equal(await evaluate('document.querySelector("button[data-glintlabs-feedback]").getAttribute("aria-pressed")'),
            "true", "The thumb must stay selected after the confirmation disappears.");
          assert.equal(await evaluate('document.activeElement === document.querySelector("button[data-glintlabs-feedback]")'), true,
            "Automatic dismissal must preserve keyboard focus.");
          await key("Enter", "Enter", 13, "\r");
          await checkFeedbackSubmitted();
        }
        await key("Escape", "Escape", 27);
        await waitFor(() => evaluate('!document.querySelector("[popover]:popover-open")'),
          "Escape must dismiss the anchored confirmation.");
        await send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
        await evaluate(`(() => {
          const button = document.querySelector("button[data-glintlabs-feedback]");
          button.blur();
          button.focus();
        })()`);
        await waitFor(() => evaluate(`(() => {
          const button = document.querySelector("button[data-glintlabs-feedback]");
          const tooltip = document.getElementById(button.getAttribute("aria-describedby"));
          const bounds = tooltip.getBoundingClientRect();
          return !!tooltip.getClientRects().length && getComputedStyle(tooltip).visibility === "visible" &&
            getComputedStyle(tooltip).outlineWidth === "1px" &&
            bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth &&
            [bounds.left + 1, bounds.right - 1].every(x =>
              tooltip.contains(document.elementFromPoint(x, bounds.y + bounds.height / 2)));
        })()`), "Forced-colors tooltips must remain visible and unclipped.");
        assert.equal(await evaluate('getComputedStyle(document.querySelector("button[data-glintlabs-feedback]")).outlineWidth'),
          "3px", "A selected thumb must keep its visible keyboard focus in forced colors.");
        assert.equal(await evaluate('getComputedStyle(document.querySelector("button[data-glintlabs-feedback]")).borderTopWidth'),
          "0px", "Selected thumbs must not gain a border in forced colors.");
        assert.equal(await evaluate(`Array.from(document.querySelector("button[data-glintlabs-feedback]").querySelectorAll("svg"))
          .filter(icon => getComputedStyle(icon).display !== "none").map(icon => icon.className.baseVal.includes("filledIcon"))[0]`),
          true, "The filled thumb must identify selection in forced colors.");
        await send("Emulation.setEmulatedMedia", { features: [] });
        if (route === "/tools" && width === 390) {
          const position = await evaluate(`(() => {
            const button = document.querySelector("button[data-glintlabs-feedback]");
            const bounds = button.getBoundingClientRect();
            return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
          })()`);
          await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...position });
          await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
          await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...position, id: 1 }] });
          await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          await waitFor(() => evaluate(`(() => {
            const button = document.querySelector("button[data-glintlabs-feedback]");
            const tooltip = document.getElementById(button.getAttribute("aria-describedby"));
            return button.getAttribute("aria-pressed") === "true" && !tooltip.getClientRects().length;
          })()`), "Touch must keep the selection without leaving a hover tooltip open.");
          await checkFeedbackSubmitted();
          await send("Emulation.setTouchEmulationEnabled", { enabled: false });
          for (const name of ["tool_analyze_survey_thumbs_up", "tool_knowledge_vault_thumbs_up"]) {
            await evaluate(`document.querySelector('button[data-glintlabs-feedback="${name}"]').click()`);
            await checkFeedbackSubmitted();
            assert.equal(await evaluate('document.querySelectorAll("[popover]:popover-open").length'), 1,
              "Tool confirmations must not overlap.");
            await waitFor(() => evaluate(`document.querySelector('button[data-glintlabs-feedback="${name}"]')
              .closest('[role="group"]').querySelector("[popover]")?.matches(":popover-open")`),
            "Returning to a previous tool must show its confirmation again.");
          }
        }
        await checkFeedbackFlow();
        assert.deepEqual(await evaluate(`(async () => (await axe.run(
          document.querySelector('[aria-labelledby="tools-library-title"]'),
          {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations)()`), []);
        await checkToolsModals();
      }
      if (route === "/" || route === "/reports") {
        await evaluate(`(async () => {
          const base = ${JSON.stringify(prefix)};
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
            const badge = card.querySelector('[class*="cardBadges"] [class*="badge"]');
            if (report.category === "research-drop" && (!badge?.querySelector('svg[aria-hidden="true"]') || badge.querySelector("img"))) throw Error("Research Drop retained a calendar icon");
            const image = card.querySelector('img[src^="' + base + '/figma/illustrations/blue/"]');
            if (!image || image.getAttribute("src") !== base + report.thumbnail.src || image.alt !== report.thumbnail.alt) throw Error("Wrong card illustration");
            const rect = image.getBoundingClientRect();
            if (rect.width !== 128 || rect.height !== 128 || getComputedStyle(image).objectFit !== "contain") throw Error("Illustration crop changed");
            if (new URL(card.querySelector("a").href).pathname.replace(/\\/$/, "") !== base + report.href) throw Error("Card link escaped Pages prefix");
            const audit = await axe.run(card, {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}});
            if (audit.violations.length) throw Error(JSON.stringify(audit.violations));
          }
        })()`);
      }
      const report = reports.find((report) => route === `/reports/${report.slug}`);
      if (report) {
        await evaluate(`(() => {
          const base = ${JSON.stringify(prefix)};
          const report = ${JSON.stringify({
            title: report.catalog.title,
            tables: report.manifest.blocks.filter(block => block.type === "data-visual-source" && report.rowHeaderTableBlockIds.has(block.id)).map(block => ({
              id: block.id, rows: [block.data.columns, ...block.data.rows.map(row => row.cells)],
            })),
            ids: [...report.referenceBlockIds],
            orderedIds: [...report.orderedListBlockIds],
            textBlocks: report.manifest.blocks.filter(block => "text" in block && !(block.type === "heading" && block.level === 1)),
            figures: report.manifest.blocks.filter(block => block.type === "image" && block.placement !== "hero").map(block => ({
              id: block.id, description: report.descriptions[block.id],
            })),
            briefId: report.manifest.blocks.find(block => block.type === "heading" && /^Research Drop in Brief:?$/i.test(block.text))?.id,
            hero: report.manifest.blocks.find((block) => block.type === "image" && block.placement === "hero").dataUrl,
          })};
          if (document.querySelector("h1")?.textContent !== report.title || document.title !== report.title + " | Glint Labs") throw Error("Inconsistent report title");
          for (const table of report.tables) {
            const target = document.getElementById("report-block-" + table.id);
            const rows = [...target.querySelectorAll("tbody tr")].map(row => [...row.cells].map(cell => cell.textContent));
            if (JSON.stringify(rows) !== JSON.stringify(table.rows) || target.querySelectorAll('th[scope="row"]').length !== table.rows.length) throw Error("Lost source table rows or row-header semantics");
          }
          if (!document.querySelector('header img[src="' + base + report.hero + '"]')) throw Error("Original hero was replaced");
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
        for (const id of report.rowHeaderTableBlockIds) {
          const region = `document.getElementById("report-block-${id}").querySelector('[role="region"]')`;
          const scrollable = await evaluate(`(() => {
            const region = ${region};
            if (region.tabIndex !== 0 || !region.getAttribute("aria-label")) throw Error("Source table is not keyboard accessible");
            region.scrollIntoView({block:"center"}); region.scrollLeft = 0; region.focus();
            return region.scrollWidth > region.clientWidth;
          })()`);
          assert.deepEqual(await evaluate(`(async () =>
            (await axe.run(${region}, {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations)()`), []);
          if (scrollable) {
            await key("ArrowRight", "ArrowRight", 39);
            await waitFor(() => evaluate(`${region}.scrollLeft > 0`), "Source table does not scroll with the keyboard");
          }
        }
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
  for (const viewport of [{ width: 320, height: 568 }, { width: 1440, height: 480 }]) {
    await send("Emulation.setDeviceMetricsOverride", { ...viewport, deviceScaleFactor: 1, mobile: false });
    await evaluate("window.__readerPending = true");
    await send("Page.navigate", { url: `${origin}${prefix}/tools/` });
    await waitFor(() => evaluate('window.__readerPending !== true && document.readyState === "complete"'), "Short viewport navigation");
    await evaluate(`${axe}\ntrue`);
    await checkFeedbackFlow();
    await checkToolsModals();
    console.log(`Verified Tools modals at ${viewport.width}x${viewport.height}`);
  }
  if (staging) {
    await evaluate("window.__readerPending = true");
    const otherOrigin = origin.replace("127.0.0.1", "glintlabs-production.test");
    await send("Page.navigate", { url: `${otherOrigin}/tools/` });
    await waitFor(() => evaluate('window.__readerPending !== true && location.hostname === "glintlabs-production.test" && document.readyState === "complete"'),
      "Cannot test the staging badge hostname guard.");
    await evaluate(`(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (document.querySelector("[data-glintlabs-environment]")) throw Error("Staging badge appeared on a non-staging hostname");
    })()`);
  }
  assert.deepEqual(errors, [], "Browser runtime, console, network, or HTTP errors.");
  if (failures.length) throw failures[0];
  const result = { states, toolModals, navigation, exposure, sourceImages, privateRoutesAbsent: true, release, errors };
  await mkdir(path.join(root, "test-results"), { recursive: true });
  await writeFile(path.join(root, "test-results/reader-browser.json"), JSON.stringify(result, null, 2));
  console.log(`Reader browser checks passed: ${states.length} responsive states, ${toolModals.length} tool-modal checks, ${navigation.length} navigation states, ${exposure.length * 3} exposure grids, ${sourceImages} original images.`);
} finally {
  stopping = true;
  socket?.close();
  await Promise.all([stop(browser), stop(preview)]);
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}

async function checkToolsModals() {
  const tools = [
    {
      title: "Analyze Survey",
      skillUrl: "https://github.com/microsoft/glintlabs/blob/main/skills/analyze-survey/SKILL.md",
      prompt: "I want to analyze employee survey data.",
    },
    {
      title: "People Science Knowledge Vault",
      skillUrl: "https://github.com/microsoft/glintlabs/blob/main/skills/people-science-knowledge-vault/SKILL.md",
      prompt: "Use People Science Knowledge Vault to explore what research says about manager effectiveness. Include sources and questions to consider next.",
    },
  ];
  for (const tool of tools) {
    await evaluate(`(() => {
      const title = ${JSON.stringify(tool.title)};
      const card = [...document.querySelectorAll("article")].find(card => card.querySelector("h3")?.textContent === title);
      if (!card) throw Error("Missing tool card: " + title);
      const trigger = [...card.querySelectorAll("button")].find(button => button.textContent === "Start using");
      if (!trigger) throw Error("Missing tool action: " + title);
      if (card.querySelectorAll("button[data-glintlabs-feedback]").length !== 2) throw Error("Missing tool feedback: " + title);
      window.__toolsTrigger = trigger;
      trigger.scrollIntoView({block:"center"});
      trigger.focus();
    })()`);
    await key("Enter", "Enter", 13, "\r");
    const dialog = `document.querySelector('dialog[open]')`;
    await waitFor(() => evaluate(`${dialog}?.getAttribute("aria-label") === ${JSON.stringify(`${tool.title} details`)}`),
      `Missing tool dialog: ${tool.title}`);
    await evaluate(`(() => {
      const dialog = ${dialog};
      const close = dialog.querySelector("button");
      if (document.activeElement !== close || close.getAttribute("aria-label") !== ${JSON.stringify(`Close ${tool.title} details`)}) throw Error("Dialog initial focus or close label");
      if (dialog.querySelector("h1")?.textContent !== ${JSON.stringify(tool.title)}) throw Error("Wrong tool content");
      const bounds = dialog.getBoundingClientRect();
      if (bounds.left < 0 || bounds.top < 0 || bounds.right > innerWidth + 1 || bounds.bottom > innerHeight + 1 || dialog.scrollWidth > dialog.clientWidth + 1) throw Error("Dialog overflow");
      if (document.documentElement.style.overflow !== "hidden") throw Error("Background not locked");
      const github = [...dialog.querySelectorAll("a")].find(link => link.textContent === "Visit GitHub");
      if (github?.href !== ${JSON.stringify(tool.skillUrl)} || github.target !== "_blank" || !github.rel.includes("noreferrer")) throw Error("Incorrect public skill destination");
      const controls = [...dialog.querySelectorAll("a[href],button,[tabindex]")].filter(control => control.tabIndex >= 0 && control.getClientRects().length);
      window.__toolsFirstControl = controls[0];
      window.__toolsLastControl = controls.at(-1);
      Object.defineProperty(navigator.clipboard, "writeText", {configurable:true, value:async text => {window.__toolsCopied = text;}});
    })()`);
    if (tool.title === "People Science Knowledge Vault") {
      assert.deepEqual(await evaluate(`(() => {
        const results = ${dialog}.querySelector("#results");
        return {
          introduction: results.querySelector("p").textContent,
          cards: [...results.querySelectorAll("article")].map(card => ({
            title: card.querySelector("h3").textContent,
            description: card.querySelector("p").textContent,
          })),
        };
      })()`), {
        introduction: "Move from “What am I looking at?” to “What could this mean for our people?” Explore your results with an AI thought partner that helps you connect the dots, question first impressions, and build a story grounded in evidence.",
        cards: [
          { title: "Find the story worth exploring", description: "Look beyond individual scores to explore how strengths, tensions, and differences between groups fit together." },
          { title: "Give the story depth", description: "Connect what you’re seeing with People Science research and your organization’s context. Consider different explanations and identify what would help distinguish them." },
          { title: "Put the story to work", description: "Develop a clear narrative to discuss with leaders or your team, including what you know, what remains uncertain, and what to explore next." },
        ],
      }, "Knowledge Vault Results must match the updated Figma content.");
      await waitFor(() => evaluate(`${dialog}.querySelector('#results img')?.complete && ${dialog}.querySelector('#results img').naturalWidth > 0`),
        "Knowledge Vault Auto Fit asset must load.");
      assert.deepEqual(await evaluate(`(() => {
        const icon = ${dialog}.querySelector("#results img");
        return [icon.getAttribute("src"), icon.getAttribute("alt"), icon.getAttribute("aria-hidden"), icon.getBoundingClientRect().width, icon.getBoundingClientRect().height];
      })()`), [`${prefix}/figma/site-canonical/tools/knowledge-vault-auto-fit.svg`, "", "true", 24, 24],
      "The updated Results icon must keep its exact asset, decorative semantics and 24px slot.");
    }
    assert.deepEqual(await evaluate(`(() => {
      const dialog = ${dialog};
      const codes = [...dialog.querySelectorAll("#start-using code")].map(code => getComputedStyle(code));
      const actions = dialog.querySelector("#start-using code").nextElementSibling;
      return {
        skill: [codes[0].fontSize, codes[0].lineHeight],
        prompt: [codes[1].fontSize, codes[1].lineHeight],
        actionGap: getComputedStyle(actions).gap,
        cardGap: getComputedStyle(dialog.querySelector("#results article")).gap,
      };
    })()`), tool.title === "People Science Knowledge Vault"
      ? { skill: ["14px", "22px"], prompt: ["16px", "22px"], actionGap: "16px", cardGap: "12px" }
      : { skill: ["14px", "20px"], prompt: ["14px", "20px"], actionGap: "8px", cardGap: "16px" },
    "Knowledge Vault typography and spacing must match Figma without changing Analyze Survey.");
    const summaryScrollable = await evaluate(`(() => {
      const summary = ${dialog}.querySelector('[role="region"]');
      if (summary?.getAttribute("aria-label") !== ${JSON.stringify(`${tool.title} summary`)}) throw Error("Missing accessible tool summary");
      window.__toolsSummary = summary;
      return summary.scrollHeight > summary.clientHeight + 1;
    })()`);
    if (summaryScrollable) {
      assert.equal(await evaluate("window.__toolsSummary.tabIndex"), 0, "Overflowing summary is keyboard accessible");
      await evaluate("window.__toolsSummary.scrollTop = 0; window.__toolsSummary.focus()");
      await key("ArrowDown", "ArrowDown", 40);
      await waitFor(() => evaluate("window.__toolsSummary.scrollTop > 0"), "Summary scrolls with the keyboard");
      await evaluate("window.__toolsSummary.scrollTop = 0");
    }
    await evaluate("window.__toolsFirstControl.focus()");
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: 8 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    assert.equal(await evaluate("document.activeElement === window.__toolsLastControl"), true, "Focus wraps backward");
    await key("Tab", "Tab", 9);
    assert.equal(await evaluate("document.activeElement === window.__toolsFirstControl"), true, "Focus wraps forward");
    await evaluate(`[...${dialog}.querySelectorAll('button')].find(button => button.textContent === "Copy skill link").click()`);
    await waitFor(() => evaluate(`window.__toolsCopied === ${JSON.stringify(tool.skillUrl)} && ${dialog}.querySelector('[aria-live="polite"]').textContent === "Skill link copied"`), "Skill clipboard payload or feedback");
    await evaluate(`[...${dialog}.querySelectorAll('button')].find(button => button.textContent === "Copy starter prompt").click()`);
    await waitFor(() => evaluate(`window.__toolsCopied === ${JSON.stringify(tool.prompt)} && ${dialog}.querySelector('[aria-live="polite"]').textContent === "Starter prompt copied"`), "Prompt clipboard payload or feedback");
    await evaluate(`(() => {
      Object.defineProperty(navigator.clipboard, "writeText", {configurable:true, value:async () => {throw new DOMException("Denied", "NotAllowedError");}});
      [...${dialog}.querySelectorAll("button")].find(button => button.textContent === "Copy skill link").click();
    })()`);
    await waitFor(() => evaluate(`${dialog}.querySelector('[role="alert"]')?.textContent.includes("Select and copy the text above manually.")`), "Clipboard denial recovery");
    await evaluate(`(() => {
      const dialog = ${dialog};
      const alert = dialog.querySelector('[role="alert"]');
      if (alert.closest('[class*="copyBlock"]').querySelector("code").textContent !== ${JSON.stringify(tool.skillUrl)}) throw Error("Manual copy text missing");
      Object.defineProperty(navigator.clipboard, "writeText", {configurable:true, value:async text => {window.__toolsCopied = text;}});
      [...dialog.querySelectorAll("button")].find(button => button.textContent === "Copy skill link").click();
    })()`);
    await waitFor(() => evaluate(`${dialog}.querySelector('[role="alert"]') === null && ${dialog}.querySelector('[aria-live="polite"]').textContent === "Skill link copied"`), "Clipboard retry recovery");
    for (const section of ["overview", "results", "start-using"]) {
      await evaluate(`${dialog}.querySelector('nav a[href="#${section}"]').focus()`);
      await key("Enter", "Enter", 13, "\r");
      await waitFor(() => evaluate(`${dialog}.querySelector('nav a[href="#${section}"]').getAttribute("aria-current") === "location"`), `Tool section tracking: ${section}`);
      assert.equal(await evaluate(`document.activeElement === ${dialog}.querySelector('#${section} h2')`), true, "Section navigation moves focus");
    }
    assert.deepEqual(await evaluate(`(async () => (await axe.run(${dialog}, {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations)()`), []);
    await send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
    assert.equal(await evaluate(`getComputedStyle(${dialog}.querySelector('nav a[aria-current]')).borderTopWidth`), "1px", "Current section remains outlined in high contrast");
    await send("Emulation.setEmulatedMedia", { features: [] });
    await key("Escape", "Escape", 27);
    await waitFor(() => evaluate(`${dialog} === null && document.activeElement === window.__toolsTrigger`), "Escape closes and restores focus");
    assert.equal(await evaluate('document.documentElement.style.overflow === "hidden"'), false, "Background scroll restored");
    await key("Enter", "Enter", 13, "\r");
    await waitFor(() => evaluate(`!!${dialog}`), "Tool reopens");
    await evaluate(`${dialog}.querySelector("button").click()`);
    await waitFor(() => evaluate(`${dialog} === null && document.activeElement === window.__toolsTrigger`), "Close button restores focus");
    toolModals.push({ title: tool.title, ...await evaluate("({width: innerWidth, height: innerHeight})") });
  }
}
