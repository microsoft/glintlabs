import { z } from "zod";
import { statisticIllustrations } from "../visualization/statistic-illustrations.ts";
import { researchVisualColumnCounts, researchVisualTemplates } from "../visualization/research-visual-types.ts";
import { lineChartFields, lineChartMatrixValid } from "../visualization/line-chart-model.ts";

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
  "line-chart",
  "paired-percentage-comparison",
  "percentage-comparison-grid",
  "percentage-ring-group",
  "illustrated-statistics",
  "quadrant-scatter-plot",
  "horizontal-bar-chart",
  "grouped-column-comparison",
  "grouped-bar-comparison",
  "comparison-panel-group",
  "coefficient-heatmap",
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

export const wordStyleTargetSchema = z.enum([
  "keep", "body", "report-title", "metadata", "section-heading", "subsection-heading", "brief", "references",
]);
export type WordStyleTarget = z.infer<typeof wordStyleTargetSchema>;

const wordTextFields = {
  wordStyle: z.string().min(1).optional(),
  wordOutline: z.number().int().min(0).max(9).optional(),
  marks: z.array(z.object({
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    bold: z.literal(true).optional(),
    italic: z.literal(true).optional(),
    superscript: z.literal(true).optional(),
    subscript: z.literal(true).optional(),
  })).optional(),
  links: z.array(reportTextLinkSchema).optional(),
};

const bitmapEvidenceSchema = z.object({
  fileName: z.string().min(1),
  dataUrl: imageSourceSchema,
  width: z.number().positive(),
  height: z.number().positive(),
  sourceAssetSha256: sha256Schema,
  placement: z.enum(["body", "hero"]).optional(),
  eyebrow: z.string().min(1).optional(),
  contentKind: z.enum(["non-data", "data-bearing"]).optional(),
});

export const imageChartCropSchema = z.object({
  x: z.number().min(0).max(1), y: z.number().min(0).max(1),
  width: z.number().positive().max(1), height: z.number().positive().max(1),
}).refine(crop => crop.x + crop.width <= 1.000001 && crop.y + crop.height <= 1.000001, "Keep the crop inside the image.");

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
        seriesLabels: z.tuple([z.string().trim().min(1).max(100), z.string().trim().min(1).max(100)]).optional(),
        supportingText: z.string().optional(),
        breakdown: z.array(z.object({
          id: z.string().min(1),
          label: z.string(),
          value: z.string(),
        })).optional(),
      }),
    )
    .min(1),
  sha256: sha256Schema,
  evidenceImage: bitmapEvidenceSchema.optional(),
  imageReconstruction: z.object({
    engine: z.literal("tesseract.js-7-local"),
    reviewedAt: z.string().datetime(),
    reviewedTableSha256: sha256Schema,
    crop: imageChartCropSchema,
  }).optional(),
  recommendedVisualType: verifiedVisualTypeSchema.optional(),
  subtitle: z.string().min(1).optional(),
  sourceNote: z.string().min(1).optional(),
  synthetic: z.boolean().optional(),
  linkedWorkbookFileName: z.string().min(1).max(255).optional(),
  originalSource: z.object({
    sourceKind: z.string().min(1),
    title: z.string().min(1),
    sha256: sha256Schema,
  }).optional(),
  workbook: z.object({
    fileName: z.string().min(1), tableName: z.string().min(1), sha256: sha256Schema,
    connectionId: z.string().uuid().optional(),
  }).optional(),
});

const verifiedDataSourceSchema = structuredDataSchema.extend({
  verifiedAt: z.string().datetime(),
});

const sourcedVisualBlockSchema = baseBlockSchema.extend({
  wordSource: structuredDataSchema.optional(),
});

export const chartPresentationSchema = z.object({
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().max(240).default(""),
  note: z.string().max(2000).default(""),
  palette: z.enum(["brand", "blue", "teal"]).default("brand"),
  density: z.enum(["comfortable", "compact"]).default("comfortable"),
  sort: z.enum(["source", "ascending", "descending", "alphabetical"]).default("source"),
});
export type ChartPresentation = z.infer<typeof chartPresentationSchema>;

export const comparisonPresentationSchema = chartPresentationSchema.extend({
  showDifference: z.boolean().optional(),
  panelStyle: z.enum(["bars", "columns", "percentages"]).optional(),
  sourceBars: z.object({
    colors: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).min(2).max(3).optional(),
    useSourceColors: z.boolean().optional(),
    annotation: z.string().max(40).optional(),
  }).optional(),
});
export type ComparisonPresentation = z.infer<typeof comparisonPresentationSchema>;

