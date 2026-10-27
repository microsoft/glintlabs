import Image from "next/image";
import { ChevronDown16Regular } from "@fluentui/react-icons/svg/chevron-down";
import type { ElementType, ReactNode } from "react";

import { SiteNavigation } from "../app/_components/site-navigation";
import type {
  ReportBlock,
  ReportManifest,
  StructuredData,
} from "../manifest/report-manifest.ts";
import { estimateReportReadingTime } from "../project/report-reading-time.ts";
import { reportAuthor } from "../project/report-author.ts";
import { ListeningMaturityScorecard } from "../visualization/listening-maturity-scorecard";
import {
  canonicalVisualOptions,
  isCanonicalVisualBlock,
} from "../visualization/canonical-report-blocks";
import { CanonicalReportComponent } from "../visualization/canonical-report-components";
import {
  createDataVisualPreview,
} from "../visualization/data-visual-preview";
import {
  automaticallyVerifiedVisualType,
  compatibleVerifiedVisuals,
} from "../visualization/verified-data-visual";
import { ReportSideNav } from "./report-side-nav";
import {
  DEFAULT_REPORT_STYLE,
  type ReportStyle,
} from "./report-style";
import styles from "./report-renderer.module.css";

type ImageBlock = Extract<ReportBlock, { type: "image" }>;
type TextBlock = Extract<
  ReportBlock,
  { type: "paragraph" | "list-item" }
>;

type ReportRendererProps = {
  blockOverrides?: Readonly<Record<string, ReactNode>>;
  coverImageAlt?: string;
  coverImageSrc?: string;
  coverSummary?: string;
  coverTitle?: string;
  coverEyebrow?: string;
  coverDetails?: readonly string[];
  coverNotice?: string;
  figureDescriptions?: Readonly<Record<string, string>>;
  textOverrides?: Readonly<Record<string, ReactNode>>;
  highlightedBlockId?: string;
  hiddenBlockIds?: ReadonlySet<string>;
  manifest: ReportManifest;
  mode?: "edit" | "read";
  previewViewport?: boolean;
  orderedListBlockIds?: ReadonlySet<string>;
  referenceBlockIds?: ReadonlySet<string>;
  onSelectBlock?: (blockId: string) => void;
  reportStyle?: ReportStyle;
  selectedBlockId?: string;
};

function headingTag(level: number): ElementType {
  switch (level) {
    case 1:
      return "h1";
    case 2:
      return "h2";
    case 3:
      return "h3";
    case 4:
      return "h4";
    case 5:
      return "h5";
    default:
      return "h6";
  }
}

function isResearchBriefHeading(block: ReportBlock) {
  return block.type === "heading" &&
    /^research\s+drop\s+in\s+brief\s*:?\s*$/i.test(block.text.trim());
}

function headingLabel(block: Extract<ReportBlock, { type: "heading" }>) {
  return isResearchBriefHeading(block) ? block.text.replace(/\s*:\s*$/, "") : block.text;
}

function isReferencesHeading(block: ReportBlock) {
  return block.type === "heading" &&
    /^(?:references|resources)\s*:?\s*$/i.test(block.text.trim());
}

function reportReferenceMarkers(blocks: readonly ReportBlock[], hiddenBlockIds?: ReadonlySet<string>) {
  const markers = new Set<string>();
  let headingLevel: number | undefined;
  for (const block of blocks) {
    if (hiddenBlockIds?.has(block.id)) continue;
    if (block.type === "heading") {
      if (isReferencesHeading(block)) headingLevel = block.level;
      else if (headingLevel !== undefined && block.level <= headingLevel) headingLevel = undefined;
    } else if (headingLevel !== undefined && (block.type === "paragraph" || block.type === "list-item")) {
      const marker = block.text.match(/^\s*(\[\d+\])/)?.[1];
      if (marker) markers.add(marker);
    }
  }
  return markers;
}

