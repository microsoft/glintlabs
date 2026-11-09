"use client";

import { Button } from "@fluentui/react-button";
import { Dropdown, Option } from "@fluentui/react-combobox";
import { ChevronDown16Regular } from "@fluentui/react-icons/svg/chevron-down";
import { Dismiss20Regular } from "@fluentui/react-icons/svg/dismiss";
import { Body1, Body1Strong, Caption1 } from "@fluentui/react-text";
import { useEffect, useMemo, useRef, useState } from "react";
import { quadrantPresentationSchema, type StructuredData } from "../../manifest/report-manifest.ts";
import { readQuadrantWorkbook, selectQuadrantTable } from "../../extraction/quadrant-workbook.ts";
import { quadrantWorkbookSource, readQuadrantFile, rememberQuadrantWorkbook } from "../../project/quadrant-workbook-source.ts";
import { wordSourcePicker, type WordSourceHandle } from "../../project/word-source-file.ts";
import { listeningPortfolioError, quadrantGeometry, quadrantNumber, quadrantPresets, type QuadrantBlock, type QuadrantPresentation } from "../../visualization/quadrant-data.ts";
import { compatibleVerifiedVisuals, createVerifiedDataVisual } from "../../visualization/verified-data-visual.ts";
import { quadrantExcelTemplate } from "../../visualization/quadrant-template.ts";
import type { VerifiedChartEditorProps } from "./verified-chart-editor";
import styles from "./publishing-studio.module.css";

