"use client";

import Image from "next/image";
import { Button } from "@fluentui/react-button";
import { Menu, MenuDivider, MenuItem, MenuItemRadio, MenuList, MenuPopover, MenuTrigger } from "@fluentui/react-menu";
import { Add20Regular } from "@fluentui/react-icons/svg/add";
import { EditLineHorizontal320Regular } from "@fluentui/react-icons/svg/edit-line-horizontal";
import { ChevronDown16Regular } from "@fluentui/react-icons/svg/chevron-down";
import { MoreHorizontal20Regular } from "@fluentui/react-icons/svg/more-horizontal";
import { Edit16Regular, Edit20Regular } from "@fluentui/react-icons/svg/edit";
import { Globe20Regular } from "@fluentui/react-icons/svg/globe";
import { LiveOff20Regular } from "@fluentui/react-icons/svg/live-off";
import { Live16Regular } from "@fluentui/react-icons/svg/live";
import { Dismiss20Regular } from "@fluentui/react-icons/svg/dismiss";
import { useEffect, useRef, useState } from "react";
import { BrowserProjectStorage } from "../../project/project-storage.ts";
import { parseStudioProject, studioImageReviews, type StudioProject } from "../../project/studio-project.ts";
import { canonicalJson, sha256Text } from "../../integrity/approved-content.ts";
import { hiddenLibraryReports, publishedReportListSchema, reportLibrary, setLibraryReportHidden, type LibraryReport, type PublishedReportSummary } from "../../project/report-library.ts";
import { websiteResponse, WebsiteRequestError } from "../../project/website-publishing.ts";
import menuStyles from "./studio-menu.module.css";
import styles from "./studio-report-library.module.css";

type Filter = "all" | "draft" | "published" | "changes" | "hidden";
type Sort = "modified" | "title" | "oldest";
type Action = { kind: "open" | "delete" | "remove" | "restore"; report: LibraryReport };
const filters: Record<Filter, string> = {
  all: "All reports", draft: "Drafts", published: "Published", changes: "Unpublished edits",
  hidden: "Hidden reports",
};
const sorts: Record<Sort, string> = {
  modified: "Last modified", title: "Title", oldest: "Oldest first",
};

export async function compareLegacyPublication(report: LibraryReport) {
  const project = report.project;
  if (!report.comparisonUnknown || !report.publication || !project?.publicationPreparation) return report;
  if (project.publicationMetadataDraft && canonicalJson(project.publicationMetadataDraft) !== canonicalJson(project.publicationPreparation.metadata)) {
    return { ...report, comparisonUnknown: false, unpublishedChanges: true };
  }
  try {
    const { preparePublicationPackage } = await import("../../project/publication-package.ts");
    const prepared = await preparePublicationPackage({
      project, metadata: project.publicationPreparation.metadata, imageReviews: studioImageReviews(project),
      readAsset: async source => {
        const response = await fetch(source, { redirect: "error" });
        if (!response.ok) throw new Error("The source image is unavailable.");
        return { bytes: new Uint8Array(await response.arrayBuffer()), mimeType: response.headers.get("content-type") ?? "" };
      },
    });
    const fingerprint = await sha256Text(canonicalJson({ publication: prepared.publication, manifest: prepared.manifest }));
    return { ...report, comparisonUnknown: false, unpublishedChanges: fingerprint !== report.publication.packageFingerprint };
  } catch { return report; }
}

function reportDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", {
    month: "long", year: "numeric", timeZone: "UTC",
  }).format(date);
}

export function ReportStatusBadge({ status }: { status: string }) {
  return <span className={`${styles.badge} ${status === "Published" ? styles.published : status === "Unpublished changes" ? styles.unpublished : ""}`}>
    {status === "Published" ? <Live16Regular aria-hidden="true" /> : status === "Draft" ? <Edit16Regular aria-hidden="true" /> : null}
    {status === "Unpublished changes" ? "Unpublished edits" : status}
  </span>;
}

