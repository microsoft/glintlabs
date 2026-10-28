import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./analyze-survey-details.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("./analyze-survey-details.module.css", import.meta.url), "utf8");
const modalSource = await readFile(new URL("./analyze-survey-modal-trigger.tsx", import.meta.url), "utf8");

test("the shared Analyze Survey card uses the approved clipboard illustration without changing its size or decorative semantics", async () => {
  const catalog = await readFile(new URL("../tools-catalog.tsx", import.meta.url), "utf8");
  assert.match(catalog, /<Image src="\/figma\/illustrations\/blue\/report\.png" alt="" aria-hidden="true" width=\{170\} height=\{170\} unoptimized \/>/);
  assert.doesNotMatch(catalog, /\/figma\/site-canonical\/tools\/create\.svg/);
  assert.ok((await readFile(new URL("../../../../public/figma/illustrations/blue/report.png", import.meta.url))).length > 0);
  for (const page of ["../../page.tsx", "../page.tsx"]) {
    assert.match(await readFile(new URL(page, import.meta.url), "utf8"), /<ToolsCatalog \/>/);
  }
});

test("Analyze Survey retains the canonical terminal instructions with outlined copy actions", () => {
  assert.ok(source.includes("<h3>Open Copilot in your terminal</h3>"));
  assert.ok(source.includes("Open your terminal and start GitHub Copilot CLI. Copy the link below, paste it into Copilot, and ask it to use the Analyze Survey skill."));
  assert.match(source, /const skillUrl = "https:\/\/github\.com\/microsoft\/glintlabs\/blob\/main\/skills\/analyze-survey\/SKILL\.md"/);
  assert.match(source, /<button onClick=\{\(\) => copyText\("skill"\)\}/);
  assert.match(source, /Copy skill link/);
  assert.match(source, /<a href=\{skillUrl\} rel="noreferrer" target="_blank"><Open20Regular aria-hidden="true" \/>Visit GitHub<\/a>/);
  const actionStyles = styles.match(/\.copyBlock button, \.copyBlock a \{([^}]*)\}/)?.[1];
  assert.ok(actionStyles);
  assert.match(actionStyles, /background: transparent;/);
  assert.match(actionStyles, /border: 1px solid rgb\(0 0 0 \/ 13%\);/);
  assert.doesNotMatch(source + styles, /primaryCopyAction/);
});

test("skill and prompt copy actions keep their exact clipboard values and contextual feedback", () => {
  assert.match(source, /navigator\.clipboard\.writeText\(target === "skill" \? skillUrl : starterPrompt\)/);
  assert.match(source, /copyError\?\.target === "skill"/);
  assert.match(source, /copyError\?\.target === "prompt"/);
  assert.match(source, /aria-live="polite"/);
  assert.ok(source.includes("When Copilot opens, paste this prompt. The skill will ask how you want to provide survey data before it runs."));
  assert.ok(source.includes("Select and copy the text above manually."));
});

test("the skill link and starter prompt share compact, wrapping typography", () => {
  const codeStyles = styles.match(/\.copyBlock code \{([^}]*)\}/)?.[1];
  assert.ok(codeStyles);
  assert.match(codeStyles, /font-size: 14px;/);
  assert.match(codeStyles, /line-height: 20px;/);
  assert.match(codeStyles, /max-width: 100%;/);
  assert.match(codeStyles, /overflow-wrap: anywhere;/);
  assert.match(codeStyles, /white-space: normal;/);
  assert.equal(source.match(/<div className=\{styles\.copyBlock\}>/g)?.length, 2);
  assert.ok(source.includes("<code>{skillUrl}</code>"));
  assert.ok(source.includes("<code>{starterPrompt}</code>"));
});

test("the overview uses the approved library wording with the original GitHub destination", () => {
  assert.match(source, /The Analyze Survey skill uses advanced statistical methods from our <a href="https:\/\/github\.com\/microsoft\/vivaglint_py" rel="noreferrer" target="_blank">Viva Glint Analytics Library<\/a>\. Every run of Analyze Survey is inspected and evaluated for accuracy and repeatability\./);
});

test("only the modal omits the header GitHub action and its description can fill the row", () => {
  assert.match(source, /\{!onClose \? <a className=\{styles\.githubAction\} href=\{skillUrl\}[^>]*><Open20Regular aria-hidden="true" \/>View on GitHub<\/a> : null\}/);
  assert.match(styles, /\.titleRow > div \{ min-width: 0; flex: 1 1 auto; \}/);
});

test("safeguard card icons use the site accent without changing their dimensions", () => {
  const iconStyles = styles.match(/\.card > svg \{([^}]*)\}/)?.[1];
  assert.ok(iconStyles);
  assert.match(iconStyles, /color: var\(--site-accent\);/);
  assert.match(iconStyles, /width: 24px; height: 24px;/);
});

test("the modal preserves an existing scrollbar gutter before locking and restores it on close", () => {
  assert.match(modalSource, /const previousRootScrollbarGutter = root\.style\.scrollbarGutter;/);
  assert.match(modalSource, /if \(window\.innerWidth > root\.clientWidth && getComputedStyle\(root\)\.scrollbarGutter === "auto"\) \{\s*root\.style\.scrollbarGutter = "stable";\s*\}/);
  assert.ok(modalSource.indexOf('root.style.scrollbarGutter = "stable";') < modalSource.indexOf('root.style.overflow = "hidden";'));
  assert.match(modalSource, /root\.style\.scrollbarGutter = previousRootScrollbarGutter;/);
});
