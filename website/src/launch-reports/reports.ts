import type { ReportCatalogItem } from "../app/reports/reports-data.ts";
import { reportManifestSchema, type ReportBlock } from "../manifest/report-manifest.ts";
import { launchImageDescriptions } from "./image-descriptions.ts";
import { launchReportSources } from "./source-data.ts";
import { wordPlainText, wordTextRuns, type WordTextRun } from "./word-format.ts";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const reports = launchReportSources.map(source => {
  const original = reportManifestSchema.parse(source.manifest);
  const textBlocks = original.blocks.filter(block => "text" in block);
  const titleBlock = textBlocks[0];
  const metadataBlock = textBlocks[1];
  if (!titleBlock || !metadataBlock) throw new Error(`Missing source metadata: ${source.slug}`);
  const title = titleBlock.text.replace(/^\[|\]$/g, "");
  const metadata = metadataBlock.text.match(/^\[([A-Za-z]+) (\d+), (\d{4}) • Research Drop\] \[([\d,]+) Employees\]$/);
  if (!metadata || !months.includes(metadata[1])) throw new Error(`Unrecognized source date: ${source.slug}`);
  const [, month, day, year, employees] = metadata;
  const monthNumber = String(months.indexOf(month) + 1).padStart(2, "0");
  const isoDate = `${year}-${monthNumber}-${day.padStart(2, "0")}`;
  const coverDetails = [`${month} ${day}, ${year} • Research Drop`, `${employees} Employees`];
  const textRuns: Record<string, WordTextRun[]> = {};
  const descriptions: Record<string, string> = {};
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
    const runs = wordTextRuns(block);
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
    } else if (/^\[open (?:bullet|bullets|sub-bullet)(?:\]|\s)/i.test(block.text)) {
      blocks.push({ ...block, type: "list-item", level: /^\[open sub-bullet\]/i.test(block.text) ? 1 : 0, text, links });
    } else {
      blocks.push({ ...block, type: "paragraph", text, links });
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
  const catalog: ReportCatalogItem = {
    id: `launch-${source.slug}`,
    title,
    description: summary,
    category: "research-drop",
    badge: `${source.privatePreview ? "Private preview • " : ""}${month} ${year} • Research Drop`,
    employeeCount: Number(employees.replaceAll(",", "")),
    href: `/reports/${source.slug}`,
    featured: false,
    thumbnail: { src: image.dataUrl, alt: image.alt },
  };
  return { slug: source.slug, privatePreview: source.privatePreview, manifest, textRuns, descriptions, coverDetails, catalog, isoDate };
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