export function QuadrantChartEditor({ block, source, onPreview, onDone, onCancel, onRemove, sourceFolder }: VerifiedChartEditorProps) {
  const [data, setData] = useState(source);
  const [wordSource, setWordSource] = useState<StructuredData | undefined>(block.type === "quadrant-scatter-plot" ? block.wordSource : undefined);
  const [presentation, setPresentation] = useState<QuadrantPresentation>(() => quadrantPresentationSchema.parse(
    block.type === "quadrant-scatter-plot" && block.presentation ? block.presentation : {
      title: (source?.data.title ?? "2×2 quadrant").slice(0, 240),
      xUnit: source?.data.rows.every(row => row.cells[2]?.endsWith("%")) ? "percentage" : "number",
      yUnit: source?.data.rows.every(row => row.cells[3]?.endsWith("%")) ? "percentage" : "number",
    }));
  const [thresholds, setThresholds] = useState([String(presentation.xSplit ?? ""), String(presentation.ySplit ?? "")]);
  const [handle, setHandle] = useState<WordSourceHandle>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const lifecycle = useRef({ version: 0 }).current;
  const verifiedAt = useRef(new Date().toISOString()).current;
  const normalized = useMemo(() => quadrantPresentationSchema.safeParse({ ...presentation,
    xSplit: quadrantNumber(thresholds[0]), ySplit: quadrantNumber(thresholds[1]),
  }), [presentation, thresholds]);
  const presetError = presentation.preset === "listening" && data
    ? listeningPortfolioError(data.data) || (presentation.xUnit !== "percentage-points" || presentation.yUnit !== "percentage"
      ? "The listening preset uses percentage points for X and percentages for Y. Choose General 2×2 for other units." : undefined)
    : undefined;
  const draft = useMemo(() => {
    if (!data || !normalized.success || !compatibleVerifiedVisuals(data).includes("quadrant-scatter-plot")) return;
    return { ...createVerifiedDataVisual(data, "quadrant-scatter-plot", verifiedAt),
      wordSource, presentation: normalized.data } as QuadrantBlock;
  }, [data, normalized, verifiedAt, wordSource]);
  useEffect(() => { root.current?.focus({ preventScroll: true }); return () => { lifecycle.version++; }; }, [lifecycle]);
  useEffect(() => { if (draft) onPreview(draft); }, [draft, onPreview]);
  async function connect(file?: File) {
    const request = ++lifecycle.version;
    setError(undefined);
    try {
      const picker = wordSourcePicker();
      if (!file && !picker) { input.current?.click(); return; }
      const selectedHandle = file ? undefined : (await picker!({ id: "publishing-studio-quadrant", multiple: false }))[0];
      if (!file && !selectedHandle) return;
      setBusy(true);
      const selectedFile = file ?? await readQuadrantFile(selectedHandle!);
      const originalWord = wordSource ?? (source && source.source.part !== "studio" ? source.data : undefined);
      const table = selectQuadrantTable(await readQuadrantWorkbook(selectedFile.name, await selectedFile.arrayBuffer()), {
        tableName: data?.data.workbook?.fileName === selectedFile.name ? data.data.workbook.tableName : undefined,
        cache: originalWord,
      });
      const next = await quadrantWorkbookSource(table, { id: block.id,
        title: source?.data.title ?? "2×2 quadrant", original: source,
        connectionId: selectedHandle ? crypto.randomUUID() : undefined });
      if (request !== lifecycle.version) return;
      setData(next); setWordSource(originalWord); setHandle(selectedHandle);
    } catch (cause) {
      if (request === lifecycle.version && !(cause instanceof DOMException && cause.name === "AbortError")) {
        setError(cause instanceof Error ? cause.message : "The Excel workbook couldn't be connected.");
      }
    } finally { if (request === lifecycle.version) setBusy(false); }
  }
  function field(key: "title" | "subtitle" | "note" | "xLabel" | "yLabel", label: string, maximum: number) {
    return <label className={styles.field}><Body1Strong>{label}</Body1Strong>
      <input type="text" maxLength={maximum} value={presentation[key]} placeholder={`Add ${label.toLowerCase()}`}
        aria-invalid={(key === "title" || key === "xLabel" || key === "yLabel") && !presentation[key].trim()}
        onChange={event => setPresentation(value => ({ ...value, [key]: event.target.value }))} /></label>;
  }
  function select(key: "preset" | "splitMode" | "xUnit" | "yUnit", label: string, choices: [string, string][]) {
    return <label className={styles.field}><Body1Strong>{label}</Body1Strong>
      <Dropdown aria-label={label} className={styles.chartChoice} button={{ className: styles.chartChoiceButton }}
        listbox={{ className: styles.chartControlPopup }} selectedOptions={[presentation[key]]}
        value={choices.find(([value]) => value === presentation[key])?.[1] ?? ""}
        onOptionSelect={(_, option) => {
          const value = option.optionValue;
          if (!value) return;
          if (key === "preset") {
            const preset = value as "general" | "listening";
            setPresentation(previous => ({ ...previous, ...quadrantPresets[preset], quadrants: [...quadrantPresets[preset].quadrants], preset }));
          } else if (key === "splitMode" && value === "manual") {
            const geometry = draft ? quadrantGeometry(draft.points) : undefined;
            setThresholds(previous => [previous[0] || String(geometry?.xSplit ?? 0), previous[1] || String(geometry?.ySplit ?? 0)]);
            setPresentation(previous => ({ ...previous, splitMode: "manual" }));
          } else setPresentation(previous => ({ ...previous, [key]: value }));
        }}>
        {choices.map(([value, name]) => <Option key={value} value={value} className={styles.chartMenuItem}>{name}</Option>)}
      </Dropdown></label>;
  }
  const linkedWorkbook = block.type === "quadrant-scatter-plot" ? block.wordSource?.linkedWorkbookFileName : source?.data.linkedWorkbookFileName;
  const folderSource = linkedWorkbook && linkedWorkbook === data?.data.workbook?.fileName ? sourceFolder : undefined;
  const sourceActions = <>
    <div className={styles.chartDataActions}>
      <Button type="button" appearance="outline" className={styles.chartAction} disabled={busy} onClick={() => void connect()}>
        {busy ? "Reading Excel…" : data?.data.workbook ? "Reconnect Excel" : "Connect Excel"}
      </Button>
      <Button type="button" appearance="outline" className={styles.chartAction} disabled={busy} onClick={async () => {
        try {
          const bytes = await quadrantExcelTemplate();
          const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes).buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
          const link = document.createElement("a"); link.href = url; link.download = "quadrant-chart-template.xlsx"; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch { setError("The Excel template couldn't be downloaded. Try again."); }
      }}>Download template</Button>
    </div>
  </>;
  return <div className={styles.chartEditor} ref={root} tabIndex={-1} role="group" aria-label="Chart settings">
    <header className={styles.chartEditorHeader}><Body1Strong>2×2 quadrant</Body1Strong>
      <Button type="button" appearance="subtle" disabled={busy} className={styles.chartEditorDismiss}
        icon={<Dismiss20Regular aria-hidden="true" />} aria-label="Close chart editor" onClick={onCancel} /></header>
    <div className={styles.chartEditorContent}><section className={styles.chartEditorBody}>
      {error ? <Body1 role="alert" className={styles.inputError} block>{error}</Body1> : null}
      {presetError ? <Body1 role="alert" className={styles.inputError} block>{presetError}</Body1> : null}
      <section aria-label="Data source" className={styles.chartDataGuidance}>
        <Body1Strong block>{data?.data.workbook ? "Data source" : "Connect Excel data"}</Body1Strong>
        <Body1 block>{data?.data.workbook ? `${data.data.workbook.fileName} · ${data.data.workbook.tableName}`
          : "Load chart points from an Excel workbook."}</Body1>
        <Caption1 block>Edit data in Excel and appearance in Studio.</Caption1>
        {folderSource ? <>
          <Caption1 block>{folderSource.status === "connected"
            ? `Folder: ${folderSource.name}. Save updates in Excel and Word, finish chart edits, then select Refresh from Word.`
            : folderSource.status === "access-needed"
              ? "Folder access needed. Finish chart edits, then select Allow folder access in Document > Sources."
              : "Source folder unavailable. Finish chart edits, then check Document > Sources."}</Caption1>
          <details className={styles.chartSupportingTextEditor}>
            <summary>Other source options<ChevronDown16Regular aria-hidden="true" /></summary>
            {sourceActions}
          </details>
        </> : sourceActions}
        {!folderSource && data?.data.workbook && !data.data.workbook.connectionId && !handle ?
          <Caption1 block>To load updated values, select Reconnect Excel.</Caption1> : null}
        <details className={styles.chartSupportingTextEditor}>
          <summary>Excel setup<ChevronDown16Regular aria-hidden="true" /></summary>
          <div className={styles.chartSupportingBullets}>
            <Caption1 block>Use the template&apos;s column names and keep Point IDs unchanged.</Caption1>
            <Caption1 block>Replace sample rows with approved data. To link the chart in Word, use Paste Link.</Caption1>
            <Caption1 block>Update the linked chart in Word and save both files before selecting Refresh from Word.</Caption1>
          </div>
        </details>
        <input ref={input} hidden type="file" aria-label="Excel quadrant workbook" onChange={event => {
          const file = event.target.files?.[0]; event.target.value = ""; if (file) void connect(file);
        }} />
      </section>
      {field("title", "Title", 240)}{field("subtitle", "Instructions (optional)", 500)}
      {select("preset", "Preset", [["general", "General 2×2"], ["listening", "Listening portfolio"]])}
      {field("xLabel", "X-axis label", 80)}
      {select("xUnit", "X-axis unit", [["number", "Number"], ["percentage", "Percentage"], ["percentage-points", "Percentage points"]])}
      {field("yLabel", "Y-axis label", 80)}
      {select("yUnit", "Y-axis unit", [["number", "Number"], ["percentage", "Percentage"], ["percentage-points", "Percentage points"]])}
      {select("splitMode", "Quadrant splits", [["median", "Median of current data"], ["manual", "Manual thresholds"]])}
      <Caption1 block>Median splits recalculate when source values change. Manual thresholds stay fixed.</Caption1>
      {presentation.splitMode === "manual" ? thresholds.map((value, index) => <label key={index} className={styles.field}>
        <Body1Strong>{index ? "Y-axis threshold" : "X-axis threshold"}</Body1Strong>
        <input type="text" inputMode="decimal" value={value} placeholder="Enter a number"
          aria-invalid={quadrantNumber(value) === undefined} onChange={event =>
            setThresholds(previous => previous.map((entry, position) => position === index ? event.target.value : entry))} />
      </label>) : null}
      {presentation.quadrants.map((value, index) => <label className={styles.field} key={index}>
        <Body1Strong>{["Top left", "Top right", "Bottom left", "Bottom right"][index]} quadrant label</Body1Strong>
        <input type="text" maxLength={100} value={value} placeholder="Add quadrant label" onChange={event =>
          setPresentation(previous => ({ ...previous, quadrants: previous.quadrants.map((label, position) =>
            position === index ? event.target.value : label) as QuadrantPresentation["quadrants"] }))} />
      </label>)}
      {field("note", "Note (optional)", 2000)}
      {data && draft ? <section className={styles.chartTableSection} aria-label="Original Excel values">
        <Body1Strong block>Source points · {draft.points.length}</Body1Strong>
        {draft.points.map((point, index) => <details key={point.id} className={styles.chartSupportingTextEditor}>
          <summary>{index + 1}. {point.label}</summary>
          <div className={styles.chartSupportingBullets}>
            <Caption1 block>Point ID: {point.id}</Caption1>
            <Body1 block>{presentation.xLabel}: {data.data.rows[index].cells[2]} · {presentation.yLabel}: {data.data.rows[index].cells[3]}</Body1>
            <Body1 block>{point.description}</Body1>
            {point.breakdown.map(item => <Caption1 block key={item.label}>{item.label}: {item.displayValue}</Caption1>)}
          </div>
        </details>)}
      </section> : null}
      {!normalized.success ? <Caption1 className={styles.inputError} role="alert">
        Add a title, both axis labels, and valid thresholds before applying.
      </Caption1> : null}
    </section></div>
    <footer className={styles.chartEditorFooter}>
      {block.source.part === "studio" ? <Button type="button" appearance="subtle" disabled={busy}
        className={`${styles.chartAction} ${styles.chartDangerAction}`} onClick={onRemove}>Remove chart</Button> : null}
      <div className={styles.editorActions}>
      <Button type="button" disabled={busy} className={styles.chartAction} onClick={onCancel}>Cancel</Button>
      <Button type="button" appearance="primary" className={`${styles.chartAction} ${styles.chartPrimaryAction}`} disabled={!draft || busy || Boolean(presetError)} onClick={async () => {
        if (!draft) return;
        const request = ++lifecycle.version;
        setBusy(true);
        try {
          if (handle && draft.verifiedSource?.workbook?.connectionId) await rememberQuadrantWorkbook(draft.verifiedSource.workbook.connectionId, handle);
          if (request === lifecycle.version) onDone(draft);
        } catch {
          if (request === lifecycle.version) setError("The Excel connection couldn't be saved. Try again; your draft hasn't changed.");
        } finally { if (request === lifecycle.version) setBusy(false); }
      }}>Apply changes</Button>
      </div>
    </footer>
  </div>;
}
