import { quadrantPresentationSchema, reportBlockSchema, type ReportBlock, type ReportManifest, type StructuredData } from "../manifest/report-manifest.ts";
import { quadrantHash, readQuadrantWorkbook, selectQuadrantTable, type QuadrantWorkbookTable } from "../extraction/quadrant-workbook.ts";
import { canonicalJson } from "../integrity/approved-content.ts";
import { compatibleVerifiedVisuals, createVerifiedDataVisual, type DataVisualSourceBlock } from "../visualization/verified-data-visual.ts";
import { listeningPortfolioError, quadrantPresets } from "../visualization/quadrant-data.ts";
import { readWordSource, rememberWordSource, savedWordSource, type WordSourceHandle } from "./word-source-file.ts";
import { sourceFolderFile, type SourceFolderHandle } from "./source-folder.ts";

export async function quadrantWorkbookSource(table: QuadrantWorkbookTable, options: {
  id: string; title: string; original?: DataVisualSourceBlock; connectionId?: string;
}): Promise<DataVisualSourceBlock> {
  const data = {
    sourceKind: "verified-upload", title: options.title, unit: "number",
    columns: table.columns, rows: table.rows, synthetic: table.synthetic ?? false, recommendedVisualType: "quadrant-scatter-plot",
    sourceNote: `Source: ${table.workbook?.fileName}, Excel table ${table.workbook?.tableName}.`,
    workbook: { ...table.workbook, connectionId: options.connectionId },
  };
  return reportBlockSchema.parse({
    id: options.id, type: "data-visual-source",
    source: options.original?.source ?? { part: "studio", index: 0 },
    data: { ...data, sha256: await quadrantHash(new TextEncoder().encode(canonicalJson(data))) },
  }) as DataVisualSourceBlock;
}

export async function rememberQuadrantWorkbook(id: string, handle: WordSourceHandle) {
  return rememberWordSource(`quadrant-workbook:${id}`, handle);
}

export async function readQuadrantFile(handle: WordSourceHandle) {
  try { return await readWordSource(handle); }
  catch { throw new Error("Excel couldn't be read. Reconnect its workbook in Edit chart. Your draft hasn't changed."); }
}

export async function connectedQuadrantSources(manifest: ReportManifest,
  chooseFile?: (title: string, fileName: string) => Promise<File | undefined>,
  folder?: SourceFolderHandle,
): Promise<Record<string, DataVisualSourceBlock>> {
  const sources: Record<string, DataVisualSourceBlock> = {};
  for (const block of manifest.blocks) {
    const pending = block.type === "data-visual-source" &&
      block.data.recommendedVisualType === "quadrant-scatter-plot" && !compatibleVerifiedVisuals(block).length;
    const cache = block.type === "quadrant-scatter-plot" ? block.wordSource : pending ? block.data : undefined;
    const workbook = block.type === "quadrant-scatter-plot" ? block.verifiedSource?.workbook : undefined;
    if (!cache || !workbook && !folder) continue;
    const fileName = workbook?.fileName ?? cache.linkedWorkbookFileName;
    if (!fileName) throw new Error(`Word doesn't identify the linked Excel workbook for "${cache.title}". Connect Excel in Edit chart. Your draft hasn't changed.`);
    const handle = !folder && workbook?.connectionId ? await savedWordSource(`quadrant-workbook:${workbook.connectionId}`) : undefined;
    let file: File | undefined;
    if (folder) file = await (await sourceFolderFile(folder, fileName)).getFile();
    else {
      try { if (handle) file = await readQuadrantFile(handle); } catch { /* Reconnect only the unavailable source. */ }
    }
    const remembered = Boolean(handle && file);
    if (!file && chooseFile) file = await chooseFile(block.type === "quadrant-scatter-plot" ? block.presentation?.title ?? block.title : cache.title, fileName);
    if (!file) {
      if (chooseFile) throw new DOMException("Excel selection was cancelled. Your draft hasn't changed.", "AbortError");
      throw new Error(`Reconnect Excel for "${cache.title}" in Edit chart, then refresh Word. Your draft hasn't changed.`);
    }
    const table = selectQuadrantTable(await readQuadrantWorkbook(file.name, await file.arrayBuffer()), {
      tableName: workbook?.tableName, cache: pending ? cache : undefined,
    });
    sources[block.id] = await quadrantWorkbookSource(table, { id: block.id,
      title: block.type === "quadrant-scatter-plot" ? block.verifiedSource!.title : cache.title,
      original: block.type === "data-visual-source" ? block : undefined,
      connectionId: remembered ? workbook?.connectionId : undefined });
  }
  return sources;
}

export async function hydrateFolderQuadrants(manifest: ReportManifest, folder: SourceFolderHandle): Promise<ReportManifest> {
  const pending = { ...manifest, blocks: manifest.blocks.filter(block => block.type === "data-visual-source") };
  const sources = await connectedQuadrantSources(pending, undefined, folder);
  const blocks = manifest.blocks.map((block): ReportBlock => {
    if (block.type !== "data-visual-source" || !sources[block.id]) return block;
    return connectedQuadrantVisual(sources[block.id], block.data);
  });
  return { ...manifest, blocks, reviewItems: manifest.reviewItems.filter(item =>
    !(item.code === "invalid-component-block" && item.blockId && sources[item.blockId])) };
}

export function connectedQuadrantVisual(source: DataVisualSourceBlock, wordSource: StructuredData) {
  const chart = createVerifiedDataVisual(source, "quadrant-scatter-plot", new Date().toISOString());
  if (chart.type !== "quadrant-scatter-plot") throw new Error("The Excel table could not be converted to a 2×2 quadrant.");
  return { ...chart, wordSource,
    ...(!listeningPortfolioError(source.data) ? { presentation: quadrantPresentationSchema.parse({
      ...quadrantPresets.listening, preset: "listening", title: source.data.title,
    }) } : {}),
  };
}
