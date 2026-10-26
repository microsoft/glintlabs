# Glint Labs data visuals

- Treat code as the source of truth for behavior, accessibility, and data
  contracts. Figma is the source of truth for approved visual composition.
- Keep chart data structured and typed. Do not embed report-specific values in
  drawing logic.
- Prefer compound components and explicit variants over boolean configuration
  props.
- Every interactive visual must support keyboard use, equivalent focus and
  pointer behavior, reduced motion, responsive layouts, and a semantic data
  table.
- Separate factual data, editorial interpretation, methodology, and sources.
- Validate at 320 px and at the 752 px Annual Report reading-column width.
- Add tests for semantic output, keyboard interaction, controlled state, and
  invalid data.
