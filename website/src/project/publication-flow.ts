import { publicationDateSchema, publicationMetadataSchema } from "./publication-preparation.ts";
import type { PublicationMetadata } from "./publication-preparation.ts";
import { isRetiredIllustration, publicationIllustrations } from "../publishing/featured-illustrations.ts";
import type { ReportManifest } from "../manifest/report-manifest.ts";
import type { StudioProject } from "./studio-project.ts";
import { estimateReportReadingTime } from "./report-reading-time.ts";
import { reportAuthor } from "./report-author.ts";
import { wordStyleView } from "./word-style-mapping.ts";

export type PublicationMetadataDraft = PublicationMetadata;

export const PUBLICATION_SUMMARY_MAX_LENGTH = 220;

export function initialPublicationMetadata(project: Pick<StudioProject, "manifest" | "publicationPreparation" | "publicationMetadataDraft">): PublicationMetadataDraft {
  const manifest = wordStyleView(project.manifest);
  const readTimeMinutes = estimateReportReadingTime(manifest);
  const employeeCount = project.manifest.metadata.employeeCount;
  const date = manifest.metadata.publishedDate ? new Date(manifest.metadata.publishedDate) : undefined;
  const parsedDate = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : "";
  const displayDate = manifest.wordStyles && parsedDate !== manifest.metadata.publishedDate ? "" : parsedDate;
  const eyebrow = "Research Drop";
  const saved = project.publicationMetadataDraft ?? project.publicationPreparation?.metadata;
  if (saved) {
    const metadata = { ...saved, readTimeMinutes, employeeCount, eyebrow,
      ...(!project.publicationMetadataDraft && manifest.wordStyles && manifest.metadata.publishedDate ? { displayDate } : {}) };
    const illustration = publicationIllustrations.find(image => image.src === metadata.thumbnail.source);
    return illustration && needsImageDescription(metadata.thumbnail.alt)
      ? { ...metadata, thumbnail: { ...metadata.thumbnail, alt: illustration.description } }
      : metadata;
  }
  const title = manifest.metadata.title.replace(/^research drop\s*:\s*/i, "");
  return {
    slug: suggestedPublicationSlug(title), title, summary: "", eyebrow, displayDate,
    author: reportAuthor(manifest), readTimeMinutes, employeeCount, topics: manifest.metadata.topics ?? [],
    thumbnail: { source: "", alt: "" }, catalog: { featured: false, featuredUntil: null },
  };
}

const fieldLabels: Record<string, string> = {
  slug: "Report address",
  title: "Report title",
  summary: "Reports summary",
  eyebrow: "Report series",
  displayDate: "Display date",
  "author.name": "Author name",
  "author.handle": "Author handle",
  readTimeMinutes: "Reading time",
  employeeCount: "Employee count",
  topics: "Topics",
  "thumbnail.source": "Thumbnail",
  "thumbnail.alt": "Thumbnail description",
  "catalog.featuredUntil": "Feature end date",
};

export function publicationFieldLabel(field: string) {
  return fieldLabels[field] ?? "Source content";
}

export function publicationCardBadge(displayDate: string, series: string) {
  const monthYear = publicationDateSchema.safeParse(displayDate).success
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
      .format(new Date(`${displayDate}T00:00:00Z`))
    : "";
  return [monthYear, series.trim()].filter(Boolean).join(" \u2022 ");
}

