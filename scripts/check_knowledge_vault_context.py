"""Validate the public link-only context graph and permission-gated text alternatives."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

from build_knowledge_vault_resources import PUBLIC_CATALOG_FIELDS
from search_knowledge_vault import REFERENCES, ROOT, load_json, render_web_context, validate_index

PRIVATE_LOCATION = re.compile(
    r"(?:sharepoint(?:-df)?\.com/|onedrive\.live\.com/|[a-z]:\\|\"internal_record\")",
    re.IGNORECASE,
)
MAX_PAGE_BYTES = 20_000
SKILL_PATH = ROOT / "skills/people-science-knowledge-vault/SKILL.md"


def validate_media(context: Path, index: dict, manifest: dict) -> set[Path]:
    """Enforce recorded human review; public playback does not establish rights."""
    if manifest.get("schema_version") != 1:
        raise ValueError("unsupported media alternatives schema")
    sources = {
        resource["id"]: resource["additional_media"][0]["url"]
        for resource in index["resources"] if resource.get("additional_media")
    }
    seen: set[str] = set()
    files: set[Path] = set()
    for asset in manifest["approved"]:
        resource_id = asset["resource_id"]
        if resource_id not in sources or resource_id in seen:
            raise ValueError(f"{resource_id}: unknown or duplicated media alternative")
        if asset.get("source_url") != sources[resource_id]:
            raise ValueError(f"{resource_id}: alternative does not match the public recording")
        permission = urlparse(asset.get("permission_url", ""))
        if (
            permission.scheme != "https" or not permission.hostname
            or permission.username or permission.password
            or PRIVATE_LOCATION.search(asset["permission_url"])
            or asset.get("redistribution_verified") is not True
            or len(asset.get("permission_summary", "").strip()) < 30
        ):
            raise ValueError(f"{resource_id}: reviewed public redistribution permission required")
        for field in ("permission_reviewed_at", "text_reviewed_at"):
            dt.date.fromisoformat(asset[field])
        if asset.get("coverage") not in {"complete-audio-transcript", "bounded-audio-excerpt"}:
            raise ValueError(f"{resource_id}: explicit audio text coverage required")
        if not asset.get("coverage_notes", "").strip():
            raise ValueError(f"{resource_id}: coverage notes required")
        if not re.fullmatch(r"media/[a-z0-9-]+\.(md|txt)", asset["path"]):
            raise ValueError(f"{resource_id}: invalid hosted text path")
        path = context / asset["path"]
        if path.is_symlink() or not path.resolve().is_relative_to(context.resolve()):
            raise ValueError(f"{resource_id}: text must be inside public context")
        content = path.read_bytes()
        if hashlib.sha256(content).hexdigest() != asset.get("sha256"):
            raise ValueError(f"{resource_id}: text hash mismatch")
        if asset["source_url"] not in content.decode("utf-8"):
            raise ValueError(f"{resource_id}: source attribution missing from text")
        if path in files:
            raise ValueError(f"{resource_id}: duplicated text path")
        files.add(path)
        seen.add(resource_id)
    for gap in manifest["gaps"]:
        resource_id = gap["resource_id"]
        if resource_id not in sources or resource_id in seen or not gap["reason"].strip():
            raise ValueError(f"{resource_id}: invalid or duplicated media gap")
        seen.add(resource_id)
    if seen != set(sources):
        raise ValueError("every registered recording needs approved text or an explicit gap")
    return files


def validate_links(path: Path, root: Path = ROOT) -> None:
    prose = re.sub(r"(?ms)^```.*?^```\s*$", "", path.read_text(encoding="utf-8"))
    for target in re.findall(r"\[[^\]]*\]\(([^)\s]+)\)", prose):
        parsed = urlparse(target)
        if target.startswith("#"):
            continue
        if parsed.scheme:
            prefixes = (
                "https://raw.githubusercontent.com/microsoft/glintlabs/main/",
                "https://github.com/microsoft/glintlabs/blob/main/",
            )
            prefix = next((value for value in prefixes if target.startswith(value)), None)
            if not prefix:
                continue
            destination = root / target[len(prefix):].split("#", 1)[0]
        else:
            destination = path.parent / target.split("#", 1)[0]
        if not destination.resolve().is_relative_to(root.resolve()) or not destination.is_file():
            raise ValueError(f"{path.name}: missing repository link target: {target}")


def validate_context(context: Path = REFERENCES, root: Path = ROOT) -> None:
    index = load_json(context / "theme-index.json")
    catalog = load_json(context / "catalog.json")
    issues = validate_index(index, catalog)
    if issues:
        raise ValueError("; ".join(issues))
    for entry in catalog["entries"]:
        if set(entry) != set(PUBLIC_CATALOG_FIELDS):
            raise ValueError(f"{entry['id']}: context catalog must contain public fields only")
    pages = render_web_context(index)
    for name, rendered in pages.items():
        path = context / name
        if not path.is_file() or path.read_text(encoding="utf-8") != rendered:
            raise ValueError(f"{name}: stale context page; run search_knowledge_vault.py --write-reference")
        if len(rendered.encode("utf-8")) > MAX_PAGE_BYTES:
            raise ValueError(f"{name}: exceeds small-page retrieval budget")
    approved = validate_media(context, index, load_json(context / "media-alternatives.json"))
    expected = {
        context / name for name in (
            "catalog.json", "theme-index.json", "theme-lookup.md", "topic-lookup.md",
            "source-priority.md", "corpus-guide.md", "public-use.md",
            "media-alternatives.json", "prioritized-resources.md", *pages,
        )
    } | approved
    actual = {path for path in context.rglob("*") if path.is_file()}
    if actual != expected:
        raise ValueError("context contains missing/unregistered files; review its public inventory")
    for path in sorted(actual):
        if path.is_symlink():
            raise ValueError(f"{path.name}: context cannot contain symlinks")
        if PRIVATE_LOCATION.search(path.read_text(encoding="utf-8")):
            raise ValueError(f"{path.name}: private ownership/location data cannot enter public context")
        if path.suffix == ".md":
            validate_links(path, root)
    skill = root / "skills/people-science-knowledge-vault/SKILL.md"
    if len(skill.read_bytes()) > MAX_PAGE_BYTES:
        raise ValueError("SKILL.md: exceeds link-entry retrieval budget")
    validate_links(skill, root)


def main(argv: list[str] | None = None) -> int:
    argparse.ArgumentParser(description=__doc__).parse_args(argv)
    try:
        validate_context()
    except (OSError, ValueError, KeyError) as error:
        print(f"Knowledge Vault context check failed: {error}", file=sys.stderr)
        return 1
    print("Public link-only context, small pages, links, and media permission records validated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
