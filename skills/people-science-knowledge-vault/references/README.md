# People Science Knowledge Vault references

Start with [public setup](public-use.md), the [corpus guide](corpus-guide.md),
and the [topic-first directory](topic-lookup.md). Open matching
[source profiles](theme-lookup.md), then retrieve the public publications
before using their claims. No private account or extraction cache is needed
for discovery.

[Source priority](source-priority.md) is the authoritative retrieval contract.
Relevant Research Drops precede original-vault resources, whose saved
column-J priorities remain unchanged. Collection priority does not establish
scientific independence, causality, or current product validity.

| File | Purpose |
| --- | --- |
| `catalog.json` | Original-vault public metadata and saved priorities |
| `prioritized-resources.md` | Human-readable original-vault ranking |
| `theme-index.json` | Both collections, themes, evidence anchors, context, study families, and gaps |
| `theme-lookup.md` | Browsable source-first view of the index |
| `topic-lookup.md` | Browsable concept-first view across collections |
| `corpus-guide.md` | Reviewed scope, exclusions, overlap, and evidence boundaries |
| `media-alternatives.json` | Rights-reviewed text alternatives and explicit recording gaps |
| `public-use.md` | Installation, updates, capabilities, and fallback behavior |

These are discovery context, not a full-text evidence archive. Hashes and
line/page/transcript locators identify reviewed extractions; they do not
replace current full-source retrieval. A player page is not audio evidence.

Repository-only tools support optional search:

```text
python scripts/search_knowledge_vault.py "manager burnout"
python scripts/search_knowledge_vault.py --topic growth-development
python scripts/search_knowledge_vault.py --coverage
```

The standalone bundle needs no scripts. Read/search its Markdown or JSON with
the host's equivalent tools. Queries in the repository CLI require all
non-stopword concepts to match within a resource and use documented aliases.
The CLI preserves collection-first priority and does not retrieve source bodies.

Workbook refresh, regeneration, permission review, and releases belong to
publishers, not runtime users. See the repository's
[publisher maintenance guide](https://github.com/microsoft/glintlabs/blob/main/references/maintenance/knowledge-vault/README.md).
