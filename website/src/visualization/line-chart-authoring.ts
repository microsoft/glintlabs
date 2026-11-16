import { reportBlockSchema, type ReportBlock } from "../manifest/report-manifest.ts";
import { canonicalJson, sha256Text } from "../integrity/approved-content.ts";
import { createStudioChartSource, type ChartTable } from "./chart-authoring.ts";
import { createVerifiedDataVisual, verifiedVisualMatchesSource, type DataVisualSourceBlock } from "./verified-data-visual.ts";
import type { LineChartBlock } from "./line-chart-model.ts";

export type LineChartDraft = {
  table: ChartTable;
  title: string;
  subtitle: string;
  sourceNote: string;
  synthetic: boolean;
  palette: "brand" | "blue" | "teal";
  note: string;
};

export function initialLineChartDraft(block?: LineChartBlock | DataVisualSourceBlock): LineChartDraft {
  const data = block?.type === "data-visual-source" ? block.data : block?.verifiedSource;
  const presentation = block?.type === "line-chart" ? block.presentation : undefined;
  if (data) return {
    table: structuredClone({ columns: data.columns, rows: data.rows }),
    title: presentation?.title ?? data.title,
    subtitle: presentation?.subtitle ?? data.subtitle ?? "",
    sourceNote: data.sourceNote ?? "",
    synthetic: data.synthetic ?? false,
    palette: presentation?.palette ?? "brand",
    note: presentation?.note ?? "",
  };
  return {
    title: "Percentage trends", subtitle: "Synthetic example — replace with reviewed data.",
    sourceNote: "Source: synthetic example. Not research findings.", synthetic: true, palette: "brand", note: "",
    table: { columns: ["Period", "Series A", "Series B", "Series C"], rows: [
      { id: "period-1", cells: ["Period 1", "35", "60", "75"] },
      { id: "period-2", cells: ["Period 2", "45", "62", "78"] },
      { id: "period-3", cells: ["Period 3", "55", "65", "80"] },
    ] },
  };
}

export async function prepareLineChart(
  draft: LineChartDraft, identity: Pick<ReportBlock, "id" | "source">,
  original?: LineChartBlock | DataVisualSourceBlock, verifiedAt = new Date().toISOString(),
): Promise<LineChartBlock> {
  const originalSource: DataVisualSourceBlock | undefined = original?.type === "data-visual-source" ? original : original?.verifiedSource ? {
    id: original.id, type: "data-visual-source", source: original.source,
    data: original.verifiedSource, wordSource: original.wordSource,
  } : undefined;
  const source = await createStudioChartSource({
    id: identity.id, table: draft.table, sourceName: (originalSource?.data.title ?? draft.title).slice(0, 200),
    synthetic: draft.synthetic, visualType: "line-chart", original: originalSource,
  });
  source.source = identity.source;
  const content = Object.fromEntries(Object.entries(source.data).filter(([key]) => key !== "sha256"));
  const data = { ...content, subtitle: draft.subtitle || undefined, sourceNote: draft.sourceNote || undefined };
  source.data = { ...source.data, ...data, sha256: await sha256Text(canonicalJson(data)) };
  const visual = createVerifiedDataVisual(source, "line-chart", verifiedAt);
  return reportBlockSchema.parse({
    ...visual,
    presentation: { title: draft.title, subtitle: draft.subtitle, note: draft.note, palette: draft.palette },
  }) as LineChartBlock;
}

export async function assertLineChartSourceIntegrity(blocks: readonly ReportBlock[]) {
  for (const block of blocks) {
    if (block.type !== "line-chart") continue;
    if (!block.verifiedSource || !verifiedVisualMatchesSource(block)) {
      throw new Error("Line chart needs matching verified structured source data.");
    }
    const content = Object.fromEntries(Object.entries(block.verifiedSource).filter(([key]) => key !== "sha256" && key !== "verifiedAt"));
    if (await sha256Text(canonicalJson(content)) !== block.verifiedSource.sha256) {
      throw new Error("Line chart source hash does not match its structured data.");
    }
  }
}
