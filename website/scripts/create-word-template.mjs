import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
} from "docx";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "docs", "templates");
const outputPath = path.join(
  outputDirectory,
  "glint-labs-report-template.docx",
);

const colors = {
  accent: "4E61FF",
  ink: "17213A",
  instruction: "5A647C",
  metadata: "EAF3FF",
  section: "F3F4FB",
};

function paragraph(text, options = {}) {
  return new Paragraph({
    spacing: { after: 140, line: 276 },
    ...options,
    children: [
      new TextRun({
        color: colors.ink,
        font: "Aptos",
        size: 22,
        text,
      }),
    ],
  });
}

function heading(text, level = HeadingLevel.HEADING_2) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 160 },
    children: [
      new TextRun({
        color: colors.ink,
        font: "Aptos Display",
        text,
      }),
    ],
  });
}

function marker(text) {
  return new Paragraph({
    shading: { fill: colors.metadata },
    spacing: { before: 160, after: 80 },
    children: [
      new TextRun({
        bold: true,
        color: colors.accent,
        font: "Aptos",
        size: 20,
        text,
      }),
    ],
  });
}

function field(label, value) {
  return new Paragraph({
    shading: { fill: colors.section },
    spacing: { after: 40 },
    children: [
      new TextRun({
        bold: true,
        color: colors.ink,
        font: "Aptos",
        size: 20,
        text: `${label}: `,
      }),
      new TextRun({
        color: colors.ink,
        font: "Aptos",
        italics: value.startsWith("["),
        size: 20,
        text: value,
      }),
    ],
  });
}

function instruction(text) {
  return new Paragraph({
    indent: { left: 240 },
    spacing: { after: 100 },
    children: [
      new TextRun({
        color: colors.instruction,
        font: "Aptos",
        italics: true,
        size: 18,
        text,
      }),
    ],
  });
}

function component(label, fields, instructions = []) {
  return [
    marker(`[GLPS COMPONENT: ${label}]`),
    ...fields.map(([name, value]) => field(name, value)),
    ...instructions.map(instruction),
    marker("[GLPS END COMPONENT]"),
    paragraph(""),
  ];
}

