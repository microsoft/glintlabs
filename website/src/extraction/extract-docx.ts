import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import type { PublicationSourceEvidence } from "../project/publication-preparation.ts";
import { extractWordTextLinks } from "./word-text-links.ts";

import {
  createApprovedContentRecord,
  type ApprovedContentRecord,
} from "../integrity/approved-content.ts";
import {
  reportBlockSchema,
  reportManifestSchema,
  type ReportBlock,
  type ReportManifest,
  type ReviewItem,
} from "../manifest/report-manifest.ts";
import {
  compatibleVerifiedVisuals,
  type DataVisualSourceBlock,
} from "../visualization/verified-data-visual.ts";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 1_000;
const DOCUMENT_PART = "word/document.xml";
const RELATIONSHIPS_PART = "word/_rels/document.xml.rels";

type XmlNode = Record<string, unknown>;
type XmlAttributes = Record<string, string>;
type GuidedComponent = {
  end: number;
  fields: Map<string, string>;
  kind: string;
  label: string;
  start: number;
};
type TemplateMetadata = {
  fields: Map<string, string>;
  indexes: Set<number>;
};

export type ExtractionResult = {
  approvedContent?: ApprovedContentRecord;
  publicationSourceEvidence?: PublicationSourceEvidence;
  manifest: ReportManifest;
  manifestSha256: string;
};

const parser = new XMLParser({
  attributeNamePrefix: "",
  ignoreAttributes: false,
  preserveOrder: true,
  parseTagValue: false,
  removeNSPrefix: true,
  textNodeName: "#text",
  trimValues: false,
});

function isXmlNode(value: unknown): value is XmlNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function childNodes(node: XmlNode, key: string): XmlNode[] {
  const value = node[key];
  return Array.isArray(value) ? value.filter(isXmlNode) : [];
}

