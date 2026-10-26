import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.argv[2] ?? "http://127.0.0.1:3010/annual-report-2026";
const port = Number(process.argv[3] ?? 9342);
const outputPath =
  process.argv[4] ??
  path.join("test-results", "annual-report-interactions.json");

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

  async press(key, code, windowsVirtualKeyCode) {
    const text = key === "Enter" ? "\r" : key === " " ? " " : undefined;
    await this.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      code,
      windowsVirtualKeyCode,
      nativeVirtualKeyCode: windowsVirtualKeyCode,
      ...(text ? { text, unmodifiedText: text } : {}),
    });
    await this.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
      code,
      windowsVirtualKeyCode,
      nativeVirtualKeyCode: windowsVirtualKeyCode,
    });
  }
}

async function waitFor(cdp, expression, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await cdp.evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(message);
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
  await waitFor(
    cdp,
    "document.readyState === 'complete' && document.querySelector('#report-content') !== null",
    "Annual Report did not become ready.",
  );

  const semantics = await cdp.evaluate(`(() => {
    const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")];
    return {
      headingLevels: headings.map((heading) => Number(heading.tagName.slice(1))),
      headingsWithParagraphChildren: headings
        .filter((heading) => heading.querySelector(":scope > p"))
        .map((heading) => heading.textContent.trim()),
      imagesWithoutAlt: [...document.images]
        .filter((image) => !image.hasAttribute("alt"))
        .map((image) => image.currentSrc || image.src),
      unnamedIconButtons: [...document.querySelectorAll("button")]
        .filter((button) =>
          button.textContent.trim() === "" &&
          !button.getAttribute("aria-label") &&
          !button.getAttribute("title")
        ).length,
      mainCount: document.querySelectorAll("main").length,
      h1Count: document.querySelectorAll("h1").length
    };
  })()`);
  assert.deepEqual(semantics.headingsWithParagraphChildren, []);
  assert.deepEqual(semantics.imagesWithoutAlt, []);
  assert.equal(semantics.unnamedIconButtons, 0);
  assert.equal(semantics.mainCount, 1);
  assert.equal(semantics.h1Count, 1);
  assert(
    semantics.headingLevels.every(
      (level, index, levels) =>
        index === 0 || level <= levels[index - 1] + 1,
    ),
    "Heading levels skip.",
  );

  await cdp.evaluate("document.activeElement?.blur(); scrollTo(0, 0)");
  await cdp.press("Tab", "Tab", 9);
  const skipLink = await cdp.evaluate(`(() => {
    const link = document.querySelector('a[href="#report-content"]');
    const rect = link.getBoundingClientRect();
    return {
      active: document.activeElement === link,
      top: rect.top,
      bottom: rect.bottom,
      outline: getComputedStyle(link).outlineStyle
    };
  })()`);
  assert.equal(skipLink.active, true);
  assert(skipLink.top >= 0 && skipLink.bottom > skipLink.top);

  await cdp.evaluate(`(() => {
    const trigger = [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "continuous listening"
    );
    trigger.focus();
    return document.activeElement === trigger;
  })()`);
  await cdp.press("Enter", "Enter", 13);
  await waitFor(
    cdp,
    "document.querySelector('dialog[open]') !== null",
    "Enter did not open the continuous-listening dialog.",
  );

  const dialog = await cdp.evaluate(`(() => {
    const dialog = document.querySelector("dialog[open]");
    const close = dialog.querySelector('button[aria-label^="Close"]');
    const rect = close.getBoundingClientRect();
    const pseudo = getComputedStyle(close, "::after");
    const effectiveWidth =
      rect.width - (parseFloat(pseudo.left) || 0) - (parseFloat(pseudo.right) || 0);
    const effectiveHeight =
      rect.height - (parseFloat(pseudo.top) || 0) - (parseFloat(pseudo.bottom) || 0);
    return {
      activeInside: dialog.contains(document.activeElement),
      modal: dialog.matches(":modal"),
      effectiveWidth,
      effectiveHeight
    };
  })()`);
  assert.equal(dialog.activeInside, true);
  assert.equal(dialog.modal, true);
  assert(dialog.effectiveWidth >= 44);
  assert(dialog.effectiveHeight >= 44);

  await cdp.press("Escape", "Escape", 27);
  await waitFor(
    cdp,
    "document.querySelector('dialog[open]') === null",
    "Escape did not close the continuous-listening dialog.",
  );
  assert.equal(
    await cdp.evaluate(
      "document.activeElement?.textContent?.trim() === 'continuous listening'",
    ),
    true,
    "Dialog close did not restore trigger focus.",
  );

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 900,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await cdp.evaluate(
    "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
  );

  const touchTargets = await cdp.evaluate(`(() => {
    const extent = (element, pseudoName) => {
      const rect = element.getBoundingClientRect();
      const pseudo = pseudoName ? getComputedStyle(element, pseudoName) : null;
      return {
        width: rect.width -
          (parseFloat(pseudo?.left) || 0) -
          (parseFloat(pseudo?.right) || 0),
        height: rect.height -
          (parseFloat(pseudo?.top) || 0) -
          (parseFloat(pseudo?.bottom) || 0)
      };
    };
    const point = document.querySelector("[data-momentum-trigger]");
    const rating = document.querySelector("input[type=radio]").closest("label");
    const inlineTrigger = [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "continuous listening"
    );
    return {
      navigation: [...document.querySelectorAll('nav[aria-label="Primary"] a')]
        .map((element) => extent(element)),
      momentumPoint: extent(point, "::after"),
      momentumKeys: [...document.querySelectorAll("[data-momentum-trigger]")]
        .filter((element) => !element.getAttribute("aria-label"))
        .map((element) => extent(element)),
      rating: extent(rating, "::after"),
      inlineTrigger: extent(inlineTrigger, "::after")
    };
  })()`);
  for (const target of [
    ...touchTargets.navigation,
    touchTargets.momentumPoint,
    ...touchTargets.momentumKeys,
    touchTargets.rating,
    touchTargets.inlineTrigger,
  ]) {
    assert(
      target.width >= 44 && target.height >= 44,
      `Touch target is too small: ${JSON.stringify(target)}.`,
    );
  }

  await cdp.evaluate(`(() => {
    const point = document.querySelector("[data-momentum-trigger]");
    point.scrollIntoView({ block: "center" });
    point.focus();
  })()`);
  await cdp.press("Enter", "Enter", 13);
  await waitFor(
    cdp,
    "document.querySelector('[role=\"region\"][aria-label$=\" details\"]') !== null",
    "Enter did not open momentum details.",
  );
  const momentumOpen = await cdp.evaluate(`(() => {
    const trigger = document.querySelector("[data-momentum-trigger]");
    const details = document.querySelector('[role="region"][aria-label$=" details"]');
    const close = details.querySelector('button[aria-label^="Close"]');
    const rect = close.getBoundingClientRect();
    const pseudo = getComputedStyle(close, "::after");
    return {
      expanded: trigger.getAttribute("aria-expanded"),
      detailsLabel: details.getAttribute("aria-label"),
      closeWidth: rect.width -
        (parseFloat(pseudo.left) || 0) -
        (parseFloat(pseudo.right) || 0),
      closeHeight: rect.height -
        (parseFloat(pseudo.top) || 0) -
        (parseFloat(pseudo.bottom) || 0)
    };
  })()`);
  assert.equal(momentumOpen.expanded, "true");
  assert(momentumOpen.detailsLabel);
  assert(momentumOpen.closeWidth >= 44);
  assert(momentumOpen.closeHeight >= 44);

  await cdp.press("Escape", "Escape", 27);
  await waitFor(
    cdp,
    "document.querySelector('[role=\"region\"][aria-label$=\" details\"]') === null",
    "Escape did not close momentum details.",
  );
  assert.equal(
    await cdp.evaluate(
      "document.activeElement === document.querySelector('[data-momentum-trigger]')",
    ),
    true,
    "Momentum dismissal did not retain trigger focus.",
  );

  const ratingVisual = await cdp.evaluate(`(() => {
    const section = document.querySelector('[data-node-id="1591:2722"]');
    const fieldsets = [...section.querySelectorAll("fieldset")];
    return {
      checkedBeforeInput: section.querySelectorAll('input[type="radio"]:checked').length,
      fieldsets: fieldsets.length,
      distributions: fieldsets.map((fieldset) =>
        fieldset.querySelectorAll('[class*="distributionTrack"] > span').length
      ),
      percentageLabels: fieldsets.map((fieldset) =>
        [...fieldset.querySelectorAll('[class*="distributionLabel"]')]
          .map((label) => label.lastElementChild.textContent.trim())
      ),
      distributionRatings: fieldsets.map((fieldset) =>
        [...fieldset.querySelectorAll('[class*="distributionLabel"]')]
          .map((label) => label.firstElementChild.textContent.trim())
      ),
      sampledAudiences: fieldsets.map((fieldset) =>
        fieldset.querySelectorAll('[class*="sampleAudience"]').length
      ),
    };
  })()`);
  assert.equal(ratingVisual.checkedBeforeInput, 0);
  assert.equal(ratingVisual.fieldsets, 4);
  assert.deepEqual(ratingVisual.distributions, [0, 0, 0, 0]);
  assert.deepEqual(ratingVisual.percentageLabels, [[], [], [], []]);
  assert.deepEqual(ratingVisual.distributionRatings, [[], [], [], []]);
  assert.deepEqual(ratingVisual.sampledAudiences, [0, 0, 0, 0]);

  await cdp.evaluate(`(() => {
    const input = document.querySelector("input[type=radio]");
    input.scrollIntoView({ block: "center" });
    input.focus();
  })()`);
  await cdp.press(" ", "Space", 32);
  const rating = await cdp.evaluate(`(() => {
    const input = document.querySelector("input[type=radio]");
    const fieldset = input.closest("fieldset");
    const result = fieldset.querySelector('[aria-live="polite"]');
    return {
      checked: input.checked,
      announcement: result.textContent.trim(),
      selectedSegments: fieldset.querySelectorAll(
        '[class*="distributionTrack"] > span[data-selected]'
      ).length,
      distributionCount: fieldset.querySelectorAll(
        '[class*="distributionTrack"] > span'
      ).length,
      percentageLabels: [...fieldset.querySelectorAll('[class*="distributionLabel"]')]
        .map((label) => label.lastElementChild.textContent.trim()),
      distributionRatings: [...fieldset.querySelectorAll('[class*="distributionLabel"]')]
        .map((label) => label.firstElementChild.textContent.trim()),
      sampledAudience: fieldset.querySelector('[class*="sampleAudience"]')?.textContent.trim(),
      untouchedDistributions: [...fieldset.parentElement.querySelectorAll("fieldset")]
        .slice(1)
        .map((candidate) => candidate.querySelectorAll('[class*="distributionTrack"]').length)
    };
  })()`);
  assert.equal(rating.checked, true);
  assert(rating.announcement.length > 0);
  assert.equal(rating.selectedSegments, 1);
  assert.equal(rating.distributionCount, 5);
  assert.deepEqual(rating.percentageLabels, ["1.9%", "10.7%", "37.9%", "46.6%", "2.9%"]);
  assert.deepEqual(rating.distributionRatings, ["Poor", "Fair", "Good", "Strong", "Best in class"]);
  assert.equal(rating.sampledAudience, "Sampled audience");
  assert.deepEqual(rating.untouchedDistributions, [0, 0, 0]);

  await cdp.send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [{ name: "forced-colors", value: "active" }],
  });
  await cdp.evaluate(
    "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
  );
  const forcedColors = await cdp.evaluate(`(() => {
    const input = document.querySelector("input[type=radio]");
    const selected = input.nextElementSibling;
    const trigger = document.querySelector("[data-momentum-trigger]");
    trigger.focus();
    const selectedStyle = getComputedStyle(selected);
    const triggerStyle = getComputedStyle(trigger);
    return {
      active: matchMedia("(forced-colors: active)").matches,
      selectedBackground: selectedStyle.backgroundColor,
      selectedColor: selectedStyle.color,
      focusOutlineStyle: triggerStyle.outlineStyle,
      focusOutlineWidth: triggerStyle.outlineWidth,
      metricLabels: [...document.querySelectorAll('[aria-label*="Current use"]')].length
    };
  })()`);
  assert.equal(forcedColors.active, true);
  assert.notEqual(forcedColors.selectedBackground, "rgba(0, 0, 0, 0)");
  assert.notEqual(forcedColors.focusOutlineStyle, "none");
  assert.notEqual(forcedColors.focusOutlineWidth, "0px");
  assert(forcedColors.metricLabels > 0);

  const report = {
    auditedAt: new Date().toISOString(),
    url,
    semantics,
    skipLink,
    dialog,
    touchTargets,
    momentumOpen,
    ratingVisual,
    rating,
    forcedColors,
    humanReviewStillRequired: [
      "Windows High Contrast on physical Windows",
      "200% text zoom and 400% browser zoom visual review",
      "Narrator with Edge",
      "NVDA with Firefox or Chrome",
      "physical touch-device review",
      "meaningful-versus-decorative image content review",
    ],
  };
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        url,
        headings: semantics.headingLevels.length,
        dialogKeyboard: true,
        momentumKeyboard: true,
        ratingKeyboard: true,
        forcedColors: forcedColors.active,
        outputPath,
      },
      null,
      2,
    ),
  );
} finally {
  socket.close();
}
