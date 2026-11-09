"use client";

import { Dismiss20Regular } from "@fluentui/react-icons/svg/dismiss";
import { DocumentData20Regular } from "@fluentui/react-icons/svg/document-data";
import { Globe20Regular } from "@fluentui/react-icons/svg/globe";
import { HomeCheckmark20Regular } from "@fluentui/react-icons/svg/home-checkmark";
import { LockClosed20Regular } from "@fluentui/react-icons/svg/lock-closed";
import { useEffect, useRef, useState } from "react";
import { preparePublicationPackage, publicationReadiness } from "../../../project/publication-package.ts";
import {
  type PublicationPreparation,
} from "../../../project/publication-preparation.ts";
import {
  initialPublicationMetadata, publicationCardIssues,
} from "../../../project/publication-flow.ts";
import { studioImageReviews, type StudioProject } from "../../../project/studio-project.ts";
import {
  websiteResponse, WebsiteRequestError, websiteStageSchema, websiteUpdateSchema, type WebsiteStage, type WebsiteUpdate,
} from "../../../project/website-publishing.ts";
import studioStyles from "../../_components/publishing-studio.module.css";
import styles from "./publication-package-dialog.module.css";

type Operation = "publishing" | "unlocking" | "locking";

async function readOwnerAccess(signal?: AbortSignal) {
  const response = await fetch("/api/studio/owner", { cache: "no-store", signal });
  if (response.status !== 204 && response.status !== 401) {
    throw new Error("Publishing access couldn't be checked. Try publishing again.");
  }
  return {
    authorized: response.status === 204,
    keyRequired: response.headers.get("X-Glint-Labs-Owner-Key-Required") !== "false",
  };
}

