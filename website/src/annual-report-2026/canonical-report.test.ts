import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { aiListeningPhases, capabilityRatings, canonicalReportSource, listeningCapabilities, listeningPortfolio, sampleDemographics } from "./canonical-report-data.ts";

const snapshot = readFileSync(new URL("./canonical-figma.tsx", import.meta.url), "utf8");
const figmaStyles = readFileSync(new URL("./canonical-figma.module.css", import.meta.url), "utf8");
const interactionSource = readFileSync(new URL("./canonical-report-interactions.tsx", import.meta.url), "utf8");
const interactionStyles = readFileSync(new URL("./canonical-interactions.module.css", import.meta.url), "utf8");
const prioritySource = readFileSync(new URL("./annual-report-interactive-visuals.tsx", import.meta.url), "utf8");
const priorityStyles = readFileSync(new URL("./annual-report-components.module.css", import.meta.url), "utf8");
const shellStyles = readFileSync(new URL("./canonical-report.module.css", import.meta.url), "utf8");
const navigationStyles = readFileSync(new URL("../app/_components/site-navigation.module.css", import.meta.url), "utf8");
const diagrams = readFileSync(new URL("./canonical-report-diagrams.tsx", import.meta.url), "utf8");
const diagramStyles = readFileSync(new URL("./canonical-report-diagrams.module.css", import.meta.url), "utf8");
const themeStyles = readFileSync(new URL("../app/site-theme.css", import.meta.url), "utf8");

test("annual sidebar credits both authors with roles while preserving publication metadata and other report layouts", () => {
  const page = readFileSync(new URL("../app/annual-report-2026/page.tsx", import.meta.url), "utf8");
  const sideNav = readFileSync(new URL("../report-system/report-side-nav.tsx", import.meta.url), "utf8");
  const sideNavStyles = readFileSync(new URL("../report-system/report-side-nav.module.css", import.meta.url), "utf8");
  assert.match(page, /name: "Megan Benzing, PhD", role: "Principal Author"/);
  assert.match(page, /name: "Caribay Garcia, PhD", role: "Author"/);
  assert.match(page, /publishedDate="10\/18\/26"/);
  assert.match(page, /readTimeMinutes=\{20\}/);
  assert.doesNotMatch(page, /authorHandle=/);
  assert.match(sideNav, /!authors\?\.length \? \(\s*<div className=\{styles\.icons\}/);
  assert.match(sideNav, /authors\.map/);
  assert.match(sideNav, /authorHandle \? <span>\{authorHandle\}<\/span> : null/);
  assert.match(sideNavStyles, /\.creditedAuthor \{[^}]*font-size: 16px;[^}]*line-height: 24px;/);
  assert.match(sideNavStyles, /\.authorRole \{[^}]*font-size: 12px;[^}]*line-height: 16px;/);
});

test("the Annual Report author divider spans the stacked tablet and mobile content without widening desktop sidebars", () => {
  const stacked = shellStyles.split("@media (max-width: 959px) {")[1]?.split("@media")[0];
  assert.ok(stacked);
  assert.match(stacked, /\.layout \{ display: block; width: min\(752px, calc\(100% - 48px\)\); \}/);
  assert.match(stacked, /\.rail > aside \{ width: 100%; \}/);
  const sideNavStyles = readFileSync(new URL("../report-system/report-side-nav.module.css", import.meta.url), "utf8");
  assert.match(sideNavStyles, /\.sideNav \{[^}]*width: 170px;/);
  assert.match(sideNavStyles, /\.divider \{[^}]*width: 100%;/);
});

