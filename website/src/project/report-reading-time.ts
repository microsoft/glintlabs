import type { ReportBlock, ReportManifest, StructuredData } from "../manifest/report-manifest.ts";

const WORDS_PER_MINUTE = 200;
const words = new Intl.Segmenter("en", { granularity: "word" });

function dataText(data: StructuredData): (string | undefined)[] {
  return [data.title, data.subtitle, ...data.columns, ...data.rows.flatMap(row => row.cells), data.sourceNote];
}

function blockText(block: ReportBlock): (string | undefined)[] {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "list-item":
      return [block.text];
    case "image":
      return [block.eyebrow, ...(block.accessibleData ? dataText(block.accessibleData) : [])];
    case "data-visual-source":
      return dataText(block.data);
    case "visual-placeholder":
    case "unsupported":
      return [];
    case "branded-visual":
      return [block.title, ...block.values];
    case "percentage-ring-group":
      return [block.title, ...block.metrics.map(metric => metric.description), block.footnote];
    case "listening-approach-continuum":
      return [block.eyebrow, block.title, block.description, ...block.rows.flatMap(row => [row.label, row.description])];
    case "featured-statistic":
      return [block.title, block.statistic, block.description, block.sourceNote];
    case "data-callout":
      return [block.title, ...(block.paragraphs ?? []), block.eyebrow, block.statistic, block.description, block.sourceNote];
    case "references":
      return [block.title, block.intro, ...block.references.flatMap(reference => [reference.title, reference.citation])];
    case "listening-methods-comparison":
      return [block.eyebrow, ...block.methods.flatMap(method => [method.label, method.badge]), block.benchmark.label, block.benchmark.description];
    case "pull-quote":
      return [block.quote];
    case "horizontal-bar-chart":
      return [block.title, ...block.items.map(item => item.label), block.legend, block.sourceNote];
    case "grouped-column-comparison":
      return [block.title, block.subtitle, ...block.series, ...block.groups.map(group => group.label), block.sourceNote];
    case "before-after-comparison":
      return [block.title, ...block.sections.flatMap(section => [
        section.label, section.beforeTitle, section.beforeDescription, section.afterTitle, section.afterDescription, section.summary,
      ])];
    case "impact-metrics":
      return [block.title, block.intro, ...block.metrics.map(metric => metric.text)];
    case "two-column-insight":
      return [block.eyebrow, block.lead, ...block.insights.flatMap(insight => [insight.title, insight.description])];
    case "listening-maturity-scorecard":
      return [block.title, block.intro, ...block.categories.flatMap(category => [category.title, ...category.criteria])];
  }
}

export function estimateReportReadingTime(manifest: Pick<ReportManifest, "blocks">) {
  let wordCount = 0;
  for (const block of manifest.blocks) {
    for (const text of blockText(block)) {
      if (!text) continue;
      for (const word of words.segment(text)) {
        if (word.isWordLike) wordCount++;
      }
    }
  }
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}