function selectableClass(
  blockId: string,
  selectedBlockId?: string,
) {
  return [
    styles.selectable,
    selectedBlockId === blockId ? styles.selected : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function imagePresentation(block: ImageBlock) {
  return (
    block.presentation ?? {
      style: "original" as const,
      crop: "original" as const,
      focalPointX: 50,
      focalPointY: 50,
    }
  );
}

function RichText({ block, reference = false, referenceMarkers }: {
  block: TextBlock; reference?: boolean; referenceMarkers?: ReadonlySet<string>;
}) {
  const links = block.links ?? [];
  const label = reference ? block.text.match(/^\s*\[\d+\]/)?.[0] : undefined;
  const markers = Array.from(block.text.matchAll(/\[\d+\]/g))
    .filter(marker => reference ? marker.index + marker[0].length === label?.length
      : referenceMarkers?.has(marker[0]))
    .map(marker => ({ start: marker.index, end: marker.index + marker[0].length }));
  if (links.length === 0 && markers.length === 0) {
    return block.text;
  }

  function textRange(start: number, end: number) {
    const nodes: ReactNode[] = [];
    let cursor = start;
    for (const marker of markers) {
      const from = Math.max(start, marker.start);
      const to = Math.min(end, marker.end);
      if (from >= to) continue;
      if (cursor < from) nodes.push(block.text.slice(cursor, from));
      nodes.push(
        <sup className={styles.referenceMarker} key={`${block.id}-reference-${from}-${to}`}>
          {block.text.slice(from, to)}
        </sup>,
      );
      cursor = to;
    }
    if (cursor < end) nodes.push(block.text.slice(cursor, end));
    return nodes;
  }

  const content: ReactNode[] = [];
  let cursor = 0;
  for (const [index, link] of links.entries()) {
    if (cursor < link.start) {
      content.push(...textRange(cursor, link.start));
    }
    const children = textRange(link.start, link.end);
    content.push(
      <a href={link.href} key={`${block.id}-link-${index}`}>
        {children.length === 1 ? children[0] : children}
      </a>,
    );
    cursor = link.end;
  }
  if (cursor < block.text.length) {
    content.push(...textRange(cursor, block.text.length));
  }
  return content;
}

function AccessibleDataTable({ data }: { data: StructuredData }) {
  return (
    <details className={styles.accessibleData}>
      <summary>View chart data</summary>
      <div className={styles.accessibleDataScroller}>
        <table>
          <caption>{data.title}</caption>
          <thead>
            <tr>
              {data.columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((cell, index) =>
                  index === 0 ? (
                    <th key={`${row.id}-${index}`} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={`${row.id}-${index}`}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {data.sourceNote ? (
          <p className={styles.accessibleDataNote}>{data.sourceNote}</p>
        ) : null}
      </div>
    </details>
  );
}

function ReportImage({ block }: { block: ImageBlock }) {
  const presentation = imagePresentation(block);
  const isCropped = presentation.crop !== "original";
  const aspectRatio =
    presentation.crop === "landscape"
      ? "16 / 9"
      : presentation.crop === "editorial"
        ? "4 / 3"
        : undefined;

  return (
    <span
      className={`${styles.imageFrame} ${
        isCropped ? styles.imageCropped : ""
      } ${
        presentation.style === "glint-labs"
          ? styles.imageGlintTreatment
          : ""
      }`}
      style={{
        aspectRatio,
        maxWidth: isCropped ? undefined : block.width,
      }}
    >
      <Image
        alt={block.alt}
        className={styles.image}
        height={block.height}
        src={block.dataUrl}
        style={{
          objectPosition: `${presentation.focalPointX}% ${presentation.focalPointY}%`,
        }}
        unoptimized
        width={block.width}
      />
      {presentation.style === "glint-labs" ? (
        <span
          aria-hidden="true"
          className={styles.imageTreatmentOverlay}
        />
      ) : null}
    </span>
  );
}

function renderBlock(
  block: ReportBlock,
  props: ReportRendererProps,
  isReference = false,
  referenceMarkers?: ReadonlySet<string>,
): ReactNode {
  const locator = `${block.source.part} · item ${block.source.index}`;
  const isAuthoring = props.mode !== "read";

  if (isCanonicalVisualBlock(block)) {
    const isEditableVisual =
      block.type === "percentage-ring-group" ||
      block.type === "horizontal-bar-chart" ||
      block.type === "grouped-column-comparison";
    const visualName =
      canonicalVisualOptions.find((option) => option.kind === block.type)?.name ??
      "report component";
    return (
      <div
        className={`${styles.canonicalVisual} ${
          isEditableVisual ? styles.interactiveVisual : ""
        } ${
          isEditableVisual && props.selectedBlockId === block.id
            ? styles.selected
            : ""
        }`}
        data-report-component={block.type}
      >
        {isAuthoring && isEditableVisual && props.onSelectBlock ? (
          <button
            aria-label={`Edit ${visualName}`}
            className={styles.editVisual}
            onClick={() => props.onSelectBlock?.(block.id)}
            type="button"
          >
            Edit component
          </button>
        ) : null}
        <CanonicalReportComponent block={block} />
      </div>
    );
  }

  switch (block.type) {
    case "heading": {
      const Heading = headingTag(block.level);
      return (
        <Heading className={`${styles[`heading${block.level}`]} ${isResearchBriefHeading(block) ? styles.briefHeading : ""} ${isReferencesHeading(block) ? styles.referencesHeading : ""}`}>
          {isResearchBriefHeading(block) ? headingLabel(block) : props.textOverrides?.[block.id] ?? block.text}
        </Heading>
      );
    }
    case "paragraph":
      return (
        <p className={styles.paragraph}>
          {props.textOverrides?.[block.id] ?? <RichText block={block} reference={isReference} referenceMarkers={referenceMarkers} />}
        </p>
      );
    case "image":
      return (
        <figure className={styles.figure} title={locator}>
          {isAuthoring && props.onSelectBlock ? (
            <button
              aria-label={`Edit image ${block.fileName}`}
              className={selectableClass(
                block.id,
                props.selectedBlockId,
              )}
              onClick={() => props.onSelectBlock?.(block.id)}
              style={{
                maxWidth:
                  imagePresentation(block).crop === "original"
                    ? block.width
                    : undefined,
              }}
              type="button"
            >
              <ReportImage block={block} />
            </button>
          ) : (
            <ReportImage block={block} />
          )}
          {isAuthoring && !block.alt ? (
            <figcaption>Image description needed</figcaption>
          ) : null}
          {block.accessibleData ? (
            <AccessibleDataTable data={block.accessibleData} />
          ) : null}
          {props.figureDescriptions?.[block.id] ? (
            <figcaption>
              <details className={`${styles.accessibleData} ${styles.figureDescription}`}>
                <summary>
                  <span>Read figure description</span>
                  <ChevronDown16Regular aria-hidden="true" />
                </summary>
                <p className={styles.paragraph}>{props.figureDescriptions[block.id]}</p>
              </details>
            </figcaption>
          ) : null}
        </figure>
      );
    case "visual-placeholder":
      return isAuthoring && props.onSelectBlock ? (
        <button
          className={`${styles.placeholder} ${selectableClass(
            block.id,
            props.selectedBlockId,
          )}`}
          onClick={() => props.onSelectBlock?.(block.id)}
          type="button"
        >
          <span className={styles.issueLabel}>Needs attention</span>
          <strong>Visual needed here</strong>
          <span>{block.description}</span>
        </button>
      ) : (
        <aside className={styles.placeholder}>
          <span className={styles.issueLabel}>Visual not completed</span>
          <strong>Visual needed here</strong>
          <span>{block.description}</span>
        </aside>
      );
    case "branded-visual":
      return isAuthoring && props.onSelectBlock ? (
        <button
          aria-label={`Edit visual ${block.title}`}
          className={`${styles.brandedVisual} ${styles[block.visualKind]} ${selectableClass(
            block.id,
            props.selectedBlockId,
          )}`}
          onClick={() => props.onSelectBlock?.(block.id)}
          type="button"
        >
          <span className={styles.visualTitle}>{block.title}</span>
          <span className={styles.visualValues}>
            {block.values.map((value, index) => (
              <span key={`${block.id}-${index}`}>{value}</span>
            ))}
          </span>
        </button>
      ) : (
        <figure
          className={`${styles.brandedVisual} ${styles[block.visualKind]}`}
        >
          <figcaption className={styles.visualTitle}>{block.title}</figcaption>
          <div className={styles.visualValues}>
            {block.values.map((value, index) => (
              <span key={`${block.id}-${index}`}>{value}</span>
            ))}
          </div>
        </figure>
      );
    case "listening-maturity-scorecard":
      return (
        <div
          className={`${styles.interactiveVisual} ${
            props.selectedBlockId === block.id ? styles.selected : ""
          }`}
        >
          {isAuthoring && props.onSelectBlock ? (
            <button
              className={styles.editVisual}
              onClick={() => props.onSelectBlock?.(block.id)}
              type="button"
            >
              Edit Visual
            </button>
          ) : null}
          <ListeningMaturityScorecard block={block} />
        </div>
      );
    case "data-visual-source": {
      const recommendedType = block.data.recommendedVisualType;
      const automaticallyVerifiedType =
        automaticallyVerifiedVisualType(block);
      const previewType =
        automaticallyVerifiedType ??
        (recommendedType &&
        compatibleVerifiedVisuals(block).includes(recommendedType)
          ? recommendedType
          : undefined);
      const preview = previewType
        ? createDataVisualPreview(block, previewType)
        : undefined;

      if (preview) {
        return (
          <div
            className={`${styles.interactiveVisual} ${
              props.selectedBlockId === block.id ? styles.selected : ""
            }`}
            data-report-component={preview.type}
          >
            {isAuthoring &&
            props.onSelectBlock &&
            !automaticallyVerifiedType ? (
              <button
                aria-label={`Review data ${block.data.title}`}
                className={styles.editVisual}
                onClick={() => props.onSelectBlock?.(block.id)}
                type="button"
              >
                Review data
              </button>
            ) : null}
            <CanonicalReportComponent block={preview} />
          </div>
        );
      }

      return isAuthoring && props.onSelectBlock ? (
        <button
          aria-label={`Review data ${block.data.title}`}
          className={`${styles.placeholder} ${selectableClass(
            block.id,
            props.selectedBlockId,
          )}`}
          onClick={() => props.onSelectBlock?.(block.id)}
          type="button"
        >
          <span className={styles.issueLabel}>Needs attention</span>
          <strong>Data visual needs review</strong>
          <span>Review the extracted source data in the Visuals panel.</span>
        </button>
      ) : (
        <aside className={styles.placeholder}>
          <span className={styles.issueLabel}>Visual not completed</span>
          <strong>Data visual needs review</strong>
          <span>The structured source data has not been verified.</span>
        </aside>
      );
    }
    case "unsupported":
      return (
        <aside className={styles.unsupported} title={locator}>
          <strong>Unsupported source content</strong>
          <p>{block.description}</p>
        </aside>
      );
    case "list-item":
      return null;
  }
}

function reportContent(
  blocks: ReportBlock[],
  props: ReportRendererProps,
) {
  const content: ReactNode[] = [];
  const referenceMarkers = reportReferenceMarkers(blocks, props.hiddenBlockIds);
  let briefHeadingLevel: number | undefined;
  let briefHeadingIndex: number | undefined;
  let referencesHeadingLevel: number | undefined;
  let previousBlockWasReference = false;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (props.hiddenBlockIds?.has(block.id)) {
      continue;
    }
    if (block.type === "heading") {
      if (isReferencesHeading(block)) {
        referencesHeadingLevel = block.level;
      } else if (referencesHeadingLevel !== undefined && block.level <= referencesHeadingLevel) {
        referencesHeadingLevel = undefined;
      }
      if (isResearchBriefHeading(block)) {
        briefHeadingLevel = block.level;
      } else if (briefHeadingLevel !== undefined && block.level <= briefHeadingLevel) {
        briefHeadingLevel = undefined;
      }
    }
    const isReference = referencesHeadingLevel !== undefined || props.referenceBlockIds?.has(block.id) === true;
    const startsReferences = isReference && !previousBlockWasReference;
    previousBlockWasReference = isReference;
    if (block.type !== "list-item") {
      briefHeadingIndex = isResearchBriefHeading(block) ? content.length : undefined;
      const blockClassName = [
        styles.reportBlock,
        isReference ? styles.referencesBlock : "",
        startsReferences ? styles.referencesStart : "",
        props.highlightedBlockId === block.id ? styles.highlighted : "",
        startsReferences || (block.type === "heading" && block.level <= 2)
          ? styles.sectionStart
          : "",
      ]
        .filter(Boolean)
        .join(" ");

      content.push(
        <div
          className={blockClassName}
          id={`report-block-${block.id}`}
          key={block.id}
        >
          {props.blockOverrides?.[block.id] ?? renderBlock(block, props, isReference, referenceMarkers)}
        </div>,
      );
      continue;
    }

    const ordered = props.orderedListBlockIds?.has(block.id) === true;
    const List = ordered ? "ol" : "ul";
    const items: Extract<ReportBlock, { type: "list-item" }>[] = [];
    while (index < blocks.length && blocks[index].type === "list-item" &&
      (props.orderedListBlockIds?.has(blocks[index].id) === true) === ordered) {
      items.push(blocks[index] as Extract<ReportBlock, { type: "list-item" }>);
      index += 1;
    }
    index -= 1;

    const list = (
      <List
        className={`${styles.list} ${briefHeadingLevel === undefined ? "" : styles.briefList} ${isReference ? styles.referencesList : ""}`}
        key={`list-${items[0].id}`}
      >
        {items.map((item) => (
          <li
            className={`${styles.listItem} ${
              props.highlightedBlockId === item.id ? styles.highlighted : ""
            }`}
            id={`report-block-${item.id}`}
            key={item.id}
            style={{ marginInlineStart: `${item.level * 1.25}rem` }}
            title={`${item.source.part} · item ${item.source.index}`}
          >
            <span>
              {props.textOverrides?.[item.id] ?? <RichText block={item} reference={isReference} referenceMarkers={referenceMarkers} />}
            </span>
          </li>
        ))}
      </List>
    );
    if (briefHeadingIndex !== undefined && briefHeadingIndex === content.length - 1) {
      const heading = content.pop();
      content.push(
        <div className={styles.briefCard} key={`brief-${items[0].id}`}>
          {heading}
          {list}
        </div>,
      );
    } else {
      content.push(list);
    }
    briefHeadingIndex = undefined;
  }

  return content;
}

export function ReportRenderer(props: ReportRendererProps) {
  const reportStyle = props.reportStyle ?? DEFAULT_REPORT_STYLE;
  const isNewFluentColors = reportStyle === "new-fluent-colors";
  const firstBlock = props.manifest.blocks[0];
  const coverTitleBlock =
    firstBlock?.type === "heading" && firstBlock.level === 1
      ? firstBlock
      : undefined;
  const firstBodyBlockIndex = coverTitleBlock ? 1 : 0;
  const possibleHeroImage = props.manifest.blocks[firstBodyBlockIndex];
  const heroImageBlock =
    possibleHeroImage?.type === "image" &&
    possibleHeroImage.placement === "hero"
      ? possibleHeroImage
      : undefined;
  const contentStartIndex = firstBodyBlockIndex + (heroImageBlock ? 1 : 0);
  const possibleHeroSummary = props.manifest.blocks[contentStartIndex];
  const heroSummaryBlock =
    reportStyle === "annual-report-2026" &&
    possibleHeroSummary?.type === "paragraph"
      ? possibleHeroSummary
      : undefined;
  const bodyBlockIndexOffset = contentStartIndex + (heroSummaryBlock ? 1 : 0);
  const bodyBlocks = props.manifest.blocks.slice(bodyBlockIndexOffset);
  const sectionHeadings = bodyBlocks.filter(
    (
      block,
    ): block is Extract<ReportBlock, { type: "heading" }> =>
      block.type === "heading" &&
      block.level <= 2 &&
      !props.hiddenBlockIds?.has(block.id),
  );
  const readTimeMinutes = props.mode === "read" && props.manifest.metadata.readTimeMinutes
    ? props.manifest.metadata.readTimeMinutes : estimateReportReadingTime(props.manifest);
  const author = reportAuthor(props.manifest);
  const sourceCoverTitle =
    coverTitleBlock?.text || props.manifest.metadata.title;
  const coverTitle = props.coverTitle ??
    (
    sourceCoverTitle.replace(/^research drop\s*:\s*/i, "").trim() ||
    sourceCoverTitle);
  const coverEyebrow = reportStyle === "annual-report-2026"
    ? props.coverEyebrow ?? "2026 Annual Report"
    : undefined;
  const coverSummary = props.coverSummary ?? heroSummaryBlock?.text;

  return (
    <article
      className={`${styles.report} ${
        props.mode !== "read" ? styles.reportEditing : ""
      } ${props.previewViewport ? styles.viewportPreview : ""} ${
        reportStyle === "annual-report-2026"
          ? styles.annualReport
          : reportStyle === "new-fluent-colors"
            ? styles.newFluentColors
            : styles.researchReport
      }`}
      aria-label={props.manifest.metadata.title}
      data-report-mode={props.mode === "read" ? "read" : "edit"}
      data-report-style={reportStyle}
    >
      <header className={styles.siteHeader}>
        <div className={styles.siteHeaderContent}>
          <SiteNavigation
            className={reportStyle !== "annual-report-2026" ? styles.siteNavigation : undefined}
            preview={props.mode !== "read"}
            previewViewport={props.previewViewport}
            variant={
              reportStyle === "annual-report-2026"
                ? "annual-report-2026"
                : "core"
            }
          />
        </div>
      </header>

      <header className={styles.cover} id="report-cover">
        {reportStyle !== "annual-report-2026" ? (
          <div className={styles.coverDecoration} aria-hidden="true">
            {reportStyle === "new-fluent-colors" ? (
              <Image
                alt=""
                className={styles.coverGridUnion}
                height={1339}
                src="/figma/report-fluent/grid-union.svg"
                unoptimized
                width={927}
              />
            ) : null}
            <span className={styles.coverCircleLarge}>
              <Image
                alt=""
                height={isNewFluentColors ? 2512 : 2314}
                src={isNewFluentColors
                  ? "/figma/report-fluent/hero-glow-top.svg"
                  : "/figma/report-hero/ellipse-4.svg"}
                unoptimized
                width={isNewFluentColors ? 2512 : 2314}
              />
            </span>
            <span className={styles.coverCircleMedium}>
              <Image
                alt=""
                height={isNewFluentColors ? 2144 : 2198}
                src={isNewFluentColors
                  ? "/figma/report-fluent/hero-glow-left.svg"
                  : "/figma/report-hero/ellipse-6.svg"}
                unoptimized
                width={isNewFluentColors ? 2144 : 2198}
              />
            </span>
            <span className={styles.coverCircleSmall}>
              <Image
                alt=""
                height={isNewFluentColors ? 2062 : 1802}
                src={isNewFluentColors
                  ? "/figma/report-fluent/hero-glow-bottom.svg"
                  : "/figma/report-hero/ellipse-5.svg"}
                unoptimized
                width={isNewFluentColors ? 2062 : 1802}
              />
            </span>
            <Image
              alt=""
              className={styles.coverGrid}
              height={946}
              src={reportStyle === "new-fluent-colors"
                ? "/figma/report-fluent/grid-diagonal.svg"
                : "/figma/report-hero/group-6.svg"}
              unoptimized
              width={946}
            />
          </div>
        ) : null}
        <div className={styles.coverContent}>
          {coverEyebrow ? (
            <p className={styles.coverEyebrow}>{coverEyebrow}</p>
          ) : null}
          <h1 className={styles.coverTitle}>{coverTitle}</h1>
          {props.coverNotice ? <p className={styles.coverNotice} role="note">{props.coverNotice}</p> : null}
          {props.coverDetails ? <ul className={styles.coverDetails} aria-label="Report details">{props.coverDetails.map(detail => <li key={detail}>{detail}</li>)}</ul> : null}
          {coverSummary ? (
            <p className={styles.coverSummary}>{coverSummary}</p>
          ) : null}
        </div>
        <div
          className={styles.coverPhoto}
          aria-hidden={heroImageBlock || props.coverImageAlt ? undefined : "true"}
        >
          <Image
            alt={heroImageBlock?.alt ?? props.coverImageAlt ?? ""}
            className={styles.coverPhotoImage}
            height={heroImageBlock?.height ?? 640}
            priority
            src={
              heroImageBlock?.dataUrl
              ?? props.coverImageSrc
              ?? "/figma/report-hero/frame-105.png"
            }
            unoptimized
            width={heroImageBlock?.width ?? 1024}
          />
          <span className={styles.coverPhotoGlowLarge}>
            <Image
              alt=""
              height={1040}
              src="/figma/report-hero/ellipse-7.svg"
              unoptimized
              width={1040}
            />
          </span>
          <span className={styles.coverPhotoGlowSmall}>
            <Image
              alt=""
              height={606}
              src="/figma/report-hero/ellipse-8.svg"
              unoptimized
              width={606}
            />
          </span>
        </div>
      </header>

      <div className={styles.editorialBody} id="report-content">
        <div className={styles.sectionRail}>
          <ReportSideNav
            authorName={author.name}
            dark={reportStyle === "annual-report-2026"}
            publishedDate={props.manifest.metadata.publishedDate ?? "11/11/25"}
            readTimeMinutes={readTimeMinutes}
            sections={sectionHeadings.map((heading) => ({
              href: `#report-block-${heading.id}`,
              label: headingLabel(heading),
            }))}
          />
        </div>
        <dl className={styles.mobileMetadata}>
          <div>
            <dt>Author</dt>
            <dd>
              <span>{author.name}</span>
            </dd>
          </div>
          <div>
            <dt>Published</dt>
            <dd>{props.manifest.metadata.publishedDate ?? "11/11/25"}</dd>
          </div>
          <div>
            <dt>Reading time</dt>
            <dd>{readTimeMinutes} min read</dd>
          </div>
        </dl>
        <div className={styles.content}>
          {heroImageBlock?.accessibleData ? (
            <AccessibleDataTable data={heroImageBlock.accessibleData} />
          ) : null}
          {reportContent(bodyBlocks, props)}
        </div>
      </div>
    </article>
  );
}