export function PublicationPackageDialog({ project, onSave, onPublished, onClose, onEditDetails }: {
  project: StudioProject;
  onSave: (preparation: PublicationPreparation) => Promise<void>;
  onPublished?: (project: StudioProject, revision: number, packageFingerprint: string) => Promise<void>;
  onClose: () => void;
  onEditDetails: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const publishedHeadingRef = useRef<HTMLHeadingElement>(null);
  const ownerKeyRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const preparingRef = useRef(false);
  const stagedProjectRef = useRef<StudioProject | undefined>(undefined);
  const [metadata] = useState(() => initialPublicationMetadata(project));
  const imageReviews = studioImageReviews(project);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [operation, setOperation] = useState<Operation>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [errorHeading, setErrorHeading] = useState("We couldn't finish that step");
  const [ownerAccess, setOwnerAccess] = useState<boolean>();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [ownerKeyRequired, setOwnerKeyRequired] = useState(true);
  const [ownerKey, setOwnerKey] = useState("");
  const [ownerKeyError, setOwnerKeyError] = useState<string>();
  const [ownerKeyNotice, setOwnerKeyNotice] = useState<string>();
  const [websiteStage, setWebsiteStage] = useState<WebsiteStage>();
  const [websiteUpdate, setWebsiteUpdate] = useState<WebsiteUpdate>();
  const readiness = publicationReadiness(project, metadata, imageReviews);
  const detailsIssues = publicationCardIssues(metadata);
  const sourceIssues = readiness.filter(issue => !detailsIssues.some(detail => detail.field === issue.field));
  const busy = operation !== undefined;
  const needsOwnerKey = ownerAccess === false;

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
      setError(failure instanceof Error ? failure.message : "Check your connection, then try publishing again.");
    }).finally(() => { if (!controller.signal.aborted) setCheckingAccess(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!busy && (ownerKeyError || ownerKeyNotice)) ownerKeyRef.current?.focus({ preventScroll: true });
  }, [busy, ownerAccess, ownerKeyError, ownerKeyNotice]);
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
  function requestClose() {
    if (busy || preparingRef.current) return;
    dialogRef.current?.close();
  }

  function requireDetails() {
    if (detailsIssues.length === 0) return true;
    setValidationAttempt(attempt => attempt + 1);
    return false;
  }

  function requireReady() {
    if (!requireDetails()) return false;
    if (readiness.length === 0) return true;
    setValidationAttempt(attempt => attempt + 1);
    return false;
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
    await onSave(result.preparation);
    stagedProjectRef.current = { ...project, publicationPreparation: result.preparation,
      publicationMetadataDraft: result.preparation.metadata, imageReviews: result.preparation.imageReviews };
    setWebsiteStage(staged);
    return staged;
  }

  async function publishReport() {
    if (busy || checkingAccess || preparingRef.current || !requireReady()) return;
    preparingRef.current = true;
    setOperation("publishing");
    setError(undefined); setMessage(undefined); setOwnerKeyError(undefined); setOwnerKeyNotice(undefined);
    let authenticated = false;
    try {
      if (ownerAccess !== true) {
        const access = await readOwnerAccess();
        setOwnerAccess(access.authorized); setOwnerKeyRequired(access.keyRequired);
        if (!access.authorized) {
          if (!ownerKey.trim()) {
            setOwnerKeyError("Enter your publishing code.");
            return;
          }
          setOperation("unlocking");
          try {
            await websiteResponse(await fetch("/api/studio/owner", {
              method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: ownerKey }),
            }));
          } catch (failure) {
            setOwnerKeyError(failure instanceof WebsiteRequestError && failure.status === 401
              ? "That code didn't match. Try again."
              : "Publishing access couldn't be checked. Try again.");
            return;
          }
          authenticated = true;
          setOwnerAccess(true); setOwnerKey("");
        }
      }
      setOperation("publishing");
      const staged = await stageOnWebsite();
      const published = websiteUpdateSchema.parse(await websiteResponse(await fetch("/api/studio/approve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: staged.reportId, revision: staged.revision,
          packageFingerprint: staged.packageFingerprint, approveForWebsite: true,
        }),
      })));
      setWebsiteUpdate(published);
      try {
        await onPublished?.(stagedProjectRef.current ?? project, staged.revision, staged.packageFingerprint);
      } catch {
        setMessage("Your report was published, but its local publication status couldn't be saved. Refresh your reports to see the live revision.");
      }
    } catch (failure) {
      if (failure instanceof WebsiteRequestError && failure.status === 401) {
        setOwnerAccess(false); setOwnerKey(""); setWebsiteStage(undefined);
        setOwnerKeyNotice(authenticated
          ? "Allow cookies for this site, then enter your code and try again. Nothing was published."
          : "Publishing access has expired. Enter your code and try again. Nothing was published.");
      } else {
        setErrorHeading("Your report couldn't be published");
        setError(failure instanceof Error ? failure.message : "Check your connection and try again.");
      }
    } finally { preparingRef.current = false; setOperation(undefined); }
  }

  async function lockPublishing() {
    if (busy || preparingRef.current) return;
    preparingRef.current = true; setOperation("locking"); setError(undefined);
    try {
      await websiteResponse(await fetch("/api/studio/owner", { method: "DELETE" }));
      setOwnerAccess(false); setWebsiteStage(undefined); setOwnerKey("");
      setOwnerKeyError(undefined); setOwnerKeyNotice(undefined);
      setMessage("Publishing is locked. Your draft is unchanged.");
      titleRef.current?.focus({ preventScroll: true });
    } catch (failure) {
      setErrorHeading("Publishing couldn't be locked");
      setError(failure instanceof Error ? failure.message : "Check your connection and try locking again.");
    } finally { preparingRef.current = false; setOperation(undefined); }
  }

  const footerHint = busy ? operation === "publishing" ? "Publishing this revision..."
    : operation === "unlocking" ? "Unlocking publishing..."
        : "Locking publishing..."
    : websiteUpdate ? "Published to the test site"
      : checkingAccess ? "Checking publishing access..." : websiteStage ? "Ready to publish to the test site" : "";

  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="package-title"
    onCancel={event => { event.preventDefault(); requestClose(); }} onClose={onClose}>
    <div className={styles.shell}>
      <header className={styles.header}>
        <h2 id="package-title" ref={titleRef} tabIndex={-1}>Publish report</h2>
        <div className={styles.headerActions}>
          {ownerAccess === true && !websiteUpdate && ownerKeyRequired
            ? <button className={styles.closeButton} aria-label="Lock publishing" title="Lock publishing" disabled={busy}
              onClick={() => void lockPublishing()} type="button"><LockClosed20Regular aria-hidden="true" /></button> : null}
          <button className={styles.closeButton} aria-label="Close publishing" disabled={busy} onClick={requestClose} type="button"><Dismiss20Regular aria-hidden="true" /></button>
        </div>
      </header>
      <div className={styles.body} ref={bodyRef} aria-busy={busy}>
        {error ? <div className={styles.error} ref={errorRef} role="alert" tabIndex={-1}>
          <strong>{errorHeading}</strong>
          <p>{error}</p>
        </div> : null}
        {message ? <p className={styles.notice} role="status">{message}</p> : null}

        {!websiteUpdate ? <>
          <p className={styles.confirmationHint}>Your report and listing card will be published together.</p>
          <section className={styles.confirmationReport} aria-label="Report to publish">
            <div className={styles.confirmationRow}>
              <DocumentData20Regular aria-hidden="true" />
              <h3>{metadata.title}</h3>
            </div>
            <div className={styles.confirmationRow}>
              <Globe20Regular aria-hidden="true" />
              <p><span className={styles.srOnly}>Report address: </span>/reports/{metadata.slug}</p>
            </div>
            {metadata.catalog.featured ? <div className={styles.confirmationRow}>
              <HomeCheckmark20Regular aria-hidden="true" />
              <p className={styles.confirmationFeature}>
                {metadata.catalog.featuredUntil ? `Will be featured on homepage until ${metadata.catalog.featuredUntil}` : "Will be featured on homepage"}
              </p>
            </div> : null}
          </section>
          {detailsIssues.length > 0 ? <section className={styles.sourceIssues} data-blocker="true" tabIndex={-1}>
            <h4>Listing card needs attention</h4>
            <ul>{detailsIssues.map((issue, index) => <li key={`${issue.field}-${index}`}>{issue.message}</li>)}</ul>
            <button className={studioStyles.textAction} disabled={busy} type="button"
              onClick={() => { dialogRef.current?.close(); onEditDetails(); }}>Edit listing card</button>
          </section> : null}
          {sourceIssues.length > 0 ? <section className={styles.sourceIssues} data-blocker="true" tabIndex={-1}>
            <h4>Source content needs attention</h4><p>Resolve these items in Studio before publishing.</p>
            <ul>{sourceIssues.map((issue, index) => <li key={`${issue.field}-${index}`}>{issue.message}</li>)}</ul>
            <button className={studioStyles.textAction} disabled={busy} type="button" onClick={requestClose}>Return to Studio</button>
          </section> : null}
          {needsOwnerKey ? <div className={`${styles.field} ${styles.ownerCode}`}>
            <label htmlFor="studio-owner-key">Publishing code</label>
            <input ref={ownerKeyRef} id="studio-owner-key" name="studio-owner-key" type="password" form="studio-publish-confirmation"
              autoComplete="current-password" required maxLength={256} disabled={busy} value={ownerKey}
              aria-invalid={ownerKeyError !== undefined || undefined}
              aria-describedby={`owner-code-hint${ownerKeyError ? " owner-code-error" : ""}${ownerKeyNotice ? " owner-code-notice" : ""}`}
              onChange={event => { setOwnerKey(event.target.value); setOwnerKeyError(undefined); }} />
            <span className={styles.srOnly} id="owner-code-hint">Use your Studio publishing code. Access lasts 7 days on this browser.</span>
            {ownerKeyError ? <small className={styles.fieldError} id="owner-code-error" role="alert">{ownerKeyError}</small> : null}
            {ownerKeyNotice ? <small className={styles.codeNotice} id="owner-code-notice" role="status">{ownerKeyNotice}</small> : null}
          </div> : null}
        </> : <section className={styles.successCard} role="status">
          <span className={`${styles.badge} ${styles.readyBadge}`}>Published · Revision {websiteUpdate.revision}</span>
          <h3 ref={publishedHeadingRef} tabIndex={-1}>Your report is published</h3>
          <h4>{metadata.title}</h4>
          <p>Your report and catalog entry are live on this test site. Permanent production deployment isn&apos;t configured.</p>
          <a className={styles.secondaryButton} href={websiteUpdate.catalogPath} target="_blank" rel="noopener noreferrer">Open Reports catalog</a>
        </section>}
      </div>
      <footer className={styles.footer}>
        <div className={styles.footerStatus} role="status">{busy ? <span className={styles.spinner} aria-hidden="true" /> : null}{footerHint}</div>
        <div className={styles.footerActions}>
          {!websiteUpdate ? <button className={studioStyles.secondaryAction} disabled={busy} onClick={requestClose} type="button">Cancel</button> : null}
          {websiteUpdate ? <button className={studioStyles.textAction} disabled={busy} onClick={requestClose} type="button">Done</button> : null}
          {websiteUpdate ? <a className={studioStyles.primaryAction} href={websiteUpdate.reportPath} rel="noopener noreferrer" target="_blank">View published report</a> :
            <form id="studio-publish-confirmation" className={styles.publishForm} noValidate onSubmit={event => {
              event.preventDefault();
              void publishReport();
            }}>
              <button className={studioStyles.primaryAction}
                disabled={busy || checkingAccess || (needsOwnerKey && !ownerKey.trim())} type="submit">
                <Globe20Regular aria-hidden="true" />
                {operation === "publishing" ? "Publishing..." : "Publish"}
              </button>
            </form>}
        </div>
      </footer>
    </div>
  </dialog>;
}