export function publicationDetailsIssues(metadata: unknown) {
  const parsed = publicationMetadataSchema.safeParse(metadata);
  const issues = parsed.success ? [] : parsed.error.issues.map(issue => {
    const field = issue.path.join(".");
    return {
      field,
      message: field === "displayDate" ? "Choose a valid display date."
        : field === "topics" ? "Choose up to 3 topics."
          : field === "readTimeMinutes" ? "Enter a positive whole number of minutes."
            : field === "employeeCount" ? "Set Employee count to a positive whole number in the Word metadata, or leave blank."
            : issue.message,
    };
  });
  if (parsed.success) {
    if (parsed.data.summary.length > PUBLICATION_SUMMARY_MAX_LENGTH) {
      issues.push({ field: "summary", message: `Keep the short summary to ${PUBLICATION_SUMMARY_MAX_LENGTH} characters or fewer.` });
    }
    if (isRetiredIllustration(parsed.data.thumbnail.source)) {
      issues.push({ field: "thumbnail.source", message: "Choose an illustration from the new Glint Labs set." });
    }
    if (needsImageDescription(parsed.data.thumbnail.alt)) {
      issues.push({ field: "thumbnail.alt", message: "Describe the thumbnail's meaning, not a review placeholder." });
    }
  }
  return issues;
}

export function publicationCardIssues(metadata: PublicationMetadataDraft) {
  const issues = publicationDetailsIssues(metadata);
  if (metadata.thumbnail.source && !publicationIllustrations.some(image => image.src === metadata.thumbnail.source) &&
      !issues.some(issue => issue.field === "thumbnail.source")) {
    issues.push({ field: "thumbnail.source", message: "Choose an illustration from the new Glint Labs set." });
  }
  return issues;
}

export function suggestedPublicationSlug(title: string) {
  return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function suggestedPublicationSummary(manifest: Pick<ReportManifest, "blocks">) {
  const candidates: { text: string; priority: number }[] = [];
  let preferredLevel: number | undefined;
  let excludedLevel: number | undefined;
  for (const block of manifest.blocks) {
    if (block.type === "heading") {
      if (preferredLevel !== undefined && block.level <= preferredLevel) preferredLevel = undefined;
      if (excludedLevel !== undefined && block.level <= excludedLevel) excludedLevel = undefined;
      if (excludedLevel !== undefined) continue;
      const heading = block.text.trim().replace(/:$/, "").trim();
      if (/^(references|bibliography|endnotes|appendix|appendices|methodology)$/i.test(heading)) {
        excludedLevel = block.level;
      } else if (/^(summary|executive summary|abstract|overview|(?:research drop )?in brief)$/i.test(heading)) {
        preferredLevel = block.level;
      }
      continue;
    }
    if (excludedLevel !== undefined || (block.type !== "paragraph" && block.type !== "list-item")) continue;
    const text = block.text.replace(/\s+/g, " ").trim();
    if (/^(?:\[|https?:\/\/|source\s*:)/i.test(text)) continue;
    candidates.push({ text, priority: preferredLevel !== undefined ? 0 : block.type === "paragraph" ? 1 : 2 });
  }

  const sentences = new Intl.Segmenter("en", { granularity: "sentence" });
  const complete = (text: string) => /[.!?]["')\]\u2019\u201d]*$/u.test(text);
  for (const candidate of candidates.sort((a, b) => a.priority - b.priority)) {
    const parts = Array.from(sentences.segment(candidate.text), ({ segment }) => segment.trim());
    const first = parts[0];
    if (!first || !complete(first) || first.length > PUBLICATION_SUMMARY_MAX_LENGTH ||
      (first.match(/\p{L}+/gu)?.length ?? 0) < 4) continue;
    const second = parts[1];
    const pair = second ? `${first} ${second}` : first;
    return second && complete(second) && pair.length <= PUBLICATION_SUMMARY_MAX_LENGTH ? pair : first;
  }
  return undefined;
}

export function readableImageDescription(description: string) {
  const entities: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  };
  return description.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[a-f0-9]+);/gi, (entity, name: string) => {
    if (!name.startsWith("#")) return entities[name.toLowerCase()] ?? entity;
    const code = name.toLowerCase().startsWith("#x")
      ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
      ? String.fromCodePoint(code) : entity;
  }).replace(/\s+/g, " ").trim();
}

export function needsImageDescription(description: string) {
  return !description.trim() || /^\[human accessibility review required\b/i.test(description.trim());
}
