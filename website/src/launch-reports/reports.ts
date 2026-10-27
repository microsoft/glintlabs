import type { ReportCatalogItem } from "../app/reports/reports-data.ts";
import { reportManifestSchema, type ReportBlock } from "../manifest/report-manifest.ts";
import { publicationIllustrations } from "../publishing/featured-illustrations.ts";
import { launchImageDescriptions } from "./image-descriptions.ts";
import { launchReportSources } from "./source-data.ts";
import { wordPlainText, wordTextRuns, type WordTextRun } from "./word-format.ts";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const catalogIllustrations: Record<string, string> = {
  "empowering-managers-for-an-ai-first-future": "people",
  "fighting-ai-slop-with-meta-cognition-around-ai": "document-edit-text",
  "tracking-the-rise-of-perceived-ai-value-at-work": "data",
  "the-human-conditions-behind-ai-value-at-work": "sign-in",
  "amplifying-clarity-and-impact-of-ai-agents-by-aligning-on-desired-outcomes": "agents-workflow",
};

const reports = launchReportSources.map(source => {
  const original = reportManifestSchema.parse(source.manifest);
  const textBlocks = original.blocks.filter(block => "text" in block);
  const titleBlock = textBlocks[0];
  const metadataBlock = textBlocks[1];
  if (!titleBlock || !metadataBlock) throw new Error(`Missing source metadata: ${source.slug}`);
  const title = titleBlock.text.replace(/^\[|\]$/g, "");
  const metadata = metadataBlock.text.match(/^\[([A-Za-z]+) (\d+), (\d{4}) • Research Drop\] \[([\d,]+) Employees\]$/);
  if (!metadata || !months.includes(metadata[1])) throw new Error(`Unrecognized source date: ${source.slug}`);
  const [, month, day, sourceYear, employees] = metadata;
  // Preserve Word evidence while applying the owner-confirmed April publication year.
  const year = source.slug === "tracking-the-rise-of-perceived-ai-value-at-work" ? "2026" : sourceYear;
  const monthNumber = String(months.indexOf(month) + 1).padStart(2, "0");
  const isoDate = `${year}-${monthNumber}-${day.padStart(2, "0")}`;
  const coverDetails = [`${month} ${day}, ${year} • Research Drop`, `${employees} Employees`];
  const textRuns: Record<string, WordTextRun[]> = {};
  const descriptions: Record<string, string> = {};
  const referenceBlockIds = new Set<string>();
  const orderedListBlockIds = new Set<string>();
  const marks = { bold: false, italic: false, superscript: false };
  let hero = true;
  const blocks: ReportBlock[] = [];
  for (const block of original.blocks) {
    if (block.id === titleBlock.id) {
      blocks.push({ ...block, type: "heading", level: 1, text: title });
      continue;
    }
    if (block.id === metadataBlock.id) continue;
    if (block.type === "image") {
      const description = launchImageDescriptions[source.slug]?.[block.fileName];
      if (!description) throw new Error(`Missing image description: ${source.slug}/${block.fileName}`);
      blocks.push({ ...block, alt: description.alt, ...(hero ? { placement: "hero" as const } : {}) });
      if (description.description) descriptions[block.id] = description.description;
      hero = false;
      continue;
    }
    if (!("text" in block)) throw new Error(`Unmapped source block: ${source.slug}/${block.id}`);
    const runs = wordTextRuns(block, marks);
    // Author-confirmed reference correction; preserve the original Word evidence.
    if (source.slug === "the-human-conditions-behind-ai-value-at-work" && block.id === "block-45") {
      const citation = runs.find((run, index) => run.superscript && run.text === "2" &&
        runs[index - 1]?.text.endsWith("AI optimism and adoption"));
      if (!citation) throw new Error("Missing May citation selected for the author-confirmed correction.");
      citation.text = "3";
    }
    const text = runs.map(run => run.text).join("");
    if (!text) continue;
    textRuns[block.id] = runs;
    let position = 0;
    const links = runs.flatMap(run => {
      const start = position;
      position += run.text.length;
      return run.href ? [{ start, end: position, href: run.href }] : [];
    });
    if (block.type === "heading" || /\[open H3\]/i.test(block.text) || /^(?:Research Drop in Brief:|References)$/i.test(text)) {
      blocks.push({ ...block, type: "heading", level: 2, text });
    } else if (/^\[open (?:bullet|bullets|sub-bullet|numeric bullet)(?:\]|\s)/i.test(block.text)) {
      blocks.push({ ...block, type: "list-item", level: /^\[open sub-bullet\]/i.test(block.text) ? 1 : 0, text, links });
      if (/^\[open numeric bullet\]/i.test(block.text)) orderedListBlockIds.add(block.id);
    } else {
      blocks.push({ ...block, type: "paragraph", text, links });
      if (runs[0]?.superscript && /^\d+$/.test(runs[0].text)) referenceBlockIds.add(block.id);
    }
  }
  const firstBullet = original.blocks.find(block => "text" in block && /^\[open bullet\]/i.test(block.text));
  if (!firstBullet || !("text" in firstBullet)) throw new Error(`Missing source summary: ${source.slug}`);
  const summary = wordPlainText(firstBullet).split(/(?<=[.!?])\s/)[0];
  const manifest = reportManifestSchema.parse({
    ...original,
    metadata: { ...original.metadata, title, publishedDate: `${monthNumber}/${day.padStart(2, "0")}/${year.slice(-2)}` },
    blocks,
    reviewItems: original.reviewItems.filter(item => item.code !== "missing-image-description"),
  });
  const image = manifest.blocks.find(block => block.type === "image");
  if (!image || image.type !== "image") throw new Error(`Missing source hero: ${source.slug}`);
  const illustration = publicationIllustrations.find(item => item.id === catalogIllustrations[source.slug]);
  if (!illustration) throw new Error(`Missing catalog illustration: ${source.slug}`);
  const catalog: ReportCatalogItem = {
    id: `launch-${source.slug}`,
    title,
    description: summary,
    category: "research-drop",
    badge: `${source.privatePreview ? "Private preview • " : ""}${month} ${year} • Research Drop`,
    employeeCount: Number(employees.replaceAll(",", "")),
    href: `/reports/${source.slug}`,
    featured: source.featured,
    thumbnail: { src: illustration.src, alt: illustration.description, presentation: "illustration" },
  };
  return { slug: source.slug, privatePreview: source.privatePreview, manifest, textRuns, descriptions, referenceBlockIds, orderedListBlockIds, coverDetails, catalog, isoDate };
}).toSorted((left, right) => right.isoDate.localeCompare(left.isoDate));

