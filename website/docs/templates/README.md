# Glint Labs Word report template

`glint-labs-report-template.docx` preserves the existing People Science
workflow:

1. Build and finalize data visuals in Excel.
2. Paste visuals into Word as embedded editable charts, not pictures or live
   links.
3. Draft, review, and approve the complete Word report with CELA and People
   Science stakeholders.
4. Import that approved file into Publishing Studio for Glint Labs branding
   and publishing.

## Component blocks

Copy complete blocks from the template library into the report body. Keep the
visible `[GLPS COMPONENT: ...]` and `[GLPS END COMPONENT]` markers. Publishing
Studio omits those markers from the reader output and uses them to select the
requested treatment without guessing.

The opening `REPORT HERO` block appears near the top of the template. Replace
its Eyebrow field, add an approved image description, and insert the approved
hero image between the markers. GLPS uses those values in the report cover
instead of adding the image to the editorial body.

The report title field should contain only the approved title itself. Do not
repeat `Research Drop:` in the title because the report hero already presents
`Research Drop` as its eyebrow.

Add up to three comma-separated destinations to the `Topic pages` metadata
field. Publishing Studio uses these approved values as-is and does not ask the
publisher to classify the report again. For example:
`AI transformation, Leadership, Employee listening`.

The initial template includes:

- an opening report hero;
- an opening pull quote for the Figma standfirst treatment;
- featured statistic;
- a collapsed-by-default expandable `Research Drop in Brief` callout;
- two- or three-item bullets callouts;
- three-part roles transitions;
- references;
- three percentage rings;
- horizontal bars;
- grouped columns; and
- approved images.

Use the `BULLETS` block instead of ordinary Word bullets when the section
should receive the Figma Bullets panel. Use the `REFERENCES` block for the
single reference panel at the end of the report; it supports two through four
approved references. The callout, Bullets, and References markers ensure these
sections use only their corresponding report components.

Use the opening `PULL QUOTE` block for the short standfirst that receives the
4px vertical accent bar and 28/34 editorial emphasis in the published report.
Use Word Heading 2 for every major report section. Publishing Studio renders
Heading 2 in the 36/44 Georgia editorial style and adds the full-column divider
before every major section after the opening content. Use Heading 3 for
subsections within a major section.

Data-visual blocks must contain one embedded Excel chart or a reviewed
structured Word table. Percentage rings require exactly three percentage rows.
Horizontal bars require two through twelve percentage rows. Grouped columns
require two series across exactly four percentage rows. Roles always contain
Mindset, Knowledge, and Skill sections. Bullets contain two or three approved
statements. Missing fields, missing data assets, or incompatible shapes import
visibly with a publishing blocker.

The latest report typography is also applied by Publishing Studio: 16/28 body
copy, 28/34 third-level headings, 24/28 component headings, 28/34 pull quotes,
and the 16/22 Consolas hero eyebrow. Word remains the source for approved text
and data; these styles are presentation-only.

The template library itself is enclosed by `[GLPS TEMPLATE LIBRARY]` markers
and is not imported into the report.

## Regenerate the template

```powershell
npm run template:word
```

Commit the generator and `.docx` together whenever the contract changes.
