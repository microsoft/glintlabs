import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./analyze-survey-details.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("./analyze-survey-details.module.css", import.meta.url), "utf8");

test("Analyze Survey starts explicitly in the Copilot terminal with a primary skill-link copy action", () => {
  assert.ok(source.includes("Open your terminal and start GitHub Copilot CLI."));
  assert.ok(source.includes("Copy the link below, paste it into Copilot, and ask it to use the Analyze Survey skill."));
  assert.match(source, /const skillUrl = "https:\/\/github\.com\/microsoft\/glintlabs\/blob\/main\/skills\/analyze-survey\/SKILL\.md"/);
  assert.match(source, /className=\{styles\.primaryCopyAction\} onClick=\{\(\) => copyText\("skill"\)\}/);
  assert.match(source, /Copy skill link/);
  assert.match(source, /<a href=\{skillUrl\} rel="noreferrer" target="_blank"><Open20Regular aria-hidden="true" \/>Visit GitHub<\/a>/);
  assert.match(styles, /\.copyBlock \.primaryCopyAction \{ color: var\(--site-paper\); background: var\(--site-ink\);/);
});

test("skill and prompt copy actions keep their exact clipboard values and contextual feedback", () => {
  assert.match(source, /navigator\.clipboard\.writeText\(target === "skill" \? skillUrl : starterPrompt\)/);
  assert.match(source, /copyError\?\.target === "skill"/);
  assert.match(source, /copyError\?\.target === "prompt"/);
  assert.match(source, /aria-live="polite"/);
  assert.ok(source.includes("Once Copilot has loaded the skill, paste this prompt."));
  assert.ok(source.includes("Select and copy the text above manually."));
});
