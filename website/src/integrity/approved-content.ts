import { z } from "zod";

import type {
  ReportBlock,
  ReportManifest,
} from "../manifest/report-manifest.ts";
import { DATA_VISUAL_PREVIEW_TIMESTAMP } from "../visualization/data-visual-preview.ts";
import {
  automaticallyVerifiedVisualType,
  verifiedVisualMatchesSource,
} from "../visualization/verified-data-visual.ts";

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const approvedContentSnapshotSchema = z.object({
  schemaVersion: z.literal("1"),
  sourceSha256: sha256Schema,
  blocks: z.array(
    z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      source: z.object({
        part: z.string().min(1),
        index: z.number().int().nonnegative(),
        paragraphId: z.string().optional(),
      }),
      content: z.unknown(),
    }),
  ),
});

export const approvedContentRecordSchema = z.object({
  snapshot: approvedContentSnapshotSchema,
  sha256: sha256Schema,
});

export type ApprovedContentSnapshot = z.infer<
  typeof approvedContentSnapshotSchema
>;
export type ApprovedContentRecord = z.infer<typeof approvedContentRecordSchema>;

export type IntegrityResult =
  | { status: "intact"; reason: "intact"; message: string }
  | {
      status: "review-required";
      reason:
        | "content-drift"
        | "data-verification-required"
        | "visual-source-mismatch";
      message: string;
    }
  | {
      status: "unverified";
      reason: "missing-approved-content";
      message: string;
    };

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)]),
  );
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

export async function sha256Text(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function semanticBlock(block: ReportBlock) {
  if (block.source.part === "studio" || block.type === "visual-placeholder") {
    return undefined;
  }

  if (block.type === "data-visual-source") {
    if (block.data.evidenceImage) {
      return {
        id: block.id,
        type: "image",
        source: block.source,
        content: {
          fileName: block.data.evidenceImage.fileName,
          width: block.data.evidenceImage.width,
          height: block.data.evidenceImage.height,
          sourceAsset: block.data.evidenceImage.sourceAssetSha256,
        },
      };
    }
    return {
      id: block.id,
      type: "data-visual",
      source: block.source,
      content: block.data,
    };
  }

  if (
    (block.type === "percentage-ring-group" ||
      block.type === "listening-methods-comparison" ||
      block.type === "horizontal-bar-chart" ||
      block.type === "grouped-column-comparison") &&
    block.verifiedSource
  ) {
    if (block.verifiedSource.evidenceImage) {
      return {
        id: block.id,
        type: "image",
        source: block.source,
        content: {
          fileName: block.verifiedSource.evidenceImage.fileName,
          width: block.verifiedSource.evidenceImage.width,
          height: block.verifiedSource.evidenceImage.height,
          sourceAsset: block.verifiedSource.evidenceImage.sourceAssetSha256,
        },
      };
    }
    return {
      id: block.id,
      type: "data-visual",
      source: block.source,
      content: {
        sourceKind: block.verifiedSource.sourceKind,
        title: block.verifiedSource.title,
        unit: block.verifiedSource.unit,
        columns: block.verifiedSource.columns,
        rows: block.verifiedSource.rows,
        sha256: block.verifiedSource.sha256,
        recommendedVisualType:
          block.verifiedSource.recommendedVisualType,
        subtitle: block.verifiedSource.subtitle,
        sourceNote: block.verifiedSource.sourceNote,
      },
    };
  }

  if (block.type === "image") {
    return {
      id: block.id,
      type: block.type,
      source: block.source,
      content: {
        fileName: block.fileName,
        width: block.width,
        height: block.height,
        sourceAsset:
          block.sourceAssetSha256 ?? canonicalJson({ dataUrl: block.dataUrl }),
        placement: block.placement,
        eyebrow: block.eyebrow,
        contentKind: block.contentKind,
        accessibleData: block.accessibleData,
      },
    };
  }

  const content = { ...block } as Record<string, unknown>;
  delete content.id;
  delete content.provenance;
  delete content.source;
  return {
    id: block.id,
    type: block.type,
    source: block.source,
    content,
  };
}

export function snapshotApprovedContent(
  manifest: ReportManifest,
): ApprovedContentSnapshot {
  return approvedContentSnapshotSchema.parse({
    schemaVersion: "1",
    sourceSha256: manifest.source.sha256,
    blocks: manifest.blocks.flatMap((block) => {
      const normalized = semanticBlock(block);
      return normalized ? [normalized] : [];
    }),
  });
}

export async function createApprovedContentRecord(
  manifest: ReportManifest,
): Promise<ApprovedContentRecord> {
  const snapshot = snapshotApprovedContent(manifest);
  return approvedContentRecordSchema.parse({
    snapshot,
    sha256: await sha256Text(canonicalJson(snapshot)),
  });
}

export function evaluateApprovedContentIntegrity(
  manifest: ReportManifest,
  approvedContent?: ApprovedContentRecord,
): IntegrityResult {
  if (!approvedContent) {
    return {
      status: "unverified",
      reason: "missing-approved-content",
      message:
        "This saved project predates approved-content protection. Re-import the reviewed Word document.",
    };
  }

  const current = snapshotApprovedContent(manifest);
  if (canonicalJson(current) !== canonicalJson(approvedContent.snapshot)) {
    return {
      status: "review-required",
      reason: "content-drift",
      message:
        "Approved words, data, source assets, or their ordering no longer match the imported source.",
    };
  }

  const pendingDataVisual = manifest.blocks.find(
    (block) =>
      block.type === "data-visual-source" &&
      !automaticallyVerifiedVisualType(block),
  );
  if (pendingDataVisual) {
    return {
      status: "review-required",
      reason: "data-verification-required",
      message:
        "Review the flagged structured data before publishing its coded visual.",
    };
  }

  const unsafeVisual = manifest.blocks.find(
    (block) =>
      (block.type === "percentage-ring-group" ||
        block.type === "horizontal-bar-chart" ||
        block.type === "grouped-column-comparison") &&
      (!block.verifiedSource ||
        block.verifiedSource.verifiedAt === DATA_VISUAL_PREVIEW_TIMESTAMP ||
        !verifiedVisualMatchesSource(block)),
  );
  if (unsafeVisual) {
    return {
      status: "review-required",
      reason: "visual-source-mismatch",
      message:
        "A coded data visual is not linked to verified structured source data.",
    };
  }

  return {
    status: "intact",
    reason: "intact",
    message: "Approved words and data still match the imported source.",
  };
}
