"use client";

import { Button, MenuButton } from "@fluentui/react-button";
import { Checkbox } from "@fluentui/react-checkbox";
import { Dropdown, Option } from "@fluentui/react-combobox";
import { Add16Regular } from "@fluentui/react-icons/svg/add";
import { ArrowUpload20Regular } from "@fluentui/react-icons/svg/arrow-upload";
import { ClipboardPaste20Regular } from "@fluentui/react-icons/svg/clipboard-paste";
import { ChevronDown16Regular } from "@fluentui/react-icons/svg/chevron-down";
import { DataBarVertical20Regular } from "@fluentui/react-icons/svg/data-bar-vertical";
import { Delete16Regular } from "@fluentui/react-icons/svg/delete";
import { Dismiss20Regular } from "@fluentui/react-icons/svg/dismiss";
import { TextEditStyle20Regular } from "@fluentui/react-icons/svg/text-edit-style";
import { Menu, MenuItem, MenuList, MenuPopover, MenuTrigger } from "@fluentui/react-menu";
import { Body1, Body1Strong, Caption1, Subtitle1 } from "@fluentui/react-text";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  chartPresentationSchema,
  pairedComparisonPresentationSchema,
  type ChartPresentation,
  type ReportBlock,
} from "../../manifest/report-manifest.ts";
import {
  createStudioChartSource,
  parseChartTable,
  validateChartTable,
  type ChartTable,
} from "../../visualization/chart-authoring.ts";
import {
  compatibleVerifiedVisuals,
  createVerifiedDataVisual,
  parseChartValue,
  verifiedDataVisualName,
  type ChartValueType,
  type DataVisualSourceBlock,
  type VerifiedDataVisualType,
} from "../../visualization/verified-data-visual.ts";
import { sortChartItems } from "../../visualization/chart-order.ts";
import styles from "./publishing-studio.module.css";

type EditableData = { table: ChartTable; sourceName: string; synthetic: boolean };
type Props = {
  block: ReportBlock;
  source?: DataVisualSourceBlock;
  onPreview: (block: ReportBlock) => void;
  onDone: (block: ReportBlock) => void;
  onCancel: () => void;
  onRemove: () => void;
  initialType?: VerifiedDataVisualType;
  intent?: "edit" | "insert";
};

