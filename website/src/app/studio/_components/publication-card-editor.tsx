"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  publicationCardBadge, publicationCardIssues, PUBLICATION_SUMMARY_MAX_LENGTH,
  suggestedPublicationSlug, suggestedPublicationSummary, type PublicationMetadataDraft,
} from "../../../project/publication-flow.ts";
import type { StudioProject } from "../../../project/studio-project.ts";
import { isRetiredIllustration, publicationIllustrations } from "../../../publishing/featured-illustrations.ts";
import { StudyCard } from "../../_components/study-card";
import studioStyles from "../../_components/publishing-studio.module.css";
import styles from "./publication-package-dialog.module.css";

function DetailField({ name, label, error, children }: {
  name: string; label: string; error?: string; children: ReactNode;
}) {
  return <div className={styles.field}>
    <label htmlFor={name}>{label}<span aria-hidden="true"> *</span><span className={styles.srOnly}> (required)</span></label>
    {children}
    {error ? <small className={styles.fieldError} id={`${name}-error`}>{error}</small> : null}
  </div>;
}

export function PublicationCardPreview({ project, metadata }: {
  project: Pick<StudioProject, "id" | "reportStyle">; metadata: PublicationMetadataDraft;
}) {
  const illustration = publicationIllustrations.find(image => image.src === metadata.thumbnail.source);
  return <aside className={styles.catalogAside} aria-label="Draft catalog card">
    <div className={styles.catalogCardPreview}>
      <StudyCard preview headingLevel="h4" report={{
        id: project.id, href: `/reports/${metadata.slug}`,
        category: project.reportStyle === "annual-report-2026" ? "annual" : "research-drop",
        badge: publicationCardBadge(metadata.displayDate, metadata.eyebrow),
        title: metadata.title || "Add your report title",
        description: metadata.summary || "Your Reports summary will appear here.",
        employeeCount: metadata.employeeCount,
        thumbnail: metadata.thumbnail.source ? {
          src: metadata.thumbnail.source, alt: metadata.thumbnail.alt,
          presentation: illustration ? "illustration" : metadata.thumbnail.presentation,
        } : undefined,
      }} />
    </div>
  </aside>;
}

