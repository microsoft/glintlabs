"""Generate and validate the people-science-knowledge-vault resource catalog.

This script is the single place that turns the machine-readable catalog
(`catalog.json`) into the human-readable ranked list
(`prioritized-resources.md`), and checks the catalog and workbook schema for
basic integrity and staleness.

Usage:
    python scripts/build_knowledge_vault_resources.py            # regenerate prioritized-resources.md
    python scripts/build_knowledge_vault_resources.py --check     # validate only, exit 1 on problems
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
VAULT_DIR = ROOT / "skills/people-science-knowledge-vault/references"
CATALOG_PATH = VAULT_DIR / "catalog.json"
WORKBOOK_SCHEMA_PATH = VAULT_DIR / "workbook-schema.json"
OUTPUT_PATH = VAULT_DIR / "prioritized-resources.md"
SNAPSHOT_PATH = VAULT_DIR / "external-tab-snapshot.json"
SOURCE_INDEX_PATH = (
    ROOT / "skills/analyze-survey/references/people-science-source-index.json"
)

# (rank, group heading) per priority_tier, the column-J-derived ranking.
# Lower rank sorts first.
PRIORITY_TIER_GROUPS: dict[str, tuple[int, str]] = {
    "top5": (1, "Top5 - highest priority"),
    "curated": (
        1,
        "Curated - high value, not present in the workbook snapshot",
    ),
    "high": (2, "High priority"),
    "medium": (3, "Medium priority"),
    "low": (4, "Low priority"),
}

KNOWN_TIERS = {"viva-blog", "curated-external", "microsoft-learn", "adoption-center"}

REQUIRED_ENTRY_FIELDS = (
    "id",
    "title",
    "url",
    "tier",
    "priority_tier",
    "theme",
    "description",
    "research_questions",
)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_catalog(catalog: dict[str, Any]) -> list[str]:
    """Return a list of human-readable problems; empty means the catalog is valid."""
    issues: list[str] = []
    entries = catalog.get("entries", [])
    if not entries:
        issues.append("catalog has no entries")

    seen_ids: set[str] = set()
    seen_urls: set[str] = set()
    for entry in entries:
        entry_id = entry.get("id", "<missing id>")
        for field in REQUIRED_ENTRY_FIELDS:
            if not entry.get(field):
                issues.append(f"entry '{entry_id}' is missing required field '{field}'")
        if entry.get("tier") not in KNOWN_TIERS:
            issues.append(
                f"entry '{entry_id}' has unknown tier '{entry.get('tier')}'"
            )
        if entry.get("priority_tier") not in PRIORITY_TIER_GROUPS:
            issues.append(
                f"entry '{entry_id}' has unknown priority_tier "
                f"'{entry.get('priority_tier')}'"
            )
        if entry_id in seen_ids:
            issues.append(f"duplicate entry id '{entry_id}'")
        seen_ids.add(entry_id)
        url = entry.get("url")
        if url in seen_urls:
            issues.append(f"duplicate entry url '{url}'")
        if url:
            seen_urls.add(url)

    return issues


def check_catalog_matches_source_index(catalog: dict[str, Any]) -> list[str]:
    """Ensure analyze-survey's static index never drifts from the vault catalog.

    analyze-survey/references/people-science-source-index.json duplicates
    bibliographic data (title/url) for its own keyword-routing purposes. This
    check keeps that duplication honest: every id it references must exist in
    the canonical catalog with matching title and url.
    """
    if not SOURCE_INDEX_PATH.exists():
        return [f"source index not found at {SOURCE_INDEX_PATH}"]

    source_index = load_json(SOURCE_INDEX_PATH)
    by_id = {entry["id"]: entry for entry in catalog.get("entries", [])}

    issues: list[str] = []
    for source in source_index.get("sources", []):
        source_id = source.get("id")
        catalog_entry = by_id.get(source_id)
        if catalog_entry is None:
            issues.append(
                f"analyze-survey source '{source_id}' has no matching catalog entry"
            )
            continue
        if catalog_entry["title"] != source.get("title"):
            issues.append(
                f"title mismatch for '{source_id}': "
                f"catalog='{catalog_entry['title']}' vs source-index='{source.get('title')}'"
            )
        if catalog_entry["url"] != source.get("url"):
            issues.append(
                f"url mismatch for '{source_id}': "
                f"catalog='{catalog_entry['url']}' vs source-index='{source.get('url')}'"
            )

    return issues


def check_freshness(
    catalog: dict[str, Any],
    workbook_schema: dict[str, Any],
    today: dt.date,
) -> list[str]:
    warnings: list[str] = []

    generated_at = catalog.get("generated_at")
    if generated_at:
        age_days = (today - dt.date.fromisoformat(generated_at)).days
        if age_days > 90:
            warnings.append(
                f"catalog.json generated_at is {age_days} days old (>90); re-verify article links"
            )

    staleness = workbook_schema.get("staleness_check", {})
    observed_date = workbook_schema.get("observed_date")
    max_age = staleness.get("max_age_days", 90)
    if observed_date:
        age_days = (today - dt.date.fromisoformat(observed_date)).days
        if age_days > max_age:
            warnings.append(
                f"workbook-schema.json observed_date is {age_days} days old "
                f"(>{max_age}); {staleness.get('on_expiry', 're-verify the workbook schema')}"
            )

    return warnings


def render_prioritized_markdown(catalog: dict[str, Any]) -> str:
    entries = catalog.get("entries", [])
    grouped: dict[str, list[dict[str, Any]]] = {}
    for entry in entries:
        _, heading = PRIORITY_TIER_GROUPS[entry["priority_tier"]]
        grouped.setdefault(heading, []).append(entry)

    ordered_headings = sorted(
        grouped,
        key=lambda heading: next(
            rank for rank, label in PRIORITY_TIER_GROUPS.values() if label == heading
        ),
    )

    lines = [
        "<!-- Generated by scripts/build_knowledge_vault_resources.py from catalog.json. -->",
        "<!-- Do not hand-edit; update catalog.json and regenerate instead. -->",
        "",
        "# Prioritized resources (human-readable)",
        "",
        "This is a quick-scan, human-friendly view of the knowledge vault's known",
        "resources, ranked by `priority_tier` (sourced from the workbook's column J,",
        "'Priority to add to context library'): Top5 > High > Medium > Low, with",
        "Curated entries (not present in the External worksheet snapshot) treated as",
        "Top5-equivalent. It is **not** the retrieval contract: agents must still",
        "follow `source-priority.md`, which also covers the supplementary live checks",
        "(Microsoft Viva Blog category page, Microsoft Learn, Adoption Center) useful",
        "for material newer than the saved `external-tab-snapshot.json`.",
        "",
    ]

    for heading in ordered_headings:
        lines.append(f"## {heading}")
        lines.append("")
        lines.append("| Title | Theme | Link |")
        lines.append("| --- | --- | --- |")
        for entry in sorted(grouped[heading], key=lambda e: e["title"]):
            lines.append(
                f"| {entry['title']} | {entry['theme']} | [source]({entry['url']}) |"
            )
        lines.append("")

    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate only; do not write prioritized-resources.md.",
    )
    args = parser.parse_args(argv)

    catalog = load_json(CATALOG_PATH)
    workbook_schema = load_json(WORKBOOK_SCHEMA_PATH)

    issues = validate_catalog(catalog) + check_catalog_matches_source_index(catalog)
    if issues:
        for issue in issues:
            print(f"ERROR: {issue}", file=sys.stderr)
        return 1

    for warning in check_freshness(catalog, workbook_schema, dt.date.today()):
        print(f"WARNING: {warning}", file=sys.stderr)

    markdown = render_prioritized_markdown(catalog)
    if args.check:
        current = OUTPUT_PATH.read_text(encoding="utf-8") if OUTPUT_PATH.exists() else ""
        if current.strip() != markdown.strip():
            print(
                "ERROR: prioritized-resources.md is out of date; "
                "run scripts/build_knowledge_vault_resources.py to regenerate it.",
                file=sys.stderr,
            )
            return 1
        return 0

    OUTPUT_PATH.write_text(markdown + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
