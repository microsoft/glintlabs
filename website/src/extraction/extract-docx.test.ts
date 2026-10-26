import assert from "node:assert/strict";
import test from "node:test";

import JSZip from "jszip";

import { extractDocx } from "./extract-docx.ts";

async function createFixture(
  headingProperties = '<w:pStyle w:val="Heading1" />',
) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types" />',
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p w14:paraId="AAA" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
            <w:pPr>${headingProperties}</w:pPr>
            <w:r><w:t>Test report</w:t></w:r>
          </w:p>
          <w:p><w:r><w:t>Visible source paragraph.</w:t></w:r></w:p>
          <w:p>
            <w:pPr><w:pStyle w:val="ListParagraph" /><w:numPr><w:ilvl w:val="1" /></w:numPr></w:pPr>
            <w:r><w:t>Nested list item</w:t></w:r>
          </w:p>
          <w:p><w:r><w:t>Visual: Add an approved chart.</w:t></w:r></w:p>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>Category</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>Percent favorable</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>Trust</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>73%</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>Readiness</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>62%</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships" />',
  );
  return zip.generateAsync({ type: "uint8array" });
}

async function createChartFixture() {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types" />',
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
        xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
        xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
        xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <w:body>
          <w:p><w:r><w:drawing><a:graphic><a:graphicData><c:chart r:id="rId1" /></a:graphicData></a:graphic></w:drawing></w:r></w:p>
        </w:body>
      </w:document>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Target="charts/chart1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" />
      </Relationships>`,
  );
  zip.file(
    "word/charts/chart1.xml",
    `<?xml version="1.0"?>
      <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart><c:plotArea><c:barChart><c:ser>
          <c:tx><c:strRef><c:strCache><c:pt idx="0"><c:v>Percent favorable</c:v></c:pt></c:strCache></c:strRef></c:tx>
          <c:cat><c:strRef><c:strCache>
            <c:pt idx="0"><c:v>Trust</c:v></c:pt>
            <c:pt idx="1"><c:v>Readiness</c:v></c:pt>
          </c:strCache></c:strRef></c:cat>
          <c:val><c:numRef><c:numCache><c:formatCode>0%</c:formatCode>
            <c:pt idx="0"><c:v>0.73</c:v></c:pt>
            <c:pt idx="1"><c:v>0.62</c:v></c:pt>
          </c:numCache></c:numRef></c:val>
        </c:ser></c:barChart></c:plotArea></c:chart>
      </c:chartSpace>`,
  );
  return zip.generateAsync({ type: "uint8array" });
}

async function createGuidedTemplateFixture(
  headingProperties = '<w:pStyle w:val="Heading1" />',
) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types" />',
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
        xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
        xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
        xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
        xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
        <w:body>
          <w:p><w:pPr>${headingProperties}</w:pPr><w:r><w:t>Guided report</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS REPORT METADATA]</w:t></w:r></w:p>
          <w:p><w:r><w:t>Author name: Ada Lovelace</w:t></w:r></w:p>
          <w:p><w:r><w:t>Author handle: @ada</w:t></w:r></w:p>
          <w:p><w:r><w:t>Published date: September 17, 2026</w:t></w:r></w:p>
          <w:p><w:r><w:t>Read time minutes: 12</w:t></w:r></w:p>
          <w:p><w:r><w:t>Topic pages: AI transformation; Leadership, Employee listening</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS END REPORT METADATA]</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS COMPONENT: REPORT HERO]</w:t></w:r></w:p>
          <w:p><w:r><w:t>Eyebrow: Research Drop</w:t></w:r></w:p>
          <w:p><w:r><w:t>Image description: Colleagues discussing research.</w:t></w:r></w:p>
          <w:p><w:r><w:drawing><wp:inline><wp:extent cx="952500" cy="476250" /><wp:docPr id="1" name="Hero" /><a:graphic><a:graphicData><a:blip r:embed="rId2" /></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>
          <w:p><w:r><w:t>[GLPS END COMPONENT]</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS COMPONENT: DATA CALLOUT]</w:t></w:r></w:p>
          <w:p><w:r><w:t>Variant: Detailed</w:t></w:r></w:p>
          <w:p><w:r><w:t>Title: What is agentic AI?</w:t></w:r></w:p>
          <w:p><w:r><w:t>Paragraph 1: Agentic AI can pursue a goal across multiple steps.</w:t></w:r></w:p>
          <w:p><w:r><w:t>Paragraph 2: It can plan work and use available tools.</w:t></w:r></w:p>
          <w:p><w:r><w:t>Paragraph 3: People remain responsible for reviewing outcomes.</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS END COMPONENT]</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS COMPONENT: BULLETS]</w:t></w:r></w:p>
          <w:p><w:r><w:t>Title: Leader role modeling changes outcomes</w:t></w:r></w:p>
          <w:p><w:r><w:t>Introduction: Employees report:</w:t></w:r></w:p>
          <w:p><w:r><w:t>Bullet 1: +17pp uplift in realized value.</w:t></w:r></w:p>
          <w:p><w:r><w:t>Bullet 2: +22pp increase in critical thinking.</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS END COMPONENT]</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS COMPONENT: ROLES]</w:t></w:r></w:p>
          <w:p><w:r><w:t>Title: The manager role is evolving</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 1 label: Mindset</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 1 traditional title: Direct the work</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 1 traditional description: Set the path.</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 1 AI-era title: Frame the opportunity</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 1 AI-era description: Combine judgment with AI.</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 1 getting there: Practice on real work.</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 2 label: Knowledge</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 2 traditional title: Know the process</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 2 traditional description: Apply established expertise.</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 2 AI-era title: Know the system</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 2 AI-era description: Understand AI strengths and limits.</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 2 getting there: Compare approaches and outputs.</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 3 label: Skill</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 3 traditional title: Coach execution</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 3 traditional description: Improve individual delivery.</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 3 AI-era title: Coach orchestration</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 3 AI-era description: Guide people and agents together.</w:t></w:r></w:p>
          <w:p><w:r><w:t>Section 3 getting there: Reinforce accountability and review.</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS END COMPONENT]</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS COMPONENT: REFERENCES]</w:t></w:r></w:p>
          <w:p><w:r><w:t>Title: References</w:t></w:r></w:p>
          <w:p><w:r><w:t>Reference 1 title: Microsoft People Science, 2025.</w:t></w:r></w:p>
          <w:p><w:r><w:t>Reference 1 citation: Microsoft People Science</w:t></w:r></w:p>
          <w:p><w:r><w:t>Reference 2 title: Microsoft Work Trend Index, 2025.</w:t></w:r></w:p>
          <w:p><w:r><w:t>Reference 2 citation: Work Trend Index</w:t></w:r></w:p>
          <w:p><w:r><w:t>Reference 3 title: Supporting research, 2025.</w:t></w:r></w:p>
          <w:p><w:r><w:t>Reference 3 citation: Supporting research</w:t></w:r></w:p>
          <w:p><w:r><w:t>Reference 4 title: [Optional complete approved reference]</w:t></w:r></w:p>
          <w:p><w:r><w:t>Reference 4 citation: [Optional approved source name or URL]</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS END COMPONENT]</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS COMPONENT: PERCENTAGE RINGS]</w:t></w:r></w:p>
          <w:p><w:r><w:t>Title: Manager optimism</w:t></w:r></w:p>
          <w:p><w:r><w:t>Source note: Approved Excel chart.</w:t></w:r></w:p>
          <w:p><w:r><w:drawing><a:graphic><a:graphicData><c:chart r:id="rId1" /></a:graphicData></a:graphic></w:drawing></w:r></w:p>
          <w:p><w:r><w:t>[GLPS END COMPONENT]</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS COMPONENT: HORIZONTAL BARS]</w:t></w:r></w:p>
          <w:p><w:r><w:t>Title: Missing chart</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS END COMPONENT]</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS COMPONENT: GROUPED COLUMNS]</w:t></w:r></w:p>
          <w:p><w:r><w:t>Title: Readiness by psychological safety</w:t></w:r></w:p>
          <w:p><w:r><w:t>Subtitle: Average percent favorable</w:t></w:r></w:p>
          <w:p><w:r><w:t>Source note: Approved grouped chart.</w:t></w:r></w:p>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>Measure</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>Psychologically safe</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>Everyone else</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>Individual readiness</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>76%</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>60%</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>Team readiness</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>76%</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>56%</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>Individual value</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>82%</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>71%</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>Team value</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>85%</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>72%</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
          <w:p><w:r><w:t>[GLPS END COMPONENT]</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS TEMPLATE LIBRARY]</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS COMPONENT: DATA CALLOUT]</w:t></w:r></w:p>
          <w:p><w:r><w:t>Variant: Detailed</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS END COMPONENT]</w:t></w:r></w:p>
          <w:p><w:r><w:t>[GLPS END TEMPLATE LIBRARY]</w:t></w:r></w:p>
        </w:body>
      </w:document>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Target="charts/chart1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" />
        <Relationship Id="rId2" Target="media/hero.png" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" />
        <Relationship Id="rId3" Target="charts/chart2.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" />
      </Relationships>`,
  );
  zip.file(
    "word/media/hero.png",
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XzUZ1QAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  zip.file(
    "word/charts/chart1.xml",
    `<?xml version="1.0"?>
      <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart><c:plotArea><c:barChart><c:ser>
          <c:tx><c:strRef><c:strCache><c:pt idx="0"><c:v>Percent favorable</c:v></c:pt></c:strCache></c:strRef></c:tx>
          <c:cat><c:strRef><c:strCache>
            <c:pt idx="0"><c:v>Competitive advantage</c:v></c:pt>
            <c:pt idx="1"><c:v>Advocate for agents</c:v></c:pt>
            <c:pt idx="2"><c:v>Achieve more</c:v></c:pt>
          </c:strCache></c:strRef></c:cat>
          <c:val><c:numRef><c:numCache><c:formatCode>0%</c:formatCode>
            <c:pt idx="0"><c:v>0.73</c:v></c:pt>
            <c:pt idx="1"><c:v>0.62</c:v></c:pt>
            <c:pt idx="2"><c:v>0.64</c:v></c:pt>
          </c:numCache></c:numRef></c:val>
        </c:ser></c:barChart></c:plotArea></c:chart>
      </c:chartSpace>`,
  );
  zip.file(
    "word/charts/chart2.xml",
    `<?xml version="1.0"?>
      <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart><c:plotArea><c:barChart>
          <c:ser>
            <c:tx><c:strRef><c:strCache><c:pt idx="0"><c:v>Psychologically safe</c:v></c:pt></c:strCache></c:strRef></c:tx>
            <c:cat><c:strRef><c:strCache>
              <c:pt idx="0"><c:v>Individual readiness</c:v></c:pt>
              <c:pt idx="1"><c:v>Team readiness</c:v></c:pt>
              <c:pt idx="2"><c:v>Individual value</c:v></c:pt>
              <c:pt idx="3"><c:v>Team value</c:v></c:pt>
            </c:strCache></c:strRef></c:cat>
            <c:val><c:numRef><c:numCache><c:formatCode>0%</c:formatCode>
              <c:pt idx="0"><c:v>0.76</c:v></c:pt>
              <c:pt idx="1"><c:v>0.76</c:v></c:pt>
              <c:pt idx="2"><c:v>0.82</c:v></c:pt>
              <c:pt idx="3"><c:v>0.85</c:v></c:pt>
            </c:numCache></c:numRef></c:val>
          </c:ser>
          <c:ser>
            <c:tx><c:strRef><c:strCache><c:pt idx="0"><c:v>Everyone else</c:v></c:pt></c:strCache></c:strRef></c:tx>
            <c:cat><c:strRef><c:strCache>
              <c:pt idx="0"><c:v>Individual readiness</c:v></c:pt>
              <c:pt idx="1"><c:v>Team readiness</c:v></c:pt>
              <c:pt idx="2"><c:v>Individual value</c:v></c:pt>
              <c:pt idx="3"><c:v>Team value</c:v></c:pt>
            </c:strCache></c:strRef></c:cat>
            <c:val><c:numRef><c:numCache><c:formatCode>0%</c:formatCode>
              <c:pt idx="0"><c:v>0.60</c:v></c:pt>
              <c:pt idx="1"><c:v>0.56</c:v></c:pt>
              <c:pt idx="2"><c:v>0.71</c:v></c:pt>
              <c:pt idx="3"><c:v>0.72</c:v></c:pt>
            </c:numCache></c:numRef></c:val>
          </c:ser>
        </c:barChart></c:plotArea></c:chart>
      </c:chartSpace>`,
  );
  return zip.generateAsync({ type: "uint8array" });
}

