import assert from "node:assert/strict";
import test from "node:test";
import { XMLParser } from "fast-xml-parser";
import { extractWordTextLinks } from "./word-text-links.ts";

function parse(xml: string) {
  const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false, removeNSPrefix: true, attributeNamePrefix: "", trimValues: false });
  return parser.parse(`<w:p xmlns:w="w" xmlns:r="r">${xml}</w:p>`)[0];
}
test("Word links preserve direct, simple, complex and bookmark destinations with UTF-16 offsets", () => {
  const result = extractWordTextLinks(parse(
    '<w:r><w:t>😀 </w:t></w:r><w:hyperlink r:id="r1"><w:r><w:t>Direct</w:t></w:r></w:hyperlink>' +
    '<w:r><w:t> </w:t></w:r><w:fldSimple w:instr=\'HYPERLINK "https://example.com/simple"\'><w:r><w:t>Simple</w:t></w:r></w:fldSimple>' +
    '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText>HYPERLINK "https://example.com/field"</w:instrText></w:r>' +
    '<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t> Field</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>' +
    '<w:hyperlink w:anchor="section"><w:r><w:t> Bookmark</w:t></w:r></w:hyperlink>',
  ), new Map([["r1", "https://example.com/direct"]]));
  assert.equal(result.text, "😀 Direct Simple Field Bookmark");
  assert.equal(result.hyperlinkCount, 4);
  assert.deepEqual(result.links.map((link) => [result.text.slice(link.start, link.end), link.href]), [
    ["Direct", "https://example.com/direct"], ["Simple", "https://example.com/simple"],
    [" Field", "https://example.com/field"], [" Bookmark", "#section"],
  ]);
  assert.equal(result.links[0].start, 3);
});
test("unsafe or missing link targets remain audited but unrepresented", () => {
  const result = extractWordTextLinks(parse('<w:hyperlink r:id="unsafe"><w:r><w:t>Unsafe</w:t></w:r></w:hyperlink><w:hyperlink r:id="missing"><w:r><w:t> Missing</w:t></w:r></w:hyperlink>'),
    new Map([["unsafe", "javascript:alert(1)"]]));
  assert.equal(result.hyperlinkCount, 2);
  assert.deepEqual(result.links, []);
});

test("a whole-paragraph link retains its destination when visible text is trimmed", () => {
  const result = extractWordTextLinks(parse('<w:hyperlink r:id="r1"><w:r><w:t>  Read this  </w:t></w:r></w:hyperlink>'),
    new Map([["r1", "https://example.com/source"]]));
  assert.equal(result.text, "Read this");
  assert.deepEqual(result.links, [{ start: 0, end: 9, href: "https://example.com/source" }]);
});
