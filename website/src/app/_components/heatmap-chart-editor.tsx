"use client";

import { Button } from "@fluentui/react-button";
import { Body1Strong, Caption1, Subtitle1 } from "@fluentui/react-text";
import { Add16Regular } from "@fluentui/react-icons/svg/add";
import { Delete16Regular } from "@fluentui/react-icons/svg/delete";
import { Dismiss20Regular } from "@fluentui/react-icons/svg/dismiss";
import { useEffect, useMemo, useRef, useState } from "react";
import { heatmapPresentationSchema, type ReportBlock } from "../../manifest/report-manifest";
import { canonicalJson } from "../../integrity/approved-content";
import { createStudioChartSource, validateChartTable, type ChartTable } from "../../visualization/chart-authoring";
import { createVerifiedDataVisual } from "../../visualization/verified-data-visual";
import type { VerifiedChartEditorProps } from "./verified-chart-editor";
import styles from "./publishing-studio.module.css";
import matrixStyles from "./heatmap-chart-editor.module.css";

type HeatmapBlock = Extract<ReportBlock, { type: "coefficient-heatmap" }>;

export function HeatmapChartEditor({ block, source: providedSource, onPreview, onDraftPreview, onDone, onCancel, onRemove, intent = "edit" }: VerifiedChartEditorProps) {
  const source = providedSource ?? (block.type === "coefficient-heatmap" && block.verifiedSource ? {
    id: block.id, type: "data-visual-source" as const, data: block.verifiedSource, source: block.source,
  } : undefined);
  const original = useRef(source);
  const container = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"content" | "scale">("content");
  const [table, setTable] = useState<ChartTable>(() => {
    const data = source?.data ?? (block.type === "coefficient-heatmap" ? block.verifiedSource : undefined);
    return data ? { columns: [...data.columns], rows: data.rows.map(row => ({ ...row, cells: [...row.cells] })) }
      : { columns: ["Factor", "Period 1", "Period 2", "Period 3"], rows: Array.from({ length: 2 }, (_, index) => ({
        id: `${block.id}-row-${index + 1}`, cells: ["", "", "", ""],
      })) };
  });
  const sourceName = original.current?.data.title.trim().slice(0, 200) || "Coefficient table";
  const [settings, setSettings] = useState(() => {
    const initial = block.type === "coefficient-heatmap" ? block.presentation : undefined;
    const parsed = heatmapPresentationSchema.parse({ title: block.type === "coefficient-heatmap" ? block.title : "Coefficient heatmap", ...initial });
    return { ...parsed, scaleMin: String(parsed.scaleMin), scaleMax: String(parsed.scaleMax), decimals: String(parsed.decimals) };
  });
  const [preparationError, setPreparationError] = useState<string>();
  const [prepared, setPrepared] = useState<{ block: HeatmapBlock; table: ChartTable; settings: typeof settings; sourceName: string }>();
  const draft = prepared?.table === table && prepared.settings === settings && prepared.sourceName === sourceName ? prepared.block : undefined;
  const errors = useMemo(() => validateChartTable(table, "number", "coefficient-heatmap"), [table]);
  const presentation = useMemo(() => heatmapPresentationSchema.safeParse({
    ...settings,
    scaleMin: settings.scaleMin.trim() ? Number(settings.scaleMin) : NaN,
    scaleMax: settings.scaleMax.trim() ? Number(settings.scaleMax) : NaN,
    decimals: settings.decimals.trim() ? Number(settings.decimals) : NaN,
  }), [settings]);
  const verifiedAt = useRef(new Date().toISOString()).current;

  useEffect(() => { container.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    setPrepared(undefined);
    setPreparationError(undefined);
    if (errors.length || !presentation.success) return;
    let active = true;
    const unchanged = original.current?.data.unit === "number" &&
      canonicalJson({ columns: original.current.data.columns, rows: original.current.data.rows }) === canonicalJson(table);
    const preparation = unchanged ? Promise.resolve(original.current!) : createStudioChartSource({
      id: block.id, table, sourceName, synthetic: source?.data.synthetic ?? false,
      original: original.current, unit: "number", visualType: "coefficient-heatmap",
    });
    preparation.then(data => {
      if (!active) return;
      const visual = createVerifiedDataVisual(data, "coefficient-heatmap", verifiedAt);
      if (visual.type === "coefficient-heatmap") setPrepared({
        block: { ...visual, presentation: presentation.data }, table, settings, sourceName,
      });
    }).catch(error => {
      if (active) setPreparationError(error instanceof Error ? error.message : "The coefficient table could not be prepared.");
    });
    return () => { active = false; };
  }, [block.id, errors.length, presentation, settings, source?.data.synthetic, sourceName, table, verifiedAt]);
  useEffect(() => { if (draft) onPreview(draft); }, [draft, onPreview]);
  useEffect(() => {
    onDraftPreview?.(!draft ? {
      blockId: block.id, type: "coefficient-heatmap", title: settings.title, subtitle: settings.subtitle, note: settings.note,
      table, unit: "number", heatmapPresentation: presentation.success ? presentation.data : undefined,
    } : undefined);
  }, [block.id, draft, onDraftPreview, presentation, settings.note, settings.subtitle, settings.title, table]);

  function textField(key: "title" | "subtitle" | "note" | "missingLabel" | "legendLabel", label: string, maxLength: number) {
    return <label className={styles.field}><Body1Strong>{label}</Body1Strong>
      <input type="text" value={settings[key]} maxLength={maxLength}
        onChange={event => setSettings(current => ({ ...current, [key]: event.target.value }))} />
    </label>;
  }
  function updateCell(rowId: string, column: number, value: string) {
    setTable(current => ({ ...current, rows: current.rows.map(row => row.id === rowId
      ? { ...row, cells: row.cells.map((cell, index) => index === column ? value : cell) } : row) }));
  }
  const tabs = ["content", "scale"] as const;
  return <div ref={container} className={styles.chartEditor} role="group" aria-label="Heatmap settings" tabIndex={-1}
    onKeyDown={event => {
      if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); onCancel(); }
    }}>
    <div>
    <header className={styles.chartEditorHeader}>
      <h2><Subtitle1>Coefficient heatmap</Subtitle1></h2>
      <Button type="button" appearance="subtle" className={styles.chartEditorDismiss} aria-label="Close chart editor"
        icon={<Dismiss20Regular aria-hidden="true" />} onClick={onCancel} />
    </header>
    <div className={styles.chartEditorTools}>
    <div className={styles.chartTabs} role="tablist" aria-label="Heatmap editing">
      {tabs.map(value => <button key={value} type="button" role="tab" aria-selected={tab === value}
        tabIndex={tab === value ? 0 : -1} id={`${block.id}-${value}-tab`} aria-controls={`${block.id}-heatmap-panel`}
        onClick={() => setTab(value)} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? "content" : event.key === "End" ? "scale" : value === "content" ? "scale" : "content";
          setTab(next);
          document.getElementById(`${block.id}-${next}-tab`)?.focus();
        }}>{value === "content" ? "Content" : "Scale"}</button>)}
    </div>
    </div>
    </div>
    <div className={styles.chartEditorContent}>
    <section className={styles.chartEditorBody} role="tabpanel" id={`${block.id}-heatmap-panel`}
      aria-labelledby={`${block.id}-${tab}-tab`}>
      {tab === "content" ? <>
        {textField("title", "Title", 240)}
        {textField("subtitle", "Subtitle (optional)", 240)}
        <Caption1 block>Use coefficient numbers such as .147, not percentages. Blank cells and N/A remain unavailable, never zero.</Caption1>
        <div className={matrixStyles.scroll} role="region" aria-label="Editable heatmap data; scroll for more periods" tabIndex={0}>
          <table className={matrixStyles.matrix}>
            <caption className={styles.chartCellLabel}>Heatmap data</caption>
            <thead><tr>{table.columns.map((column, index) => <th key={index} scope="col">
              <label><span className={styles.chartCellLabel}>{index ? `Period ${index} name` : "Factor column name"}</span>
                <input aria-label={index ? `Period ${index} name` : "Factor column name"} value={column} maxLength={100}
                  onChange={event => setTable(current => ({ ...current, columns: current.columns.map((name, i) => i === index ? event.target.value : name) }))} />
              </label>
              {index ? <Button type="button" appearance="subtle" aria-label={`Remove period ${index}`} disabled={table.columns.length <= 2}
                icon={<Delete16Regular aria-hidden="true" />} onClick={() => setTable(current => ({
                  columns: current.columns.filter((_, i) => i !== index),
                  rows: current.rows.map(row => ({ ...row, cells: row.cells.filter((_, i) => i !== index) })),
                }))} /> : null}
            </th>)}<th scope="col"><span className={styles.chartCellLabel}>Remove factor</span></th></tr></thead>
            <tbody>{table.rows.map((row, rowIndex) => <tr key={row.id}>
              {row.cells.map((cell, column) => <td key={column}>
                <label><span className={styles.chartCellLabel}>{column ? `${table.columns[column]}, factor ${rowIndex + 1}` : `Factor ${rowIndex + 1} name`}</span>
                  <input aria-label={column ? `${table.columns[column]}, factor ${rowIndex + 1}` : `Factor ${rowIndex + 1} name`}
                    type="text" value={cell} maxLength={column ? 24 : 160}
                    aria-invalid={Boolean(cell.trim()) && errors.some(error => error.row === rowIndex && error.column === column)}
                    onChange={event => updateCell(row.id, column, event.target.value)} />
                </label>
              </td>)}
              <td><Button type="button" appearance="subtle" aria-label={`Remove factor ${rowIndex + 1}`} disabled={table.rows.length <= 2}
                icon={<Delete16Regular aria-hidden="true" />}
                onClick={() => setTable(current => ({ ...current, rows: current.rows.filter(item => item.id !== row.id) }))} /></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className={matrixStyles.actions}>
          <Button type="button" appearance="outline" icon={<Add16Regular aria-hidden="true" />} disabled={table.rows.length >= 12}
            onClick={() => setTable(current => ({ ...current, rows: [...current.rows,
              { id: crypto.randomUUID(), cells: current.columns.map(() => "") }] }))}>Add factor</Button>
          <Button type="button" appearance="outline" icon={<Add16Regular aria-hidden="true" />} disabled={table.columns.length >= 13}
            onClick={() => setTable(current => ({ columns: [...current.columns, `Period ${current.columns.length}`],
              rows: current.rows.map(row => ({ ...row, cells: [...row.cells, ""] })) }))}>Add period</Button>
        </div>
        {textField("note", "Note (optional)", 500)}
      </> : <>
        <Caption1 block>Five equal-width Glint blue bands. Values outside the range use the end colors without changing the data.</Caption1>
        {(["scaleMin", "scaleMax", "decimals"] as const).map(key => <label className={styles.field} key={key}>
          <Body1Strong>{key === "scaleMin" ? "Scale minimum" : key === "scaleMax" ? "Scale maximum" : "Decimal places"}</Body1Strong>
          <input type="text" inputMode={key === "decimals" ? "numeric" : "decimal"} value={settings[key]} maxLength={24}
            onChange={event => setSettings(current => ({ ...current, [key]: event.target.value }))} />
        </label>)}
        {textField("legendLabel", "Legend label", 100)}
        {textField("missingLabel", "Missing value label", 40)}
      </>}
      {!presentation.success ? <p className={matrixStyles.errors} role="alert">{presentation.error.issues.map(issue => issue.message).join(" ")}</p> : null}
      {preparationError ? <p className={matrixStyles.errors} role="alert">{preparationError}</p> : null}
      {errors.length ? <p className={matrixStyles.errors}>{errors[0].message}</p> : null}
    </section>
    </div>
    <footer className={styles.chartEditorFooter}>
      {intent !== "insert" && block.source.part === "studio" ? <Button type="button" appearance="subtle" icon={<Delete16Regular aria-hidden="true" />} onClick={onRemove}>Remove chart</Button> : null}
      <div className={styles.editorActions}>
        <Button type="button" className={styles.chartAction} onClick={onCancel}>Cancel</Button>
        <Button type="button" appearance="primary" className={`${styles.chartAction} ${styles.chartPrimaryAction}`} disabled={!draft}
          onClick={() => { if (draft) onDone({ ...draft, verifiedSource: { ...draft.verifiedSource!, verifiedAt: new Date().toISOString() } }); }}>Apply changes</Button>
      </div>
    </footer>
  </div>;
}
