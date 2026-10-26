"use client";

import {
  Body1,
  Body1Strong,
  Caption1,
  Caption1Strong,
  Subtitle1,
} from "@fluentui/react-text";
import { ArrowExpand16Regular } from "@fluentui/react-icons/svg/arrow-expand";
import { Checkmark16Regular } from "@fluentui/react-icons/svg/checkmark";
import { ChevronDown16Regular } from "@fluentui/react-icons/svg/chevron-down";
import { Desktop16Regular } from "@fluentui/react-icons/svg/desktop";
import { Dismiss20Regular } from "@fluentui/react-icons/svg/dismiss";
import { DocumentText24Regular } from "@fluentui/react-icons/svg/document-text";
import { Home20Regular } from "@fluentui/react-icons/svg/home";
import { Phone16Regular } from "@fluentui/react-icons/svg/phone";
import { Tablet16Regular } from "@fluentui/react-icons/svg/tablet";
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
  evaluateApprovedContentIntegrity,
} from "../../integrity/approved-content.ts";
import type {
  ReportBlock,
  ReportManifest,
  ReviewItem,
} from "../../manifest/report-manifest.ts";
import { reportBlockSchema } from "../../manifest/report-manifest.ts";
import { BrowserProjectStorage } from "../../project/project-storage.ts";
import {
  applyImageReview,
  type PublicationImageReview,
  type PublicationPreparation,
} from "../../project/publication-preparation.ts";
import { needsImageDescription, readableImageDescription } from "../../project/publication-flow.ts";
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
  reportStyleLabel,
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
  compatibleVerifiedVisuals,
  createVerifiedDataVisual,
  verifiedVisualMatchesSource,
  verifiedDataVisualName,
  type DataVisualSourceBlock,
  type VerifiedDataVisualType,
} from "../../visualization/verified-data-visual.ts";
import styles from "./publishing-studio.module.css";
import { StudioReportViewport } from "./studio-report-viewport";

