# Use the Knowledge Vault with a link

Paste this into an AI assistant that can read public web links:

> Read and follow this skill, then help me with my People Science question:
> https://github.com/microsoft/glintlabs/blob/main/skills/people-science-knowledge-vault/SKILL.md
>
> My question: How can we retain experienced manufacturing employees?

The assistant reads the skill, its repo-hosted `references` library, and relevant
published sources. The user does not download files, install a ZIP/plugin,
clone the repository, or run scripts. Reading a link is conversation-scoped:
it does not register a native skill or guarantee persistence into another chat.

## Retrieval sequence

Start with [the context entry](README.md) and [source priority](source-priority.md).
Follow relevant small topic pages, then individual source profiles. Retrieve
the original public article/PDF/recording before using its substantive claims.
The larger combined indexes are optional bulk views, not required downloads.
If the skill URL specifies a non-main ref, keep all repository context on it.

If GitHub's rendered page is unreadable, try its raw file URL:
https://raw.githubusercontent.com/microsoft/glintlabs/main/skills/people-science-knowledge-vault/SKILL.md

## Host capabilities and honest fallbacks

| Capability | Needed for | If unavailable |
| --- | --- | --- |
| Read public GitHub/raw file bodies and follow links | Loading this skill and context | Say the library has not been loaded; do not imply a connection |
| Retrieve complete HTML article bodies | Article-grounded answers | Offer discovery links only, or request a supplied public source body |
| Extract PDF text and inspect relevant figures | PDF-backed claims | Exclude unreadable claims and disclose the gap |
| Read audio/captions or an approved hosted alternative | Recording-only claims | Use article evidence only and disclose omitted media |

No Microsoft-internal credentials, private workbook, Python, `vivaglint`,
survey export, or local file access is needed for published guidance.
The host may require its own account, permissions, or subscription. An
ordinary chatbot without link retrieval cannot acquire this capability from
a URL. Regional restrictions and extraction limits remain possible.

Confirm actual file/body retrieval, not just titles, previews, successful HTTP
responses, or player shells. Check truncation; the small topic and source pages
avoid requiring the entire index in one model context.

## Sources, rights, and updates

The repository instructions/editorial summaries use its MIT license. That
license does not automatically cover linked publications or recordings.
`media-alternatives.json` records rights-reviewed hosted text and explicit gaps.
No transcript redistribution permission is verified at this revision; four
recordings remain linked, not transcribed or republished here.

Use the index review date and original publication dates when judging
currency. Main provides the latest published repository context; a commit URL
can pin a reproducible snapshot. A review date/hash is not a live-source check.
Only publishers refresh protected-workbook provenance. Users never need to.