test("all canonical visual panels share the Figma gradient stroke and retain forced-color outlines", () => {
  assert.match(themeStyles, /--annual-panel-outline: linear-gradient\(189deg, rgb\(92 141 248 \/ 40%\) 19\.3%, rgb\(92 141 248 \/ 80%\) 50%, rgb\(92 141 248 \/ 40%\) 80\.7%\);/);
  for (const stylesheet of [figmaStyles, diagramStyles, interactionStyles, priorityStyles]) {
    assert.match(stylesheet, /var\(--annual-panel-outline\) border-box/);
    assert.match(stylesheet, /border-color:\s*CanvasText;\s*background:\s*Canvas;/);
  }
  assert.match(figmaStyles, /\.body :is\(\.frame18,\.frame37,\.frame87,\.frame108,\.frame135,\.frame148,\.frame153\) \{ border-color:transparent;/);
  assert.match(interactionStyles, /\.momentumPanel \{[^}]*background-color: var\(--annual-canvas\);/);
});

test("related research is a keyboard-accessible link using the approved November 2024 short URL", () => {
  assert.match(snapshot, /<a\s+className=\{styles\.frame99\}\s+href="https:\/\/aka\.ms\/researchdrop_nov2024"\s+target="_blank"\s+rel="noopener noreferrer"\s+aria-label="Microsoft People Science research \(opens in a new tab\)"/);
  assert.match(figmaStyles, /\.frame99:focus-visible \{ outline:2px solid var\(--annual-accent\); outline-offset:3px; \}/);
});

test("canonical stat callouts keep a word boundary after the percentage", () => {
  assert.doesNotMatch(diagrams, /<\/strong>(?:of|believe)\b/);
});

test("canonical report retains the evidenced statistic and principle color distinctions", () => {
  assert.equal([...diagrams.matchAll(/styles\.contrastStats/g)].length, 2);
  assert.match(diagramStyles, /\.contrastStats strong \{ color: #ffe6a5; \}/);
  assert.match(diagrams, /leaders reported that AI will fundamentally change/);
  assert.match(diagrams, /reported that their organization has a clear point of view/);
  assert.doesNotMatch(diagrams, /their their/);
  for (const [principle, color] of [["trustworthy", "#7eaba7"], ["intelligent", "#a79bcc"], ["outcome", "#9fafc3"], ["responsive", "#dec98f"], ["embedded", "#c49c8f"], ["center", "#5f82f2"]]) {
    assert.ok(diagramStyles.includes(`.${principle} { --principle-color: ${color};`));
  }
  for (const [level, color] of [["low", "#9fafc3"], ["medium", "#dec98f"], ["high", "#5f82f2"]]) {
    assert.ok(figmaStyles.includes(`[data-level="${level}"] { background:${color}; border-color:${color}; color:#000; }`));
  }
});

test("action-taking paradox retains the Figma number treatment and source-note spacing", () => {
  const paradox = diagrams.slice(diagrams.indexOf("export function ActionTakingParadox"), diagrams.indexOf("export function AiOpportunity"));
  assert.match(paradox, /styles\.statCard\} \$\{styles\.paradoxCard/);
  assert.deepEqual([...paradox.matchAll(/<strong>(\d+%)<\/strong>/g)].map((match) => match[1]), ["38%", "29%", "80%", "75%"]);
  assert.match(diagramStyles, /\.paradoxCard \.statPair strong \{ font-weight: 420; \}/);
  assert.match(diagramStyles, /\.paradoxCard \.paradoxNoWrap \{ white-space: nowrap; \}/);
  assert.match(paradox, /styles\.paradoxNoWrap\}>team&apos;s feedback<\/span>/);
  assert.match(paradox, /styles\.paradoxNoWrap\}>follow-through<\/span>/);
  assert.match(diagramStyles, /\.paradoxCard :is\(h3, h4\), \.paradoxCard \.statPair p \{ font-variation-settings: "opsz" 36; \}/);
  assert.match(diagramStyles, /\.paradoxCard > \.note \{ margin-top: 16px; \}/);
  for (const name of ["paradox-glow-top", "paradox-glow-bottom"]) {
    assert.ok(diagramStyles.includes(`/figma/annual-blue/${name}.svg`));
    assert.ok(readFileSync(new URL(`../../public/figma/annual-blue/${name}.svg`, import.meta.url)).length > 0);
  }
});

test("AI opportunity retains the Figma typography, source note, and subtle local backgrounds", () => {
  const opportunity = diagrams.slice(diagrams.indexOf("export function AiOpportunity"), diagrams.indexOf("const principles"));
  assert.match(opportunity, /styles\.statCard\} \$\{styles\.aiCard/);
  assert.deepEqual([...opportunity.matchAll(/<strong>(\d+%)<\/strong>/g)].map((match) => match[1]), ["83%", "43%"]);
  assert.match(opportunity, /change how organizations act<br \/>on insights/);
  assert.match(opportunity, /reported that their organization has a clear point of view/);
  assert.match(opportunity, /listening leader<sup>1<\/sup> favorability scores/);
  assert.match(diagramStyles, /\.aiCard \.statPair strong \{ font-weight: 420; \}/);
  assert.match(diagramStyles, /\.aiCard :is\(h3, h4\), \.aiCard \.statPair p \{ font-variation-settings: "opsz" 36; \}/);
  assert.match(diagramStyles, /\.aiCard h4, \.aiCard \.statPair p \{ letter-spacing: -\.15px; \}/);
  assert.match(diagramStyles, /\.aiCard > \.note \{ font-variation-settings: "opsz" 8; \}/);
  for (const name of ["ai-opportunity-glow-top", "ai-opportunity-glow-bottom"]) {
    assert.ok(diagramStyles.includes(`/figma/annual-blue/${name}.svg`));
    assert.ok(readFileSync(new URL(`../../public/figma/annual-blue/${name}.svg`, import.meta.url)).length > 0);
  }
});

test("canonical team credits match the reviewed roles, colors, layout, and confirmed profile links", () => {
  const team = snapshot.slice(snapshot.indexOf("<section className={styles.team}"), snapshot.indexOf("<ReportAppendices />"));
  for (const name of ["Megan Benzing, PhD", "Caribay Garcia, PhD", "Stephanie Cruz, PhD", "Chad Bennett", "Eric Schroen"]) {
    assert.ok(team.includes(name));
  }
  for (const role of ["Principal Author", "Author", "Contributors", "Designer and Builder"]) assert.ok(team.includes(`<h4>${role}</h4>`));
  assert.equal([...team.matchAll(/<h5>/g)].length, 5);
  assert.match(team, /Senior People Scientist, Microsoft/);
  assert.match(team, /styles\.teamContent/);
  assert.match(team, /styles\.teamContributions/);
  for (const profile of ["megan-benzing", "caribaygarcia", "crustephanie", "chadlbennett", "ericschroen"]) {
    assert.ok(team.includes(`href="https://www.linkedin.com/in/${profile}"`));
  }
  assert.match(team, /href="https:\/\/www\.linkedin\.com\/in\/chadlbennett" target="_blank" rel="noopener noreferrer" aria-label="View on LinkedIn: Chad Bennett \(opens in a new tab\)"/);
  assert.equal([...team.matchAll(/target="_blank" rel="noopener noreferrer" aria-label="View on LinkedIn: [^"]+ \(opens in a new tab\)"/g)].length, 5);
  assert.match(figmaStyles, /\.team \{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(0,558px\)/);
  assert.match(figmaStyles, /\.teamContributions \{ grid-column:1 \/ -1; \}/);
  assert.match(figmaStyles, /\.teamCard \{[^}]*min-height:78px;[^}]*border:1px solid var\(--annual-internal-rule\);[^}]*font-weight:420;/);
  assert.match(figmaStyles, /\.teamCard h5, \.teamCard p \{ margin:0; font-size:12px; line-height:16px; \}/);
  assert.match(figmaStyles, /\.teamCard h5 \{[^}]*font-weight:625; \}/);
  assert.match(figmaStyles, /\.teamCard a \{[^}]*font-size:12px; line-height:16px;/);
  for (const [role, color] of [["author", "#7eaba7"], ["contributor", "#a79bcc"], ["designer", "#dec98f"]]) {
    assert.ok(figmaStyles.includes(`.teamCard[data-contribution="${role}"] h5 { color:${color}; }`));
  }
  assert.match(figmaStyles, /\.teamCard a:focus-visible \{ outline:2px solid var\(--annual-accent\); outline-offset:3px; \}/);
  assert.match(figmaStyles, /\.teamRow, \.teamCards \{ grid-template-columns:1fr; \}/);
  assert.doesNotMatch(team, /PLACEHOLDER/);
  assert.match(team, /<\/section>\s*<hr className=\{styles\.divider\} \/>/);
  assert.match(figmaStyles, /\.divider \{[^}]*height:1px; background:#fff;/);
});

test("home and annual report share stable hero geometry without a hidden interactive CTA", () => {
  const page = readFileSync(new URL("../app/annual-report-2026/page.tsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const heroStyles = readFileSync(new URL("../app/_components/annual-study-hero.module.css", import.meta.url), "utf8");
  for (const source of [home, page]) {
    assert.match(source, /import heroStyles from "[^"]*annual-study-hero\.module\.css"/);
    for (const name of ["hero", "inner", "copy", "photo"]) assert.ok(source.includes(`heroStyles.${name}`));
  }
  assert.match(heroStyles, /\.hero \{[^}]*padding: 208px max\(24px, calc\(\(100% - 1140px\) \/ 2\)\) 112px;/);
  assert.match(heroStyles, /\.inner > \.photo \{[^}]*aspect-ratio: 1024 \/ 684;/);
  assert.match(heroStyles, /\.withoutAction::after \{[^}]*height: 40px; margin-top: 10px;/);
  assert.match(heroStyles, /\.action, \.withoutAction::after \{ margin-top: 0; \}/);
  assert.match(heroStyles, /\.withoutAction::after \{ height: 44px; \}/);
  assert.match(page, /heroStyles\.withoutAction/);
  assert.match(home, /className=\{heroStyles\.action\} href="\/annual-report-2026"/);
  assert.doesNotMatch(page, /heroLineBreak|heroStyles\.action|<br/);
  assert.ok(page.includes("2026 • Next Gen Employee Listening Report"));
});

test("hero dissolve enhances only the paired top-of-page links and respects motion preferences", () => {
  const source = readFileSync(new URL("../app/_components/hero-transition-link.tsx", import.meta.url), "utf8");
  assert.match(source, /from === "\/" && href === "\/annual-report-2026"/);
  assert.match(source, /from === "\/annual-report-2026" && href === "\/"/);
  assert.match(source, /window\.scrollY > 1 \|\| !document\.startViewTransition/);
  assert.match(source, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches\) return;/);
  assert.match(source, /<Link \{\.\.\.props\} href=\{href\} onNavigate=/);
  assert.match(source, /observer\.disconnect\(\)/);
  assert.match(source, /window\.clearTimeout\(timeout\)/);
  assert.match(source, /window\.setTimeout\(\(\) => finish\(null\), 1500\)/);
  assert.match(source, /transition\.skipTransition\(\)/);
  assert.match(source, /image\.decode\(\)/);
  assert.match(source, /focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /transition\.finished[^;]*removeAttribute\("data-hero-transition"\)/);
});

test("annual hero participant badges open matching tabs in the shared participant dialog", () => {
  const page = readFileSync(new URL("../app/annual-report-2026/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<ParticipantDetailsProvider>[\s\S]*<main[\s\S]*<\/main>\s*<\/ParticipantDetailsProvider>/);
  assert.match(page, /<ParticipantDetailsTrigger sampleIndex=\{0\}>[\s\S]*?100\+ Listening Leaders/);
  assert.match(page, /<ParticipantDetailsTrigger sampleIndex=\{1\}>[\s\S]*?500 Employees/);
  assert.equal([...page.matchAll(/className=\{reportStyles\.badgeChevron\}/g)].length, 2);
  assert.match(page, /<span><Image[^>]*hero-calendar\.svg[^>]*\/>2026 • Next Gen Employee Listening Report<\/span>/);
  assert.match(interactionSource, /aria-haspopup="dialog" onClick=\{\(event\) => openDetails\(sampleIndex, event\.currentTarget\)\}/);
  assert.match(interactionSource, /trigger\.current = button; setSelected\(index\); setOpen\(true\);/);
  assert.match(interactionSource, /<ParticipantDetailsTrigger className=\{styles\.demographicsTrigger\}>/);
  assert.match(shellStyles, /\.badgeChevron \{ rotate: -90deg; \}/);
  assert.match(shellStyles, /\.badges > button \{[^}]*cursor: pointer;/);
});

test("hero dissolve keeps the photo stationary and the theme change brief", () => {
  const heroStyles = readFileSync(new URL("../app/_components/annual-study-hero.module.css", import.meta.url), "utf8");
  const globalStyles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const name of ["annual-hero-title", "annual-hero-badges", "annual-hero-photo", "annual-hero-action"]) {
    assert.ok(heroStyles.includes(`view-transition-name: ${name};`));
  }
  assert.match(navigationStyles, /view-transition-name: annual-navigation;/);
  assert.match(globalStyles, /animation-duration: 300ms;/);
  assert.match(globalStyles, /::view-transition-new\(annual-hero-photo\) \{\s*animation: none;/);
  assert.match(globalStyles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*::view-transition-new\(\*\) \{\s*animation: none;/);
});

test("evidence-building copy matches the reviewed exposure guidance", () => {
  const component = snapshot.slice(snapshot.indexOf('data-node-id="1561:59775"'), snapshot.indexOf('data-node-id="1451:11649"'));
  for (const text of [
    "Build evidence before broader deployment",
    "How many people are affected shapes the change management needed to move at speed. These are independent choices to fit your question, not a sequence to complete.",
    "No exposure",
    "No direct employee involved",
    "Learn with synthetic data or simulation, without changing employees’ experiences or decisions that affect them.",
    "Some exposure",
    "Involves a defined group",
    "A defined group may be involved, including people involved indirectly. The scope can expand, change, or stop as evidence develops.",
    "Broad exposure",
    "Wide population involved",
    "A broader employee population may be included when safeguards and context support it. The goal is meaningful learning, not simply broader reach.",
    "An answer can be the outcome. Not a rollout.",
    "More exposure is not a measure of success. Build enough evidence to learn safely and move quickly, without involving more employees than the question requires.",
  ]) assert.ok(component.includes(text), `Missing reviewed copy: ${text}`);
  assert.doesNotMatch(component, /Full exposure|Synthetic data can be the whole approach|Exposure means being affected/);
  assert.doesNotMatch(figmaStyles, /\.body \.frame128 \{ color:red; \}/);
});

test("AI capability rankings retain visible numbered lists and the reviewed wording", () => {
  const section = snapshot.slice(snapshot.indexOf('data-node-id="1584:78958"'), snapshot.indexOf('data-node-id="1535:38911"'));
  const lists = [...section.matchAll(/<ol className=\{styles\.frame196\}>([\s\S]*?)<\/ol>/g)].map((match) => match[1]);
  assert.equal(lists.length, 2);
  assert.deepEqual(lists.map((list) => [...list.matchAll(/<li /g)].length), [3, 5]);
  assert.deepEqual(lists.map((list) => [...list.matchAll(/(\d+)%/g)].map((match) => match[1])), [["55", "45", "42"], ["55", "54", "54", "53", "53"]]);
  assert.match(figmaStyles, /\.body \.frame196 \{ padding-left:24px; list-style:decimal outside; font-size:16px; line-height:28px; \}/);
  assert.match(section, /The most adopted AI-enabled capabilities were concentrated/);
  assert.match(section, /listening leaders were most considering or planning are/);
  assert.match(section, /shaping <strong>how<\/strong> the listening system/);
  assert.equal([...section.slice(0, section.indexOf("Once adopted")).matchAll(/<sup className=\{styles\.frame7\}/g)].length, 2);
});

test("priority labels preserve the canonical DEI conjunction and source-note style", () => {
  assert.match(prioritySource, /topic\.name\.startsWith\("Diversity, equity,"\) \? topic\.name :/);
  assert.match(priorityStyles, /\.prioritySourceNote \{[^}]*font-style: italic;/);
  assert.match(snapshot, /employee feedback<sup>2<\/sup>\. Low participation/);
  assert.doesNotMatch(snapshot, /employee feedback2\./);
  assert.match(snapshot, /communicating what changed<sup>1<\/sup>/);
});

test("trust quote follows the current canonical anonymized attribution and source citation", () => {
  assert.match(snapshot, /The worst thing is that you listen to your employees and do nothing\. People will stop participating because they see that nothing happens\./);
  assert.match(snapshot, /Division Human Resources Director \/ Manufacturing<sup>3<\/sup>/);
  assert.doesNotMatch(snapshot, /NEED PERMISSION FROM CUSTOMER \/ Rio Tinto/);
});

test("canonical report primary navigation remains fixed to the viewport", () => {
  assert.match(navigationStyles, /\.navigation \{[^}]*position: fixed;/);
});

test("all eight decorative quote marks use the exact local Figma vector rather than an installed font", () => {
  assert.match(figmaStyles, /\.frame47 \{[^}]*height:26px;[^}]*font-size:0;[^}]*width:27px;/);
  assert.match(figmaStyles, /\.frame47::before \{[^}]*width:27px;height:26px;background:currentColor;mask:url\("\/figma\/annual-canonical\/quote-mark\.svg"\) center no-repeat;forced-color-adjust:none;/);
  assert.match(figmaStyles, /@media \(forced-colors: active\) \{[^}]*\}[^}]*\.body \.frame47::before \{ background:CanvasText; \}/);
  assert.equal([...snapshot.matchAll(/className=\{styles\.frame47\}/g)].length, 8);
  const mark = readFileSync(new URL("../../public/figma/annual-canonical/quote-mark.svg", import.meta.url), "utf8");
  assert.match(mark, /<svg width="27" height="26" viewBox="0 0 27 26"/);
  assert.match(mark, /<path /);
  assert.doesNotMatch(mark, /<text|font-family|(?:href|src)="https?:/);
});

test("the approved LSEG quotation preserves the supplied wording and named white attribution", () => {
  const quote = snapshot.slice(snapshot.indexOf('data-node-id="1584:78682"'), snapshot.indexOf('data-node-id="1451:11489"'));
  assert.match(quote, /The rate of change across our organisation and the markets we operate in means employee experience cannot be understood through periodic snapshots alone\. We need a more continuous understanding of what employees are experiencing as change unfolds\./);
  assert.match(quote, /<p className=\{styles\.frame49\}[^>]*>\s*Jasdeep Kareer \/ Director, People Insights Strategy<br \/>\s*London Stock Exchange Group/);
  assert.doesNotMatch(quote, /pendingApproval|pending approval|The pace of transformation/);
  assert.match(figmaStyles, /\.frame49 \{[^}]*color:#fff;/);
});

test("the approved Technology quotation matches the final canonical wording and white cited attribution", () => {
  const quote = snapshot.slice(snapshot.indexOf('data-node-id="1584:78694"'), snapshot.indexOf('data-node-id="1535:39511"'));
  assert.ok(quote.includes("Maybe we jumped from zero to 100 too quickly. Maybe it was just too much change and it was like, ‘Wow, why are all these surveys coming through?’ [...] The way we'd set it up, [...] it was really tricky to do. So we thought, if we’re not actioning the data, let’s not continue "));
  assert.match(quote, /<span className=\{styles\.quoteEnding\}>with always-on\.<\/span>/);
  assert.match(figmaStyles, /\.quoteEnding \{ white-space:nowrap; \}/);
  assert.match(quote, /className=\{styles\.frame70\}[^>]*>\s*<span[^>]*>Senior Employee Engagement Lead \/ Technology<\/span>\s*<sup[^>]*>\s*3\s*<\/sup>/);
  assert.doesNotMatch(quote, /pendingApproval|pending approval/);
  assert.match(figmaStyles, /\.frame70 \{[^}]*color:#fff;/);
});

test("the approved Caribay quote replaces the withdrawn placeholder in the AI section", () => {
  const start = snapshot.indexOf('data-node-id="1535:38911"');
  const end = snapshot.indexOf('data-node-id="1451:11988"');
  assert.ok(start > snapshot.indexOf('id="annual-section-7"'));
  assert.ok(end > start);
  const quote = snapshot.slice(start, end);
  assert.match(quote, /<h3 className=\{styles\.frame80\}>Putting human judgment at the forefront<\/h3>/);
  assert.ok(quote.includes("As AI takes on more of the mechanics of listening, human judgment becomes critical in asking harder questions: Why do we listen this way? Which practices are grounded in good science, and which are simply habits? What problems can we now solve that we couldn't before?"));
  assert.match(quote, /<blockquote className=\{styles\.frame43\}>/);
  assert.match(quote, /<p className=\{styles\.frame83\}>\s*Caribay Garcia \/ Head of People Science<br \/>\s*Microsoft\s*<\/p>/);
  assert.match(snapshot, /className=\{styles\.frame87\} data-node-id="1535:38911"/);
  assert.doesNotMatch(snapshot, /General topic is that team collaboration|Potentially connect to our earlier agentic teaming work/);
  assert.doesNotMatch(snapshot, /Caribay Garcia \/ Head of People Science at Microsoft \(pending approval\)/);
  assert.doesNotMatch(snapshot, /styles\.pendingApproval/);
  assert.match(snapshot, /For listening teams, the question to tackle is where AI can help them understand employee needs/);
  assert.match(snapshot, /<h5>Caribay Garcia, PhD<\/h5>/);
  assert.doesNotMatch(snapshot, />PLACEHOLDER</);
  assert.equal([...snapshot.matchAll(/<blockquote\b/g)].length, 8);
});

test("some exposure uses the blue accent outline without changing its grid or yellow dots", () => {
  assert.match(themeStyles, /--annual-accent: #5c8df8;/);
  assert.match(snapshot, /className=\{styles\.frame124\} data-node-id="1581:67763"/);
  assert.match(figmaStyles, /\.body \.frame124 \{ border:0; padding:3\.75px; box-shadow:inset 0 0 0 0\.75px var\(--annual-accent\); \}/);
  assert.match(figmaStyles, /\.frame124 \{ border-width:0\.75px;border-color:var\(--annual-accent\);[^}]*gap:1\.5px;[^}]*padding:3px;[^}]*border-radius:6px;/);
  assert.match(figmaStyles, /\.frame125 \{ background:var\(--annual-highlight\);[^}]*width:3px;height:3px;/);
});

test("broad exposure keeps the dot grid with blue outer rows and the central yellow band", () => {
  assert.match(snapshot, /className=\{`\$\{styles\.frame116\} \$\{styles\.broadExposure\}`\} data-node-id="1581:68194"/);
  assert.match(figmaStyles, /\.broadExposure \.frame117:is\(:nth-child\(-n\+4\),:nth-child\(n\+11\)\) \.frame125 \{ background:var\(--annual-rule\); \}/);
  assert.match(figmaStyles, /\.frame125 \{ background:var\(--annual-highlight\);[^}]*width:3px;height:3px;/);
});

test("the Microsoft quote attribution places the organization on a separate line", () => {
  assert.match(snapshot, /<p className=\{styles\.frame83\}[^>]*>\s*Katie Kirkpatrick-Husk \/ Director of People Analytics<br \/>\s*Microsoft\s*<\/p>/);
  assert.match(snapshot, /Our ambition is to move from a calendar of surveys to a listening experience that connects over time\./);
  assert.match(snapshot, /letting employees decide when to engage, skip, or pause\./);
});

test("the complete decision authority matrix retains native headers and the desktop layout without a scroller", () => {
  assert.match(figmaStyles, /\.tableScroller \{ width:100%; container-type:inline-size; \}/);
  assert.match(figmaStyles, /\.responsibility \{[^}]*width:100%; margin:0; table-layout:fixed;/);
  assert.match(figmaStyles, /\.responsibility th:first-child \{[^}]*width:38%;/);
  assert.match(figmaStyles, /\.responsibility tbody tr \{ height:56px; \}/);
  assert.match(figmaStyles, /\.responsibility tbody th, \.responsibility td \{[^}]*padding:6px 12px;/);
  assert.match(figmaStyles, /\.responsibility :is\(th,td\) \{ overflow-wrap:anywhere; \}/);
  assert.doesNotMatch(snapshot, /className=\{styles\.tableScroller\} tabIndex/);
  assert.doesNotMatch(figmaStyles, /^\.responsibility \{[^}]*(?:min-width:684px|margin:-12px|width:calc)/m);
  assert.match(snapshot, /<table className=\{styles\.responsibility\} aria-labelledby="decision-authority-caption">/);
  assert.equal([...snapshot.matchAll(/<th scope="col">/g)].length, 4);
  assert.equal([...snapshot.matchAll(/<th scope="row">/g)].length, 3);
  assert.equal([...snapshot.matchAll(/<td data-level=/g)].length, 9);
});

test("the mobile topics matrix follows the Figma spacing and lets topic labels determine row height", () => {
  const mobile = figmaStyles.slice(figmaStyles.indexOf("@container (max-width:480px)"), figmaStyles.indexOf("/* Decoration bleed"));
  assert.match(mobile, /\.responsibility \{ border-spacing:8px 10px; width:calc\(100% \+ 16px\); margin:-10px -8px; font-size:12px; line-height:16px; \}/);
  assert.match(mobile, /\.responsibility th:first-child \{ width:28%; text-align:center; \}/);
  assert.match(mobile, /\.responsibility thead th \{ padding:8px; font-size:12px; line-height:16px; \}/);
  assert.match(mobile, /\.responsibility tbody tr \{ height:auto; \}/);
  assert.match(mobile, /\.responsibility tbody th \{ padding:8px; border-radius:10px; \}/);
  assert.match(mobile, /\.responsibility td \{ padding:4px; border-radius:10px; \}/);
  assert.match(mobile, /\.matrixHeader \{ flex-direction:column; \}/);
  assert.match(figmaStyles, /@media \(max-width:600px\) \{\s*\.body \.frame148 \{ padding:28px 24px; gap:32px; \}\s*\.body \.frame149 \{ text-align:center; \}/);
  assert.match(figmaStyles, /@media \(max-width:360px\) \{\s*\.body \.frame148 \{ padding-inline:8px; \}\s*\.responsibility td \{ padding-inline:2px; \}/);
});

test("light and dark navigation brands share reviewed spacing while preserving the dark divider color", () => {
  assert.match(navigationStyles, /\.brand \{ gap: 20px; padding: 8px 16px; font-weight: 600; \}/);
  assert.doesNotMatch(navigationStyles, /\.annualReport \.brand \{/);
  assert.match(navigationStyles, /\.annualReport \.brandDivider \{ background: #3d3d3d; \}/);
});

test("navigation keeps the light hover subtle and makes the dark-report hover clearer without losing keyboard focus", () => {
  assert.match(navigationStyles, /\.core \.link:hover \{ background: rgb\(0 0 0 \/ 2\.5%\); \}/);
  assert.match(navigationStyles, /\.annualReport \.link:hover \{ background: rgb\(255 255 255 \/ 10%\); \}/);
  assert.match(navigationStyles, /\.annualReport \.brand:hover \{ background: color-mix\(in srgb, var\(--annual-canvas\), #fff 6%\); \}/);
  assert.doesNotMatch(navigationStyles, /\.link:hover \{[^}]*(?:box-shadow|border|outline):/);
  assert.match(navigationStyles, /\.link:focus-visible \{ outline: 3px solid var\(--site-focus\); outline-offset: 3px; \}/);
  assert.match(navigationStyles, /\.annualReport \.link:focus-visible \{ outline-color: var\(--annual-focus\); \}/);
});

test("light navigation uses a thinner glass highlight without changing the dark-report edge", () => {
  assert.match(navigationStyles, /\.navigation \{[^}]*box-shadow: inset 0\.5px 0\.5px rgb\(255 255 255 \/ 65%\);/);
  assert.match(navigationStyles, /\.annualReport \{[^}]*box-shadow: inset 1px 1px rgb\(255 255 255 \/ 18%\);/);
  assert.match(navigationStyles, /backdrop-filter: blur\(12px\);/);
});

test("navigation keeps 16px button corners concentric with the inset outer container", () => {
  const heroStyles = readFileSync(new URL("../app/_components/annual-study-hero.module.css", import.meta.url), "utf8");
  assert.match(heroStyles, /\.action \{[^}]*border-radius: 16px;/);
  assert.match(navigationStyles, /\.link \{[^}]*border-radius: 16px;/);
  assert.match(navigationStyles, /\.navigation \{[^}]*padding: 9px;[^}]*border: 1px solid[^}]*border-radius: 26px;/);
  for (const selector of [".navigation:not(.reportPreview)", ".reportPreview"]) {
    assert.ok(navigationStyles.includes(`${selector} { display: block; top: 16px; width: calc(100% - 32px); min-height: 58px; padding: 6px; border-radius: 23px; }`));
  }
});

test("mobile navigation uses a single branded row and an accessible disclosure in both preview layouts", () => {
  const navigation = readFileSync(new URL("../app/_components/site-navigation.tsx", import.meta.url), "utf8");
  assert.match(navigation, /aria-controls=\{menuId\}/);
  assert.match(navigation, /aria-expanded=\{isMenuOpen\}/);
  assert.match(navigation, /aria-label=\{isMenuOpen \? "Close menu" : "Open menu"\}/);
  assert.match(navigation, /navigation\?\.ownerDocument/);
  assert.match(navigation, /event\.currentTarget\.contains\(event\.relatedTarget/);
  assert.match(navigationStyles, /\.headerRow \{ display: contents; \}/);
  assert.match(navigationStyles, /\.menuToggle \{ display: none; width: 44px; min-height: 44px;/);
  for (const selector of [".navigation:not(.reportPreview)", ".reportPreview"]) {
    assert.ok(navigationStyles.includes(`${selector} .headerRow { display: flex; align-items: center; justify-content: space-between;`));
    assert.ok(navigationStyles.includes(`${selector} .items { display: none; flex-direction: column;`));
    assert.ok(navigationStyles.includes(`${selector}[data-menu-open] .items { display: flex; }`));
  }
  assert.doesNotMatch(navigationStyles, /flex-wrap: wrap/);
});

test("Studio wide preview shares the published report hero content boundary", () => {
  const rendererStyles = readFileSync(new URL("../report-system/report-renderer.module.css", import.meta.url), "utf8");
  assert.match(rendererStyles, /\.report\[data-report-mode="read"\]:not\(\.annualReport\) \.cover,\s*\.report\.viewportPreview:not\(\.annualReport\) \.cover \{\s*width: 100%;\s*padding-inline: max\(40px, calc\(50% - 570px\)\);/);
});

test("Studio site destinations are inert while the public site retains real links", () => {
  const navigation = readFileSync(new URL("../app/_components/site-navigation.tsx", import.meta.url), "utf8");
  assert.match(navigation, /preview \? \(\s*<span aria-disabled="true" className=\{`\$\{styles\.link\} \$\{styles\.brand\}`\} role="link">/);
  assert.match(navigation, /\.map\(\(\{ href, label \}\) => preview \? \(\s*<span aria-disabled="true" className=\{styles\.link\} key=\{href\} role="link">/);
  assert.match(navigation, /<HeroTransitionLink[\s\S]*?href="\/"/);
  assert.match(navigation, /<Link className=\{styles\.link\} href=\{href\}/);
});

test("Studio report lists use native bullets in every shared template without decorative arrows", () => {
  const renderer = readFileSync(new URL("../report-system/report-renderer.tsx", import.meta.url), "utf8");
  const rendererStyles = readFileSync(new URL("../report-system/report-renderer.module.css", import.meta.url), "utf8");
  assert.doesNotMatch(renderer, /ArrowTrending/);
  assert.match(renderer, /className=\{`\$\{styles\.list\} \$\{briefHeadingLevel === undefined \? "" : styles\.briefList\}/);
  assert.match(rendererStyles, /\.list \{[^}]*list-style: disc;/);
  assert.match(rendererStyles, /\.list \{[^}]*padding: 0 0 0 20px;[^}]*border: 0;[^}]*background: transparent;/);
  assert.match(rendererStyles, /\.briefList \{[^}]*gap: 10px;[^}]*margin: 0;[^}]*padding: 0 0 0 24px;[^}]*color: #000;[^}]*font-weight: 400;[^}]*line-height: 22px;/);
  assert.match(rendererStyles, /\.briefCard \{[^}]*padding: 28px 24px;[^}]*border: 1px solid #eef3ff;[^}]*border-radius: 16px;[^}]*background: #fff;/);
  assert.match(rendererStyles, /\.briefCard > \.sectionStart \{[^}]*padding: 0;[^}]*margin: 0;[^}]*border: 0;/);
  assert.match(rendererStyles, /\.list li \{[^}]*display: list-item;/);
  assert.match(rendererStyles, /\.list li \{[^}]*padding: 0;/);
  assert.match(rendererStyles, /\.annualReport \.briefList \{[^}]*color: var\(--report-text\);/);
  assert.match(rendererStyles, /\.report \.briefHeading \{[^}]*margin: 0 0 10px;[^}]*font-family: var\(--site-content-font\);[^}]*font-size: 16px;[^}]*font-variation-settings: "opsz" 36;[^}]*font-weight: 600;[^}]*line-height: 22px;/);
  assert.match(renderer, /marginInlineStart: `\$\{item\.level \* 1\.25\}rem`/);
});

test("Research Drops show author names without aliases on desktop and mobile", () => {
  const renderer = readFileSync(new URL("../report-system/report-renderer.tsx", import.meta.url), "utf8");
  const sideNavStyles = readFileSync(new URL("../report-system/report-side-nav.module.css", import.meta.url), "utf8");
  assert.doesNotMatch(renderer, /authorHandle=|author\.handle|@megan_benzing/);
  assert.match(renderer, /authorName=\{author\.name\}/);
  assert.match(renderer, /<span>\{author\.name\}<\/span>/);
  assert.match(sideNavStyles, /\.author span:last-child:not\(:first-child\) \{/);
  assert.doesNotMatch(sideNavStyles, /\.author span:last-child \{/);
});

test("Studio research reports share a white canvas without restyling the Annual Report", () => {
  const css = readFileSync(new URL("../report-system/report-renderer.module.css", import.meta.url), "utf8");
  assert.match(css, /\.report \{[^}]*--report-canvas: #fff;[^}]*background: var\(--report-canvas\);/);
  assert.doesNotMatch(css, /\.newFluentColors \{[^}]*--report-canvas:/);
  assert.match(css, /\.annualReport \{[^}]*--report-canvas: #070708;/);
});

test("Drop references reuse the Annual Report bookmark and quieter type without a dark panel", () => {
  const css = readFileSync(new URL("../report-system/report-renderer.module.css", import.meta.url), "utf8");
  assert.match(css, /\.report \.referencesHeading \{[^}]*gap: 10px;[^}]*font-family: var\(--site-content-font\);[^}]*font-size: 16px;[^}]*font-weight: 420;[^}]*line-height: 22px;/);
  assert.match(css, /\.referencesHeading::before \{[^}]*width: 20px;[^}]*height: 20px;[^}]*interaction-bookmark\.svg/);
  assert.match(css, /\.referencesBlock \.paragraph,\s*\.referencesList \{[^}]*margin-bottom: 16px;[^}]*font-size: 12px;[^}]*font-weight: 420;[^}]*line-height: 18px;/);
  assert.match(css, /\.referencesBlock \.paragraph a,\s*\.referencesList a \{\s*font-weight: inherit;/);
  assert.match(css, /\.referenceMarker \{[^}]*line-height: 0;[^}]*vertical-align: super;/);
  assert.doesNotMatch(css, /\.references(?:Block|List|Heading)[^{]*\{[^}]*background:\s*(?:#000|black)/);
});

test("Studio leave dialog has one hairline divider and a subtle destructive action", () => {
  const studioStyles = readFileSync(new URL("../app/_components/publishing-studio.module.css", import.meta.url), "utf8");
  const studio = readFileSync(new URL("../app/_components/publishing-studio.tsx", import.meta.url), "utf8");
  assert.match(studioStyles, /\.leaveDialog \.publishDialogHeader \{\s*border-bottom: 0;/);
  assert.match(studioStyles, /\.publishDialogFooter \{[^}]*border-top: 1px solid var\(--border\);/);
  assert.match(studioStyles, /\.leaveWithoutSaving \{[^}]*color: var\(--danger\);[^}]*background: var\(--danger-background\);/);
  assert.match(studioStyles, /\.leaveWithoutSaving:hover:not\(:disabled\) \{[^}]*color: var\(--danger\);[^}]*background: color-mix\(in srgb, var\(--danger\) 10%, var\(--studio-surface\)\);/);
  assert.match(studio, /className=\{`\$\{styles\.secondaryAction\} \$\{styles\.leaveWithoutSaving\}`\}[\s\S]*?onClick=\{returnToStart\}/);
});

test("report side navigation keeps passed sections highlighted alongside the current section using colors only", () => {
  const sideNavStyles = readFileSync(new URL("../report-system/report-side-nav.module.css", import.meta.url), "utf8");
  assert.match(sideNavStyles, /\.sections a\[aria-current="location"\],\s*\.sections a\.pastSection \{\s*color: var\(--site-profile-icon, #3f66d1\);\s*\}/);
  assert.match(sideNavStyles, /\.dark \.sections a\[aria-current="location"\],\s*\.dark \.sections a\.pastSection \{\s*color: var\(--annual-accent, #9299f7\);/);
  assert.match(sideNavStyles, /\.sections a \{\s*color: #000;/);
  assert.match(sideNavStyles, /\.dark \.sections a \{\s*color: #f6f6f8;/);
  const sideNav = readFileSync(new URL("../report-system/report-side-nav.tsx", import.meta.url), "utf8");
  assert.match(sideNav, /index < activeSectionIndex \? styles\.pastSection : undefined/);
  assert.doesNotMatch(sideNavStyles, /(?:color-mix|inset 3px|font-weight: 600|padding: 6px|border-inline-start)/);
  assert.match(sideNavStyles, /\.sections a:focus-visible \{[^}]*outline: 3px solid var\(--focus\);/);
});

test("Research Drop hero titles match Home's scale without changing the Annual Report", () => {
  const rendererStyles = readFileSync(new URL("../report-system/report-renderer.module.css", import.meta.url), "utf8");
  const homeHeroStyles = readFileSync(new URL("../app/_components/annual-study-hero.module.css", import.meta.url), "utf8");
  assert.match(homeHeroStyles, /\.copy > h1 \{[^}]*font: 420 48px\/59px/);
  assert.match(homeHeroStyles, /@media \(max-width: 600px\)[\s\S]*font-size: 40px; line-height: 48px;/);
  assert.match(rendererStyles, /\.report:not\(\.annualReport\) \.coverTitle \{\s*font-size: 48px;\s*line-height: 59px;/);
  assert.match(rendererStyles, /@container report \(max-width: 600px\) \{\s*\.report:not\(\.annualReport\) \.coverTitle \{\s*font-size: 40px;\s*line-height: 48px;/);
});

test("annual report sticky side navigation keeps 60px of clearance above the footer", () => {
  assert.match(shellStyles, /\.rail \{ position: sticky; top: 32px; padding-top: 96px; padding-bottom: 60px; \}/);
  assert.match(shellStyles, /\.rail \{ position: relative; padding-top: 32px; padding-bottom: 0; top: auto; \}/);
});

test("canonical hero and navigation do not amplify the source colors", () => {
  assert.match(navigationStyles, /\.navigation \{[^}]*backdrop-filter: blur\(12px\);/);
  assert.match(navigationStyles, /\.annualReport \.link \{[^}]*background: var\(--annual-canvas\);/);
  assert.doesNotMatch(shellStyles, /\.heroGlow(?:Top|Right) \{[^}]*filter:/);
});

test("canonical hero grid keeps transparency so its image boundary cannot create a seam", () => {
  const grid = readFileSync(new URL("../../public/figma/annual-canonical/shell-grid-browser.webp", import.meta.url));
  assert.equal(grid.subarray(12, 16).toString("ascii"), "VP8L");
  assert.equal(grid[20], 0x2f);
  assert.equal((grid.readUInt32LE(21) >>> 28) & 1, 1);
});

test("canonical preview preserves the screenshot-supplied capability distribution, including zeros", () => {
  assert.deepEqual(capabilityRatings, ["Poor", "Fair", "Good", "Strong", "Best in class"]);
  assert.deepEqual(listeningCapabilities.map((row) => [...row.percentages]), [
    [1.9, 10.7, 37.9, 46.6, 2.9],
    [5.8, 15.5, 51.5, 27.2, 0],
    [3.9, 18.4, 48.5, 29.1, 0],
    [4.9, 28.2, 51.5, 15.5, 0],
  ]);
  assert.equal(listeningCapabilities.flatMap((row) => row.criteria).length, 12);
  assert.match(listeningCapabilities[1].criteria[1], /timely action/);
  assert.ok(listeningCapabilities.every((row) => Math.abs(row.percentages.reduce<number>((sum, value) => sum + value, 0) - 100) <= 0.10001));
  assert.match(interactionSource, /data-node-id="1591:2722"/);
  assert.match(interactionSource, /className=\{styles\.distributionTrack\}/);
  assert.match(interactionSource, /className=\{styles\.distributionLabel\}/);
  assert.match(interactionSource, /width: `\$\{capability\.percentages\[ratingIndex\]\}%`/);
  assert.match(interactionSource, /selections\[index\] !== null \? \(/);
  assert.match(interactionSource, /Sampled audience/);
  assert.doesNotMatch(interactionSource, /Sample rating colors/);
});

test("listening approach keys keep compact desktop rows and vertically centered mobile touch targets", () => {
  assert.match(interactionStyles, /\.momentumKey button \{[^}]*align-items: baseline;[^}]*min-height: 30px;[^}]*padding: 4px 10px;/);
  const mobileStyles = interactionStyles.split("@media (max-width: 600px) {")[1]?.split("@media")[0];
  assert.ok(mobileStyles);
  assert.match(mobileStyles, /\.momentumKey button \{ align-items: center; min-height: 44px; \}/);
});

test("listening portfolio matches the revised Figma plot geometry, axes and selection", () => {
  assert.match(interactionSource, /data-node-id="1732:40598"/);
  assert.match(interactionSource, /const momentumPositions = \[\[228, 99\], \[120, 139\], \[97, 279\], \[272, 127\], \[32, 127\], \[288, 208\], \[89, 378\], \[499, 364\]\]/);
  assert.match(interactionSource, /const momentumUseTicks = \[100, 90, 80, 70\]/);
  assert.match(interactionSource, /const momentumExpansionTicks = \[0, 10, 20, 30, 40, 50, 60\]/);
  assert.match(interactionSource, /\(momentumPositions\[index\]\[0\] - 1\) \/ 603 \* 100/);
  assert.match(interactionSource, /Net expansion \(percentage points\)/);
  assert.match(interactionSource, /The highlighted point marks the selected example\./);
  assert.match(interactionSource, /className=\{styles\.momentumFooter\}>Current use represents/);
  assert.match(interactionSource, /91\.7% current use and \+17\.5 percentage points net expansion/);
  assert.doesNotMatch(interactionSource, /Megan to write the footer/);
  assert.match(interactionStyles, /\.momentumPanel \{[^}]*max-width: 752px;/);
  assert.match(interactionStyles, /\.momentumChart \{[^}]*grid-template-columns: 55px minmax\(0, 1fr\);/);
  assert.match(interactionStyles, /\.momentumKey \{[^}]*margin-top: -8px;/);
  assert.match(interactionStyles, /\.quadrants \{[^}]*grid-template-columns: 30\.6% 1fr;[^}]*grid-template-rows: 35\.58% 1fr;/);
  assert.match(interactionStyles, /\.point\[aria-pressed="true"\] \{[^}]*background: var\(--annual-highlight\);/);
  assert.match(interactionStyles, /\.momentumKey button\[aria-pressed="true"\] \{ border-color: #636672; background: var\(--annual-popover\); \}/);
});

test("listening portfolio details use the revised card and canonical proportional values", () => {
  assert.match(interactionStyles, /\.pointDetails \{[^}]*gap: 24px;[^}]*border: 1px solid #636672;[^}]*background: var\(--annual-popover\);/);
  assert.match(interactionStyles, /\.pointDetailsIntro \{[^}]*gap: 4px;/);
  assert.match(interactionStyles, /\.pointSummary div \{[^}]*gap: 8px;/);
  assert.match(interactionStyles, /\.pointSummary div \{[^}]*padding: 12px 16px;[^}]*border: 1px solid #9fafc3;[^}]*border-radius: 10px;/);
  assert.match(interactionStyles, /\.pointSummary dd \{[^}]*height: 20px;[^}]*border: 1px solid #9fafc3;/);
  for (const [name, color] of [["1", "#5f82f2"], ["2", "#7eaba7"], ["3", "#a79bcc"], ["4", "#dec98f"]]) {
    assert.ok(interactionStyles.includes(`--annual-response-${name}: ${color};`));
  }
  for (const name of ["momentum-dismiss", "momentum-add"]) {
    assert.match(interactionSource, new RegExp(`asset\\("${name}"\\)`));
    const svg = readFileSync(new URL(`../../public/figma/annual-canonical/interaction-${name}.svg`, import.meta.url), "utf8");
    assert.match(svg, /<svg[^>]*width="16"[^>]*height="16"/);
  }
  assert.match(interactionSource, /<dt>Use<\/dt><dd>\{formatPercentage\(points\[selected\]\.use\)\}/);
  assert.match(interactionSource, /aria-hidden="true">Net expansion<\/span>/);
  assert.match(interactionSource, /formatPercentage\(points\[selected\]\.percentages\[index\]\)/);
  assert.match(interactionSource, /width: `\$\{points\[selected\]\.percentages\[index\]\}%`/);
  assert.match(interactionSource, /points\[selected\]\.counts\[index\]/);
});

test("listening portfolio popouts keep the approved example-led descriptions", () => {
  assert.deepEqual(listeningPortfolio.map((approach) => approach.description), [
    "e.g., annual survey from HR or leadership",
    "e.g., from manager or change leader",
    "e.g., event-triggered surveys, post-meeting prompts",
    "e.g., onboarding, exit, promotion",
    "e.g., focus groups, structured interviews",
    "e.g., event-triggered surveys, post-meeting prompts",
    "e.g., collaboration signals, productivity data",
    "e.g., AI assistants that proactively solicit feedback through conversation",
  ]);
  assert.match(interactionSource, /<p className=\{styles\.pointExample\}>\{points\[selected\]\.description\}<\/p>/);
});

test("continuous listening dialog preserves the revised explanatory hierarchy and colors", () => {
  assert.match(interactionSource, /aria-describedby=\{descriptionId\}/);
  assert.match(interactionSource, /When asked to define &quot;continuous listening&quot;, listening/);
  assert.match(interactionSource, /leaders provided descriptions that ranged the <br className=\{styles\.dialogDescriptionBreak\} \/>\s+following topics\./);
  assert.match(interactionSource, /styles\.dialog\} \$\{styles\.continuousListeningDialog/);
  assert.match(interactionStyles, /\.continuousListeningDialog \.dialogHeading \{[^}]*grid-template-columns: minmax\(0, 1fr\) 24px;[^}]*gap: 16px 20px;[^}]*padding-bottom: 20px;/);
  assert.match(interactionStyles, /\.continuousListeningDialog \.dialogSubtext \{ grid-column: 1 \/ -1; \}/);
  assert.match(interactionStyles, /\.continuousListeningDialog > section \{ max-width: none; \}/);
  assert.match(interactionStyles, /\.dialog article img \{[^}]*margin-top: 4px;/);
  assert.match(interactionStyles, /\.dialogHeading h2 \{[^}]*color: #fff;[^}]*font-size: 24px;/);
  assert.match(interactionStyles, /\.dialog \{[^}]*width: min\(946px, calc\(100% - 32px\)\);/);
  assert.match(interactionStyles, /\.dialogSubtext \{[^}]*color: #fff;/);
  assert.match(interactionStyles, /\.dialog article h3 \{[^}]*color: #fff;/);
  assert.match(interactionStyles, /\.dialog article p \{[^}]*color: #fff;/);
  for (const icon of ["flow", "connected", "pulse", "chess", "chat"]) {
    const svg = readFileSync(new URL(`../../public/figma/annual-canonical/interaction-${icon}.svg`, import.meta.url), "utf8");
    assert.match(svg, /fill="#A79BCC"/);
  }
  const definitions = readFileSync(new URL("./annual-report-components.tsx", import.meta.url), "utf8");
  assert.match(definitions, /\["flow", "connected", "pulse", "pulse", "chess", "chat"\]/);
  assert.match(definitions, /title: "Multichannel"/);
  assert.match(definitions, /\[57, 49, 38, 32, 30, 27\]/);
});

test("priority chart keeps its instruction in every canonical filter state", () => {
  assert.match(prioritySource, /Choose a category to see how priorities are changing\./);
  assert.match(prioritySource, /Top five upcoming priorities/);
  assert.match(prioritySource, /"Topic \/ rank"/);
  assert.match(prioritySource, /aria-label=\{`Upcoming priority rank \$\{topic\.future\}`\}>\{topic\.future\}/);
  assert.match(priorityStyles, /grid-template-columns: minmax\(0, 369fr\) minmax\(0, 160fr\) 97px; gap: 22px;/);
  assert.match(priorityStyles, /\.priorityVisual\[data-canonical-priorities\] \.priorityHeader > div \{ gap: 4px; \}/);
});

test("priority badges share their movement accent with the internal divider", () => {
  assert.match(priorityStyles, /\.priorityChange \{ --priority-accent: #fff;[^}]*border: 1px solid var\(--priority-accent\);/);
  assert.match(priorityStyles, /\[data-movement="rise"\] \.priorityChange \{ --priority-accent: var\(--annual-priority-rise\); \}/);
  assert.match(priorityStyles, /\[data-movement="fall"\] \.priorityChange \{ --priority-accent: var\(--annual-priority-fall\); \}/);
  assert.match(priorityStyles, /\.priorityJourney \{[^}]*border-left: 1px solid var\(--priority-accent\);/);
});

test("right-fit principle labels use canonical padding and corner radius", () => {
  assert.match(diagramStyles, /\.principle h4, \.center h4 \{[^}]*padding: 4px 12px;[^}]*border-radius: 8px;/);
  for (const label of ["Trustworthy", "Intelligent", "Outcome-driven", "Responsive", "Embedded"]) assert.ok(diagrams.includes(label));
  assert.match(diagrams, /The goal is not maximum listening\. It is enough credible understanding to support a consequential choice\./);
});

test("the survey expansion citation uses the canonical small superscript before the sentence punctuation", () => {
  assert.match(snapshot, /25% are even expanding them<sup className=\{styles\.frame7\} style=\{\{ fontVariationSettings: '"opsz" 8' \}\}>1<\/sup>\. The goal is not to dethrone the survey\./);
  assert.match(figmaStyles, /\.frame7 \{[^}]*font-size:10\.32px;/);
  assert.doesNotMatch(snapshot, /expanding them1\./);
});

test("report citations align to the text top without enlarging line spacing", () => {
  assert.match(figmaStyles, /\.body sup \{ position:relative; top:-0\.55em; vertical-align:baseline; line-height:0; \}/);
  assert.match(interactionStyles, /\.dialog sup, \.panel sup \{ position: relative; top: -0\.55em; font-size: 0\.65em; line-height: 0; vertical-align: baseline; \}/);
});

test("canonical source has eight unique report sections in order and retains illustrative source notes", () => {
  const headings = [...snapshot.matchAll(/<h2 [^>]*id="annual-section-(\d)"[^>]*>\s*([^<]+)</g)];
  assert.deepEqual(headings.map((match) => Number(match[1])), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(headings[0][2].trim(), "Listening at the speed of change");
  assert.equal(headings[7][2].trim(), "Lead the system, not the survey");
  assert.doesNotMatch(snapshot, /ADD THIS IS ILLUSTRATIVE/);
  assert.match(snapshot, /Illustrative allocation of decision authority, not a survey finding/);
  assert.equal(canonicalReportSource.defaultNode, "1584:78960");
  assert.match(snapshot, /<ListeningPriorityShift canonical\s*\/>/);
});

test("the sidebar matches every current page section heading in order and preserves the retired deep link", () => {
  const sections = snapshot.match(/export const canonicalSections = (\[[\s\S]*?\n\]);/)?.[1];
  assert.ok(sections);
  const headings = [...snapshot.matchAll(/<h2 [^>]*id="(annual-section-\d+)"[^>]*>([\s\S]*?)<\/h2>/g)];
  assert.equal(headings.length, 8);
  assert.deepEqual(JSON.parse(sections), headings.map(([, id, content]) => ({
    href: `#${id}`,
    label: content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  })));
  assert.match(snapshot, /<p className=\{styles\.frame195\} id="annual-human-judgment" tabIndex=\{-1\}>/);
});

test("canonical headings contain phrasing content rather than nested paragraphs", () => {
  assert.doesNotMatch(snapshot, /<h[1-6][^>]*>\s*<p\b/);
});

test("the top three forces use a numbered list with the source percentages and citation", () => {
  assert.match(snapshot, /<strong>top three forces<\/strong>/);
  const list = snapshot.match(/<ol className=\{styles\.forcesList\}>([\s\S]*?)<\/ol>/)?.[1];
  assert.ok(list);
  assert.equal([...list.matchAll(/<li>/g)].length, 3);
  assert.equal([...list.matchAll(/63% selected/g)].length, 2);
  assert.match(list, /61% selected<\/li>/);
  assert.match(snapshot, /strategy were<sup[^>]*>1<\/sup>:/);
  assert.match(figmaStyles, /\.body \.forcesList \{[^}]*list-style:decimal outside;/);
});

test("canonical static illustrations are downloaded assets, never expiring runtime Figma URLs", () => {
  const assets = [
    ...snapshot.matchAll(/src="(\/figma\/annual-canonical\/[^"]+)"/g),
    ...[...snapshot.matchAll(/illustration\("([^"]+)", "([^"]+)"\)/g)].flatMap(([, old, blue]) => [
      ["", `/figma/annual-canonical/${old}.svg`], ["", `/figma/annual-blue/${blue}.svg`],
    ]),
  ];
  assert.ok(assets.length > 20);
  for (const [, path] of assets) {
    assert.ok(existsSync(fileURLToPath(new URL(`../..${path.replace("/figma/", "/public/figma/")}`, import.meta.url))), `Missing ${path}`);
  }
  assert.doesNotMatch(snapshot, /https:\/\/www\.figma\.com\/api\/mcp\/asset/);
});

test("AI phase disclosures retain the canonical four summary values and expanded capabilities", () => {
  assert.deepEqual(aiListeningPhases.map((phase) => phase.percentage), [27, 30, 43, 25]);
  assert.deepEqual(aiListeningPhases.map((phase) => phase.capabilities.length), [3, 3, 4, 4]);
  assert.deepEqual(aiListeningPhases[2].capabilities.map(([, percentage]) => percentage), [55, 45, 42, 32]);
  assert.deepEqual(aiListeningPhases[3].capabilities, [
    ["Recommend actions managers should take based on feedback", 38],
    ["Coach managers through conversations or action plans with their team", 30],
    ["Take actions on behalf of managers or leaders in response to feedback", 18],
    ["Simulate how employees might respond to a proposed change before it is implemented", 15],
  ]);
  assert.deepEqual(aiListeningPhases.map((phase) => phase.color), ["#5f82f2", "#7eaba7", "#a79bcc", "#dec98f"]);
  assert.match(interactionSource, /background: phase\.color/);
});

test("listening portfolio click states preserve all supplied Q9 counts and percentages", () => {
  assert.deepEqual(listeningPortfolio.map((row) => [...row.counts]), [
    [1, 5, 71, 26], [5, 12, 59, 27], [18, 6, 62, 17], [3, 5, 66, 29],
    [4, 15, 65, 19], [12, 4, 57, 30], [30, 9, 45, 19], [29, 1, 21, 52],
  ]);
  assert.ok(listeningPortfolio.every((row) => row.counts.reduce<number>((sum, n) => sum + n, 0) === 103));
  assert.deepEqual(listeningPortfolio.map((row) => row.percentages), [
    [1, 4.9, 68.9, 25.2], [4.9, 11.7, 57.3, 26.2], [17.5, 5.8, 60.2, 16.5], [2.9, 4.9, 64.1, 28.2],
    [3.9, 14.6, 63.1, 18.4], [11.7, 3.9, 55.3, 29.1], [29.1, 8.7, 43.7, 18.4], [28.2, 1, 20.4, 50.5],
  ]);
  assert.deepEqual(listeningPortfolio.map((row) => row.use), [99, 95.1, 82.5, 97.1, 96.1, 88.3, 70.9, 71.8]);
  assert.deepEqual(listeningPortfolio.map((row) => row.netExpansion), [20.4, 14.6, 10.7, 23.3, 3.9, 25.2, 9.7, 49.5]);
});

test("expanded demographics preserve all Figma samples and category totals", () => {
  assert.deepEqual(sampleDemographics.map((sample) => sample.tables.length), [5, 4, 3]);
  assert.deepEqual(sampleDemographics.map((sample) => sample.sample), ["103 respondents • Global", "500 respondents • United States only", "18 organizations • 29 participants • Global"]);
  assert.deepEqual(sampleDemographics[2].tables.map((table) => table.title), ["Region", "Industry", "Interview source"]);
  sampleDemographics.forEach((sample, index) => {
    const total = [103, 500, 18][index];
    for (const table of sample.tables) {
      assert.equal(table.rows.reduce<number>((sum, [, count]) => sum + count, 0), total, `${sample.name}: ${table.title}`);
      for (const [, count, percentage] of table.rows) {
        assert.ok(Math.abs(count / total * 100 - percentage) <= 0.051);
      }
    }
  });
  assert.deepEqual(sampleDemographics[0].tables[1].rows[7], ["China", 1, 1]);
  assert.deepEqual(sampleDemographics[1].tables[3].rows[0], ["Information Technology / Digital Transformation", 167, 33.4]);
  assert.match(interactionSource, /tabIndex=\{0\} role="region" aria-label=\{`\$\{sample\.name\} demographic tables`\}/);
  assert.match(interactionStyles, /\.tableScroller table \{[^}]*min-width: 600px;/);
  assert.match(interactionStyles, /::-webkit-meter-inner-element \{ grid-template-rows: 0 \[line1\] 1fr \[line2\] 0; \}/);
});

test("canonical demographics use one modal with linked, mutually exclusive sample tabs", () => {
  assert.match(interactionSource, /function ParticipantDetailsProvider\(/);
  assert.match(interactionSource, /aria-label="Research sample"/);
  assert.match(interactionSource, /role="tab"/);
  assert.match(interactionSource, /role="tabpanel"/);
  assert.match(interactionSource, /aria-controls=\{`\$\{prefix\}-panel-\$\{index\}`\}/);
  assert.match(interactionSource, /aria-labelledby=\{`\$\{prefix\}-tab-\$\{index\}`\}/);
  assert.match(interactionSource, /hidden=\{selected !== index\}/);
  assert.match(interactionSource, /tabIndex=\{selected === index \? 0 : -1\}/);
  for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
    assert.ok(interactionSource.includes(`event.key === "${key}"`));
  }
  assert.match(interactionSource, /onClose=\{\(\) => \{ setOpen\(false\); trigger\.current\?\.focus\(\); \}\}/);
  assert.match(interactionSource, /\.filter\(\(control\) => control\.getClientRects\(\)\.length > 0\)/);
  assert.equal([...interactionSource.matchAll(/className=\{`\$\{reportStyles\.report\} \$\{styles\.dialog\}/g)].length, 2);
  for (const color of ["#5f82f2", "#7eaba7", "#a79bcc", "#dec98f", "#c49c8f"]) {
    assert.ok(interactionStyles.includes(`--sample-color: ${color}`));
  }
});

test("demographic summaries scope geography and count labels to the selected sample", () => {
  assert.deepEqual(sampleDemographics.map((sample) => sample.name), [
    "Employee listening leader survey",
    "Employee and people manager survey",
    "Employee listening interviews",
  ]);
  assert.deepEqual(sampleDemographics.map((sample) => sample.countLabel), ["n", "n", "Orgs"]);
  assert.match(interactionSource, /<h3 className=\{styles\.sampleSummary\}>\{sampleDemographics\[selected\]\.sample\}<\/h3>/);
  assert.match(interactionSource, /<table key=\{table\.title\} data-series=\{tableIndex\} data-count-label=\{sample\.countLabel\}>/);
  assert.match(interactionSource, /<th scope="col">\{sample\.countLabel\}<\/th>/);
  assert.doesNotMatch(interactionSource, /demographicsSubtitle|All respondents based in the United States/);
  assert.doesNotMatch(interactionStyles, /\.demographicsSubtitle/);
});

test("interview tables use the compact Orgs label with the original count-column proportions", () => {
  assert.match(interactionStyles, /\.tableScroller :is\(th, td\):nth-child\(3\) \{ width: 11\.4%; padding-right: 24px; \}/);
  assert.doesNotMatch(interactionStyles, /table\[data-count-label=/);
});

test("participant details use the approved title, trigger, and accessible close label", () => {
  assert.match(interactionSource, /alt="" \/>Who participated/);
  assert.match(interactionSource, /<h2 id=\{`\$\{prefix\}-title`\}>Who participated<\/h2>/);
  assert.match(interactionSource, /aria-label="Close participant details"/);
  assert.doesNotMatch(interactionSource, /View sample demographics|>Sample demographics<|Close sample demographics/);
});

test("demographics scroll vertically in the parent modal instead of the table wrapper", () => {
  assert.match(interactionSource, /className=\{styles\.demographicsPanel\}[\s\S]*?role="tabpanel"/);
  assert.match(interactionStyles, /\.demographicsDialog \{[^}]*height: min\(760px, 80dvh\); overflow-y: auto; scrollbar-width: none; \}/);
  assert.match(interactionStyles, /\.demographicsDialog\[open\] \{ display: block; \}/);
  assert.match(interactionStyles, /\.demographicsPanel:not\(\[hidden\]\) \{ display: block; \}/);
  assert.match(interactionStyles, /\.demographicsPanel \.tableScroller \{ overflow-x: auto; overflow-y: hidden; \}/);
  assert.match(interactionStyles, /@media \(max-height: 600px\)/);
});

test("demographics pin the complete header and hide only the modal scrollbar", () => {
  assert.match(interactionSource, /<div className=\{styles\.demographicsHeader\}>[\s\S]*?className=\{styles\.dialogHeading\}[\s\S]*?aria-label="Research sample"[\s\S]*?<h3 className=\{styles\.sampleSummary\}>/);
  assert.match(interactionStyles, /\.demographicsHeader \{ position: sticky; top: calc\(-1 \* var\(--demographics-padding\)\); z-index: 1;[^}]*background: #000; \}/);
  assert.match(interactionStyles, /\.demographicsDialog::-webkit-scrollbar \{ display: none; \}/);
  assert.doesNotMatch(interactionStyles, /\.tableScroller[^}]*scrollbar-width: none/);
});

test("sample changes reset the observed parent scroll area without restoring nested scrolling", () => {
  assert.match(interactionSource, /useLayoutEffect\(\(\) => \{\s*const scroller = dialog\.current;\s*if \(!open \|\| !scroller\) return;\s*scroller\.scrollTo\(0, 0\);/);
  assert.doesNotMatch(interactionSource, /tableScroller\.current/);
  assert.doesNotMatch(interactionStyles, /\.demographicsPanel\[data-scroll-more\]/);
  assert.match(interactionStyles, /\.demographicsDialog \{[^}]*overflow-anchor: none;/);
});

test("the parent modal shows a nonblocking bottom fade only while more content remains", () => {
  assert.match(interactionSource, /scroller\.scrollHeight - scroller\.clientHeight - scroller\.scrollTop > 1/);
  assert.match(interactionSource, /data-scroll-more=\{canScrollMore \|\| undefined\}/);
  assert.match(interactionSource, /scroller\.addEventListener\("scroll", updateScrollCue, \{ passive: true \}\)/);
  assert.match(interactionSource, /observer\.observe\(scroller\)/);
  assert.match(interactionSource, /if \(panel\) observer\.observe\(panel\)/);
  assert.match(interactionSource, /scroller\.removeEventListener\("scroll", updateScrollCue\)/);
  assert.match(interactionSource, /observer\.disconnect\(\)/);
  assert.match(interactionStyles, /\.demographicsDialog::after \{[^}]*position: sticky;[^}]*height: 48px;[^}]*background: linear-gradient\(to bottom, transparent, #000\); opacity: 0; pointer-events: none; \}/);
  assert.match(interactionStyles, /\.demographicsDialog\[data-scroll-more\]::after \{ opacity: 1; \}/);
  assert.match(interactionStyles, /@media \(forced-colors: active\) \{\s*\.demographicsDialog::after \{ display: none; \}/);
});

test("the References disclaimer italicizes only the supplied three sentences without rewriting them", () => {
  const disclaimer = "Findings represent aggregated responses and may not reflect all organizations or industries. The practices and frameworks discussed in this report are offered for consideration and do not represent formal Microsoft policy or compliance guidance. Organizations should evaluate AI and employee-data uses based on their particular circumstances and applicable requirements.";
  assert.ok(interactionSource.includes(`<em>${disclaimer}</em>`));
});

test("references and report-only rules follow the revised design", () => {
  assert.match(interactionSource, /<section className=\{styles\.referencesDisclosure\} aria-labelledby="annual-references-title">/);
  assert.match(interactionSource, /<h3 id="annual-references-title">References<\/h3>/);
  assert.doesNotMatch(interactionSource, /<summary>References<\/summary>/);
  assert.match(interactionStyles, /\.referencesDisclosure h3::before \{[^}]*interaction-bookmark\.svg/);
  assert.doesNotMatch(interactionStyles, /\.referencesDisclosure(?:\[open\])? summary/);
  assert.match(interactionSource, /18 interview sessions with 29 participants across 18 organizations/);
  assert.match(interactionSource, /May 20 and June 12, 2026/);
  assert.match(shellStyles, /--annual-internal-rule:\s*#242424/);
  assert.match(shellStyles, /--annual-priority-track:\s*var\(--annual-chart-track\)/);
  assert.match(shellStyles, /\.report > footer \{[^}]*background:\s*#131320/);
  assert.match(figmaStyles, /\.microsoftHeading \.frame80 \{ color:#fff; \}/);
  assert.doesNotMatch(snapshot, /LSEG \(pending approval\)/);
  assert.match(figmaStyles, /\.customerEyebrow \{[^}]*width:125px;height:24px;/);
  assert.match(interactionStyles, /\.point \{[^}]*border: 1px solid var\(--annual-highlight\);/);
  assert.match(snapshot, /<strong>right-fit system based on needs<\/strong>/);
  assert.equal([...snapshot.matchAll(/data-level="(?:low|medium|high)">(?:Low|Medium|High) impact/g)].length, 9);
});
