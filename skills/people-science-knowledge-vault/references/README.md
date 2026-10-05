# People Science Knowledge Vault references

This folder defines the source hierarchy for `people-science-knowledge-vault`.

Start with `source-priority.md`. It identifies the authoritative published corpus,
the secondary external-only workbook source, exclusions, and refresh rules.

Also in this folder:

- `topic-aliases.md` -- canonical topics and close-variant phrases used to expand a
  user's question before matching against either source tier.
- `catalog.json` -- a generated, deduplicated discovery index built by
  `scripts/knowledge_vault_catalog.py build`. It is a discovery aid only; always
  retrieve the live article body before citing it as evidence.
- `catalog.schema.json` -- the JSON Schema for `catalog.json` records.

Future additions may include a reviewed article-body cache. Do not add internal or
unpublished material to this folder.
