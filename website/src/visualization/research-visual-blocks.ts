import type { ReportBlock } from "../manifest/report-manifest.ts";
import templates from "./research-visual-templates.json" with { type: "json" };
import type { ResearchVisualTemplate } from "./research-visual-types.ts";

export type ResearchVisualBlock = Extract<ReportBlock, { type: "research-visual" }>;

export const researchVisualOptions = templates.map(({ template, name, description }) => ({
  template: template as ResearchVisualTemplate, name, description,
}));

export function createResearchVisualBlock(
  template: ResearchVisualTemplate,
  id: string,
  source: ReportBlock["source"],
): ResearchVisualBlock {
  const example = templates.find(item => item.template === template)!;
  return {
    id, source, provenance: { kind: "studio" }, type: "research-visual", template,
    title: example.title, subtitle: example.subtitle, sourceNote: example.sourceNote,
    columns: [...example.columns],
    rows: example.rows.map((cells, index) => ({
      id: `${id}-row-${index + 1}`, cells: cells.map(cell => [...cell]),
    })),
  };
}
