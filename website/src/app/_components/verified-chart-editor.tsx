"use client";

import { Button } from "@fluentui/react-button";
import { Dropdown, Option } from "@fluentui/react-combobox";
import { Add16Regular } from "@fluentui/react-icons/svg/add";
import { Checkmark16Regular } from "@fluentui/react-icons/svg/checkmark";
import { ChevronDown16Regular } from "@fluentui/react-icons/svg/chevron-down";
import { Delete16Regular } from "@fluentui/react-icons/svg/delete";
import { Dismiss20Regular } from "@fluentui/react-icons/svg/dismiss";
import { Body1, Body1Strong, Caption1 } from "@fluentui/react-text";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  chartPresentationSchema,
  pairedComparisonPresentationSchema,
  type ChartPresentation,
  type ReportBlock,
} from "../../manifest/report-manifest.ts";
import {
  createStudioChartSource,
  validateChartTable,
  type ChartTable,
} from "../../visualization/chart-authoring.ts";
import {
  compatibleVerifiedVisuals,
  createVerifiedDataVisual,
  parseChartValue,
  type ChartValueType,
  type DataVisualSourceBlock,
  type VerifiedDataVisualType,
} from "../../visualization/verified-data-visual.ts";
import { sortChartItems } from "../../visualization/chart-order.ts";
import type { ChartDraftPreviewData } from "../../report-system/chart-draft-preview";
import styles from "./publishing-studio.module.css";

type EditableData = { table: ChartTable; sourceName: string; synthetic: boolean };
type Props = {
  block: ReportBlock;
  source?: DataVisualSourceBlock;
  onPreview: (block: ReportBlock, editingOrder?: string[]) => void;
  onDraftPreview?: (draft: ChartDraftPreviewData | undefined) => void;
  onDone: (block: ReportBlock) => void;
  onCancel: () => void;
  onRemove: () => void;
  initialType?: VerifiedDataVisualType;
  intent?: "edit" | "insert";
};