export function PublicationCardEditor({ project, metadata, onChange, validate = false }: {
  project: Pick<StudioProject, "id" | "manifest" | "reportStyle" | "publicationPreparation" | "publicationMetadataDraft">;
  metadata: PublicationMetadataDraft;
  onChange: (metadata: PublicationMetadataDraft) => void;
  validate?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const validationFocused = useRef(false);
  const [tab, setTab] = useState<"illustration" | "details">("illustration");
  const [addressEdited, setAddressEdited] = useState(() => Boolean(project.publicationPreparation || project.publicationMetadataDraft) ||
    metadata.slug !== suggestedPublicationSlug(metadata.title));
  const issues = publicationCardIssues(metadata);
  const error = (field: string) => validate ? issues.find(issue => issue.field === field)?.message : undefined;
  const thumbnailError = validate ? issues.find(issue => issue.field.startsWith("thumbnail."))?.message : undefined;
  const inputProps = (field: string, name: string) => ({
    id: name, name, required: true, "aria-invalid": error(field) ? true : undefined,
    "aria-describedby": error(field) ? `${name}-error` : undefined,
  });
  const reportSummary = suggestedPublicationSummary(project.manifest);
  const slugSuggestion = suggestedPublicationSlug(metadata.title);
  useEffect(() => {
    if (!validate) {
      validationFocused.current = false;
      return;
    }
    if (validationFocused.current) return;
    const invalid = publicationCardIssues(metadata);
    const nextTab = invalid.some(issue => issue.field.startsWith("thumbnail.")) ? "illustration" : "details";
    if (tab !== nextTab) {
      setTab(nextTab);
      return;
    }
    const field = formRef.current?.querySelector<HTMLElement>(`#publication-${nextTab}-panel [aria-invalid="true"]`);
    (field?.querySelector<HTMLElement>("input") ?? field)?.focus();
    validationFocused.current = true;
  }, [validate, metadata, tab]);

  return <section className={styles.cardEditor} aria-label="Listing card editor">
      <form ref={formRef} className={styles.cardForm} aria-label="Listing card settings" noValidate onSubmit={event => event.preventDefault()}>
        <header className={styles.cardPanelHeader}>
          <h1>Card</h1>
          <p className={styles.cardHint}>How this report appears on Glint Labs.</p>
          <div className={studioStyles.chartTabs} role="tablist" aria-label="Card editing">
            {(["illustration", "details"] as const).map(value => <button key={value} type="button" role="tab"
              id={`publication-${value}-tab`} aria-controls={`publication-${value}-panel`} aria-selected={tab === value}
              tabIndex={tab === value ? 0 : -1}
              onKeyDown={event => {
                if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                  event.preventDefault();
                  const next = event.key === "Home" ? "illustration" : event.key === "End" ? "details"
                    : value === "illustration" ? "details" : "illustration";
                  setTab(next);
                  document.getElementById(`publication-${next}-tab`)?.focus();
                }
              }}
              onClick={() => setTab(value)}>{value === "illustration" ? "Illustration" : "Details"}</button>)}
          </div>
        </header>
        <div className={styles.cardPanelBody}>
          <div id="publication-illustration-panel" role="tabpanel" aria-labelledby="publication-illustration-tab" hidden={tab !== "illustration"}>
            <fieldset className={styles.thumbnailPicker} aria-describedby={thumbnailError ? "publication-thumbnail-error" : undefined}>
              <legend className={styles.srOnly}>Catalog image (required)</legend>
              <div className={styles.thumbnailChoices} role="radiogroup" aria-label="Catalog image" aria-required="true"
                aria-invalid={thumbnailError ? true : undefined} aria-describedby={thumbnailError ? "publication-thumbnail-error" : undefined} tabIndex={-1}>
                {publicationIllustrations.map(illustration => <label className={styles.thumbnailChoice} key={illustration.id}>
                  <input className={styles.srOnly} type="radio" name="publication-thumbnail" required
                    value={`illustration:${illustration.id}`} checked={metadata.thumbnail.source === illustration.src}
                    onChange={() => onChange({ ...metadata, thumbnail: { source: illustration.src, alt: illustration.description, presentation: "illustration" } })} />
                  <Image src={illustration.src} unoptimized width={88} height={88} alt="" />
                  <span className={styles.srOnly}>{illustration.label}</span>
                </label>)}
              </div>
              {isRetiredIllustration(metadata.thumbnail.source) ? <p className={styles.helper}>This draft uses a retired illustration. Choose one from the new Glint Labs set.</p> : null}
              {thumbnailError ? <small className={styles.fieldError} id="publication-thumbnail-error">{thumbnailError}</small> : null}
            </fieldset>
          </div>
          <div id="publication-details-panel" role="tabpanel" aria-labelledby="publication-details-tab" hidden={tab !== "details"}>
            <section className={styles.fields} aria-label="Card content">
              <DetailField name="publication-title" label="Card title" error={error("title")}>
                <input {...inputProps("title", "publication-title")} autoComplete="off" value={metadata.title} onChange={event => onChange({
                  ...metadata, title: event.target.value, slug: addressEdited ? metadata.slug : suggestedPublicationSlug(event.target.value),
                })} />
              </DetailField>
              <DetailField name="publication-summary" label="Short summary" error={error("summary")}>
                {reportSummary && metadata.summary.trim() !== reportSummary ? <button className={`${styles.textButton} ${styles.summaryAction}`} type="button"
                  onClick={() => { onChange({ ...metadata, summary: reportSummary }); summaryRef.current?.focus({ preventScroll: true }); }}>
                  {metadata.summary.trim() ? "Replace summary" : "Use report text"}
                </button> : null}
                <textarea {...inputProps("summary", "publication-summary")} rows={4} maxLength={PUBLICATION_SUMMARY_MAX_LENGTH}
                  aria-describedby={`publication-summary-counter${error("summary") ? " publication-summary-error" : ""}`}
                  ref={summaryRef} value={metadata.summary} onChange={event => onChange({ ...metadata, summary: event.target.value })} />
                <span className={styles.cardCounter} id="publication-summary-counter" aria-label={`${metadata.summary.length} of ${PUBLICATION_SUMMARY_MAX_LENGTH} characters`}>
                  {metadata.summary.length} / {PUBLICATION_SUMMARY_MAX_LENGTH}
                </span>
              </DetailField>
              <DetailField name="publication-date" label="Card date" error={error("displayDate")}>
                <input {...inputProps("displayDate", "publication-date")} type="date" value={metadata.displayDate}
                  aria-describedby={`publication-date-hint${error("displayDate") ? " publication-date-error" : ""}`}
                  onChange={event => onChange({ ...metadata, displayDate: event.target.value })} />
                <small id="publication-date-hint">Shown in the card&apos;s date badge.</small>
              </DetailField>
              <div className={styles.cardFeatureRow}>
                <label className={styles.checkbox} htmlFor="publication-featured">
                  <input id="publication-featured" name="publication-featured" type="checkbox" checked={metadata.catalog.featured}
                    onChange={event => onChange({ ...metadata, catalog: { featured: event.target.checked, featuredUntil: event.target.checked ? metadata.catalog.featuredUntil : null } })} />
                  <span>Feature on homepage</span>
                </label>
                <div className={styles.field}>
                  <label htmlFor="publication-featured-until">Until (optional)</label>
                  <input {...inputProps("catalog.featuredUntil", "publication-featured-until")} required={false} disabled={!metadata.catalog.featured}
                    min={metadata.displayDate || undefined} type="date" value={metadata.catalog.featuredUntil ?? ""}
                    onChange={event => onChange({ ...metadata, catalog: { ...metadata.catalog, featuredUntil: event.target.value || null } })} />
                  {error("catalog.featuredUntil") ? <small className={styles.fieldError} id="publication-featured-until-error">{error("catalog.featuredUntil")}</small> : null}
                  </div>
            </div>
              <DetailField name="publication-slug" label="Report address" error={error("slug")}>
                <div className={styles.addressInput}><span aria-hidden="true">/reports/</span>
                  <input {...inputProps("slug", "publication-slug")} autoComplete="off" spellCheck={false} value={metadata.slug}
                    onChange={event => { setAddressEdited(true); onChange({ ...metadata, slug: event.target.value }); }} />
                </div>
                {slugSuggestion && slugSuggestion !== metadata.slug ? <button className={styles.textButton} type="button"
                  onClick={() => { setAddressEdited(true); onChange({ ...metadata, slug: slugSuggestion }); }}>Use suggested address</button> : null}
              </DetailField>
            </section>
          </div>
        </div>
      </form>
      <div className={styles.cardPreviewCanvas}><PublicationCardPreview project={project} metadata={metadata} /></div>
  </section>;
}
