import {
  canonicalJson, snapshotApprovedContent, type ApprovedContentRecord,
  type ApprovedContentSnapshot,
} from "../integrity/approved-content.ts";
import {
  reportManifestSchema, type ReportBlock, type ReportManifest, type StructuredData,
} from "../manifest/report-manifest.ts";
import {
  compatibleVerifiedVisuals, createVerifiedDataVisual,
  verifiedVisualMatchesSource,
  type DataVisualSourceBlock,
} from "../visualization/verified-data-visual.ts";
import { quadrantCacheMatches } from "../visualization/quadrant-data.ts";
import { connectedQuadrantVisual } from "./quadrant-workbook-source.ts";
import { applyWordStyleMappings } from "./word-style-mapping.ts";

export type WordRefreshConflict = { label: string };
export type WordRefreshResult = {
  manifest: ReportManifest;
  sourceManifest: ReportManifest;
  conflicts: WordRefreshConflict[];
  unchanged: boolean;
};

type SourceEntry = ApprovedContentSnapshot["blocks"][number];

function entries(manifest: ReportManifest): SourceEntry[] {
  // Refresh compares working chart data, not the retained Word approval evidence.
  const snapshots = new Map(snapshotApprovedContent({
    ...manifest,
    blocks: manifest.blocks.map(block => "wordSource" in block && block.type !== "quadrant-scatter-plot"
      ? { ...block, wordSource: undefined } : block),
  }).blocks.map(block => [block.id, block]));
  return manifest.blocks.map(block => {
    const snapshot = snapshots.get(block.id);
    if (snapshot) return snapshot;
    const content = { ...block } as Record<string, unknown>;
    delete content.id;
    delete content.source;
    delete content.provenance;
    return { id: block.id, source: block.source, type: block.type, content };
  });
}

function fingerprint(block: SourceEntry) {
  return canonicalJson({ type: block.type, content: block.content });
}

function label(block: ReportBlock) {
  if ("text" in block) return block.text.slice(0, 100);
  if (block.type === "data-visual-source") return block.data.title;
  return "title" in block ? block.title : block.type === "image" ? "Report image" : "Report section";
}

