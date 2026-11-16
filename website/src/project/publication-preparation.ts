import { z } from "zod";
import { structuredDataSchema } from "../manifest/report-manifest.ts";
import type { ReportBlock } from "../manifest/report-manifest.ts";

export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
export const publicationDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid calendar date.");

export const publicationMetadataSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens.")
    .refine((value) => value !== "preview", "Choose a report address other than preview."),
  title: z.string().trim().min(1, "Enter the public report title."),
  summary: z.string().trim().min(1, "Enter a catalog summary."),
  eyebrow: z.string().trim().min(1, "Enter the report label or series."),
  displayDate: publicationDateSchema,
  author: z.object({
    name: z.string().trim().min(1, "Enter the author's display name."),
    handle: z.string().trim().min(1).optional(),
  }).strict(),
  readTimeMinutes: z.number().int().positive("Enter a positive reading time."),
  employeeCount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  topics: z.array(z.string().trim().min(1)).max(3),
  thumbnail: z.object({
    source: z.string().min(1, "Choose a thumbnail image."),
    alt: z.string().trim().min(1, "Describe the thumbnail."),
    presentation: z.enum(["image", "illustration"]).optional(),
    altConfirmed: z.boolean().optional(),
  }).strict(),
  catalog: z.object({
    featured: z.boolean(),
    featuredUntil: publicationDateSchema.nullable(),
  }).strict(),
}).strict().refine(
  (value) => !value.catalog.featuredUntil || value.catalog.featuredUntil >= value.displayDate,
  { message: "The feature end date cannot precede the report date.", path: ["catalog", "featuredUntil"] },
);

export const publicationImageReviewSchema = z.object({
  blockId: z.string().min(1),
  assetSha256: sha256Schema,
  alt: z.string(),
  description: z.string().trim().optional(),
  kind: z.enum(["non-data", "data-bearing"]).optional(),
  descriptionConfirmed: z.boolean().optional(),
  accessibleData: structuredDataSchema.optional(),
  dataConfirmed: z.boolean().optional(),
}).strict().refine(
  (value) => value.kind !== "non-data" || !value.accessibleData,
  "Photos and illustrations cannot carry chart data.",
);

export const publicationSourceEvidenceSchema = z.object({
  sourceSha256: sha256Schema,
  hyperlinkCount: z.number().int().nonnegative(),
  representedHyperlinkCount: z.number().int().nonnegative().optional(),
}).strict();

export const publicationPreparationSchema = z.object({
  metadata: publicationMetadataSchema,
  imageReviews: z.array(publicationImageReviewSchema),
  lastPackage: z.object({
    revision: z.number().int().positive(),
    fingerprint: sha256Schema,
  }).strict().optional(),
}).strict();

export type PublicationMetadata = z.infer<typeof publicationMetadataSchema>;
export type PublicationImageReview = z.infer<typeof publicationImageReviewSchema>;
export type PublicationSourceEvidence = z.infer<typeof publicationSourceEvidenceSchema>;
export type PublicationPreparation = z.infer<typeof publicationPreparationSchema>;

export function applyImageReview(
  block: Extract<ReportBlock, { type: "image" }>,
  review?: PublicationImageReview,
) {
  if (!review) return block;
  return {
    ...block,
    alt: review.description ?? block.alt,
    contentKind: review.kind ?? (review.accessibleData ? "data-bearing" as const : block.contentKind),
    accessibleData: review.accessibleData ?? block.accessibleData,
  };
}
