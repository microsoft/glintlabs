"""Build a deterministic standalone skill ZIP containing only public runtime files."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path, PurePosixPath
from urllib.parse import urlparse

from build_knowledge_vault_resources import render_prioritized_markdown
from search_knowledge_vault import load_json, validate_index

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills/people-science-knowledge-vault"
PUBLIC_FILES = (
    "SKILL.md",
    "references/README.md",
    "references/public-use.md",
    "references/source-priority.md",
    "references/corpus-guide.md",
    "references/theme-index.json",
    "references/theme-lookup.md",
    "references/topic-lookup.md",
    "references/media-alternatives.json",
)
CATALOG_FIELDS = (
    "id", "title", "url", "tier", "priority_tier", "theme",
    "description", "research_questions",
)
PRIVATE_LOCATION = re.compile(
    r"(?:sharepoint(?:-df)?\.com/|onedrive\.live\.com/|[a-z]:\\|\"internal_record\")",
    re.IGNORECASE,
)


def sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def json_bytes(value: dict) -> bytes:
    return (json.dumps(value, indent=2, ensure_ascii=True) + "\n").encode("utf-8")


def validate_media(skill: Path, index: dict, manifest: dict) -> dict[str, bytes]:
    """Require recorded human permission review; never infer rights from playback."""
    if manifest.get("schema_version") != 1:
        raise ValueError("unsupported media alternatives schema")
    sources = {
        resource["id"]: resource["additional_media"][0]["url"]
        for resource in index["resources"] if resource.get("additional_media")
    }
    seen: set[str] = set()
    files: dict[str, bytes] = {}
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
        filename = asset["path"]
        if not re.fullmatch(r"references/media/[a-z0-9-]+\.(md|txt)", filename):
            raise ValueError(f"{resource_id}: invalid bundled text path")
        path = skill / filename
        if path.is_symlink() or not path.resolve().is_relative_to(skill.resolve()):
            raise ValueError(f"{resource_id}: text must be inside the skill")
        content = path.read_bytes()
        if sha256(content) != asset.get("sha256"):
            raise ValueError(f"{resource_id}: text hash mismatch")
        text = content.decode("utf-8")
        if asset["source_url"] not in text:
            raise ValueError(f"{resource_id}: source attribution missing from text")
        if filename in files:
            raise ValueError(f"{resource_id}: duplicated text path")
        files[filename] = content
        seen.add(resource_id)
    for gap in manifest["gaps"]:
        resource_id = gap["resource_id"]
        if resource_id not in sources or resource_id in seen or not gap["reason"].strip():
            raise ValueError(f"{resource_id}: invalid or duplicated media gap")
        seen.add(resource_id)
    if seen != set(sources):
        raise ValueError("every registered recording needs approved text or an explicit gap")
    return files


def validate_links(files: dict[str, bytes]) -> None:
    for filename, content in files.items():
        if not filename.endswith(".md"):
            continue
        prose = re.sub(r"(?ms)^```.*?^```\s*$", "", content.decode("utf-8"))
        for target in re.findall(r"\[[^\]]*\]\(([^)\s]+)\)", prose):
            if urlparse(target).scheme or target.startswith("#"):
                continue
            path = PurePosixPath(filename).parent / target.split("#", 1)[0]
            parts: list[str] = []
            for part in path.parts:
                if part == "..":
                    if not parts:
                        raise ValueError(f"{filename}: link escapes the bundle: {target}")
                    parts.pop()
                elif part != ".":
                    parts.append(part)
            if "/".join(parts) not in files:
                raise ValueError(f"{filename}: missing bundled link target: {target}")


def bundle_files(skill: Path = SKILL, license_path: Path = ROOT / "LICENSE") -> dict[str, bytes]:
    metadata = load_json(skill / "bundle.json")
    if (
        metadata.get("schema_version") != 1
        or metadata.get("name") != "people-science-knowledge-vault"
        or not re.fullmatch(r"\d+\.\d+\.\d+", metadata.get("version", ""))
    ):
        raise ValueError("invalid standalone bundle manifest/version")
    catalog = load_json(skill / "references/catalog.json")
    index = load_json(skill / "references/theme-index.json")
    issues = validate_index(index, catalog)
    if issues:
        raise ValueError("; ".join(issues))
    files: dict[str, bytes] = {}
    for filename in PUBLIC_FILES:
        path = skill / filename
        if path.is_symlink():
            raise ValueError(f"{filename}: symlinks are not public bundle inputs")
        files[filename] = path.read_text(encoding="utf-8").replace("\r\n", "\n").encode("utf-8")
    public_catalog = {
        "schema_version": catalog["schema_version"],
        "generated_at": catalog["generated_at"],
        "entries": [
            {field: entry[field] for field in CATALOG_FIELDS}
            for entry in catalog["entries"]
        ],
    }
    files["references/catalog.json"] = json_bytes(public_catalog)
    files["references/prioritized-resources.md"] = render_prioritized_markdown(public_catalog).encode("utf-8")
    files["LICENSE"] = license_path.read_text(encoding="utf-8").replace("\r\n", "\n").encode("utf-8")
    files.update(validate_media(skill, index, load_json(skill / "references/media-alternatives.json")))
    for filename, content in files.items():
        if PRIVATE_LOCATION.search(content.decode("utf-8")):
            raise ValueError(f"{filename}: private ownership/location data cannot ship")
    metadata["index_reviewed_at"] = index["reviewed_at"]
    metadata["files"] = {name: sha256(content) for name, content in sorted(files.items())}
    files["bundle.json"] = json_bytes(metadata)
    if PRIVATE_LOCATION.search(files["bundle.json"].decode("utf-8")):
        raise ValueError("bundle.json: private ownership/location data cannot ship")
    validate_links(files)
    return files


def build(output_dir: Path, skill: Path = SKILL, license_path: Path = ROOT / "LICENSE") -> Path:
    files = bundle_files(skill, license_path)
    metadata = json.loads(files["bundle.json"])
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"{metadata['name']}-{metadata['version']}.zip"
    if path.exists():
        with zipfile.ZipFile(path) as existing:
            expected = {f"{metadata['name']}/{name}": content for name, content in files.items()}
            actual = {name: existing.read(name) for name in existing.namelist()}
        if actual != expected:
            raise ValueError(f"{path.name}: changed payload requires a new version or output directory")
        return path
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in sorted(files.items()):
            info = zipfile.ZipInfo(f"{metadata['name']}/{name}", (1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, content)
    return path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args(argv)
    try:
        path = build(args.output_dir)
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        print(f"Bundle build failed: {error}", file=sys.stderr)
        return 1
    print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