test("ignores Word reviewer comments without changing report content or other review issues", async () => {
  const fixture = await createFixture();
  const baseline = await extractDocx("fixture.docx", fixture);
  const zip = await JSZip.loadAsync(fixture);
  const document = await zip.file("word/document.xml")!.async("string");
  zip.file("word/document.xml", document.replace(
    "<w:r><w:t>Visible source paragraph.</w:t></w:r>",
    '<w:commentRangeStart w:id="0"/><w:r><w:t>Visible source paragraph.</w:t></w:r><w:commentRangeEnd w:id="0"/><w:r><w:commentReference w:id="0"/></w:r>',
  ));
  zip.file("word/comments.xml", '<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:comment w:id="0"><w:p><w:r><w:t>Private reviewer note, not report content.</w:t></w:r></w:p></w:comment></w:comments>');
  const result = await extractDocx("fixture.docx", await zip.generateAsync({ type: "uint8array" }));
  assert.deepEqual(result.manifest.blocks, baseline.manifest.blocks);
  assert.deepEqual(result.manifest.reviewItems, baseline.manifest.reviewItems);
  assert.ok(result.manifest.reviewItems.length > 0, "unrelated content warnings still require review");
  assert.ok(!result.manifest.reviewItems.some((item) => item.code === "comments-omitted"));
});