export const heatmapPresentationSchema = chartPresentationSchema.pick({ title: true, subtitle: true, note: true }).extend({
  title: z.string().trim().min(1).max(240),
  scaleMin: z.number().finite().default(.1),
  scaleMax: z.number().finite().default(.35),
  decimals: z.number().int().min(0).max(6).default(3),
  missingLabel: z.string().trim().min(1).max(40).default("N/A"),
  legendLabel: z.string().trim().min(1).max(100).default("Standardized regression coefficient"),
}).refine(value => value.scaleMin < value.scaleMax && Number.isFinite(value.scaleMax - value.scaleMin), {
  path: ["scaleMax"], message: "The scale maximum must be greater than its minimum.",
});
export type HeatmapPresentation = z.infer<typeof heatmapPresentationSchema>;

export const illustratedStatisticsPresentationSchema = chartPresentationSchema.extend({
  title: z.string().trim().min(1).max(240),
  valueLabel: z.string().max(40).default("selected"),
  illustrations: z.record(z.string().min(1), z.enum(statisticIllustrations.map(image => image.id))).default({}),
});

export const pairedComparisonPresentationSchema = chartPresentationSchema
  .pick({ title: true, note: true, palette: true })
  .extend({
    leadIns: z.tuple([z.string().max(80), z.string().max(80)]).default(["", ""]),
  });

export const quadrantPresentationSchema = z.object({
  title: z.string().trim().min(1).max(240),
  subtitle: z.string().max(500).default("Select a numbered point or key entry to view its details."),
  note: z.string().max(2000).default(""),
  preset: z.enum(["general", "listening"]).default("general"),
  xLabel: z.string().trim().min(1).max(80).default("X value"),
  yLabel: z.string().trim().min(1).max(80).default("Y value"),
  xUnit: z.enum(["number", "percentage", "percentage-points"]).default("number"),
  yUnit: z.enum(["number", "percentage", "percentage-points"]).default("number"),
  quadrants: z.tuple([z.string().max(100), z.string().max(100), z.string().max(100), z.string().max(100)])
    .default(["Low X, high Y", "High X, high Y", "Low X, low Y", "High X, low Y"]),
  splitMode: z.enum(["median", "manual"]).default("median"),
  xSplit: z.number().finite().min(-1e32).max(1e32).optional(),
  ySplit: z.number().finite().min(-1e32).max(1e32).optional(),
}).refine(value => value.splitMode !== "manual" || value.xSplit !== undefined && value.ySplit !== undefined,
  "Enter both manual quadrant thresholds.");

const chartItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.number().finite(),
});

const imagePresentationSchema = z.object({
  style: z.enum(["original", "glint-labs"]),
  crop: z.enum(["original", "landscape", "editorial"]),
  focalPointX: percentageSchema,
  focalPointY: percentageSchema,
});