export function VerifiedChartEditor({ block, source, onPreview, onDraftPreview, onDone, onCancel, onRemove, initialType = "horizontal-bar-chart", intent = "edit" }: Props) {
  const tabs = ["data", "palette"] as const;
  const chartChoices = [
    { type: "horizontal-bar-chart", title: "Bar chart", rows: undefined },
    { type: "paired-percentage-comparison", title: "Paired comparison", rows: 2 },
    { type: "percentage-ring-group", title: "Percentage rings", rows: 3 },
    { type: "grouped-column-comparison", title: "Percentage comparison grid", rows: 4 },
  ] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]>("data");
  const typeButton = useRef<HTMLButtonElement>(null);
  const [dataSource, setDataSource] = useState(source);
  const [editable, setEditable] = useState<EditableData | undefined>(() => {
    if (intent !== "insert") return;
    const columns = initialType === "grouped-column-comparison" ? ["Label", "Series 1", "Series 2"] : ["Label", "Value"];
    const rows = initialType === "percentage-ring-group" ? 3 : initialType === "grouped-column-comparison" ? 4 : 2;
    return {
      table: { columns, rows: Array.from({ length: rows }, (_, index) => ({
        id: `${block.id}-row-${index + 1}`, cells: columns.map(() => ""),
      })) },
      sourceName: "Chart data", synthetic: false,
    };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [valueType, setValueType] = useState<ChartValueType>(source?.data.unit === "number" ? "number" : "percentage");
  const [frozenOrder, setFrozenOrder] = useState<string[]>();
  const [touchedCells, setTouchedCells] = useState<Set<string>>(() => new Set());
  const [selectedType, setSelectedType] = useState<VerifiedDataVisualType | undefined>(
    block.type === "horizontal-bar-chart" || block.type === "percentage-ring-group" || block.type === "grouped-column-comparison" || block.type === "paired-percentage-comparison"
      ? block.type : source ? compatibleVerifiedVisuals(source)[0] : initialType,
  );
  const [presentation, setPresentation] = useState<ChartPresentation>(
    (block.type === "horizontal-bar-chart" || block.type === "paired-percentage-comparison" ||
      block.type === "percentage-ring-group" || block.type === "grouped-column-comparison") && block.presentation
      ? { subtitle: "", density: "comfortable", sort: "source", ...block.presentation } : {
      title: source?.data.title ?? (intent === "insert" ? "Comparison" : "Percentage comparison"), subtitle: "", note: "",
      palette: "brand", density: "comfortable", sort: "source",
    },
  );
  const [leadIns, setLeadIns] = useState<[string, string]>(
    block.type === "paired-percentage-comparison" && block.presentation ? block.presentation.leadIns : ["", ""],
  );
  const isPaired = selectedType === "paired-percentage-comparison";
  const isGrouped = selectedType === "grouped-column-comparison";
  const visibleTabs = tabs.filter(value => value !== "palette" || selectedType === "horizontal-bar-chart" || isPaired);
  const chartChoice = chartChoices.find(choice => choice.type === selectedType);
  const requiredRows = chartChoice?.rows;
  const fixedRows = Boolean(requiredRows);
  const palettes = { brand: "Glint Labs", blue: "Blue", teal: "Teal" };
  const orders = { source: "Source order", descending: "Highest to lowest", ascending: "Lowest to highest", alphabetical: "Alphabetical" };
  const previewAt = useRef(
    ("verifiedSource" in block ? block.verifiedSource?.verifiedAt : undefined) ?? new Date().toISOString(),
  ).current;
  const tableDraft = useMemo<EditableData | undefined>(() => {
    if (editable) return editable;
    if (!selectedType || dataSource?.data.columns.length !== (isGrouped ? 3 : 2) || dataSource.data.unit === "unknown") return;
    return {
      table: {
        columns: [...dataSource.data.columns],
        rows: dataSource.data.rows.map(row => ({ ...row, cells: [...row.cells] })),
      },
      sourceName: dataSource.data.title.trim().slice(0, 200) || "Chart data",
      synthetic: dataSource.data.synthetic ?? false,
    };
  }, [dataSource, editable, isGrouped, selectedType]);
  const errors = useMemo(() => {
    if (!editable) return [];
    return validateChartTable(editable.table, valueType, selectedType);
  }, [editable, selectedType, valueType]);
  const displayedRows = useMemo(() => {
    const table = tableDraft?.table ?? dataSource?.data;
    if (!table) return [];
    const entries = table.rows.map((row, rowIndex) => ({
      row, rowIndex, label: row.cells[0].trim(), value: parseChartValue(row.cells[1], valueType) ?? 0,
      invalid: !row.cells[0].trim() || parseChartValue(row.cells[1], valueType) === undefined || errors.some(item => item.row === rowIndex),
    }));
    const order = selectedType === "horizontal-bar-chart" ? presentation.sort : "source";
    const sorted = order === "source" ? entries : [
      ...sortChartItems(entries.filter(entry => !entry.invalid), order),
      ...entries.filter(entry => entry.invalid),
    ];
    return frozenOrder ? [
      ...frozenOrder.flatMap(id => entries.filter(entry => entry.row.id === id)),
      ...entries.filter(entry => !frozenOrder.includes(entry.row.id)),
    ] : sorted;
  }, [dataSource, errors, frozenOrder, presentation.sort, selectedType, tableDraft, valueType]);
  const visibleErrors = errors.filter(item => item.row < 0 ||
    touchedCells.has(`${editable?.table.rows[item.row]?.id}:${item.column}`));
  const sourceNameValid = !editable || Boolean(editable.sourceName.trim() && editable.sourceName.length <= 200);
  const dataReady = Boolean(dataSource && !busy && !errors.length && sourceNameValid);
  const pairedPresentation = useMemo(() => ({
    title: presentation.title, note: presentation.note, palette: presentation.palette, leadIns,
  }), [leadIns, presentation.title, presentation.note, presentation.palette]);
  const presentationValid = isPaired ? pairedComparisonPresentationSchema.safeParse(pairedPresentation).success
    : chartPresentationSchema.safeParse(presentation).success;
  const draft = useMemo(() => {
    if (!dataReady || !dataSource || !selectedType || !compatibleVerifiedVisuals(dataSource).includes(selectedType) || !presentationValid) return;
    const visual = createVerifiedDataVisual(dataSource, selectedType, previewAt);
    return visual.type === "paired-percentage-comparison" ? { ...visual, presentation: pairedPresentation }
      : { ...visual, presentation };
  }, [dataReady, dataSource, pairedPresentation, presentation, presentationValid, previewAt, selectedType]);

  useEffect(() => { typeButton.current?.focus(); }, []);

  useEffect(() => {
    if (!editable || errors.length || !sourceNameValid) return;
    let active = true;
    createStudioChartSource({
      id: block.id, table: editable.table, sourceName: editable.sourceName,
      synthetic: editable.synthetic, original: source, unit: valueType, visualType: selectedType,
    }).then(next => {
      if (active) { setDataSource(next); setBusy(false); }
    }).catch(cause => {
      if (active) { setError(cause instanceof Error ? cause.message : "The table could not be prepared."); setBusy(false); }
    });
    return () => { active = false; };
  }, [block.id, editable, errors.length, selectedType, source, sourceNameValid, valueType]);

  useEffect(() => { if (draft) onPreview(draft, frozenOrder); }, [draft, frozenOrder, onPreview]);
  useEffect(() => {
    onDraftPreview?.(!draft && selectedType ? {
      blockId: block.id, type: selectedType, title: presentation.title,
      subtitle: !isPaired && selectedType !== "percentage-ring-group" ? presentation.subtitle : undefined,
      leadIns: isPaired ? leadIns : undefined,
      note: isPaired || (block.source.part !== "studio" && intent !== "insert") ? presentation.note : undefined,
      table: { columns: tableDraft?.table.columns ?? [], rows: displayedRows.map(entry => entry.row) }, unit: valueType,
    } : undefined);
  }, [block.id, block.source.part, displayedRows, draft, intent, isPaired, leadIns, onDraftPreview,
    presentation.note, presentation.subtitle, presentation.title, selectedType, tableDraft, valueType]);

  function changeData(next: EditableData) {
    setEditable(next);
    setBusy(true);
    setError(undefined);
  }
  function changeChartType(type: VerifiedDataVisualType) {
    const current = tableDraft ?? (dataSource ? {
      table: { columns: [...dataSource.data.columns], rows: dataSource.data.rows.map(row => ({ ...row, cells: [...row.cells] })) },
      sourceName: dataSource.data.title, synthetic: dataSource.data.synthetic ?? false,
    } : undefined);
    setSelectedType(type);
    setFrozenOrder(undefined);
    setTab("data");
    if (current) changeData(current);
    typeButton.current?.focus();
  }
  function changeValueType(next: ChartValueType) {
    if (next === valueType) return;
    setValueType(next);
    setFrozenOrder(undefined);
    if (tableDraft) {
      setTouchedCells(previous => new Set([...previous, ...tableDraft.table.rows
        .flatMap(row => row.cells.flatMap((cell, column) => column > 0 && cell.trim() ? [`${row.id}:${column}`] : []))]));
      changeData({ ...tableDraft, table: { ...tableDraft.table,
        rows: tableDraft.table.rows.map(row => ({
          ...row, cells: row.cells.map((cell, i) => next === "number" && i > 0 ? cell.replace(/%\s*$/, "").trim() : cell),
          ...(row.breakdown ? { breakdown: row.breakdown.map(detail => ({
            ...detail, value: next === "number" ? detail.value.replace(/%\s*$/, "").trim() : detail.value,
          })) } : {}),
        })) } });
    }
  }
  function replaceTable(table: ChartTable, sourceName: string, synthetic = intent !== "insert") {
    if (fixedRows) {
      const invalid = validateChartTable(table, valueType, selectedType);
      if (invalid.length) throw new Error(invalid[0].message);
    }
    setFrozenOrder(undefined);
    setTouchedCells(new Set(table.rows.flatMap(row => row.cells.map((_, column) => `${row.id}:${column}`))));
    changeData({ table, sourceName: sourceName.trim().slice(0, 200) || "Chart data", synthetic });
    setSelectedType(selectedType ?? "horizontal-bar-chart");
    setTab("data");
  }
  function copySource() {
    if (!dataSource || dataSource.data.columns.length !== 2 || dataSource.data.unit === "unknown") return;
    replaceTable({
      columns: [...dataSource.data.columns],
      rows: dataSource.data.rows.map(row => ({ ...row, cells: [...row.cells] })),
    }, dataSource.data.title, dataSource.data.synthetic ?? false);
  }
  function editCell(rowId: string, column: number, value: string) {
    if (!tableDraft) return;
    if (!frozenOrder) setFrozenOrder(displayedRows.map(entry => entry.row.id));
    changeData({
      ...tableDraft,
      table: { ...tableDraft.table, rows: tableDraft.table.rows.map(row =>
        row.id === rowId ? { ...row, cells: row.cells.map((cell, i) => i === column ? value : cell) } : row) },
    });
  }
  function supportingTextEditor(row: ChartTable["rows"][number], rowIndex: number) {
    const category = row.cells[0].trim() || `category ${rowIndex + 1}`;
    const text = row.supportingText ?? row.breakdown?.map(detail =>
      `${detail.label}: ${detail.value.replace(/%\s*$/, "").trim()}${valueType === "percentage" ? "%" : ""}`).join("\n") ?? "";
    const bullets = text.split(/\r\n?|\n/);
    const slotCount = Math.max(3, bullets.length + (bullets.at(-1)?.trim() ? 1 : 0));
    function changeBullets(lines: string[]) {
      if (!tableDraft) return;
      changeData({ ...tableDraft, table: { ...tableDraft.table,
        rows: tableDraft.table.rows.map(item => item.id === row.id
          ? { ...item, supportingText: lines.join("\n"), breakdown: undefined } : item),
      } });
    }
    return <details className={styles.chartSupportingTextEditor}>
      <summary aria-label={`Supporting bullets for ${category}`}>
        <span>Supporting bullets (optional)</span>
        <ChevronDown16Regular aria-hidden="true" />
      </summary>
      <div className={styles.chartSupportingBullets}>
        {Array.from({ length: slotCount }, (_, index) => <label key={index}
          className={`${styles.field} ${styles.chartSupportingBullet}`}>
          <span className={styles.chartCellLabel}>Supporting bullet {index + 1} for {category}</span>
          <input type="text" aria-label={`Supporting bullet ${index + 1} for ${category}`} value={bullets[index] ?? ""}
            onChange={event => {
              const next = Array.from({ length: Math.max(bullets.length, index + 1) }, (_, i) => bullets[i] ?? "");
              next[index] = event.target.value;
              changeBullets(next);
            }}
            onKeyDown={event => {
              if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.closest("details")?.querySelectorAll("input")[index + 1]?.focus();
            }}
            onPaste={event => {
              const pasted = event.clipboardData.getData("text/plain");
              if (!/[\r\n]/.test(pasted)) return;
              event.preventDefault();
              const input = event.currentTarget;
              const value = input.value.slice(0, input.selectionStart ?? 0) + pasted
                + input.value.slice(input.selectionEnd ?? input.value.length);
              const next = Array.from({ length: Math.max(bullets.length, index + 1) }, (_, i) => bullets[i] ?? "");
              next.splice(index, 1, ...value.split(/\r\n?|\n/));
              changeBullets(next);
            }} />
        </label>)}
      </div>
    </details>;
  }
  function textField(key: "title" | "subtitle" | "note") {
    return <label key={key} className={styles.field}>
      <Body1Strong>{key === "title" ? "Title" : key === "subtitle" ? "Subtitle (optional)" : "Note (optional)"}</Body1Strong>
      <input type="text" value={presentation[key]} maxLength={{ title: 120, subtitle: 240, note: 500 }[key]}
        placeholder={key === "title" ? "Chart title" : "Text..."}
        aria-invalid={key === "title" && (!presentation.title.trim() || presentation.title.length > 120)}
        onChange={event => setPresentation(value => ({ ...value, [key]: event.target.value }))} /></label>;
  }
  function leadInField(index: number) {
    if (index > 1) return null;
    return <label className={styles.field}>
      <Body1Strong>{index === 0 ? "First heading (optional)" : "Second heading (optional)"}</Body1Strong>
      <input type="text" maxLength={80} value={leadIns[index]} placeholder="Text..."
        onChange={event => setLeadIns(previous => index === 0
          ? [event.target.value, previous[1]] : [previous[0], event.target.value])} />
    </label>;
  }
  function dataGrid(prefix: string) {
    const table = tableDraft?.table ?? dataSource?.data;
    if (!table) return null;
    const headings = tableDraft ? isGrouped || table.columns.length > 2 ? ["Label", ...table.columns.slice(1)] : ["Label", "Value"] : table.columns;
    const canRemoveRows = tableDraft && (!fixedRows || table.rows.length > requiredRows!);
    const removeRow = (rowId: string, displayIndex: number) =>
      <Button className={styles.chartRemoveRow} type="button" appearance="subtle"
        aria-label={`Remove row ${displayIndex + 1}`} disabled={table.rows.length <= 2}
        icon={<Delete16Regular aria-hidden="true" />}
        onClick={() => { if (tableDraft) changeData({ ...tableDraft, table: {
          ...tableDraft.table, rows: table.rows.filter(item => item.id !== rowId),
        } }); }} />;
    return <>
      <div className={styles.chartCategoryList}
        onFocusCapture={() => { if (!frozenOrder) setFrozenOrder(displayedRows.map(entry => entry.row.id)); }}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFrozenOrder(undefined); }}
        onKeyDown={event => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing && event.target instanceof HTMLInputElement) {
            event.preventDefault();
            setFrozenOrder(undefined);
          }
        }}>
        {displayedRows.map(({ row, rowIndex }, displayIndex) => {
          const rowErrors = visibleErrors.filter(item => item.row === rowIndex);
          function cellInput(column: number, stacked = false) {
            const cell = row.cells[column];
            const label = `${headings[column]}${column > 0 && valueType === "percentage" ? " (%)" : ""}, row ${displayIndex + 1}`;
            return <label key={column} className={stacked ? styles.field : styles.chartCell}>
              {stacked ? <Body1Strong>{headings[column]}</Body1Strong> : <span className={styles.chartCellLabel}>{label}</span>}
              <input aria-label={label} type="text"
                inputMode={column ? "decimal" : "text"} maxLength={column ? 24 : 160}
                data-compact-value={column > 0 && cell.replace(/%\s*$/, "").trim().length > 4 ? true : undefined}
                value={column > 0 && valueType === "percentage" ? cell.replace(/%\s*$/, "").trim() : cell}
                aria-invalid={rowErrors.some(item => item.column === column)}
                aria-describedby={rowErrors.some(item => item.column === column) ? `${prefix}-${row.id}-errors` : undefined}
                onBlur={() => setTouchedCells(previous => new Set(previous).add(`${row.id}:${column}`))}
                onChange={event => editCell(row.id, column, event.target.value)} />
            </label>;
          }
          return <div key={row.id} className={styles.chartCategory} role="group"
            aria-label={`${isPaired ? "Finding" : "Category"} ${displayIndex + 1}`}>
          {tableDraft && selectedType !== "horizontal-bar-chart" ? <div className={styles.chartFindingFields}>
            {isPaired ? leadInField(displayIndex) : null}
            <div className={styles.chartValueFields}>{row.cells.slice(1).map((_, index) => cellInput(index + 1, true))}</div>
            {cellInput(0, true)}
            {rowErrors.length ? <span id={`${prefix}-${row.id}-errors`} className={styles.inputError}>
              {rowErrors.map(item => item.message).join(" ")}
            </span> : null}
            {canRemoveRows ? <div className={styles.chartCategoryActions}>{removeRow(row.id, displayIndex)}</div> : null}
          </div> :
          <table className={styles.chartDataGrid} data-value-type={valueType} data-chart-type={selectedType}
            data-series-count={table.columns.length - 1}>
            <caption className={styles.chartCellLabel}>{tableDraft ? "Chart data" : "Original source values"}, category {displayIndex + 1}</caption>
            <thead><tr>{headings.map((column, i) => <th scope="col" key={i}>{column}</th>)}
              {canRemoveRows ? <th scope="col"><span className={styles.chartCellLabel}>Remove row</span></th> : null}
            </tr></thead>
            <tbody><tr>{row.cells.map((cell, column) => <td key={column}>
            {tableDraft ? cellInput(column) : cell}
            {column === 0 && rowErrors.length ? <span id={`${prefix}-${row.id}-errors`} className={styles.inputError}>
              {rowErrors.map(item => item.message).join(" ")}
            </span> : null}
          </td>)}{canRemoveRows ? <td>{removeRow(row.id, displayIndex)}</td> : null}</tr></tbody>
          </table>}
          {tableDraft && selectedType === "horizontal-bar-chart" ? supportingTextEditor(row, rowIndex) : null}
          </div>;
        })}
      </div>
      {tableDraft && isGrouped ? <div className={styles.chartSeriesFields}>
        {table.columns.slice(1).map((name, index) => <label key={index} className={styles.field}>
          <Body1Strong>Series {index + 1} name</Body1Strong>
          <input type="text" value={name} maxLength={100} aria-invalid={!name.trim()}
            onChange={event => changeData({ ...tableDraft, table: { ...tableDraft.table,
              columns: table.columns.map((value, i) => i === index + 1 ? event.target.value : value) } })} />
        </label>)}
      </div> : null}
    </>;
  }
  const dataSettings = selectedType === "horizontal-bar-chart" ? <div className={styles.chartDataSettings}>
      <Dropdown aria-label="Sort by" className={styles.chartChoice}
        button={{ className: styles.chartChoiceButton,
          children: <span className={styles.chartChoiceLabel}>{orders[presentation.sort]}</span> }}
        listbox={{ className: styles.chartControlPopup }}
        value={orders[presentation.sort]} selectedOptions={[presentation.sort]}
        onOptionSelect={(_, data) => { if (data.optionValue) {
          setFrozenOrder(undefined);
          setPresentation(value => ({ ...value, sort: data.optionValue as ChartPresentation["sort"] }));
        } }}>
        {Object.entries(orders).map(([value, label]) => <Option key={value} value={value}
          className={styles.chartMenuItem}>{label}</Option>)}
      </Dropdown>
      <Dropdown aria-label="Value type" className={styles.chartChoice}
        button={{ className: styles.chartChoiceButton,
          children: <span className={styles.chartChoiceLabel}>{valueType === "percentage" ? "Percentage" : "Number"}</span> }}
        listbox={{ className: styles.chartControlPopup }}
        value={valueType === "percentage" ? "Percentage" : "Number"} selectedOptions={[valueType]}
        onOptionSelect={(_, data) => {
          if (data.optionValue) changeValueType(data.optionValue as ChartValueType);
        }}>
        {(["percentage", "number"] as const).map(unit => <Option key={unit} value={unit}
          className={styles.chartMenuItem}>{unit === "percentage" ? "Percentage" : "Number"}</Option>)}
      </Dropdown>
  </div> : null;
  return <div className={styles.chartEditor}>
    <div>
    <header className={`${styles.chartEditorHeader} ${styles.chartSelectedHeader}`}>
      <div className={styles.chartHeaderActions}>
        <Dropdown aria-label="Chart type" className={`${styles.chartChoice} ${styles.chartTypeSelector}`}
          button={{ ref: typeButton, className: styles.chartChoiceButton }} listbox={{ className: styles.chartControlPopup }}
          placeholder="Choose a chart" value={chartChoice?.title ?? ""} selectedOptions={selectedType ? [selectedType] : []}
          onOptionSelect={(_, data) => {
            if (data.optionValue) changeChartType(data.optionValue as VerifiedDataVisualType);
          }}>
          {chartChoices.map(({ type, title }) => <Option key={type} value={type} checkIcon={null}
            className={styles.chartMenuItem}>{title}</Option>)}
        </Dropdown>
      </div>
      <Button type="button" appearance="subtle" className={styles.chartEditorDismiss}
        icon={<Dismiss20Regular aria-hidden="true" />} aria-label="Close chart editor" onClick={onCancel} />
    </header>
    <div className={styles.chartEditorTools}>
    <div className={styles.chartTabs} role="tablist" aria-label="Chart editing">
      {visibleTabs.map(value => {
        return <button key={value} type="button" role="tab"
        id={`${block.id}-${value}-tab`} aria-controls={`${block.id}-chart-panel`} aria-selected={tab === value}
        tabIndex={tab === value ? 0 : -1}
        onKeyDown={event => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const next = event.key === "Home" ? visibleTabs[0] : event.key === "End" ? visibleTabs[visibleTabs.length - 1]
              : visibleTabs[(visibleTabs.indexOf(value) + (event.key === "ArrowRight" ? 1 : -1) + visibleTabs.length) % visibleTabs.length];
            setTab(next);
            document.getElementById(`${block.id}-${next}-tab`)?.focus();
          }
        }}
        onClick={() => setTab(value)}>
          <span>{value === "data" ? "Content" : "Palette"}</span>
        </button>;
      })}
    </div>
    </div>
    </div>
    <div className={styles.chartEditorContent}>
    <section id={`${block.id}-chart-panel`} role="tabpanel" aria-labelledby={`${block.id}-${tab}-tab`}
      data-chart-tab={tab} className={styles.chartEditorBody}>
      {error ? <Body1 className={styles.inputError} role="alert" block>{error}</Body1> : null}
      {tab === "data" ? <>
        {textField("title")}
        {!presentationValid ? <Caption1 className={styles.inputError}>Use a title of 1–120 characters.</Caption1> : null}
        {!isPaired && selectedType !== "percentage-ring-group" ? textField("subtitle") : null}
        {errors.some(item => item.row < 0) ? <section className={styles.chartDataGuidance} aria-label="Required data changes">
          <Body1Strong block>Adjust data for this chart</Body1Strong>
          {errors.filter(item => item.row < 0).map((item, index) => <Body1 block key={index}>{item.message}</Body1>)}
          <Caption1 block>No rows or series are removed automatically. The preview updates when the data is ready.</Caption1>
          {selectedType !== "horizontal-bar-chart" && valueType !== "percentage" ? <>
            <Caption1 block>Use percentages only if that is what your values represent.</Caption1>
            <Button type="button" className={styles.chartAction} appearance="outline" onClick={() => changeValueType("percentage")}>Use percentage values</Button>
          </> : null}
          {isGrouped && tableDraft?.table.columns.length === 2 ? <Button type="button" className={styles.chartAction} appearance="outline"
            onClick={() => changeData({ ...tableDraft, table: { columns: [...tableDraft.table.columns, "Series 2"],
              rows: tableDraft.table.rows.map(row => ({ ...row, cells: [...row.cells, ""] })) } })}>Add second series</Button> : null}
          {!isGrouped && tableDraft && tableDraft.table.columns.length > 2 ? <label className={styles.field}>
            <Body1Strong>Value series to keep</Body1Strong>
            <Dropdown aria-label="Value series to keep" value="Choose a series" selectedOptions={[]}
              className={styles.chartChoice} button={{ className: styles.chartChoiceButton }}
              listbox={{ className: styles.chartControlPopup }} onOptionSelect={(_, data) => {
              const column = Number(data.optionValue);
              if (!column) return;
              changeData({ ...tableDraft, table: { columns: [tableDraft.table.columns[0], tableDraft.table.columns[column]],
                rows: tableDraft.table.rows.map(row => ({ ...row, cells: [row.cells[0], row.cells[column]] })) } });
            }}>
              {tableDraft.table.columns.slice(1).map((name, index) => <Option key={index} value={String(index + 1)}
                className={styles.chartMenuItem}>{name}</Option>)}
            </Dropdown>
          </label> : null}
        </section> : null}
        <div className={styles.chartTableSection}>
          {dataSettings}
          {dataGrid("panel")}
          <div className={styles.chartDataActions}>
            {tableDraft && (!fixedRows || tableDraft.table.rows.length < requiredRows!) ? <Button className={styles.chartAction} type="button" appearance="outline"
              icon={<Add16Regular aria-hidden="true" />} disabled={tableDraft.table.rows.length >= 12}
              onClick={() => changeData({ ...tableDraft, table: { ...tableDraft.table,
                rows: [...tableDraft.table.rows, { id: crypto.randomUUID(), cells: tableDraft.table.columns.map(() => "") }] } })}>Add category</Button> : null}
          </div>
        </div>
        {!tableDraft && dataSource && dataSource.data.unit !== "unknown" && dataSource.data.columns.length === 2 ?
          <Button type="button" className={styles.chartAction} onClick={copySource}>Edit as bar chart</Button> : null}
        {!dataSource && !editable && (selectedType === "horizontal-bar-chart" || isPaired) ? <section className={styles.integrityNotice}>
          <Body1Strong block>Try a synthetic example</Body1Strong><Caption1 block>{isPaired
            ? "Two illustrative percentages. Not research findings." : "Four illustrative team percentages. Not research findings."}</Caption1>
          <Button type="button" className={styles.chartAction} onClick={() => {
            replaceTable({
              columns: isPaired ? ["Finding", "Percentage (%)"] : ["Team", "Regular AI use (%)"],
              rows: (isPaired ? [["See an opportunity", "83"], ["Have a clear plan", "43"]]
                : [["Product and design", "24"], ["Customer success", "36"], ["Engineering", "52"], ["Operations and support", "68"]])
                .map((cells, i) => ({ id: `example-${i}`, cells })),
            }, "Synthetic workplace research");
            if (isPaired) setLeadIns(["Finding 1", "Finding 2"]);
            setPresentation(value => ({ ...value, title: isPaired ? "Two findings side by side" : "AI use varies across teams",
              subtitle: "Illustrative independent percentages", note: isPaired
                ? "Independent findings; values do not need to total 100%." : "Separate groups; values do not need to total 100%." }));
          }}>Use synthetic example</Button>
        </section> : null}
        {isPaired || (block.source.part !== "studio" && intent !== "insert") ? textField("note") : null}
        {busy && !errors.length && sourceNameValid ? <Caption1 role="status">Updating chart data…</Caption1> : null}
      </> : <fieldset className={styles.chartPalettes} role="radiogroup" aria-label="Palette" data-paired={isPaired || undefined}>
        <legend>Palette</legend>
        <Caption1>Choose a palette to preview it on the chart.</Caption1>
        {Object.entries(palettes).map(([value, label]) => <label key={value} className={styles.chartPaletteTile}>
          <input type="radio" name={`${block.id}-palette`} value={value} checked={presentation.palette === value}
            onChange={() => setPresentation(current => ({ ...current, palette: value as ChartPresentation["palette"] }))} />
          <span className={styles.chartPaletteSwatches} data-palette={value} aria-hidden="true">
            <i /><i />{!isPaired ? <><i /><i /></> : null}
          </span>
          <span className={styles.chartPaletteLabel}><Body1Strong>{label}</Body1Strong>
            <Checkmark16Regular className={styles.chartPaletteCheck} aria-hidden="true" /></span>
        </label>)}
      </fieldset>}
    </section>
    </div>
    <footer className={styles.chartEditorFooter}>
      {intent !== "insert" && block.source.part === "studio" ? <Button type="button"
        className={`${styles.chartAction} ${styles.chartDangerAction}`} onClick={onRemove}
        icon={<Delete16Regular aria-hidden="true" />}>Remove chart</Button> : null}
      <div className={styles.editorActions}>
      <Button type="button" className={styles.chartAction} onClick={onCancel}>Cancel</Button>
      <Button type="button" appearance="primary" className={`${styles.chartAction} ${styles.chartPrimaryAction}`} disabled={!draft}
        onClick={() => { if (draft) onDone({ ...draft, verifiedSource: { ...draft.verifiedSource!, verifiedAt: new Date().toISOString() } }); }}>Apply changes</Button>
      </div>
    </footer>
  </div>;
}
