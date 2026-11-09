import JSZip from "jszip";
import { quadrantHeaders } from "./quadrant-data.ts";

const xml = (value: string) => value.replace(/[<>&"']/g, character =>
  ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!);
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const spreadsheet = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const relationships = "http://schemas.openxmlformats.org/package/2006/relationships";
const office = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export async function quadrantExcelTemplate() {
  const zip = new JSZip();
  const headings = [...quadrantHeaders, "Not using (%)", "Scaling back (%)", "Maintaining (%)", "Expanding (%)"];
  const examples = [
    ["example-a", "Example A", "-10", "90", "Replace this explanation with approved research.", "10%", "20%", "60%", "10%"],
    ["example-b", "Example B", "15", "85", "Replace every example row before publishing.", "15%", "10%", "50%", "25%"],
    ["example-c", "Example C", "35", "95", "Keep each Point ID stable when refreshing.", "5%", "5%", "50%", "40%"],
    ["example-d", "Example D", "5", "70", "X/Y and every breakdown must contain numerical values.", "30%", "10%", "45%", "15%"],
  ];
  const rowXml = [headings, ...examples].map((row, index) => `<row r="${index + 1}">${row.map((value, column) => {
    const ref = `${String.fromCharCode(65 + column)}${index + 1}`;
    return index && (column === 2 || column === 3) ? `<c r="${ref}"><v>${value}</v></c>`
      : `<c r="${ref}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`;
  }).join("")}</row>`).join("");
  zip.file("[Content_Types].xml", `${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
    <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
    <Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>
    <Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
    <Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>
    </Types>`);
  zip.file("_rels/.rels", `${declaration}<Relationships xmlns="${relationships}"><Relationship Id="rId1" Type="${office}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file("xl/workbook.xml", `${declaration}<workbook xmlns="${spreadsheet}" xmlns:r="${office}"><sheets><sheet name="Quadrant data" sheetId="1" r:id="rId1"/></sheets><calcPr fullCalcOnLoad="1"/></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `${declaration}<Relationships xmlns="${relationships}"><Relationship Id="rId1" Type="${office}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
  zip.file("xl/worksheets/sheet1.xml", `${declaration}<worksheet xmlns="${spreadsheet}" xmlns:r="${office}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="4" width="22" customWidth="1"/><col min="5" max="5" width="65" customWidth="1"/><col min="6" max="9" width="20" customWidth="1"/></cols><sheetData>${rowXml}</sheetData><drawing r:id="rId2"/><tableParts count="1"><tablePart r:id="rId1"/></tableParts></worksheet>`);
  zip.file("xl/worksheets/_rels/sheet1.xml.rels", `${declaration}<Relationships xmlns="${relationships}"><Relationship Id="rId1" Type="${office}/table" Target="../tables/table1.xml"/><Relationship Id="rId2" Type="${office}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`);
  zip.file("xl/tables/table1.xml", `${declaration}<table xmlns="${spreadsheet}" id="1" name="QuadrantData" displayName="QuadrantData" ref="A1:I5" totalsRowShown="0"><autoFilter ref="A1:I5"/><tableColumns count="9">${headings.map((heading, index) => `<tableColumn id="${index + 1}" name="${xml(heading)}"/>`).join("")}</tableColumns><tableStyleInfo name="TableStyleMedium2" showRowStripes="1"/></table>`);
  zip.file("xl/drawings/drawing1.xml", `${declaration}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${office}"><xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>8</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>9</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>33</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Quadrant chart"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`);
  zip.file("xl/drawings/_rels/drawing1.xml.rels", `${declaration}<Relationships xmlns="${relationships}"><Relationship Id="rId1" Type="${office}/chart" Target="../charts/chart1.xml"/></Relationships>`);
  const cache = (column: number) => `<c:numRef><c:f>'Quadrant data'!$${String.fromCharCode(65 + column)}$2:$${String.fromCharCode(65 + column)}$5</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="4"/>${examples.map((row, index) => `<c:pt idx="${index}"><c:v>${row[column]}</c:v></c:pt>`).join("")}</c:numCache></c:numRef>`;
  const axis = (id: number, position: string, cross: number) => `<c:valAx><c:axId val="${id}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${position}"/><c:numFmt formatCode="General" sourceLinked="1"/><c:crossAx val="${cross}"/><c:crosses val="autoZero"/><c:crossBetween val="midCat"/></c:valAx>`;
  zip.file("xl/charts/chart1.xml", `${declaration}<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart><c:autoTitleDeleted val="1"/><c:plotArea><c:layout/><c:scatterChart><c:scatterStyle val="marker"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Example points - replace before publishing</c:v></c:tx><c:marker><c:symbol val="circle"/><c:size val="8"/></c:marker><c:xVal>${cache(2)}</c:xVal><c:yVal>${cache(3)}</c:yVal></c:ser><c:axId val="1"/><c:axId val="2"/></c:scatterChart>${axis(1, "b", 2)}${axis(2, "l", 1)}</c:plotArea><c:plotVisOnly val="1"/></c:chart></c:chartSpace>`);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
