#!/usr/bin/env python3
"""Build the single-file Knowledge Vault bundle.

Combines SKILL.md and every always-required reference into one file so an AI
assistant can load the whole skill, at one revision, in a single read.

Usage:
  python scripts/build_vault_bundle.py          # write/refresh the bundle
  python scripts/build_vault_bundle.py --check  # CI: fail if anything is stale

The bundle hash is a SHA-256 of the bundled sources (with the hash line itself
stripped), so it is deterministic and never depends on the commit that wrote it.
The same hash is written into SKILL.md and the bundle header; an assistant can
compare the two strings to detect a stale or mixed-revision load.
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "skills" / "people-science-knowledge-vault"
BUNDLE = SKILL_DIR / "vault-bundle.md"

# Order matters: the entry first, then the references the gate requires.
SOURCES = [
    "SKILL.md",
    "references/README.md",
    "references/source-priority.md",
    "references/public-use.md",
    "references/research-workflow.md",
]

# Keep the bundle readable in one fetch by common assistants (~48 KB limits).
MAX_BYTES = 45_000
WARN_BYTES = 40_000

HASH_LINE = re.compile(r"^Bundle hash: `[0-9a-f]{12}`[ \t]*$", re.MULTILINE)
END_MARKER = "<!-- END OF KNOWLEDGE VAULT BUNDLE {h} -->"


def read(rel: str) -> str:
    path = SKILL_DIR / rel
    if not path.is_file():
        sys.exit(f"error: required source missing: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8").replace("\r\n", "\n")


def strip_hash(text: str) -> str:
    return HASH_LINE.sub("Bundle hash: `<computed>`", text)


def compute_hash(bodies: dict[str, str]) -> str:
    h = hashlib.sha256()
    for rel in SOURCES:
        h.update(rel.encode())
        h.update(b"\0")
        h.update(strip_hash(bodies[rel]).encode())
        h.update(b"\0")
    return h.hexdigest()[:12]


def stamp_skill(skill: str, digest: str) -> str:
    if not HASH_LINE.search(skill):
        sys.exit(
            "error: SKILL.md needs a line of the form\n"
            "  Bundle hash: `000000000000`\n"
            "in its 'Start from the link' section."
        )
    return HASH_LINE.sub(f"Bundle hash: `{digest}`", skill)


def build(bodies: dict[str, str], digest: str) -> str:
    parts = [
        "# People Science Knowledge Vault: complete skill bundle\n",
        f"Bundle hash: `{digest}`\n",
        "This generated file contains the skill entry and every always-required "
        "reference at one revision. Loading it completely satisfies the "
        "required-reference gate for the files listed below. Do not edit by hand; "
        "run `python scripts/build_vault_bundle.py`.\n",
        "Links inside these sections that point to a bundled file refer to the "
        "matching section below. Other links (topic pages, source profiles, "
        "original publications) are still fetched on demand.\n",
        "The load is complete only if the final line is the end marker with this "
        "same hash. A missing marker means the read was truncated.\n",
        "Included files:\n",
        *[f"- `{rel}`" for rel in SOURCES],
        "",
    ]
    for rel in SOURCES:
        body = bodies[rel].rstrip("\n")
        parts += [
            "",
            "---",
            "",
            f"<!-- BEGIN FILE: {rel} -->",
            "",
            body,
            "",
            f"<!-- END FILE: {rel} -->",
        ]
    parts += ["", END_MARKER.format(h=digest), ""]
    return "\n".join(parts)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="fail if outputs are stale")
    args = ap.parse_args()

    bodies = {rel: read(rel) for rel in SOURCES}
    digest = compute_hash(bodies)
    new_skill = stamp_skill(bodies["SKILL.md"], digest)
    bodies["SKILL.md"] = new_skill
    bundle = build(bodies, digest)
    size = len(bundle.encode("utf-8"))

    if size > MAX_BYTES:
        print(f"error: bundle is {size:,} bytes; limit is {MAX_BYTES:,}. "
              "Trim a required file or move content to an on-demand page.")
        return 1
    if size > WARN_BYTES:
        print(f"warning: bundle is {size:,} bytes (warning threshold {WARN_BYTES:,}).")

    skill_path = SKILL_DIR / "SKILL.md"
    old_skill = skill_path.read_text(encoding="utf-8").replace("\r\n", "\n")
    old_bundle = BUNDLE.read_text(encoding="utf-8") if BUNDLE.exists() else ""

    if args.check:
        stale = []
        if old_skill != new_skill:
            stale.append("SKILL.md bundle hash")
        if old_bundle != bundle:
            stale.append(str(BUNDLE.relative_to(ROOT)))
        if stale:
            print("error: out of date: " + ", ".join(stale))
            print("run: python scripts/build_vault_bundle.py  and commit the result")
            return 1
        print(f"ok: bundle {digest} is current ({size:,} bytes)")
        return 0

    skill_path.write_text(new_skill, encoding="utf-8")
    BUNDLE.write_text(bundle, encoding="utf-8")
    print(f"wrote {BUNDLE.relative_to(ROOT)} ({size:,} bytes), hash {digest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