test("extracts ordered semantic blocks and structured Word table data", async () => {
  const fixture = await createFixture();
  const result = await extractDocx("fixture.docx", fixture);

  assert.deepEqual(
    result.manifest.blocks.map((block) => block.type),
    [
      "heading",
      "paragraph",
      "list-item",
      "visual-placeholder",
      "data-visual-source",
    ],
  );
  assert.equal(result.manifest.blocks[2].source.index, 2);
  assert.equal(result.manifest.extraction.unsupportedCount, 0);
  assert.equal(result.manifest.reviewItems.length, 1);
  const dataBlock = result.manifest.blocks[4];
  assert.equal(dataBlock.type, "data-visual-source");
  if (dataBlock.type === "data-visual-source") {
    assert.deepEqual(dataBlock.data.columns, ["Category", "Percent favorable"]);
    assert.deepEqual(dataBlock.data.rows[0].cells, ["Trust", "73%"]);
  }
});

test("produces the same hashes for the same source", async () => {
  const fixture = await createFixture();
  const first = await extractDocx("fixture.docx", fixture);
  const second = await extractDocx("fixture.docx", fixture);

  assert.equal(first.manifest.source.sha256, second.manifest.source.sha256);
  assert.equal(first.manifestSha256, second.manifestSha256);
  assert.equal(first.approvedContent?.sha256, second.approvedContent?.sha256);
});