function canonicalSlug(slug: string) {
  return slug === "glps-rd-feb-26" ? "fighting-ai-slop-with-meta-cognition-around-ai" : slug;
}

export function isLaunchReportSlug(slug: string) {
  return reports.some(report => report.slug === canonicalSlug(slug));
}

export function isLaunchReportSource(slug: string, sourceFileName: string) {
  return isLaunchReportSlug(slug) || reports.some(report => report.manifest.source.fileName === sourceFileName);
}

export function getLaunchReports({ includePrivatePreview = process.env.GLINT_LABS_UNSIGNED_PREVIEW === "1" } = {}) {
  return reports.filter(report => !report.privatePreview || includePrivatePreview);
}

export function getLaunchReport(slug: string, options?: Parameters<typeof getLaunchReports>[0]) {
  return getLaunchReports(options).find(report => report.slug === canonicalSlug(slug));
}

export function isPrivateLaunchReportSource(slug: string, sourceFileName: string) {
  return reports.some(item => item.privatePreview &&
    (item.slug === canonicalSlug(slug) || item.manifest.source.fileName === sourceFileName));
}

export function launchSourceVisible(slug: string, sourceFileName: string) {
  return !isPrivateLaunchReportSource(slug, sourceFileName) || process.env.GLINT_LABS_UNSIGNED_PREVIEW === "1";
}