const StudioReportRenderer = dynamic(
  () => import("../../report-system/report-renderer").then((module) => memo(module.ReportRenderer)),
  { loading: () => <Body1 role="status">Loading report...</Body1> },
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

type Tool = "document" | "issues" | "visuals";
type ReportViewport = "full-width" | "desktop" | "tablet" | "mobile";
type VisualBlock = Extract<
  ReportBlock,
  {
    type:
      | "visual-placeholder"
      | "branded-visual"
      | "percentage-ring-group"
      | "listening-maturity-scorecard"
      | "listening-approach-continuum"
      | "featured-statistic"
      | "data-callout"
      | "references"
      | "listening-methods-comparison"
      | "pull-quote"
      | "horizontal-bar-chart"
      | "grouped-column-comparison"
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
    };

type StudioAction =
  | { type: "reset" }
  | { type: "extract"; fileName: string }
  | { type: "fail"; fileName: string; message: string }
  | { type: "complete"; result: ExtractionResult; reportStyle: ReportStyle }
  | { type: "load-project"; project: StudioProject }
  | { type: "change-block"; block: ReportBlock }
  | { type: "preview-block"; block: ReportBlock }
  | { type: "remove-block"; blockId: string }
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

function ReportViewportIcon({ viewport }: { viewport: ReportViewport }) {
  if (viewport === "full-width") {
    return <ArrowExpand16Regular aria-hidden="true" />;
  }
  if (viewport === "desktop") {
    return <Desktop16Regular aria-hidden="true" />;
  }
  if (viewport === "tablet") {
    return <Tablet16Regular aria-hidden="true" />;
  }
  return <Phone16Regular aria-hidden="true" />;
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
        manifest: action.result.manifest,
        initialReportStyle: action.reportStyle,
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
    case "restore-block":
      if (state.status !== "ready") {
        return state;
      }
      return {
        ...state,
        manifest: restoreReportBlock(state.manifest, {
          block: action.block,
          index: action.index,
          reviewItems: action.reviewItems,
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
      <span>{label}</span>
      <input
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
            ×
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
              Remove Image
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
}: {
  block: VisualBlock;
  onDone: (block: ReportBlock) => void;
  onCancel: (block: VisualBlock) => void;
  onChooseImage: (block: ImageBlock) => void;
  onRemove: () => void;
  onPreview: (block: ReportBlock) => void;
}) {
  const originalBlock = useRef(block).current;
  const [imageError, setImageError] = useState<string>();
  const [isReadingImage, setIsReadingImage] = useState(false);
  const sourceBlock = useMemo<DataVisualSourceBlock | undefined>(() => {
    if (originalBlock.type === "data-visual-source") {
      return originalBlock;
    }
    if (
      (originalBlock.type === "percentage-ring-group" ||
        originalBlock.type === "horizontal-bar-chart" ||
        originalBlock.type === "grouped-column-comparison") &&
      originalBlock.verifiedSource
    ) {
      return {
        id: originalBlock.provenance?.sourceBlockId ?? originalBlock.id,
        type: "data-visual-source",
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
        },
        provenance: { kind: "imported" },
        source: originalBlock.source,
      };
    }
    return undefined;
  }, [originalBlock]);
  const compatibleVisuals = useMemo(
    () => (sourceBlock ? compatibleVerifiedVisuals(sourceBlock) : []),
    [sourceBlock],
  );
  const initialType =
    sourceBlock &&
    (originalBlock.type === "percentage-ring-group" ||
      originalBlock.type === "horizontal-bar-chart" ||
      originalBlock.type === "grouped-column-comparison")
      ? originalBlock.type
      : sourceBlock?.data.recommendedVisualType &&
          compatibleVisuals.includes(sourceBlock.data.recommendedVisualType)
        ? sourceBlock.data.recommendedVisualType
        : compatibleVisuals[0];
  const [selectedType, setSelectedType] =
    useState<VerifiedDataVisualType | undefined>(initialType);
  const [verified, setVerified] = useState(
    originalBlock.type !== "data-visual-source" && Boolean(sourceBlock),
  );
  const previewVerifiedAt = useRef(new Date().toISOString()).current;
  const draft = useMemo(
    () =>
      sourceBlock && selectedType
        ? createVerifiedDataVisual(
            sourceBlock,
            selectedType,
            previewVerifiedAt,
          )
        : undefined,
    [previewVerifiedAt, selectedType, sourceBlock],
  );

  useEffect(() => {
    if (draft) {
      onPreview(draft);
    }
  }, [draft, onPreview]);

  if (originalBlock.type === "visual-placeholder") {
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
          <Body1Strong block>Coded data visual unavailable</Body1Strong>
          <Body1 block>
            This manuscript instruction does not contain verified structured
            values. Add the approved data to the Word source and re-import it;
            the Studio will not recreate values from pixels or sample content.
          </Body1>
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

  if (!sourceBlock) {
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

  return (
    <div className={styles.editor}>
      <div>
        <Subtitle1 as="h2" block>
          Convert approved data
        </Subtitle1>
        <Caption1 block>
          Values remain locked to the reviewed Word source.
        </Caption1>
      </div>
      <section className={styles.sourceEvidence}>
        <Body1Strong block>{sourceBlock.data.title}</Body1Strong>
        <Caption1 block>
          {sourceBlock.data.sourceKind === "word-chart"
            ? "Embedded Word chart data"
            : sourceBlock.data.sourceKind === "word-table"
              ? "Structured Word table"
              : sourceBlock.data.sourceKind === "bitmap-ocr"
                ? "Previously verified bitmap data"
                : "Verified structured data"}{" "}
          · {sourceBlock.data.sha256.slice(0, 12)}
        </Caption1>
        {sourceBlock.data.evidenceImage ? (
          <figure className={styles.sourceEvidenceImage}>
            <Image
              alt={`Original source bitmap: ${sourceBlock.data.evidenceImage.fileName}`}
              height={sourceBlock.data.evidenceImage.height}
              src={sourceBlock.data.evidenceImage.dataUrl}
              unoptimized
              width={sourceBlock.data.evidenceImage.width}
            />
            <figcaption>
              Original approved bitmap retained as evidence ·{" "}
              {sourceBlock.data.evidenceImage.sourceAssetSha256.slice(0, 12)}
            </figcaption>
          </figure>
        ) : null}
        <div className={styles.sourceEvidenceTable}>
          <table>
            <thead>
              <tr>
                {sourceBlock.data.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sourceBlock.data.rows.map((row) => (
                <tr key={row.id}>
                  {row.cells.map((cell, index) => (
                    <td key={index}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {compatibleVisuals.length > 0 ? (
        <fieldset className={styles.optionGroup}>
          <legend>On-brand treatment</legend>
          {compatibleVisuals.map((type) => (
            <label key={type}>
              <input
                checked={selectedType === type}
                name={`${sourceBlock.id}-visual-type`}
                onChange={() => {
                  setSelectedType(type);
                  setVerified(false);
                }}
                type="radio"
              />
              <span>
                <Body1Strong block>{verifiedDataVisualName(type)}</Body1Strong>
                <Caption1 block>
                  Uses the exact labels, ordering, and values shown above.
                </Caption1>
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
        <section className={styles.integrityNotice}>
          <Body1Strong block>No safe visual mapping</Body1Strong>
          <Body1 block>
            The approved table shape or values do not match a supported Glint
            Labs data component. The source table will remain unchanged.
          </Body1>
        </section>
      )}
      {selectedType ? (
        <label className={styles.verificationCheck}>
          <input
            checked={verified}
            onChange={(event) => setVerified(event.target.checked)}
            type="checkbox"
          />
          <span>
            <Body1Strong block>I verified the structured source</Body1Strong>
            <Caption1 block>
              The title, labels, order, values, units, and precision match the
              approved Word content shown above.
            </Caption1>
          </span>
        </label>
      ) : null}

      <div className={styles.editorActions}>
        <button
          className={styles.secondaryAction}
          onClick={() => onCancel(originalBlock)}
          type="button"
        >
          Cancel
        </button>
        <button
          className={styles.primaryAction}
          disabled={!draft || !verified}
          onClick={() =>
            draft &&
            verified &&
            onDone({
              ...draft,
              verifiedSource: {
                ...draft.verifiedSource!,
                verifiedAt: new Date().toISOString(),
              },
            })
          }
          type="button"
        >
          Use coded visual
        </button>
      </div>
      {originalBlock.source.part === "studio" ? (
        <button className={styles.dangerAction} onClick={onRemove} type="button">
          Delete component
        </button>
      ) : null}
    </div>
  );
}

export function PublishingStudio() {
  const [state, dispatch] = useReducer(reducer, { status: "empty" });
  const importVersionRef = useRef(0);
  const [hasUnappliedImageChanges, setHasUnappliedImageChanges] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>();
  const [selectedBlockId, setSelectedBlockId] = useState<string>();
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
  const [reportStyle, setReportStyle] =
    useState<ReportStyle>(DEFAULT_STUDIO_REPORT_STYLE);
  const [removedBlocks, setRemovedBlocks] = useState<RemovedBlock[]>([]);
  const [isUndoVisible, setIsUndoVisible] = useState(false);
  const [currentProject, setCurrentProject] = useState<StudioProject>();
  const [imageReviews, setImageReviews] = useState<PublicationImageReview[]>([]);
  const [imageAttention, setImageAttention] = useState<{ blockId: string; attempt: number; message: string }>();
  const [packageProject, setPackageProject] = useState<StudioProject>();
  const [savedProjects, setSavedProjects] = useState<StudioProject[]>([]);
  const [storageMessage, setStorageMessage] = useState<string>();
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
  const documentMenuRef = useRef<HTMLDetailsElement>(null);
  const publishActionRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const reportSurfaceRef = useRef<HTMLIFrameElement>(null);
  const reportCanvasWidth =
    reportViewports.find((viewport) => viewport.id === reportViewport)?.width ??
    availableCanvasWidth;
  const reportCanvasHeight =
    reportViewports.find((viewport) => viewport.id === reportViewport)?.height ??
    availableCanvasHeight;
  const closeDocumentMenuForPreview = useCallback(() => {
    documentMenuRef.current?.removeAttribute("open");
  }, []);
  const previewVisual = useCallback(
    (block: ReportBlock) => dispatch({ type: "preview-block", block }),
    [],
  );

  const manifest = state.status === "ready" ? state.manifest : undefined;
  const hasProjectChanges = useMemo(
    () => state.status === "ready" && hasStudioProjectChanges(
      { manifest: state.manifest, reportStyle, acceptedReviewItemIds, imageReviews },
      currentProject ?? {
        manifest: state.result.manifest,
        reportStyle: state.initialReportStyle,
        acceptedReviewItemIds: [],
        imageReviews: [],
      },
    ),
    [state, reportStyle, acceptedReviewItemIds, imageReviews, currentProject],
  );
  const hasUnsavedEdits = hasUnappliedImageChanges || hasProjectChanges;
  const hasUnsavedChanges = hasUnsavedEdits || (!!manifest && !currentProject);
  const selectedBlock = manifest?.blocks.find(
    (block) => block.id === selectedBlockId,
  );
  const displayManifest = useMemo(() => manifest ? {
    ...manifest,
    blocks: manifest.blocks.map((block) => {
      if (block.type !== "image") return block;
      const review = imageReviews.find((item) => item.blockId === block.id);
      return applyImageReview(block, review && block.id === selectedBlockId
        ? { ...review, description: block.alt } : review);
    }),
  } : undefined, [manifest, imageReviews, selectedBlockId]);
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
        block.type !== "horizontal-bar-chart" &&
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
  const verifiedDataVisualCount = dataVisualStatuses.filter(
    (visual) => visual.status === "verified",
  ).length;
  const dataVisualsNeedingReview = dataVisualStatuses.filter(
    (visual) => visual.status === "review-required",
  );
  const removeBlock = useCallback(
    (blockId: string) => {
      if (!manifest || manifest.blocks.length <= 1) {
        return;
      }

      const result = removeReportBlock(manifest, blockId);
      if (!result.removed || result.removed.block.source.part !== "studio") {
        return;
      }
      const removed = result.removed;

      if (
        (removed.block.type === "image" || isVisualBlock(removed.block)) &&
        !window.confirm(
          "Delete this component and its content? You can undo this action for a short time.",
        )
      ) {
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

    return manifest.reviewItems
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
  }, [manifest]);
  const acceptedIssueIds = useMemo(
    () => new Set(acceptedReviewItemIds),
    [acceptedReviewItemIds],
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
    function closeDocumentMenu(event: PointerEvent) {
      const menu = documentMenuRef.current;
      if (menu?.open && !menu.contains(event.target as Node)) {
        menu.removeAttribute("open");
      }
    }

    function closeDocumentMenuWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && documentMenuRef.current?.open) {
        documentMenuRef.current.removeAttribute("open");
        documentMenuRef.current.querySelector("summary")?.focus();
      }
    }

    document.addEventListener("pointerdown", closeDocumentMenu);
    document.addEventListener("keydown", closeDocumentMenuWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeDocumentMenu);
      document.removeEventListener("keydown", closeDocumentMenuWithEscape);
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
        observedCanvas.clientHeight - (reportViewport === "full-width" ? 0 : 80),
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
    documentMenuRef.current?.removeAttribute("open");
    dispatch({ type: "extract", fileName: file.name });
    setActiveTool(undefined);
    setSelectedBlockId(undefined);
    setPendingImageBlockId(undefined);
    setHighlightedBlockId(undefined);
    setRemovedBlocks([]);
    setIsUndoVisible(false);
    setCurrentProject(undefined);
    setImageReviews([]);
    setImageAttention(undefined);
    setStorageMessage(undefined);
    setAcceptedReviewItemIds([]);
    try {
      const [{ extractDocx }, bytes] = await Promise.all([
        import("../../extraction/extract-docx.ts"), file.arrayBuffer(),
      ]);
      if (version !== importVersionRef.current) return;
      const result = await extractDocx(file.name, bytes);
      if (version !== importVersionRef.current) return;
      dispatch({ type: "complete", result, reportStyle });
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
    homeDialogRef.current?.close();
    documentMenuRef.current?.removeAttribute("open");
    dispatch({ type: "reset" });
    setActiveTool(undefined);
    setSelectedBlockId(undefined);
    setPendingImageBlockId(undefined);
    setHighlightedBlockId(undefined);
    setCurrentProject(undefined);
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
      canvasRef.current?.querySelector<HTMLInputElement>('input[name="word-report"]')?.focus();
    });
  }

  function goHome() {
    if (!requireAppliedEdits()) return;
    if (!hasUnsavedChanges) {
      returnToStart();
      return;
    }
    setHomeNavigationError(undefined);
    homeDialogRef.current?.showModal();
  }

  async function saveAndGoHome() {
    setIsSavingToLeave(true);
    setHomeNavigationError(undefined);
    const project = await saveCurrentProject();
    setIsSavingToLeave(false);
    if (project) {
      returnToStart();
    } else {
      setHomeNavigationError(
        "Your changes weren't saved. Try again, or choose Leave without saving.",
      );
    }
  }

  async function saveCurrentProject() {
    if (!requireAppliedEdits()) return;
    if (!manifest || state.status !== "ready") {
      return;
    }

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
            imageReviews,
          })
        : createStudioProject({
            importedManifestSha256: state.result.manifestSha256,
            manifest,
            reportStyle,
            status: canPublish ? "ready" : "draft",
            acceptedReviewItemIds: activeAcceptedIds,
            approvedContent: state.result.approvedContent,
            publicationSourceEvidence: state.result.publicationSourceEvidence,
            imageReviews,
          });
      const storage = new BrowserProjectStorage(window.localStorage);
      await storage.save(project);
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
    }
  }

  async function showPackageDialog() {
    if (state.status !== "ready" || !manifest) {
      return;
    }
    if (!requireAppliedEdits()) return;
    const unfinishedImage = manifest.blocks.find((block) => block.type === "image" &&
      needsImageDescription(imageReviews.find((review) => review.blockId === block.id)?.description ?? block.alt));
    if (unfinishedImage) {
      selectBlock(unfinishedImage.id);
      setImageAttention((current) => ({
        blockId: unfinishedImage.id, attempt: (current?.attempt ?? 0) + 1,
        message: "Add a description, then choose Apply before publishing.",
      }));
      reportSurfaceRef.current?.contentDocument?.getElementById(`report-block-${unfinishedImage.id}`)?.scrollIntoView({ block: "center" });
      return;
    }
    try {
      const project = currentProject
        ? updateStudioProject(currentProject, {
            manifest,
            reportStyle,
            status: currentProject.status,
            acceptedReviewItemIds,
            approvedContent: state.result.approvedContent,
            publicationSourceEvidence: state.result.publicationSourceEvidence,
            imageReviews,
          })
        : createStudioProject({
            importedManifestSha256: state.result.manifestSha256,
            manifest,
            reportStyle,
            status: "draft",
            acceptedReviewItemIds,
            approvedContent: state.result.approvedContent,
            publicationSourceEvidence: state.result.publicationSourceEvidence,
            imageReviews,
          });
      const storage = new BrowserProjectStorage(window.localStorage);
      await storage.save(project);
      setCurrentProject(project);
      setSavedProjects(await storage.list());
      setPackageProject(project);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : "The package draft could not be opened. Try saving the report again.");
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
    });
    const storage = new BrowserProjectStorage(window.localStorage);
    await storage.save(project);
    setCurrentProject(project);
    setImageReviews(studioImageReviews(project));
    setPackageProject(project);
    setSavedProjects(await storage.list());
  }

  function loadProject(project: StudioProject) {
    if (!requireAppliedEdits()) return false;
    if (
      hasUnsavedChanges &&
      !window.confirm(
        "Open this saved project? Any unsaved changes to the current report will be lost.",
      )
    ) {
      return false;
    }
    importVersionRef.current++;
    documentMenuRef.current?.removeAttribute("open");
    dispatch({ type: "load-project", project });
    setCurrentProject(project);
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
    setStorageMessage(`Opened ${project.manifest.metadata.title}.`);
    window.requestAnimationFrame(() =>
      documentMenuRef.current?.querySelector("summary")?.focus(),
    );
    return true;
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

  function savedProjectList() {
    return (
      <ul aria-label="Saved drafts" className={styles.documentMenuList}>
        {savedProjects.map((project) => (
          <li key={project.id}>
            <button
              aria-current={currentProject?.id === project.id ? "true" : undefined}
              onClick={() => loadProject(project)}
              type="button"
            >
              <DocumentText24Regular aria-hidden="true" />
              <span>
                <Body1Strong block>{project.manifest.metadata.title}</Body1Strong>
                <Caption1 block>
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(project.updatedAt))}
                </Caption1>
              </span>
              {currentProject?.id === project.id ? <Checkmark16Regular aria-hidden="true" /> : null}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  const selectBlock = useCallback((blockId: string) => {
    const block = manifest?.blocks.find((item) => item.id === blockId);
    if (!block) {
      return false;
    }
    if (
      selectedBlockId &&
      selectedBlockId !== blockId &&
      !window.confirm(
        "Close the current editor? Any unapplied changes will be discarded.",
      )
    ) {
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

  function changeTool(tool?: Tool) {
    if (
      selectedBlockId &&
      !window.confirm(
        "Close the current editor? Any unapplied changes will be discarded.",
      )
    ) {
      return;
    }
    if (pendingImageBlockId) {
      dispatch({ type: "remove-block", blockId: pendingImageBlockId });
      setPendingImageBlockId(undefined);
    }
    setSelectedBlockId(undefined);
    setActiveTool(tool);
  }

  function requireAppliedEdits() {
    if (!selectedBlockId) return true;
    setStorageMessage("Apply or cancel your current edits before saving, leaving Studio, or publishing.");
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

  function panelContent() {
    if (!activeTool) {
      return null;
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
                    onClick={() => highlightIssue(issue.blockId)}
                    type="button"
                  >
                    <Body1Strong block>{issue.label}</Body1Strong>
                    <Caption1 block>
                      {issue.blockId
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
      return (
        <PanelShell
          closable={!selectedBlock || !isVisualBlock(selectedBlock)}
          onClose={() => changeTool(undefined)}
          title="Visuals"
        >
          {selectedBlock && isVisualBlock(selectedBlock) ? (
            <VisualEditor
              block={selectedBlock}
              key={selectedBlock.id}
              onDone={(block) => {
                dispatch({ type: "change-block", block });
                setSelectedBlockId(undefined);
                setActiveTool(undefined);
              }}
              onCancel={(originalBlock) => {
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
              }}
              onChooseImage={(block) => {
                dispatch({ type: "preview-block", block });
                setPendingImageBlockId(block.id);
                setSelectedBlockId(block.id);
                setActiveTool("document");
              }}
              onRemove={removeSelectedBlock}
              onPreview={previewVisual}
            />
          ) : (
            <div className={styles.panelSection}>
              <section className={styles.documentStatus}>
                <Body1Strong block>Data visual status</Body1Strong>
                <dl className={styles.documentStatusList}>
                  <div>
                    <dt>Verified</dt>
                    <dd className={styles.statusPositive}>
                      {verifiedDataVisualCount}
                    </dd>
                  </div>
                  <div>
                    <dt>Needs review</dt>
                    <dd
                      className={
                        dataVisualsNeedingReview.length === 0
                          ? styles.statusPositive
                          : styles.statusWarning
                      }
                    >
                      {dataVisualsNeedingReview.length}
                    </dd>
                  </div>
                </dl>
                <Caption1 block>
                  Guided Word charts and tables are verified automatically when
                  their structure matches the requested Glint Labs visual.
                </Caption1>
              </section>
              {dataVisualsNeedingReview.length > 0 ? (
                <>
                  <Body1Strong block>Needs review</Body1Strong>
                  {dataVisualsNeedingReview.map((visual) => (
                    <button
                      className={styles.secondaryAction}
                      key={visual.id}
                      onClick={() => selectBlock(visual.id)}
                      type="button"
                    >
                      Review {visual.title}
                    </button>
                  ))}
                </>
              ) : dataVisualStatuses.length > 0 ? (
                <Body1 block>
                  No chart-by-chart confirmation is needed. Publishing will
                  flag a visual only if its source becomes ambiguous or no
                  longer matches.
                </Body1>
              ) : (
                <Body1 block>
                  This report does not contain structured data visuals.
                </Body1>
              )}
            </div>
          )}
        </PanelShell>
      );
    }

    return null;
  }

  return (
    <section
      aria-label="Publishing Studio"
      className={`${styles.shell} ${manifest ? styles.reportLoaded : ""}`}
    >
      <header
        className={`${styles.topBar} ${manifest ? styles.reportLoaded : ""}`}
      >
        <div className={styles.identity}>
          <button
            aria-label="Back to home"
            className={styles.homeAction}
            onClick={goHome}
            title="Back to home"
            type="button"
          >
            <Home20Regular aria-hidden="true" />
          </button>
          {manifest ? (
            <details className={styles.documentMenu} ref={documentMenuRef}>
              <summary
                className={styles.documentTrigger}
                title={manifest.source.fileName}
              >
                <span>{manifest.source.fileName}</span>
                <ChevronDown16Regular aria-hidden="true" />
              </summary>
              <div className={styles.documentMenuPopover}>
                <div className={styles.documentMenuHeading}>
                  <Body1Strong block>Recent documents</Body1Strong>
                  <Caption1 block>Saved in this browser</Caption1>
                </div>
                {savedProjects.length > 0 ? (
                  savedProjectList()
                ) : (
                  <Caption1 className={styles.documentMenuEmpty}>
                    No saved documents yet
                  </Caption1>
                )}
                <div className={styles.documentMenuUpload}>
                  <label className={styles.publishingStyleField}>
                    <Body1Strong>Publishing style</Body1Strong>
                    <select
                      onChange={(event) =>
                        setReportStyle(event.target.value as ReportStyle)
                      }
                      value={reportStyle}
                    >
                      {reportStyle !== DEFAULT_STUDIO_REPORT_STYLE ? (
                        <option hidden disabled value={reportStyle}>
                          {reportStyleLabel(reportStyle)}
                        </option>
                      ) : null}
                      {selectableReportStyleOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <FilePicker
                    disabled={state.status === "extracting"}
                    label="Upload new document"
                    onChange={handleFile}
                  />
                </div>
              </div>
            </details>
          ) : null}
          {hasUnsavedEdits ? (
            <Caption1 className={styles.dirtyStatus} role="status">Unsaved changes</Caption1>
          ) : null}
        </div>
        {manifest ? (
          <div
            aria-label="Report viewport"
            className={styles.viewportSwitcher}
            role="group"
          >
            {reportViewports.map((viewport) => (
              <button
                aria-label={viewport.label}
                aria-pressed={reportViewport === viewport.id}
                key={viewport.id}
                onClick={() => setReportViewport(viewport.id)}
                title={viewport.width ? `${viewport.label} (${viewport.width} × ${viewport.height})` : viewport.label}
                type="button"
              >
                <ReportViewportIcon viewport={viewport.id} />
              </button>
            ))}
          </div>
        ) : null}
        <div className={styles.reportStatus}>
          {manifest ? (
            <>
              {dataVisualsNeedingReview.length > 0 ? (
                <button
                  aria-pressed={activeTool === "visuals"}
                  className={styles.contextualAction}
                  onClick={() =>
                    changeTool(
                      activeTool === "visuals" ? undefined : "visuals",
                    )
                  }
                  type="button"
                >
                  <span className={styles.fullActionLabel}>
                    {dataVisualsNeedingReview.length}{" "}
                    {dataVisualsNeedingReview.length === 1
                      ? "visual needs review"
                      : "visuals need review"}
                  </span>
                  <span className={styles.compactActionLabel}>
                    {dataVisualsNeedingReview.length}{" "}
                    {dataVisualsNeedingReview.length === 1
                      ? "visual"
                      : "visuals"}
                  </span>
                </button>
              ) : null}
              {openIssues.length > 0 ? (
                <button
                  aria-pressed={activeTool === "issues"}
                  className={`${styles.contextualAction} ${styles.issueAction}`}
                  onClick={() =>
                    changeTool(activeTool === "issues" ? undefined : "issues")
                  }
                  type="button"
                >
                  <span>
                    {openIssues.length}{" "}
                    {openIssues.length === 1 ? "issue" : "issues"}
                  </span>
                </button>
              ) : null}
              <button
                className={styles.secondaryTopAction}
                onClick={() => void saveCurrentProject()}
                type="button"
              >
                Save
              </button>
              <button
                className={styles.publishAction}
                onClick={showPackageDialog}
                ref={publishActionRef}
                type="button"
              >
                Publish to Glint Labs
              </button>
              {integrity?.status === "unverified" ? (
                <span className={styles.integrityStatus}>
                  Unverified source
                </span>
              ) : blockingIssues.length > 0 ? (
                <span className={styles.integrityStatus}>
                  Resolve blockers
                </span>
              ) : null}
            </>
          ) : (
            <Caption1>FHL prototype</Caption1>
          )}
        </div>
      </header>

      {packageProject ? (
        <PublicationPackageLoader
          onClose={() => setPackageProject(undefined)}
          onSave={savePackagePreparation}
          project={packageProject}
        />
      ) : null}

      <dialog
        aria-describedby="leave-studio-description"
        aria-labelledby="leave-studio-title"
        className={`${styles.publishDialog} ${styles.leaveDialog}`}
        onCancel={(event) => {
          if (isSavingToLeave) event.preventDefault();
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
              onClick={() => homeDialogRef.current?.close()}
              type="button"
            >
              Cancel
            </button>
            <button
              className={`${styles.secondaryAction} ${styles.leaveWithoutSaving}`}
              disabled={isSavingToLeave}
              onClick={returnToStart}
              type="button"
            >
              Leave without saving
            </button>
            <button
              className={styles.primaryAction}
              disabled={isSavingToLeave}
              onClick={() => void saveAndGoHome()}
              type="button"
            >
              {isSavingToLeave ? "Saving..." : "Save and leave"}
            </button>
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
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
        }`}
      >
        {panelContent()}

        <main className={styles.canvas} id="main-content" ref={canvasRef}>
          {storageMessage ? (
            <div className={styles.storageMessage} role="status">
              <Body1>{storageMessage}</Body1>
              <button
                aria-label="Dismiss save message"
                onClick={() => setStorageMessage(undefined)}
                type="button"
              >
                <Dismiss20Regular aria-hidden="true" />
              </button>
            </div>
          ) : null}
          {state.status === "empty" ? (
            <div className={styles.startScreen}>
              <div className={styles.startCard}>
                <Image
                  alt=""
                  className={styles.startIllustration}
                  height={146}
                  priority
                  src="/figma/illustrations/blue/create.png"
                  width={146}
                />
                <div className={styles.startCardContent}>
                  <div className={styles.startCardCopy}>
                    <Subtitle1 as="h1" block>
                      Publish a report to Glint Labs
                    </Subtitle1>
                  </div>
                  <div className={styles.startCardActions}>
                    <FilePicker label="Choose Word file" onChange={handleFile} />
                    {savedProjects.length > 0 ? (
                      <details className={styles.savedDrafts} ref={documentMenuRef}>
                        <summary className={styles.documentTrigger}>
                          <span>Open saved draft</span>
                          <ChevronDown16Regular aria-hidden="true" />
                        </summary>
                        <Caption1 block>Saved only in this browser on this device.</Caption1>
                        {savedProjectList()}
                      </details>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

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

          {manifest ? (
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
                    onSelectBlock={selectBlock}
                    reportStyle={reportStyle}
                    selectedBlockId={selectedBlockId}
                    previewViewport
                  />
                </StudioReportViewport>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </section>
  );
}