test("recognizes explicit Word outline headings and honors body-text overrides", async () => {
  for (let outline = 0; outline <= 9; outline += 1) {
    const result = await extractDocx(
      "outline.docx",
      await createFixture(`<w:outlineLvl w:val="${outline}" />`),
    );
    const block = result.manifest.blocks[0];
    assert.equal(block.type, outline < 6 ? "heading" : "paragraph");
    if (block.type === "heading") {
      assert.equal(block.level, outline + 1);
    }
    assert.equal(
      result.manifest.metadata.title,
      outline === 0 ? "Test report" : "outline",
    );
  }

  const bodyOverride = await extractDocx(
    "body.docx",
    await createFixture(
      '<w:pStyle w:val="Heading1" /><w:outlineLvl w:val="9" />',
    ),
  );
  assert.equal(bodyOverride.manifest.blocks[0].type, "paragraph");
  assert.equal(bodyOverride.manifest.metadata.title, "body");

  const headingOverride = await extractDocx(
    "heading.docx",
    await createFixture(
      '<w:pStyle w:val="Heading2" /><w:outlineLvl w:val="0" />',
    ),
  );
  assert.equal(headingOverride.manifest.metadata.title, "Test report");
  assert.equal(headingOverride.manifest.blocks[0].type, "heading");
  if (headingOverride.manifest.blocks[0].type === "heading") {
    assert.equal(headingOverride.manifest.blocks[0].level, 1);
  }

  for (const value of ["", "invalid", "-1", "1.5", "10"]) {
    const result = await extractDocx(
      "invalid-outline.docx",
      await createFixture(
        `<w:pStyle w:val="Heading1" /><w:outlineLvl w:val="${value}" />`,
      ),
    );
    assert.equal(result.manifest.metadata.title, "Test report");
  }
});

test("preserves the guided title, hero image, and body when Word uses an outline heading", async () => {
  const styled = await extractDocx(
    "guided.docx",
    await createGuidedTemplateFixture(),
  );
  const outlined = await extractDocx(
    "guided.docx",
    await createGuidedTemplateFixture('<w:outlineLvl w:val="0" />'),
  );

  assert.equal(outlined.manifest.metadata.title, "Guided report");
  assert.deepEqual(outlined.manifest.blocks, styled.manifest.blocks);
  assert.deepEqual(outlined.manifest.metadata, styled.manifest.metadata);
  assert.deepEqual(outlined.manifest.reviewItems, styled.manifest.reviewItems);
  const hero = outlined.manifest.blocks[1];
  assert.equal(hero.type, "image");
  if (hero.type === "image") {
    assert.equal(hero.placement, "hero");
    assert.equal(hero.alt, "Colleagues discussing research.");
  }
});

