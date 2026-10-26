# Extraction

This area will validate `.docx` input, calculate the source hash, read OOXML
parts deterministically, preserve document order, extract media, and emit
visible failures for unsupported content.

Structured Word tables and cached Office chart data are normalized into locked
data-source blocks. Bitmap visuals remain original images; they are not
converted into chart data. The extractor does not infer values from pixels.
Previously saved bitmap-derived charts retain their reviewed data and source
evidence for compatibility.

The guided Word template uses visible `[GLPS COMPONENT: ...]` markers. Editorial
blocks are parsed directly into locked canonical components. Data-visual
blocks pair the requested Glint Labs treatment with cached values from an
embedded Excel chart. Missing fields, missing assets, and incompatible chart
shapes create blockers. The component-library appendix and report-metadata
markers remain visible in Word but are omitted from report content.
