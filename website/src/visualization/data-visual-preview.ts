import type {
  DataVisualSourceBlock,
  VerifiedDataVisualType,
} from "./verified-data-visual.ts";
import { createVerifiedDataVisual } from "./verified-data-visual.ts";

export const DATA_VISUAL_PREVIEW_TIMESTAMP = "1970-01-01T00:00:00.000Z";

export function createDataVisualPreview(
  source: DataVisualSourceBlock,
  type: VerifiedDataVisualType,
) {
  return createVerifiedDataVisual(
    source,
    type,
    DATA_VISUAL_PREVIEW_TIMESTAMP,
  );
}
