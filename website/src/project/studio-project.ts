import { z } from "zod";

import { approvedContentRecordSchema, canonicalJson } from "../integrity/approved-content.ts";
import { activeAcceptedReviewItemIds } from "../review/fidelity-review.ts";
import {
  publicationPreparationSchema,
  publicationImageReviewSchema,
  publicationSourceEvidenceSchema,
} from "./publication-preparation.ts";
import {
  reportManifestSchema,
  type ReportManifest,
} from "../manifest/report-manifest.ts";
import {
  DEFAULT_REPORT_STYLE,
  reportStyleSchema,
  type ReportStyle,
} from "../report-system/report-style.ts";

export const STUDIO_PROJECT_VERSION = "2";

const sourceApprovalSchema = z.object({
  confirmedAt: z.string().datetime(),
  statementVersion: z.literal("1"),
  reference: z.string().max(240).optional(),
});

const publishReceiptSchema = z.object({
  approvedContentSha256: z.string().regex(/^[a-f0-9]{64}$/),
  fileName: z.string().min(1),
  publishedAt: z.string().datetime(),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export const studioProjectSchema = z.object({
  schemaVersion: z.literal(STUDIO_PROJECT_VERSION),
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.enum(["draft", "ready"]),
  importedManifestSha256: z.string().regex(/^[a-f0-9]{64}$/),
  approvedContent: approvedContentRecordSchema.optional(),
  sourceApproval: sourceApprovalSchema.optional(),
  reportStyle: reportStyleSchema.default(DEFAULT_REPORT_STYLE),
  manifest: reportManifestSchema,
  acceptedReviewItemIds: z.array(z.string().min(1)).default([]),
  publishReceipts: z.array(publishReceiptSchema).default([]),
  publicationSourceEvidence: publicationSourceEvidenceSchema.optional(),
  publicationPreparation: publicationPreparationSchema.optional(),
  imageReviews: z.array(publicationImageReviewSchema).optional(),
});

const legacyStudioProjectSchema = z.object({
  schemaVersion: z.literal("1"),
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.enum(["draft", "ready"]),
  importedManifestSha256: z.string().regex(/^[a-f0-9]{64}$/),
  manifest: reportManifestSchema,
  acceptedReviewItemIds: z.array(z.string().min(1)).default([]),
});

export type StudioProject = z.infer<typeof studioProjectSchema>;
export type SourceApproval = z.infer<typeof sourceApprovalSchema>;
export type PublishReceipt = z.infer<typeof publishReceiptSchema>;

export function studioImageReviews(
  project: Pick<StudioProject, "imageReviews" | "publicationPreparation">,
) {
  return project.imageReviews ?? project.publicationPreparation?.imageReviews ?? [];
}

type StudioEditingState = Pick<StudioProject, "manifest" | "reportStyle" | "acceptedReviewItemIds" | "imageReviews" | "publicationPreparation">;

function editingState({
  manifest,
  reportStyle,
  acceptedReviewItemIds,
  imageReviews,
  publicationPreparation,
}: StudioEditingState) {
  return {
    manifest,
    reportStyle,
    imageReviews: studioImageReviews({ imageReviews, publicationPreparation }),
    acceptedReviewItemIds: activeAcceptedReviewItemIds(
      manifest.reviewItems, acceptedReviewItemIds,
    ).toSorted(),
  };
}

function sameEditingValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left)) {
    return Array.isArray(right) && left.length === right.length &&
      left.every((value, index) => sameEditingValue(value, right[index]));
  }
  if (left === null || right === null ||
    typeof left !== "object" || typeof right !== "object" || Array.isArray(right)) {
    return false;
  }
  const rightRecord = right as Record<string, unknown>;
  const entries = Object.entries(left).filter(([, value]) => value !== undefined);
  return entries.length === Object.keys(right).filter((key) => rightRecord[key] !== undefined).length &&
    entries.every(([key, value]) => Object.hasOwn(right, key) && sameEditingValue(value, rightRecord[key]));
}

