---
name: analyze-survey-ai-preview
description: "Create or rebuild the staged Viva Glint survey report with AI-generated People Science summaries. Use only when the user explicitly asks for the AI summary preview, staging experience, or experimental summarized report."
allowed-tools: Bash, Read, Write, Glob, Grep, WebFetch
---

# Analyze Survey AI Preview

Add the staged AI People Science summary experience to the shared
`analyze-survey` report pipeline. Do not duplicate the analysis runner, report
builder, golden report, schemas, or source index.

## Isolation

- Use a dedicated output directory whose name clearly includes `ai-preview`.
- Never add summaries to a standard `analyze-survey` output unless the user
  explicitly asks to convert that output into a preview.
- Keep respondent-level data local and outside the share ZIP.

## Workflow

1. If no completed analysis exists, follow `../analyze-survey/SKILL.md` and run
   `scripts/analyze_survey_export.py` with `--summary-mode off`.
2. Follow `../analyze-survey/references/interpretation.md` to establish QA
   readiness and apply the interpretation process and guardrails.
3. Inspect `people-science-summary-context.json` and the AI-summary modes in
   `../analyze-survey/references/interactive-report-contract.md`.
4. Use `people-science-knowledge-vault` to retrieve relevant externally
   published article bodies.
5. Write `people-science-summaries.json` using
   `../analyze-survey/references/people-science-summaries.schema.json`.
   Include all six tabs.
6. Rebuild the report:

```bash
python scripts/build_interactive_report.py \
  --config <output-directory>/_input/analysis-config.json \
  --output-dir <output-directory> \
  --summary-mode required
```

7. Confirm all six narrative objects are embedded, the manifest records
   `summary_mode` as `required`, and the share ZIP contains the summary file.
   Tab-level AI cards remain hidden as specified in the report contract.
8. Open the HTML report before finishing.

## Summary contract

Use the shared report contract and narrative schema rather than maintaining a
second summary specification here.

## Promotion

This skill is a staging entry point. When the preview is approved, promote the
experience by changing the default summary mode in the shared pipeline and
folding these orchestration instructions into `analyze-survey`; do not replace
the pipeline with copied code.