export function StudioReportLibrary({ projects, onNewReport, onOpen, onProjectsChange, onNotify }: {
  projects: StudioProject[];
  onNewReport: () => void;
  onOpen: (project: StudioProject) => void;
  onProjectsChange: (projects: StudioProject[]) => void;
  onNotify: (message: string, undoAction?: () => Promise<string>) => void;
}) {
  const [publications, setPublications] = useState<PublishedReportSummary[]>();
  const [reports, setReports] = useState<LibraryReport[]>([]);
  const [hiddenReports, setHiddenReports] = useState(new Set<string>());
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("modified");
  const [listError, setListError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [pending, setPending] = useState<Action>();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");
  const [actionError, setActionError] = useState<string>();
  const [conflict, setConflict] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const newReportRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  async function refreshReports(signal?: AbortSignal) {
    const value = publishedReportListSchema.parse(await websiteResponse(await fetch("/api/studio/reports", {
      cache: "no-store", signal,
    })));
    if (!signal?.aborted) { setPublications(value.reports); setListError(undefined); }
    return value.reports;
  }

  useEffect(() => {
    const syncVisibility = () => {
      try { setHiddenReports(hiddenLibraryReports(window.localStorage)); }
      catch { setNotice("Hidden reports couldn't be loaded. Refresh to try again."); }
    };
    syncVisibility();
    window.addEventListener("storage", syncVisibility);
    return () => window.removeEventListener("storage", syncVisibility);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshReports(controller.signal).catch(error => {
      if (!controller.signal.aborted) setListError(error instanceof Error ? error.message : "Published reports couldn't be loaded. Try again.");
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let active = true;
    void reportLibrary(projects, publications ?? []).then(value => Promise.all(value.map(compareLegacyPublication))).then(value => {
      if (active) setReports(value);
    }).catch(() => { if (active) setListError("Your reports couldn't be prepared. Try refreshing the page."); });
    return () => { active = false; };
  }, [projects, publications]);

  useEffect(() => {
    if (pending) {
      dialogRef.current?.showModal();
      cancelRef.current?.focus();
    }
  }, [pending]);
  useEffect(() => {
    if (needsCode) codeRef.current?.focus();
  }, [needsCode]);

  function startAction(action: Action, opener?: HTMLElement) {
    returnFocusRef.current = opener ?? document.querySelector<HTMLElement>(
      `[data-report-id="${action.report.id}"] ${action.kind === "open" ? '[data-report-open]' : '[data-report-actions]'}`,
    );
    setPending(action); setActionError(undefined); setNeedsCode(false); setCode(""); setConflict(false);
  }

  function closeAction() {
    if (busyRef.current) return;
    dialogRef.current?.close();
    setPending(undefined); setCode(""); setNeedsCode(false);
    requestAnimationFrame(() => {
      const target = returnFocusRef.current;
      (target?.isConnected ? target : newReportRef.current)?.focus();
    });
  }

  async function publishedProject(report: LibraryReport, readerVersion = false) {
    const value = await websiteResponse(await fetch(`/api/studio/reports/${report.id}${readerVersion ? "?version=published" : ""}`, { cache: "no-store" }));
    if (!value || typeof value !== "object" || !("project" in value)) {
      throw new Error("The report couldn't be opened. Refresh your reports and try again.");
    }
    const project = parseStudioProject(value.project);
    if (project.id !== report.id) throw new Error("The report couldn't be opened. Refresh your reports and try again.");
    return project;
  }

  async function openReport(report: LibraryReport, opener?: HTMLElement) {
    if (busyRef.current) return;
    if (report.project) { onOpen(report.project); return; }
    busyRef.current = true; setBusy(true); setNotice(undefined);
    try {
      const storage = new BrowserProjectStorage(window.localStorage);
      const existing = (await storage.list()).find(project => project.id === report.id);
      const project = existing ?? await storage.restore(await publishedProject(report));
      onProjectsChange(await storage.list());
      onOpen(project);
    } catch (error) {
      if (error instanceof WebsiteRequestError && error.status === 401) {
        startAction({ kind: "open", report }, opener); setNeedsCode(true);
      } else setNotice(error instanceof Error ? error.message : "The report couldn't be opened. Try again.");
    } finally { busyRef.current = false; setBusy(false); }
  }

  async function confirmAction() {
    if (!pending || busyRef.current || conflict) return;
    busyRef.current = true; setBusy(true); setActionError(undefined);
    let completed = false;
    let opened: StudioProject | undefined;
    try {
      if (needsCode) {
        await websiteResponse(await fetch("/api/studio/owner", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: code }),
        }));
        setCode(""); setNeedsCode(false);
      }
      const storage = new BrowserProjectStorage(window.localStorage);
      if (pending.kind === "delete") {
        const id = pending.report.id;
        const project = (await storage.list()).find(value => value.id === id);
        await storage.remove(id);
        onNotify("Draft deleted from this device. Your Word file was kept.", async () => {
          if (project) await storage.restore(project);
          const restored = await storage.list();
          onProjectsChange(restored);
          requestAnimationFrame(() => {
            (document.querySelector<HTMLElement>(`[data-report-id="${id}"] [data-report-actions]`) ?? newReportRef.current)?.focus();
          });
          return "Draft restored.";
        });
      } else if (pending.kind === "restore") {
        const previous = await storage.load(pending.report.id);
        const restored = await publishedProject(pending.report, true);
        const publication = pending.report.publication;
        if (!publication || restored.websitePublication?.revision !== publication.revision ||
          restored.websitePublication.packageFingerprint !== publication.packageFingerprint) {
          setConflict(true);
          await refreshReports();
          throw new Error("The published version changed. Close this dialog and review the report before restoring it.");
        }
        if (!await storage.replaceIfUnchanged(restored, previous)) {
          setConflict(true);
          onProjectsChange(await storage.list());
          throw new Error("Your local draft changed. Close this dialog and review the latest draft before restoring it.");
        }
        onNotify("Published version restored to this device.", async () => {
          const undone = await storage.replaceIfUnchanged(previous, restored);
          onProjectsChange(await storage.list());
          return undone ? "Previous draft restored." : "Undo was not applied. Newer local edits were kept.";
        });
      } else if (pending.kind === "open") {
        opened = await storage.restore(await publishedProject(pending.report));
      } else {
        const publication = pending.report.publication;
        if (!publication) throw new Error("Refresh your reports before removing this report.");
        if (!pending.report.project) {
          const existing = (await storage.list()).find(project => project.id === pending.report.id);
          if (!existing) await storage.restore(await publishedProject(pending.report));
          onProjectsChange(await storage.list());
        }
        await websiteResponse(await fetch(`/api/studio/reports/${pending.report.id}`, {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportId: pending.report.id, revision: publication.revision,
            packageFingerprint: publication.packageFingerprint,
          }),
        }));
        setPublications(values => values?.filter(value => value.id !== pending.report.id));
        onNotify("Report removed from Glint Labs. Your draft and Word file were kept.");
      }
      onProjectsChange(await storage.list());
      completed = true;
    } catch (error) {
      if (error instanceof WebsiteRequestError && error.status === 401) {
        setNeedsCode(true);
        setActionError(needsCode ? "That code didn't match. Try again." : "Enter your publishing code to continue.");
      } else {
        setActionError(error instanceof Error ? error.message : "That action couldn't be completed. Try again.");
        if (error instanceof WebsiteRequestError && (error.status === 409 || error.status === 404)) {
          setConflict(true);
          void refreshReports().catch(() => setListError("Reports couldn't be refreshed. Try again."));
        }
      }
    } finally {
      busyRef.current = false; setBusy(false);
      if (completed) {
        closeAction();
        if (opened) onOpen(opened);
      }
    }
  }

  function showReport(report: LibraryReport) {
    try {
      setHiddenReports(setLibraryReportHidden(window.localStorage, report.id, false));
      onNotify("Report shown in Studio.");
      requestAnimationFrame(() => newReportRef.current?.focus());
    } catch { setNotice("The report couldn't be shown. Try again."); }
  }

  const confirmationAction = Boolean(pending && pending.kind !== "open");
  const visible = reports.filter(report => filter === "hidden" ? hiddenReports.has(report.id) : !hiddenReports.has(report.id) && (filter === "all" ||
    (filter === "draft" && !report.publication) ||
    (filter === "published" && report.publication) ||
    (filter === "changes" && report.unpublishedChanges))).toSorted((left, right) =>
      (sort === "title" ? left.title.localeCompare(right.title) :
        sort === "oldest" ? left.updatedAt.localeCompare(right.updatedAt) : right.updatedAt.localeCompare(left.updatedAt)) ||
      left.id.localeCompare(right.id));

  return <div className={styles.library}>
    <header className={styles.header}>
      <h1 className={styles.heading}><EditLineHorizontal320Regular aria-hidden="true" />Publishing Studio</h1>
      <div className={styles.toolbar}>
    <div className={styles.controls}>
      <Menu checkedValues={{ filter: [filter] }} onCheckedValueChange={(_, data) => setFilter(data.checkedItems[0] as Filter)}>
        <MenuTrigger disableButtonEnhancement><Button appearance="outline" size="medium" iconPosition="after"
          icon={<ChevronDown16Regular aria-hidden="true" />} aria-label={`Filter reports: ${filters[filter]}`}>{filters[filter]}</Button></MenuTrigger>
        <MenuPopover className={menuStyles.popover}><MenuList>{Object.entries(filters).map(([value, label]) =>
          <MenuItemRadio name="filter" value={value} key={value}>{label}</MenuItemRadio>)}</MenuList></MenuPopover>
      </Menu>
      <Menu checkedValues={{ sort: [sort] }} onCheckedValueChange={(_, data) => setSort(data.checkedItems[0] as Sort)}>
        <MenuTrigger disableButtonEnhancement><Button appearance="outline" size="medium" iconPosition="after"
          icon={<ChevronDown16Regular aria-hidden="true" />} aria-label={`Sort reports: ${sorts[sort]}`}>{sorts[sort]}</Button></MenuTrigger>
        <MenuPopover className={menuStyles.popover}><MenuList>{Object.entries(sorts).map(([value, label]) =>
          <MenuItemRadio name="sort" value={value} key={value}>{label}</MenuItemRadio>)}</MenuList></MenuPopover>
      </Menu>
    </div>
        <Button appearance="primary" size="large" className={styles.newReport} icon={<Add20Regular aria-hidden="true" />}
          ref={newReportRef} data-studio-new-report disabled={busy} onClick={onNewReport}>New report</Button>
      </div>
    </header>
    {listError ? <div className={styles.notice} role="alert">{listError} <Button size="small" appearance="subtle"
      onClick={() => { void refreshReports().catch(error => setListError(error instanceof Error ? error.message : "Reports couldn't be loaded. Try again.")); }}>Try again</Button></div> : null}
    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    <div className={styles.grid} aria-label="Reports" aria-busy={busy}>
      {visible.map(report => {
        const savedThumbnail = report.project?.publicationMetadataDraft?.thumbnail
          ?? report.project?.publicationPreparation?.metadata.thumbnail;
        const status = publications === undefined ? listError ? "Status unavailable" : "Checking status…"
          : report.unpublishedChanges ? "Unpublished changes" : report.publication ? "Published" : "Draft";
        return <article className={styles.card} key={report.id} aria-label={report.title} data-report-id={report.id}>
        <div className={styles.cardContent}>
          <div className={styles.cardHeader}>
            <Image alt="" src={savedThumbnail?.source || report.publication?.thumbnail?.src || "/figma/illustrations/blue/report.png"}
              unoptimized width={96} height={96} className={styles.illustration} />
            <div className={styles.cardStatus} data-report-status>
              <ReportStatusBadge status={status} />
              {report.comparisonUnknown ? <span className={styles.changes}>Review local changes</span> : null}
            </div>
          </div>
          <div className={styles.metadata} data-report-metadata>
            <p>{[reportDate(report.displayDate), report.eyebrow].filter(Boolean).join(" • ")}</p>
            {report.employeeCount !== undefined ? <p>{new Intl.NumberFormat("en-US").format(report.employeeCount)} Employees</p> : null}
          </div>
          <h2 className={styles.title}>{report.title}</h2>
          <p className={styles.summary} data-report-summary>{report.summary}</p>
        </div>
        <footer className={styles.cardFooter}>
          <div className={styles.cardActions}>
            <Button appearance="subtle" className={styles.cardAction} icon={<Edit20Regular aria-hidden="true" />}
              aria-label={`Edit ${report.title} in Studio`} title="Edit in Studio" data-report-open disabled={busy}
              onClick={event => { void openReport(report, event.currentTarget); }} type="button">Edit</Button>
            {report.publication ? <Button as="a" appearance="subtle" className={styles.cardAction} icon={<Globe20Regular aria-hidden="true" />}
              aria-label={`View ${report.title} on Glint Labs`} title="View published report on Glint Labs" disabled={busy}
              href={`https://microsoft.github.io/glintlabs/reports/${report.publication.slug}/`}
              target="_blank" rel="noopener noreferrer">View</Button> : null}
          </div>
          <Menu positioning={{ position: "below", align: "end" }}>
            <MenuTrigger disableButtonEnhancement>
              <Button appearance="subtle" className={styles.more} icon={<MoreHorizontal20Regular aria-hidden="true" />}
                aria-label={`Actions for ${report.title}`} data-report-actions disabled={busy} />
            </MenuTrigger>
            <MenuPopover className={`${menuStyles.popover} ${styles.actionMenu}`}><MenuList>
              {hiddenReports.has(report.id) ? <MenuItem onClick={() => showReport(report)}>Show in Studio</MenuItem> : null}
              {report.publication ? <>
                {report.project && report.unpublishedChanges ? <MenuItem onClick={() => startAction({ kind: "restore", report })}>Restore published version</MenuItem> : null}
                {hiddenReports.has(report.id) || (report.project && report.unpublishedChanges) ? <MenuDivider className={styles.actionDivider} /> : null}
                <MenuItem className={styles.dangerAction} icon={<LiveOff20Regular aria-hidden="true" />} onClick={() => startAction({ kind: "remove", report })}>Remove from Glint Labs</MenuItem>
              </> : <>
                {hiddenReports.has(report.id) ? <MenuDivider className={styles.actionDivider} /> : null}
                <MenuItem className={styles.dangerAction} icon={<Dismiss20Regular aria-hidden="true" />} onClick={() => startAction({ kind: "delete", report })}>Delete draft</MenuItem>
              </>}
            </MenuList></MenuPopover>
          </Menu>
        </footer>
      </article>;
      })}
    </div>
    {visible.length === 0 ? <div className={styles.empty} role="status">
      <Image alt="" src="/figma/illustrations/blue/report.png" width={96} height={96} />
      <h2>{filter === "hidden" ? "No hidden reports" : reports.length > 0 ? "No matching reports" : publications === undefined && !listError ? "Loading reports…" : "Your reports start here"}</h2>
      <p>{filter === "hidden" ? "Removed local copies appear here. Choose All reports to return to your library."
        : reports.length > 0 ? "Choose All reports to see your reports." : "Select New report to start with a Word document."}</p>
    </div> : null}
    <dialog ref={dialogRef} className={`${styles.dialog} ${confirmationAction ? styles.deleteDialog : ""}`}
      aria-labelledby="library-action-title" aria-describedby="library-action-description"
      onCancel={event => { event.preventDefault(); closeAction(); }}
      onKeyDown={event => {
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)"));
        const first = controls[0], last = controls.at(-1);
        if ((!event.shiftKey && document.activeElement === last) || (event.shiftKey && document.activeElement === first)) {
          event.preventDefault(); (event.shiftKey ? last : first)?.focus();
        }
      }}>
      <div className={styles.dialogHeader}>
        <h2 id="library-action-title">{pending?.kind === "delete" ? "Delete draft?" : pending?.kind === "restore" ? "Restore published version?" : pending?.kind === "remove" ? "Remove from Glint Labs?" : "Open in Studio"}</h2>
        {confirmationAction ? <Button appearance="subtle" className={styles.dialogClose} icon={<Dismiss20Regular aria-hidden="true" />}
          aria-label="Close dialog" disabled={busy} onClick={closeAction} /> : null}
      </div>
      <p id="library-action-description">{pending?.kind === "delete"
        ? `Delete “${pending.report.title}” from this device? Your Word file won't be changed.`
        : pending?.kind === "restore" ? `Replace the local draft of “${pending.report.title}” with the published preview in this environment, not production? Your unpublished changes will be discarded. Published reports and your Word file won't change.`
        : pending?.kind === "remove" ? <><strong><em>{pending.report.title}</em></strong> will no longer be available on Glint Labs. Your draft and Word file will be kept.</>
          : "Enter your publishing code to open an editable copy on this device. Reconnect the original Word file before publishing changes."}</p>
      {needsCode ? <label className={styles.code}>Publishing code<input ref={codeRef} type="password" value={code}
        autoComplete="off" disabled={busy} onChange={event => setCode(event.target.value)} /></label> : null}
      {actionError ? <p className={styles.error} role="alert">{actionError}{conflict ? " Close this dialog and review the refreshed reports before trying again." : ""}</p> : null}
      <div className={styles.dialogActions}>
        <Button ref={cancelRef} appearance="outline" disabled={busy} onClick={closeAction}>{conflict ? "Close" : "Cancel"}</Button>
        <Button appearance="primary" className={confirmationAction ? styles.deletePrimary : undefined}
          icon={pending?.kind === "remove" ? <LiveOff20Regular aria-hidden="true" /> : undefined}
          disabled={busy || conflict || (needsCode && !code.trim())} onClick={() => { void confirmAction(); }}>
          {busy ? "Working…" : pending?.kind === "delete" ? "Delete draft" : pending?.kind === "restore" ? "Restore version" : pending?.kind === "remove" ? "Remove report" : "Open report"}
        </Button>
      </div>
    </dialog>
  </div>;
}
