# Public setup and capability contract

## Install the complete folder

The standalone artifact is `people-science-knowledge-vault-VERSION.zip`.
Extract it and put its entire `people-science-knowledge-vault` folder in your
host's supported skill directory. Keep `SKILL.md`, `bundle.json`, `LICENSE`,
and `references/` together. Hosts that do not support skills can read these
instructions and files manually, but must not imply automatic tool integration.
Sharing just the GitHub link to `SKILL.md` does not install its references.

The repository and skill code/documentation use the MIT license. That license
does not automatically cover linked publications or recordings.

## Capabilities

| Capability | Required for | If unavailable |
| --- | --- | --- |
| Read/search bundled Markdown and JSON | Topic discovery and source selection | Supply the complete folder through a host-supported file mechanism |
| Retrieve complete public HTML article bodies | Article-grounded answers | Return discovery links only, or request a user-supplied public source body |
| Extract PDF text and inspect relevant figures | PDF-backed claims | Exclude unreadable claims and disclose the gap |
| Retrieve recording audio/captions or approved bundled text | Recording-only claims | Use article evidence only and disclose omitted media |
| Internet access | Current-source verification | Offline discovery only, except explicitly approved text with bounded coverage |

No Microsoft account, private SharePoint, Work IQ, Python, `vivaglint`, or survey
export is required for the knowledge workflow. Python is optional for repository
maintenance. The separate `analyze-survey` skill has its own dependencies and
must be installed before claiming quantitative analysis capability.

A successful HTTP response, link preview, player page, or catalog summary does
not prove that source evidence was retrieved. Check actual body text before
supporting a claim. Regional/network restrictions and host extraction limits
remain possible; universal worldwide access is not guaranteed.

## Text alternatives and rights

`media-alternatives.json` lists approved bundled source text and explicit media
gaps. Only a text file with reviewed redistribution permission, attribution,
declared coverage, review date, and matching content hash may ship. Public
playback, machine transcription, and the repository's MIT license alone do
not establish permission to redistribute a recording transcript.

There are currently no approved transcript alternatives. Four recordings are
linked, not republished. Hosts without media retrieval must omit recording-only
claims. Publishers can add alternatives after verifying permission; do not
treat short evidence anchors as full transcripts.

## Version and updates

Read `bundle.json` for the standalone version, index review date, included-file
hashes, and evidence limitations. The bundle version is independent of the
larger plugin version. A changed payload requires a new standalone version;
the version alone is not a source-freshness check.

Back up your installed folder and replace it with the complete newer bundle;
do not mix reference files from different versions. Compare the bundle's
`index_reviewed_at` with the question's need for current information and use
the public live checks in `source-priority.md`. External users are never
responsible for refreshing the publisher's protected workbook.

Publishers build and validate artifacts from the repository:

```text
python scripts/build_knowledge_vault_bundle.py --output-dir dist
python scripts/check_knowledge_vault_sources.py --output source-check.json
```

CI publishes versioned ZIP artifacts on main and attaches them to releases
tagged `knowledge-vault-v*`. GitHub workflow artifacts may require a GitHub
login; release assets are the intended anonymous-download distribution.
The canonical repository is https://github.com/microsoft/glintlabs.
