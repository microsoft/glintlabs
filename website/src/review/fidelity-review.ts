import type {
  ReportBlock,
  ReviewItem,
} from "../manifest/report-manifest.ts";

export function resolveReviewItemsForBlock(
  reviewItems: ReviewItem[],
  block: ReportBlock,
) {
  return reviewItems.filter((item) => {
    if (item.blockId !== block.id) {
      return true;
    }

    switch (item.code) {
      case "missing-image-description":
        return block.type === "image" && !block.alt.trim();
      case "visual-treatment-needed":
        return block.type === "visual-placeholder";
      case "bitmap-visual-needs-data":
        return block.type === "image";
      default:
        return true;
    }
  });
}

export function activeAcceptedReviewItemIds(
  reviewItems: ReviewItem[],
  acceptedReviewItemIds: string[],
) {
  const activeIds = new Set(reviewItems.map((item) => item.id));
  return acceptedReviewItemIds.filter((id) => activeIds.has(id));
}
