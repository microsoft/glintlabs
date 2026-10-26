import type {
  ReportBlock,
  ReportManifest,
  ReviewItem,
} from "../manifest/report-manifest.ts";

export type RemovedBlock = {
  block: ReportBlock;
  index: number;
  reviewItems: ReviewItem[];
};

export function removeReportBlock(
  manifest: ReportManifest,
  blockId: string,
): { manifest: ReportManifest; removed?: RemovedBlock } {
  const index = manifest.blocks.findIndex((block) => block.id === blockId);
  if (index < 0) {
    return { manifest };
  }

  const removed = {
    block: manifest.blocks[index],
    index,
    reviewItems: manifest.reviewItems.filter(
      (item) => item.blockId === blockId,
    ),
  };

  return {
    manifest: {
      ...manifest,
      blocks: manifest.blocks.filter((block) => block.id !== blockId),
      reviewItems: manifest.reviewItems.filter(
        (item) => item.blockId !== blockId,
      ),
    },
    removed,
  };
}

export function restoreReportBlock(
  manifest: ReportManifest,
  removed: RemovedBlock,
): ReportManifest {
  if (manifest.blocks.some((block) => block.id === removed.block.id)) {
    return manifest;
  }

  const index = Math.min(removed.index, manifest.blocks.length);
  const restoredReviewItemIds = new Set(
    removed.reviewItems.map((item) => item.id),
  );

  return {
    ...manifest,
    blocks: [
      ...manifest.blocks.slice(0, index),
      removed.block,
      ...manifest.blocks.slice(index),
    ],
    reviewItems: [
      ...manifest.reviewItems.filter(
        (item) => !restoredReviewItemIds.has(item.id),
      ),
      ...removed.reviewItems,
    ],
  };
}
