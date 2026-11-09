"use client";

import { compareLegacyPublication, ReportStatusBadge, StudioReportLibrary } from "./studio-report-library";
import { publicationEditingFingerprint } from "../../project/studio-project.ts";
import { publishedReportListSchema, reportLibrary, type PublishedReportSummary } from "../../project/report-library.ts";
import { websiteResponse } from "../../project/website-publishing.ts";

import { Button } from "@fluentui/react-button";
import { Menu, MenuDivider, MenuItem, MenuList, MenuPopover, MenuTrigger } from "@fluentui/react-menu";
import {
  Body1,
  Body1Strong,
  Caption1,
  Caption1Strong,
  Subtitle1,
} from "@fluentui/react-text";
import { ArrowBidirectionalLeftRight20Filled, ArrowBidirectionalLeftRight20Regular } from "@fluentui/react-icons/svg/arrow-bidirectional-left-right";
import { ArrowClockwise20Regular } from "@fluentui/react-icons/svg/arrow-clockwise";
import { ArrowUpload16Regular } from "@fluentui/react-icons/svg/arrow-upload";
import { Checkmark16Regular } from "@fluentui/react-icons/svg/checkmark";
import { CheckmarkCircle20Regular } from "@fluentui/react-icons/svg/checkmark-circle";
import { ChevronDown16Regular } from "@fluentui/react-icons/svg/chevron-down";
import { Desktop20Filled, Desktop20Regular } from "@fluentui/react-icons/svg/desktop";
import { DataBarHorizontal20Regular } from "@fluentui/react-icons/svg/data-bar-horizontal";
import { DataPie20Regular } from "@fluentui/react-icons/svg/data-pie";
import { Dismiss20Regular } from "@fluentui/react-icons/svg/dismiss";
import { DocumentData16Regular, DocumentData20Regular } from "@fluentui/react-icons/svg/document-data";
import { Home20Regular } from "@fluentui/react-icons/svg/home";
import { Globe20Regular } from "@fluentui/react-icons/svg/globe";
import { Phone20Filled, Phone20Regular } from "@fluentui/react-icons/svg/phone";
import { Save20Regular } from "@fluentui/react-icons/svg/save";
import { Tablet20Filled, Tablet20Regular } from "@fluentui/react-icons/svg/tablet";
import { TextPercent20Regular } from "@fluentui/react-icons/svg/text-percent";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  memo,
  useCallback,
  useMemo,
  useReducer,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import type { ExtractionResult } from "../../extraction/extract-docx.ts";
import {
  canonicalJson,
  createApprovedContentRecord,
  evaluateApprovedContentIntegrity,
  sha256Text,
} from "../../integrity/approved-content.ts";
import type {
  ReportBlock,
  ReportManifest,
  ReviewItem,
} from "../../manifest/report-manifest.ts";
import { reportBlockSchema } from "../../manifest/report-manifest.ts";
import { setTextCallout, type ParagraphBlock, type TextCalloutSelection } from "../../project/text-callout.ts";
import reportStyles from "../../report-system/report-renderer.module.css";
import { BrowserProjectStorage } from "../../project/project-storage.ts";
import {
  chooseWordSource, readWordSource, rememberWordSource, savedWordSource,
  wordSourcePicker, type WordSourceHandle,
} from "../../project/word-source-file.ts";
import { refreshWordSource, type WordRefreshResult } from "../../project/word-source-refresh.ts";
import {
  chooseSourceFolder, rememberSourceFolder, savedSourceFolder, sourceFolderFile,
  sourceFolderPicker, sourceFolderPermission, allowSourceFolderAccess, sourceFolderProblem,
  SourceFolderError, type SourceFolderHandle,
} from "../../project/source-folder.ts";
import {
  applyImageReview,
  type PublicationImageReview,
  type PublicationPreparation,
} from "../../project/publication-preparation.ts";
import { initialPublicationMetadata, needsImageDescription, readableImageDescription, type PublicationMetadataDraft } from "../../project/publication-flow.ts";
import type { BulkImportResult } from "../../project/bulk-report-import.ts";
import {
  removeReportBlock,
  restoreReportBlock,
  type RemovedBlock,
} from "../../project/report-block-history.ts";
import {
  createStudioProject,
  hasStudioProjectChanges,
  studioImageReviews,
  updateStudioProject,
  type StudioProject,
} from "../../project/studio-project.ts";
import {
  DEFAULT_STUDIO_REPORT_STYLE,
  selectableReportStyleOptions,
  type ReportStyle,
} from "../../report-system/report-style";
import {
  activeAcceptedReviewItemIds,
  resolveReviewItemsForBlock,
} from "../../review/fidelity-review.ts";
import {
  isCanonicalVisualBlock,
} from "../../visualization/canonical-report-blocks";
import {
  automaticallyVerifiedVisualType,
  verifiedVisualMatchesSource,
  type DataVisualSourceBlock,
  type VerifiedDataVisualType,
} from "../../visualization/verified-data-visual.ts";
import menuStyles from "./studio-menu.module.css";
import styles from "./publishing-studio.module.css";
import { StudioReportViewport } from "./studio-report-viewport";
import { VerifiedChartEditor, type VerifiedChartEditorProps } from "./verified-chart-editor";
import { ChartDraftPreview, type ChartDraftPreviewData } from "../../report-system/chart-draft-preview";

const StudioReportRenderer = dynamic(
  () => import("../../report-system/report-renderer").then((module) => memo(module.ReportRenderer)),
  { loading: () => <Body1 role="status">Loading report...</Body1> },
);
const PublicationCardEditor = dynamic(
  () => import("../studio/_components/publication-card-editor").then(module => module.PublicationCardEditor),
  { loading: () => <Body1 role="status">Loading listing card...</Body1> },
);
type PublicationDialogComponent = typeof import("../studio/_components/publication-package-dialog").PublicationPackageDialog;
type PublicationDialogProps = Parameters<PublicationDialogComponent>[0];
let loadedPublicationDialog: PublicationDialogComponent | undefined;

function PublicationLoadingDialog({ failed, onClose, onRetry }: {
  failed: boolean; onClose: () => void; onRetry: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousFocus = document.activeElement;
    root.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      root.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    const target = failed ? errorRef.current : headingRef.current;
    target?.focus({ preventScroll: true });
  }, [failed]);

  return <dialog ref={dialogRef} className={`${styles.publishDialog} ${styles.publishLoadingDialog}`}
    aria-labelledby="publishing-load-title" aria-describedby={failed ? "publishing-load-error" : "publishing-load-status"}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className={styles.publishLoadingContent}>
      <div className={styles.publishLoadingHeader}>
        <h2 id="publishing-load-title" ref={headingRef} tabIndex={-1}>Publish report</h2>
        <button className={styles.publishLoadingClose} aria-label="Close publishing" onClick={onClose} type="button">
          <Dismiss20Regular aria-hidden="true" />
        </button>
      </div>
      {failed ? <div className={styles.publishLoadingError} ref={errorRef} role="alert" tabIndex={-1}>
        <strong>Publishing couldn&apos;t be opened</strong>
        <p id="publishing-load-error">Check your connection, then try again. Your report is saved on this device.</p>
        <button className={styles.secondaryAction} onClick={onRetry} type="button">Try again</button>
      </div> : <div className={styles.publishLoadingStatus} id="publishing-load-status" role="status">
        <span className={styles.publishLoadingSpinner} aria-hidden="true" />
        <Body1>Opening publishing...</Body1>
      </div>}
    </div>
  </dialog>;
}

function PublicationPackageLoader(props: PublicationDialogProps) {
  const [Dialog, setDialog] = useState<PublicationDialogComponent | undefined>(() => loadedPublicationDialog);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (Dialog) return;
    let active = true;
    void import("../studio/_components/publication-package-dialog").then(module => {
      loadedPublicationDialog = module.PublicationPackageDialog;
      if (active) setDialog(() => module.PublicationPackageDialog);
    }).catch(failure => {
      if (!active) return;
      console.error("Publishing dialog could not be loaded.", failure);
      setFailed(true);
    });
    return () => { active = false; };
  }, [Dialog, attempt]);

  return Dialog ? <Dialog {...props} /> : <PublicationLoadingDialog failed={failed} onClose={props.onClose}
    onRetry={() => { setFailed(false); setAttempt(current => current + 1); }} />;
}

type Tool = "document" | "issues" | "visuals" | "insert-chart";
type ReportViewport = "full-width" | "desktop" | "tablet" | "mobile";
type VisualBlock = Extract<
  ReportBlock,
  {
    type:
      | "visual-placeholder"
      | "branded-visual"
      | "percentage-ring-group"
      | "illustrated-statistics"
      | "quadrant-scatter-plot"
      | "paired-percentage-comparison"
      | "percentage-comparison-grid"
      | "listening-maturity-scorecard"
      | "listening-approach-continuum"
      | "featured-statistic"
      | "data-callout"
      | "references"
      | "listening-methods-comparison"
      | "pull-quote"
      | "horizontal-bar-chart"
      | "grouped-column-comparison"
      | "coefficient-heatmap"
      | "before-after-comparison"
      | "impact-metrics"
      | "two-column-insight"
      | "data-visual-source";
  }
>;
type ImageBlock = Extract<ReportBlock, { type: "image" }>;
type ImagePresentation = NonNullable<ImageBlock["presentation"]>;

type StudioState =
  | { status: "empty" }
  | { status: "extracting"; fileName: string }
  | { status: "failed"; fileName: string; message: string }
  | {
      status: "ready";
      result: ExtractionResult;
      manifest: ReportManifest;
      initialReportStyle: ReportStyle;
      sourceManifest?: ReportManifest;
    };

type StudioAction =
  | { type: "reset" }
  | { type: "extract"; fileName: string }
  | { type: "fail"; fileName: string; message: string }
  | { type: "complete"; result: ExtractionResult; reportStyle: ReportStyle; manifest?: ReportManifest }
  | { type: "load-project"; project: StudioProject }
  | { type: "refresh-word"; result: ExtractionResult; manifest: ReportManifest }
  | { type: "change-block"; block: ReportBlock }
  | { type: "preview-block"; block: ReportBlock }
  | { type: "format-text"; blocks: ParagraphBlock[] }
  | { type: "remove-block"; blockId: string }
  | {
      type: "add-visual";
      block: ReportBlock;
      index: number;
    }
  | {
      type: "restore-block";
      block: ReportBlock;
      index: number;
      reviewItems: ReviewItem[];
    };

function isVisualBlock(block: ReportBlock): block is VisualBlock {
  return (
    block.type === "visual-placeholder" ||
    block.type === "branded-visual" ||
    block.type === "data-visual-source" ||
    block.type === "listening-maturity-scorecard" ||
    isCanonicalVisualBlock(block)
  );
}

type Issue = {
  id: string;
  label: string;
  severity: ReviewItem["severity"];
  blockId?: string;
  sourceLabel?: string;
  action?: "review-chart";
};

const reportViewports: Array<{
  id: ReportViewport;
  label: string;
  width?: number;
  height?: number;
}> = [
  { id: "full-width", label: "Full width" },
  { id: "desktop", label: "Desktop", width: 1440, height: 900 },
  { id: "tablet", label: "Tablet", width: 1024, height: 768 },
  { id: "mobile", label: "Mobile", width: 390, height: 844 },
];

function ReportViewportIcon({ viewport, selected }: { viewport: ReportViewport; selected: boolean }) {
  if (viewport === "full-width") {
    return selected ? <ArrowBidirectionalLeftRight20Filled aria-hidden="true" /> : <ArrowBidirectionalLeftRight20Regular aria-hidden="true" />;
  }
  if (viewport === "desktop") {
    return selected ? <Desktop20Filled aria-hidden="true" /> : <Desktop20Regular aria-hidden="true" />;
  }
  if (viewport === "tablet") {
    return selected ? <Tablet20Filled aria-hidden="true" /> : <Tablet20Regular aria-hidden="true" />;
  }
  return selected ? <Phone20Filled aria-hidden="true" /> : <Phone20Regular aria-hidden="true" />;
}

const BRAND_CENTRAL_IMAGE_COLLECTIONS_URL =
  "https://brandcentral.microsoft.com/microsoft-brand/campaigns-and-content/image-collections.html";
const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const DEFAULT_IMAGE_PRESENTATION: ImagePresentation = {
  style: "original",
  crop: "landscape",
  focalPointX: 50,
  focalPointY: 50,
};

function reducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case "reset":
      return { status: "empty" };
    case "extract":
      return { status: "extracting", fileName: action.fileName };
    case "fail":
      return {
        status: "failed",
        fileName: action.fileName,
        message: action.message,
      };
    case "complete":
      return {
        status: "ready",
        result: action.result,
        manifest: action.manifest ?? action.result.manifest,
        initialReportStyle: action.reportStyle,
        sourceManifest: action.result.manifest,
      };
    case "load-project":
      return {
        status: "ready",
        result: {
          manifest: action.project.manifest,
          manifestSha256: action.project.importedManifestSha256,
          approvedContent: action.project.approvedContent,
          publicationSourceEvidence: action.project.publicationSourceEvidence,
        },
        manifest: action.project.manifest,
        initialReportStyle: action.project.reportStyle,
        sourceManifest: action.project.sourceManifest,
      };
    case "refresh-word":
      if (state.status !== "ready") return state;
      return {
        ...state, result: action.result, manifest: action.manifest,
        sourceManifest: action.result.manifest,
      };
    case "change-block":
      if (state.status !== "ready") {
        return state;
      }
      return {
        ...state,
        manifest: {
          ...state.manifest,
          blocks: state.manifest.blocks.map((block) =>
            block.id === action.block.id ? action.block : block,
          ),
          reviewItems: resolveReviewItemsForBlock(
            state.manifest.reviewItems,
            action.block,
          ),
        },
      };
    case "format-text":
      if (state.status !== "ready") return state;
      return {
        ...state,
        manifest: {
          ...state.manifest,
          blocks: state.manifest.blocks.map(block => action.blocks.find(next => next.id === block.id) ?? block),
        },
      };
    case "preview-block":
      if (state.status !== "ready") {
        return state;
      }
      return {
        ...state,
        manifest: {
          ...state.manifest,
          blocks: state.manifest.blocks.map((block) =>
            block.id === action.block.id ? action.block : block,
          ),
        },
      };
    case "remove-block":
      if (state.status !== "ready") {
        return state;
      }
      return {
        ...state,
        manifest: removeReportBlock(state.manifest, action.blockId).manifest,
      };
    case "add-visual":
    case "restore-block":
      if (state.status !== "ready") {
        return state;
      }
      return {
        ...state,
        manifest: restoreReportBlock(state.manifest, {
          block: action.block,
          index: action.index,
          reviewItems: action.type === "restore-block" ? action.reviewItems : [],
        }),
      };
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("The selected image could not be read."));
      }
    });
    reader.addEventListener("error", () =>
      reject(new Error("The selected image could not be read.")),
    );
    reader.readAsDataURL(file);
  });
}