export function VerifiedChartEditor({ block, source, onPreview, onDone, onCancel, onRemove, initialType = "horizontal-bar-chart", intent = "edit" }: Props) {
  const tabs = ["text", "data"] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]>("data");
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
  const [pasteOpen, setPasteOpen] = useState(false);
  const [replacementOpen, setReplacementOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [header, setHeader] = useState(true);
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
  const fixedRows = Boolean(selectedType && selectedType !== "horizontal-bar-chart");
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const replacementButton = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pasteInput = useRef<HTMLTextAreaElement>(null);
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
        rows: dataSource.data.rows.map(row => ({ id: row.id, cells: [...row.cells] })),
      },
      sourceName: dataSource.data.title.trim().slice(0, 200) || "Chart data",
      synthetic: dataSource.data.synthetic ?? false,
    };
  }, [dataSource, editable, isGrouped, selectedType]);
  const errors = useMemo(() => {
    if (!editable) return [];
    return validateChartTable(editable.table, valueType, selectedType);
  }, [editable, selectedType, valueType]);
  const visibleErrors = errors.filter(item => item.row < 0 ||
    touchedCells.has(`${editable?.table.rows[item.row]?.id}:${item.column}`));
  const sourceNameValid = !editable || Boolean(editable.sourceName.trim() && editable.sourceName.length <= 200);
  const dataReady = Boolean(dataSource && !busy && !errors.length && sourceNameValid);
  const compatible = useMemo(() => dataSource ? compatibleVerifiedVisuals(
    dataSource.data.rows.length === 2 ? { ...dataSource, data: { ...dataSource.data, recommendedVisualType: undefined } } : dataSource,
  ) : [], [dataSource]);
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

  useEffect(() => { editorHeading.current?.focus(); }, []);
  useEffect(() => { if (pasteOpen) pasteInput.current?.focus(); }, [pasteOpen]);

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

  useEffect(() => { if (draft) onPreview(draft); }, [draft, onPreview]);

  function changeData(next: EditableData) {
    setEditable(next);
    setBusy(true);
    setError(undefined);
  }
  function changeValueType(next: ChartValueType) {
    if (next === valueType) return;
    setValueType(next);
    setFrozenOrder(undefined);
    if (tableDraft) {
      setTouchedCells(previous => new Set([...previous, ...tableDraft.table.rows
        .filter(row => row.cells[1]?.trim()).map(row => `${row.id}:1`)]));
      changeData({ ...tableDraft, table: { ...tableDraft.table,
        rows: tableDraft.table.rows.map(row => ({ ...row, cells: row.cells.map((cell, i) =>
          next === "number" && i === 1 ? cell.replace(/%\s*$/, "").trim() : cell) })) } });
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
    setPasteOpen(false);
    setReplacementOpen(false);
  }
  function copySource() {
    if (!dataSource || dataSource.data.columns.length !== 2 || dataSource.data.unit === "unknown") return;
    replaceTable({
      columns: [...dataSource.data.columns],
      rows: dataSource.data.rows.map(row => ({ id: row.id, cells: [...row.cells] })),
    }, dataSource.data.title, dataSource.data.synthetic ?? false);
  }
  function editCell(rowId: string, column: number, value: string) {
    if (!tableDraft) return;
    changeData({
      ...tableDraft,
      table: { ...tableDraft.table, rows: tableDraft.table.rows.map(row =>
        row.id === rowId ? { ...row, cells: row.cells.map((cell, i) => i === column ? value : cell) } : row) },
    });
  }
  function textField(key: "title" | "subtitle" | "note") {
    return <label key={key} className={styles.field}>
      <Body1Strong>{key === "title" ? "Title" : key === "subtitle" ? "Subtitle (optional)" : "Note (optional)"}</Body1Strong>
      <input type="text" value={presentation[key]} maxLength={{ title: 120, subtitle: 240, note: 500 }[key]}
        placeholder={key === "title" ? "Chart title" : "Text..."}
        aria-invalid={key === "title" && (!presentation.title.trim() || presentation.title.length > 120)}
        onChange={event => setPresentation(value => ({ ...value, [key]: event.target.value }))} /></label>;
  }
  function dataGrid(prefix: string) {
    const table = tableDraft?.table ?? dataSource?.data;
    if (!table) return null;
    const headings = tableDraft ? isGrouped ? ["Label", ...table.columns.slice(1)] : ["Label", "Value"] : table.columns;
    const entries = table.rows.map((row, rowIndex) => ({
      row, rowIndex, label: row.cells[0].trim(), value: parseChartValue(row.cells[1], valueType) ?? 0,
      invalid: !row.cells[0].trim() || parseChartValue(row.cells[1], valueType) === undefined || errors.some(item => item.row === rowIndex),
    }));
    const order = selectedType === "horizontal-bar-chart" ? presentation.sort : "source";
    const sorted = order === "source" ? entries : [
      ...sortChartItems(entries.filter(entry => !entry.invalid), order),
      ...entries.filter(entry => entry.invalid),
    ];
    const displayed = frozenOrder ? [
      ...frozenOrder.flatMap(id => entries.filter(entry => entry.row.id === id)),
      ...entries.filter(entry => !frozenOrder.includes(entry.row.id)),
    ] : sorted;
    return <>
      <table className={styles.chartDataGrid} data-value-type={valueType} data-chart-type={selectedType}
        onFocusCapture={() => { if (!frozenOrder) setFrozenOrder(displayed.map(entry => entry.row.id)); }}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFrozenOrder(undefined); }}
        onKeyDown={event => {
          if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
            event.preventDefault();
            setFrozenOrder(sorted.map(entry => entry.row.id));
          }
        }}>
        <caption className={styles.chartCellLabel}>{tableDraft ? "Chart data" : "Original source values"}</caption>
        <thead><tr>{headings.map((column, i) => <th scope="col" key={i}>
          {tableDraft && isGrouped && i > 0 ? <input type="text" aria-label={`Series ${i} name`}
            value={table.columns[i]} maxLength={100} aria-invalid={!table.columns[i].trim()}
            onChange={event => changeData({ ...tableDraft, table: { ...tableDraft.table,
              columns: table.columns.map((value, index) => index === i ? event.target.value : value) } })} /> : column}
        </th>)}{tableDraft && !fixedRows ? <th scope="col"><span className={styles.chartCellLabel}>Remove row</span></th> : null}</tr></thead>
        <tbody>{displayed.map(({ row, rowIndex }, displayIndex) => {
          const rowErrors = visibleErrors.filter(item => item.row === rowIndex);
          return <tr key={row.id}>{row.cells.map((cell, column) => <td key={column}>
            {tableDraft ? <label className={styles.chartCell}>
              <span className={styles.chartCellLabel}>{headings[column]}{column > 0 && valueType === "percentage" ? " (%)" : ""}, row {displayIndex + 1}</span>
              <input aria-label={`${headings[column]}${column > 0 && valueType === "percentage" ? " (%)" : ""}, row ${displayIndex + 1}`} type="text"
                inputMode={column ? "decimal" : "text"} maxLength={column ? 24 : 160}
                data-compact-value={column > 0 && cell.replace(/%\s*$/, "").trim().length > 4 ? true : undefined}
                value={column > 0 && valueType === "percentage" ? cell.replace(/%\s*$/, "").trim() : cell}
                aria-invalid={rowErrors.some(item => item.column === column)}
                aria-describedby={rowErrors.some(item => item.column === column) ? `${prefix}-${row.id}-errors` : undefined}
                onBlur={() => setTouchedCells(previous => new Set(previous).add(`${row.id}:${column}`))}
                onChange={event => editCell(row.id, column, event.target.value)} />
            </label> : cell}
            {column === 0 && rowErrors.length ? <span id={`${prefix}-${row.id}-errors`} className={styles.inputError}>
              {rowErrors.map(item => item.message).join(" ")}
            </span> : null}
          </td>)}{tableDraft && !fixedRows ? <td><Button className={styles.chartRemoveRow} type="button" appearance="subtle"
            aria-label={`Remove row ${displayIndex + 1}`} disabled={table.rows.length <= 2}
            icon={<Delete16Regular aria-hidden="true" />}
            onClick={() => changeData({ ...tableDraft, table: { ...tableDraft.table, rows: table.rows.filter(item => item.id !== row.id) } })}>
          </Button></td> : null}</tr>;
        })}</tbody>
      </table>
      {visibleErrors.filter(item => item.row < 0).map((item, i) => <Caption1 className={styles.inputError} key={i} block>{item.message}</Caption1>)}
    </>;
  }
  return <div className={styles.chartEditor}>
    <header className={styles.chartEditorHeader}>
      <h2 ref={editorHeading} tabIndex={-1}><Subtitle1>{intent === "insert" ? "Insert chart" : "Edit chart"}</Subtitle1></h2>
      <Button type="button" appearance="subtle" className={styles.chartEditorDismiss}
        icon={<Dismiss20Regular aria-hidden="true" />} aria-label="Close chart editor" onClick={onCancel} />
    </header>
    <div className={styles.chartEditorTools}>
    <div className={styles.chartTabs} role="tablist" aria-label="Chart editing">
      {tabs.map(value => {
        return <button key={value} type="button" role="tab"
        id={`${block.id}-${value}-tab`} aria-controls={`${block.id}-chart-panel`} aria-selected={tab === value}
        tabIndex={tab === value ? 0 : -1}
        onKeyDown={event => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[tabs.length - 1]
              : tabs[(tabs.indexOf(value) + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
            setTab(next);
            document.getElementById(`${block.id}-${next}-tab`)?.focus();
          }
        }}
        onClick={() => setTab(value)}>
          {value === "text" ? <TextEditStyle20Regular aria-hidden="true" /> : <DataBarVertical20Regular aria-hidden="true" />}
          <span>{value === "text" ? "Text" : "Data"}</span>
        </button>;
      })}
    </div>
    <Menu open={replacementOpen} onOpenChange={(_, data) => setReplacementOpen(data.open)}
      positioning={{ position: "below", align: "end", offset: 8 }}>
      <MenuTrigger disableButtonEnhancement>
        <MenuButton type="button" ref={replacementButton}
          className={`${styles.chartAction} ${styles.chartReplaceAction}`}>{intent === "insert" ? "Add data" : "Replace data"}</MenuButton>
      </MenuTrigger>
      <MenuPopover className={styles.chartControlPopup}>
        <MenuList aria-label="Replace data">
          <MenuItem className={styles.chartMenuItem} icon={<ClipboardPaste20Regular aria-hidden="true" />}
            onClick={() => { setTab("data"); setPasteOpen(true); setError(undefined); }}>Paste a table</MenuItem>
          <MenuItem className={styles.chartMenuItem} icon={<ArrowUpload20Regular aria-hidden="true" />}
            onClick={() => fileInput.current?.click()}>Import CSV or TSV</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
    <input ref={fileInput} hidden type="file" accept=".csv,.tsv,.txt" onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = "";
      if (!file) return;
      try {
        if (file.size > 200000) throw new Error("Choose a table smaller than 200 KB.");
        replaceTable(parseChartTable(await file.text(), true, selectedType), file.name);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "The table could not be imported."); }
    }} />
    </div>
    <section id={`${block.id}-chart-panel`} role="tabpanel" aria-labelledby={`${block.id}-${tab}-tab`}
      data-chart-tab={tab} className={styles.chartEditorBody}>
      {error ? <Body1 className={styles.inputError} role="alert" block>{error}</Body1> : null}
      {tab === "data" ? <>
        {selectedType === "horizontal-bar-chart" ? <div className={styles.chartDataSettings}>
        <div className={styles.field}>
          <Body1Strong id={`${block.id}-sort-label`}>Sort by</Body1Strong>
          <Dropdown aria-labelledby={`${block.id}-sort-label`} className={styles.chartChoice}
            button={{ className: styles.chartChoiceButton }} listbox={{ className: styles.chartControlPopup }}
            value={orders[presentation.sort]} selectedOptions={[presentation.sort]}
            onOptionSelect={(_, data) => { if (data.optionValue) {
              setFrozenOrder(undefined);
              setPresentation(value => ({ ...value, sort: data.optionValue as ChartPresentation["sort"] }));
            } }}>
            {Object.entries(orders).map(([value, label]) => <Option key={value} value={value}
              className={styles.chartMenuItem}>{label}</Option>)}
          </Dropdown>
        </div>
        <div className={styles.field}>
          <Body1Strong id={`${block.id}-value-type-label`}>Value type</Body1Strong>
          <div role="radiogroup" aria-labelledby={`${block.id}-value-type-label`} className={styles.chartValueSegments}>
            {(["percentage", "number"] as const).map(unit => <label key={unit}>
              <input type="radio" name={`${block.id}-value-type`}
                value={unit} checked={valueType === unit} onChange={() => changeValueType(unit)} />
              <span>{unit === "percentage" ? "Percentage" : "Number"}</span>
            </label>)}
          </div>
        </div></div> : null}
        <div className={styles.chartTableSection}>
          {dataGrid("panel")}
          <div className={styles.chartDataActions}>
            {tableDraft && !fixedRows ? <Button className={styles.chartAction} type="button" appearance="outline"
              icon={<Add16Regular aria-hidden="true" />} disabled={tableDraft.table.rows.length >= 12}
              onClick={() => changeData({ ...tableDraft, table: { ...tableDraft.table,
                rows: [...tableDraft.table.rows, { id: crypto.randomUUID(), cells: ["", ""] }] } })}>Add row</Button> : null}
          </div>
        </div>
        {pasteOpen ? <div className={styles.chartPasteEditor}>
          <label className={styles.field}><Body1Strong>Table contents</Body1Strong>
            <textarea ref={pasteInput} rows={7} maxLength={200000} value={paste} onChange={event => setPaste(event.target.value)}
              placeholder={isGrouped ? "Group\tSeries 1\tSeries 2\nFirst group\t24.00%\t36%\n..." : "Team\tPercentage\nResearch\t24.00%\nSupport\t0"} /></label>
          <Checkbox checked={header} label="First row contains column headings"
            onChange={(_, data) => setHeader(data.checked === true)} />
          <div className={styles.chartPasteActions}>
            <Button type="button" className={styles.chartAction} onClick={() => {
              try { replaceTable(parseChartTable(paste, header, selectedType), "Pasted spreadsheet table"); }
              catch (cause) { setError(cause instanceof Error ? cause.message : "Check the table and try again."); }
            }}>Review pasted table</Button>
            <Button type="button" className={styles.chartAction} onClick={() => {
              setPasteOpen(false); replacementButton.current?.focus();
            }}>Cancel paste</Button>
          </div>
        </div> : null}
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
        {busy && !errors.length && sourceNameValid ? <Caption1 role="status">Updating chart data…</Caption1> : null}
        {selectedType === "horizontal-bar-chart" || isPaired ? <div className={styles.field}>
          <Body1Strong id={`${block.id}-palette-label`}>Palette</Body1Strong>
          <Dropdown aria-labelledby={`${block.id}-palette-label`} className={styles.chartChoice}
            button={{ className: styles.chartChoiceButton }} listbox={{ className: styles.chartControlPopup }}
            value={palettes[presentation.palette]} selectedOptions={[presentation.palette]}
            onOptionSelect={(_, data) => { if (data.optionValue) setPresentation(value => ({ ...value, palette: data.optionValue as ChartPresentation["palette"] })); }}>
            {Object.entries(palettes).map(([value, label]) => <Option key={value} value={value}
              className={styles.chartMenuItem}>{label}</Option>)}
          </Dropdown>
        </div> : null}
        {compatible.length > 1 ? <details className={styles.chartOptions}>
          <summary>Chart options <ChevronDown16Regular aria-hidden="true" /></summary>
          <div className={styles.chartOptionFields}>
            {compatible.length > 1 ? <fieldset className={styles.optionGroup}><legend>Chart type</legend>
              {compatible.map(type => <label key={type}><input type="radio" name={`${block.id}-visual-type`} checked={selectedType === type}
                onChange={() => {
                  setSelectedType(type);
                  setFrozenOrder(undefined);
                  if (tableDraft) changeData(tableDraft);
                }} /><span>{verifiedDataVisualName(type)}</span></label>)}
            </fieldset> : null}
          </div>
        </details> : null}
      </> : <>
        <>
          {textField("title")}
          {isPaired ? leadIns.map((leadIn, index) => <label key={index} className={styles.field}>
            <Body1Strong>{index === 0 ? "First heading (optional)" : "Second heading (optional)"}</Body1Strong>
            <input type="text" maxLength={80} value={leadIn} placeholder="Text..."
              onChange={event => setLeadIns(previous => index === 0
                ? [event.target.value, previous[1]] : [previous[0], event.target.value])} />
          </label>) : selectedType !== "percentage-ring-group" ? textField("subtitle") : null}
          {textField("note")}
          {!presentationValid ? <Caption1 className={styles.inputError}>Use a title of 1–120 characters.</Caption1> : null}
        </>
      </>}
    </section>
    <footer className={styles.chartEditorFooter}>
      {intent !== "insert" && block.source.part === "studio" ? <Button type="button"
        className={`${styles.chartAction} ${styles.chartDangerAction}`} onClick={onRemove}
        icon={<Delete16Regular aria-hidden="true" />}>Remove chart</Button> : null}
      <div className={styles.editorActions}>
      <Button type="button" className={styles.chartAction} onClick={onCancel}>Cancel</Button>
      <Button type="button" appearance="subtle" className={`${styles.chartAction} ${styles.chartPrimaryAction}`} disabled={!draft}
        onClick={() => { if (draft) onDone({ ...draft, verifiedSource: { ...draft.verifiedSource!, verifiedAt: new Date().toISOString() } }); }}>{intent === "insert" ? "Insert chart" : "Apply changes"}</Button>
      </div>
    </footer>
  </div>;
}
