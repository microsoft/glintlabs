"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { preparePublicationPackage, publicationReadiness } from "../../../project/publication-package.ts";
import {
  publicationMetadataSchema, type PublicationPreparation,
} from "../../../project/publication-preparation.ts";
import {
  publicationCardBadge,
  publicationDetailsIssues,
  needsImageDescription, PUBLICATION_SUMMARY_MAX_LENGTH, suggestedPublicationSlug, suggestedPublicationSummary, type PublicationMetadataDraft,
} from "../../../project/publication-flow.ts";
import { studioImageReviews, type StudioProject } from "../../../project/studio-project.ts";
import { estimateReportReadingTime } from "../../../project/report-reading-time.ts";
import { reportAuthor } from "../../../project/report-author.ts";
import { isRetiredIllustration, publicationIllustrations } from "../../../publishing/featured-illustrations.ts";
import {
  websiteResponse, WebsiteRequestError, websiteStageSchema, websiteUpdateSchema, type WebsiteStage, type WebsiteUpdate,
} from "../../../project/website-publishing.ts";
import { OwnerAccessPanel } from "./owner-access-panel";
import { StudyCard } from "../../_components/study-card";
import studioStyles from "../../_components/publishing-studio.module.css";
import styles from "./publication-package-dialog.module.css";

type Operation = "saving" | "preparing" | "publishing" | "unlocking" | "locking";
type WebsiteAction = "preview" | "publish";

async function readOwnerAccess(signal?: AbortSignal) {
  const response = await fetch("/api/studio/owner", { cache: "no-store", signal });
  if (response.status !== 204 && response.status !== 401) {
    throw new Error("Publishing access couldn't be checked. Try Preview report or Publish report to check again.");
  }
  return {
    authorized: response.status === 204,
    keyRequired: response.headers.get("X-Glint-Labs-Owner-Key-Required") !== "false",
  };
}

function initialMetadata(project: StudioProject): PublicationMetadataDraft {
  const readTimeMinutes = estimateReportReadingTime(project.manifest);
  const eyebrow = "Research Drop";
  if (project.publicationPreparation) {
    const metadata = { ...project.publicationPreparation.metadata, readTimeMinutes, eyebrow };
    const illustration = publicationIllustrations.find(image => image.src === metadata.thumbnail.source);
    return illustration && needsImageDescription(metadata.thumbnail.alt)
      ? { ...metadata, thumbnail: { ...metadata.thumbnail, alt: illustration.description } }
      : metadata;
  }
  const manifest = project.manifest;
  const date = manifest.metadata.publishedDate ? new Date(manifest.metadata.publishedDate) : undefined;
  return {
    slug: suggestedPublicationSlug(manifest.metadata.title.replace(/^research drop\s*:\s*/i, "")),
    title: manifest.metadata.title.replace(/^research drop\s*:\s*/i, ""),
    summary: "", eyebrow,
    displayDate: date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : "",
    author: reportAuthor(manifest),
    readTimeMinutes, topics: manifest.metadata.topics ?? [],
    thumbnail: { source: "", alt: "" },
    catalog: { featured: false, featuredUntil: null },
  };
}

function DetailField({ name, label, hint, error, wide, required = true, children }: {
  name: string; label: string; hint?: string; error?: string; wide?: boolean; required?: boolean; children: ReactNode;
}) {
  return <div className={`${styles.field} ${wide ? styles.wide : ""}`}>
    <label htmlFor={name}>{label}{required ? <><span aria-hidden="true"> *</span><span className={styles.srOnly}> (required)</span></> : null}</label>
    {children}
    {hint ? <small id={`${name}-hint`}>{hint}</small> : null}
    {error ? <small className={styles.fieldError} id={`${name}-error`}>{error}</small> : null}
  </div>;
}

