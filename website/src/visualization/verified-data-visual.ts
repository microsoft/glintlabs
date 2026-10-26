import type { ReportBlock } from "../manifest/report-manifest.ts";

export type DataVisualSourceBlock = Extract<
  ReportBlock,
  { type: "data-visual-source" }
>;
export type VerifiedDataVisualBlock = Extract<
  ReportBlock,
  {
    type:
      | "percentage-ring-group"
      | "horizontal-bar-chart"
      | "grouped-column-comparison";
  }
>;
export type VerifiedDataVisualType = VerifiedDataVisualBlock["type"];

const verifiedVisualNames: Record<VerifiedDataVisualType, string> = {
  "percentage-ring-group": "Percentage ring group",
  "horizontal-bar-chart": "Horizontal bar chart",
  "grouped-column-comparison": "Grouped column comparison",
};

export function verifiedDataVisualName(type: VerifiedDataVisualType) {
  return verifiedVisualNames[type];
}

function percentage(value: string) {
  const normalized = value.replaceAll(",", "").replace("%", "").trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
    ? parsed
    : undefined;
}

function numericRows(block: DataVisualSourceBlock) {
  return block.data.rows.map((row) => ({
    id: row.id,
    label: row.cells[0]?.trim() || "",
    values: row.cells.slice(1).map(percentage),
  }));
}

export function compatibleVerifiedVisuals(
  block: DataVisualSourceBlock,
): VerifiedDataVisualType[] {
  if (block.data.unit !== "percentage") {
    return [];
  }
  const rows = numericRows(block);
  const hasCompleteLabels = rows.every((row) => row.label);
  const hasCompleteValues = rows.every((row) =>
    row.values.every((value) => value !== undefined),
  );
  if (!hasCompleteLabels || !hasCompleteValues) {
    return [];
  }

  const compatible: VerifiedDataVisualType[] = [];
  if (
    block.data.columns.length === 2 &&
    rows.length >= 2 &&
    rows.length <= 12
  ) {
    compatible.push("horizontal-bar-chart");
  }
  if (block.data.columns.length === 2 && rows.length === 3) {
    compatible.push("percentage-ring-group");
  }
  if (block.data.columns.length === 3 && rows.length === 4) {
    compatible.push("grouped-column-comparison");
  }
  return block.data.recommendedVisualType
    ? compatible.filter((type) => type === block.data.recommendedVisualType)
    : compatible;
}

export function automaticallyVerifiedVisualType(
  block: DataVisualSourceBlock,
): VerifiedDataVisualType | undefined {
  if (
    (block.data.sourceKind !== "word-chart" &&
      block.data.sourceKind !== "word-table") ||
    !block.data.recommendedVisualType
  ) {
    return undefined;
  }

  return compatibleVerifiedVisuals(block).includes(
    block.data.recommendedVisualType,
  )
    ? block.data.recommendedVisualType
    : undefined;
}

export function createVerifiedDataVisual(
  source: DataVisualSourceBlock,
  type: VerifiedDataVisualType,
  verifiedAt: string,
): VerifiedDataVisualBlock {
  if (!compatibleVerifiedVisuals(source).includes(type)) {
    throw new Error("This approved data shape is not compatible with that visual.");
  }

  const rows = numericRows(source);
  const verifiedSource = {
    ...source.data,
    verifiedAt,
  };
  const shared = {
    id: source.id,
    provenance: {
      kind: "derived" as const,
      sourceBlockId: source.id,
    },
    source: source.source,
    verifiedSource,
  };

  switch (type) {
    case "horizontal-bar-chart":
      return {
        ...shared,
        type,
        title: source.data.title,
        items: rows.map((row) => ({
          id: row.id,
          label: row.label,
          value: row.values[0] as number,
        })),
        legend: source.data.columns[1],
        sourceNote:
          source.data.sourceNote ??
          "Source: approved structured data from the reviewed Word report.",
      };
    case "percentage-ring-group":
      return {
        ...shared,
        type,
        title: source.data.title,
        metrics: rows.map((row) => ({
          id: row.id,
          value: row.values[0] as number,
          description: row.label,
        })) as [
          { id: string; value: number; description: string },
          { id: string; value: number; description: string },
          { id: string; value: number; description: string },
        ],
        footnote:
          source.data.sourceNote ??
          "Source: approved structured data from the reviewed Word report.",
      };
    case "grouped-column-comparison":
      return {
        ...shared,
        type,
        title: source.data.title,
        subtitle: source.data.subtitle ?? "Approved structured data",
        series: [source.data.columns[1], source.data.columns[2]],
        groups: rows.map((row) => ({
          id: row.id,
          label: row.label,
          values: [row.values[0] as number, row.values[1] as number],
        })) as [
          { id: string; label: string; values: [number, number] },
          { id: string; label: string; values: [number, number] },
          { id: string; label: string; values: [number, number] },
          { id: string; label: string; values: [number, number] },
        ],
        sourceNote:
          source.data.sourceNote ??
          "Source: approved structured data from the reviewed Word report.",
      };
  }
}

export function verifiedVisualMatchesSource(block: ReportBlock) {
  if (
    block.type !== "percentage-ring-group" &&
    block.type !== "horizontal-bar-chart" &&
    block.type !== "grouped-column-comparison"
  ) {
    return true;
  }
  if (!block.verifiedSource) {
    return false;
  }

  const source: DataVisualSourceBlock = {
    id: block.provenance?.sourceBlockId ?? block.id,
    type: "data-visual-source",
    data: {
      sourceKind: block.verifiedSource.sourceKind,
      title: block.verifiedSource.title,
      unit: block.verifiedSource.unit,
      columns: block.verifiedSource.columns,
      rows: block.verifiedSource.rows,
      sha256: block.verifiedSource.sha256,
      evidenceImage: block.verifiedSource.evidenceImage,
      recommendedVisualType: block.verifiedSource.recommendedVisualType,
      subtitle: block.verifiedSource.subtitle,
      sourceNote: block.verifiedSource.sourceNote,
    },
    provenance: { kind: "imported" },
    source: block.source,
  };
  const expected = createVerifiedDataVisual(
    source,
    block.type,
    block.verifiedSource.verifiedAt,
  );

  switch (block.type) {
    case "horizontal-bar-chart":
      return (
        expected.type === "horizontal-bar-chart" &&
        block.title === expected.title &&
        block.legend === expected.legend &&
        block.sourceNote === expected.sourceNote &&
        JSON.stringify(block.items) === JSON.stringify(expected.items)
      );
    case "percentage-ring-group":
      return (
        expected.type === "percentage-ring-group" &&
        block.title === expected.title &&
        block.footnote === expected.footnote &&
        JSON.stringify(block.metrics) === JSON.stringify(expected.metrics)
      );
    case "grouped-column-comparison":
      return (
        expected.type === "grouped-column-comparison" &&
        block.title === expected.title &&
        block.subtitle === expected.subtitle &&
        block.sourceNote === expected.sourceNote &&
        JSON.stringify(block.series) === JSON.stringify(expected.series) &&
        JSON.stringify(block.groups) === JSON.stringify(expected.groups)
      );
  }
}
