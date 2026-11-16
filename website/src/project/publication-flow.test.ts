import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isRetiredIllustration, publicationIllustrations } from "../publishing/featured-illustrations.ts";
import {
  needsImageDescription,
  publicationCardBadge,
  publicationDetailsIssues,
  publicationFieldLabel,
  PUBLICATION_SUMMARY_MAX_LENGTH,
  readableImageDescription,
  suggestedPublicationSlug,
  suggestedPublicationSummary,
} from "./publication-flow.ts";
import { publicationMetadataSchema } from "./publication-preparation.ts";
import type { ReportBlock } from "../manifest/report-manifest.ts";

test("catalog tags derive the month and year from the display date without timezone shifts", () => {
  const originalTimezone = process.env.TZ;
  try {
    for (const timezone of ["America/Los_Angeles", "Pacific/Kiritimati"]) {
      process.env.TZ = timezone;
      assert.equal(publicationCardBadge("2025-11-11", "Research Drop"), "November 2025 \u2022 Research Drop");
      assert.equal(publicationCardBadge("2026-01-01", "Research Drop"), "January 2026 \u2022 Research Drop");
      assert.equal(publicationCardBadge("2024-02-29", "Annual Report"), "February 2024 \u2022 Annual Report");
      assert.equal(publicationCardBadge("2025-12-31", "  Research Drop  "), "December 2025 \u2022 Research Drop");
    }
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test("catalog tags never invent a date while publication details are incomplete or invalid", () => {
  for (const date of ["", "not a date", "2025-02-29", "2025-11-31", "2025-13-01"]) {
    assert.equal(publicationCardBadge(date, "Research Drop"), "Research Drop");
  }
  assert.equal(publicationCardBadge("", ""), "");
  assert.equal(publicationCardBadge("2025-11-11", ""), "November 2025");
});

test("the Studio card preview uses the same dated tag as the catalog", async () => {
  const dialog = await readFile(new URL("../app/studio/_components/publication-package-dialog.tsx", import.meta.url), "utf8");
  assert.match(dialog, /badge: publicationCardBadge\(metadata\.displayDate, metadata\.eyebrow\)/);
});

function summaryReport(items: ({ type: "paragraph" | "list-item"; text: string } | { type: "heading"; text: string; level: number })[]) {
  return {
    blocks: items.map((item, index) => ({
      ...item, id: `summary-${index}`, source: { part: "word/document.xml", index },
      ...(item.type === "list-item" ? { level: 0 } : {}),
    })) as ReportBlock[],
  };
}

test("summary suggestions prefer explicit summaries and preserve source text", () => {
  const intro = "Managers are learning to support their teams through workplace change.";
  const summary = "Clear priorities help managers support their teams. Regular feedback helps them adjust.";
  const report = summaryReport([
    { type: "paragraph", text: intro },
    { type: "heading", text: "Research Drop in Brief:", level: 2 },
    { type: "list-item", text: summary },
  ]);
  const before = structuredClone(report);
  assert.equal(suggestedPublicationSummary(report), summary);
  assert.deepEqual(report, before);
  for (const heading of ["Summary", "Executive summary", "Abstract", "Overview", "In brief"]) {
    assert.equal(suggestedPublicationSummary(summaryReport([
      { type: "paragraph", text: intro },
      { type: "heading", text: heading, level: 2 },
      { type: "paragraph", text: summary },
    ])), summary);
  }
});

test("summary suggestions use at most two complete sentences within the existing limit", () => {
  const first = "Managers need clear priorities and practical support.";
  const second = "Regular feedback helps them adjust.";
  assert.equal(suggestedPublicationSummary(summaryReport([
    { type: "paragraph", text: `${first} ${second} This third sentence should stay in the report.` },
  ])), `${first} ${second}`);
  assert.equal(suggestedPublicationSummary(summaryReport([
    { type: "paragraph", text: `${first} Teams ${"need practical support ".repeat(15)}during change.` },
  ])), first);
  assert.equal(suggestedPublicationSummary(summaryReport([
    { type: "paragraph", text: `  ${first}\n\n${second}  ` },
  ])), `${first} ${second}`);
  assert.equal(suggestedPublicationSummary(summaryReport([
    { type: "paragraph", text: `${first} This fragment has no ending` },
  ])), first);
});

test("summary suggestions do not truncate long sentences or skip to a later sentence in a paragraph", () => {
  assert.equal(suggestedPublicationSummary(summaryReport([
    { type: "paragraph", text: `Managers ${"need practical support ".repeat(15)}during change. That claim depends on this context.` },
  ])), undefined);
  assert.equal(suggestedPublicationSummary(summaryReport([
    { type: "paragraph", text: "This entire report lacks terminal punctuation" },
  ])), undefined);
  assert.equal(suggestedPublicationSummary({ blocks: [] }), undefined);
});

test("summary suggestions exclude references, nested appendices, metadata, and image descriptions", () => {
  const body = "Managers need clear priorities and practical support.";
  const report = summaryReport([
    { type: "paragraph", text: "[GLPS REPORT METADATA] These notes are not public copy." },
    { type: "paragraph", text: "Source: A citation with enough words to otherwise qualify." },
    { type: "heading", text: "References", level: 2 },
    { type: "paragraph", text: "This citation should never become the report summary." },
    { type: "heading", text: "More citations", level: 3 },
    { type: "paragraph", text: "This nested citation should also be excluded." },
    { type: "heading", text: "Next steps", level: 2 },
    { type: "paragraph", text: body },
    { type: "heading", text: "Appendix", level: 2 },
    { type: "heading", text: "Summary", level: 3 },
    { type: "paragraph", text: "An appendix summary should not outrank the main content." },
  ]);
  report.blocks.unshift({
    id: "image", type: "image", source: { part: "word/document.xml", index: 0 },
    alt: "A long image description that is not summary text.", dataUrl: "/image.png",
    fileName: "image.png", width: 400, height: 300,
  });
  assert.equal(suggestedPublicationSummary(report), body);
});

test("summary section priority stops at its boundary and body paragraphs outrank ordinary lists", () => {
  const body = "Managers need clear priorities and practical support.";
  assert.equal(suggestedPublicationSummary(summaryReport([
    { type: "list-item", text: "This list item should not outrank the body paragraph." },
    { type: "paragraph", text: body },
    { type: "heading", text: "Summary", level: 2 },
    { type: "paragraph", text: "No ending here" },
    { type: "heading", text: "Other section", level: 2 },
    { type: "paragraph", text: "This paragraph should not inherit the summary priority." },
  ])), body);
});

test("summary suggestions preserve numeric claims, quoted punctuation, and safe length boundaries", () => {
  const quoted = 'The study found that 31.5% of managers said, "We need support."';
  assert.equal(suggestedPublicationSummary(summaryReport([{ type: "paragraph", text: quoted }])), quoted);
  const exact = `Managers need practical support ${"x".repeat(PUBLICATION_SUMMARY_MAX_LENGTH - "Managers need practical support ".length - 1)}.`;
  assert.equal(exact.length, PUBLICATION_SUMMARY_MAX_LENGTH);
  assert.equal(suggestedPublicationSummary(summaryReport([{ type: "paragraph", text: exact }])), exact);
  assert.equal(suggestedPublicationSummary(summaryReport([{ type: "paragraph", text: exact.replace(/\.$/, "x.") }])), undefined);
});

test("summary suggestions require explicit use and keep the existing metadata change safeguards", async () => {
  const dialog = await readFile(new URL("../app/studio/_components/publication-package-dialog.tsx", import.meta.url), "utf8");
  assert.match(dialog, /summary: "", eyebrow,/, "new publication summaries stay empty until chosen");
  assert.match(dialog, /onClick=\{\(\) => setSummarySuggestion\(suggestedPublicationSummary\(project\.manifest\) \?\? null\)\}/);
  assert.match(dialog, /Excerpt from your report\. Review and edit before publishing\./);
  assert.match(dialog, /changeMetadata\(\{ \.\.\.metadata, summary: summarySuggestion \}\)/);
  assert.match(dialog, /metadata\.summary\.trim\(\) \? "Replace summary" : "Use summary"/);
  assert.match(dialog, /aria-label="Summary suggestion" aria-describedby="publication-summary-suggestion-text"/);
  assert.match(dialog, /We couldn&apos;t find a suitable excerpt/);
});

test("employee count is optional and accepts only positive safe whole numbers", () => {
  const metadata = {
    slug: "employee-count", title: "Report", summary: "A short summary.", eyebrow: "Research Drop",
    displayDate: "2026-10-23", author: { name: "Test author", handle: "@test" },
    readTimeMinutes: 2, topics: [],
    thumbnail: { source: publicationIllustrations[0].src, alt: publicationIllustrations[0].description },
    catalog: { featured: false, featuredUntil: null },
  };
  assert.equal(publicationFieldLabel("employeeCount"), "Employee count");
  for (const employeeCount of [undefined, 1, 500, 12500, Number.MAX_SAFE_INTEGER]) {
    const draft = { ...metadata, employeeCount };
    assert.deepEqual(publicationDetailsIssues(draft), []);
    assert.equal(publicationMetadataSchema.parse(draft).employeeCount, employeeCount);
  }
  for (const employeeCount of [0, -1, 1.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "500", null]) {
    const issues = publicationDetailsIssues({ ...metadata, employeeCount });
    assert.ok(issues.some(issue => issue.field === "employeeCount" && issue.message.includes("or leave blank")));
  }
});

test("publishing exposes an optional employee count linked to its hint, errors and card preview", async () => {
  const dialog = await readFile(new URL("../app/studio/_components/publication-package-dialog.tsx", import.meta.url), "utf8");
  assert.match(dialog, /name="publication-employee-count" label="Employee count"[^>]*required=\{false\}/);
  assert.match(dialog, /inputProps\("employeeCount", "publication-employee-count", true, false\)/);
  assert.match(dialog, /inputMode="numeric" pattern="\[0-9\]\*"/);
  assert.match(dialog, /employeeCount: metadata\.employeeCount/);
});

test("shows readable imported descriptions without interpreting markup or altering the input", () => {
  const source = "People at a desk&#10;&#10;A&amp;B &lt;script&gt; &#x1F600;";
  assert.equal(readableImageDescription(source), "People at a desk A&B <script> \u{1F600}");
  assert.equal(source, "People at a desk&#10;&#10;A&amp;B &lt;script&gt; &#x1F600;");
  assert.equal(readableImageDescription("&#1114112; &#55296; &#0;"), "&#1114112; &#55296; &#0;");
  assert.equal(needsImageDescription("[Human accessibility review required for source image at paragraph 40.]"), true);
  assert.equal(needsImageDescription("  "), true);
  assert.equal(needsImageDescription("A group working together."), false);
});

test("suggests an address without silently changing the chosen address", () => {
  assert.equal(suggestedPublicationSlug("Research Drop: Café & AI skills!"), "research-drop-cafe-ai-skills");
  assert.equal(suggestedPublicationSlug("  "), "");
  assert.equal(suggestedPublicationSlug("研究"), "");
});

test("publishing omits unused Topics and ZIP options and keeps the compact catalog image picker", async () => {
  const [dialog, styles] = await Promise.all([
    readFile(new URL("../app/studio/_components/publication-package-dialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/_components/publication-package-dialog.module.css", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(dialog, /publication-topics|topicsText|setTopicsText/);
  assert.doesNotMatch(dialog, /Other publishing options|Download publication ZIP|downloadPackage|"downloading"/);
  assert.doesNotMatch(dialog, /Catalog card preview/);
  assert.match(dialog, /<aside[^>]+aria-label="Draft catalog card">/);
  assert.match(styles, /\.thumbnailChoices \{[^}]*minmax\(104px, 1fr\)[^}]*max-height: 240px;[^}]*overflow: auto;/);
  assert.match(styles, /\.thumbnailChoice img \{[^}]*width: 72px; height: 72px; object-fit: contain;/);
  assert.match(styles, /\.header \{[^}]*padding: 12px 24px;/);
  assert.match(styles, /\.closeButton \{[^}]*width: 44px; height: 44px;[^}]*font-size: 20px;/);
  const detailsStyles = styles.match(/\.detailsSection \{([^}]*)\}/)?.[1];
  assert.ok(detailsStyles);
  assert.doesNotMatch(detailsStyles, /border/);
  assert.doesNotMatch(dialog, /publication-thumbnail-alt|label="Image description"/);
  assert.match(dialog, /alt: illustration\.description/);
});

test("publishing keeps all detail inputs visible without a redundant heading or summary", async () => {
  const dialog = await readFile(new URL("../app/studio/_components/publication-package-dialog.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(dialog, /<details\b|<summary\b|HTMLDetailsElement|Author, date, and report details|Address and homepage options/);
  const section = dialog.match(/<section[^>]+aria-label="Details">([\s\S]*?)<\/section>/)?.[1];
  assert.ok(section);
  assert.doesNotMatch(dialog, /publication-details-heading/);
  assert.doesNotMatch(section, /<h[1-6]\b|<p\b|min read|Add the report's author and publication details/);
  assert.doesNotMatch(dialog, /Use the report's approved label or series/);
  assert.doesNotMatch(dialog, /publication-eyebrow|label="Report series"|Add a report series/);
  for (const name of ["date", "slug", "featured"]) {
    assert.ok(section.includes(`name="publication-${name}"`), name);
  }
  assert.match(section, /inputProps\("catalog\.featuredUntil", "publication-featured-until", false, false\)/);
});

test("publishing pairs a compact employee count with the display date after the summary", async () => {
  const [dialog, styles] = await Promise.all([
    readFile(new URL("../app/studio/_components/publication-package-dialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/_components/publication-package-dialog.module.css", import.meta.url), "utf8"),
  ]);
  const fields = ['aria-label="Catalog image"', ...["title", "summary", "date", "employee-count", "slug"].map(name => `name="publication-${name}"`)];
  let previous = -1;
  for (const field of fields) {
    const position = dialog.indexOf(field);
    assert.ok(position > previous, field);
    previous = position;
  }
  assert.match(dialog, /className=\{`\$\{styles\.cardBadgeFields\} \$\{styles\.wide\}`\}/);
  assert.match(styles, /\.cardBadgeFields \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 160px\);[^}]*gap: 16px;/);
  assert.match(styles, /\.cardBadgeFields > :last-child \{ max-width: 160px; \}/);
  assert.match(styles, /@media \(max-width: 600px\) \{[\s\S]*?\.cardBadgeFields \{ grid-template-columns: minmax\(0, 1fr\); \}/);
});

test("publishing inherits the report author and omits manual author and reading-time controls", async () => {
  const dialog = await readFile(new URL("../app/studio/_components/publication-package-dialog.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(dialog, /publication-author|publication-handle|publication-reading-time|label="Author name"|label="Author handle"|label="Reading time \(minutes\)"/);
  assert.match(dialog, /author: reportAuthor\(manifest\)/);
  assert.match(dialog, /const readTimeMinutes = estimateReportReadingTime\(project\.manifest\)/);
  assert.match(dialog, /const metadata = \{ \.\.\.project\.publicationPreparation\.metadata, readTimeMinutes, eyebrow \}/);
  const metadata = {
    slug: "automatic-details", title: "Report", summary: "A short summary.", eyebrow: "Research Drop",
    displayDate: "2026-10-23", author: { name: "Test author" }, readTimeMinutes: 1, topics: [],
    thumbnail: { source: publicationIllustrations[0].src, alt: publicationIllustrations[0].description },
    catalog: { featured: false, featuredUntil: null },
  };
  assert.deepEqual(publicationDetailsIssues(metadata), []);
  assert.equal(publicationMetadataSchema.parse({ ...metadata, author: { ...metadata.author, handle: "@retained" } }).author.handle, "@retained");
});

test("homepage featuring is an optional checkbox and publishing fields use consistent spacing", async () => {
  const [dialog, styles] = await Promise.all([
    readFile(new URL("../app/studio/_components/publication-package-dialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/_components/publication-package-dialog.module.css", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(dialog, /<select id="publication-featured"|Homepage placement/);
  assert.match(dialog, /name="publication-featured" type="checkbox" checked=\{metadata\.catalog\.featured\}/);
  assert.match(dialog, /<span>Feature on the homepage<\/span>/);
  assert.match(dialog, /featured: event\.target\.checked, featuredUntil: event\.target\.checked \? metadata\.catalog\.featuredUntil : null/);
  const placement = dialog.match(/<div className=\{`\$\{styles\.homepagePlacement\} \$\{styles\.wide\}`\}>([\s\S]*?)<\/div>/)?.[1];
  assert.ok(placement);
  assert.ok(placement.indexOf('htmlFor="publication-featured"') < placement.indexOf('htmlFor="publication-featured-until"'));
  assert.doesNotMatch(placement, /metadata\.catalog\.featured \?/);
  assert.match(placement, /className=\{`\$\{styles\.field\} \$\{styles\.featureUntil\}`\}/);
  assert.match(placement, /<label htmlFor="publication-featured-until"><span className=\{styles\.srOnly\}>Feature <\/span>Until<\/label>/);
  assert.match(placement, /inputProps\("catalog\.featuredUntil", "publication-featured-until", false, false\)\} disabled=\{!metadata\.catalog\.featured\}/);
  assert.match(placement, /id="publication-featured-until-error"/);
  assert.match(styles, /\.homepagePlacement \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 216px\);[^}]*align-items: center;[^}]*gap: 16px;/);
  assert.match(styles, /\.featureUntil \{[^}]*grid-template-columns: auto minmax\(0, 1fr\);[^}]*align-items: center;/);
  assert.match(styles, /\.featureUntil > \.fieldError \{ grid-column: 1 \/ -1; \}/);
  assert.match(styles, /@media \(max-width: 600px\) \{[\s\S]*?\.homepagePlacement \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(styles, /\.fields \{[^}]*gap: 16px;/);
  assert.match(styles, /\.metaGrid \{[^}]*gap: 16px;/);
  assert.match(styles, /\.field \{[^}]*gap: 8px;/);
  assert.match(styles, /\.detailsSection \{[^}]*padding: 0;/);
  assert.match(styles, /\.catalogCardPreview \{ margin: 0; \}/);
});

test("publishing separates draft saving from preview and publish actions without changing close protection", async () => {
  const [dialog, styles] = await Promise.all([
    readFile(new URL("../app/studio/_components/publication-package-dialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/_components/publication-package-dialog.module.css", import.meta.url), "utf8"),
  ]);
  const footer = dialog.match(/<footer className=\{styles\.footer\}>([\s\S]*?)<\/footer>/)?.[1];
  assert.ok(footer);
  const [draftActions, publishActions] = footer.split('<div className={styles.footerActions}>');
  assert.match(draftActions, /className=\{styles\.draftActions\}/);
  assert.match(draftActions, /!websiteUpdate \? <button[^\n]*disabled=\{busy\}[^\n]*savePreparation\(\)[^\n]*>Save draft<\/button>/);
  assert.match(draftActions, /className=\{styles\.footerStatus\} role="status"/);
  assert.doesNotMatch(dialog, /"Unsaved changes"/);
  assert.match(dialog, /unsaved \? ""/);
  assert.match(dialog, /operation === "saving" \? "Saving your draft\.\.\."/);
  assert.doesNotMatch(publishActions, /Save draft/);
  assert.doesNotMatch(footer, />Cancel<\/button>|"Cancel"/);
  assert.match(publishActions, /websiteUpdate \? <button[^>]*onClick=\{requestClose\}[^>]*>Done<\/button>/);
  assert.match(publishActions, /Preview report/);
  assert.match(publishActions, /Publish report/);
  assert.match(draftActions, /className=\{studioStyles\.secondaryAction\}/);
  assert.match(publishActions, /ref=\{previewButtonRef\} className=\{studioStyles\.secondaryAction\}/);
  assert.match(publishActions, /ref=\{previewLinkRef\} className=\{studioStyles\.secondaryAction\}/);
  assert.match(publishActions, /ref=\{publishButtonRef\} className=\{studioStyles\.primaryAction\}/);
  assert.doesNotMatch(publishActions, /className=\{styles\.(?:primaryButton|secondaryButton|textButton)\}/);
  assert.match(dialog, /aria-label="Close publishing" disabled=\{busy\} onClick=\{requestClose\}/);
  assert.match(dialog, /unsaved && !window\.confirm\("Close without saving these changes\?/);
  assert.match(styles, /\.draftActions \{[^}]*display: flex;[^}]*gap: 12px;/);
});

test("short summary uses two lines and enforces the 220-character publishing limit", async () => {
  const dialog = await readFile(new URL("../app/studio/_components/publication-package-dialog.tsx", import.meta.url), "utf8");
  assert.match(dialog, /inputProps\("summary", "publication-summary"\)\} rows=\{2\} maxLength=\{PUBLICATION_SUMMARY_MAX_LENGTH\}/);
  assert.equal(PUBLICATION_SUMMARY_MAX_LENGTH, 220);
  const metadata = {
    slug: "summary-limit", title: "Report", summary: "", eyebrow: "Research",
    displayDate: "2026-10-23", author: { name: "Test author", handle: "@test" },
    readTimeMinutes: 2, topics: [],
    thumbnail: { source: publicationIllustrations[0].src, alt: publicationIllustrations[0].description },
    catalog: { featured: false, featuredUntil: null },
  };
  for (const length of [219, 220]) {
    assert.deepEqual(publicationDetailsIssues({ ...metadata, summary: "s".repeat(length) }), []);
  }
  assert.deepEqual(publicationDetailsIssues({ ...metadata, summary: "s".repeat(221) }), [{
    field: "summary", message: "Keep the short summary to 220 characters or fewer.",
  }]);
});

test("identifies incomplete details with actionable field-specific issues", () => {
  const issues = publicationDetailsIssues({
    slug: "", title: "", summary: "", eyebrow: "", displayDate: "",
    author: { name: "" }, readTimeMinutes: 0, topics: ["1", "2", "3", "4"],
    thumbnail: { source: "", alt: "", altConfirmed: false },
    catalog: { featured: false, featuredUntil: null },
  });
  assert.ok(issues.some(issue => issue.field === "author.name"));
  assert.ok(issues.some(issue => issue.field === "displayDate" && issue.message === "Choose a valid display date."));
  assert.ok(issues.some(issue => issue.field === "topics" && issue.message === "Choose up to 3 topics."));
  assert.ok(issues.some(issue => issue.field === "thumbnail.alt"));
  assert.ok(!issues.some(issue => issue.field === "thumbnail.altConfirmed"));
});

test("offers only the unique new Blue Figma illustrations with complete native-sized local assets", async () => {
  assert.equal(publicationIllustrations.length, 56);
  assert.equal(new Set(publicationIllustrations.map(image => image.id)).size, 56);
  assert.equal(new Set(publicationIllustrations.map(image => image.label)).size, 56);
  const hashes = new Set<string>();
  for (const image of publicationIllustrations) {
    assert.equal(image.description, `${image.label} illustration.`);
    assert.equal(needsImageDescription(image.description), false);
    assert.match(image.src, /^\/figma\/illustrations\/blue\/[a-z-]+\.png$/);
    assert.match(image.figmaNodeId, /^1658:\d+$/);
    assert.equal(isRetiredIllustration(image.src), false);
    const bytes = await readFile(path.join(process.cwd(), "public", ...image.src.split("/")));
    assert.ok(bytes.length > 1000, image.id);
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", image.id);
    assert.equal(bytes.readUInt32BE(16), 512, image.id);
    assert.equal(bytes.readUInt32BE(20), 512, image.id);
    hashes.add(createHash("sha256").update(bytes).digest("hex"));
  }
  assert.equal(hashes.size, 56);
});

test("illustration descriptions are automatic while existing authored descriptions are retained", async () => {
  const dialog = await readFile(new URL("../app/studio/_components/publication-package-dialog.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(dialog, /publication-thumbnail-alt|label="Image description"/);
  assert.match(dialog, /illustration && needsImageDescription\(metadata\.thumbnail\.alt\)/);
  assert.match(dialog, /\? \{ \.\.\.metadata, thumbnail: \{ \.\.\.metadata\.thumbnail, alt: illustration\.description \} \}\s*: metadata/);
  assert.match(dialog, /source: illustration\.src, alt: illustration\.description, presentation: "illustration"/);
});

test("retired draft illustrations require explicit replacement while report images remain available", () => {
  const metadata = {
    slug: "report", title: "Report", summary: "Summary", eyebrow: "Research",
    displayDate: "2026-10-21", author: { name: "Test author", handle: "@test" },
    readTimeMinutes: 2, topics: [],
    thumbnail: { source: publicationIllustrations[0].src, alt: "Report illustration." },
    catalog: { featured: false, featuredUntil: null },
  };
  assert.deepEqual(publicationDetailsIssues(metadata), []);
  for (const source of ["/figma/illustrations/people.png", "/figma/illustrations/glacier/people.png"]) {
    assert.equal(isRetiredIllustration(source), true);
    assert.ok(publicationDetailsIssues({
      ...metadata, thumbnail: { ...metadata.thumbnail, source },
    }).some(issue => issue.field === "thumbnail.source" && issue.message.includes("new Glint Labs set")));
  }
  assert.equal(isRetiredIllustration("data:image/png;base64,AA=="), false);
  assert.equal(isRetiredIllustration("/reports-assets/report/image.png"), false);
});
