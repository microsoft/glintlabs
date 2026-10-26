import { z } from "zod";

export const sourceLocatorSchema = z.object({
  part: z.string().min(1),
  index: z.number().int().nonnegative(),
  paragraphId: z.string().optional(),
});

const baseBlockSchema = z.object({
  id: z.string().min(1),
  source: sourceLocatorSchema,
  provenance: z
    .object({
      kind: z.enum(["imported", "derived", "studio"]),
      sourceBlockId: z.string().min(1).optional(),
    })
    .optional(),
});

const percentageSchema = z.number().min(0).max(100);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const imageSourceSchema = z.union([
  z.string().startsWith("data:"),
  z.string().startsWith("/"),
]);
const verifiedVisualTypeSchema = z.enum([
  "percentage-ring-group",
  "horizontal-bar-chart",
  "grouped-column-comparison",
]);

export const reportLinkHrefSchema = z.string().refine(
  (value) =>
    /^(?:https?:\/\/|mailto:|\/(?!\/)|#)/i.test(value),
  "Links must use HTTP, HTTPS, mailto, a same-site path, or a fragment.",
);

export const reportTextLinkSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  href: reportLinkHrefSchema,
});

const bitmapEvidenceSchema = z.object({
  fileName: z.string().min(1),
  dataUrl: imageSourceSchema,
  width: z.number().positive(),
  height: z.number().positive(),
  sourceAssetSha256: sha256Schema,
});

export const structuredDataSchema = z.object({
  sourceKind: z.enum([
    "word-chart",
    "word-table",
    "verified-upload",
    // Retained only for previously saved reports.
    "bitmap-ocr",
  ]),
  title: z.string().min(1),
  unit: z.enum(["percentage", "number", "unknown"]),
  columns: z.array(z.string().min(1)).min(2),
  rows: z
    .array(
      z.object({
        id: z.string().min(1),
        cells: z.array(z.string()).min(2),
      }),
    )
    .min(1),
  sha256: sha256Schema,
  evidenceImage: bitmapEvidenceSchema.optional(),
  recommendedVisualType: verifiedVisualTypeSchema.optional(),
  subtitle: z.string().min(1).optional(),
  sourceNote: z.string().min(1).optional(),
});

const verifiedDataSourceSchema = structuredDataSchema.extend({
  verifiedAt: z.string().datetime(),
});

const chartItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: percentageSchema,
});

const imagePresentationSchema = z.object({
  style: z.enum(["original", "glint-labs"]),
  crop: z.enum(["original", "landscape", "editorial"]),
  focalPointX: percentageSchema,
  focalPointY: percentageSchema,
});

export const reportBlockSchema = z.discriminatedUnion("type", [
  baseBlockSchema.extend({
    type: z.literal("heading"),
    level: z.number().int().min(1).max(6),
    text: z.string().min(1),
  }),
  baseBlockSchema.extend({
    type: z.literal("paragraph"),
    text: z.string().min(1),
    links: z.array(reportTextLinkSchema).optional(),
  }),
  baseBlockSchema.extend({
    type: z.literal("list-item"),
    text: z.string().min(1),
    links: z.array(reportTextLinkSchema).optional(),
    level: z.number().int().nonnegative(),
  }),
  baseBlockSchema.extend({
    type: z.literal("image"),
    alt: z.string(),
    fileName: z.string().min(1),
    dataUrl: imageSourceSchema,
    width: z.number().positive(),
    height: z.number().positive(),
    sourceAssetSha256: sha256Schema.optional(),
    assetSource: z.enum(["word-import", "brand-central", "local"]).optional(),
    placement: z.enum(["body", "hero"]).optional(),
    eyebrow: z.string().min(1).optional(),
    presentation: imagePresentationSchema.optional(),
    contentKind: z.enum(["non-data", "data-bearing"]).optional(),
    accessibleData: structuredDataSchema.optional(),
  }),
  baseBlockSchema.extend({
    type: z.literal("data-visual-source"),
    data: structuredDataSchema,
  }),
  baseBlockSchema.extend({
    type: z.literal("visual-placeholder"),
    description: z.string().min(1),
  }),
  baseBlockSchema.extend({
    type: z.literal("branded-visual"),
    visualKind: z.enum(["comparison", "statistic", "callout"]),
    title: z.string().min(1),
    values: z.array(z.string().min(1)),
  }),
  baseBlockSchema.extend({
    type: z.literal("percentage-ring-group"),
    title: z.string().min(1),
    metrics: z
      .array(
        z.object({
          id: z.string().min(1),
          value: z.number().min(0).max(100),
          description: z.string().min(1),
        }),
      )
      .length(3),
    footnote: z.string().min(1),
    verifiedSource: verifiedDataSourceSchema.optional(),
  }),
  baseBlockSchema.extend({
    type: z.literal("listening-approach-continuum"),
    eyebrow: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    rows: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          description: z.string().min(1),
          positions: z.array(percentageSchema).min(1).max(8),
        }),
      )
      .length(3),
  }),
  baseBlockSchema.extend({
    type: z.literal("featured-statistic"),
    title: z.string().min(1),
    statistic: z.string().min(1),
    description: z.string().min(1),
    sourceNote: z.string().min(1),
  }),
  baseBlockSchema.extend({
    type: z.literal("data-callout"),
    variant: z.enum(["compact", "detailed"]),
    title: z.string().min(1).optional(),
    paragraphs: z.array(z.string().min(1)).min(1).max(3).optional(),
    eyebrow: z.string().min(1).optional(),
    statistic: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    sourceNote: z.string().min(1).optional(),
  }),
  baseBlockSchema.extend({
    type: z.literal("references"),
    title: z.string().min(1),
    intro: z.string().min(1).optional(),
    references: z
      .array(
        z.object({
          id: z.string().min(1),
          title: z.string().min(1),
          citation: z.string().min(1).optional(),
          href: reportLinkHrefSchema.optional(),
        }),
      )
      .min(2)
      .max(4),
  }),
  baseBlockSchema.extend({
    type: z.literal("listening-methods-comparison"),
    eyebrow: z.string().min(1),
    methods: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          value: percentageSchema,
          badge: z.string().min(1),
        }),
      )
      .length(4),
    benchmark: z.object({
      label: z.string().min(1),
      description: z.string().min(1),
      value: percentageSchema,
    }),
    verifiedSource: verifiedDataSourceSchema.optional(),
  }),
  baseBlockSchema.extend({
    type: z.literal("pull-quote"),
    quote: z.string().min(1),
  }),
  baseBlockSchema.extend({
    type: z.literal("horizontal-bar-chart"),
    title: z.string().min(1),
    items: z.array(chartItemSchema).min(2).max(12),
    legend: z.string().min(1),
    sourceNote: z.string().min(1),
    verifiedSource: verifiedDataSourceSchema.optional(),
  }),
  baseBlockSchema.extend({
    type: z.literal("grouped-column-comparison"),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    series: z.tuple([z.string().min(1), z.string().min(1)]),
    groups: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          values: z.tuple([percentageSchema, percentageSchema]),
        }),
      )
      .length(4),
    sourceNote: z.string().min(1),
    verifiedSource: verifiedDataSourceSchema.optional(),
  }),
  baseBlockSchema.extend({
    type: z.literal("before-after-comparison"),
    title: z.string().min(1),
    sections: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          beforeTitle: z.string().min(1),
          beforeDescription: z.string().min(1),
          afterTitle: z.string().min(1),
          afterDescription: z.string().min(1),
          summary: z.string().min(1),
        }),
      )
      .length(3),
  }),
  baseBlockSchema.extend({
    type: z.literal("impact-metrics"),
    title: z.string().min(1),
    intro: z.string().min(1).optional(),
    metrics: z
      .array(
        z.object({
          id: z.string().min(1),
          text: z.string().min(1),
        }),
      )
      .min(2)
      .max(3),
  }),
  baseBlockSchema.extend({
    type: z.literal("two-column-insight"),
    eyebrow: z.string().min(1),
    lead: z.string().min(1),
    insights: z
      .array(
        z.object({
          id: z.string().min(1),
          title: z.string().min(1),
          description: z.string().min(1),
        }),
      )
      .length(2),
  }),
  baseBlockSchema.extend({
    type: z.literal("listening-maturity-scorecard"),
    title: z.string().min(1),
    intro: z.string().min(1),
    categories: z
      .array(
        z.object({
          id: z.string().min(1),
          title: z.string().min(1),
          criteria: z.array(z.string().min(1)).min(1),
        }),
      )
      .length(4),
  }),
  baseBlockSchema.extend({
    type: z.literal("unsupported"),
    description: z.string().min(1),
  }),
]);