export function PublicationPackageDialog({ project, onSave, onClose }: {
  project: StudioProject;
  onSave: (preparation: PublicationPreparation) => Promise<void>;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const publishedHeadingRef = useRef<HTMLHeadingElement>(null);
  const previewButtonRef = useRef<HTMLButtonElement>(null);
  const previewLinkRef = useRef<HTMLAnchorElement>(null);
  const publishButtonRef = useRef<HTMLButtonElement>(null);
  const pendingFocusRef = useRef<WebsiteAction | undefined>(undefined);
  const errorRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const summaryButtonRef = useRef<HTMLButtonElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const preparingRef = useRef(false);
  const changeVersionRef = useRef(0);
  const [metadata, setMetadata] = useState<PublicationMetadataDraft>(() => initialMetadata(project));
  const [summarySuggestion, setSummarySuggestion] = useState<string | null>();
  const [employeeCountInput, setEmployeeCountInput] = useState(() =>
    project.publicationPreparation?.metadata.employeeCount?.toString() ?? "");
  const imageReviews = studioImageReviews(project);
  const [attemptedDetails, setAttemptedDetails] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [operation, setOperation] = useState<Operation>();
  const [unsaved, setUnsaved] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [errorHeading, setErrorHeading] = useState("We couldn't finish that step");
  const [addressEdited, setAddressEdited] = useState(Boolean(project.publicationPreparation));
  const [ownerAccess, setOwnerAccess] = useState<boolean>();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [ownerKeyRequired, setOwnerKeyRequired] = useState(true);
  const [unlockAction, setUnlockAction] = useState<WebsiteAction>();
  const [unlockError, setUnlockError] = useState<string>();
  const [unlockNotice, setUnlockNotice] = useState<string>();
  const [websiteStage, setWebsiteStage] = useState<WebsiteStage>();
  const [websiteUpdate, setWebsiteUpdate] = useState<WebsiteUpdate>();
  const selectedIllustration = publicationIllustrations.find(image => image.src === metadata.thumbnail.source);
  const readiness = publicationReadiness(project, metadata, imageReviews);
  const detailsIssues = publicationDetailsIssues(metadata);
  if (metadata.thumbnail.source && !selectedIllustration && !detailsIssues.some(issue => issue.field === "thumbnail.source")) {
    detailsIssues.push({ field: "thumbnail.source", message: "Choose an illustration from the new Glint Labs set." });
  }
  const sourceIssues = readiness.filter(issue => !detailsIssues.some(detail => detail.field === issue.field));
  const busy = operation !== undefined;
  const slugSuggestion = suggestedPublicationSlug(metadata.title);

  useEffect(() => {
    if (summarySuggestion !== undefined) {
      suggestionRef.current?.scrollIntoView({ block: "nearest" });
      suggestionRef.current?.focus({ preventScroll: true });
    }
  }, [summarySuggestion]);
  useEffect(() => {
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    dialogRef.current?.showModal();
    titleRef.current?.focus({ preventScroll: true });
    return () => { root.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void readOwnerAccess(controller.signal).then(access => {
      if (controller.signal.aborted) return;
      setOwnerAccess(access.authorized); setOwnerKeyRequired(access.keyRequired);
    }).catch(failure => {
      if (controller.signal.aborted) return;
      setErrorHeading("Publishing access couldn't be checked");
      setError(failure instanceof Error ? failure.message : "Check your connection, then try Preview report or Publish report again.");
    }).finally(() => { if (!controller.signal.aborted) setCheckingAccess(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!busy && !unlockAction && pendingFocusRef.current) {
      const target = pendingFocusRef.current === "preview" ? previewLinkRef.current ?? previewButtonRef.current : publishButtonRef.current;
      target?.focus({ preventScroll: true });
      pendingFocusRef.current = undefined;
    }
  }, [busy, unlockAction, websiteStage]);
  useEffect(() => {
    if (websiteUpdate) {
      bodyRef.current?.scrollTo({ top: 0 });
      publishedHeadingRef.current?.focus({ preventScroll: true });
    }
  }, [websiteUpdate]);
  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ block: "nearest" });
      errorRef.current?.focus({ preventScroll: true });
    }
  }, [error]);
  useEffect(() => {
    if (validationAttempt > 0) {
      const field = bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled), [data-blocker="true"]');
      field?.scrollIntoView({ block: "center" });
      field?.focus({ preventScroll: true });
    }
  }, [validationAttempt]);
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  function requestClose() {
    if (busy || preparingRef.current) return;
    if (unsaved && !window.confirm("Close without saving these changes? Your Word file and previously saved draft will be kept.")) return;
    dialogRef.current?.close();
  }

  function invalidateWebsiteStage() {
    setWebsiteStage(undefined); setWebsiteUpdate(undefined);
  }

  function preparationChanged() {
    changeVersionRef.current++;
    setUnlockAction(undefined); setUnlockError(undefined); setUnlockNotice(undefined);
    pendingFocusRef.current = undefined;
    setUnsaved(true); setMessage(undefined); setError(undefined); invalidateWebsiteStage();
  }

  function changeMetadata(next: PublicationMetadataDraft) {
    preparationChanged(); setMetadata(next);
  }

  function changeEmployeeCount(value: string) {
    setEmployeeCountInput(value);
    changeMetadata({
      ...metadata,
      employeeCount: value === "" ? undefined : /^\d+$/.test(value) ? Number(value) : Number.NaN,
    });
  }

  function requireDetails() {
    if (detailsIssues.length === 0) return true;
    setAttemptedDetails(true); setValidationAttempt(attempt => attempt + 1);
    return false;
  }

  function requireReady() {
    if (!requireDetails()) return false;
    if (readiness.length === 0) return true;
    setValidationAttempt(attempt => attempt + 1);
    return false;
  }

  async function persist(preparation: PublicationPreparation) {
    const version = changeVersionRef.current;
    await onSave(preparation);
    if (changeVersionRef.current === version) setUnsaved(false);
  }

  async function savePreparation() {
    if (preparingRef.current || !requireDetails()) return false;
    preparingRef.current = true; setOperation("saving"); setError(undefined);
    try {
      await persist({
        metadata: publicationMetadataSchema.parse(metadata), imageReviews,
        lastPackage: project.publicationPreparation?.lastPackage,
      });
      setMessage("Draft saved on this device. Nothing was published.");
      return true;
    } catch (failure) {
      setErrorHeading("Your draft couldn't be saved");
      setError(failure instanceof Error ? failure.message : "The draft couldn't be saved. Try saving again.");
      return false;
    } finally { preparingRef.current = false; setOperation(undefined); }
  }

  async function readAsset(source: string) {
    const response = await fetch(source, { redirect: "error" });
    if (!response.ok) throw new Error("The image couldn't be loaded. Choose another image and try again.");
    return { bytes: new Uint8Array(await response.arrayBuffer()), mimeType: response.headers.get("content-type") ?? "" };
  }

  async function stageOnWebsite() {
    if (websiteStage) return websiteStage;
    const result = await preparePublicationPackage({ project, metadata, imageReviews, readAsset });
    const staged = websiteStageSchema.parse(await websiteResponse(await fetch("/api/studio/stage", {
      method: "POST", headers: { "Content-Type": "application/zip" },
      body: new Blob([Uint8Array.from(result.zipBytes).buffer], { type: "application/zip" }),
    })));
    await persist(result.preparation);
    setWebsiteStage(staged);
    return staged;
  }

  function requestUnlock(action: WebsiteAction, notice?: string) {
    setError(undefined); setMessage(undefined);
    setUnlockError(undefined); setUnlockNotice(notice); setUnlockAction(action);
  }

  function cancelUnlock() {
    pendingFocusRef.current = unlockAction;
    setUnlockAction(undefined); setUnlockError(undefined); setUnlockNotice(undefined);
  }

  async function runWebsiteAction(action: WebsiteAction) {
    if (busy || checkingAccess || preparingRef.current || !requireReady()) return;
    if (ownerAccess === false) { requestUnlock(action); return; }
    preparingRef.current = true;
    setOperation(action === "preview" ? "preparing" : "publishing");
    setError(undefined); setMessage(undefined);
    let previewWindow: Window | null = null;
    try {
      if (action === "preview" && ownerAccess === true) {
        previewWindow = window.open("about:blank", "_blank");
        if (previewWindow) {
          previewWindow.opener = null;
          previewWindow.document.title = "Preparing report preview";
          previewWindow.document.body.textContent = "Preparing your report preview...";
        }
      }
      if (ownerAccess === undefined) {
        const access = await readOwnerAccess();
        setOwnerAccess(access.authorized); setOwnerKeyRequired(access.keyRequired);
        if (!access.authorized) { requestUnlock(action); return; }
      }
      const staged = await stageOnWebsite();
      if (action === "preview") {
        if (previewWindow && !previewWindow.closed) previewWindow.location.href = new URL(staged.previewPath, window.location.origin).href;
        pendingFocusRef.current = "preview";
        setMessage(previewWindow && !previewWindow.closed
          ? "Preview opened in a new tab. Nothing was published."
          : "Your preview is ready. Choose Preview report to open it in a new tab.");
        return;
      }
      const published = websiteUpdateSchema.parse(await websiteResponse(await fetch("/api/studio/approve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: staged.reportId, revision: staged.revision,
          packageFingerprint: staged.packageFingerprint, approveForWebsite: true,
        }),
      })));
      setWebsiteUpdate(published);
    } catch (failure) {
      previewWindow?.close();
      if (failure instanceof WebsiteRequestError && failure.status === 401) {
        setOwnerAccess(false);
        requestUnlock(action, "Publishing access has expired. Unlock again to continue. Nothing was published.");
      } else {
        setErrorHeading(action === "preview" ? "Your preview couldn't be prepared" : "Your report couldn't be published");
        setError(failure instanceof Error ? failure.message : "Check your connection and try again.");
      }
    } finally { preparingRef.current = false; setOperation(undefined); }
  }

  async function unlockPublishing(key: string) {
    if (busy || preparingRef.current || !unlockAction || !requireReady()) return;
    const action = unlockAction;
    preparingRef.current = true; setOperation("unlocking"); setUnlockError(undefined); setError(undefined);
    let unlocked = false;
    try {
      await websiteResponse(await fetch("/api/studio/owner", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }),
      }));
      unlocked = true; setOwnerAccess(true); setUnlockAction(undefined); setUnlockNotice(undefined);
      setOperation("preparing");
      await stageOnWebsite();
      pendingFocusRef.current = action;
      setMessage("Publishing is unlocked. You can preview your report or choose Publish report. Nothing was published.");
    } catch (failure) {
      if (!unlocked) {
        setUnlockError(failure instanceof Error ? failure.message : "Publishing couldn't be unlocked. Check your connection and try again.");
      } else if (failure instanceof WebsiteRequestError && failure.status === 401) {
        setOwnerAccess(false);
        requestUnlock(action, "Publishing access couldn't be kept. Allow cookies for this site, then unlock again.");
      } else {
        setErrorHeading("Your preview couldn't be prepared");
        setError(failure instanceof Error ? failure.message : "Publishing is unlocked. Try Preview report or Publish report again.");
      }
    } finally { preparingRef.current = false; setOperation(undefined); }
  }

  async function lockPublishing() {
    if (busy || preparingRef.current) return;
    preparingRef.current = true; setOperation("locking"); setError(undefined);
    try {
      await websiteResponse(await fetch("/api/studio/owner", { method: "DELETE" }));
      setOwnerAccess(false); setWebsiteStage(undefined); setUnlockAction(undefined);
      setMessage("Publishing is locked. Your draft is unchanged.");
    } catch (failure) {
      setErrorHeading("Publishing couldn't be locked");
      setError(failure instanceof Error ? failure.message : "Check your connection and try locking again.");
    } finally { preparingRef.current = false; setOperation(undefined); }
  }

  function detailError(field: string) {
    return attemptedDetails ? detailsIssues.find(issue => issue.field === field)?.message : undefined;
  }
  function inputProps(field: string, name: string, hint = false, required = true) {
    const invalid = detailError(field) !== undefined;
    return { id: name, name, required, "aria-invalid": invalid || undefined,
      "aria-describedby": [hint ? `${name}-hint` : "", invalid ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined };
  }

  const footerHint = busy ? operation === "publishing" ? "Publishing this revision..."
    : operation === "preparing" ? "Preparing your preview..." : operation === "saving" ? "Saving your draft..."
      : operation === "unlocking" ? "Unlocking publishing..."
        : "Locking publishing..."
    : websiteUpdate ? "Published to the test site"
      : checkingAccess ? "Checking publishing access..." : websiteStage ? "Ready to publish to the test site" : unsaved ? ""
      : "Not published to the test site";

  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="package-title"
    onCancel={event => { event.preventDefault(); requestClose(); }} onClose={onClose}>
    <div className={styles.shell}>
      <header className={styles.header}>
        <h2 id="package-title" ref={titleRef} tabIndex={-1}>Publish report</h2>
        <button className={styles.closeButton} aria-label="Close publishing" disabled={busy} onClick={requestClose} type="button">×</button>
      </header>
      <div className={styles.body} ref={bodyRef} aria-busy={busy}>
        {error ? <div className={styles.error} ref={errorRef} role="alert" tabIndex={-1}>
          <strong>{errorHeading}</strong>
          <p>{error}</p>
        </div> : null}
        {message ? <p className={styles.notice} role="status">{message}</p> : null}

        {!websiteUpdate ? <>
        <form id="publication-details" noValidate onSubmit={event => { event.preventDefault(); void runWebsiteAction("preview"); }}>
          <div className={styles.detailsLayout}>
            <fieldset className={styles.fields} disabled={busy}>
              <legend className={styles.srOnly}>Report details</legend>
              <div className={styles.metaGrid}>
                <fieldset className={`${styles.thumbnailPicker} ${styles.wide}`} aria-describedby={detailError("thumbnail.source") ? "publication-thumbnail-error" : undefined}>
                  <legend>Catalog image <span aria-hidden="true">*</span><span className={styles.srOnly}> (required)</span></legend>
                  <div className={styles.thumbnailChoices} role="radiogroup" aria-label="Catalog image" aria-required="true"
                    aria-invalid={detailError("thumbnail.source") !== undefined || undefined} tabIndex={-1}>
                    {publicationIllustrations.map(illustration => <label className={styles.thumbnailChoice} key={illustration.id}>
                      <input className={styles.srOnly} type="radio" name="publication-thumbnail" required
                        value={`illustration:${illustration.id}`} checked={metadata.thumbnail.source === illustration.src}
                        onChange={() => changeMetadata({ ...metadata, thumbnail: { source: illustration.src, alt: illustration.description, presentation: "illustration" } })} />
                      <Image src={illustration.src} unoptimized width={88} height={88} alt="" />
                      <span>{illustration.label}</span>
                    </label>)}
                  </div>
                  {isRetiredIllustration(metadata.thumbnail.source) ? <p className={styles.helper}>
                    This draft uses a retired illustration. Choose one from the new Glint Labs set.
                  </p> : null}
                  {detailError("thumbnail.source") ? <small className={styles.fieldError} id="publication-thumbnail-error">{detailError("thumbnail.source")}</small> : null}
                </fieldset>
                <DetailField name="publication-title" label="Report title" error={detailError("title")} wide>
                  <input {...inputProps("title", "publication-title")} autoComplete="off" value={metadata.title} onChange={event => changeMetadata({
                    ...metadata, title: event.target.value,
                    slug: addressEdited ? metadata.slug : suggestedPublicationSlug(event.target.value),
                  })} />
                </DetailField>
                <DetailField name="publication-summary" label="Short summary" error={detailError("summary")} wide>
                  <textarea {...inputProps("summary", "publication-summary")} rows={2} maxLength={PUBLICATION_SUMMARY_MAX_LENGTH} ref={summaryRef} value={metadata.summary} onChange={event => changeMetadata({ ...metadata, summary: event.target.value })} />
                  <button className={styles.textButton} type="button" ref={summaryButtonRef}
                    aria-expanded={summarySuggestion !== undefined}
                    aria-controls={summarySuggestion !== undefined ? "publication-summary-suggestion" : undefined}
                    onClick={() => setSummarySuggestion(suggestedPublicationSummary(project.manifest) ?? null)}>
                    Suggest summary
                  </button>
                  {summarySuggestion !== undefined ? (
                    <div className={styles.summarySuggestion} id="publication-summary-suggestion"
                      role="region" aria-label="Summary suggestion" aria-describedby="publication-summary-suggestion-text"
                      ref={suggestionRef} tabIndex={-1}>
                      {summarySuggestion ? (
                        <>
                          <small>Excerpt from your report. Review and edit before publishing.</small>
                          <blockquote id="publication-summary-suggestion-text">{summarySuggestion}</blockquote>
                        </>
                      ) : (
                        <small id="publication-summary-suggestion-text">
                          We couldn&apos;t find a suitable excerpt. Write a short summary above (up to {PUBLICATION_SUMMARY_MAX_LENGTH} characters).
                        </small>
                      )}
                      <div className={styles.summarySuggestionActions}>
                        {summarySuggestion ? (
                          <button className={styles.secondaryButton} type="button" onClick={() => {
                            changeMetadata({ ...metadata, summary: summarySuggestion });
                            setSummarySuggestion(undefined);
                            summaryRef.current?.focus({ preventScroll: true });
                          }}>
                            {metadata.summary.trim() ? "Replace summary" : "Use summary"}
                          </button>
                        ) : null}
                        <button className={styles.textButton} type="button" onClick={() => {
                          setSummarySuggestion(undefined);
                          summaryButtonRef.current?.focus({ preventScroll: true });
                        }}>
                          Dismiss suggestion
                        </button>
                      </div>
                    </div>
                  ) : null}
                </DetailField>
              </div>
              <section className={styles.detailsSection} aria-label="Details">
                <div className={styles.metaGrid}>
                <div className={`${styles.cardBadgeFields} ${styles.wide}`}>
                  <DetailField name="publication-date" label="Display date" error={detailError("displayDate")}>
                    <input {...inputProps("displayDate", "publication-date")} type="date" value={metadata.displayDate} onChange={event => changeMetadata({ ...metadata, displayDate: event.target.value })} />
                  </DetailField>
                  <DetailField name="publication-employee-count" label="Employee count" hint="Leave blank to hide" error={detailError("employeeCount")} required={false}>
                    <input {...inputProps("employeeCount", "publication-employee-count", true, false)} autoComplete="off" inputMode="numeric" pattern="[0-9]*"
                      value={employeeCountInput} onChange={event => changeEmployeeCount(event.target.value)} />
                  </DetailField>
                </div>
                <DetailField name="publication-slug" label="Report address" error={detailError("slug")} wide>
                  <div className={styles.addressInput}><span aria-hidden="true">/reports/</span>
                    <input {...inputProps("slug", "publication-slug")} autoComplete="off" spellCheck={false} value={metadata.slug} onChange={event => { setAddressEdited(true); changeMetadata({ ...metadata, slug: event.target.value }); }} />
                  </div>
                  {slugSuggestion && slugSuggestion !== metadata.slug ? <button className={styles.textButton} type="button" onClick={() => { setAddressEdited(true); changeMetadata({ ...metadata, slug: slugSuggestion }); }}>Use suggested address</button> : null}
                </DetailField>
                <div className={`${styles.homepagePlacement} ${styles.wide}`}>
                  <label className={styles.checkbox} htmlFor="publication-featured">
                    <input id="publication-featured" name="publication-featured" type="checkbox" checked={metadata.catalog.featured}
                      onChange={event => changeMetadata({ ...metadata, catalog: { featured: event.target.checked, featuredUntil: event.target.checked ? metadata.catalog.featuredUntil : null } })} />
                    <span>Feature on the homepage</span>
                  </label>
                  <div className={`${styles.field} ${styles.featureUntil}`}>
                    <label htmlFor="publication-featured-until"><span className={styles.srOnly}>Feature </span>Until</label>
                    <input {...inputProps("catalog.featuredUntil", "publication-featured-until", false, false)} disabled={!metadata.catalog.featured} min={metadata.displayDate || undefined} type="date" value={metadata.catalog.featuredUntil ?? ""} onChange={event => changeMetadata({ ...metadata, catalog: { ...metadata.catalog, featuredUntil: event.target.value || null } })} />
                    {detailError("catalog.featuredUntil") ? <small className={styles.fieldError} id="publication-featured-until-error">{detailError("catalog.featuredUntil")}</small> : null}
                  </div>
                </div>
                </div>
              </section>
            </fieldset>
            <aside className={styles.catalogAside} aria-label="Draft catalog card">
              <div className={styles.catalogCardPreview}>
                <StudyCard preview headingLevel="h4" report={{
                  id: project.id,
                  href: `/reports/${metadata.slug}`,
                  category: project.reportStyle === "annual-report-2026" ? "annual" : "research-drop",
                  badge: publicationCardBadge(metadata.displayDate, metadata.eyebrow),
                  title: metadata.title || "Add your report title",
                  description: metadata.summary || "Your Reports summary will appear here.",
                  employeeCount: metadata.employeeCount,
                  thumbnail: metadata.thumbnail.source ? {
                    src: metadata.thumbnail.source,
                    alt: metadata.thumbnail.alt,
                    presentation: selectedIllustration ? "illustration" : metadata.thumbnail.presentation,
                  } : undefined,
                }} />
              </div>
            </aside>
          </div>
        </form>
            {sourceIssues.length > 0 ? <section className={styles.sourceIssues} data-blocker="true" tabIndex={-1}>
              <h4>Source content needs attention</h4><p>Resolve these items in Studio before preparing a preview. Saving a draft doesn&apos;t approve them.</p>
              <ul>{sourceIssues.map((issue, index) => <li key={`${issue.field}-${index}`}>{issue.message}</li>)}</ul>
              <button className={styles.secondaryButton} disabled={busy} type="button" onClick={() => void savePreparation().then(saved => { if (saved) dialogRef.current?.close(); })}>Return to Studio</button>
            </section> : null}
          {unlockAction ? <OwnerAccessPanel busy={busy} error={unlockError} notice={unlockNotice}
            onUnlock={unlockPublishing} onCancel={cancelUnlock} /> : null}
        </> : <section className={styles.successCard} role="status">
          <span className={`${styles.badge} ${styles.readyBadge}`}>Published · Revision {websiteUpdate.revision}</span>
          <h3 ref={publishedHeadingRef} tabIndex={-1}>Your report is published</h3>
          <h4>{metadata.title}</h4>
          <p>Your report and catalog entry are live on this test site. Permanent production deployment isn&apos;t configured.</p>
          <a className={styles.secondaryButton} href={websiteUpdate.catalogPath} target="_blank" rel="noopener noreferrer">Open Reports catalog</a>
        </section>}
      </div>
      <footer className={styles.footer}>
        <div className={styles.footerInfo}>
          <div className={styles.draftActions}>
            {!websiteUpdate ? <button className={studioStyles.secondaryAction} disabled={busy} onClick={() => void savePreparation()} type="button">Save draft</button> : null}
            <div className={styles.footerStatus} role="status">{busy ? <span className={styles.spinner} aria-hidden="true" /> : null}<span>{footerHint}</span></div>
          </div>
          {ownerAccess === true && !websiteUpdate ? ownerKeyRequired
            ? <button className={styles.textButton} disabled={busy} onClick={() => void lockPublishing()} type="button">Lock publishing</button>
            : <span className={styles.helper}>Private test access · No owner key needed</span> : null}
        </div>
        <div className={styles.footerActions}>
          {websiteUpdate ? <button className={studioStyles.textAction} disabled={busy} onClick={requestClose} type="button">Done</button> : null}
          {websiteUpdate ? <a className={studioStyles.primaryAction} href={websiteUpdate.reportPath} rel="noopener noreferrer" target="_blank">View published report</a> : <>
            {websiteStage && ownerAccess === true ? <a ref={previewLinkRef} className={studioStyles.secondaryAction} href={websiteStage.previewPath}
              aria-disabled={busy || unlockAction !== undefined || undefined} tabIndex={busy || unlockAction ? -1 : undefined}
              onClick={event => { if (busy || unlockAction) event.preventDefault(); }} rel="noopener noreferrer" target="_blank">Preview report<span className={styles.srOnly}> (opens in a new tab)</span></a>
              : <button ref={previewButtonRef} className={studioStyles.secondaryAction} disabled={busy || checkingAccess || unlockAction !== undefined} form="publication-details" type="submit">{operation === "preparing" ? "Preparing preview..." : "Preview report"}</button>}
            <button ref={publishButtonRef} className={studioStyles.primaryAction} disabled={busy || checkingAccess || unlockAction !== undefined}
              onClick={() => void runWebsiteAction("publish")} type="button">{operation === "publishing" ? "Publishing..." : "Publish report"}</button>
          </>}
        </div>
      </footer>
    </div>
  </dialog>;
}