export function hasStudioProjectChanges(current: StudioEditingState, saved?: StudioEditingState) {
  return !saved || !sameEditingValue(editingState(current), editingState(saved));
}

export function studioEditingSnapshot(project: StudioEditingState) {
  return canonicalJson(editingState(project));
}

export function createStudioProject({
  acceptedReviewItemIds = [],
  approvedContent,
  id,
  importedManifestSha256,
  manifest,
  publicationPreparation,
  imageReviews = publicationPreparation?.imageReviews,
  publicationSourceEvidence,
  publishReceipts = [],
  reportStyle = DEFAULT_REPORT_STYLE,
  sourceApproval,
  status,
}: {
  acceptedReviewItemIds?: string[];
  approvedContent?: StudioProject["approvedContent"];
  id?: string;
  importedManifestSha256: string;
  manifest: ReportManifest;
  publicationPreparation?: StudioProject["publicationPreparation"];
  imageReviews?: StudioProject["imageReviews"];
  publicationSourceEvidence?: StudioProject["publicationSourceEvidence"];
  publishReceipts?: PublishReceipt[];
  reportStyle?: ReportStyle;
  sourceApproval?: SourceApproval;
  status: StudioProject["status"];
}): StudioProject {
  const timestamp = new Date().toISOString();
  return studioProjectSchema.parse({
    schemaVersion: STUDIO_PROJECT_VERSION,
    id: id ?? crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    status,
    importedManifestSha256,
    approvedContent,
    sourceApproval,
    reportStyle,
    manifest,
    imageReviews,
    publicationPreparation: publicationPreparation && {
      ...publicationPreparation,
      imageReviews: imageReviews ?? publicationPreparation.imageReviews,
    },
    publicationSourceEvidence,
    acceptedReviewItemIds,
    publishReceipts,
  });
}

export function updateStudioProject(
  project: StudioProject,
  {
    acceptedReviewItemIds,
    approvedContent = project.approvedContent,
    manifest,
    publicationPreparation = project.publicationPreparation,
    imageReviews = publicationPreparation?.imageReviews ?? project.imageReviews,
    publicationSourceEvidence = project.publicationSourceEvidence,
    publishReceipts = project.publishReceipts,
    reportStyle = project.reportStyle,
    sourceApproval = project.sourceApproval,
    status,
  }: {
    acceptedReviewItemIds: string[];
    approvedContent?: StudioProject["approvedContent"];
    manifest: ReportManifest;
    publicationPreparation?: StudioProject["publicationPreparation"];
    imageReviews?: StudioProject["imageReviews"];
    publicationSourceEvidence?: StudioProject["publicationSourceEvidence"];
    publishReceipts?: PublishReceipt[];
    reportStyle?: ReportStyle;
    sourceApproval?: SourceApproval;
    status: StudioProject["status"];
  },
): StudioProject {
  return studioProjectSchema.parse({
    ...project,
    updatedAt: new Date().toISOString(),
    status,
    approvedContent,
    sourceApproval,
    reportStyle,
    manifest,
    imageReviews,
    publicationPreparation: publicationPreparation && {
      ...publicationPreparation,
      imageReviews: imageReviews ?? publicationPreparation.imageReviews,
    },
    publicationSourceEvidence,
    acceptedReviewItemIds,
    publishReceipts,
  });
}

export function parseStudioProject(value: unknown): StudioProject {
  if (
    typeof value !== "object" ||
    value === null ||
    !("schemaVersion" in value)
  ) {
    throw new Error("This saved project does not have a recognized version.");
  }

  if (value.schemaVersion === "1") {
    const legacy = legacyStudioProjectSchema.parse(value);
    return studioProjectSchema.parse({
      ...legacy,
      schemaVersion: STUDIO_PROJECT_VERSION,
      status: "draft",
      acceptedReviewItemIds: legacy.acceptedReviewItemIds,
      publishReceipts: [],
    });
  }

  if (value.schemaVersion !== STUDIO_PROJECT_VERSION) {
    throw new Error(
      `Studio project version "${String(value.schemaVersion)}" is not supported.`,
    );
  }

  return studioProjectSchema.parse(value);
}
