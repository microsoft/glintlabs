import { z } from "zod";

import { reportManifestSchema } from "../manifest/report-manifest.ts";
import {
  DEFAULT_REPORT_STYLE,
  reportStyleSchema,
} from "../report-system/report-style.ts";
import { featuredIllustrationPaths, legacyFeaturedIllustrationPaths } from "./featured-illustrations.ts";

export const featuredThumbnailSchema = z.object({
  alt: z.string(),
  focalPointX: z.number().min(0).max(100),
  focalPointY: z.number().min(0).max(100),
  src: z.string().refine(
    (value) => value.startsWith("data:image/") || value.startsWith("/"),
    "The featured thumbnail must be an approved illustration or legacy report image.",
  ),
});

export const publicationPlacementSchema = z.object({
  library: z.literal(true),
  topics: z.array(z.string().trim().min(1)).max(3),
  homepage: z.object({
    featured: z.boolean(),
    featuredUntil: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
  }),
});

const defaultPublicationPlacement = {
  library: true as const,
  topics: [],
  homepage: {
    featured: true,
    featuredUntil: null,
  },
};

export const publishedPreviewSchema = z
  .object({
    schemaVersion: z.literal("1"),
    id: z.string().uuid(),
    manifest: reportManifestSchema,
    reportStyle: reportStyleSchema.default(DEFAULT_REPORT_STYLE),
    placement: publicationPlacementSchema.default(defaultPublicationPlacement),
    publishedAt: z.string().datetime(),
    thumbnail: featuredThumbnailSchema,
  })
  .superRefine((preview, context) => {
    const reportImages = preview.manifest.blocks.filter(
      (block) => block.type === "image",
    );
    const matchesApprovedImage = reportImages.some(
      (block) =>
        block.dataUrl === preview.thumbnail.src &&
        block.alt === preview.thumbnail.alt,
    );
    const usesDefault =
      reportImages.length === 0 &&
      preview.thumbnail.src === "/figma/report-hero/frame-105.png";
    const usesFeaturedIllustration = featuredIllustrationPaths.has(
      preview.thumbnail.src,
    ) || legacyFeaturedIllustrationPaths.has(preview.thumbnail.src);

    if (!matchesApprovedImage && !usesDefault && !usesFeaturedIllustration) {
      context.addIssue({
        code: "custom",
        message:
          "The featured thumbnail must use an approved Glint Labs illustration.",
        path: ["thumbnail", "src"],
      });
    }
    if (
      preview.placement.homepage.featured &&
      preview.placement.homepage.featuredUntil &&
      preview.placement.homepage.featuredUntil < preview.publishedAt.slice(0, 10)
    ) {
      context.addIssue({
        code: "custom",
        message: "The homepage feature end date cannot be before publishing.",
        path: ["placement", "homepage", "featuredUntil"],
      });
    }
  });

export type FeaturedThumbnail = z.infer<typeof featuredThumbnailSchema>;
export type PublicationPlacement = z.infer<
  typeof publicationPlacementSchema
>;
export type PublishedPreview = z.infer<typeof publishedPreviewSchema>;