function attributes(node: XmlNode): XmlAttributes {
  const value = node[":@"];
  if (!isXmlNode(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function findNodes(value: unknown, key: string, matches: XmlNode[] = []) {
  if (Array.isArray(value)) {
    for (const item of value) {
      findNodes(item, key, matches);
    }
    return matches;
  }

  if (!isXmlNode(value)) {
    return matches;
  }

  if (key in value) {
    matches.push(value);
  }

  for (const child of Object.values(value)) {
    findNodes(child, key, matches);
  }

  return matches;
}

function extractText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(extractText).join("");
  }

  if (!isXmlNode(value)) {
    return "";
  }

  let text = typeof value["#text"] === "string" ? value["#text"] : "";

  if ("tab" in value) {
    text += "\t";
  }
  if ("br" in value || "cr" in value) {
    text += "\n";
  }

  for (const [key, child] of Object.entries(value)) {
    if (key !== "#text" && key !== ":@" && key !== "tab" && key !== "br" && key !== "instrText") {
      text += extractText(child);
    }
  }

  return text;
}

function paragraphStyle(paragraph: XmlNode): string | undefined {
  const properties = childNodes(paragraph, "p").find((node) => "pPr" in node);
  if (!properties) {
    return undefined;
  }

  const style = findNodes(properties, "pStyle")[0];
  return style ? attributes(style).val : undefined;
}

function listLevel(paragraph: XmlNode): number {
  const levelNode = findNodes(paragraph, "ilvl")[0];
  const level = levelNode ? Number(attributes(levelNode).val) : 0;
  return Number.isInteger(level) && level >= 0 ? level : 0;
}

function paragraphId(paragraph: XmlNode) {
  return attributes(paragraph).paraId;
}

function sourceLocator(paragraph: XmlNode, index: number) {
  const id = paragraphId(paragraph);
  return {
    part: DOCUMENT_PART,
    index,
    ...(id ? { paragraphId: id } : {}),
  };
}

function headingLevel(paragraph: XmlNode, style: string | undefined) {
  const properties = childNodes(paragraph, "p").find((node) => "pPr" in node);
  const outline = properties && findNodes(properties, "outlineLvl")[0];
  if (outline) {
    const value = attributes(outline).val;
    const level = value?.trim() ? Number(value) : NaN;
    if (Number.isInteger(level) && level >= 0 && level <= 9) {
      // Word uses zero-based outline levels; 9 explicitly means body text.
      return level < 6 ? level + 1 : undefined;
    }
  }
  const match = style?.match(/^Heading([1-6])$/);
  return match ? Number(match[1]) : undefined;
}

function normalizeComponentLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function templateLibraryIndexes(body: XmlNode[]) {
  const indexes = new Set<number>();
  let inLibrary = false;

  for (let index = 0; index < body.length; index += 1) {
    const node = body[index];
    const text =
      "p" in node ? extractText(childNodes(node, "p")).trim() : "";
    if (/^\[GLPS TEMPLATE LIBRARY\]$/i.test(text)) {
      inLibrary = true;
    }
    if (inLibrary) {
      indexes.add(index);
    }
    if (/^\[GLPS END TEMPLATE LIBRARY\]$/i.test(text)) {
      inLibrary = false;
    }
  }

  return indexes;
}

function templateMetadata(body: XmlNode[]): TemplateMetadata {
  const fields = new Map<string, string>();
  const indexes = new Set<number>();
  let inMetadata = false;

  for (let index = 0; index < body.length; index += 1) {
    const node = body[index];
    const text =
      "p" in node ? extractText(childNodes(node, "p")).trim() : "";
    if (/^\[GLPS REPORT METADATA\]$/i.test(text)) {
      inMetadata = true;
    }
    if (!inMetadata) {
      continue;
    }
    indexes.add(index);
    const fieldMatch = text.match(/^([^:]+):\s*(.+)$/);
    if (fieldMatch && !text.startsWith("[GLPS")) {
      fields.set(fieldMatch[1].trim().toLowerCase(), fieldMatch[2].trim());
    }
    if (/^\[GLPS END REPORT METADATA\]$/i.test(text)) {
      inMetadata = false;
    }
  }

  return { fields, indexes };
}

function guidedComponents(body: XmlNode[], ignoredIndexes: Set<number>) {
  const components: GuidedComponent[] = [];

  for (let index = 0; index < body.length; index += 1) {
    if (ignoredIndexes.has(index)) {
      continue;
    }
    const node = body[index];
    if (!("p" in node)) {
      continue;
    }
    const text = extractText(childNodes(node, "p")).trim();
    const marker = text.match(/^\[GLPS COMPONENT:\s*(.+?)\]$/i);
    if (!marker) {
      continue;
    }

    const fields = new Map<string, string>();
    let end = index;
    for (let candidateIndex = index + 1; candidateIndex < body.length; candidateIndex += 1) {
      const candidate = body[candidateIndex];
      if (!("p" in candidate)) {
        continue;
      }
      const candidateText = extractText(childNodes(candidate, "p")).trim();
      if (/^\[GLPS END COMPONENT\]$/i.test(candidateText)) {
        end = candidateIndex;
        break;
      }
      const field = candidateText.match(/^([^:]+):\s*(.+)$/);
      if (field) {
        fields.set(field[1].trim().toLowerCase(), field[2].trim());
      }
    }

    components.push({
      end,
      fields,
      kind: normalizeComponentLabel(marker[1]),
      label: marker[1].trim(),
      start: index,
    });
    index = end;
  }

  return components;
}

function field(component: GuidedComponent, name: string) {
  return component.fields.get(name.toLowerCase()) ?? "";
}

function optionalField(component: GuidedComponent, name: string) {
  const value = field(component, name);
  return /^\[optional\b/i.test(value) ? "" : value;
}

function guidedCanonicalBlock(
  component: GuidedComponent,
  source: ReportBlock["source"],
) {
  const shared = {
    id: `block-${component.start}`,
    provenance: { kind: "imported" as const },
    source,
  };
  let candidate: unknown;

  switch (component.kind) {
    case "pull-quote":
      candidate = {
        ...shared,
        type: "pull-quote",
        quote: field(component, "quote"),
      };
      break;
    case "featured-statistic":
      candidate = {
        ...shared,
        type: "featured-statistic",
        title: field(component, "title"),
        statistic: field(component, "statistic"),
        description: field(component, "description"),
        sourceNote: field(component, "source note"),
      };
      break;
    case "data-callout": {
      const paragraphs = [1, 2, 3]
        .map((paragraphIndex) =>
          field(component, `paragraph ${paragraphIndex}`),
        )
        .filter(Boolean);
      candidate = {
        ...shared,
        type: "data-callout",
        variant: field(component, "variant").toLowerCase(),
        ...(field(component, "title")
          ? { title: field(component, "title") }
          : {}),
        ...(paragraphs.length ? { paragraphs } : {}),
        ...(field(component, "eyebrow")
          ? { eyebrow: field(component, "eyebrow") }
          : {}),
        ...(field(component, "statistic")
          ? { statistic: field(component, "statistic") }
          : {}),
        ...(optionalField(component, "description")
          ? { description: optionalField(component, "description") }
          : {}),
        ...(optionalField(component, "source note")
          ? { sourceNote: optionalField(component, "source note") }
          : {}),
      };
      break;
    }
    case "roles":
      candidate = {
        ...shared,
        type: "before-after-comparison",
        title: field(component, "title"),
        sections: [1, 2, 3].map((sectionIndex) => ({
          id: `${shared.id}-section-${sectionIndex}`,
          label: field(component, `section ${sectionIndex} label`),
          beforeTitle: field(
            component,
            `section ${sectionIndex} traditional title`,
          ),
          beforeDescription: field(
            component,
            `section ${sectionIndex} traditional description`,
          ),
          afterTitle: field(
            component,
            `section ${sectionIndex} ai-era title`,
          ),
          afterDescription: field(
            component,
            `section ${sectionIndex} ai-era description`,
          ),
          summary: field(component, `section ${sectionIndex} getting there`),
        })),
      };
      break;
    case "bullets":
      candidate = {
        ...shared,
        type: "impact-metrics",
        title: field(component, "title"),
        ...(optionalField(component, "introduction")
          ? { intro: optionalField(component, "introduction") }
          : {}),
        metrics: [1, 2, 3]
          .map((metricIndex) => ({
            id: `${shared.id}-metric-${metricIndex}`,
            text:
              metricIndex === 3
                ? optionalField(component, `bullet ${metricIndex}`)
                : field(component, `bullet ${metricIndex}`),
          }))
          .filter((metric) => metric.text),
      };
      break;
    case "references":
      candidate = {
        ...shared,
        type: "references",
        title: field(component, "title"),
        ...(optionalField(component, "introduction")
          ? { intro: optionalField(component, "introduction") }
          : {}),
        references: [1, 2, 3, 4]
          .map((referenceIndex) => ({
            id: `${shared.id}-reference-${referenceIndex}`,
            title:
              referenceIndex === 4
                ? optionalField(
                    component,
                    `reference ${referenceIndex} title`,
                  )
                : field(component, `reference ${referenceIndex} title`),
            ...(optionalField(
              component,
              `reference ${referenceIndex} citation`,
            )
              ? {
                  citation: optionalField(
                    component,
                    `reference ${referenceIndex} citation`,
                  ),
                }
              : {}),
          }))
          .filter((reference) => reference.title),
      };
      break;
    default:
      return undefined;
  }

  if (
    component.kind === "data-callout" &&
    candidate &&
    typeof candidate === "object"
  ) {
    const callout = candidate as {
      eyebrow?: string;
      paragraphs?: string[];
      statistic?: string;
      title?: string;
    };
    const hasDisclosureContent =
      Boolean(callout.title) && Boolean(callout.paragraphs?.length);
    const hasLegacyContent =
      Boolean(callout.eyebrow) && Boolean(callout.statistic);
    if (!hasDisclosureContent && !hasLegacyContent) {
      return null;
    }
  }

  const parsed = reportBlockSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function guidedVisualType(component?: GuidedComponent) {
  switch (component?.kind) {
    case "percentage-rings":
      return "percentage-ring-group" as const;
    case "horizontal-bars":
      return "horizontal-bar-chart" as const;
    case "grouped-columns":
      return "grouped-column-comparison" as const;
    default:
      return undefined;
  }
}

function expectsEmbeddedAsset(component: GuidedComponent) {
  return (
    Boolean(guidedVisualType(component)) ||
    component.kind === "image" ||
    component.kind === "report-hero"
  );
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function mediaType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    gif: "image/gif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    webp: "image/webp",
  };
  return (extension && types[extension]) || "application/octet-stream";
}

function imageDimensions(paragraph: XmlNode) {
  const extent = findNodes(paragraph, "extent")[0];
  const imageAttributes = extent ? attributes(extent) : {};
  const width = Number(imageAttributes.cx) / 9_525;
  const height = Number(imageAttributes.cy) / 9_525;

  return {
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : 800,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : 450,
  };
}

function documentBody(parsedDocument: unknown): XmlNode[] {
  if (!Array.isArray(parsedDocument)) {
    throw new Error("The Word document XML has an unexpected structure.");
  }

  const documentNode = parsedDocument.find(
    (node): node is XmlNode => isXmlNode(node) && "document" in node,
  );
  const document = documentNode
    ? childNodes(documentNode, "document").find((node) => "body" in node)
    : undefined;
  const body = document && childNodes(document, "body");

  if (!body) {
    throw new Error("The Word document does not contain a readable body.");
  }

  return body.filter((node) =>
    Object.keys(node).some((key) => key !== "#text" && key !== ":@"),
  );
}

function relationshipMap(parsedRelationships: unknown) {
  const relationships = findNodes(parsedRelationships, "Relationship");
  return new Map(
    relationships
      .map((relationship) => attributes(relationship))
      .filter((relationship) => relationship.Id && relationship.Target)
      .map((relationship) => [relationship.Id, relationship.Target]),
  );
}

function pointValues(value: unknown, key: string) {
  const container = findNodes(value, key)[0];
  if (!container) {
    return [];
  }

  return findNodes(container, "pt")
    .map((point) => ({
      index: Number(attributes(point).idx),
      value: extractText(point).trim(),
    }))
    .filter((point) => point.value)
    .toSorted((left, right) => left.index - right.index)
    .map((point) => point.value);
}

function tableData(table: XmlNode) {
  const rows = findNodes(table, "tr")
    .map((row) =>
      findNodes(row, "tc").map((cell) => extractText(cell).trim()),
    )
    .filter((row) => row.some(Boolean));
  if (rows.length < 2 || rows[0].length < 2) {
    return undefined;
  }

  const width = Math.max(...rows.map((row) => row.length));
  const columns = Array.from(
    { length: width },
    (_, index) => rows[0][index] || `Column ${index + 1}`,
  );
  const dataRows = rows.slice(1).map((row, index) => ({
    id: `row-${index + 1}`,
    cells: Array.from({ length: width }, (_, cellIndex) => row[cellIndex] || ""),
  }));
  const values = dataRows.flatMap((row) => row.cells.slice(1));
  const unit =
    values.length > 0 && values.every((value) => /^\s*\d+(?:\.\d+)?%\s*$/.test(value))
      ? ("percentage" as const)
      : ("unknown" as const);

  return {
    sourceKind: "word-table" as const,
    title: "Approved Word data table",
    unit,
    columns,
    rows: dataRows,
  };
}

function chartData(parsedChart: unknown) {
  const formatCode = findNodes(parsedChart, "formatCode")
    .map(extractText)
    .join(" ");
  const isPercentage = formatCode.includes("%");
  const series = findNodes(parsedChart, "ser").map((item, seriesIndex) => {
    const categories =
      pointValues(item, "strCache").length > 1
        ? pointValues(item, "strCache")
        : pointValues(item, "cat");
    const values = pointValues(item, "val").map((value) => {
      const numeric = Number(value);
      if (isPercentage && Number.isFinite(numeric)) {
        return `${numeric <= 1 ? numeric * 100 : numeric}%`;
      }
      return value;
    });
    const nameValues = pointValues(item, "tx");
    return {
      categories,
      name: nameValues[0] || `Series ${seriesIndex + 1}`,
      values,
    };
  });
  if (series.length === 0 || series.some((item) => item.values.length === 0)) {
    return undefined;
  }

  const categories =
    series.find((item) => item.categories.length > 0)?.categories ??
    series[0].values.map((_, index) => `Category ${index + 1}`);
  if (
    series.some(
      (item) =>
        item.values.length !== categories.length ||
        (item.categories.length > 0 &&
          item.categories.join("\u0000") !== categories.join("\u0000")),
    )
  ) {
    return undefined;
  }

  const titleNode = findNodes(parsedChart, "title")[0];
  const title = titleNode ? extractText(titleNode).trim() : "";
  return {
    sourceKind: "word-chart" as const,
    title: title || "Approved Word chart",
    unit: isPercentage ? ("percentage" as const) : ("unknown" as const),
    columns: ["Category", ...series.map((item) => item.name)],
    rows: categories.map((category, index) => ({
      id: `row-${index + 1}`,
      cells: [category, ...series.map((item) => item.values[index])],
    })),
  };
}

async function sha256(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    Uint8Array.from(bytes).buffer,
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function validateSource(fileName: string, bytes: Uint8Array) {
  if (!fileName.toLowerCase().endsWith(".docx")) {
    throw new Error("Choose a .docx Word document.");
  }
  if (bytes.length === 0) {
    throw new Error("The selected Word document is empty.");
  }
  if (bytes.length > MAX_FILE_BYTES) {
    throw new Error("The selected Word document is larger than 15 MB.");
  }
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error(
      "This file is protected, encrypted, or not a standard DOCX package.",
    );
  }
}

export async function extractDocx(
  fileName: string,
  input: ArrayBuffer | Uint8Array,
): Promise<ExtractionResult> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  validateSource(fileName, bytes);

  const zip = await JSZip.loadAsync(bytes, {
    checkCRC32: true,
    createFolders: false,
  });
  const entries = Object.values(zip.files);

  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new Error("The Word package contains too many files to inspect safely.");
  }
  if (
    entries.some(
      (entry) =>
        entry.name.startsWith("/") ||
        entry.name.split("/").some((segment) => segment === ".."),
    )
  ) {
    throw new Error("The Word package contains an unsafe file path.");
  }

  const documentEntry = zip.file(DOCUMENT_PART);
  const relationshipsEntry = zip.file(RELATIONSHIPS_PART);
  if (!documentEntry || !relationshipsEntry) {
    throw new Error("The DOCX is missing required Word document parts.");
  }

  const [documentXml, relationshipsXml, sourceSha256] = await Promise.all([
    documentEntry.async("string"),
    relationshipsEntry.async("string"),
    sha256(bytes),
  ]);
  const body = documentBody(parser.parse(documentXml));
  const metadata = templateMetadata(body);
  const ignoredTemplateIndexes = new Set([
    ...templateLibraryIndexes(body),
    ...metadata.indexes,
  ]);
  const guided = guidedComponents(body, ignoredTemplateIndexes);
  const guidedByIndex = new Map<number, GuidedComponent>();
  for (const component of guided) {
    for (let index = component.start; index <= component.end; index += 1) {
      guidedByIndex.set(index, component);
    }
  }
  const relationships = relationshipMap(parser.parse(relationshipsXml));
  const blocks: ReportBlock[] = [];
  const reviewItems: ReviewItem[] = [];
  let paragraphCount = 0;
  let imageCount = 0;
  let unsupportedCount = 0;
  const completedGuidedComponents = new Set<number>();

  for (let index = 0; index < body.length; index += 1) {
    if (ignoredTemplateIndexes.has(index)) {
      continue;
    }
    const node = body[index];
    const locator = sourceLocator(node, index);
    const guidedComponent = guidedByIndex.get(index);

    if (
      guidedComponent &&
      guidedComponent.start === index &&
      !expectsEmbeddedAsset(guidedComponent)
    ) {
      const block = guidedCanonicalBlock(guidedComponent, locator);
      if (block) {
        blocks.push(block);
      } else {
        const blockId = `block-${guidedComponent.start}`;
        blocks.push({
          id: blockId,
          type: "unsupported",
          description: `${guidedComponent.label} component block with missing or invalid required fields.`,
          provenance: { kind: "imported" },
          source: locator,
        });
        reviewItems.push({
          id: `review-${reviewItems.length}`,
          code: "invalid-component-block",
          severity: "blocker",
          message: `${guidedComponent.label} is incomplete. Complete every required template field in Word and re-import the approved document.`,
          blockId,
          source: locator,
        });
        unsupportedCount += 1;
      }
      completedGuidedComponents.add(guidedComponent.start);
      index = guidedComponent.end;
      continue;
    }

    if ("tbl" in node) {
      const blockId = `block-${index}`;
      const extractedTable = tableData(node);
      if (extractedTable) {
        const recommendedVisualType = guidedVisualType(guidedComponent);
        const guidedTitle = guidedComponent
          ? field(guidedComponent, "title")
          : "";
        const guidedSourceNote = guidedComponent
          ? field(guidedComponent, "source note")
          : "";
        const guidedSubtitle = guidedComponent
          ? field(guidedComponent, "subtitle")
          : "";
        const structuredTable = {
          ...extractedTable,
          ...(guidedTitle ? { title: guidedTitle } : {}),
          ...(guidedSubtitle ? { subtitle: guidedSubtitle } : {}),
          ...(guidedSourceNote ? { sourceNote: guidedSourceNote } : {}),
          ...(recommendedVisualType ? { recommendedVisualType } : {}),
        };
        const dataBlock = reportBlockSchema.parse({
          id: blockId,
          type: "data-visual-source",
          data: {
            ...structuredTable,
            sha256: await sha256(
              new TextEncoder().encode(JSON.stringify(structuredTable)),
            ),
          },
          provenance: { kind: "imported" },
          source: locator,
        }) as DataVisualSourceBlock;
        blocks.push(dataBlock);
        if (
          recommendedVisualType &&
          !compatibleVerifiedVisuals(dataBlock).includes(
            recommendedVisualType,
          )
        ) {
          reviewItems.push({
            id: `review-${reviewItems.length}`,
            code: "invalid-component-block",
            severity: "blocker",
            message: `${guidedComponent?.label ?? "The guided data visual"} does not match the required structured table shape.`,
            blockId,
            source: locator,
          });
        }
        if (guidedComponent) {
          completedGuidedComponents.add(guidedComponent.start);
        }
      } else {
        blocks.push({
          id: blockId,
          type: "unsupported",
          description: "Word table requiring an approved report treatment.",
          provenance: { kind: "imported" },
          source: locator,
        });
        reviewItems.push({
          id: `review-${reviewItems.length}`,
          code: "unsupported-table",
          severity: "blocker",
          message: "A Word table could not be extracted as structured data.",
          blockId,
          source: locator,
        });
        unsupportedCount += 1;
      }
      continue;
    }

    if (!("p" in node)) {
      continue;
    }

    paragraphCount += 1;
    const style = paragraphStyle(node);
    const text = extractText(childNodes(node, "p")).trim();
    const drawings = findNodes(node, "drawing");

    for (const drawing of drawings) {
      const chartNode = findNodes(drawing, "chart")[0];
      const chartRelationshipId = chartNode
        ? attributes(chartNode).id
        : undefined;
      const chartTarget =
        chartRelationshipId && relationships.get(chartRelationshipId);
      const chartPath = chartTarget
        ? `word/${chartTarget}`.replace(/\\/g, "/")
        : undefined;
      const chartEntry = chartPath ? zip.file(chartPath) : null;
      if (chartEntry) {
        const parsedChart = chartData(parser.parse(await chartEntry.async("string")));
        const blockId = `block-${index}-chart-${imageCount}`;
        if (parsedChart) {
          const recommendedVisualType = guidedVisualType(guidedComponent);
          const guidedTitle = guidedComponent
            ? field(guidedComponent, "title")
            : "";
          const guidedSourceNote = guidedComponent
            ? field(guidedComponent, "source note")
            : "";
          const guidedSubtitle = guidedComponent
            ? field(guidedComponent, "subtitle")
            : "";
          const structuredChart = {
            ...parsedChart,
            ...(guidedTitle ? { title: guidedTitle } : {}),
            ...(guidedSubtitle ? { subtitle: guidedSubtitle } : {}),
            ...(guidedSourceNote ? { sourceNote: guidedSourceNote } : {}),
            ...(recommendedVisualType ? { recommendedVisualType } : {}),
          };
          const dataBlock = reportBlockSchema.parse({
            id: blockId,
            type: "data-visual-source",
            data: {
              ...structuredChart,
              sha256: await sha256(
                new TextEncoder().encode(JSON.stringify(structuredChart)),
              ),
            },
            provenance: { kind: "imported" },
            source: locator,
          }) as DataVisualSourceBlock;
          blocks.push(dataBlock);
          if (
            recommendedVisualType &&
            !compatibleVerifiedVisuals(dataBlock).includes(
              recommendedVisualType,
            )
          ) {
            reviewItems.push({
              id: `review-${reviewItems.length}`,
              code: "invalid-component-block",
              severity: "blocker",
              message: `${guidedComponent?.label ?? "The guided data visual"} does not match the required Excel chart shape.`,
              blockId,
              source: locator,
            });
          }
          if (guidedComponent) {
            completedGuidedComponents.add(guidedComponent.start);
          }
        } else {
          blocks.push({
            id: blockId,
            type: "unsupported",
            description: "Word chart with ambiguous or incomplete cached data.",
            provenance: { kind: "imported" },
            source: locator,
          });
          reviewItems.push({
            id: `review-${reviewItems.length}`,
            code: "structured-data-ambiguous",
            severity: "blocker",
            message:
              "A Word chart could not be converted because its structured data is incomplete or inconsistent.",
            blockId,
            source: locator,
          });
          unsupportedCount += 1;
        }
        continue;
      }

      const relationshipNode = findNodes(drawing, "blip")[0];
      const relationshipId = relationshipNode
        ? attributes(relationshipNode).embed
        : undefined;
      const target = relationshipId && relationships.get(relationshipId);
      const fileNameFromTarget = target?.split("/").pop();
      const mediaPath = target ? `word/${target}`.replace(/\\/g, "/") : undefined;
      const mediaEntry = mediaPath ? zip.file(mediaPath) : null;
      const blockId = `block-${index}-image-${imageCount}`;
      const descriptionNode = findNodes(drawing, "docPr")[0];
      const imageDescription = descriptionNode
        ? attributes(descriptionNode).descr ||
          attributes(descriptionNode).title ||
          ""
        : "";
      const guidedImageDescription =
        guidedComponent?.kind === "image" ||
        guidedComponent?.kind === "report-hero"
          ? field(guidedComponent, "image description")
          : "";
      const resolvedImageDescription =
        imageDescription || guidedImageDescription;
      const isGuidedHero = guidedComponent?.kind === "report-hero";
      const heroEyebrow = isGuidedHero
        ? field(guidedComponent, "eyebrow")
        : "";

      if (!relationshipId || !target || !fileNameFromTarget || !mediaEntry) {
        blocks.push({
          id: blockId,
          type: "unsupported",
          description: "Image with an unresolved Word relationship.",
          source: locator,
        });
        reviewItems.push({
          id: `review-${reviewItems.length}`,
          code: "unresolved-image",
          severity: "blocker",
          message: "An image could not be traced to its source file.",
          blockId,
          source: locator,
        });
        unsupportedCount += 1;
        continue;
      }

      const mediaBytes = await mediaEntry.async("uint8array");
      const dimensions = imageDimensions(drawing);
      blocks.push({
        id: blockId,
        type: "image",
        alt: resolvedImageDescription,
        fileName: fileNameFromTarget,
        dataUrl: `data:${mediaType(fileNameFromTarget)};base64,${bytesToBase64(mediaBytes)}`,
        width: dimensions.width,
        height: dimensions.height,
        sourceAssetSha256: await sha256(mediaBytes),
        assetSource: "word-import",
        ...(isGuidedHero ? { placement: "hero" as const } : {}),
        ...(heroEyebrow ? { eyebrow: heroEyebrow } : {}),
        provenance: { kind: "imported" },
        source: locator,
      });
      if (
        guidedComponent?.kind === "image" ||
        guidedComponent?.kind === "report-hero"
      ) {
        completedGuidedComponents.add(guidedComponent.start);
      }
      imageCount += 1;

      if (!resolvedImageDescription) {
        reviewItems.push({
          id: `review-${reviewItems.length}`,
          code: "missing-image-description",
          severity: "warning",
          message: `${fileNameFromTarget} does not have an image description.`,
          blockId,
          source: locator,
        });
      }
      if (isGuidedHero && !heroEyebrow) {
        reviewItems.push({
          id: `review-${reviewItems.length}`,
          code: "invalid-component-block",
          severity: "blocker",
          message:
            "REPORT HERO is incomplete. Add the approved opening eyebrow text in Word and re-import the document.",
          blockId,
          source: locator,
        });
      }
    }

    if (!text) {
      continue;
    }

    if (guidedComponent) {
      continue;
    }

    const blockId = `block-${index}`;
    const linkedText = extractWordTextLinks(node, relationships);
    const retainedLinks = linkedText.text === text ? linkedText.links : [];
    const level = headingLevel(node, style);
    if (level) {
      blocks.push({
        id: blockId,
        type: "heading",
        level,
        text,
        source: locator,
      });
      continue;
    }

    if (style === "ListParagraph") {
      blocks.push({
        id: blockId,
        type: "list-item",
        level: listLevel(node),
        text,
        ...(retainedLinks.length > 0 ? { links: retainedLinks } : {}),
        source: locator,
      });
      continue;
    }

    if (/^(visual|sidebar)(?:[.:]|\s)/i.test(text)) {
      blocks.push({
        id: blockId,
        type: "visual-placeholder",
        description: text,
        source: locator,
      });
      reviewItems.push({
        id: `review-${reviewItems.length}`,
        code: "visual-treatment-needed",
        severity: "warning",
        message: "A manuscript visual or sidebar still needs an approved treatment.",
        blockId,
        source: locator,
      });
      continue;
    }

    blocks.push({
      id: blockId,
      type: "paragraph",
      text,
      ...(retainedLinks.length > 0 ? { links: retainedLinks } : {}),
      provenance: { kind: "imported" },
      source: locator,
    });

    if (style && style !== "Normal") {
      reviewItems.push({
        id: `review-${reviewItems.length}`,
        code: "style-flattened",
        severity: "warning",
        message: `Paragraph style "${style}" was rendered as body text.`,
        blockId,
        source: locator,
      });
    }
  }

  for (const component of guided) {
    if (
      !expectsEmbeddedAsset(component) ||
      completedGuidedComponents.has(component.start)
    ) {
      continue;
    }
    const locator = sourceLocator(body[component.start], component.start);
    const blockId = `block-${component.start}`;
    blocks.push({
      id: blockId,
      type: "unsupported",
      description: `${component.label} component block without its required embedded Word asset.`,
      provenance: { kind: "imported" },
      source: locator,
    });
    reviewItems.push({
      id: `review-${reviewItems.length}`,
      code: "invalid-component-block",
      severity: "blocker",
      message:
        component.kind === "image"
          ? "The Image component is missing an embedded image."
          : component.kind === "report-hero"
            ? "REPORT HERO is missing its approved opening image."
          : `${component.label} is missing an embedded editable Excel chart.`,
      blockId,
      source: locator,
    });
    unsupportedCount += 1;
  }

  if (blocks.length === 0) {
    throw new Error("No report content could be extracted from this document.");
  }

  const orderedBlocks = blocks.toSorted(
    (left, right) => left.source.index - right.source.index,
  );

  for (const block of orderedBlocks) {
    if (block.type !== "image" || block.assetSource !== "word-import") {
      continue;
    }
    const relatedPlaceholder = orderedBlocks
      .filter(
        (candidate) =>
          candidate.type === "visual-placeholder" &&
          candidate.source.index < block.source.index &&
          block.source.index - candidate.source.index <= 2,
      )
      .at(-1);
    if (!relatedPlaceholder) {
      continue;
    }
    reviewItems.push({
      id: `review-${reviewItems.length}`,
      code: "bitmap-visual-needs-data",
      severity: "blocker",
      message:
        "This bitmap visual needs approved structured data before it can be converted to a coded visual.",
      blockId: block.id,
      source: block.source,
    });
  }

  const firstHeading = orderedBlocks.find(
    (block): block is Extract<ReportBlock, { type: "heading" }> =>
      block.type === "heading" && block.level === 1,
  );
  const authorName = metadata.fields.get("author name");
  const authorHandle = metadata.fields.get("author handle");
  const publishedDate = metadata.fields.get("published date");
  const readTimeMinutes = Number(metadata.fields.get("read time minutes"));
  const topics = metadata.fields
    .get("topic pages")
    ?.split(/[,;]/)
    .map((topic) => topic.trim())
    .filter(Boolean)
    .slice(0, 3);
  const manifest = reportManifestSchema.parse({
    schemaVersion: "0.1.0",
    source: {
      fileName,
      sizeBytes: bytes.length,
      sha256: sourceSha256,
    },
    metadata: {
      title: firstHeading?.text || fileName.replace(/\.docx$/i, ""),
      status: "draft",
      ...(authorName
        ? { author: { name: authorName, ...(authorHandle ? { handle: authorHandle } : {}) } }
        : {}),
      ...(publishedDate ? { publishedDate } : {}),
      ...(Number.isInteger(readTimeMinutes) && readTimeMinutes > 0
        ? { readTimeMinutes }
        : {}),
      ...(topics && topics.length > 0 ? { topics } : {}),
    },
    blocks: orderedBlocks,
    reviewItems,
    extraction: {
      paragraphCount,
      imageCount,
      unsupportedCount,
    },
  });
  const manifestSha256 = await sha256(
    new TextEncoder().encode(JSON.stringify(manifest)),
  );
  const approvedContent = await createApprovedContentRecord(manifest);

  const hyperlinkCount = body.reduce((count, node, index) => {
    if (ignoredTemplateIndexes.has(index)) {
      return count;
    }
    return count + findNodes(node, "p").reduce((total, paragraph) =>
      total + extractWordTextLinks(paragraph, relationships).hyperlinkCount, 0);
  }, 0);
  return {
    approvedContent,
    manifest,
    manifestSha256,
    publicationSourceEvidence: {
      sourceSha256,
      hyperlinkCount,
      representedHyperlinkCount: manifest.blocks.reduce((count, block) =>
        count + (block.type === "paragraph" || block.type === "list-item" ? block.links?.length ?? 0
          : block.type === "references" ? block.references.filter((reference) => reference.href).length : 0), 0),
    },
  };
}