export const reviewItemSchema = z.object({
  id: z.string().min(1),
  code: z
    .enum([
      "unsupported-table",
      "unresolved-image",
      "missing-image-description",
      "visual-treatment-needed",
      "style-flattened",
      "comments-omitted",
      "bitmap-visual-needs-data",
      "structured-data-ambiguous",
      "invalid-component-block",
    ])
    .optional(),
  severity: z.enum(["blocker", "warning"]),
  message: z.string().min(1),
  blockId: z.string().optional(),
  source: sourceLocatorSchema.optional(),
});

export const reportManifestSchema = z.object({
  schemaVersion: z.literal("0.1.0"),
  source: z.object({
    fileName: z.string().min(1),
    sizeBytes: z.number().int().positive(),
    sha256: sha256Schema,
  }),
  metadata: z.object({
    title: z.string().min(1),
    status: z.literal("draft"),
    author: z
      .object({
        name: z.string().min(1),
        handle: z.string().min(1).optional(),
      })
      .optional(),
    publishedDate: z.string().min(1).optional(),
    readTimeMinutes: z.number().int().positive().optional(),
    topics: z.array(z.string().trim().min(1)).max(3).optional(),
  }),
  blocks: z.array(reportBlockSchema).min(1),
  reviewItems: z.array(reviewItemSchema),
  extraction: z.object({
    paragraphCount: z.number().int().nonnegative(),
    imageCount: z.number().int().nonnegative(),
    unsupportedCount: z.number().int().nonnegative(),
  }),
}).superRefine((manifest, context) => {
  for (const [blockIndex, block] of manifest.blocks.entries()) {
    if (block.type === "paragraph" || block.type === "list-item") {
      let previousEnd = 0;
      for (const [linkIndex, link] of (block.links ?? []).entries()) {
        if (
          link.start >= link.end ||
          link.end > block.text.length ||
          link.start < previousEnd
        ) {
          context.addIssue({
            code: "custom",
            message:
              "Text links must be ordered, non-overlapping ranges within the block text.",
            path: ["blocks", blockIndex, "links", linkIndex],
          });
        }
        previousEnd = link.end;
      }
    }

    if (block.type === "image") {
      if (block.contentKind === "non-data" && block.accessibleData) {
        context.addIssue({
          code: "custom",
          message:
            "Non-data images cannot declare structured accessible chart data.",
          path: ["blocks", blockIndex, "accessibleData"],
        });
      }
    }
  }
});

export type ReportBlock = z.infer<typeof reportBlockSchema>;
export type ReportManifest = z.infer<typeof reportManifestSchema>;
export type ReviewItem = z.infer<typeof reviewItemSchema>;
export type StructuredData = z.infer<typeof structuredDataSchema>;
