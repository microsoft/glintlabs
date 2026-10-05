"""Catalog tooling for the ``people-science-knowledge-vault`` skill.

This script operationalizes the "Precedence and deduplication" rules in
``skills/people-science-knowledge-vault/references/source-priority.md``:

1. Canonicalize article URLs (strip tracking params, normalize host/path).
2. Deduplicate identical articles across the two source tiers.
3. When an article appears in both tiers, classify it as first priority
   (``viva_blog`` outranks ``external_workbook``).

The catalog this script produces is a *discovery aid* only. Per the skill's
guardrails, agents must still retrieve the full published article body
before using any catalog entry as evidence -- the catalog never replaces
live retrieval.

Usage:

    python scripts/knowledge_vault_catalog.py build \\
        --viva-blog-input viva_blog_articles.json \\
        --workbook-input workbook_external_rows.json \\
        --output skills/people-science-knowledge-vault/references/catalog.json

    python scripts/knowledge_vault_catalog.py check-links \\
        --catalog skills/people-science-knowledge-vault/references/catalog.json

Input JSON files are lists of records with at least ``title`` and ``url``.
Optional fields (``theme``, ``description``, ``retrieved_at``) are preserved.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterable
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

SCHEMA_VERSION = "1.0.0"

#: Tier precedence, lower index wins when the same article is found in both.
TIER_PRECEDENCE = ("viva_blog", "external_workbook")

#: Known tracking query parameters to strip during canonicalization.
TRACKING_PARAM_PREFIXES = ("utm_", "mc_", "wt.mc_id")
TRACKING_PARAM_NAMES = {
    "fbclid",
    "gclid",
    "msclkid",
    "ocid",
    "igshid",
    "ref",
    "ref_src",
    "spm",
}


def canonicalize_url(url: str) -> str:
    """Return a normalized form of ``url`` for cross-tier deduplication.

    Normalizes scheme/host casing, drops default ports, strips the
    fragment, removes known tracking query parameters, sorts any remaining
    query parameters, and removes a single trailing slash from the path.
    """
    parsed = urlparse(url.strip())
    scheme = parsed.scheme.lower() or "https"
    netloc = parsed.netloc.lower()
    if netloc.endswith(":80") and scheme == "http":
        netloc = netloc[: -len(":80")]
    if netloc.endswith(":443") and scheme == "https":
        netloc = netloc[: -len(":443")]

    path = parsed.path
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")

    kept_params = []
    for key, value in parse_qsl(parsed.query, keep_blank_values=True):
        lowered = key.lower()
        if lowered in TRACKING_PARAM_NAMES:
            continue
        if any(lowered.startswith(prefix) for prefix in TRACKING_PARAM_PREFIXES):
            continue
        kept_params.append((key, value))
    kept_params.sort()
    query = urlencode(kept_params)

    return urlunparse((scheme, netloc, path, "", query, ""))


@dataclass
class CatalogRecord:
    title: str
    url: str
    canonical_url: str
    source_tier: str
    theme: str | None = None
    description: str | None = None
    retrieved_at: str | None = None
    also_listed_in: list[str] = field(default_factory=list)
    last_checked: str | None = None
    status: str | None = None

    def to_dict(self) -> dict:
        data = {
            "title": self.title,
            "url": self.url,
            "canonical_url": self.canonical_url,
            "source_tier": self.source_tier,
            "theme": self.theme,
            "description": self.description,
            "retrieved_at": self.retrieved_at,
            "also_listed_in": self.also_listed_in,
            "last_checked": self.last_checked,
            "status": self.status,
        }
        return data


def _tier_rank(tier: str) -> int:
    try:
        return TIER_PRECEDENCE.index(tier)
    except ValueError:
        # Unknown tiers sort last so they never silently outrank known tiers.
        return len(TIER_PRECEDENCE)


def build_catalog(
    viva_blog_articles: Iterable[dict],
    workbook_rows: Iterable[dict],
) -> list[dict]:
    """Merge the two source tiers into a deduplicated catalog.

    The first-priority ``viva_blog`` tier always wins when the same
    canonical URL appears in both tiers; the losing tier is recorded in
    ``also_listed_in`` rather than discarded silently.
    """
    by_canonical: dict[str, CatalogRecord] = {}

    tiers = (
        ("viva_blog", viva_blog_articles),
        ("external_workbook", workbook_rows),
    )

    for tier_name, records in tiers:
        for raw in records:
            url = raw.get("url", "")
            if not url:
                continue
            canonical = canonicalize_url(url)
            existing = by_canonical.get(canonical)
            if existing is None:
                by_canonical[canonical] = CatalogRecord(
                    title=raw.get("title", ""),
                    url=url,
                    canonical_url=canonical,
                    source_tier=tier_name,
                    theme=raw.get("theme"),
                    description=raw.get("description"),
                    retrieved_at=raw.get("retrieved_at"),
                )
            else:
                if tier_name not in existing.also_listed_in and tier_name != existing.source_tier:
                    existing.also_listed_in.append(tier_name)
                if _tier_rank(tier_name) < _tier_rank(existing.source_tier):
                    # The new tier outranks the stored one; promote it but
                    # keep the previous tier recorded as also-listed.
                    if existing.source_tier not in existing.also_listed_in:
                        existing.also_listed_in.append(existing.source_tier)
                    existing.source_tier = tier_name
                    existing.title = raw.get("title", existing.title)
                    existing.theme = raw.get("theme", existing.theme)
                    existing.description = raw.get("description", existing.description)

    ordered = sorted(
        by_canonical.values(),
        key=lambda rec: (_tier_rank(rec.source_tier), rec.title.lower()),
    )
    return [rec.to_dict() for rec in ordered]


def check_dead_links(
    catalog: list[dict],
    fetcher: Callable[[str], int] | None = None,
    timeout: float = 10.0,
) -> list[dict]:
    """Check each catalog entry's reachability and annotate status in place.

    ``fetcher`` takes a URL and returns an HTTP status code; it is
    injectable so tests never need real network access. The default
    fetcher issues a HEAD request (falling back to GET on 405).
    """
    def default_fetcher(url: str) -> int:
        req = urllib.request.Request(url, method="HEAD")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.status
        except urllib.error.HTTPError as exc:
            if exc.code == 405:
                get_req = urllib.request.Request(url, method="GET")
                with urllib.request.urlopen(get_req, timeout=timeout) as resp:
                    return resp.status
            return exc.code
        except urllib.error.URLError:
            return 0

    fetch = fetcher or default_fetcher
    checked_at = datetime.now(timezone.utc).isoformat()

    for record in catalog:
        try:
            status_code = fetch(record["url"])
        except Exception as exc:  # pragma: no cover - defensive, network dependent
            record["status"] = f"error:{exc}"
        else:
            if status_code and 200 <= status_code < 400:
                record["status"] = "ok"
            elif status_code == 0:
                record["status"] = "error:unreachable"
            else:
                record["status"] = f"dead:{status_code}"
        record["last_checked"] = checked_at

    return catalog


def _load_json_list(path: Path) -> list[dict]:
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict):
        data = data.get("articles", data.get("rows", []))
    return list(data)


def _cmd_build(args: argparse.Namespace) -> None:
    viva_blog_articles = _load_json_list(Path(args.viva_blog_input))
    workbook_rows = _load_json_list(Path(args.workbook_input))
    catalog = build_catalog(viva_blog_articles, workbook_rows)
    output = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "record_count": len(catalog),
        "articles": catalog,
    }
    Path(args.output).write_text(
        json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"Wrote {len(catalog)} catalog records to {args.output}")


def _cmd_check_links(args: argparse.Namespace) -> None:
    catalog_path = Path(args.catalog)
    data = json.loads(catalog_path.read_text(encoding="utf-8"))
    articles = data.get("articles", [])
    check_dead_links(articles)
    data["articles"] = articles
    data["schema_version"] = data.get("schema_version", SCHEMA_VERSION)
    data["last_link_check"] = datetime.now(timezone.utc).isoformat()
    catalog_path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    dead = [a for a in articles if a.get("status", "").startswith("dead") or a.get("status", "").startswith("error")]
    print(f"Checked {len(articles)} links; {len(dead)} unreachable or dead.")
    for entry in dead:
        print(f"  - {entry['status']}: {entry['title']} ({entry['url']})")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    build_parser = subparsers.add_parser(
        "build", help="Merge Viva Blog + workbook inputs into a deduplicated catalog."
    )
    build_parser.add_argument("--viva-blog-input", required=True)
    build_parser.add_argument("--workbook-input", required=True)
    build_parser.add_argument("--output", required=True)
    build_parser.set_defaults(func=_cmd_build)

    check_parser = subparsers.add_parser(
        "check-links", help="Re-check catalog URLs and annotate dead links."
    )
    check_parser.add_argument("--catalog", required=True)
    check_parser.set_defaults(func=_cmd_check_links)

    args = parser.parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