const children = [
  heading(
    "[Report title without the Research Drop prefix]",
    HeadingLevel.HEADING_1,
  ),
  marker("[GLPS REPORT METADATA]"),
  field("Author name", "[Full name]"),
  field("Author handle", "[@alias]"),
  field("Published date", "[Month Day, Year]"),
  field("Read time minutes", "[Positive whole number]"),
  field(
    "Topic pages",
    "[Up to three comma-separated Glint Labs topic pages]",
  ),
  field("Approval reference", "[Optional CELA or stakeholder reference]"),
  marker("[GLPS END REPORT METADATA]"),
  ...component(
    "REPORT HERO",
    [
      ["Eyebrow", "[Short opening category, such as Research Drop]"],
      [
        "Image description",
        "[Describe the opening hero image for readers who cannot see it]",
      ],
    ],
    ["[INSERT THE APPROVED OPENING HERO IMAGE HERE]"],
  ),
  ...component("PULL QUOTE", [
    ["Quote", "[Approved opening standfirst or key statement]"],
  ]),
  paragraph(
    "[Continue the approved opening narrative after the pull quote.]",
  ),
  heading("[Major section heading]"),
  paragraph(
    "[Write approved narrative content with standard Word headings, paragraphs, and lists. GLPS preserves this ordering.]",
  ),
  new Paragraph({ children: [new PageBreak()] }),
  marker("[GLPS TEMPLATE LIBRARY]"),
  heading("GLPS component library", HeadingLevel.HEADING_1),
  paragraph(
    "Copy a complete component block into the report body. Keep the GLPS component and end markers visible so Publishing Studio can place the approved content without guessing.",
  ),
  heading("Excel visual workflow", HeadingLevel.HEADING_2),
  paragraph(
    "Build and finalize the data visual in Excel. Paste it between the component markers as an embedded editable chart using “Use Destination Theme & Embed Workbook” or “Keep Source Formatting & Embed Workbook.” A reviewed structured Word table is also supported when an editable chart is unavailable. Do not paste as a picture and do not retain a live data link.",
  ),
  ...component("PULL QUOTE", [
    ["Quote", "[Approved quote text]"],
  ]),
  ...component("FEATURED STATISTIC", [
    ["Title", "[Short thematic title]"],
    ["Statistic", "[Approved statistic or finding]"],
    ["Description", "[Supporting explanation or quotation]"],
    ["Source note", "[Approved source or attribution]"],
  ]),
  ...component("DATA CALLOUT", [
    ["Variant", "Compact"],
    ["Title", "Research Drop in Brief"],
    ["Paragraph 1", "[Approved explanatory text]"],
    ["Paragraph 2", "[Approved explanatory text]"],
    ["Paragraph 3", "[Approved explanatory text]"],
  ]),
  ...component("BULLETS", [
    ["Title", "[Approved bullets heading]"],
    ["Introduction", "[Optional approved introduction]"],
    ["Bullet 1", "[Approved evidence statement]"],
    ["Bullet 2", "[Approved evidence statement]"],
    ["Bullet 3", "[Optional approved evidence statement]"],
  ]),
  ...component("ROLES", [
    ["Title", "[Approved roles heading]"],
    ["Section 1 label", "Mindset"],
    ["Section 1 traditional title", "[Traditional role title]"],
    ["Section 1 traditional description", "[Approved traditional role description]"],
    ["Section 1 AI-era title", "[AI-era role title]"],
    ["Section 1 AI-era description", "[Approved AI-era role description]"],
    ["Section 1 getting there", "[Approved transition guidance]"],
    ["Section 2 label", "Knowledge"],
    ["Section 2 traditional title", "[Traditional role title]"],
    ["Section 2 traditional description", "[Approved traditional role description]"],
    ["Section 2 AI-era title", "[AI-era role title]"],
    ["Section 2 AI-era description", "[Approved AI-era role description]"],
    ["Section 2 getting there", "[Approved transition guidance]"],
    ["Section 3 label", "Skill"],
    ["Section 3 traditional title", "[Traditional role title]"],
    ["Section 3 traditional description", "[Approved traditional role description]"],
    ["Section 3 AI-era title", "[AI-era role title]"],
    ["Section 3 AI-era description", "[Approved AI-era role description]"],
    ["Section 3 getting there", "[Approved transition guidance]"],
  ]),
  ...component("REFERENCES", [
    ["Title", "References"],
    ["Reference 1 title", "[Complete approved reference]"],
    ["Reference 1 citation", "[Optional approved source name or URL]"],
    ["Reference 2 title", "[Complete approved reference]"],
    ["Reference 2 citation", "[Optional approved source name or URL]"],
    ["Reference 3 title", "[Complete approved reference]"],
    ["Reference 3 citation", "[Optional approved source name or URL]"],
    ["Reference 4 title", "[Optional complete approved reference]"],
    ["Reference 4 citation", "[Optional approved source name or URL]"],
  ]),
  ...component(
    "PERCENTAGE RINGS",
    [
      ["Title", "[Approved takeaway]"],
      ["Source note", "[Approved survey source and sample details]"],
    ],
    ["[PASTE ONE EMBEDDED EXCEL CHART OR STRUCTURED WORD TABLE WITH EXACTLY THREE PERCENTAGES HERE]"],
  ),
  ...component(
    "HORIZONTAL BARS",
    [
      ["Title", "[Approved chart title]"],
      ["Source note", "[Approved survey source and sample details]"],
    ],
    ["[PASTE ONE EMBEDDED EXCEL CHART OR STRUCTURED WORD TABLE WITH 2–12 PERCENTAGE ROWS HERE]"],
  ),
  ...component(
    "GROUPED COLUMNS",
    [
      ["Title", "[Approved chart title]"],
      ["Subtitle", "[Approved chart subtitle, such as Average percent favorable]"],
      ["Source note", "[Approved survey source, definitions, and sample details]"],
    ],
    ["[PASTE ONE EMBEDDED EXCEL CHART OR STRUCTURED WORD TABLE WITH TWO SERIES AND EXACTLY FOUR PERCENTAGE ROWS HERE]"],
  ),
  ...component(
    "IMAGE",
    [["Image description", "[Describe the image’s meaning for readers]"]],
    ["[INSERT THE APPROVED IMAGE HERE]"],
  ),
  marker("[GLPS END TEMPLATE LIBRARY]"),
];

const document = new Document({
  creator: "Glint Labs Publishing Studio",
  description:
    "Template for approved People Science reports published through GLPS.",
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: 720,
            right: 864,
            bottom: 720,
            left: 864,
          },
        },
      },
      children,
    },
  ],
  title: "Glint Labs report template",
});

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, await Packer.toBuffer(document));
console.log(outputPath);