export const reportBlockSchema = z.discriminatedUnion("type", [
  sourcedVisualBlockSchema.extend({
    ...lineChartFields,
    verifiedSource: verifiedDataSourceSchema.optional(),
  }).refine(lineChartMatrixValid, {
    path: ["series"], message: "Use unique period and series identities, with one percentage per period in every series.",
  }),
  baseBlockSchema.extend({
    type: z.literal("research-visual"),
    template: z.enum(researchVisualTemplates),
    title: z.string().trim().min(1).max(500),
    subtitle: z.string().max(2000),
    sourceNote: z.string().max(4000),
    columns: z.array(z.string().trim().min(1).max(500)).min(2).max(5),
    rows: z.array(z.object({
      id: z.string().min(1),
      cells: z.array(z.array(z.string().max(8000)).min(1).max(30)).min(2).max(5),
    })).min(1).max(50),
  }).superRefine((block, context) => {
    const count = researchVisualColumnCounts[block.template];
    if (block.columns.length !== count || block.rows.some(row => row.cells.length !== count)) {
      context.addIssue({ code: "custom", path: ["rows"], message: "Every row must match this template's columns." });
    }
    if (new Set(block.rows.map(row => row.id)).size !== block.rows.length) {
      context.addIssue({ code: "custom", path: ["rows"], message: "Each row needs a unique identifier." });
    }
    if (block.template === "driver-item-usage") {
      block.rows.forEach((row, index) => {
        const usage = row.cells[3]?.join(" ").trim() ?? "";
        if (!/^(?:\d+(?:\.\d+)?|\.\d+)%?$/.test(usage) || Number(usage.replace(/%$/, "")) > 100) {
          context.addIssue({ code: "custom", path: ["rows", index, "cells", 3],
            message: `Row ${index + 1}: enter a client usage percentage from 0 to 100.` });
        }
        if (row.cells.slice(0, 3).some(cell => !cell.some(value => value.trim()))) {
          context.addIssue({ code: "custom", path: ["rows", index, "cells"],
            message: `Row ${index + 1}: add an item name, survey wording, and People Success Element.` });
        }
      });
    }
  }),
  baseBlockSchema.extend({
    type: z.literal("heading"),
    level: z.number().int().min(1).max(6),
    text: z.string().min(1),
    ...wordTextFields,
  }),
  baseBlockSchema.extend({
    type: z.literal("paragraph"),
    text: z.string().min(1),
    ...wordTextFields,
    callouts: z.array(z.object({
      start: z.number().int().nonnegative(),
      end: z.number().int().positive(),
    })).optional(),
  }).superRefine((block, context) => {
    let previousEnd = 0;
    for (const [index, range] of (block.callouts ?? []).entries()) {
      if (range.start < previousEnd || range.start >= range.end || range.end > block.text.length ||
        !block.text.slice(range.start, range.end).trim()) {
        context.addIssue({ code: "custom", message: "Callouts must use nonempty, ordered, non-overlapping text ranges.", path: ["callouts", index] });
      }
      previousEnd = range.end;
    }
  }),
  baseBlockSchema.extend({
    type: z.literal("list-item"),
    text: z.string().min(1),
    ...wordTextFields,
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
  sourcedVisualBlockSchema.extend({
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
  sourcedVisualBlockSchema.extend({
    type: z.literal("percentage-ring-group"),
    presentation: chartPresentationSchema.optional(),
    title: z.string().min(1),
    metrics: z
      .array(
        z.object({
          id: z.string().min(1),
          value: z.number().min(0).max(100),
          description: z.string().min(1),
        }),
      )
      .min(2)
      .max(3),
    footnote: z.string().min(1),
    verifiedSource: verifiedDataSourceSchema.optional(),
  }),
  sourcedVisualBlockSchema.extend({
    type: z.literal("quadrant-scatter-plot"),
    title: z.string().min(1),
    points: z.array(z.object({
      id: z.string().min(1), label: z.string().min(1),
      x: z.number().finite().min(-1e32).max(1e32),
      y: z.number().finite().min(-1e32).max(1e32), description: z.string(),
      breakdown: z.array(z.object({
        label: z.string().min(1), value: z.number().finite().nonnegative(), displayValue: z.string().min(1),
      })).min(1).max(20),
    })).min(2).max(50),
    footnote: z.string().min(1),
    presentation: quadrantPresentationSchema.optional(),
    verifiedSource: verifiedDataSourceSchema.optional(),
  }),
  sourcedVisualBlockSchema.extend({
    type: z.literal("illustrated-statistics"),
    title: z.string().min(1),
    metrics: z.array(z.object({
      id: z.string().min(1),
      value: percentageSchema,
      description: z.string().min(1),
    })).min(2).max(3),
    footnote: z.string().min(1),
    presentation: illustratedStatisticsPresentationSchema.optional(),
    verifiedSource: verifiedDataSourceSchema.optional(),
  }),
  sourcedVisualBlockSchema.extend({
    type: z.literal("percentage-comparison-grid"),
    title: z.string().min(1),
    metrics: z.array(z.object({
      id: z.string().min(1),
      value: percentageSchema,
      description: z.string().min(1),
    })).length(4),
    footnote: z.string().min(1),
    presentation: pairedComparisonPresentationSchema.optional(),
    verifiedSource: verifiedDataSourceSchema.optional(),
  }),
  sourcedVisualBlockSchema.extend({
    type: z.literal("paired-percentage-comparison"),
    title: z.string().min(1),
    metrics: z.array(z.object({
      id: z.string().min(1),
      value: percentageSchema,
      description: z.string().min(1),
    })).length(2),
    footnote: z.string().min(1),
    presentation: pairedComparisonPresentationSchema.optional(),
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
  sourcedVisualBlockSchema.extend({
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
  sourcedVisualBlockSchema.extend({
    type: z.literal("horizontal-bar-chart"),
    presentation: chartPresentationSchema.optional(),
    title: z.string().min(1),
    items: z.array(chartItemSchema.extend({
      supportingText: z.string().min(1).optional(),
      breakdown: z.array(chartItemSchema).min(1).optional(),
    })).min(2).max(12),
    legend: z.string().min(1),
    sourceNote: z.string().min(1),
    verifiedSource: verifiedDataSourceSchema.optional(),
  }).superRefine((block, context) => {
    if (block.verifiedSource?.unit !== "number") {
      block.items.forEach((item, index) => {
        if (item.value < 0 || item.value > 100) {
          context.addIssue({ code: "custom", path: ["items", index, "value"], message: "Percentage values must be between 0 and 100." });
        }
        item.breakdown?.forEach((detail, detailIndex) => {
          if (detail.value < 0 || detail.value > 100) {
            context.addIssue({ code: "custom", path: ["items", index, "breakdown", detailIndex, "value"], message: "Percentage values must be between 0 and 100." });
          }
        });
      });
    }
  }),
  sourcedVisualBlockSchema.extend({
    type: z.literal("coefficient-heatmap"),
    title: z.string().min(1),
    columns: z.array(z.string().trim().min(1).max(100)).min(1).max(12),
    rows: z.array(z.object({
      id: z.string().min(1),
      label: z.string().trim().min(1).max(160),
      values: z.array(z.number().finite().nullable()).min(1).max(12),
    })).min(2).max(12),
    sourceNote: z.string().min(1),
    presentation: heatmapPresentationSchema.optional(),
    verifiedSource: verifiedDataSourceSchema.optional(),
  }).refine(block => block.rows.every(row => row.values.length === block.columns.length) &&
    (!block.verifiedSource || block.verifiedSource.unit === "number"), {
    path: ["rows"], message: "Every heatmap row must have a value or N/A for each column.",
  }),
  sourcedVisualBlockSchema.extend({
    type: z.literal("grouped-column-comparison"),
    presentation: comparisonPresentationSchema.optional(),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    series: z.array(z.string().min(1)).min(1).max(3),
    groups: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          values: z.array(percentageSchema).min(1).max(3),
        }),
      )
      .min(1).max(12),
    sourceNote: z.string().min(1),
    verifiedSource: verifiedDataSourceSchema.optional(),
  }).refine(block => block.groups.every(group => group.values.length === block.series.length), {
    path: ["groups"], message: "Every category must have one percentage for each series.",
  }),
  sourcedVisualBlockSchema.extend({
    type: z.literal("grouped-bar-comparison"),
    presentation: comparisonPresentationSchema.optional(),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    series: z.array(z.string().trim().min(1).max(100)).min(1).max(3),
    groups: z.array(z.object({
      id: z.string().min(1),
      label: z.string().trim().min(1).max(160),
      values: z.array(percentageSchema).min(1).max(3),
    })).min(1).max(12),
    sourceNote: z.string().min(1),
    verifiedSource: verifiedDataSourceSchema.optional(),
  }).refine(block => block.groups.every(group => group.values.length === block.series.length), {
    path: ["groups"], message: "Every category must have one percentage for each series.",
  }),
  sourcedVisualBlockSchema.extend({
    type: z.literal("comparison-panel-group"),
    presentation: comparisonPresentationSchema.optional(),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    panels: z.array(z.object({
      id: z.string().min(1),
      title: z.string().trim().min(1).max(160),
      series: z.tuple([z.string().trim().min(1).max(100), z.string().trim().min(1).max(100)]),
      values: z.tuple([percentageSchema, percentageSchema]),
    })).min(1).max(12),
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
    employeeCount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    topics: z.array(z.string().trim().min(1)).max(3).optional(),
  }),
  blocks: z.array(reportBlockSchema).min(1),
  readerPresentation: z.object({
    showCoverDetails: z.boolean(),
    figureDescriptions: z.record(z.string().min(1), z.string()),
    orderedListBlockIds: z.array(z.string().min(1)),
    referenceBlockIds: z.array(z.string().min(1)),
    rowHeaderTableBlockIds: z.array(z.string().min(1)),
  }).optional(),
  wordStyles: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    target: wordStyleTargetSchema,
  })).optional(),
  wordStyleMappings: z.record(z.string().min(1), wordStyleTargetSchema).optional(),
  reviewItems: z.array(reviewItemSchema),
  extraction: z.object({
    paragraphCount: z.number().int().nonnegative(),
    imageCount: z.number().int().nonnegative(),
    unsupportedCount: z.number().int().nonnegative(),
  }),
}).superRefine((manifest, context) => {
  for (const [blockIndex, block] of manifest.blocks.entries()) {
    if (block.type === "paragraph" || block.type === "list-item" || block.type === "heading") {
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
      previousEnd = 0;
      for (const [markIndex, mark] of (block.marks ?? []).entries()) {
        if (mark.start < previousEnd || mark.start >= mark.end || mark.end > block.text.length ||
          (mark.superscript && mark.subscript) ||
          !(mark.bold || mark.italic || mark.superscript || mark.subscript)) {
          context.addIssue({
            code: "custom", message: "Text formatting must use ordered, non-overlapping ranges within the text.",
            path: ["blocks", blockIndex, "marks", markIndex],
          });
        }
        previousEnd = mark.end;
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