async function createImageBlock(
  file: File,
  id: string,
  source: ReportBlock["source"],
): Promise<ImageBlock> {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Choose an image smaller than 15 MB.");
  }

  const [dataUrl, bitmap] = await Promise.all([
    readFileAsDataUrl(file),
    createImageBitmap(file),
  ]);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();

  return reportBlockSchema.parse({
    id,
    type: "image",
    alt: "",
    fileName: file.name,
    dataUrl,
    width: dimensions.width,
    height: dimensions.height,
    assetSource: "brand-central",
    presentation: DEFAULT_IMAGE_PRESENTATION,
    provenance: { kind: "studio", sourceBlockId: id },
    source: { ...source, part: "studio" },
  }) as ImageBlock;
}

function FilePicker({
  disabled,
  label,
  onChange,
}: {
  disabled?: boolean;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className={styles.filePicker}>
      <ArrowUpload16Regular aria-hidden="true" />
      <span>{label}</span>
      {/* Validate after selection; macOS type filters can disable valid DOCX files. */}
      <input
        autoComplete="off"
        disabled={disabled}
        name="word-report"
        onChange={onChange}
        type="file"
      />
    </label>
  );
}

function PanelShell({
  bodyClassName,
  children,
  closable = true,
  footer,
  onClose,
  title,
}: {
  bodyClassName?: string;
  children: ReactNode;
  closable?: boolean;
  footer?: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <aside
      className={styles.contextPanel}
      aria-label={`${title} panel`}
      onKeyDown={(event) => {
        if (closable && event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className={styles.panelHeader}>
        <Subtitle1 as="h2">{title}</Subtitle1>
        {closable ? (
          <button
            aria-label={`Close ${title} panel`}
            onClick={onClose}
            type="button"
          >
            <Dismiss20Regular aria-hidden="true" />
          </button>
        ) : null}
      </header>
      <div className={`${styles.panelBody} ${bodyClassName ?? ""}`}>{children}</div>
      {footer ? <footer className={styles.panelFooter}>{footer}</footer> : null}
    </aside>
  );
}

function ImageEditor({
  block,
  review,
  attention,
  onDirtyChange,
  onApply,
  onCancel,
  onRemove,
  onPreview,
}: {
  block: ImageBlock;
  review?: PublicationImageReview;
  attention?: { attempt: number; message: string };
  onDirtyChange: (dirty: boolean) => void;
  onApply: (block: ImageBlock, review?: PublicationImageReview) => void;
  onCancel: (block: ImageBlock) => void;
  onRemove: () => void;
  onPreview: (block: ImageBlock) => void;
}) {
  const originalBlock = useRef(block).current;
  const originalReview = useRef(review).current;
  const originalDescription = originalReview?.description ?? originalBlock.alt;
  const initialDescription = needsImageDescription(originalDescription)
    ? "" : readableImageDescription(originalDescription);
  const [alt, setAlt] = useState(initialDescription);
  const accessibleData = originalReview?.accessibleData ?? originalBlock.accessibleData;
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const isFinishing = useRef(false);
  const draft = useMemo<ImageBlock>(
    () => alt === initialDescription ? originalBlock : ({
      ...originalBlock,
      alt: alt.trim(),
    }),
    [alt, initialDescription, originalBlock],
  );
  const isDirty = alt !== initialDescription;
  const isValid = reportBlockSchema.safeParse(draft).success && !needsImageDescription(alt);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  useEffect(() => {
    descriptionRef.current?.focus();
  }, [attention]);

  useEffect(() => {
    onPreview(draft);
  }, [draft, onPreview]);

  useEffect(
    () => () => {
      if (!isFinishing.current) {
        onPreview(originalBlock);
      }
    },
    [onPreview, originalBlock],
  );

  function cancel() {
    if (
      isDirty &&
      !window.confirm("Discard the unapplied image changes?")
    ) {
      return;
    }
    isFinishing.current = true;
    onCancel(originalBlock);
  }

  return (
    <PanelShell
      bodyClassName={styles.imagePanelBody}
      onClose={cancel}
      title="Image accessibility"
      footer={
        <>
          <div className={styles.editorActions}>
            <button className={styles.secondaryAction} onClick={cancel} type="button">
              Cancel
            </button>
            <button
              className={styles.primaryAction}
              disabled={!isDirty || !isValid}
              onClick={() => {
                isFinishing.current = true;
                onApply(draft, block.sourceAssetSha256 ? {
                  ...originalReview,
                  blockId: block.id,
                  assetSha256: originalReview?.assetSha256 ?? block.sourceAssetSha256,
                  alt: originalReview?.alt ?? originalBlock.alt,
                  description: draft.alt,
                  kind: accessibleData ? "data-bearing" : originalReview?.kind ?? block.contentKind,
                  accessibleData,
                } : undefined);
              }}
              type="button"
            >
              Apply
            </button>
          </div>
          {originalBlock.source.part === "studio" ? (
            <button
              className={styles.dangerAction}
              onClick={() => {
                isFinishing.current = true;
                onRemove();
              }}
              type="button"
            >
              Remove image
            </button>
          ) : null}
        </>
      }
    >
      <div className={styles.imageEditor}>
        <div className={styles.imageIdentity}>
          <Image alt="" height={64} src={block.dataUrl} unoptimized width={64} />
          <Caption1 block className={styles.imageFileName} title={block.fileName}>
            {block.fileName}
          </Caption1>
        </div>
        {attention !== undefined ? (
          <Caption1 block id={`${block.id}-publish-attention`} role="status">
            {attention.message}
          </Caption1>
        ) : null}
        <div className={styles.field}>
          <label htmlFor={`${block.id}-alt`}>
            <Body1Strong as="span">Image description</Body1Strong>
          </label>
          <textarea
            aria-describedby={`${block.id}-description-hint${attention !== undefined ? ` ${block.id}-publish-attention` : ""}`}
            aria-invalid={(attention !== undefined && needsImageDescription(alt)) || undefined}
            autoComplete="off"
            className={styles.imageDescription}
            id={`${block.id}-alt`}
            name={`${block.id}-alt`}
            onChange={(event) => setAlt(event.target.value)}
            placeholder="Describe the image’s meaning…"
            ref={descriptionRef}
            required
            rows={12}
            value={alt}
          />
          <Caption1 as="span" id={`${block.id}-description-hint`}>
            Help screen reader users understand this image. Your Word file won&apos;t change.
          </Caption1>
        </div>
      </div>
    </PanelShell>
  );
}

function VisualEditor({
  block,
  onDone,
  onCancel,
  onChooseImage,
  onRemove,
  onPreview,
  onDraftPreview,
  sourceFolder,
}: {
  block: VisualBlock;
  onDone: (block: ReportBlock) => void;
  onCancel: (block: VisualBlock) => void;
  onChooseImage: (block: ImageBlock) => void;
  onRemove: () => void;
  onPreview: (block: ReportBlock, editingOrder?: string[]) => void;
  onDraftPreview?: (draft: ChartDraftPreviewData | undefined) => void;
  sourceFolder?: VerifiedChartEditorProps["sourceFolder"];
}) {
  const originalBlock = useRef(block).current;
  const [imageError, setImageError] = useState<string>();
  const [isReadingImage, setIsReadingImage] = useState(false);
  const [isChartEditing, setIsChartEditing] = useState(false);
  const [newChartType, setNewChartType] = useState<"horizontal-bar-chart" | "paired-percentage-comparison">("horizontal-bar-chart");
  const sourceBlock = useMemo<DataVisualSourceBlock | undefined>(() => {
    if (originalBlock.type === "data-visual-source") {
      return originalBlock;
    }
    if (
      (originalBlock.type === "percentage-ring-group" ||
        originalBlock.type === "illustrated-statistics" ||
        originalBlock.type === "quadrant-scatter-plot" ||
        originalBlock.type === "percentage-comparison-grid" ||
        originalBlock.type === "paired-percentage-comparison" ||
        originalBlock.type === "horizontal-bar-chart" ||
        originalBlock.type === "coefficient-heatmap" ||
        originalBlock.type === "grouped-column-comparison") &&
      originalBlock.verifiedSource
    ) {
      return {
        id: originalBlock.provenance?.sourceBlockId ?? originalBlock.id,
        type: "data-visual-source",
        wordSource: originalBlock.wordSource,
        data: {
          sourceKind: originalBlock.verifiedSource.sourceKind,
          title: originalBlock.verifiedSource.title,
          unit: originalBlock.verifiedSource.unit,
          columns: originalBlock.verifiedSource.columns,
          rows: originalBlock.verifiedSource.rows,
          sha256: originalBlock.verifiedSource.sha256,
          evidenceImage: originalBlock.verifiedSource.evidenceImage,
          recommendedVisualType:
            originalBlock.verifiedSource.recommendedVisualType,
          sourceNote: originalBlock.verifiedSource.sourceNote,
          subtitle: originalBlock.verifiedSource.subtitle,
          synthetic: originalBlock.verifiedSource.synthetic,
          originalSource: originalBlock.verifiedSource.originalSource,
          workbook: originalBlock.verifiedSource.workbook,
        },
        provenance: { kind: "imported" },
        source: originalBlock.source,
      };
    }
    return undefined;
  }, [originalBlock]);
  if (originalBlock.type === "visual-placeholder" && !isChartEditing) {
    return (
      <div className={styles.visualLibrary}>
        <div>
          <Subtitle1 as="h2" block>
            Choose an asset
          </Subtitle1>
          <Body1 block>
            Add an approved photo or Glint Labs data component at this
            location.
          </Body1>
        </div>
        <section className={styles.photoAssetCard}>
          <div className={styles.photoAssetPreview} aria-hidden="true">
            <span />
          </div>
          <div>
            <Body1Strong block>Photo</Body1Strong>
            <Caption1 block>
              Choose an approved Microsoft image, then upload the downloaded
              file. Only use assets you are permitted to publish.
            </Caption1>
          </div>
          <a
            className={styles.secondaryAction}
            href={BRAND_CENTRAL_IMAGE_COLLECTIONS_URL}
            rel="noreferrer"
            target="_blank"
          >
            Browse Brand Central (opens new tab)
          </a>
          <label className={styles.filePicker}>
            <span>{isReadingImage ? "Reading photo…" : "Upload photo"}</span>
            <input
              accept="image/jpeg,image/png,image/webp"
              disabled={isReadingImage}
              name={`${block.id}-photo`}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) {
                  return;
                }
                setImageError(undefined);
                setIsReadingImage(true);
                try {
                  onChooseImage(
                    await createImageBlock(
                      file,
                      originalBlock.id,
                      originalBlock.source,
                    ),
                  );
                } catch (error) {
                  setImageError(
                    error instanceof Error
                      ? error.message
                      : "The selected image could not be added.",
                  );
                } finally {
                  setIsReadingImage(false);
                }
              }}
              type="file"
            />
          </label>
          {imageError ? (
            <Caption1 className={styles.inputError} role="alert">
              {imageError}
            </Caption1>
          ) : null}
        </section>
        <section className={styles.integrityNotice}>
          <Body1Strong block>Add a data chart</Body1Strong>
          <Body1 block>
            Paste a spreadsheet table, import CSV or TSV, or try clearly
            labeled synthetic data. Review the values before applying the
            chart to this report. Values are never inferred from pixels.
          </Body1>
          <button className={styles.secondaryAction} type="button" onClick={() => setIsChartEditing(true)}>
            Add chart
          </button>
          <button className={styles.secondaryAction} type="button" onClick={() => {
            setNewChartType("paired-percentage-comparison");
            setIsChartEditing(true);
          }}>
            Add paired comparison
          </button>
        </section>
        <button
          className={styles.secondaryAction}
          onClick={() => onCancel(originalBlock)}
          type="button"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (!sourceBlock && originalBlock.type !== "visual-placeholder") {
    return (
      <div className={styles.editor}>
        <section className={styles.integrityNotice}>
          <Body1Strong block>Unverified legacy visual</Body1Strong>
          <Body1 block>
            This component is not linked to approved structured source data.
            Re-import the reviewed Word report before publishing.
          </Body1>
        </section>
        <button
          className={styles.secondaryAction}
          onClick={() => onCancel(originalBlock)}
          type="button"
        >
          Close
        </button>
      </div>
    );
  }

  return <VerifiedChartEditor block={originalBlock} source={sourceBlock}
    sourceFolder={sourceFolder}
    initialType={newChartType}
    onPreview={onPreview} onDraftPreview={onDraftPreview} onDone={onDone} onCancel={() => onCancel(originalBlock)} onRemove={onRemove} />;
}

export function PublishingStudio() {
  const [state, dispatch] = useReducer(reducer, { status: "empty" });
  const importVersionRef = useRef(0);
  const wordSourceRef = useRef<{ version: number; handle: WordSourceHandle } | undefined>(undefined);
  const sourceFolderRef = useRef<SourceFolderHandle | undefined>(undefined);
  const [sourceFolderName, setSourceFolderName] = useState<string>();
  const [sourceFolderAccess, setSourceFolderAccess] = useState<PermissionState | "unknown">("unknown");
  const [sourceFolderIssue, setSourceFolderIssue] = useState<SourceFolderError>();
  const [canConnectSourceFolder, setCanConnectSourceFolder] = useState(false);
  const [isConnectingSourceFolder, setIsConnectingSourceFolder] = useState(false);
  function setConnectedSourceFolder(folder?: SourceFolderHandle) {
    sourceFolderRef.current = folder;
    setSourceFolderName(folder?.name);
    setSourceFolderAccess("unknown");
    setSourceFolderIssue(undefined);
    if (folder) void sourceFolderPermission(folder).then(permission => {
      if (sourceFolderRef.current === folder) setSourceFolderAccess(permission);
    });
  }
  useEffect(() => {
    setCanConnectSourceFolder(Boolean(sourceFolderPicker()));
    const version = importVersionRef.current;
    void savedSourceFolder().then(folder => {
      if (version === importVersionRef.current && !sourceFolderRef.current) setConnectedSourceFolder(folder);
    }).catch(() => undefined);
  }, []);
  const wordRefreshInputRef = useRef<HTMLInputElement>(null);
  const documentMenuRef = useRef<HTMLButtonElement>(null);
  const wordRefreshDialogRef = useRef<HTMLDialogElement>(null);
  const wordRefreshRunningRef = useRef(false);
  const excelRefreshInputRef = useRef<HTMLInputElement>(null);
  const excelRefreshChooseRef = useRef<HTMLButtonElement>(null);
  const excelRefreshSelection = useRef<{ resolve?: (file?: File) => void }>({}).current;
  const [excelRefreshRequest, setExcelRefreshRequest] = useState<{ title: string; fileName: string }>();
  useEffect(() => {
    if (excelRefreshRequest) excelRefreshChooseRef.current?.focus({ preventScroll: true });
  }, [excelRefreshRequest]);
  useEffect(() => () => excelRefreshSelection.resolve?.(), [excelRefreshSelection]);
  const finishExcelRefreshSelection = useCallback((file?: File) => {
    const resolve = excelRefreshSelection.resolve;
    excelRefreshSelection.resolve = undefined;
    setExcelRefreshRequest(undefined);
    resolve?.(file);
  }, [excelRefreshSelection]);
  useEffect(() => {
    const input = excelRefreshInputRef.current;
    const cancel = () => finishExcelRefreshSelection();
    input?.addEventListener("cancel", cancel);
    return () => input?.removeEventListener("cancel", cancel);
  }, [finishExcelRefreshSelection]);
  const [isRefreshingWord, setIsRefreshingWord] = useState(false);
  const headerOperationRef = useRef(false);
  const [headerOperation, setHeaderOperation] = useState<"saving" | "opening-publish">();
  const headerBusy = isRefreshingWord || headerOperation !== undefined;
  type WordRefreshDraft = Parameters<typeof hasStudioProjectChanges>[0];
  const latestWordDraftRef = useRef<WordRefreshDraft | undefined>(undefined);
  type PendingWordRefresh = {
    merge: WordRefreshResult;
    extraction: ExtractionResult;
    handle?: WordSourceHandle;
    version: number;
    draft: WordRefreshDraft;
  };
  const [pendingWordRefresh, setPendingWordRefresh] = useState<PendingWordRefresh>();
  useEffect(() => {
    if (!pendingWordRefresh) return;
    const dialog = wordRefreshDialogRef.current;
    const trigger = documentMenuRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      trigger?.focus({ preventScroll: true });
    };
  }, [pendingWordRefresh]);
  const [hasUnappliedImageChanges, setHasUnappliedImageChanges] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>();
  const [selectedBlockId, setSelectedBlockId] = useState<string>();
  const [chartDraftPreview, setChartDraftPreview] = useState<ChartDraftPreviewData>();
  const [chartEditingOrder, setChartEditingOrder] = useState<{ blockId: string; rowIds: string[] }>();
  const [chartInsertion, setChartInsertion] = useState<{
    beforeBlockId?: string;
    block: Extract<ReportBlock, { type: "visual-placeholder" }>;
    type?: VerifiedDataVisualType;
    preview?: ReportBlock;
    draftPreview?: ChartDraftPreviewData;
  }>();
  const chartPickerHeading = useRef<HTMLHeadingElement>(null);
  const [insertionFocus, setInsertionFocus] = useState<string>();
  useEffect(() => {
    if (chartInsertion && !chartInsertion.type) chartPickerHeading.current?.focus();
  }, [chartInsertion]);
  const previewInsertedChart = useCallback((block: ReportBlock, rowIds?: string[]) => {
    setChartInsertion(current => current ? { ...current, preview: block } : current);
    setChartEditingOrder(rowIds ? { blockId: block.id, rowIds } : undefined);
  }, []);
  const previewInsertedChartDraft = useCallback((draftPreview: ChartDraftPreviewData | undefined) => {
    setChartInsertion(current => current ? {
      ...current, draftPreview, ...(draftPreview ? { preview: undefined, type: draftPreview.type } : {}),
    } : current);
  }, []);
  const [pendingImageBlockId, setPendingImageBlockId] = useState<string>();
  const [highlightedBlockId, setHighlightedBlockId] = useState<string>();
  const [canvasScale, setCanvasScale] = useState(1);
  const [availableCanvasWidth, setAvailableCanvasWidth] = useState(1440);
  const [availableCanvasHeight, setAvailableCanvasHeight] = useState(900);
  const [reportViewport, setReportViewport] =
    useState<ReportViewport>("desktop");
  const [isSavingToLeave, setIsSavingToLeave] = useState(false);
  const [homeNavigationError, setHomeNavigationError] = useState<string>();
  const homeDialogRef = useRef<HTMLDialogElement>(null);
  const pendingLeaveProjectRef = useRef<StudioProject | undefined>(undefined);
  const [pendingRemoval, setPendingRemoval] = useState<ReportBlock>();
  const removeDialogRef = useRef<HTMLDialogElement>(null);
  const removalName = pendingRemoval?.type === "image" ? "image" : pendingRemoval && [
    "data-visual-source", "horizontal-bar-chart", "paired-percentage-comparison",
    "percentage-ring-group", "percentage-comparison-grid", "grouped-column-comparison",
    "coefficient-heatmap",
    "illustrated-statistics",
    "quadrant-scatter-plot",
  ].includes(pendingRemoval.type) ? "chart" : "component";
  useEffect(() => {
    if (pendingRemoval) removeDialogRef.current?.showModal();
  }, [pendingRemoval]);
  const [reportStyle, setReportStyle] =
    useState<ReportStyle>(DEFAULT_STUDIO_REPORT_STYLE);
  const [removedBlocks, setRemovedBlocks] = useState<RemovedBlock[]>([]);
  const [isUndoVisible, setIsUndoVisible] = useState(false);
  const [currentProject, setCurrentProject] = useState<StudioProject>();
  const [studioView, setStudioView] = useState<"report" | "card">("report");
  const [publicationMetadataDraft, setPublicationMetadataDraft] = useState<PublicationMetadataDraft>();
  const [validateCard, setValidateCard] = useState(false);
  const [editorPublications, setEditorPublications] = useState<{
    id: string; reports?: PublishedReportSummary[];
  }>();
  const [editorReportStatus, setEditorReportStatus] = useState<{ id: string; status: string }>();
  const editorProjectId = currentProject?.id;
  const editorPublicationRevision = currentProject?.websitePublication?.revision;
  useEffect(() => {
    setEditorPublications(undefined);
    if (!editorProjectId) return;
    const controller = new AbortController();
    void fetch("/api/studio/reports", { cache: "no-store", signal: controller.signal })
      .then(websiteResponse).then(value => publishedReportListSchema.parse(value))
      .then(value => {
        if (!controller.signal.aborted) setEditorPublications({ id: editorProjectId, reports: value.reports });
      }).catch(() => {
        if (!controller.signal.aborted) setEditorPublications({ id: editorProjectId });
      });
    return () => controller.abort();
  }, [editorProjectId, editorPublicationRevision]);
  const wordSourceProjectId = currentProject?.id;
  const wordSourceVersion = importVersionRef.current;
  useEffect(() => {
    if (!wordSourceProjectId || wordSourceRef.current?.version === wordSourceVersion) return;
    let active = true;
    void savedWordSource(wordSourceProjectId).then(handle => {
      if (active && handle && wordSourceVersion === importVersionRef.current &&
          wordSourceRef.current?.version !== wordSourceVersion) {
        wordSourceRef.current = { version: wordSourceVersion, handle };
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [wordSourceProjectId, wordSourceVersion]);
  useEffect(() => {
    if (!wordSourceProjectId || sourceFolderRef.current) return;
    let active = true;
    void savedSourceFolder(wordSourceProjectId).then(folder => {
      if (active && wordSourceVersion === importVersionRef.current && folder) setConnectedSourceFolder(folder);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [wordSourceProjectId, wordSourceVersion]);
  const [imageReviews, setImageReviews] = useState<PublicationImageReview[]>([]);
  const [imageAttention, setImageAttention] = useState<{ blockId: string; attempt: number; message: string }>();
  const [packageProject, setPackageProject] = useState<StudioProject>();
  const [savedProjects, setSavedProjects] = useState<StudioProject[]>([]);
  const [storageMessage, setStorageMessage] = useState<string | {
    message: string; undo?: ParagraphBlock[]; undoAction?: () => Promise<string>; error?: boolean;
  }>();
  const [undoingNotification, setUndoingNotification] = useState(false);
  const undoingNotificationRef = useRef(false);
  useEffect(() => {
    if (!storageMessage || typeof storageMessage === "string" || undoingNotification) return;
    const timer = window.setTimeout(() => {
      setStorageMessage(current => current === storageMessage ? undefined : current);
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [storageMessage, undoingNotification]);
  const [bulkResults, setBulkResults] = useState<BulkImportResult[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{
    fileName: string;
    index: number;
    total: number;
  }>();
  const [bulkError, setBulkError] = useState<string>();
  const [bulkReportStyle, setBulkReportStyle] =
    useState<ReportStyle>(DEFAULT_STUDIO_REPORT_STYLE);
  const bulkImportRunningRef = useRef(false);
  const bulkDialogRef = useRef<HTMLDialogElement>(null);
  const bulkSavedCount = bulkResults.filter(
    (result) => result.status === "saved",
  ).length;
  const bulkFailedCount = bulkResults.length - bulkSavedCount;
  const [acceptedReviewItemIds, setAcceptedReviewItemIds] = useState<string[]>(
    [],
  );
  latestWordDraftRef.current = state.status === "ready" ? {
    manifest: state.manifest, reportStyle, imageReviews, acceptedReviewItemIds, publicationMetadataDraft,
  } : undefined;
  const [isDocumentMenuOpen, setIsDocumentMenuOpen] = useState(false);
  const publishActionRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const newReportFileRef = useRef<HTMLInputElement>(null);
  const reportSurfaceRef = useRef<HTMLIFrameElement>(null);
  const reportCanvasWidth =
    reportViewports.find((viewport) => viewport.id === reportViewport)?.width ??
    availableCanvasWidth;
  const reportCanvasHeight =
    reportViewports.find((viewport) => viewport.id === reportViewport)?.height ??
    availableCanvasHeight;
  const closeDocumentMenuForPreview = useCallback(() => {
    setIsDocumentMenuOpen(false);
  }, []);
  const previewVisual = useCallback(
    (block: ReportBlock, rowIds?: string[]) => {
      dispatch({ type: "preview-block", block });
      setChartEditingOrder(rowIds ? { blockId: block.id, rowIds } : undefined);
    },
    [],
  );

  const manifest = state.status === "ready" ? state.manifest : undefined;
  const listingMetadata = manifest ? initialPublicationMetadata({
    manifest, publicationPreparation: currentProject?.publicationPreparation, publicationMetadataDraft,
  }) : undefined;
  const hasProjectChanges = useMemo(
    () => state.status === "ready" && hasStudioProjectChanges(
      { manifest: state.manifest, reportStyle, acceptedReviewItemIds, imageReviews, publicationMetadataDraft },
      currentProject ?? {
        manifest: state.result.manifest,
        reportStyle: state.initialReportStyle,
        acceptedReviewItemIds: [],
        imageReviews: [],
      },
    ),
    [state, reportStyle, acceptedReviewItemIds, imageReviews, publicationMetadataDraft, currentProject],
  );
  const hasUnsavedEdits = !!chartInsertion || hasUnappliedImageChanges || hasProjectChanges;
  const hasUnsavedChanges = hasUnsavedEdits || (!!manifest && !currentProject);
  useEffect(() => {
    if (!currentProject || !manifest || editorPublications?.id !== currentProject.id) return;
    let active = true;
    const id = currentProject.id;
    if (!editorPublications.reports) {
      setEditorReportStatus({ id, status: "Status unavailable" });
      return;
    }
    void reportLibrary([{
      ...currentProject, manifest, reportStyle, imageReviews, acceptedReviewItemIds, publicationMetadataDraft,
    }], editorPublications.reports).then(([report]) => compareLegacyPublication(report)).then(report => {
      if (active) setEditorReportStatus({
        id, status: report.unpublishedChanges ? "Unpublished changes" : report.publication ? "Published" : "Draft",
      });
    }).catch(() => {
      if (active) setEditorReportStatus({ id, status: "Status unavailable" });
    });
    return () => { active = false; };
  }, [currentProject, manifest, reportStyle, imageReviews, acceptedReviewItemIds, publicationMetadataDraft, editorPublications]);
  const selectedBlock = manifest?.blocks.find(
    (block) => block.id === selectedBlockId,
  );
  const isVisualEditing = activeTool === "visuals" && !!selectedBlock && isVisualBlock(selectedBlock);
  const displayManifest = useMemo(() => {
    if (!manifest) return undefined;
    const blocks = manifest.blocks.map((block) => {
      if (block.type !== "image") return block;
      const review = imageReviews.find((item) => item.blockId === block.id);
      return applyImageReview(block, review && block.id === selectedBlockId
        ? { ...review, description: block.alt } : review);
    });
    if (chartInsertion) {
      const index = chartInsertion.beforeBlockId
        ? blocks.findIndex(block => block.id === chartInsertion.beforeBlockId) : blocks.length;
      if (index >= 0) blocks.splice(index, 0, chartInsertion.preview ?? chartInsertion.block);
    }
    return { ...manifest, blocks };
  }, [manifest, imageReviews, selectedBlockId, chartInsertion]);
  const integrity = useMemo(
    () =>
      manifest && state.status === "ready"
        ? evaluateApprovedContentIntegrity(
            manifest,
            state.result.approvedContent,
          )
        : undefined,
    [manifest, state],
  );
  const dataVisualStatuses = useMemo(() => {
    if (!manifest) {
      return [];
    }

    return manifest.blocks.flatMap((block) => {
      if (block.type === "data-visual-source") {
        return [
          {
            id: block.id,
            title: block.data.title,
            status: automaticallyVerifiedVisualType(block)
              ? ("verified" as const)
              : ("review-required" as const),
          },
        ];
      }

      if (
        block.type !== "percentage-ring-group" &&
        block.type !== "illustrated-statistics" &&
        block.type !== "quadrant-scatter-plot" &&
        block.type !== "percentage-comparison-grid" &&
        block.type !== "paired-percentage-comparison" &&
        block.type !== "horizontal-bar-chart" &&
        block.type !== "coefficient-heatmap" &&
        block.type !== "grouped-column-comparison"
      ) {
        return [];
      }

      return [
        {
          id: block.id,
          title: block.title,
          status:
            block.verifiedSource && verifiedVisualMatchesSource(block)
              ? ("verified" as const)
              : ("review-required" as const),
        },
      ];
    });
  }, [manifest]);
  const dataVisualsNeedingReview = dataVisualStatuses.filter(
    (visual) => visual.status === "review-required",
  );
  const removeBlock = useCallback(
    (blockId: string, confirmed = false) => {
      if (!manifest || manifest.blocks.length <= 1) {
        return;
      }

      const result = removeReportBlock(manifest, blockId);
      if (!result.removed || result.removed.block.source.part !== "studio") {
        return;
      }
      const removed = result.removed;

      if (!confirmed && (removed.block.type === "image" || isVisualBlock(removed.block))) {
        setPendingRemoval(removed.block);
        return;
      }

      setRemovedBlocks((blocks) => [...blocks, removed]);
      setIsUndoVisible(true);
      dispatch({ type: "remove-block", blockId });
      setSelectedBlockId(undefined);
      setPendingImageBlockId((current) =>
        current === blockId ? undefined : current,
      );
      setHighlightedBlockId((current) =>
        current === blockId ? undefined : current,
      );
      setActiveTool(undefined);
    },
    [manifest],
  );
  const issues = useMemo<Issue[]>(() => {
    if (!manifest) {
      return [];
    }

    const result: Issue[] = manifest.reviewItems
      .filter((item) => item.code !== "comments-omitted" || item.severity === "blocker")
      .map((item) => ({
        id: item.id,
        label: item.message,
        severity: item.severity,
        blockId: item.blockId,
        sourceLabel: item.source
          ? `${item.source.part} · item ${item.source.index}`
          : undefined,
      }));
    for (const visual of dataVisualsNeedingReview) {
      const existing = result.findIndex(issue => issue.blockId === visual.id);
      if (existing >= 0) {
        result[existing] = { ...result[existing], severity: "blocker", action: "review-chart" };
      } else {
        result.push({
          id: `chart-review-${visual.id}`, blockId: visual.id,
          label: `Review chart: ${visual.title}`, severity: "blocker", action: "review-chart",
        });
      }
    }
    return result;
  }, [manifest, dataVisualsNeedingReview]);
  const acceptedIssueIds = useMemo(
    () => new Set(acceptedReviewItemIds.filter(id => !issues.some(issue => issue.id === id && issue.severity === "blocker"))),
    [acceptedReviewItemIds, issues],
  );
  const openIssues = issues.filter(
    (issue) =>
      issue.severity === "blocker" || !acceptedIssueIds.has(issue.id),
  );
  const blockingIssues = issues.filter((issue) => issue.severity === "blocker");
  const canPublish =
    integrity?.status === "intact" &&
    blockingIssues.length === 0;

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    let active = true;
    void new BrowserProjectStorage(window.localStorage)
      .list()
      .then((projects) => {
        if (active) {
          setSavedProjects(projects);
        }
      })
      .catch((error) => {
        if (active) {
          setStorageMessage(
            error instanceof Error
              ? error.message
              : "Saved projects could not be listed.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isUndoVisible) {
      return;
    }
    const timeout = window.setTimeout(() => setIsUndoVisible(false), 7000);
    return () => window.clearTimeout(timeout);
  }, [isUndoVisible, removedBlocks.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !manifest) {
      return;
    }
    const observedCanvas = canvas;

    function updateCanvasScale() {
      const availableWidth = Math.max(
        observedCanvas.clientWidth - (reportViewport === "full-width" ? 0 : 80),
        1,
      );
      const availableHeight = Math.max(
        observedCanvas.clientHeight - 80,
        1,
      );
      setAvailableCanvasWidth(availableWidth);
      setAvailableCanvasHeight(availableHeight);
      const nextScale = reportViewport === "full-width" ? 1 : Math.min(
        1, availableWidth / reportCanvasWidth, availableHeight / reportCanvasHeight,
      );
      setCanvasScale(nextScale);
    }

    updateCanvasScale();
    const observer = new ResizeObserver(updateCanvasScale);
    observer.observe(observedCanvas);
    return () => observer.disconnect();
  }, [manifest, reportCanvasWidth, reportCanvasHeight, reportViewport]);

  function wordRefreshIsCurrent(pending: PendingWordRefresh) {
    return pending.version === importVersionRef.current && latestWordDraftRef.current &&
      !hasStudioProjectChanges(latestWordDraftRef.current, pending.draft);
  }

  async function applyWordRefresh(pending: PendingWordRefresh) {
    try {
      if (!wordRefreshIsCurrent(pending)) {
        setStorageMessage("Your draft changed while Word was refreshing. Refresh again to include your latest edits.");
        return;
      }
      const { merge, extraction } = pending;
      const [approvedContent, manifestSha256] = await Promise.all([
        createApprovedContentRecord(merge.sourceManifest),
        sha256Text(JSON.stringify(merge.sourceManifest)),
      ]);
      if (!wordRefreshIsCurrent(pending)) return;
      const refreshedImageReviews = imageReviews.filter(review => {
        const old = manifest?.blocks.find(block => block.id === review.blockId);
        const fresh = merge.manifest.blocks.find(block => block.id === review.blockId);
        return old?.type === "image" && fresh?.type === "image" && old.dataUrl === fresh.dataUrl;
      });
      const retainedAcceptedIds = acceptedReviewItemIds.filter(id => {
        const old = manifest?.reviewItems.find(item => item.id === id);
        const fresh = merge.manifest.reviewItems.find(item => item.id === id);
        return old && fresh && canonicalJson({ ...old, source: undefined }) === canonicalJson({ ...fresh, source: undefined });
      });
      const changes = {
        manifest: merge.manifest,
        sourceManifest: merge.sourceManifest,
        importedManifestSha256: manifestSha256,
        approvedContent,
        publicationSourceEvidence: extraction.publicationSourceEvidence,
        reportStyle,
        imageReviews: refreshedImageReviews,
        publicationMetadataDraft,
        acceptedReviewItemIds: retainedAcceptedIds,
        status: "draft" as const,
      };
      const project = currentProject
        ? updateStudioProject(currentProject, changes)
        : createStudioProject(changes);
      const storage = new BrowserProjectStorage(window.localStorage);
      await storage.save(project);
      if (!wordRefreshIsCurrent(pending)) {
        setStorageMessage("Word changes were saved, but your open draft changed during the save. Open the saved draft to see the refreshed source.");
        return;
      }
      dispatch({ type: "refresh-word", manifest: merge.manifest, result: {
        ...extraction, manifest: merge.sourceManifest, manifestSha256, approvedContent,
      } });
      setCurrentProject(project);
      setSavedProjects(projects => [project, ...projects.filter(item => item.id !== project.id)]
        .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
      setImageReviews(refreshedImageReviews);
      setAcceptedReviewItemIds(retainedAcceptedIds);
      setActiveTool(undefined);
      setSelectedBlockId(undefined);
      setRemovedBlocks([]);
      setIsUndoVisible(false);
      setStorageMessage(merge.unchanged
        ? "Word is up to date. Draft saved on this device."
        : "Refreshed from Word. Draft saved on this device.");
      if (sourceFolderRef.current) {
        try { await rememberSourceFolder(sourceFolderRef.current, project.id); }
        catch {
          if (pending.version === importVersionRef.current) setStorageMessage("Refreshed from Word and saved. This browser couldn't remember the source folder. Reconnect it when prompted next time.");
        }
      }
      if (pending.handle) {
        wordSourceRef.current = { version: pending.version, handle: pending.handle };
        try {
          await rememberWordSource(project.id, pending.handle);
        } catch {
          if (pending.version === importVersionRef.current) {
            setStorageMessage("Refreshed from Word and saved. This browser couldn't remember the connection. Choose the Word file when prompted after reloading.");
          }
        }
      }
    } catch (error) {
      if (pending.version === importVersionRef.current) {
        setStorageMessage(error instanceof Error ? error.message : "Word changes couldn't be saved. Your open draft hasn't changed. Try refreshing again.");
      }
    }
  }

  async function connectSourceFolder(allowAccess = false) {
    if (isConnectingSourceFolder || isRefreshingWord || !requireAppliedEdits()) return;
    const picker = sourceFolderPicker();
    if (!allowAccess && !picker) return;
    const version = importVersionRef.current;
    setIsConnectingSourceFolder(true);
    try {
      const folder = allowAccess ? sourceFolderRef.current : await chooseSourceFolder(picker!);
      if (!folder) return;
      if (allowAccess) await allowSourceFolderAccess(folder);
      if (version !== importVersionRef.current) return;
      await rememberSourceFolder(folder);
      if (version !== importVersionRef.current) return;
      setConnectedSourceFolder(folder);
      if (currentProject) await rememberSourceFolder(folder, currentProject.id);
      if (manifest && state.status === "ready") {
        const handle = await sourceFolderFile(folder, manifest.source.fileName);
        const { quadrantHash } = await import("../../extraction/quadrant-workbook.ts");
        const wordHash = await quadrantHash(await (await handle.getFile()).arrayBuffer());
        if (version !== importVersionRef.current) return;
        setSourceFolderAccess("granted");
        if (wordHash !== manifest.source.sha256) {
          wordSourceRef.current = { version, handle };
          if (currentProject) await rememberWordSource(currentProject.id, handle);
          setStorageMessage("Source folder connected. Word has changed since import. Choose Refresh from Word to load the latest Word and Excel data.");
          window.requestAnimationFrame(() => documentMenuRef.current?.focus({ preventScroll: true }));
          return;
        }
        const { hydrateFolderQuadrants } = await import("../../project/quadrant-workbook-source.ts");
        const hydrated = await hydrateFolderQuadrants(manifest, folder);
        if (version !== importVersionRef.current) return;
        if (latestWordDraftRef.current?.manifest !== manifest) {
          setStorageMessage("Source folder connected. Your draft changed while Excel was loading. Refresh from Word to include your latest edits.");
          return;
        }
        for (const block of hydrated.blocks) {
          if (block !== manifest.blocks.find(original => original.id === block.id)) dispatch({ type: "change-block", block });
        }
        wordSourceRef.current = { version, handle };
        if (currentProject) await rememberWordSource(currentProject.id, handle);
      }
      if (version === importVersionRef.current) {
        setStorageMessage(`Source folder connected: ${folder.name}. Use Refresh from Word to load saved source changes.`);
        window.requestAnimationFrame(() => documentMenuRef.current?.focus({ preventScroll: true }));
      }
    } catch (error) {
      if (version === importVersionRef.current && !(error instanceof DOMException && error.name === "AbortError")) {
        const issue = sourceFolderProblem(error);
        setSourceFolderIssue(issue);
        if (issue.kind === "permission") setSourceFolderAccess("prompt");
      }
    } finally { setIsConnectingSourceFolder(false); }
  }

  function sourceFolderControl() {
    const needsAccess = !!sourceFolderName && (sourceFolderAccess === "prompt" ||
      sourceFolderAccess === "denied" || sourceFolderIssue?.kind === "permission");
    return <div className={styles.sourceFolderControl}>
      <Caption1 block>{sourceFolderName
        ? `${needsAccess ? "Access needed" : sourceFolderAccess === "granted" && !sourceFolderIssue ? "Connected" : "Remembered folder"}: ${sourceFolderName}`
        : "No source folder connected."}</Caption1>
      <Button appearance="outline" disabled={(!canConnectSourceFolder && !needsAccess) || isConnectingSourceFolder || isRefreshingWord}
        onClick={() => void connectSourceFolder(needsAccess)}>
        {isConnectingSourceFolder ? "Connecting source folder..." : needsAccess ? "Allow folder access" : sourceFolderName ? "Change folder" : "Connect source folder"}
      </Button>
      {!canConnectSourceFolder && !sourceFolderName ? <Caption1 block>
        Folder access needs Edge or Chrome. You can still choose Word and connect Excel separately.
      </Caption1> : null}
      {needsAccess && canConnectSourceFolder ? <Button appearance="subtle" disabled={isConnectingSourceFolder || isRefreshingWord}
        onClick={() => void connectSourceFolder()}>Change folder</Button> : null}
    </div>;
  }

  async function refreshFromWord(file?: File) {
    if (state.status !== "ready" || !manifest || wordRefreshRunningRef.current || !requireAppliedEdits()) return;
    const connected = wordSourceRef.current?.version === importVersionRef.current
      ? wordSourceRef.current.handle : undefined;
    const folder = sourceFolderRef.current;
    const picker = wordSourcePicker();
    if (!file && !connected && !folder && !picker) {
      wordRefreshInputRef.current?.click();
      return;
    }
    const version = importVersionRef.current;
    const draft = latestWordDraftRef.current!;
    wordRefreshRunningRef.current = true;
    setIsRefreshingWord(true);
    setStorageMessage(undefined);
    try {
      const handle = file ? undefined : connected ??
        (folder ? await sourceFolderFile(folder, manifest.source.fileName) : await chooseWordSource(picker!));
      if (!file && !handle) return;
      const sourceFile = file ?? await readWordSource(handle!);
      if (version !== importVersionRef.current) return;
      if (!/\.docx$/i.test(sourceFile.name)) throw new Error("Choose a Word (.docx) report to refresh this draft.");
      if (sourceFile.name !== manifest.source.fileName && !window.confirm(
        `Use "${sourceFile.name}" as this draft's Word source instead of "${manifest.source.fileName}"?`,
      )) return;
      const [{ extractDocx }, bytes] = await Promise.all([
        import("../../extraction/extract-docx.ts"), sourceFile.arrayBuffer(),
      ]);
      const extraction = await extractDocx(sourceFile.name, bytes);
      if (version !== importVersionRef.current) return;
      const { connectedQuadrantSources } = await import("../../project/quadrant-workbook-source.ts");
      const quadrantSources = folder ? {} : await connectedQuadrantSources({
        ...manifest, blocks: manifest.blocks.filter(block => block.type === "quadrant-scatter-plot"),
      }, (title, fileName) => new Promise(resolve => {
        excelRefreshSelection.resolve = resolve;
        setExcelRefreshRequest({ title, fileName });
      }), folder);
      const incomingQuadrantSources = folder
        ? await connectedQuadrantSources(extraction.manifest, undefined, folder) : undefined;
      const folderPermission = folder ? await sourceFolderPermission(folder) : undefined;
      if (version !== importVersionRef.current) return;
      if (folder) {
        setSourceFolderAccess(folderPermission === "unknown" ? "granted" : folderPermission!);
        setSourceFolderIssue(undefined);
      }
      const merge = refreshWordSource({
        current: manifest, incoming: extraction.manifest,
        sourceManifest: state.sourceManifest, approvedContent: state.result.approvedContent,
        quadrantSources, incomingQuadrantSources,
      });
      const pending = { merge, extraction, handle, version, draft };
      if (!wordRefreshIsCurrent(pending)) {
        setStorageMessage("Your draft changed while Word was refreshing. Refresh again to include your latest edits.");
        return;
      }
      if (merge.conflicts.length) {
        setPendingWordRefresh(pending);
      } else {
        await applyWordRefresh(pending);
      }
    } catch (error) {
      if (version !== importVersionRef.current || error instanceof DOMException && error.name === "AbortError") return;
      const name = error instanceof Error ? error.name : "";
      if (folder && (error instanceof SourceFolderError || ["NotFoundError", "NotAllowedError", "SecurityError"].includes(name))) {
        const issue = sourceFolderProblem(error, manifest.source.fileName);
        setSourceFolderIssue(issue);
        if (issue.kind === "permission") setSourceFolderAccess("prompt");
        return;
      }
      if (connected && ["NotFoundError", "NotAllowedError", "SecurityError"].includes(name)) wordSourceRef.current = undefined;
      setStorageMessage(name === "NotFoundError"
        ? "The Word file was moved or deleted. Refresh again to choose the Word file. Your draft hasn't changed."
        : name === "NotAllowedError" || name === "SecurityError"
          ? "Word file access wasn't allowed. Refresh again to choose the Word file. Your draft hasn't changed."
          : error instanceof Error ? error.message : "Word couldn't be refreshed. Save the document, then try again. Your draft hasn't changed.");
    } finally {
      wordRefreshRunningRef.current = false;
      setIsRefreshingWord(false);
    }
  }

  async function confirmWordRefresh() {
    if (!pendingWordRefresh || wordRefreshRunningRef.current) return;
    wordRefreshRunningRef.current = true;
    setIsRefreshingWord(true);
    setPendingWordRefresh(undefined);
    try {
      await applyWordRefresh(pendingWordRefresh);
    } finally {
      wordRefreshRunningRef.current = false;
      setIsRefreshingWord(false);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!requireAppliedEdits()) {
      event.target.value = "";
      return;
    }
    if (hasUnsavedChanges && !window.confirm(
      "Open another document? Unsaved changes to this report will be lost.",
    )) {
      event.target.value = "";
      return;
    }

    const version = ++importVersionRef.current;
    setIsDocumentMenuOpen(false);
    dispatch({ type: "extract", fileName: file.name });
    setActiveTool(undefined);
    setSelectedBlockId(undefined);
    setPendingImageBlockId(undefined);
    setHighlightedBlockId(undefined);
    setRemovedBlocks([]);
    setIsUndoVisible(false);
    setCurrentProject(undefined);
    setPublicationMetadataDraft(undefined);
    setStudioView("report");
    setValidateCard(false);
    setImageReviews([]);
    setImageAttention(undefined);
    setStorageMessage(undefined);
    setSourceFolderIssue(undefined);
    setAcceptedReviewItemIds([]);
    try {
      const [{ extractDocx }, bytes] = await Promise.all([
        import("../../extraction/extract-docx.ts"), file.arrayBuffer(),
      ]);
      if (version !== importVersionRef.current) return;
      const result = await extractDocx(file.name, bytes);
      if (version !== importVersionRef.current) return;
      let hydrated = result.manifest;
      const needsLinkedExcel = result.manifest.blocks.some(block => block.type === "data-visual-source" &&
        block.data.recommendedVisualType === "quadrant-scatter-plot" && !block.data.workbook);
      const folder = sourceFolderRef.current ?? await savedSourceFolder().catch(() => undefined);
      if (version !== importVersionRef.current) return;
      if (folder) setConnectedSourceFolder(folder);
      if (folder) {
        let matchesWord = false;
        try {
          const { hydrateFolderQuadrants } = await import("../../project/quadrant-workbook-source.ts");
          const { quadrantHash } = await import("../../extraction/quadrant-workbook.ts");
          const wordHandle = await sourceFolderFile(folder, file.name);
          if (await quadrantHash(await (await wordHandle.getFile()).arrayBuffer()) !== result.manifest.source.sha256) {
            throw new Error(`This Word file doesn't match "${file.name}" in "${folder.name}". Connect the folder containing the uploaded Word report and its linked Excel workbook.`);
          }
          matchesWord = true;
          wordSourceRef.current = { version, handle: wordHandle };
          hydrated = await hydrateFolderQuadrants(result.manifest, folder);
          if (version !== importVersionRef.current) return;
          setSourceFolderAccess("granted");
        } catch (error) {
          if (version !== importVersionRef.current) return;
          if (needsLinkedExcel) {
            const issue = sourceFolderProblem(error);
            setSourceFolderIssue(issue);
            if (issue.kind === "permission") setSourceFolderAccess("prompt");
          } else if (!matchesWord) setConnectedSourceFolder(undefined);
        }
      }
      if (version !== importVersionRef.current) return;
      dispatch({ type: "complete", result, manifest: hydrated, reportStyle });
    } catch (error) {
      if (version !== importVersionRef.current) return;
      dispatch({
        type: "fail",
        fileName: file.name,
        message:
          error instanceof Error
            ? error.message
            : "The Word document could not be extracted.",
      });
    } finally {
      event.target.value = "";
    }
  }

  async function handleBulkFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0 || bulkImportRunningRef.current) {
      return;
    }
    bulkImportRunningRef.current = true;
    setBulkResults([]);
    setBulkError(undefined);
    try {
      const { importWordReports } = await import("../../project/bulk-report-import.ts");
      await importWordReports(files, {
        storage: new BrowserProjectStorage(window.localStorage),
        reportStyle: bulkReportStyle,
        onStart: (fileName, index) =>
          setBulkProgress({ fileName, index, total: files.length }),
        onResult: (result) => {
          setBulkResults((results) => [...results, result]);
          if (result.status === "saved") {
            setSavedProjects((projects) =>
              [result.project, ...projects].toSorted((left, right) =>
                right.updatedAt.localeCompare(left.updatedAt),
              ),
            );
          }
        },
      });
    } catch (error) {
      setBulkError(
        error instanceof Error
          ? error.message
          : "Bulk import could not finish. Choose the remaining files to try again.",
      );
    } finally {
      bulkImportRunningRef.current = false;
      setBulkProgress(undefined);
    }
  }

  function returnToStart() {
    importVersionRef.current++;
    pendingLeaveProjectRef.current = undefined;
    homeDialogRef.current?.close();
    setIsDocumentMenuOpen(false);
    dispatch({ type: "reset" });
    setActiveTool(undefined);
    setSelectedBlockId(undefined);
    setPendingImageBlockId(undefined);
    setHighlightedBlockId(undefined);
    setCurrentProject(undefined);
    setPublicationMetadataDraft(undefined);
    setStudioView("report");
    setValidateCard(false);
    setImageReviews([]);
    setImageAttention(undefined);
    setPackageProject(undefined);
    setAcceptedReviewItemIds([]);
    setRemovedBlocks([]);
    setIsUndoVisible(false);
    setStorageMessage(undefined);
    setHomeNavigationError(undefined);
    setReportViewport("desktop");
    setReportStyle(DEFAULT_STUDIO_REPORT_STYLE);
    setCanvasScale(1);
    window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      canvasRef.current?.querySelector<HTMLButtonElement>("[data-studio-new-report]")?.focus();
    });
  }

  function goHome() {
    if (!requireAppliedEdits()) return;
    pendingLeaveProjectRef.current = undefined;
    if (!hasUnsavedChanges) {
      returnToStart();
      return;
    }
    setHomeNavigationError(undefined);
    homeDialogRef.current?.showModal();
  }

  function finishLeaving() {
    const project = pendingLeaveProjectRef.current;
    if (project) openProject(project);
    else returnToStart();
  }

  async function saveAndLeave() {
    setIsSavingToLeave(true);
    setHomeNavigationError(undefined);
    const project = await saveCurrentProject();
    setIsSavingToLeave(false);
    if (project) {
      if (pendingLeaveProjectRef.current?.id === project.id) {
        pendingLeaveProjectRef.current = project;
      }
      finishLeaving();
    } else {
      setHomeNavigationError(
        "Your changes weren't saved. Try again, or choose Leave without saving.",
      );
    }
  }

  async function saveCurrentProject() {
    if (!requireAppliedEdits()) return;
    if (!manifest || state.status !== "ready" || headerOperationRef.current) {
      return;
    }

    headerOperationRef.current = true;
    setHeaderOperation("saving");
    try {
      const activeAcceptedIds = activeAcceptedReviewItemIds(
        manifest.reviewItems,
        acceptedReviewItemIds,
      );
      const project = currentProject
        ? updateStudioProject(currentProject, {
            manifest,
            reportStyle,
            status: canPublish ? "ready" : "draft",
            acceptedReviewItemIds: activeAcceptedIds,
            approvedContent: state.result.approvedContent,
            publicationSourceEvidence: state.result.publicationSourceEvidence,
            sourceManifest: state.sourceManifest,
            importedManifestSha256: state.result.manifestSha256,
            imageReviews,
            publicationMetadataDraft,
          })
        : createStudioProject({
            importedManifestSha256: state.result.manifestSha256,
            manifest,
            reportStyle,
            status: canPublish ? "ready" : "draft",
            acceptedReviewItemIds: activeAcceptedIds,
            approvedContent: state.result.approvedContent,
            publicationSourceEvidence: state.result.publicationSourceEvidence,
            sourceManifest: state.sourceManifest,
            imageReviews,
            publicationMetadataDraft,
          });
      const storage = new BrowserProjectStorage(window.localStorage);
      await storage.save(project);
      try {
        if (sourceFolderRef.current) await rememberSourceFolder(sourceFolderRef.current, project.id);
        if (wordSourceRef.current?.version === importVersionRef.current) await rememberWordSource(project.id, wordSourceRef.current.handle);
      } catch {
        setStorageMessage("Changes saved. This browser couldn't remember the source folder. Reconnect it when prompted next time.");
        setCurrentProject(project);
        setSavedProjects(await storage.list());
        return project;
      }
      setCurrentProject(project);
      setSavedProjects(await storage.list());
      setStorageMessage("Changes saved to this device.");
      return project;
    } catch (error) {
      setStorageMessage(
        error instanceof Error
          ? error.message
          : "The Studio project could not be saved.",
      );
    } finally {
      headerOperationRef.current = false;
      setHeaderOperation(undefined);
    }
  }

  async function showPackageDialog() {
    if (state.status !== "ready" || !manifest) {
      return;
    }
    if (!requireAppliedEdits()) return;
    if (headerOperationRef.current) return;
    const unfinishedImage = manifest.blocks.find((block) => block.type === "image" &&
      needsImageDescription(imageReviews.find((review) => review.blockId === block.id)?.description ?? block.alt));
    if (unfinishedImage) {
      setStudioView("report");
      selectBlock(unfinishedImage.id);
      setImageAttention((current) => ({
        blockId: unfinishedImage.id, attempt: (current?.attempt ?? 0) + 1,
        message: "Add a description, then choose Apply before publishing.",
      }));
      reportSurfaceRef.current?.contentDocument?.getElementById(`report-block-${unfinishedImage.id}`)?.scrollIntoView({ block: "center" });
      return;
    }
    headerOperationRef.current = true;
    setHeaderOperation("opening-publish");
    try {
      const project = currentProject
        ? updateStudioProject(currentProject, {
            manifest,
            reportStyle,
            status: currentProject.status,
            acceptedReviewItemIds,
            approvedContent: state.result.approvedContent,
            publicationSourceEvidence: state.result.publicationSourceEvidence,
            sourceManifest: state.sourceManifest,
            importedManifestSha256: state.result.manifestSha256,
            imageReviews,
            publicationMetadataDraft,
          })
        : createStudioProject({
            importedManifestSha256: state.result.manifestSha256,
            manifest,
            reportStyle,
            status: "draft",
            acceptedReviewItemIds,
            approvedContent: state.result.approvedContent,
            publicationSourceEvidence: state.result.publicationSourceEvidence,
            sourceManifest: state.sourceManifest,
            imageReviews,
            publicationMetadataDraft,
          });
      const storage = new BrowserProjectStorage(window.localStorage);
      await storage.save(project);
      setCurrentProject(project);
      setSavedProjects(await storage.list());
      setValidateCard(false);
      setPackageProject(project);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : "The package draft could not be opened. Try saving the report again.");
    } finally {
      headerOperationRef.current = false;
      setHeaderOperation(undefined);
    }
  }

  async function savePackagePreparation(preparation: PublicationPreparation) {
    if (!packageProject) {
      throw new Error("Open a report before saving package preparation.");
    }
    const project = updateStudioProject(packageProject, {
      manifest: packageProject.manifest,
      reportStyle: packageProject.reportStyle,
      status: packageProject.status,
      acceptedReviewItemIds: packageProject.acceptedReviewItemIds,
      publicationPreparation: preparation,
      publicationMetadataDraft: preparation.metadata,
    });
    const storage = new BrowserProjectStorage(window.localStorage);
    await storage.save(project);
    setCurrentProject(project);
    setPublicationMetadataDraft(preparation.metadata);
    setImageReviews(studioImageReviews(project));
    setPackageProject(project);
    setSavedProjects(await storage.list());
  }

  async function recordWebsitePublication(project: StudioProject, revision: number, packageFingerprint: string) {
    const storage = new BrowserProjectStorage(window.localStorage);
    const saved = await storage.load(project.id);
    const updated = {
      ...saved,
      websitePublication: {
        revision, packageFingerprint,
        editingFingerprint: await publicationEditingFingerprint(project),
      },
    };
    await storage.save(updated);
    setCurrentProject(updated);
    setPackageProject(updated);
    setSavedProjects(await storage.list());
  }

  function loadProject(project: StudioProject) {
    if (!requireAppliedEdits()) return false;
    if (hasUnsavedChanges) {
      pendingLeaveProjectRef.current = project;
      setHomeNavigationError(undefined);
      homeDialogRef.current?.showModal();
      return false;
    }
    openProject(project);
    return true;
  }

  function openProject(project: StudioProject) {
    if (storageMessage && typeof storageMessage !== "string" && storageMessage.undoAction) setStorageMessage(undefined);
    pendingLeaveProjectRef.current = undefined;
    homeDialogRef.current?.close();
    bulkDialogRef.current?.close();
    importVersionRef.current++;
    setConnectedSourceFolder(undefined);
    setIsDocumentMenuOpen(false);
    dispatch({ type: "load-project", project });
    setCurrentProject(project);
    setPublicationMetadataDraft(project.publicationMetadataDraft);
    setStudioView("report");
    setValidateCard(false);
    setImageReviews(studioImageReviews(project));
    setImageAttention(undefined);
    setReportStyle(project.reportStyle);
    setActiveTool(undefined);
    setSelectedBlockId(undefined);
    setPendingImageBlockId(undefined);
    setHighlightedBlockId(undefined);
    setRemovedBlocks([]);
    setIsUndoVisible(false);
    setAcceptedReviewItemIds(project.acceptedReviewItemIds);
    setStorageMessage(undefined);
    window.requestAnimationFrame(() =>
      documentMenuRef.current?.focus(),
    );
  }

  function toggleIssueAcceptance(issueId: string) {
    if (issues.find((issue) => issue.id === issueId)?.severity === "blocker") {
      return;
    }
    setAcceptedReviewItemIds((ids) =>
      ids.includes(issueId)
        ? ids.filter((id) => id !== issueId)
        : [...ids, issueId],
    );
  }

  function savedDraftMenuItems() {
    return savedProjects.map(project => (
      <MenuItem
        aria-current={currentProject?.id === project.id ? "true" : undefined}
        className={styles.savedDraftItem}
        icon={<DocumentData16Regular aria-hidden="true" />}
        key={project.id}
        onClick={() => loadProject(project)}
        secondaryContent={currentProject?.id === project.id ? <Checkmark16Regular aria-hidden="true" /> : undefined}
        title={`${project.manifest.metadata.title}\nSaved ${new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium", timeStyle: "short",
        }).format(new Date(project.updatedAt))}`}
      >
        <span className={styles.savedDraftName}>{project.manifest.metadata.title}</span>
      </MenuItem>
    ));
  }

  const selectBlock = useCallback((blockId: string) => {
    const block = manifest?.blocks.find((item) => item.id === blockId);
    if (!block) {
      return false;
    }
    if (selectedBlockId && selectedBlockId !== blockId) {
      setStorageMessage("Apply or cancel your current edits before choosing another report item.");
      return false;
    }
    setSelectedBlockId(blockId);
    setImageAttention(undefined);
    setHighlightedBlockId(undefined);
    if (block.type === "image") {
      setActiveTool("document");
    } else if (isVisualBlock(block)) {
      setActiveTool("visuals");
    }
    return true;
  }, [manifest, selectedBlockId]);

  function highlightIssue(blockId?: string) {
    setHighlightedBlockId(blockId);
    if (!blockId) {
      return;
    }
    reportSurfaceRef.current?.contentDocument
      ?.getElementById(`report-block-${blockId}`)
      ?.scrollIntoView({ block: "center" });
  }

  function removeSelectedBlock() {
    if (selectedBlock) {
      removeBlock(selectedBlock.id);
    }
  }

  function openTextCallout(selection: TextCalloutSelection, enabled: boolean) {
    if (!manifest || !selection.length || !requireAppliedEdits()) return false;
    const drafts: ParagraphBlock[] = [];
    const previous: ParagraphBlock[] = [];
    try {
      for (const range of selection) {
        const block = manifest.blocks.find(item => item.id === range.blockId);
        if (block?.type !== "paragraph") return false;
        drafts.push(setTextCallout(block, range, enabled));
        previous.push(block);
      }
    } catch {
      setStorageMessage("Select the text you want to format.");
      return false;
    }
    dispatch({ type: "format-text", blocks: drafts });
    setStorageMessage({ message: enabled ? "Callout successfully added" : "Converted to paragraph.", undo: previous });
    setActiveTool(undefined);
    window.requestAnimationFrame(() => reportSurfaceRef.current?.contentDocument
      ?.getElementById(`report-block-${selection[0].blockId}`)
      ?.querySelector<HTMLElement>("[data-report-text-block]")?.focus({ preventScroll: true }));
    return true;
  }

  function undoTextCallout() {
    if (!manifest || !storageMessage || typeof storageMessage === "string" || !storageMessage.undo) return;
    const previousParagraphs = storageMessage.undo;
    const blocks = manifest.blocks.flatMap(block => {
      if (block.type !== "paragraph") return [];
      const previous = previousParagraphs.find(item => item.id === block.id && item.text === block.text);
      if (!previous) return [];
      const restored = { ...block };
      if (previous.callouts) restored.callouts = previous.callouts;
      else delete restored.callouts;
      return [restored];
    });
    if (!blocks.length) { setStorageMessage(undefined); return; }
    dispatch({ type: "format-text", blocks });
    setStorageMessage({ message: "Formatting undone." });
    window.requestAnimationFrame(() => reportSurfaceRef.current?.contentDocument
      ?.getElementById(`report-block-${blocks[0].id}`)
      ?.querySelector<HTMLElement>("[data-report-text-block]")?.focus({ preventScroll: true }));
  }

  async function undoNotification() {
    if (!storageMessage || typeof storageMessage === "string" || !storageMessage.undoAction || undoingNotificationRef.current) return;
    const notification = storageMessage;
    undoingNotificationRef.current = true;
    setUndoingNotification(true);
    try {
      const message = await storageMessage.undoAction();
      setStorageMessage(current => current === notification ? { message } : current);
    } catch {
      setStorageMessage(current => current === notification
        ? { ...notification, message: "Undo couldn't be completed. Select Undo to try again.", error: true }
        : current);
    } finally {
      undoingNotificationRef.current = false;
      setUndoingNotification(false);
    }
  }

  function startChartInsertion(beforeBlockId?: string) {
    if (!manifest || !requireAppliedEdits()) return;
    const index = beforeBlockId ? manifest.blocks.findIndex(block => block.id === beforeBlockId) : manifest.blocks.length;
    if (index < 0) return;
    const id = crypto.randomUUID();
    setInsertionFocus(undefined);
    setChartInsertion({ beforeBlockId, block: {
      id, type: "visual-placeholder", description: "New chart",
      source: { part: "studio", index }, provenance: { kind: "studio" },
    } });
    setSelectedBlockId(id);
    setActiveTool("insert-chart");
  }

  function finishChartInsertion(block?: ReportBlock) {
    if (!manifest || !chartInsertion) return;
    const { beforeBlockId } = chartInsertion;
    if (block) {
      const index = beforeBlockId ? manifest.blocks.findIndex(item => item.id === beforeBlockId) : manifest.blocks.length;
      if (index < 0) return;
      dispatch({ type: "add-visual", block, index });
    }
    setChartInsertion(undefined);
    setSelectedBlockId(undefined);
    setActiveTool(undefined);
    if (block) {
      window.requestAnimationFrame(() => reportSurfaceRef.current?.contentDocument
        ?.getElementById(`report-block-${block.id}`)?.scrollIntoView({ block: "nearest" }));
      restoreVisualEditorFocus(block.id);
    } else {
      setInsertionFocus(beforeBlockId ?? "");
    }
  }

  function changeTool(tool?: Tool) {
    if (!requireAppliedEdits()) return;
    if (pendingImageBlockId) {
      dispatch({ type: "remove-block", blockId: pendingImageBlockId });
      setPendingImageBlockId(undefined);
    }
    setSelectedBlockId(undefined);
    setActiveTool(tool);
  }

  function requireAppliedEdits() {
    if (!selectedBlockId) return true;
    setStorageMessage("Apply or cancel your current edits before continuing.");
    if (selectedBlock?.type === "image") {
      setImageAttention((current) => ({
        blockId: selectedBlock.id, attempt: (current?.attempt ?? 0) + 1,
        message: "Choose Apply or Cancel before continuing.",
      }));
    }
    return false;
  }

  function restoreImageEditorFocus(blockId: string) {
    window.requestAnimationFrame(() => {
      const imageButton = reportSurfaceRef.current?.contentDocument
        ?.getElementById(`report-block-${blockId}`)
        ?.querySelector<HTMLButtonElement>('button[aria-label^="Edit image "]');
      (imageAttention ? publishActionRef.current : imageButton ?? publishActionRef.current)
        ?.focus({ preventScroll: true });
    });
  }

  function restoreVisualEditorFocus(blockId: string) {
    const keyboardFocus = document.activeElement?.matches(":focus-visible");
    window.requestAnimationFrame(() => {
      const button = reportSurfaceRef.current?.contentDocument
        ?.getElementById(`report-block-${blockId}`)
        ?.querySelector<HTMLButtonElement>("button");
      if (button && keyboardFocus) {
        // Keyboard focus visibility does not carry across the iframe boundary.
        button.dataset.keyboardFocus = "true";
        button.addEventListener("blur", () => { delete button.dataset.keyboardFocus; }, { once: true });
      }
      (button ?? publishActionRef.current)?.focus({ preventScroll: true });
    });
  }

  function panelContent() {
    if (!activeTool) {
      return null;
    }

    if (activeTool === "insert-chart" && chartInsertion) {
      return <section aria-label="Insert chart" className={styles.chartEditorSurface}
        onKeyDown={event => {
          if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); finishChartInsertion(); }
        }}>
        {chartInsertion.type ? <VerifiedChartEditor
          key={chartInsertion.block.id} block={chartInsertion.block} initialType={chartInsertion.type} intent="insert"
          onPreview={previewInsertedChart} onDone={finishChartInsertion}
          onDraftPreview={previewInsertedChartDraft}
          onCancel={() => finishChartInsertion()} onRemove={() => finishChartInsertion()} />
          : <div className={styles.chartEditor}>
            <header className={styles.chartEditorHeader}>
              <h2 ref={chartPickerHeading} tabIndex={-1}><Subtitle1>Insert chart</Subtitle1></h2>
              <Button type="button" appearance="subtle" className={styles.chartEditorDismiss} aria-label="Close chart picker"
                icon={<Dismiss20Regular />} onClick={() => finishChartInsertion()} />
            </header>
            <div className={styles.chartEditorBody}>
              <div className={styles.chartTypeList}>
              {([
                ["horizontal-bar-chart", "Bar chart", "Compare values", DataBarHorizontal20Regular],
                ["paired-percentage-comparison", "Paired comparison", "Show two percentage findings", TextPercent20Regular],
                ["percentage-ring-group", "Percentage rings", "Show two or three percentage findings", DataPie20Regular],
                ["illustrated-statistics", "Illustrated statistics", "Pair two or three findings with illustrations", DataPie20Regular],
                ["quadrant-scatter-plot", "2×2 quadrant", "Plot numerical X/Y values with interactive point details", DataPie20Regular],
                ["percentage-comparison-grid", "Percentage comparison grid", "Show four percentage findings in two rows", TextPercent20Regular],
                ["coefficient-heatmap", "Coefficient heatmap", "Compare numeric coefficients across factors and periods", DataBarHorizontal20Regular],
              ] as const).map(([type, title, description, Icon]) => <Button key={type} type="button"
                className={styles.chartTypeCard}
                onClick={() => setChartInsertion(current => current ? { ...current, type } : current)}>
                <Icon className={styles.chartTypeIcon} aria-hidden="true" />
                <span><Body1Strong block>{title}</Body1Strong><Caption1 block>{description}</Caption1></span>
              </Button>)}
              </div>
            </div>
            <footer className={styles.chartEditorFooter}>
              <div className={styles.editorActions}>
                <Button type="button" className={styles.chartAction} onClick={() => finishChartInsertion()}>Cancel</Button>
              </div>
            </footer>
          </div>}
      </section>;
    }

    if (activeTool === "document") {
      if (selectedBlock?.type !== "image") {
        return null;
      }

      return (
        <ImageEditor
          attention={imageAttention?.blockId === selectedBlock.id ? imageAttention : undefined}
          block={selectedBlock}
          key={selectedBlock.id}
          onDirtyChange={setHasUnappliedImageChanges}
          review={imageReviews.find((review) => review.blockId === selectedBlock.id)}
          onApply={(block, review) => {
            dispatch({ type: "change-block", block });
            if (review) {
              setImageReviews((reviews) => [...reviews.filter((item) => item.blockId !== block.id), review]);
            }
            setImageAttention(undefined);
            setPendingImageBlockId(undefined);
            setSelectedBlockId(undefined);
            setActiveTool(undefined);
            restoreImageEditorFocus(block.id);
          }}
          onCancel={(originalBlock) => {
            if (pendingImageBlockId === originalBlock.id) {
              dispatch({
                type: "remove-block",
                blockId: originalBlock.id,
              });
            } else {
              dispatch({ type: "preview-block", block: originalBlock });
            }
            setPendingImageBlockId(undefined);
            setImageAttention(undefined);
            setSelectedBlockId(undefined);
            setActiveTool(undefined);
            restoreImageEditorFocus(originalBlock.id);
          }}
          onRemove={removeSelectedBlock}
          onPreview={previewVisual}
        />
      );
    }

    if (activeTool === "issues") {
      return (
        <PanelShell onClose={() => changeTool(undefined)} title="Issues">
          {issues.length === 0 ? (
            <div className={styles.panelSection}>
              <Body1Strong block>No identified issues</Body1Strong>
              <Body1 block>
                Approved content remains locked. You can review presentation
                and responsive behavior.
              </Body1>
            </div>
          ) : (
            <ul className={styles.issueList}>
              {issues.map((issue) => (
                <li
                  className={
                    acceptedIssueIds.has(issue.id) ? styles.acceptedIssue : ""
                  }
                  key={issue.id}
                >
                  <div className={styles.issueHeading}>
                    <Caption1Strong
                      className={
                        issue.severity === "blocker"
                          ? styles.blockerLabel
                          : styles.warningLabel
                      }
                    >
                      {issue.severity === "blocker" ? "Blocker" : "Warning"}
                    </Caption1Strong>
                    {acceptedIssueIds.has(issue.id) ? (
                      <Caption1>Accepted</Caption1>
                    ) : null}
                  </div>
                  <button
                    disabled={!issue.blockId}
                    onClick={() => {
                      if (issue.action === "review-chart" && issue.blockId) selectBlock(issue.blockId);
                      else highlightIssue(issue.blockId);
                    }}
                    type="button"
                  >
                    <Body1Strong block>{issue.label}</Body1Strong>
                    <Caption1 block>
                      {issue.action === "review-chart" ? "Open chart editor" : issue.blockId
                        ? `Highlight in report${
                            issue.sourceLabel ? ` · ${issue.sourceLabel}` : ""
                          }`
                        : issue.sourceLabel || "Document-level issue"}
                    </Caption1>
                  </button>
                  <button
                    className={styles.acceptIssueAction}
                    disabled={issue.severity === "blocker"}
                    onClick={() => toggleIssueAcceptance(issue.id)}
                    type="button"
                  >
                    {issue.severity === "blocker"
                      ? "Must resolve before publishing"
                      : acceptedIssueIds.has(issue.id)
                        ? "Reopen issue"
                        : "Accept for this report"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PanelShell>
      );
    }

    if (activeTool === "visuals") {
      if (selectedBlock && isVisualBlock(selectedBlock)) {
        return (
          <section aria-label="Chart editor" className={styles.chartEditorSurface}>
            <VisualEditor
              block={selectedBlock}
              sourceFolder={sourceFolderName ? {
                name: sourceFolderName,
                status: sourceFolderAccess === "prompt" || sourceFolderAccess === "denied" || sourceFolderIssue?.kind === "permission"
                  ? "access-needed" : sourceFolderAccess === "granted" && !sourceFolderIssue ? "connected" : "unavailable",
              } : undefined}
              key={selectedBlock.id}
              onDone={(block) => {
                setChartDraftPreview(undefined);
                dispatch({ type: "change-block", block });
                setSelectedBlockId(undefined);
                setActiveTool(undefined);
                restoreVisualEditorFocus(block.id);
              }}
              onCancel={(originalBlock) => {
                setChartDraftPreview(undefined);
                if (
                  originalBlock.type === "visual-placeholder" &&
                  originalBlock.source.part === "studio"
                ) {
                  dispatch({
                    type: "remove-block",
                    blockId: originalBlock.id,
                  });
                } else {
                  dispatch({ type: "preview-block", block: originalBlock });
                }
                setSelectedBlockId(undefined);
                setActiveTool(undefined);
                restoreVisualEditorFocus(originalBlock.id);
              }}
              onChooseImage={(block) => {
                dispatch({ type: "preview-block", block });
                setPendingImageBlockId(block.id);
                setSelectedBlockId(block.id);
                setActiveTool("document");
              }}
              onRemove={removeSelectedBlock}
              onPreview={previewVisual}
              onDraftPreview={setChartDraftPreview}
            />
          </section>
        );
      }
    }

    return null;
  }

  return (
    <div
      className={`${styles.shell} ${manifest ? styles.reportLoaded : ""}`}
    >
      <header
        className={`${styles.topBar} ${manifest ? styles.reportLoaded : ""}`}
      >
        <div className={styles.identity}>
          <button
            aria-label="Back to home"
            className={styles.homeAction}
            disabled={headerBusy}
            onClick={goHome}
            title="Back to home"
            type="button"
          >
            <Home20Regular aria-hidden="true" />
          </button>
          {manifest ? (
            <>
              <div className={styles.documentMenu}>
                <Menu
                  open={isDocumentMenuOpen}
                  onOpenChange={(_, data) => {
                    setIsDocumentMenuOpen(data.open);
                  }}
                  positioning={{ position: "below", align: "start", offset: 6 }}
                >
                  <MenuTrigger disableButtonEnhancement>
                    <Button
                      appearance="outline"
                      className={styles.documentTrigger}
                      disabled={headerBusy}
                      icon={<ChevronDown16Regular aria-hidden="true" />}
                      iconPosition="after"
                      ref={documentMenuRef}
                      title={manifest.metadata.title}
                    >
                      <span className={styles.documentTriggerContent}>
                        <DocumentData20Regular aria-hidden="true" />
                        <span className={styles.documentTriggerTitle}>{manifest.metadata.title}</span>
                      </span>
                    </Button>
                  </MenuTrigger>
                  <MenuPopover className={`${menuStyles.popover} ${styles.documentMenuPopover}`}>
                    <MenuList aria-label="Documents" aria-labelledby={undefined}>
                      {savedProjects.length > 0 ? (
                        <div className={styles.documentMenuList} role="none">{savedDraftMenuItems()}</div>
                      ) : (
                        <Caption1 className={styles.documentMenuEmpty}>No saved documents yet</Caption1>
                      )}
                      <MenuDivider />
                      <MenuItem icon={<ArrowClockwise20Regular aria-hidden="true" />} disabled={headerBusy}
                        onClick={() => { setIsDocumentMenuOpen(false); void refreshFromWord(); }}>
                        {isRefreshingWord ? "Refreshing from Word..." : "Refresh from Word"}
                      </MenuItem>
                    </MenuList>
                  </MenuPopover>
                </Menu>
              </div>
              <span className={styles.identityStatus} role="status" aria-label="Report publication status">
                <ReportStatusBadge status={!currentProject ? "Draft"
                  : editorReportStatus?.id === currentProject.id ? editorReportStatus.status : "Checking status…"} />
              </span>
            </>
          ) : null}
        </div>
        {manifest ? (
          <div className={styles.viewControls}>
          <div
            aria-label="Report viewport"
            className={styles.viewportSwitcher}
            role="group"
          >
            {reportViewports.map((viewport) => (
              <button
                aria-label={viewport.label}
                aria-pressed={studioView === "report" && reportViewport === viewport.id}
                key={viewport.id}
                onClick={() => { setStudioView("report"); setReportViewport(viewport.id); }}
                title={viewport.width ? `${viewport.label} (${viewport.width} × ${viewport.height})` : viewport.label}
                type="button"
              >
                <ReportViewportIcon viewport={viewport.id} selected={studioView === "report" && reportViewport === viewport.id} />
              </button>
            ))}
          </div>
          <button className={styles.cardViewAction} aria-label="Listing card" title="Listing card"
            aria-pressed={studioView === "card"} type="button" disabled={headerBusy}
            onClick={() => {
              if (!requireAppliedEdits()) return;
              setIsDocumentMenuOpen(false);
              setActiveTool(undefined);
              setSelectedBlockId(undefined);
              setStudioView("card");
            }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              stroke={studioView === "card" ? "var(--colorNeutralForegroundInverted)" : "currentColor"}>
              <rect x="3" y="3" width="18" height="18" rx="3.5" stroke="currentColor" strokeWidth="1.2"
                fill={studioView === "card" ? "currentColor" : "none"} />
              <rect x="7" y="7" width="5.5" height="4" rx=".75" strokeWidth="1.2" />
              <path d="M7 14h9.5M7 17h8" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
          </div>
        ) : null}
        <div className={styles.reportStatus}>
          {manifest ? (
            <>
              <input
                hidden
                name="word-refresh"
                onChange={event => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void refreshFromWord(file);
                }}
                ref={wordRefreshInputRef}
                type="file"
              />
              <div className={styles.documentActions}>
                <button
                  className={styles.secondaryTopAction}
                  disabled={headerBusy || !hasUnsavedChanges}
                  aria-busy={headerOperation === "saving" || undefined}
                  onClick={() => void saveCurrentProject()}
                  type="button"
                >
                  <Save20Regular aria-hidden="true" />
                  {headerOperation === "saving" ? "Saving..." : "Save"}
                </button>
                <button
                  className={styles.publishAction}
                  disabled={headerBusy}
                  aria-busy={headerOperation === "opening-publish" || undefined}
                  onClick={showPackageDialog}
                  ref={publishActionRef}
                  type="button"
                >
                  <Globe20Regular aria-hidden="true" />
                  {headerOperation === "opening-publish" ? "Opening..." : "Publish to Glint Labs"}
                </button>
              </div>
            </>
          ) : (
            <Caption1>FHL prototype</Caption1>
          )}
        </div>
      </header>

      {packageProject ? (
        <PublicationPackageLoader
          onClose={() => setPackageProject(undefined)}
          onEditDetails={() => {
            setPackageProject(undefined);
            setActiveTool(undefined);
            setSelectedBlockId(undefined);
            setValidateCard(true);
            setStudioView("card");
          }}
          onSave={savePackagePreparation}
          onPublished={recordWebsitePublication}
          project={packageProject}
        />
      ) : null}

      <dialog
        aria-describedby="word-refresh-description"
        aria-labelledby="word-refresh-title"
        className={styles.publishDialog}
        onCancel={event => { event.preventDefault(); setPendingWordRefresh(undefined); }}
        ref={wordRefreshDialogRef}
      >
        <div className={styles.publishDialogContent}>
          <div className={styles.publishDialogHeader}>
            <div className={styles.publishDialogHeaderCopy}>
              <h2 id="word-refresh-title">Replace conflicting Studio edits?</h2>
              <Body1 id="word-refresh-description">
                Some Word updates conflict with Studio edits or couldn&apos;t be matched to the draft.
                Word updates will replace conflicting sections. Matched chart styling and Studio-only content stay.
                Nothing will be published.
              </Body1>
              <ul>
                {pendingWordRefresh?.merge.conflicts.map((conflict, index) =>
                  <li key={index}>{conflict.label}</li>)}
              </ul>
            </div>
          </div>
          <div className={styles.publishDialogFooter}>
            <button autoFocus className={styles.secondaryAction} type="button"
              onClick={() => setPendingWordRefresh(undefined)}>Keep current draft</button>
            <button className={styles.primaryAction} type="button"
              disabled={!pendingWordRefresh || isRefreshingWord}
              onClick={() => void confirmWordRefresh()}>Use Word changes</button>
          </div>
        </div>
      </dialog>

      <dialog
        aria-describedby="remove-component-description"
        aria-labelledby="remove-component-title"
        className={`${styles.publishDialog} ${styles.removeDialog}`}
        onClose={() => setPendingRemoval(undefined)}
        ref={removeDialogRef}
      >
        <div className={styles.publishDialogContent}>
          <div className={styles.publishDialogHeader}>
            <div className={styles.publishDialogHeaderCopy}>
              <h2 id="remove-component-title">Remove this {removalName}?</h2>
              <Body1 id="remove-component-description">
                This removes the {removalName} and its content from your report. You can undo this for a short time.
              </Body1>
            </div>
          </div>
          <div className={styles.publishDialogFooter}>
            <button autoFocus className={styles.secondaryAction} onClick={() => removeDialogRef.current?.close()} type="button">
              Cancel
            </button>
            <button className={styles.dangerAction} disabled={!pendingRemoval} type="button"
              onClick={() => {
                if (!pendingRemoval) return;
                removeDialogRef.current?.close();
                removeBlock(pendingRemoval.id, true);
              }}>
              Remove {removalName}
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        aria-describedby="leave-studio-description"
        aria-labelledby="leave-studio-title"
        className={`${styles.publishDialog} ${styles.leaveDialog}`}
        onCancel={(event) => {
          if (isSavingToLeave) event.preventDefault();
          else pendingLeaveProjectRef.current = undefined;
        }}
        ref={homeDialogRef}
      >
        <div className={styles.publishDialogContent}>
          <div className={styles.publishDialogHeader}>
            <div className={styles.publishDialogHeaderCopy}>
              <h2 id="leave-studio-title">Save changes before leaving?</h2>
              <Body1 id="leave-studio-description">
                You have unsaved changes. Save them to this device before choosing another document.
              </Body1>
            </div>
          </div>
          {homeNavigationError ? (
            <div className={styles.publishDialogBody} role="alert">
              {homeNavigationError}
            </div>
          ) : null}
          <div className={styles.publishDialogFooter}>
            <button
              autoFocus
              className={styles.secondaryAction}
              disabled={isSavingToLeave}
              onClick={() => {
                pendingLeaveProjectRef.current = undefined;
                homeDialogRef.current?.close();
              }}
              type="button"
            >
              Cancel
            </button>
            <div>
              <button
                className={`${styles.secondaryAction} ${styles.leaveWithoutSaving}`}
                disabled={isSavingToLeave}
                onClick={finishLeaving}
                type="button"
              >
                Leave without saving
              </button>
              <button
                className={styles.primaryAction}
                disabled={isSavingToLeave}
                onClick={() => void saveAndLeave()}
                type="button"
              >
                {isSavingToLeave ? "Saving..." : "Save and leave"}
              </button>
            </div>
          </div>
        </div>
      </dialog>

      <dialog
        aria-describedby="bulk-import-description"
        aria-labelledby="bulk-import-title"
        className={styles.publishDialog}
        onCancel={(event) => {
          if (bulkImportRunningRef.current) {
            event.preventDefault();
          }
        }}
        ref={bulkDialogRef}
      >
        <div className={styles.publishDialogContent}>
          <div className={styles.publishDialogHeader}>
            <div className={styles.publishDialogHeaderCopy}>
              <h2 id="bulk-import-title">Bulk add reports</h2>
              <Body1 id="bulk-import-description">
                Each Word file becomes a separate draft saved in this browser.
                Review each report before publishing. Your current report stays
                unchanged.
              </Body1>
            </div>
            <button
              aria-label="Close bulk import"
              disabled={!!bulkProgress}
              onClick={() => bulkDialogRef.current?.close()}
              type="button"
            >
              <Dismiss20Regular aria-hidden="true" />
            </button>
          </div>
          <div className={styles.publishDialogBody}>
            <div className={styles.bulkImportContent}>
              <label className={styles.publishingStyleField}>
                <Body1Strong>Publishing style for new drafts</Body1Strong>
                <select
                  disabled={!!bulkProgress}
                  onChange={(event) =>
                    setBulkReportStyle(event.target.value as ReportStyle)
                  }
                  value={bulkReportStyle}
                >
                  {selectableReportStyleOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.filePicker}>
                <span>Choose Word files</span>
                <input
                  disabled={!!bulkProgress}
                  multiple
                  onChange={handleBulkFiles}
                  type="file"
                />
              </label>
              <Caption1>
                Files are processed on this device. Nothing is published.
              </Caption1>
              <div aria-atomic="true" role="status">
                {bulkProgress
                  ? `Adding ${bulkProgress.index + 1} of ${bulkProgress.total}: ${bulkProgress.fileName}`
                  : bulkResults.length > 0
                    ? `${bulkSavedCount} ${bulkSavedCount === 1 ? "draft" : "drafts"} saved. ${bulkFailedCount} ${bulkFailedCount === 1 ? "file" : "files"} could not be added.`
                    : null}
              </div>
              {bulkError ? <Body1 role="alert">{bulkError}</Body1> : null}
              {bulkResults.length > 0 ? (
                <ul
                  aria-label="Bulk import results"
                  className={styles.bulkImportResults}
                >
                  {bulkResults.map((result, index) => (
                    <li key={index}>
                      <Body1Strong block>{result.fileName}</Body1Strong>
                      {result.status === "saved" ? (
                        <>
                          <Caption1 block>
                            Draft saved: {result.project.manifest.metadata.title}
                            {" · "}
                            {result.project.manifest.reviewItems.length} review{" "}
                            {result.project.manifest.reviewItems.length === 1
                              ? "item"
                              : "items"}
                          </Caption1>
                          <button
                            className={styles.secondaryAction}
                            disabled={!!bulkProgress}
                            onClick={() => {
                              if (loadProject(result.project)) {
                                bulkDialogRef.current?.close();
                              }
                            }}
                            type="button"
                          >
                            Open draft
                          </button>
                        </>
                      ) : (
                        <Body1 block>
                          Not added: {result.message} Choose this file again
                          after resolving the issue. Saved drafts are unaffected.
                        </Body1>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          <div className={styles.publishDialogFooter}>
            <button
              className={styles.secondaryAction}
              disabled={!!bulkProgress}
              onClick={() => bulkDialogRef.current?.close()}
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      </dialog>

      <div
        className={`${styles.workspace} ${
          activeTool ? styles.panelOpen : ""
        } ${isVisualEditing || chartInsertion ? styles.chartEditing : ""}`}
      >
        {panelContent()}

        <main className={`${styles.canvas} ${studioView === "card" ? styles.cardCanvas : ""}`} id="main-content" ref={canvasRef}>
          {manifest && studioView === "report" && (openIssues.length > 0 || integrity?.status === "unverified" || blockingIssues.length > 0) ? (
            <div className={styles.canvasChecks}>
              {openIssues.length > 0 ? <button aria-pressed={activeTool === "issues"}
                className={`${styles.contextualAction} ${styles.issueAction}`}
                onClick={() => changeTool(activeTool === "issues" ? undefined : "issues")} type="button">
                {openIssues.length} {openIssues.length === 1 ? "issue" : "issues"}
              </button> : null}
              {integrity?.status === "unverified" ? <span className={styles.integrityStatus}>Unverified source</span>
                : blockingIssues.length > 0 ? <span className={styles.integrityStatus}>Resolve blockers</span> : null}
            </div>
          ) : null}
          {manifest && (sourceFolderIssue || manifest.blocks.some(block => block.type === "data-visual-source" &&
            block.data.recommendedVisualType === "quadrant-scatter-plot" && !block.data.workbook)) ? (
            <section className={styles.sourceFolderNotice} aria-label="Linked chart source">
              <Body1 role="status">{sourceFolderIssue?.message ?? (sourceFolderName && sourceFolderAccess === "granted"
                ? "Refresh from Word to load the linked Excel data from your connected folder."
                : "Choose the folder containing this Word file and its linked Excel workbook to load interactive point details.")}</Body1>
              {sourceFolderName && sourceFolderAccess === "granted" && !sourceFolderIssue ? <Button appearance="primary"
                disabled={isRefreshingWord || isConnectingSourceFolder} onClick={() => void refreshFromWord()}>Refresh from Word</Button> : null}
              {sourceFolderControl()}
            </section>
          ) : null}
          {excelRefreshRequest ? <div className={styles.storageMessage} role="status">
            <Body1Strong>Reconnect Excel to finish refreshing {excelRefreshRequest.title}</Body1Strong>
            <Body1>Choose {excelRefreshRequest.fileName}. This browser cannot read its previous connection. Nothing changes until both sources match.</Body1>
            <button ref={excelRefreshChooseRef} type="button" className={styles.secondaryAction} onClick={() => excelRefreshInputRef.current?.click()}>Choose Excel workbook</button>
            <button type="button" className={styles.secondaryAction} onClick={() => finishExcelRefreshSelection()}>Cancel refresh</button>
          </div> : null}
          <input ref={excelRefreshInputRef} hidden type="file" name="quadrant-refresh"
            onChange={event => {
              const file = event.target.files?.[0]; event.target.value = ""; finishExcelRefreshSelection(file);
            }} />
          {storageMessage ? (
            <div className={`${styles.storageMessage} ${typeof storageMessage === "string" ? "" : styles.calloutToast}`}
              role={typeof storageMessage !== "string" && storageMessage.error ? "alert" : "status"}>
              {typeof storageMessage === "string" ? <Body1>{storageMessage}</Body1> : (
                <div className={styles.calloutToastMessage}>
                  {!storageMessage.error ? <CheckmarkCircle20Regular aria-hidden="true" className={styles.calloutToastIcon} /> : null}
                  <Body1Strong>{storageMessage.message}</Body1Strong>
                </div>
              )}
              {typeof storageMessage === "string" || (!storageMessage.undo && !storageMessage.undoAction) ? <button
                aria-label={typeof storageMessage === "string" ? "Dismiss save message" : "Dismiss notification"}
                onClick={() => setStorageMessage(undefined)}
                type="button"
              >
                <Dismiss20Regular aria-hidden="true" />
              </button> : <Button appearance="outline" size="small" className={styles.toastUndo}
                disabled={undoingNotification} onClick={storageMessage.undoAction ? () => { void undoNotification(); } : undoTextCallout}>Undo</Button>}
            </div>
          ) : null}
          <input ref={newReportFileRef} hidden autoComplete="off" name="word-report" type="file" onChange={handleFile} />
          {state.status === "empty" ? <StudioReportLibrary
            projects={savedProjects}
            onNewReport={() => newReportFileRef.current?.click()}
            onOpen={loadProject}
            onProjectsChange={setSavedProjects}
            onNotify={(message, undoAction) => setStorageMessage({ message, undoAction })}
          /> : null}

          {state.status === "extracting" ? (
            <div className={styles.startCard} role="status">
              <Subtitle1 as="h1" block>
                Reading {state.fileName}
              </Subtitle1>
              <Body1 block>
                Creating your report canvas and finding items to review…
              </Body1>
            </div>
          ) : null}

          {state.status === "failed" ? (
            <div className={styles.failureCard} role="alert">
              <Subtitle1 as="h1" block>
                {state.fileName} could not be processed
              </Subtitle1>
              <Body1 block>{state.message}</Body1>
              <FilePicker label="Choose another Word file" onChange={handleFile} />
            </div>
          ) : null}

          {manifest && studioView === "card" && listingMetadata ? (
            <PublicationCardEditor key={currentProject?.id ?? manifest.source.sha256}
              project={{ id: currentProject?.id ?? "draft", manifest, reportStyle,
                publicationPreparation: currentProject?.publicationPreparation, publicationMetadataDraft }}
              metadata={listingMetadata} validate={validateCard}
              onChange={metadata => {
                const savedMetadata = initialPublicationMetadata({
                  manifest, publicationPreparation: currentProject?.publicationPreparation,
                  publicationMetadataDraft: currentProject?.publicationMetadataDraft,
                });
                setPublicationMetadataDraft(canonicalJson(metadata) === canonicalJson(savedMetadata)
                  ? currentProject?.publicationMetadataDraft : metadata);
                setStorageMessage(undefined);
              }} />
          ) : null}

          {manifest && studioView === "report" ? (
            <div className={`${styles.canvasContent} ${reportViewport === "full-width" ? styles.fullWidthCanvas : ""}`}>
              {removedBlocks.length > 0 && isUndoVisible ? (
                <div
                  aria-live="polite"
                  className={styles.undoNotice}
                  role="status"
                >
                  <Caption1>
                    {removedBlocks.length}{" "}
                    {removedBlocks.length === 1
                      ? "element was"
                      : "elements were"}{" "}
                    deleted.
                  </Caption1>
                  <button
                    onClick={() => {
                      const removedBlock = removedBlocks.at(-1);
                      if (!removedBlock) {
                        return;
                      }
                      dispatch({
                        type: "restore-block",
                        block: removedBlock.block,
                        index: removedBlock.index,
                        reviewItems: removedBlock.reviewItems,
                      });
                      setRemovedBlocks((blocks) => blocks.slice(0, -1));
                      setIsUndoVisible(removedBlocks.length > 1);
                    }}
                    type="button"
                  >
                    Undo
                  </button>
                </div>
              ) : null}
              <div
                className={styles.reportFrame}
                style={{
                  height: reportCanvasHeight * canvasScale,
                  width: reportCanvasWidth * canvasScale,
                }}
              >
                <StudioReportViewport
                  className={styles.reportSurface}
                  frameRef={reportSurfaceRef}
                  key={manifest.source.sha256}
                  onInteract={closeDocumentMenuForPreview}
                  style={
                    {
                      "--canvas-scale": canvasScale,
                      "--canvas-width": `${reportCanvasWidth}px`,
                      "--canvas-height": `${reportCanvasHeight}px`,
                    } as React.CSSProperties
                  }
                >
                  <StudioReportRenderer
                    coverEyebrow=""
                    highlightedBlockId={highlightedBlockId}
                    manifest={displayManifest ?? manifest}
                    blockOverrides={chartInsertion && !chartInsertion.preview ? {
                      [chartInsertion.block.id]: chartInsertion.type ? <ChartDraftPreview draft={chartInsertion.draftPreview ?? {
                        blockId: chartInsertion.block.id, type: chartInsertion.type,
                        title: chartInsertion.type === "coefficient-heatmap" ? "Coefficient heatmap" : "Comparison",
                        table: { columns: [], rows: [] }, unit: chartInsertion.type === "coefficient-heatmap" ? "number" : "percentage",
                      }} /> : <div className={reportStyles.chartInsertionPlaceholder} role="status">Choose a chart to preview it here.</div>,
                    } : activeTool === "visuals" && selectedBlockId === chartDraftPreview?.blockId && chartDraftPreview ? {
                      [chartDraftPreview.blockId]: <ChartDraftPreview draft={chartDraftPreview} />,
                    } : undefined}
                    onInsertChart={selectedBlockId ? undefined : startChartInsertion}
                    insertionFocus={insertionFocus === undefined ? undefined : {
                      beforeBlockId: insertionFocus, onRestored: () => setInsertionFocus(undefined),
                    }}
                    onSelectBlock={selectBlock}
                    onSelectText={selectedBlockId ? undefined : openTextCallout}
                    reportStyle={reportStyle}
                    selectedBlockId={selectedBlockId}
                    chartEditingOrder={chartEditingOrder}
                    previewViewport
                  />
                </StudioReportViewport>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