export function refreshWordSource({
  current, incoming, sourceManifest, approvedContent, quadrantSources = {}, incomingQuadrantSources = {},
}: {
  current: ReportManifest;
  incoming: ReportManifest;
  sourceManifest?: ReportManifest;
  approvedContent?: ApprovedContentRecord;
  quadrantSources?: Record<string, DataVisualSourceBlock>;
  incomingQuadrantSources?: Record<string, DataVisualSourceBlock>;
}): WordRefreshResult {
  current = applyWordStyleMappings(current);
  incoming = applyWordStyleMappings(incoming);
  const previous = sourceManifest ? entries(sourceManifest) : approvedContent?.snapshot.blocks;
  if (!previous) {
    throw new Error("This older draft has no original Word evidence to compare. Your draft hasn't changed. Import the Word report as a new document to start source tracking.");
  }
  const unchanged = incoming.source.sha256 ===
    (sourceManifest?.source.sha256 ?? approvedContent?.snapshot.sourceSha256) &&
    incoming.source.fileName === current.source.fileName &&
    [...Object.entries(quadrantSources), ...Object.entries(incomingQuadrantSources)].every(([id, source]) => {
      const local = current.blocks.find(block => block.id === id);
      return local && "verifiedSource" in local && local.verifiedSource?.sha256 === source.data.sha256;
    });
  if (unchanged && canonicalJson(current.wordStyles) === canonicalJson(incoming.wordStyles) &&
    !Object.keys(quadrantSources).length && !Object.keys(incomingQuadrantSources).length) {
    return { manifest: current, sourceManifest: sourceManifest ?? incoming, conflicts: [], unchanged };
  }

  const next = entries(incoming);
  const matches = new Map<string, SourceEntry>();
  const used = new Set<string>();
  const matchUnique = (key: (block: SourceEntry) => string | undefined) => {
    for (const block of next) {
      if (matches.has(block.id)) continue;
      const value = key(block);
      if (value === undefined) continue;
      const candidates = previous.filter(old => !used.has(old.id) && key(old) === value);
      const incomingCandidates = next.filter(item => !matches.has(item.id) && key(item) === value);
      if (candidates.length === 1 && incomingCandidates.length === 1) {
        matches.set(block.id, candidates[0]);
        used.add(candidates[0].id);
      }
    }
  };
  matchUnique(block => block.source.paragraphId
    ? `${block.source.part}:${block.source.paragraphId}:${block.type}` : undefined);
  matchUnique(fingerprint);
  matchUnique(block => {
    if (block.type !== "data-visual") return undefined;
    const data = block.content as StructuredData;
    return canonicalJson({
      sourceKind: data.sourceKind, title: data.title, columns: data.columns,
      labels: data.rows.map(row => row.cells[0]).toSorted(),
    });
  });
  // Without Word paragraph IDs, only a unique remaining kind is safe to pair.
  matchUnique(block => block.source.paragraphId ? undefined : block.type);

  const reservedIds = new Set([...current.blocks, ...previous].map(block => block.id));
  const remappedIds = new Map<string, string>();
  for (const block of incoming.blocks) {
    const old = matches.get(block.id);
    const id = old?.id ?? (reservedIds.has(block.id)
      ? `word-${incoming.source.sha256.slice(0, 12)}-${block.id}` : block.id);
    remappedIds.set(block.id, id);
    reservedIds.add(id);
  }
  const refreshedSource = reportManifestSchema.parse({
    ...incoming,
    blocks: incoming.blocks.map(block => ({
      ...block, id: remappedIds.get(block.id)!,
      ...(block.provenance?.sourceBlockId ? {
        provenance: { ...block.provenance,
          sourceBlockId: remappedIds.get(block.provenance.sourceBlockId) ?? block.provenance.sourceBlockId },
      } : {}),
    })),
    reviewItems: incoming.reviewItems.map(item => ({
      ...item, ...(item.blockId ? { blockId: remappedIds.get(item.blockId) ?? item.blockId } : {}),
    })),
  });
  const conflicts: WordRefreshConflict[] = [];
  const merged: ReportBlock[] = [];
  const unchangedIds = new Set<string>();
  const currentEntries = new Map(entries(current).map(block => [block.id, block]));
  for (const [index, original] of incoming.blocks.entries()) {
    const fresh = refreshedSource.blocks[index];
    const old = matches.get(original.id);
    const local = old && current.blocks.find(block => block.id === old.id);
    const sourceChanged = !old || fingerprint(old) !== fingerprint(next[index]);
    const workbook = incomingQuadrantSources[original.id] ??
      (local?.type === "quadrant-scatter-plot" ? quadrantSources[local.id] : undefined);
    if (workbook && fresh.type === "data-visual-source") {
      if (!quadrantCacheMatches(workbook.data, fresh.data)) {
        throw new Error(`Excel doesn't match "${label(fresh)}". Update its linked chart in Word and save both files, then refresh again. Your draft hasn't changed.`);
      }
      const updated = {
        ...connectedQuadrantVisual({ ...workbook, id: fresh.id, source: fresh.source }, fresh.data),
        ...(local?.type === "quadrant-scatter-plot" ? { presentation: local.presentation } : {}),
      } as ReportBlock;
      if (!verifiedVisualMatchesSource(updated)) throw new Error("The updated Excel data doesn't match the chart preset. Check its coordinates and numerical breakdowns, then refresh again. Your draft hasn't changed.");
      merged.push(updated);
      continue;
    }
    if (sourceChanged) {
      const blocker = incoming.reviewItems.find(item => item.severity === "blocker" && item.blockId === original.id);
      if (blocker || fresh.type === "unsupported" ||
          (fresh.type === "data-visual-source" && !compatibleVerifiedVisuals(fresh).length)) {
        throw new Error(`Word couldn't be refreshed: ${blocker?.message ?? `${label(fresh)} needs valid, supported source data.`} Your draft hasn't changed.`);
      }
    }
    if (old && !local) {
      if (sourceChanged) {
        conflicts.push({ label: `${label(fresh)} (removed in Studio, changed in Word)` });
        merged.push(fresh);
      }
      continue;
    }
    if (!local || !old) {
      merged.push(fresh);
      continue;
    }
    if (!sourceChanged) {
      unchangedIds.add(old.id);
      const originalBlock = sourceManifest?.blocks.find(block => block.id === old.id);
      merged.push({
        ...local, source: fresh.source,
        ...(fresh.type === "heading" || fresh.type === "paragraph" || fresh.type === "list-item"
          ? { wordStyle: fresh.wordStyle, wordOutline: fresh.wordOutline } : {}),
        ...(local.type === "image" && fresh.type === "image" && fresh.placement === "hero"
          ? { placement: "hero" as const } : {}),
        ...(local.type === "image" && fresh.type === "image" &&
          (!originalBlock || originalBlock.type === "image" && local.alt === originalBlock.alt)
          ? { alt: fresh.alt } : {}),
      });
      continue;
    }
    const localEntry = currentEntries.get(local.id)!;
    const copiedSource = "verifiedSource" in local ? local.verifiedSource : undefined;
    const originalData = old.type === "data-visual" ? old.content as StructuredData : undefined;
    const localData = localEntry.type === "data-visual" ? localEntry.content as StructuredData : undefined;
    const unchangedCopy = originalData && localData && copiedSource?.sourceKind === "verified-upload" &&
      copiedSource.originalSource?.sha256 === originalData.sha256 &&
      Boolean(originalData.synthetic) === Boolean(localData.synthetic) &&
      (["title", "unit", "columns", "rows"] as const)
        .every(key => canonicalJson(originalData[key]) === canonicalJson(localData[key]));
    const localChanged = !unchangedCopy && fingerprint(localEntry) !== fingerprint(old);
    if ((localChanged && fingerprint(localEntry) !== fingerprint(next[index])) ||
        local.type === "paragraph" && Boolean(local.callouts?.length)) {
      conflicts.push({ label: `${label(local)} (edited in both Word and Studio)` });
    }
    const visualType = fresh.type === "data-visual-source" && "verifiedSource" in local && local.verifiedSource
      ? compatibleVerifiedVisuals(fresh, { ignoreRecommendation: true }).find(type => type === local.type) : undefined;
    if (fresh.type === "data-visual-source" && visualType) {
      merged.push({
        ...createVerifiedDataVisual(fresh, visualType, new Date().toISOString()),
        ...("presentation" in local && local.presentation ? { presentation: local.presentation } : {}),
      } as ReportBlock);
    } else {
      if ("presentation" in local && local.presentation && fresh.type !== local.type) {
        conflicts.push({ label: `${label(local)} (Word changed the chart shape)` });
      }
      merged.push({
        ...fresh,
        ...("presentation" in local && fresh.type === local.type
          ? { presentation: local.presentation } : {}),
      } as ReportBlock);
    }
  }
  for (const old of previous) {
    if (used.has(old.id)) continue;
    const local = current.blocks.find(block => block.id === old.id);
    if (!local) continue;
    const hasPresentation = ("verifiedSource" in local && local.verifiedSource) ||
      ("presentation" in local && local.presentation) ||
      (local.type === "paragraph" && local.callouts?.length);
    if (hasPresentation && next.some(block => !matches.has(block.id) && block.type === old.type)) {
      conflicts.push({ label: `${label(local)} (couldn't be matched to Word; choosing Word removes Studio styling)` });
    } else if (fingerprint(currentEntries.get(local.id)!) !== fingerprint(old)) {
      conflicts.push({ label: `${label(local)} (edited in Studio, removed in Word)` });
    }
  }
  const sourceIds = new Set(previous.map(block => block.id));
  // Keep Studio-only insertions beside their nearest surviving predecessor.
  for (const [index, block] of current.blocks.entries()) {
    if (sourceIds.has(block.id)) continue;
    const predecessor = current.blocks.slice(0, index).reverse()
      .find(candidate => merged.some(item => item.id === candidate.id));
    const insertionIndex = predecessor ? merged.findIndex(item => item.id === predecessor.id) + 1 : 0;
    merged.splice(insertionIndex, 0, block);
  }
  const metadata = { ...incoming.metadata };
  const originalHeading = previous.find(block => block.type === "heading" &&
    (block.content as { level?: number }).level === 1);
  const baseMetadata: Partial<ReportManifest["metadata"]> = sourceManifest?.metadata ??
    { title: (originalHeading?.content as { text?: string } | undefined)?.text };
  for (const key of ["title", "author", "publishedDate", "readTimeMinutes", "topics"] as const) {
    const base = baseMetadata[key];
    if (canonicalJson(current.metadata[key]) === canonicalJson(incoming.metadata[key])) continue;
    if (canonicalJson(incoming.metadata[key]) === canonicalJson(base)) {
      Object.assign(metadata, { [key]: current.metadata[key] });
    } else if (canonicalJson(current.metadata[key]) !== canonicalJson(base)) {
      conflicts.push({ label: `Report ${key} (edited in both Word and Studio)` });
    }
  }
  return {
    manifest: reportManifestSchema.parse({
      ...refreshedSource, metadata, blocks: merged,
      reviewItems: [
        ...refreshedSource.reviewItems.filter(item => !item.blockId || !unchangedIds.has(item.blockId)),
        ...current.reviewItems.filter(item => item.blockId && unchangedIds.has(item.blockId)),
      ],
    }),
    sourceManifest: refreshedSource, conflicts, unchanged,
  };
}
