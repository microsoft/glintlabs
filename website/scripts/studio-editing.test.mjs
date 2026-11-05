import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

import { chartPresentationSchema, pairedComparisonPresentationSchema, reportManifestSchema } from "../src/manifest/report-manifest.ts";
import { createStudioProject, hasStudioProjectChanges } from "../src/project/studio-project.ts";
import { reportAuthor } from "../src/project/report-author.ts";
import { createDataVisualPreview } from "../src/visualization/data-visual-preview.ts";
import { automaticallyVerifiedVisualType, compatibleVerifiedVisuals, createVerifiedDataVisual, parseChartValue, verifiedDataVisualName } from "../src/visualization/verified-data-visual.ts";
import { sortChartItems } from "../src/visualization/chart-order.ts";
import { isCanonicalVisualBlock } from "../src/visualization/canonical-report-blocks.ts";
import { createStudioChartSource, validateChartTable } from "../src/visualization/chart-authoring.ts";
import { setTextCallout } from "../src/project/text-callout.ts";

const source = ts.createSourceFile(
  "publishing-studio.tsx",
  readFileSync(new URL("../src/app/_components/publishing-studio.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
assert.equal(source.parseDiagnostics.length, 0, "Studio handlers must come from valid TypeScript.");

function componentFunction(name, scope, sourceFile = source) {
  let declaration;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  assert.ok(declaration, `Studio function ${name} exists`);
  const { outputText } = ts.transpileModule(declaration.getText(sourceFile), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  return new Function(...Object.keys(scope), `${outputText}; return ${name};`)(...Object.values(scope));
}

function componentValue(name, scope, functionName, sourceFile = source) {
  let root = sourceFile;
  if (functionName) {
    function findFunction(node) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) root = node;
      else ts.forEachChild(node, findFunction);
    }
    findFunction(sourceFile);
    assert.notEqual(root, sourceFile, `Studio function ${functionName} exists`);
  }
  let declaration;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(root);
  assert.ok(declaration, `Studio value ${name} exists`);
  const { outputText } = ts.transpileModule(`const ${declaration.getText(sourceFile)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  return new Function(...Object.keys(scope), `${outputText}; return ${name};`)(...Object.values(scope));
}

function project(title) {
  return createStudioProject({
    importedManifestSha256: "b".repeat(64),
    status: "draft",
    manifest: reportManifestSchema.parse({
      schemaVersion: "0.1.0",
      source: { fileName: `${title}.docx`, sizeBytes: 100, sha256: "a".repeat(64) },
      metadata: { title, status: "draft" },
      blocks: [{ id: "heading-1", type: "heading", level: 1, text: title, source: { part: "word/document.xml", index: 0 } }],
      reviewItems: [],
      extraction: { paragraphCount: 1, imageCount: 0, unsupportedCount: 0 },
    }),
  });
}

function studio({ selectedImage = false, loadError, extractDocx = async () => ({ manifest: project("Import").manifest }) } = {}) {
  const reducer = componentFunction("reducer", {});
  let state = { status: "empty" };
  let currentProject;
  const messages = [];
  const actions = [];
  const saved = project("Saved draft");
  const scope = {
    state: { status: "ready" }, manifest: saved.manifest,
    hasUnsavedChanges: false,
    selectedBlockId: selectedImage ? "image-1" : undefined,
    selectedBlock: selectedImage ? { id: "image-1", type: "image" } : undefined,
    importVersionRef: { current: 0 },
    documentMenuRef: { current: null },
    homeDialogRef: { current: { close() {}, showModal() { throw new Error("Unexpected leave dialog"); } } },
    DEFAULT_STUDIO_REPORT_STYLE: "new-fluent-colors",
    reportStyle: "new-fluent-colors",
    window: { confirm: () => true, requestAnimationFrame() {} },
    BrowserProjectStorage: class {
      constructor() { throw new Error("Unapplied edits must not reach storage"); }
    },
    studioImageReviews: () => [],
    extractDocx,
    require(name) {
      assert.equal(name, "../../extraction/extract-docx.ts");
      if (loadError) throw loadError;
      return { extractDocx };
    },
    dispatch(action) { actions.push(action); state = reducer(state, action); },
    setCurrentProject(value) { currentProject = value; },
    setStorageMessage(message) { messages.push(message); },
  };
  for (const name of [
    "setActiveTool", "setSelectedBlockId", "setPendingImageBlockId", "setHighlightedBlockId",
    "setRemovedBlocks", "setIsUndoVisible", "setImageReviews", "setImageAttention",
    "setAcceptedReviewItemIds", "setPackageProject", "setHomeNavigationError", "setReportViewport",
    "setReportStyle", "setCanvasScale",
  ]) scope[name] = () => {};
  scope.requireAppliedEdits = componentFunction("requireAppliedEdits", scope);
  scope.returnToStart = componentFunction("returnToStart", scope);
  return {
    handleFile: componentFunction("handleFile", scope),
    goHome: componentFunction("goHome", scope),
    save: componentFunction("saveCurrentProject", scope),
    publish: componentFunction("showPackageDialog", scope),
    load: componentFunction("loadProject", scope),
    state: () => state,
    currentProject: () => currentProject,
    messages, actions, saved,
  };
}

test("publishing fixes the series to Research Drop and preserves the report or saved author", () => {
  const dialogSource = ts.createSourceFile(
    "publication-package-dialog.tsx",
    readFileSync(new URL("../src/app/studio/_components/publication-package-dialog.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  const initial = componentFunction("initialMetadata", {
    reportAuthor, estimateReportReadingTime: () => 3,
    suggestedPublicationSlug: (title) => title,
    publicationIllustrations: [], needsImageDescription: () => false,
  }, dialogSource);
  const imported = project("Report");
  const before = structuredClone(imported);
  assert.deepEqual(initial(imported).author, { name: "Megan Benzing" });
  assert.equal(initial(imported).eyebrow, "Research Drop");
  assert.deepEqual(imported, before, "resolving the default does not rewrite the imported report");
  const explicit = structuredClone(imported);
  explicit.manifest.metadata.author = { name: "Another author", handle: "@another" };
  explicit.manifest = reportManifestSchema.parse({
    ...explicit.manifest,
    blocks: [{
      id: "cover", type: "image", placement: "hero", eyebrow: "Imported series",
      alt: "Test cover", fileName: "cover.png", width: 1, height: 1,
      dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=",
      source: { part: "word/document.xml", index: 0 },
    }],
  });
  assert.equal(initial(explicit).eyebrow, "Research Drop", "series is automatic, not inherited from the imported cover");
  assert.equal(initial(explicit).author, explicit.manifest.metadata.author);
  assert.equal(reportAuthor(explicit.manifest), explicit.manifest.metadata.author);
  const saved = structuredClone(imported);
  saved.publicationPreparation = {
    metadata: { ...initial(imported), eyebrow: "Old saved series", author: { name: "Saved author", handle: "@saved" } },
    imageReviews: [],
  };
  assert.deepEqual(initial(saved).author, saved.publicationPreparation.metadata.author);
  assert.equal(initial(saved).eyebrow, "Research Drop", "saved preparations also use the fixed series");
  assert.equal(saved.publicationPreparation.metadata.eyebrow, "Old saved series", "opening the dialog does not rewrite stored drafts");
  const renderer = readFileSync(new URL("../src/report-system/report-renderer.tsx", import.meta.url), "utf8");
  assert.match(renderer, /const author = reportAuthor\(props\.manifest\)/);
});

test("Research Drop heroes omit the series eyebrow while Annual Report labels remain configurable", () => {
  const renderer = ts.createSourceFile(
    "report-renderer.tsx",
    readFileSync(new URL("../src/report-system/report-renderer.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  const eyebrow = (reportStyle, coverEyebrow) => componentValue(
    "coverEyebrow", { reportStyle, props: { coverEyebrow } }, "ReportRenderer", renderer,
  );
  for (const style of ["research-report", "new-fluent-colors"]) {
    assert.equal(eyebrow(style), undefined);
    assert.equal(eyebrow(style, "Research Drop"), undefined, "publication metadata does not add a hero label");
  }
  assert.equal(eyebrow("annual-report-2026"), "2026 Annual Report");
  assert.equal(eyebrow("annual-report-2026", "Annual Report"), "Annual Report");
  assert.equal(eyebrow("annual-report-2026", ""), "");
});

test("Research Drop navigation uses the full report width and clears the sticky header", () => {
  const renderer = readFileSync(new URL("../src/report-system/report-renderer.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/report-system/report-renderer.module.css", import.meta.url), "utf8");
  assert.match(renderer, /className=\{reportStyle !== "annual-report-2026" \? styles\.siteNavigation : undefined\}/);
  assert.match(styles, /\.report:not\(\.annualReport\) \.siteHeader \{[^}]*position: sticky;[^}]*width: 100%;[^}]*height: 0;[^}]*margin: 0;/);
  assert.match(styles, /\.report:not\(\.annualReport\) \.siteHeaderContent \{[^}]*top: 0;[^}]*right: 0;[^}]*left: 0;[^}]*width: 100%;[^}]*transform: none;/);
  assert.match(styles, /\.report \.siteNavigation \{[^}]*position: absolute;/);
  assert.match(styles, /\.report:not\(\.annualReport\) \.sectionRail \{[^}]*top: 32px;[^}]*padding-top: 96px;/);
  assert.match(styles, /\.report:not\(\.annualReport\) \.reportBlock \{[^}]*scroll-margin-top: 128px;/);
  const responsive = styles.slice(styles.indexOf("@container report (min-width: 1101px)"));
  assert.doesNotMatch(responsive, /\.report\[data-report-mode="read"\]:not\(\.annualReport\) \.siteHeaderContent/);
});

test("reader preview presets include an actual browser viewport height", () => {
  assert.deepEqual(componentValue("reportViewports", {}), [
    { id: "full-width", label: "Full width" },
    { id: "desktop", label: "Desktop", width: 1440, height: 900 },
    { id: "tablet", label: "Tablet", width: 1024, height: 768 },
    { id: "mobile", label: "Mobile", width: 390, height: 844 },
  ]);
});

test("automatically verified Word charts remain editable in Studio but not Reader preview", () => {
  const renderer = ts.createSourceFile(
    "report-renderer.tsx",
    readFileSync(new URL("../src/report-system/report-renderer.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  const jsx = (type, props) => ({ type, props });
  const render = componentFunction("renderBlock", {
    exports: {}, require() { return { jsx, jsxs: jsx }; },
    isCanonicalVisualBlock,
    automaticallyVerifiedVisualType, compatibleVerifiedVisuals, createDataVisualPreview,
    CanonicalReportComponent: "chart", styles: {},
  }, renderer);
  const source = {
    id: "word-chart", type: "data-visual-source",
    source: { part: "word/document.xml", index: 1 },
    data: {
      sourceKind: "word-table", title: "Synthetic comparison", unit: "percentage",
      recommendedVisualType: "horizontal-bar-chart", sha256: "a".repeat(64),
      columns: ["Team", "Percentage"],
      rows: [{ id: "a", cells: ["Research", "24.00%"] }, { id: "b", cells: ["Support", "0"] }],
    },
  };
  const selected = [];
  const props = { onSelectBlock: id => selected.push(id) };
  for (const block of [source, createDataVisualPreview(source, "horizontal-bar-chart")]) {
    const button = render(block, props).props.children[0].props.children;
    assert.equal(button?.type, "button", "automatic source verification must not hide chart editing");
    assert.equal(button.props.children, "Edit chart");
    button.props.onClick();
    assert.equal(render(block, { ...props, mode: "read" }).props.children[0], null);
    for (const [state, expected] of [
      [props, false],
      [{ ...props, selectedBlockId: block.id }, true],
      [{ ...props, selectedBlockId: "another-chart" }, false],
      [{ ...props, selectedBlockId: block.id, mode: "read" }, false],
    ]) {
      const preview = render(block, { ...state, chartEditingOrder: { blockId: block.id, rowIds: ["b", "a"] } }).props.children[1];
      assert.equal(preview.props.expandSupportingBullets, expected,
        "Only the chart being edited temporarily expands supporting bullets; Reader stays at rest");
      assert.deepEqual(preview.props.editingOrder, expected ? ["b", "a"] : undefined,
        "Only the selected authoring preview receives the temporary editing order");
    }
  }
  assert.deepEqual(selected, [source.id, source.id]);
});

test("bar charts default to Glint Labs before editing and preserve explicit palettes", () => {
  const source = {
    id: "palette-default", type: "data-visual-source",
    source: { part: "word/document.xml", index: 1 },
    data: {
      sourceKind: "word-table", title: "Teams", unit: "percentage",
      recommendedVisualType: "horizontal-bar-chart", sha256: "a".repeat(64),
      columns: ["Team", "Percentage"],
      rows: ["Product", "Support", "Engineering", "Operations"].map((label, index) => ({
        id: `row-${index}`, cells: [label, String(20 + index * 10)],
      })),
    },
  };
  const block = createDataVisualPreview(source, "horizontal-bar-chart");
  const before = structuredClone(block);
  const backgrounds = [];
  const jsx = (type, props) => {
    if (type === "i" && props.style?.background) backgrounds.push(props.style.background);
    return { type, props };
  };
  const componentSource = ts.createSourceFile("chart.tsx", readFileSync(new URL(
    "../src/visualization/canonical-report-components.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const render = componentFunction("HorizontalBarChart", {
    exports: {}, require() { return { jsx, jsxs: jsx }; }, styles: {}, sortChartItems,
  }, componentSource);
  for (const [palette, expected] of [
    [undefined, ["blue", "teal", "lavender", "mauve"]],
    ["brand", ["blue", "teal", "lavender", "mauve"]],
    ["blue", ["blue", "blue", "blue", "blue"]],
    ["teal", ["teal", "teal", "teal", "teal"]],
  ]) {
    backgrounds.length = 0;
    render({ block: palette ? { ...block, presentation: { palette } } : block });
    assert.deepEqual(backgrounds, expected.map(color => `var(--chart-${color})`),
      `${palette ?? "No saved presentation"} uses the selected or default palette`);
  }
  assert.deepEqual(block, before, "Resolving the default does not rewrite the imported chart");
});

test("bar supporting disclosures open for the editing preview and default to collapsed", async () => {
  const source = await createStudioChartSource({
    id: "supporting-preview", sourceName: "Chart data", synthetic: false,
    table: { columns: ["Category", "Percentage"], rows: [
      { id: "first", cells: ["First", "24.00"], supportingText: "First point\nSecond point" },
      { id: "second", cells: ["Second", "36"] },
    ] },
  });
  const block = createVerifiedDataVisual(source, "horizontal-bar-chart", "2026-11-04T22:00:00.000Z");
  const before = structuredClone(block);
  const disclosures = [];
  const jsx = (type, props) => {
    if (type === "details") disclosures.push(props);
    return { type, props };
  };
  const componentSource = ts.createSourceFile("chart.tsx", readFileSync(new URL(
    "../src/visualization/canonical-report-components.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const render = componentFunction("HorizontalBarChart", {
    exports: {}, require() { return { jsx, jsxs: jsx }; }, styles: {}, sortChartItems,
    ChevronDown16Regular: "chevron-icon",
  }, componentSource);
  for (const [expandSupportingBullets, expected] of [[undefined, false], [true, true], [false, false]]) {
    disclosures.length = 0;
    render({ block, expandSupportingBullets });
    assert.deepEqual(disclosures.map(props => Boolean(props.open)), [expected],
      "Only a category with supporting text expands, and only in the editing preview");
  }
  assert.deepEqual(block, before, "Preview expansion does not become saved chart data");
});

test("bar preview follows focused editing order without changing saved sorting or evidence", async () => {
  const source = await createStudioChartSource({
    id: "focused-order", sourceName: "Teams", synthetic: false,
    table: { columns: ["Label", "Value"], rows: [
      { id: "alpha", cells: ["Alpha", "1.25"] }, { id: "beta", cells: ["Beta", "47.00"] },
    ] },
  });
  const block = { ...createVerifiedDataVisual(source, "horizontal-bar-chart", "2026-11-05T02:00:00.000Z"),
    presentation: { title: "Teams", subtitle: "", note: "", palette: "brand", density: "comfortable", sort: "descending" } };
  const before = structuredClone(block);
  const labels = [];
  const jsx = (type, props) => {
    if (props.className === "row") labels.push(props.children[0].props.children[0]);
    return { type, props };
  };
  const componentSource = ts.createSourceFile("chart.tsx", readFileSync(new URL(
    "../src/visualization/canonical-report-components.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const render = componentFunction("HorizontalBarChart", {
    exports: {}, require() { return { jsx, jsxs: jsx }; }, styles: { horizontalRow: "row" }, sortChartItems,
  }, componentSource);
  for (const [editingOrder, expected] of [[undefined, ["Beta", "Alpha"]], [["alpha", "beta"], ["Alpha", "Beta"]], [undefined, ["Beta", "Alpha"]]]) {
    labels.length = 0;
    render({ block, editingOrder });
    assert.deepEqual(labels, expected, "The preview freezes only while an editing order is supplied");
  }
  assert.deepEqual(block, before, "Source rows, selected sort, values and evidence are never reordered or rewritten");
});

test("chart drafts retain missing-value placeholders without redundant helper copy", () => {
  const jsx = (type, props) => ({ type, props });
  const text = node => Array.isArray(node) ? node.map(text).join(" ")
    : !node || typeof node === "boolean" ? ""
    : typeof node === "object" ? text(node.props?.children) : String(node);
  const componentSource = ts.createSourceFile("chart-draft-preview.tsx", readFileSync(new URL(
    "../src/report-system/chart-draft-preview.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const render = componentFunction("ChartDraftPreview", {
    exports: {}, require() { return { jsx, jsxs: jsx }; }, styles: {}, parseChartValue,
  }, componentSource);
  for (const type of ["horizontal-bar-chart", "paired-percentage-comparison", "percentage-ring-group", "grouped-column-comparison"]) {
    const preview = text(render({ draft: {
      blockId: "draft", type, title: "Comparison", table: { columns: [], rows: [] }, unit: "percentage",
    } }));
    assert.doesNotMatch(preview, /Draft preview|Missing values are shown|Complete the data to apply/,
      `${type} omits redundant helper copy`);
    assert.match(preview, /—/, `${type} still marks missing values without inventing data`);
  }
});

test("incomplete chart previews retain their subtitle, series, paired headings and note", () => {
  const jsx = (type, props) => ({ type, props });
  const text = node => Array.isArray(node) ? node.map(text).join(" ")
    : !node || typeof node === "boolean" ? "" : typeof node === "object" ? text(node.props?.children) : String(node);
  const componentSource = ts.createSourceFile("chart-draft-preview.tsx", readFileSync(new URL(
    "../src/report-system/chart-draft-preview.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const render = componentFunction("ChartDraftPreview", {
    exports: {}, require() { return { jsx, jsxs: jsx }; }, styles: {}, parseChartValue,
  }, componentSource);
  const table = { columns: ["Label", "Current", "Earlier"], rows: Array.from({ length: 4 }, (_, index) => ({
    id: `row-${index}`, cells: [`Category ${index + 1}`, index ? "83.00" : "", "43.50"],
  })) };
  const grid = text(render({ draft: {
    blockId: "grid", type: "grouped-column-comparison", title: "Teams", subtitle: "Two independent series", table, unit: "percentage",
  } }));
  for (const value of ["Teams", "Two independent series", "Current", "Earlier", "—", "83.00%", "43.50%"]) {
    assert.ok(grid.includes(value), `Incomplete grid retains ${value}`);
  }
  const paired = text(render({ draft: {
    blockId: "pair", type: "paired-percentage-comparison", title: "Findings",
    leadIns: ["While...", "Only..."], note: "Independent findings", unit: "percentage",
    table: { columns: ["Label", "Value"], rows: table.rows.slice(0, 2).map(row => ({ ...row, cells: row.cells.slice(0, 2) })) },
  } }));
  for (const value of ["While...", "Only...", "Independent findings", "—", "83.00%"]) {
    assert.ok(paired.includes(value), `Incomplete paired chart retains ${value}`);
  }
});

test("ring and comparison grid displays preserve verified decimal precision", async () => {
  const jsx = (type, props) => ({ type, props });
  const text = node => Array.isArray(node) ? node.map(text).join(" ")
    : !node || typeof node === "boolean" ? "" : typeof node === "object" ? text(node.props?.children) : String(node);
  for (const [type, name, file, count, columns] of [
    ["percentage-ring-group", "PercentageRingGroup", "percentage-ring-group.tsx", 3, ["Category", "Value"]],
    ["grouped-column-comparison", "GroupedColumnComparison", "canonical-report-components.tsx", 4, ["Category", "Current", "Earlier"]],
  ]) {
    const source = await createStudioChartSource({
      id: type, sourceName: "Precision", synthetic: false, visualType: type,
      table: { columns, rows: Array.from({ length: count }, (_, index) => ({
        id: `row-${index}`, cells: [`Category ${index + 1}`, index ? "43.50" : "83.00", ...(columns.length === 3 ? ["12.500"] : [])],
      })) },
    });
    const block = createVerifiedDataVisual(source, type, "2026-11-05T02:00:00.000Z");
    const before = structuredClone(block);
    const componentSource = ts.createSourceFile(file, readFileSync(new URL(
      `../src/visualization/${file}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const render = componentFunction(name, {
      exports: {}, require() { return { jsx, jsxs: jsx }; }, styles: {}, SourceNote: "note",
    }, componentSource);
    const output = text(render({ block }));
    assert.ok(output.includes("83.00%") && output.includes("43.50%"), `${type} keeps entered precision`);
    if (columns.length === 3) assert.ok(output.includes("12.500%"));
    assert.deepEqual(block, before, "Display formatting leaves verified values and evidence unchanged");
  }
});

test("chart review issues remain actionable without duplicating source warnings or accepting unverified data", () => {
  const manifest = { reviewItems: [
    { id: "source-review", blockId: "chart-1", severity: "warning", message: "Check chart values." },
    { id: "other", blockId: "image", severity: "warning", message: "Describe this image." },
  ] };
  const before = structuredClone(manifest);
  const issues = componentValue("issues", {
    manifest,
    dataVisualsNeedingReview: [{ id: "chart-1", title: "First chart" }, { id: "chart-2", title: "Second chart" }],
    useMemo: callback => callback(),
  });
  assert.equal(issues.length, 3, "An existing source warning gains a review action instead of a duplicate issue");
  assert.deepEqual(issues.filter(issue => issue.action === "review-chart").map(issue => [issue.blockId, issue.severity]),
    [["chart-1", "blocker"], ["chart-2", "blocker"]]);
  const accepted = componentValue("acceptedIssueIds", {
    issues, acceptedReviewItemIds: ["source-review", "other"], useMemo: callback => callback(),
  });
  assert.deepEqual([...accepted], ["other"], "Prior acceptance never masks a chart that now requires verification");
  assert.deepEqual(manifest, before);
});

test("switching report items and tools cannot apply unreviewed chart previews", () => {
  const messages = [];
  const scope = {
    manifest: { blocks: [{ id: "next-item", type: "visual-placeholder" }] },
    selectedBlockId: "chart-being-edited",
    selectedBlock: { type: "horizontal-bar-chart" },
    pendingImageBlockId: undefined,
    useCallback: callback => callback,
    window: { confirm: () => true },
    setStorageMessage: message => messages.push(message),
    setSelectedBlockId() { assert.fail("Unapplied chart edits must not be dismissed"); },
  };
  scope.requireAppliedEdits = componentFunction("requireAppliedEdits", scope);
  const select = componentValue("selectBlock", scope, "PublishingStudio");
  assert.equal(select("next-item"), false);
  componentFunction("changeTool", scope)("issues");
  assert.equal(messages.length, 2, "both exits require Apply or Cancel");
});

test("Studio-authored charts omit source footers while paired comparisons retain optional notes", async () => {
  const jsx = (type, props) => ({ type, props });
  const text = node => Array.isArray(node) ? node.map(text).join(" ")
    : !node || typeof node === "boolean" ? ""
    : typeof node === "object" ? text(typeof node.type === "function" ? node.type(node.props) : node.props?.children)
    : String(node);
  for (const [type, name, count, grouped] of [
    ["horizontal-bar-chart", "HorizontalBarChart", 4, false],
    ["paired-percentage-comparison", "PairedPercentageComparison", 2, false],
    ["percentage-ring-group", "PercentageRingGroup", 3, false],
    ["grouped-column-comparison", "GroupedColumnComparison", 4, true],
  ]) {
    const source = await createStudioChartSource({
      id: type, sourceName: "Chart data", synthetic: false, visualType: type,
      table: {
        columns: grouped ? ["Category", "Before", "After"] : ["Category", "Percentage"],
        rows: Array.from({ length: count }, (_, index) => ({
          id: `row-${index}`, cells: grouped ? [`Group ${index + 1}`, "24", "36"] : [`Group ${index + 1}`, "24"],
        })),
      },
    });
    const block = {
      ...createVerifiedDataVisual(source, type, "2026-11-04T22:00:00.000Z"),
      presentation: { title: "Research chart", subtitle: "", note: "Test", palette: "brand", leadIns: ["First", "Second"] },
    };
    const before = structuredClone(block);
    const componentSource = ts.createSourceFile("chart.tsx", readFileSync(new URL(
      type === "percentage-ring-group" ? "../src/visualization/percentage-ring-group.tsx"
        : "../src/visualization/canonical-report-components.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const render = componentFunction(name, {
      exports: {}, require() { return { jsx, jsxs: jsx }; }, styles: {}, sortChartItems,
      SourceNote: ({ children }) => jsx("figcaption", { children }),
    }, componentSource);
    const studioText = text(render({ block }));
    assert.doesNotMatch(studioText, /Source: Chart data|Author-provided Studio table/,
      `${type} omits generated source footers`);
    if (type === "paired-percentage-comparison") {
      assert.match(studioText, /Test/, "Paired comparisons retain the optional explanatory note from Figma");
    } else {
      assert.doesNotMatch(studioText, /Test/, "Other chart footer behavior is unchanged");
    }
    assert.deepEqual(block, before, "Rendering preserves source evidence and the saved presentation");
    const existing = { ...block, source: { part: "word/document.xml", index: 0 } };
    assert.match(text(render({ block: existing })), /Test/, "Existing report notes remain visible");
    if (type !== "horizontal-bar-chart") {
      assert.match(text(render({ block: existing })), /Source: Chart data/, "Existing report citations remain visible");
    }
    const synthetic = { ...block, verifiedSource: { ...block.verifiedSource, synthetic: true } };
    assert.match(text(render({ block: synthetic })), /Synthetic example/, "Synthetic data stays clearly identified");
  }
});

test("chart content fields follow the visual reading order for every chart type", () => {
  const editorSource = ts.createSourceFile("verified-chart-editor.tsx", readFileSync(new URL(
    "../src/app/_components/verified-chart-editor.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const jsx = (type, props) => ({ type, props });
  const render = componentFunction("VerifiedChartEditor", {
    exports: {}, require() { return { jsx, jsxs: jsx }; }, styles: {},
    useRef: current => ({ current }), useState: initial => [typeof initial === "function" ? initial() : initial, () => {}],
    useEffect() {}, useMemo: callback => callback(),
    chartPresentationSchema, pairedComparisonPresentationSchema, compatibleVerifiedVisuals,
    createVerifiedDataVisual, parseChartValue, sortChartItems, validateChartTable,
    Button: "button", Dropdown: "dropdown", Option: "option", Caption1: "caption",
    Body1: "body", Body1Strong: "strong", Dismiss20Regular: "dismiss",
    Add16Regular: "add", Delete16Regular: "delete", ChevronDown16Regular: "chevron", Checkmark16Regular: "check",
  }, editorSource);
  const nodes = node => !node || typeof node !== "object" ? []
    : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
  const text = node => Array.isArray(node) ? node.map(text).join("")
    : !node || typeof node === "boolean" ? "" : typeof node === "object" ? text(node.props?.children) : String(node);
  for (const [type, expected] of [
    ["horizontal-bar-chart", ["Title", "Subtitle (optional)", "Label, row 1", "Value (%), row 1",
      "Supporting bullet 1 for category 1", "Label, row 2", "Value (%), row 2"]],
    ["paired-percentage-comparison", ["Title", "First heading (optional)", "Value (%), row 1", "Label, row 1",
      "Second heading (optional)", "Value (%), row 2", "Label, row 2", "Note (optional)"]],
    ["percentage-ring-group", ["Title", "Value (%), row 1", "Label, row 1",
      "Value (%), row 2", "Label, row 2", "Value (%), row 3", "Label, row 3"]],
    ["percentage-comparison-grid", ["Title", "First row heading (optional)", "Value (%), row 1", "Label, row 1",
      "Value (%), row 2", "Label, row 2", "Second row heading (optional)", "Value (%), row 3", "Label, row 3",
      "Value (%), row 4", "Label, row 4", "Note (optional)"]],
    ["grouped-column-comparison", ["Title", "Subtitle (optional)", "Series 1 (%), row 1",
      "Series 2 (%), row 1", "Label, row 1", "Series 1 (%), row 4", "Series 2 (%), row 4",
      "Label, row 4", "Series 1 name", "Series 2 name"]],
  ]) {
    const view = nodes(render({
      block: { id: "new-chart", type: "visual-placeholder", source: { part: "studio", index: 0 } },
      initialType: type, intent: "insert", onPreview() {}, onDone() {}, onCancel() {}, onRemove() {},
    }));
    const names = view.filter(node => node.type === "label").flatMap(label => {
      const input = nodes(label).find(node => node.type === "input" || node.type === "textarea");
      return input ? [input.props["aria-label"] ?? text(label)] : [];
    });
    const positions = expected.map(name => names.indexOf(name));
    assert.ok(positions.every(index => index >= 0), `${type} exposes all content fields together: ${names.join(" -> ")}`);
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b), `${type} follows the chart's reading order`);
    assert.deepEqual(view.filter(node => node.props?.role === "tab").map(text),
      type === "horizontal-bar-chart" || type === "paired-percentage-comparison" || type === "percentage-comparison-grid"
        ? ["Content", "Palette"] : ["Content"],
      "Content is not split between Data and Text tabs");
  }
});

test("percentage grids show four standalone findings in both complete and missing-value previews", async () => {
  const jsx = (type, props) => ({ type, props });
  const scope = { exports: {}, require() { return { jsx, jsxs: jsx }; },
    styles: { canonicalVisual: "canonical", interactiveVisual: "interactive", chartAuthoring: "authoring", selected: "selected" },
    parseChartValue };
  const canonicalSource = ts.createSourceFile("canonical-report-components.tsx", readFileSync(new URL(
    "../src/visualization/canonical-report-components.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const PercentageComparisonGrid = componentFunction("PercentageComparisonGrid", scope, canonicalSource);
  const render = componentFunction("CanonicalReportComponent", { ...scope, PercentageComparisonGrid }, canonicalSource);
  const previewSource = ts.createSourceFile("chart-draft-preview.tsx", readFileSync(new URL(
    "../src/report-system/chart-draft-preview.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const preview = componentFunction("ChartDraftPreview", { ...scope, PercentageComparisonGrid }, previewSource);
  const nodes = node => !node || typeof node !== "object" ? []
    : typeof node.type === "function" ? nodes(node.type(node.props))
      : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
  const text = node => Array.isArray(node) ? node.map(text).join(" ")
    : !node || typeof node === "boolean" ? "" : typeof node === "object"
      ? text(typeof node.type === "function" ? node.type(node.props) : node.props?.children) : String(node);
  const table = { columns: ["Finding", "Percentage"], rows: [
    { id: "one", cells: ["First finding", "38.00"] }, { id: "two", cells: ["Second finding", "29"] },
    { id: "three", cells: ["Third finding", "80"] }, { id: "four", cells: ["Fourth finding", "75.125"] },
  ] };
  const source = await createStudioChartSource({
    id: "grid", sourceName: "Chart data", table, synthetic: false, visualType: "percentage-comparison-grid",
  });
  const presentation = {
    title: "Four findings", leadIns: ["In the last six months...", "Yet..."], palette: "brand", note: "Independent findings.",
  };
  const block = { ...createVerifiedDataVisual(source, "percentage-comparison-grid", "2026-11-05T03:40:00.000Z"), presentation };
  const before = structuredClone(block);
  const complete = render({ block });
  const incomplete = preview({ draft: {
    blockId: "grid", type: "percentage-comparison-grid", title: presentation.title,
    leadIns: presentation.leadIns, note: presentation.note, palette: "brand", unit: "percentage",
    table: { ...table, rows: table.rows.map((row, index) => index ? row : { ...row, cells: ["First finding", ""] }) },
  } });
  assert.equal(incomplete.props.className, "canonical interactive authoring selected",
    "An incomplete grid retains the selected chart authoring wrapper");
  for (const view of [complete, incomplete]) {
    const findings = nodes(view).filter(node => node.props?.["data-percentage-finding"]);
    assert.equal(findings.length, 4);
    assert.equal(nodes(view).filter(node => node.type === "strong").length, 4);
    assert.equal(nodes(view).filter(node => node.type === "i").length, 0, "Neither state has bars");
    for (const token of ["In the last six months...", "Yet...", "Independent findings.", "75.125%"]) assert.ok(text(view).includes(token));
    assert.doesNotMatch(text(view), /Source: Chart data|Series 1|Series 2/);
  }
  assert.match(text(complete), /38\.00%/);
  assert.match(text(incomplete), /—/);
  assert.deepEqual(block, before, "Rendering does not change verified evidence");
});

test("Word chart data is immediately editable without copying or changing the original on open", () => {
  const editorSource = ts.createSourceFile(
    "verified-chart-editor.tsx",
    readFileSync(new URL("../src/app/_components/verified-chart-editor.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  const jsx = (type, props) => ({ type, props });
  const effects = [];
  const updates = [];
  const previews = [];
  let selectedTab = "data";
  const original = {
    id: "word-chart", type: "data-visual-source",
    source: { part: "word/document.xml", index: 1 },
    data: {
      sourceKind: "word-table", title: "Team comparison", unit: "percentage",
      recommendedVisualType: "horizontal-bar-chart", sha256: "a".repeat(64),
      columns: ["Team", "Percentage"],
      rows: [{ id: "a", cells: ["Research", "24.00%"] }, { id: "b", cells: ["Support", "0"] }],
    },
  };
  const before = structuredClone(original);
  const render = componentFunction("VerifiedChartEditor", {
    exports: {}, require() { return { jsx, jsxs: jsx }; },
    useRef: current => ({ current }),
    useState: initial => [initial === "data" ? selectedTab : typeof initial === "function" ? initial() : initial, value => updates.push(value)],
    useEffect: effect => effects.push(effect),
    useMemo: callback => callback(),
    chartPresentationSchema, pairedComparisonPresentationSchema, automaticallyVerifiedVisualType, compatibleVerifiedVisuals, createVerifiedDataVisual, parseChartValue, sortChartItems, verifiedDataVisualName, validateChartTable,
    createStudioChartSource() { assert.fail("Opening a chart must not create replacement source data"); },
    Dismiss20Regular: "dismiss-icon", Delete16Regular: "delete-icon",
    TextEditStyle20Regular: "text-icon", DataBarVertical20Regular: "data-icon", Color20Regular: "color-icon", Checkmark16Regular: "check-icon",
    DataBarHorizontal20Regular: "bar-icon", DataPie20Regular: "ring-icon", TextPercent20Regular: "percent-icon", ChevronDown16Regular: "chevron-icon",
    Add16Regular: "add-icon", ArrowUpload20Regular: "upload-icon", ClipboardPaste20Regular: "paste-icon",
    Button: "button", MenuButton: "button", Checkbox: "checkbox", Dropdown: "dropdown", Option: "option",
    Menu: "menu", MenuItem: "menuitem", MenuList: "menulist", MenuPopover: "popover", MenuTrigger: "trigger",
    styles: {}, Caption1: "caption", Body1: "body", Body1Strong: "strong", Subtitle1: "heading",
  }, editorSource);
  function nodes(node) {
    if (!node || typeof node !== "object") return [];
    return [node, ...[node.props?.children, node.props?.icon].flat(Infinity).flatMap(nodes)];
  }
  const rendered = nodes(render({
    block: original, source: original, onPreview: value => previews.push(value),
    onDone() {}, onCancel() {}, onRemove() {},
  }));
  const editorHeader = nodes(rendered.find(node => node.type === "header"));
  const chartSelector = editorHeader.find(node => node.type === "dropdown" && node.props["aria-label"] === "Chart type");
  assert.ok(chartSelector, "Chart type uses the same standard dropdown as other chart controls");
  assert.equal(chartSelector.props.value, "Bar chart");
  assert.deepEqual(chartSelector.props.selectedOptions, ["horizontal-bar-chart"]);
  assert.deepEqual(nodes(chartSelector).filter(node => node.type === "option").map(node => node.props.children),
    ["Bar chart", "Paired comparison", "Percentage rings", "Percentage comparison grid"],
    "The dropdown contains only the four chart names");
  assert.equal(editorHeader.some(node => node.type === "h2"), false,
    "The chart selector replaces the duplicate header title");
  for (const initialType of ["horizontal-bar-chart", "paired-percentage-comparison", "percentage-ring-group", "grouped-column-comparison"]) {
    const insertion = nodes(render({
      block: { id: "new-chart", type: "visual-placeholder", source: { part: "studio", index: 0 } },
      initialType, intent: "insert", onPreview() {}, onDone() {}, onCancel() {}, onRemove() {},
    }));
    assert.equal(nodes(insertion.find(node => node.type === "header")).some(node =>
      node.type === "button" && /^(Add|Replace) data$/.test(node.props.children)), false,
    `${initialType} insertion has no Add data button`);
    assert.ok(insertion.some(node => node.props?.["aria-label"] === "Label, row 1"),
      `${initialType} retains direct manual data entry`);
  }
  const input = rendered.find(node => node.props?.["aria-label"] === "Value (%), row 1");
  assert.equal(rendered.filter(node => node.type === "caption").length, 2,
    "Each category retains an accessible table caption without an extra visible heading");
  assert.ok(rendered.some(node => node.type === "th" && node.props.children === "Value"),
    "The visible Value heading stays unit-neutral; input names retain percentage context");
  assert.ok(rendered.some(node => node.type === "th" && node.props.children === "Label"),
    "The editable label column is generic rather than derived from source headings");
  assert.ok(rendered.some(node => node.props?.["aria-label"] === "Label, row 1"),
    "Accessible input names match the generic column heading");
  const valueTypes = rendered.find(node => node.type === "dropdown" && node.props["aria-label"] === "Value type");
  assert.ok(valueTypes, "Both value types are available in the compact dropdown");
  assert.deepEqual(valueTypes.props.selectedOptions, ["percentage"]);
  assert.deepEqual(nodes(valueTypes).filter(node => node.type === "option").map(node => node.props.value),
    ["percentage", "number"]);
  assert.ok(rendered.findIndex(node => node.props?.["aria-label"] === "Sort by") <
    rendered.findIndex(node => node.props?.["aria-label"] === "Value type"),
  "Sort by precedes Value type in both visual and keyboard order");
  assert.ok(input, "Imported chart values can be edited directly");
  assert.equal(input.props.value, "24.00", "Percentage inputs omit the glyph without dropping source precision");
  assert.equal(rendered.find(node => node.props?.["aria-label"] === "Value (%), row 2").props.value, "0");
  assert.equal(rendered.filter(node => node.type === "input" && node.props.type === "checkbox").length, 0,
    "The Data tab has no source settings or confirmation checkboxes");
  assert.equal(rendered.some(node => node.type === "summary" && node.props.children === "Source details"), false,
    "Source details are kept out of the editor");
  const remove = rendered.find(node => node.props?.["aria-label"] === "Remove row 1");
  assert.ok(nodes(remove).some(node => node.type === "delete-icon" && node.props["aria-hidden"] === "true"),
    "Row removal uses a decorative trash icon inside the labeled button");
  effects.forEach(effect => effect());
  assert.equal(previews.length, 1);
  assert.deepEqual(previews[0].verifiedSource.rows, before.data.rows);
  assert.equal(previews[0].verifiedSource.sha256, before.data.sha256);
  input.props.onChange({ target: { value: "36" } });
  assert.ok(updates.some(value => value?.table?.rows[0].cells[1] === "36"));
  assert.deepEqual(original, before, "Editing a Studio copy leaves the Word source intact");
  const bulletsSource = structuredClone(original);
  bulletsSource.data.rows[0].breakdown = [
    { id: "themes", label: "Identify themes", value: "62.50%" },
    { id: "sentiment", label: "Analyze sentiment", value: "0" },
  ];
  bulletsSource.data.rows[1].supportingText = "One\nTwo\nThree\nFour\nFive\nSix";
  const bulletView = nodes(render({
    block: bulletsSource, source: bulletsSource, onPreview() {}, onDone() {}, onCancel() {}, onRemove() {},
  }));
  const researchBullets = bulletView.filter(node => node.type === "input" &&
    /^Supporting bullet \d+ for Research$/.test(node.props["aria-label"] ?? ""));
  assert.deepEqual(researchBullets.map(node => node.props.value),
    ["Identify themes: 62.50%", "Analyze sentiment: 0%", ""],
    "Legacy numeric breakdowns retain their precision in the three initial bullet slots");
  assert.deepEqual(bulletView.filter(node => node.type === "input" &&
    /^Supporting bullet \d+ for Support$/.test(node.props["aria-label"] ?? "")).map(node => node.props.value),
    ["One", "Two", "Three", "Four", "Five", "Six", ""],
    "Existing supporting text is never capped at four bullets");
  researchBullets[0].props.onChange({ target: { value: "Reviewed finding" } });
  const bulletEdit = updates.findLast(value => value?.table);
  assert.equal(bulletEdit.table.rows[0].supportingText, "Reviewed finding\nAnalyze sentiment: 0%");
  assert.equal(bulletEdit.table.rows[0].breakdown, undefined, "Only an actual edit replaces legacy details");
  assert.equal(bulletEdit.table.rows[0].cells[1], "24.00%");
  assert.equal(bulletEdit.table.rows[1].supportingText, "One\nTwo\nThree\nFour\nFive\nSix");
  let pasteHandled = false;
  researchBullets[0].props.onPaste({
    clipboardData: { getData: () => "First\r\n\r\nThird\rFourth\nFifth" },
    currentTarget: { value: "Identify themes: 62.50%", selectionStart: 0, selectionEnd: 23 },
    preventDefault() { pasteHandled = true; },
  });
  assert.equal(pasteHandled, true);
  assert.equal(updates.findLast(value => value?.table).table.rows[0].supportingText,
    "First\n\nThird\nFourth\nFifth\nAnalyze sentiment: 0%",
    "Multiline paste expands into separate bullets, retaining blank lines and following content");
  assert.deepEqual(rendered.filter(node => node.props?.role === "tab").map(node =>
    nodes(node).find(child => child.type === "span").props.children),
    ["Content", "Palette"], "The editor keeps all content together and palettes separate");
  assert.ok(rendered.filter(node => node.props?.role === "tab").every(tab =>
    nodes(tab).every(node => !String(node.type).endsWith("-icon"))),
  "Chart editing tabs use text labels without decorative icons");
  for (const tab of ["data", "palette"]) {
    selectedTab = tab;
    const view = nodes(render({
      block: original, source: original, onPreview() {}, onDone() {}, onCancel() {}, onRemove() {},
    }));
    assert.equal(view.filter(node => node.type === "input" && node.props.type === "text").length, tab === "data" ? 13 : 0,
      "Content contains chart text, category cells and supporting-bullet inputs together");
    assert.equal(view.filter(node => node.type === "select").length, 0, "Chart controls never open native operating-system menus");
    assert.equal(view.filter(node => node.type === "dropdown").length, tab === "data" ? 3 : 1,
      "Chart type is always available; Content adds Sort by and Value type, while palettes remain radio tiles");
    if (tab === "palette") {
      const palette = view.find(node => node.type === "input" && node.props.name === "word-chart-palette" && node.props.value === "teal");
      assert.ok(palette, "Each palette is directly selectable without opening a dropdown");
      palette.props.onChange();
      assert.equal(updates.at(-1)({ palette: "brand", sort: "source" }).palette, "teal");
      assert.deepEqual(original, before, "An appearance choice cannot rewrite the source");
    }
    if (tab === "data") {
      assert.ok(view.some(node => node.type === "strong" && node.props.children === "Title"));
    }
  }
  assert.equal(rendered.some(node => node.type === "button" && node.props.children === "Remove chart"), false,
    "Imported charts keep their existing removal restriction");
  let removed = 0;
  for (const tab of ["data", "palette"]) {
    selectedTab = tab;
    const studioBlock = { ...original, source: { ...original.source, part: "studio" } };
    const view = nodes(render({
      block: studioBlock, source: original, onPreview() {}, onDone() {}, onCancel() {},
      onRemove() { removed++; },
    }));
    const footer = view.find(node => node.type === "footer");
    const removeChart = nodes(footer).find(node => node.type === "button" && node.props.children === "Remove chart");
    assert.ok(removeChart, `Remove chart remains in the footer on the ${tab} tab`);
    assert.equal(view.filter(node => node.type === "button" && node.props.children === "Remove chart").length, 1);
    removeChart.props.onClick();
  }
  assert.equal(removed, 2, "The footer action retains the existing removal callback");
  const pairSource = {
    ...original, data: { ...original.data, recommendedVisualType: "paired-percentage-comparison" },
  };
  const pair = {
    ...createVerifiedDataVisual(pairSource, "paired-percentage-comparison", "2026-11-03T20:00:00.000Z"),
    presentation: { title: "Two findings", leadIns: ["While...", "Only..."], note: "", palette: "brand" },
  };
  for (const part of ["word/document.xml", "studio"]) {
    selectedTab = "data";
    const view = nodes(render({
      block: { ...pair, source: { ...pair.source, part } }, source: pairSource,
      onPreview() {}, onDone() {}, onCancel() {}, onRemove() {},
    }));
    assert.equal(view.filter(node => node.type === "input" && node.props.type === "text").length, 8);
    assert.equal(view.some(node => node.props?.["aria-label"] === "Remove row 1"), false);
    assert.equal(view.some(node => node.type === "button" && node.props.children === "Add category"), false);
    assert.equal(view.some(node => node.props?.role === "radiogroup"), false,
      "Paired percentages cannot switch to a Number unit");
    assert.ok(view.some(node => node.props?.role === "tab" && nodes(node).some(child => child.props?.children === "Palette")));
    assert.deepEqual(view.filter(node => node.type === "input" && node.props.type === "text")
      .map(node => node.props.value), ["Two findings", "While...", "24.00", "Research", "Only...", "0", "Support", ""]);
  }
  selectedTab = "data";
  for (const [initialType, cells] of [
    ["horizontal-bar-chart", 4], ["paired-percentage-comparison", 4],
    ["percentage-ring-group", 6], ["grouped-column-comparison", 12],
  ]) {
    const view = nodes(render({
      block: { id: "new-chart", type: "visual-placeholder", source: { part: "studio", index: 1 } },
      intent: "insert", initialType, onPreview() {},
      onDone() { assert.fail("An empty chart cannot be inserted"); }, onCancel() {}, onRemove() {},
    }));
    assert.deepEqual(view.filter(node => node.type === "input" && node.props.type === "text" && node.props["inputMode"])
      .map(node => node.props.value), Array(cells).fill(""), `${initialType} starts with the correct blank data shape`);
    assert.equal(view.some(node => node.props["aria-invalid"] === true), false, "Untouched fields do not begin in error");
    const apply = view.find(node => node.type === "button" && node.props.children === "Apply changes");
    assert.ok(apply, "New chart previews use the same Apply changes action as existing charts");
    assert.equal(apply.props.disabled, true);
    apply.props.onClick();
    assert.equal(view.some(node => node.type === "button" && node.props.children === "Remove chart"), false,
      "A draft is canceled, not deleted from the report");
  }
});

test("callout conversion applies immediately and undo restores only affected formatting", () => {
  const first = { id: "first", type: "paragraph", text: "Before. Highlighted text. After.",
    callouts: [{ start: 0, end: 6 }], source: { part: "word/document.xml", index: 1 } };
  const second = { id: "second", type: "paragraph", text: "Another paragraph.",
    source: { part: "word/document.xml", index: 2 } };
  const manifest = { ...project("Immediate callouts").manifest, blocks: [first, second] };
  const actions = [];
  let message;
  const scope = {
    manifest, setTextCallout, requireAppliedEdits: () => true,
    dispatch: action => actions.push(action),
    setStorageMessage: value => { message = value; },
    setActiveTool() {},
    window: { requestAnimationFrame() {} },
  };
  const apply = componentFunction("openTextCallout", scope);
  assert.equal(apply([{ blockId: first.id, start: 8, end: 19 }], true), true);
  assert.equal(actions.length, 1, "Conversion is committed without Apply");
  assert.equal(actions[0].type, "format-text");
  assert.deepEqual(actions[0].blocks[0].callouts, [{ start: 0, end: 6 }, { start: 8, end: 19 }]);
  assert.equal(message.message, "Callout successfully added");
  const changedLink = { start: 0, end: 6, href: "https://example.com/updated" };
  const current = { ...manifest, blocks: [
    { ...actions[0].blocks[0], links: [changedLink] },
    { ...second, callouts: [{ start: 0, end: 7 }] },
  ] };
  componentFunction("undoTextCallout", { ...scope, manifest: current, storageMessage: message })();
  assert.deepEqual(actions[1].blocks, [{ ...first, links: [changedLink] }],
    "Undo restores previous ranges, not stale paragraph text, links, or unrelated formatting");
  assert.deepEqual(message, { message: "Formatting undone." });
  actions.length = 0;
  assert.equal(apply([
    { blockId: first.id, start: 8, end: 19 }, { blockId: second.id, start: 0, end: 999 },
  ], true), false);
  assert.equal(actions.length, 0, "Invalid multi-paragraph selections cannot partially apply");
});

test("image accessibility shows a directly labeled description and preserves saved image data", () => {
  const jsx = (type, props, key) => ({ type, props, key });
  function nodes(node) {
    if (!node || typeof node !== "object") return [];
    return [node, ...[node.props?.children, node.props?.footer].flat(Infinity).flatMap(nodes)];
  }
  for (const [alt, edited] of [["Existing description.", false], ["", false], ["Existing description.", true]]) {
    const effects = [];
    let preview;
    let applied;
    let focused = 0;
    const block = {
      id: "image-1", type: "image", fileName: "chart.png", alt,
      source: { part: "word/document.xml", index: 1 },
      sourceAssetSha256: "a".repeat(64),
      presentation: { style: "glint-labs", crop: "landscape", focalPointX: 20, focalPointY: 40 },
      accessibleData: { title: "Imported chart data" },
    };
    const review = {
      blockId: block.id, assetSha256: block.sourceAssetSha256, alt: "Source alt", description: alt,
      kind: "data-bearing", accessibleData: { title: "Reviewed chart data" },
    };
    const render = componentFunction("ImageEditor", {
      exports: {}, require() { return { jsx, jsxs: jsx }; },
      useRef: (current) => ({ current }),
      useState: (value) => [edited ? "Updated description." : value, () => {}],
      useEffect: (effect) => effects.push(effect),
      useMemo: (callback) => callback(),
      needsImageDescription: (text) => !text.trim(),
      readableImageDescription: (text) => text,
      reportBlockSchema: { safeParse: () => ({ success: true }) },
      styles: {}, Caption1: "caption", Caption1Strong: "strong-caption", Body1: "body", Body1Strong: "strong-body",
      PanelShell: "panel", Image: "thumbnail",
    });
    const rendered = nodes(render({
      block, review, attention: { attempt: 1, message: "Add a description." },
      onDirtyChange() {}, onPreview(value) { preview = value; },
      onApply(block, review) { applied = { block, review }; }, onCancel() {}, onRemove() {},
    }));
    const textarea = rendered.find((node) => node.type === "textarea");
    const label = rendered.find((node) => node.type === "label");
    assert.equal(label.props.htmlFor, textarea.props.id);
    assert.equal(textarea.props.rows, 12);
    assert.equal(rendered[0].props.title, "Image accessibility");
    assert.ok(rendered[0].props.footer, "actions are separate from the scrollable content");
    assert.equal(rendered.find((node) => node.type === "thumbnail").props.alt, "");
    assert.equal(textarea.props.value, edited ? "Updated description." : alt);
    assert.equal(textarea.props.required, true);
    assert.equal(rendered.filter((node) => ["input", "select", "fieldset", "details", "summary"].includes(node.type)).length, 0);
    textarea.props.ref.current = { focus() { focused++; } };
    effects.forEach((effect) => effect());
    assert.equal(focused, 1);
    if (!edited) {
      assert.equal(preview, block, "opening the editor does not change its source block");
    } else {
      const apply = rendered.find((node) => node.type === "button" && node.props.children === "Apply");
      assert.equal(apply.props.disabled, false);
      apply.props.onClick();
      assert.deepEqual(applied.block, { ...block, alt: "Updated description." });
      assert.equal(applied.review.accessibleData, review.accessibleData);
      assert.equal(applied.review.alt, review.alt);
      assert.equal(applied.review.kind, "data-bearing");
      assert.equal(block.alt, alt, "source data and saved image styling remain unchanged");
    }
  }
});

test("image panel close shares Cancel protection and restores the original block", () => {
  const jsx = (type, props) => ({ type, props });
  for (const dirty of [false, true]) {
    const original = { id: "image-1", alt: "Original description.", source: { part: "word/document.xml" } };
    const cancelled = [];
    let confirmations = 0;
    let discard = false;
    const render = componentFunction("ImageEditor", {
      exports: {}, require() { return { jsx, jsxs: jsx }; },
      useRef: (current) => ({ current }),
      useState: (value) => [dirty ? "Changed description." : value, () => {}],
      useEffect() {}, useMemo: (callback) => callback(),
      needsImageDescription: (text) => !text.trim(), readableImageDescription: (text) => text,
      reportBlockSchema: { safeParse: () => ({ success: true }) },
      styles: {}, Caption1: "caption", Body1Strong: "strong",
      PanelShell: "panel", Image: "thumbnail",
      window: { confirm() { confirmations++; return discard; } },
    });
    const panel = render({
      block: original, onDirtyChange() {}, onPreview() {}, onApply() {},
      onCancel(block) { cancelled.push(block); }, onRemove() {},
    });
    const cancel = panel.props.footer.props.children[0].props.children[0];
    assert.equal(panel.props.onClose, cancel.props.onClick, "Close and Cancel use exactly the same handler");
    panel.props.onClose();
    assert.equal(cancelled.length, dirty ? 0 : 1);
    if (dirty) {
      discard = true;
      panel.props.onClose();
    }
    assert.equal(cancelled[0], original);
    assert.equal(confirmations, dirty ? 2 : 0);
  }
});

test("closable panels support Escape without dismissing panels that require explicit completion", () => {
  const jsx = (type, props) => ({ type, props });
  const render = componentFunction("PanelShell", {
    exports: {}, require() { return { jsx, jsxs: jsx }; },
    styles: {}, Subtitle1: "heading", Dismiss20Regular: "dismiss-icon",
  });
  for (const closable of [true, false]) {
    let closed = 0;
    let prevented = 0;
    let stopped = 0;
    const tree = render({ children: "content", title: "Test", closable, onClose() { closed++; } });
    const event = { key: "Escape", defaultPrevented: false, preventDefault() { prevented++; }, stopPropagation() { stopped++; } };
    tree.props.onKeyDown({ ...event, key: "Enter" });
    tree.props.onKeyDown({ ...event, defaultPrevented: true });
    tree.props.onKeyDown(event);
    assert.equal(closed, closable ? 1 : 0);
    assert.equal(prevented, closed);
    assert.equal(stopped, closed);
  }
});

test("image editor dismissal returns focus without scrolling or losing publish attention", () => {
  for (const [attention, imagePresent, expected] of [[false, true, "image"], [true, true, "publish"], [false, false, "publish"]]) {
    const focused = [];
    const target = (name) => ({ focus(options) { focused.push({ name, options }); } });
    const restore = componentFunction("restoreImageEditorFocus", {
      imageAttention: attention ? {} : undefined,
      window: { requestAnimationFrame: (callback) => callback() },
      publishActionRef: { current: target("publish") },
      reportSurfaceRef: { current: { contentDocument: {
        getElementById(id) {
          assert.equal(id, "report-block-image-1");
          return { querySelector: () => imagePresent ? target("image") : null };
        },
      } } },
    });
    restore("image-1");
    assert.deepEqual(focused, [{ name: expected, options: { preventScroll: true } }]);
  }
});

test("Studio ignores cached comment warnings without hiding other warnings or blockers", () => {
  const reviewItems = [
    { id: "comment", code: "comments-omitted", severity: "warning", message: "Reviewer comments omitted." },
    { id: "warning", code: "missing-image-description", severity: "warning", message: "Check this image." },
    { id: "blocker", code: "unsupported-content", severity: "blocker", message: "Resolve unsupported content." },
    { id: "comment-blocker", code: "comments-omitted", severity: "blocker", message: "Never hide a blocker." },
  ];
  const issues = componentValue("issues", {
    manifest: { reviewItems },
    dataVisualsNeedingReview: [],
    useMemo: (callback) => callback(),
  }, "PublishingStudio");
  assert.deepEqual(issues.map((issue) => issue.id), ["warning", "blocker", "comment-blocker"]);
  assert.equal(reviewItems.length, 4, "cached manifests remain unchanged");
  assert.equal(componentValue("issues", {
    manifest: null, dataVisualsNeedingReview: [], useMemo: (callback) => callback(),
  }, "PublishingStudio").length, 0);
});

test("the last report section becomes current at document bottom and resets when scrolling up", () => {
  const navSource = ts.createSourceFile(
    "report-side-nav.tsx",
    readFileSync(new URL("../src/report-system/report-side-nav.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  const scroller = { scrollTop: 1100, scrollHeight: 2000, clientHeight: 900 };
  const tops = [-1000, -200, 443];
  const sections = tops.map((top, index) => ({ href: `#section-${index}`, label: `Section ${index}` }));
  const document = {
    scrollingElement: scroller,
    documentElement: scroller,
    getElementById(id) {
      const index = Number(id.replace("section-", ""));
      return { getBoundingClientRect: () => ({ top: tops[index] }) };
    },
  };
  let activeIndex = -1;
  const update = componentValue("updateActiveSection", {
    animationFrame: 0, document, sections,
    setActiveSectionIndex(updater) { activeIndex = updater(activeIndex); },
  }, undefined, navSource);
  update();
  assert.equal(activeIndex, 2);
  scroller.scrollTop = 1098.5;
  update();
  assert.equal(activeIndex, 2, "fractional bottom coordinates are tolerated");
  scroller.scrollTop = 1000;
  update();
  assert.equal(activeIndex, 1, "scrolling up restores normal section tracking");
  scroller.scrollTop = 0;
  scroller.scrollHeight = 900;
  tops[0] = 100;
  tops[1] = 250;
  update();
  assert.equal(activeIndex, 0, "a non-scrolling document does not select its final section");
  tops[0] = 200;
  update();
  assert.equal(activeIndex, -1, "the cover is not treated as the final section");
  scroller.scrollHeight = 2000;
  scroller.scrollTop = 1100;
  document.scrollingElement = null;
  update();
  assert.equal(activeIndex, 2, "documentElement provides the scroller fallback");
  scroller.clientHeight = 800;
  update();
  assert.equal(activeIndex, -1, "resize moves the viewport away from the bottom");
  sections.length = 0;
  scroller.scrollTop = 1200;
  update();
  assert.equal(activeIndex, -1, "empty navigation has no active section");
});

test("viewport navigation uses the Figma-connected 20px Fluent icons", () => {
  const icon = componentFunction("ReportViewportIcon", {
    ArrowExpand16Regular: "old-expand", Desktop16Regular: "old-desktop",
    Tablet16Regular: "old-tablet", Phone16Regular: "old-mobile",
    ArrowBidirectionalLeftRight20Regular: "width", Desktop20Regular: "desktop",
    Tablet20Regular: "tablet", Phone20Regular: "mobile",
    exports: {},
    require() { return { jsx: (type, props) => ({ type, props }) }; },
  });
  for (const [viewport, expected] of [
    ["full-width", "width"], ["desktop", "desktop"], ["tablet", "tablet"], ["mobile", "mobile"],
  ]) {
    assert.deepEqual(icon({ viewport }), { type: expected, props: { "aria-hidden": "true" } });
  }
});

test("mobile navigation dismisses outside the header and restores focus on Escape", () => {
  const navigationSource = ts.createSourceFile(
    "site-navigation.tsx",
    readFileSync(new URL("../src/app/_components/site-navigation.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  const states = [];
  let focused = 0;
  const scope = {
    setIsMenuOpen(value) { states.push(value); },
    toggleRef: { current: { focus() { focused++; } } },
  };
  const escape = componentFunction("dismissWithEscape", scope, navigationSource);
  escape({ key: "Tab", preventDefault() { throw new Error("Tab remains native"); } });
  assert.deepEqual(states, []);
  let prevented = false;
  escape({ key: "Escape", preventDefault() { prevented = true; } });
  assert.deepEqual(states, [false]);
  assert.equal(prevented, true);
  assert.equal(focused, 1);
  const inside = {};
  const outside = componentFunction("dismissOutside", {
    ...scope, navigation: { contains: (target) => target === inside },
  }, navigationSource);
  outside({ target: inside });
  assert.equal(states.length, 1);
  outside({ target: {} });
  assert.deepEqual(states, [false, false]);
});

test("the source leadership table keeps its first data row and native row-header semantics", () => {
  const tableSource = ts.createSourceFile(
    "launch-report.tsx",
    readFileSync(new URL("../src/launch-reports/launch-report.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  const jsx = (type, props, key) => ({ type, props, key });
  const render = componentFunction("SourceRowHeaderTable", {
    exports: {}, require() { return { jsx, jsxs: jsx }; },
    styles: { accessibleData: "data", accessibleDataScroller: "scroller" },
  }, tableSource);
  const columns = Object.freeze(["First dimension", "First principle"]);
  const cells = Object.freeze(["Second dimension", "Second principle"]);
  const block = Object.freeze({ data: Object.freeze({ columns, rows: Object.freeze([{ cells }]) }) });
  const region = render({ block }).props.children;
  assert.equal(region.props.role, "region");
  assert.equal(region.props.tabIndex, 0);
  assert.ok(region.props["aria-label"]);
  const table = region.props.children;
  assert.equal(table.type, "table");
  const rows = table.props.children.props.children;
  assert.deepEqual(rows.map(row => row.props.children.map(cell => cell.props.children)), [columns, cells]);
  assert.ok(rows.every(row => row.props.children[0].type === "th" && row.props.children[0].props.scope === "row"));
});

test("Research Drop cards use the histogram icon while Annual Reports retain the calendar", () => {
  const cardSource = ts.createSourceFile(
    "study-card.tsx",
    readFileSync(new URL("../src/app/_components/study-card.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  const jsx = (type, props, key) => ({ type, props, key });
  const scope = {
    exports: {},
    require() { return { jsx, jsxs: jsx }; },
    Image: "image", Link: "link", EmployeeCountBadge: "employee-count",
    DataHistogram16Regular: "histogram", Calendar16Regular: "calendar",
    PersonCircle16Regular: "person", People16Regular: "people",
    styles: { badge: "badge" },
  };
  const render = componentFunction("StudyCard", scope, cardSource);
  for (const category of ["research-drop", "annual"]) {
    for (const placeholder of [false, true]) {
      for (const preview of [false, true]) {
        const report = { category, title: "Source title", badge: "Source badge", description: "Source summary", href: "/reports/source" };
        const card = render({ report, placeholder, preview });
        const badge = card.props.children[0].props.children[1].props.children[0];
        const icon = badge.props.children[0];
        assert.equal(badge.props.children[1], report.badge);
        assert.equal(icon.type, category === "research-drop" ? "histogram" : "image");
        if (category === "research-drop") assert.equal(icon.props["aria-hidden"], "true");
        else assert.equal(icon.props.src, "/figma/site-canonical/home/study-card-calendar.svg");
      }
    }
  }
  const annual = componentFunction("AnnualStudyBadges", scope, cardSource)();
  assert.equal(annual.props.children[0].props.children[0].type, "calendar");
});

test("only lists in the Research Drop in Brief section get a card", () => {
  const rendererSource = ts.createSourceFile(
    "report-renderer.tsx",
    readFileSync(new URL("../src/report-system/report-renderer.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  const jsx = (type, props, key) => ({ type, props, key });
  const scope = {
    exports: {},
    require() { return { jsx, jsxs: jsx }; },
    RichText: "rich-text",
    renderBlock: (block) => block.text,
    isResearchBriefHeading: componentFunction("isResearchBriefHeading", {}, rendererSource),
    isReferencesHeading: componentFunction("isReferencesHeading", {}, rendererSource),
    styles: {
      list: "list", briefList: "brief-card", briefCard: "brief-container", listItem: "item", reportBlock: "block",
      sectionStart: "section", heading2: "heading-2", briefHeading: "brief-heading",
    },
  };
  scope.reportReferenceMarkers = componentFunction("reportReferenceMarkers", scope, rendererSource);
  scope.headingLabel = componentFunction("headingLabel", scope, rendererSource);
  const render = componentFunction("reportContent", scope, rendererSource);
  const heading = (text, level = 2) => ({ type: "heading", text, level });
  const item = () => ({ type: "list-item", text: "Unchanged finding", level: 0 });
  const blocks = [
    item(),
    heading("Research Drop in Brief:"),
    item(),
    heading("Detail within the brief", 3),
    item(),
    heading("Cementing the Purpose of Managers"),
    item(),
    { type: "paragraph", text: "Research Drop in Brief:" },
    item(),
    heading("  RESEARCH DROP IN BRIEF  ", 3),
    item(),
    heading("Next main section", 1),
    item(),
    heading("Research Drop in Briefish"),
    item(),
  ].map((block, index) => ({
    ...block, id: `block-${index}`, source: { part: "word/document.xml", index },
  }));
  const rendered = render(blocks, {});
  const cards = rendered.filter((node) => node.props.className === "brief-container");
  assert.equal(cards.length, 2);
  for (const card of cards) {
    assert.equal(card.props.children[0].type, "div");
    assert.equal(card.props.children[0].props.children, blocks.find((block) => `report-block-${block.id}` === card.props.children[0].props.id).text);
    assert.equal(card.props.children[1].type, "ul");
  }
  const lists = rendered.flatMap((node) => node.props.className === "brief-container" ? node.props.children : [node])
    .filter((node) => node.type === "ul");
  assert.deepEqual(lists.map((node) => node.props.className.includes("brief-card")), [
    false, true, true, false, false, true, false, false,
  ]);
  for (const list of lists) {
    assert.equal(list.props.children[0].props.children.props.children.props.block.text, "Unchanged finding");
  }
  const renderHeading = componentFunction("renderBlock", {
    ...scope,
    isCanonicalVisualBlock: () => false,
    headingTag: componentFunction("headingTag", {}, rendererSource),
  }, rendererSource);
  for (const [text, compact, expected] of [
    ["Research Drop in Brief:", true, "Research Drop in Brief"],
    ["Research Drop in Brief", true, "Research Drop in Brief"],
    ["Research Drop in Brief : ", true, "Research Drop in Brief"],
    ["Other section:", false, "Other section:"],
    ["Research Drop in Briefish", false, "Research Drop in Briefish"],
  ]) {
    const block = Object.freeze({ ...heading(text), id: "heading", source: { part: "word/document.xml", index: 0 } });
    const rendered = renderHeading(block, {});
    assert.equal(rendered.type, "h2");
    assert.equal(rendered.props.className.includes("brief-heading"), compact);
    assert.equal(rendered.props.children, expected);
    assert.equal(block.text, text);
    const override = jsx("span", { children: text });
    assert.equal(renderHeading(block, { textOverrides: { heading: override } }).props.children, compact ? expected : override);
  }
});

test("source divider markers reuse section rules without duplicating a following heading rule", () => {
  const rendererSource = ts.createSourceFile(
    "report-renderer.tsx",
    readFileSync(new URL("../src/report-system/report-renderer.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  const jsx = (type, props, key) => ({ type, props, key });
  const scope = {
    exports: {},
    require() { return { jsx, jsxs: jsx }; },
    renderBlock: (block) => block.text,
    isResearchBriefHeading: componentFunction("isResearchBriefHeading", {}, rendererSource),
    isReferencesHeading: componentFunction("isReferencesHeading", {}, rendererSource),
    reportReferenceMarkers: () => new Map(),
    styles: { reportBlock: "block", sectionStart: "section" },
  };
  const render = componentFunction("reportContent", scope, rendererSource);
  const blocks = [
    { type: "paragraph", text: "Before the spotlight." },
    { type: "paragraph", text: "----" },
    { type: "heading", level: 2, text: "Customer spotlight" },
    { type: "paragraph", text: "Source story." },
    { type: "paragraph", text: "----" },
    { type: "paragraph", text: "Closing questions." },
    { type: "heading", level: 2, text: "Next section" },
    { type: "paragraph", text: "Not ---- a divider." },
  ].map((block, index) => Object.freeze({
    ...block, id: `block-${index}`, source: { part: "word/document.xml", index },
  }));
  const rendered = render(blocks, {});
  for (const index of [1, 4]) {
    assert.equal(rendered[index].props.role, "separator");
    assert.equal(rendered[index].props.className, "block section");
    assert.equal(rendered[index].props.children, null);
    assert.equal(blocks[index].text, "----");
  }
  assert.equal(rendered[2].props.className, "block");
  assert.equal(rendered[5].props.children, "Closing questions.");
  assert.equal(rendered[6].props.className, "block section");
  assert.equal(rendered[7].props.role, undefined);
  assert.equal(rendered[7].props.children, "Not ---- a divider.");
  const hidden = render(blocks, { hiddenBlockIds: new Set(["block-1"]) });
  assert.equal(hidden[1].props.className, "block section", "a hidden divider does not remove the next heading's rule");
});

test("References styling stays within its section and preserves citation text and links", () => {
  const rendererSource = ts.createSourceFile(
    "report-renderer.tsx",
    readFileSync(new URL("../src/report-system/report-renderer.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  const jsx = (type, props, key) => ({ type, props, key });
  const scope = {
    exports: {},
    require() { return { jsx, jsxs: jsx }; },
    RichText: "rich-text",
    renderBlock: (block, props, reference) => ({ block, reference }),
    isResearchBriefHeading: componentFunction("isResearchBriefHeading", {}, rendererSource),
    isReferencesHeading: componentFunction("isReferencesHeading", {}, rendererSource),
    styles: {
      reportBlock: "block", referencesBlock: "references-block", referencesList: "references-list",
      referencesHeading: "references-heading", referenceMarker: "reference-marker",
      list: "list", listItem: "item", sectionStart: "section", heading2: "heading-2",
    },
  };
  const heading = (text, level = 2) => ({ type: "heading", text, level });
  const paragraph = (text) => ({ type: "paragraph", text });
  const blocks = [
    paragraph("References"),
    heading("  REFERENCES:  "),
    paragraph("[1]Source"),
    heading("Methodology", 3),
    paragraph("Unchanged methodology."),
    { type: "list-item", text: "[2]Another source", level: 0 },
    heading("Next section"),
    paragraph("Normal body."),
    heading("References and further reading"),
    paragraph("Still normal body."),
  ].map((block, index) => ({
    ...block, id: `block-${index}`, source: { part: "word/document.xml", index },
  }));
  scope.reportReferenceMarkers = componentFunction("reportReferenceMarkers", scope, rendererSource);
  const contents = componentFunction("reportContent", scope, rendererSource);
  const rendered = contents(blocks, {});
  assert.deepEqual(rendered.filter((node) => node.type === "div").map((node) => node.props.children.reference), [
    false, true, true, true, true, false, false, false, false,
  ]);
  assert.ok(rendered.find((node) => node.type === "ul").props.className.includes("references-list"));
  const renderHeading = componentFunction("renderBlock", {
    ...scope, isCanonicalVisualBlock: () => false,
    headingTag: componentFunction("headingTag", {}, rendererSource),
  }, rendererSource);
  const title = renderHeading(blocks[1], {});
  assert.equal(title.type, "h2");
  assert.equal(title.props.children, blocks[1].text);
  assert.ok(title.props.className.includes("references-heading"));
  const richText = componentFunction("RichText", scope, rendererSource);
  const block = {
    ...paragraph("[1]Original source."), id: "citation",
    links: [{ start: 3, end: 18, href: "https://example.com/source" }],
  };
  const citation = richText({ block, reference: true });
  assert.equal(citation[0].type, "sup");
  assert.equal(citation[0].props.children, "[1]");
  assert.equal(citation[1].type, "a");
  assert.equal(citation[1].props.href, block.links[0].href);
  assert.equal(citation.map((node) => typeof node === "string" ? node : node.props.children).join(""), block.text);
  assert.equal(richText({ block })[0], "[1]");
  assert.equal(richText({ block: { ...block, links: [] }, reference: true })[0].type, "sup");
  assert.equal(richText({ block: paragraph("No citation marker."), reference: true }), "No citation marker.");
  const overlapping = richText({ block: { ...block, links: [{ ...block.links[0], start: 0 }] }, reference: true });
  const text = node => Array.isArray(node) ? node.map(text).join("")
    : typeof node === "string" ? node : text(node.props.children);
  assert.equal(overlapping[0].type, "a");
  assert.equal(overlapping[0].props.children[0].type, "sup");
  assert.equal(text(overlapping[0]), block.text.slice(0, block.links[0].end));
  assert.equal(text(overlapping), block.text);
  const insertionProps = { onInsertChart() {} };
  const referenceSection = blocks.slice(0, 6);
  assert.deepEqual(contents(referenceSection, insertionProps).map(node => node.props["data-chart-insert-before"]).filter(id => id !== undefined),
    ["block-0", "block-1"], "Insert before References, never between citations or after them");
  assert.ok(contents(referenceSection, { ...insertionProps, mode: "read" })
    .every(node => node.props["data-chart-insert-before"] === undefined), "Reader has no authoring boundaries");
  assert.deepEqual(contents([{
    id: "references", type: "references", source: { part: "studio", index: 0 },
  }], insertionProps).map(node => node.props["data-chart-insert-before"]).filter(id => id !== undefined),
  ["references"], "A self-contained references block also ends the editable body");
});

test("inline citations match actual References entries and preserve all text and link offsets", () => {
  const renderer = ts.createSourceFile(
    "report-renderer.tsx",
    readFileSync(new URL("../src/report-system/report-renderer.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  const jsx = (type, props, key) => ({ type, props, key });
  const scope = {
    exports: {}, require() { return { jsx, jsxs: jsx }; },
    styles: { referenceMarker: "reference-marker" },
    isReferencesHeading: componentFunction("isReferencesHeading", {}, renderer),
  };
  const referenceMarkers = componentFunction("reportReferenceMarkers", scope, renderer);
  const richText = componentFunction("RichText", scope, renderer);
  const blocks = [
    { type: "paragraph", text: "[9] Not a reference section." },
    { type: "heading", level: 2, text: " References: " },
    { type: "paragraph", text: "[1] First source." },
    { type: "list-item", text: " [2] Second source.", level: 0 },
    { type: "heading", level: 3, text: "More sources" },
    { type: "paragraph", text: "[12] Another source." },
    { type: "heading", level: 2, text: "Appendix" },
    { type: "paragraph", text: "[99] Not a reference entry." },
  ].map((block, index) => ({ ...block, id: `block-${index}` }));
  const markers = referenceMarkers(blocks);
  assert.deepEqual([...markers], ["[1]", "[2]", "[12]"]);
  assert.deepEqual([...referenceMarkers(blocks, new Set(["block-3"]))], ["[1]", "[12]"]);
  assert.deepEqual([...referenceMarkers([blocks[0]])], []);
  const text = node => Array.isArray(node) ? node.map(text).join("")
    : typeof node === "string" ? node : node ? text(node.props.children) : "";
  const nodes = node => Array.isArray(node) ? node.flatMap(nodes)
    : node && typeof node === "object" ? [node, ...nodes(node.props.children)] : [];
  const original = "Changes[1][2], 31% in 2025, [99], and more changes[1].";
  for (const type of ["paragraph", "list-item"]) {
    const block = { id: "body", type, text: original };
    const before = structuredClone(block);
    const rendered = richText({ block, referenceMarkers: markers });
    assert.equal(text(rendered), original);
    assert.deepEqual(nodes(rendered).filter(n => n.type === "sup").map(text), ["[1]", "[2]", "[1]"]);
    assert.deepEqual(block, before);
    assert.equal(richText({ block, referenceMarkers: new Set() }), original, "unmatched numbers stay as written");
  }
  const value = "See source[12] and keep this link.";
  const start = value.indexOf("[12]");
  for (const [from, to] of [[start, start + 4], [0, value.length], [start + 1, start + 3]]) {
    const block = { id: "linked", type: "paragraph", text: value, links: [
      { start: from, end: to, href: "https://example.com/original#source" },
    ] };
    const before = structuredClone(block);
    const rendered = richText({ block, referenceMarkers: markers });
    const links = nodes(rendered).filter(n => n.type === "a");
    assert.equal(links.length, 1, "formatting never splits a source link into extra tab stops");
    assert.equal(links[0].props.href, block.links[0].href);
    assert.equal(text(links[0]), value.slice(from, to));
    assert.equal(nodes(rendered).filter(n => n.type === "sup").map(text).join(""), "[12]");
    assert.equal(text(rendered), value);
    assert.deepEqual(block, before, "approved text and link ranges are unchanged");
    const boundaries = [0, start + 1, start + 3, value.length];
    const segments = boundaries.slice(1).map((end, index) => richText({
      block, referenceMarkers: markers, start: boundaries[index], end,
    }));
    assert.equal(text(segments), value, "partial callouts retain every source character in order");
    assert.equal(nodes(segments).filter(n => n.type === "sup").map(text).join(""), "[12]");
    assert.equal(nodes(segments).filter(n => n.type === "a").map(text).join(""), value.slice(from, to));
    assert.ok(nodes(segments).filter(n => n.type === "a").every(link => link.props.href === block.links[0].href));
  }
  const label = { id: "label", type: "paragraph", text: "  [1] Original reference." };
  const renderedLabel = richText({ block: label, reference: true, referenceMarkers: markers });
  assert.equal(text(renderedLabel), label.text);
  assert.deepEqual(nodes(renderedLabel).filter(n => n.type === "sup").map(text), ["[1]"]);
});

test("applying editorial formatting preserves review warnings and participates in unsaved-edit protection", () => {
  const reducer = componentFunction("reducer", {});
  const original = project("Editorial");
  original.manifest.blocks.push({ id: "paragraph", type: "paragraph", text: "Before. Selected. After.", source: { part: "word/document.xml", index: 1 } });
  original.manifest.reviewItems.push({ id: "paragraph-review", blockId: "paragraph", severity: "warning", message: "Review this source." });
  const loaded = reducer({ status: "empty" }, { type: "load-project", project: original });
  const draft = { ...original.manifest.blocks.at(-1), callouts: [{ start: 8, end: 17 }] };
  const applied = reducer(loaded, { type: "format-text", blocks: [draft] });
  assert.deepEqual(applied.manifest.reviewItems, loaded.manifest.reviewItems);
  assert.deepEqual(applied.manifest.blocks.at(-1), draft);
  assert.equal(loaded.manifest.blocks.at(-1).callouts, undefined);
  assert.equal(changeStatus(loaded, { currentProject: original }).edits, false);
  assert.equal(changeStatus(applied, { currentProject: original }).edits, true);
});

test("callout rendering keeps explicit text overrides authoritative and outside selection formatting", () => {
  const renderer = ts.createSourceFile(
    "report-renderer.tsx",
    readFileSync(new URL("../src/report-system/report-renderer.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  const jsx = (type, props, key) => ({ type, props, key });
  const render = componentFunction("renderBlock", {
    exports: {}, require() { return { jsx, jsxs: jsx }; },
    isCanonicalVisualBlock: () => false,
    textCalloutSegments: block => block.callouts.map(range => ({ ...range, callout: true })),
    RichText: "rich-text", styles: { paragraph: "paragraph", textCallout: "callout" },
  }, renderer);
  const block = { id: "paragraph", type: "paragraph", text: "Approved text.", callouts: [{ start: 0, end: 14 }],
    source: { part: "word/document.xml", index: 0 } };
  const props = { onSelectText: () => true };
  const callout = render(block, props);
  assert.equal(callout.props.children[0].props["data-text-callout"], true);
  assert.equal(callout.props["data-report-text-block"], block.id);
  for (const override of ["Display override.", ""]) {
    const displayed = render(block, { ...props, textOverrides: { [block.id]: override } });
    assert.equal(displayed.type, "p");
    assert.equal(displayed.props.children, override);
    assert.equal(displayed.props["data-report-text-block"], undefined);
  }
});

test("preview readiness waits for report content, stylesheets, fonts, and a render frame", async () => {
  const viewportSource = ts.createSourceFile(
    "studio-report-viewport.tsx",
    readFileSync(new URL("../src/app/_components/studio-report-viewport.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  let hasReport = false;
  let resolveFonts;
  let layouts = 0;
  const frames = [];
  const statuses = [];
  const stylesheet = { tagName: "LINK", sheet: null };
  const ready = componentFunction("revealWhenReady", {
    disposed: false, revealed: false, failed: false, checking: false,
    styleVersion: 0, revealFrame: 0,
    copies: new Map([["stylesheet", stylesheet]]),
    previewDocument: {
      querySelector: () => hasReport ? { getBoundingClientRect() { layouts++; } } : null,
      fonts: { ready: new Promise((resolve) => { resolveFonts = resolve; }) },
    },
    requestAnimationFrame(callback) { frames.push(callback); return 1; },
    contentObserver: { disconnect() {} },
    setPreviewStatus(value) { statuses.push(value); },
  }, viewportSource);
  ready();
  hasReport = true;
  ready();
  assert.equal(layouts, 0, "pending styles keep the report hidden");
  stylesheet.sheet = {};
  ready();
  assert.equal(layouts, 1, "layout starts font loading before readiness is checked");
  assert.equal(frames.length, 0);
  assert.deepEqual(statuses, []);
  resolveFonts();
  await Promise.resolve();
  assert.equal(frames.length, 1);
  assert.deepEqual(statuses, []);
  frames[0]();
  assert.deepEqual(statuses, ["ready"]);
});

test("preview stays hidden while loading or failed and offers a local retry", () => {
  const viewportSource = ts.createSourceFile(
    "studio-report-viewport.tsx",
    readFileSync(new URL("../src/app/_components/studio-report-viewport.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  const jsx = (type, props, key) => ({ type, props, key });
  for (const status of ["loading", "ready", "error"]) {
    const states = [];
    const frameRef = { current: {} };
    const render = componentFunction("StudioReportViewport", {
      exports: {}, require() { return { jsx, jsxs: jsx }; },
      useEffect() {},
      useState(initial) { return [initial === undefined ? undefined : status, (value) => states.push(value)]; },
      createPortal() {},
      previewDocumentHtml: "<!doctype html><html><body></body></html>",
      styles: { previewLoading: "preview-loading", secondaryAction: "secondary" },
    }, viewportSource);
    const tree = render({ children: "report", className: "frame", frameRef, onInteract() {}, style: { "--canvas-scale": 0.5 } });
    const [iframe, feedback] = tree.props.children;
    assert.equal(iframe.props.style.visibility, status === "ready" ? "visible" : "hidden");
    assert.equal(iframe.props.style["--canvas-scale"], 0.5);
    assert.equal(iframe.props["aria-hidden"], status !== "ready");
    if (status === "ready") assert.equal(feedback, null);
    else assert.equal(feedback.props.role, status === "error" ? "alert" : "status");
    if (status === "error") {
      const retry = feedback.props.children.props.children[1];
      retry.props.onClick();
      assert.deepEqual(states, ["loading", undefined]);
      assert.match(frameRef.current.srcdoc, /^<!doctype html>/);
    }
  }
});

test("preview fits the workspace in both dimensions without depending on report length", () => {
  for (const [viewport, width, height] of [
    ["desktop", 1440, 900], ["tablet", 1024, 768], ["mobile", 390, 844],
  ]) {
    for (const [canvasWidth, canvasHeight] of [[1440, 820], [1000, 700], [320, 488], [1920, 1200]]) {
      let result;
      let available;
      const update = componentFunction("updateCanvasScale", {
        observedCanvas: { clientWidth: canvasWidth, clientHeight: canvasHeight },
        reportViewport: viewport, reportCanvasWidth: width, reportCanvasHeight: height,
        setCanvasScale(value) { result = value; },
        setAvailableCanvasWidth(value) { available = value; },
        setAvailableCanvasHeight() {},
      });
      update();
      assert.equal(available, canvasWidth - 80);
      assert.ok(width * result <= canvasWidth - 80);
      assert.ok(height * result <= canvasHeight - 80);
      assert.ok(result > 0 && result <= 1);
    }
  }
  let scale;
  let size = [];
  componentFunction("updateCanvasScale", {
    observedCanvas: { clientWidth: 1200, clientHeight: 700 },
    reportViewport: "full-width", reportCanvasWidth: 1440, reportCanvasHeight: 900,
    setCanvasScale(value) { scale = value; },
    setAvailableCanvasWidth(value) { size[0] = value; },
    setAvailableCanvasHeight(value) { size[1] = value; },
  })();
  assert.equal(scale, 1);
  assert.deepEqual(size, [1200, 620], "Full width retains the preview's vertical canvas inset");
});

test("review issue navigation scrolls the preview document, not the Studio", () => {
  const selected = [];
  const lookups = [];
  const scrolls = [];
  const reportSurfaceRef = { current: { contentDocument: {
    getElementById(id) {
      lookups.push(id);
      return { scrollIntoView(options) { scrolls.push(options); } };
    },
  } } };
  const highlight = componentFunction("highlightIssue", {
    reportSurfaceRef, setHighlightedBlockId(value) { selected.push(value); },
  });
  highlight("heading-1");
  highlight();
  reportSurfaceRef.current.contentDocument = null;
  highlight("heading-2");
  reportSurfaceRef.current = null;
  highlight("heading-3");
  assert.deepEqual(lookups, ["report-block-heading-1"]);
  assert.deepEqual(scrolls, [{ block: "center" }]);
  assert.deepEqual(selected, ["heading-1", undefined, "heading-2", "heading-3"]);
});

test("preview section links stay inside the report while other links open safely outside Studio", () => {
  const viewportSource = ts.createSourceFile(
    "studio-report-viewport.tsx",
    readFileSync(new URL("../src/app/_components/studio-report-viewport.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
  );
  const scrolls = [];
  const navigate = componentFunction("navigatePreviewLink", {
    previewDocument: {
      getElementById(id) {
        assert.equal(id, "report-section");
        return { scrollIntoView(options) { scrolls.push(options); } };
      },
    },
  }, viewportSource);
  let prevented = 0;
  const internal = { getAttribute: () => "#report-section" };
  navigate({ target: { closest: () => internal }, preventDefault() { prevented++; } });
  assert.equal(prevented, 1);
  assert.deepEqual(scrolls, [{ block: "start" }]);
  const external = { getAttribute: () => "https://example.com/research" };
  navigate({ target: { closest: () => external }, preventDefault() { throw new Error("External links stay native"); } });
  assert.equal(external.target, "_blank");
  assert.equal(external.rel, "noopener noreferrer");
});

function changeStatus(state, {
  currentProject,
  reportStyle = state.initialReportStyle,
  acceptedReviewItemIds = [],
  imageReviews = [],
  hasUnappliedImageChanges = false,
  chartInsertion,
} = {}) {
  const scope = {
    state, currentProject, reportStyle, acceptedReviewItemIds, imageReviews,
    hasUnappliedImageChanges,
    chartInsertion,
    manifest: state.status === "ready" ? state.manifest : undefined,
    hasStudioProjectChanges,
    useMemo: callback => callback(),
  };
  scope.hasProjectChanges = componentValue("hasProjectChanges", scope);
  scope.hasUnsavedEdits = componentValue("hasUnsavedEdits", scope);
  scope.hasUnsavedChanges = componentValue("hasUnsavedChanges", scope);
  return { edits: scope.hasUnsavedEdits, lossWarning: scope.hasUnsavedChanges };
}

test("upload establishes the edit baseline without removing unsaved-draft protection", async () => {
  const app = studio();
  await app.handleFile({ target: {
    files: [{ name: "Import.docx", arrayBuffer: async () => new ArrayBuffer(0) }], value: "Import.docx",
  } });
  const imported = app.state();
  assert.equal(imported.status, "ready");
  assert.equal(imported.initialReportStyle, "new-fluent-colors");
  assert.deepEqual(changeStatus(imported), { edits: false, lossWarning: true });
  assert.deepEqual(changeStatus(imported, { reportStyle: "research-report" }), { edits: true, lossWarning: true });
  assert.deepEqual(changeStatus(imported), { edits: false, lossWarning: true });
  assert.deepEqual(changeStatus(imported, { hasUnappliedImageChanges: true }), { edits: true, lossWarning: true });
});

test("content and review edits compare against import until saved, then against the saved draft", () => {
  const reducer = componentFunction("reducer", {});
  const original = project("Imported");
  original.manifest.reviewItems = [{ id: "review-1", severity: "warning", message: "Check layout." }];
  const imported = reducer({ status: "empty" }, {
    type: "complete", result: { manifest: original.manifest }, reportStyle: original.reportStyle,
  });
  assert.deepEqual(changeStatus(imported), { edits: false, lossWarning: true });
  assert.deepEqual(changeStatus(imported, { acceptedReviewItemIds: ["review-1"] }), { edits: true, lossWarning: true });
  const edited = reducer(imported, {
    type: "preview-block", block: { ...original.manifest.blocks[0], text: "Edited heading" },
  });
  assert.deepEqual(changeStatus(edited), { edits: true, lossWarning: true });
  assert.deepEqual(changeStatus(imported), { edits: false, lossWarning: true });
  const saved = { ...original, manifest: edited.manifest };
  assert.deepEqual(changeStatus(edited, { currentProject: saved }), { edits: false, lossWarning: false });
  assert.deepEqual(changeStatus(imported, { currentProject: saved }), { edits: true, lossWarning: true });
  assert.deepEqual(changeStatus(reducer(imported, { type: "load-project", project: saved }), {
    currentProject: saved,
  }), { edits: false, lossWarning: false });
  for (const state of [{ status: "empty" }, { status: "extracting" }, { status: "failed" }]) {
    assert.deepEqual(changeStatus(state), { edits: false, lossWarning: false });
  }
  assert.match(source.getText(), /\{hasUnsavedEdits \? \(\s*<Caption1[^>]*role="status">Unsaved changes/);
});

test("opening or reverting image edits preserves the original block without synthesizing presentation changes", () => {
  const initialDescription = "A&B";
  for (const presentation of [undefined, { style: "glint-labs", crop: "landscape", focalPointX: 20, focalPointY: 40 }]) {
    const originalBlock = { id: "image-1", alt: "A&amp;B", type: "image", ...(presentation ? { presentation } : {}) };
    const scope = { originalBlock, initialDescription, useMemo: callback => callback() };
    const draft = (alt) => componentValue("draft", { ...scope, alt }, "ImageEditor");
    assert.equal(draft(initialDescription), originalBlock);
    assert.deepEqual(draft("Changed"), { ...originalBlock, alt: "Changed" });
    assert.equal(draft(initialDescription), originalBlock);
  }
});

for (const navigation of ["home", "load"]) {
  for (const outcome of ["success", "failure"]) {
    test(`abandoned import ${outcome} cannot replace a saved project after ${navigation}`, async () => {
      const app = studio({
        extractDocx: async () => {
          if (outcome === "failure") throw new Error("Synthetic import failure");
          return { manifest: project("Abandoned import").manifest };
        },
      });
      let release;
      const buffer = new Promise(resolve => { release = resolve; });
      const pending = app.handleFile({ target: {
        files: [{ name: "Abandoned.docx", arrayBuffer: () => buffer }], value: "Abandoned.docx",
      } });
      assert.equal(app.state().status, "extracting");
      if (navigation === "home") app.goHome();
      assert.equal(app.load(app.saved), true);
      release(new ArrayBuffer(0));
      await pending;
      assert.equal(app.state().status, "ready");
      assert.equal(app.state().manifest.metadata.title, "Saved draft");
      assert.equal(app.currentProject().id, app.saved.id);
      assert.equal(app.actions.some(action => action.type === "complete" || action.type === "fail"), false);
    });
  }
}

for (const navigation of ["home", "load"]) {
  for (const outcome of ["success", "failure"]) {
    test(`in-flight extraction ${outcome} cannot replace a saved project after ${navigation}`, async () => {
      let release, started;
      const barrier = new Promise(resolve => { release = resolve; });
      const extracting = new Promise(resolve => { started = resolve; });
      const app = studio({
        extractDocx: async () => {
          started();
          await barrier;
          if (outcome === "failure") throw new Error("Synthetic extraction failure");
          return { manifest: project("Abandoned import").manifest };
        },
      });
      const pending = app.handleFile({ target: {
        files: [{ name: "Abandoned.docx", arrayBuffer: async () => new ArrayBuffer(0) }], value: "Abandoned.docx",
      } });
      await extracting;
      if (navigation === "home") app.goHome();
      assert.equal(app.load(app.saved), true);
      release();
      await pending;
      assert.equal(app.state().status, "ready");
      assert.equal(app.state().manifest.metadata.title, "Saved draft");
      assert.equal(app.currentProject().id, app.saved.id);
      assert.equal(app.actions.some(action => action.type === "complete" || action.type === "fail"), false);
    });
  }
}

test("a failed lazy extractor download surfaces the import error and resets the file input", async () => {
  const app = studio({ loadError: new Error("Synthetic extractor chunk failed to load") });
  const input = {
    files: [{ name: "Report.docx", arrayBuffer: async () => new ArrayBuffer(0) }], value: "Report.docx",
  };
  await app.handleFile({ target: input });
  assert.equal(app.state().status, "failed");
  assert.equal(app.state().message, "Synthetic extractor chunk failed to load");
  assert.equal(input.value, "");
});

test("unapplied image edits block saving, Home, publishing, project switching, and another upload", async () => {
  const app = studio({ selectedImage: true });
  app.goHome();
  assert.equal(await app.save(), undefined);
  await app.publish();
  assert.equal(app.load(app.saved), false);
  const input = { files: [{ name: "Another.docx", arrayBuffer() { throw new Error("Unexpected import"); } }], value: "Another.docx" };
  await app.handleFile({ target: input });
  assert.equal(input.value, "");
  assert.deepEqual(app.actions, []);
  assert.equal(app.currentProject(), undefined);
  assert.equal(app.messages.length, 5);
  assert.ok(app.messages.every(message => message.includes("Apply or cancel")));
});

function publicationLoader() {
  let state = [], effects = [], stateIndex = 0, effectIndex = 0;
  const requests = [], errors = [];
  const props = { project: project("Publishing"), onClose() {}, onSave() {} };
  function LoadingDialog() {}
  const renderLoader = componentFunction("PublicationPackageLoader", {
    exports: {},
    loadedPublicationDialog: undefined,
    PublicationLoadingDialog: LoadingDialog,
    console: { error: (...args) => errors.push(args) },
    useState(initial) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
    },
    useEffect(effect, dependencies) {
      const index = effectIndex++;
      if (effects[index]?.dependencies.every((value, position) => Object.is(value, dependencies[position]))) return;
      effects[index]?.cleanup?.();
      effects[index] = { dependencies, cleanup: effect() };
    },
    require(name) {
      if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }) };
      assert.equal(name, "../studio/_components/publication-package-dialog");
      return new Promise((resolve, reject) => requests.push({ resolve, reject }));
    },
  });
  return {
    props, requests, errors, LoadingDialog,
    render() { stateIndex = 0; effectIndex = 0; return renderLoader(props); },
    unmount() { effects.forEach(effect => effect.cleanup?.()); effects = []; state = []; },
  };
}

const flushLoading = () => new Promise(resolve => setImmediate(resolve));

test("publishing uses a dismissible loader until its lazy dialog is ready, then reuses the loaded component", async () => {
  const app = publicationLoader();
  const loading = app.render();
  assert.equal(loading.type, app.LoadingDialog);
  assert.equal(loading.props.failed, false);
  assert.equal(loading.props.onClose, app.props.onClose);
  await flushLoading();
  assert.equal(app.requests.length, 1);
  function Dialog() {}
  app.requests[0].resolve({ PublicationPackageDialog: Dialog });
  await flushLoading();
  const ready = app.render();
  assert.equal(ready.type, Dialog);
  assert.deepEqual(ready.props, app.props);
  app.unmount();
  assert.equal(app.render().type, Dialog);
  await flushLoading();
  assert.equal(app.requests.length, 1);
});

test("a cancelled publishing load cannot reopen the dialog or report a stale error", async () => {
  for (const failure of [false, true]) {
    const app = publicationLoader();
    app.render();
    await flushLoading();
    app.unmount();
    if (failure) app.requests[0].reject(new Error("Abandoned publishing load"));
    else app.requests[0].resolve({ PublicationPackageDialog() {} });
    await flushLoading();
    assert.deepEqual(app.errors, []);
  }
});

test("a failed publishing download is explicit and can be retried without changing the project", async () => {
  const app = publicationLoader();
  app.render();
  await flushLoading();
  const error = new Error("Synthetic publishing chunk failure");
  app.requests[0].reject(error);
  await flushLoading();
  const failed = app.render();
  assert.equal(failed.type, app.LoadingDialog);
  assert.equal(failed.props.failed, true);
  assert.equal(app.errors[0][1], error);
  failed.props.onRetry();
  assert.equal(app.render().props.failed, false);
  await flushLoading();
  assert.equal(app.requests.length, 2);
  function Dialog() {}
  app.requests[1].resolve({ PublicationPackageDialog: Dialog });
  await flushLoading();
  assert.equal(app.render().type, Dialog);
  assert.equal(app.render().props.project, app.props.project);
});