test("imports the author name when Word does not include an author handle", async () => {
  const zip = await JSZip.loadAsync(await createGuidedTemplateFixture());
  const document = zip.file("word/document.xml");
  assert.ok(document);
  zip.file("word/document.xml", (await document.async("string")).replace(
    "<w:p><w:r><w:t>Author handle: @ada</w:t></w:r></w:p>", "",
  ));
  const result = await extractDocx("author-name-only.docx", await zip.generateAsync({ type: "uint8array" }));
  assert.deepEqual(result.manifest.metadata.author, { name: "Ada Lovelace" });
});

test("extracts cached Office chart values as structured source data", async () => {
  const result = await extractDocx(
    "chart.docx",
    await createChartFixture(),
  );
  const block = result.manifest.blocks[0];

  assert.equal(block.type, "data-visual-source");
  if (block.type === "data-visual-source") {
    assert.equal(block.data.sourceKind, "word-chart");
    assert.equal(block.data.unit, "percentage");
    assert.deepEqual(block.data.columns, ["Category", "Percent favorable"]);
    assert.deepEqual(block.data.rows[1].cells, ["Readiness", "62%"]);
  }
  assert.equal(result.manifest.reviewItems.length, 0);
});

test("extracts guided template components and blocks missing assets", async () => {
  const result = await extractDocx(
    "guided-template.docx",
    await createGuidedTemplateFixture(),
  );

  assert.deepEqual(
    result.manifest.blocks.map((block) => block.type),
    [
      "heading",
      "image",
      "data-callout",
      "impact-metrics",
      "before-after-comparison",
      "references",
      "data-visual-source",
      "unsupported",
      "data-visual-source",
    ],
  );
  const hero = result.manifest.blocks[1];
  assert.equal(hero.type, "image");
  if (hero.type === "image") {
    assert.equal(hero.placement, "hero");
    assert.equal(hero.eyebrow, "Research Drop");
    assert.equal(hero.alt, "Colleagues discussing research.");
  }
  const dataCallout = result.manifest.blocks[2];
  assert.equal(dataCallout.type, "data-callout");
  if (dataCallout.type === "data-callout") {
    assert.equal(dataCallout.title, "What is agentic AI?");
    assert.equal(dataCallout.paragraphs?.length, 3);
  }
  const bullets = result.manifest.blocks[3];
  assert.equal(bullets.type, "impact-metrics");
  if (bullets.type === "impact-metrics") {
    assert.equal(bullets.metrics.length, 2);
  }
  const roles = result.manifest.blocks[4];
  assert.equal(roles.type, "before-after-comparison");
  if (roles.type === "before-after-comparison") {
    assert.deepEqual(
      roles.sections.map((section) => section.label),
      ["Mindset", "Knowledge", "Skill"],
    );
  }
  const references = result.manifest.blocks[5];
  assert.equal(references.type, "references");
  if (references.type === "references") {
    assert.equal(references.intro, undefined);
    assert.equal(references.references.length, 3);
  }
  const chart = result.manifest.blocks[6];
  assert.equal(chart.type, "data-visual-source");
  if (chart.type === "data-visual-source") {
    assert.equal(chart.data.title, "Manager optimism");
    assert.equal(chart.data.recommendedVisualType, "percentage-ring-group");
    assert.equal(chart.data.sourceNote, "Approved Excel chart.");
  }
  const groupedChart = result.manifest.blocks[8];
  assert.equal(groupedChart.type, "data-visual-source");
  if (groupedChart.type === "data-visual-source") {
    assert.equal(
      groupedChart.data.recommendedVisualType,
      "grouped-column-comparison",
    );
    assert.equal(groupedChart.data.subtitle, "Average percent favorable");
  }
  assert.deepEqual(result.manifest.metadata.author, {
    name: "Ada Lovelace",
    handle: "@ada",
  });
  assert.equal(result.manifest.metadata.readTimeMinutes, 12);
  assert.deepEqual(result.manifest.metadata.topics, [
    "AI transformation",
    "Leadership",
    "Employee listening",
  ]);
  assert.equal(result.manifest.reviewItems.length, 1);
  assert.equal(
    result.manifest.reviewItems[0].code,
    "invalid-component-block",
  );
});

test("rejects a protected or non-ZIP Word container", async () => {
  await assert.rejects(
    () =>
      extractDocx(
        "protected.docx",
        new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      ),
    /protected, encrypted, or not a standard DOCX package/,
  );
});
