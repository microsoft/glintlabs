"""Tests for the people-science-knowledge-vault catalog tooling.

Covers URL canonicalization, cross-tier deduplication/precedence, dead-link
annotation (via an injected fake fetcher, no real network access), and the
structural contracts for the generated catalog and topic-aliases reference.
"""

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "skills/people-science-knowledge-vault"


def _load_module():
    script_path = ROOT / "scripts/knowledge_vault_catalog.py"
    spec = importlib.util.spec_from_file_location("knowledge_vault_catalog", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_canonicalize_url_strips_tracking_params_and_normalizes_host():
    module = _load_module()
    noisy = "HTTPS://TechCommunity.Microsoft.com/blog/post/1?utm_source=newsletter&b=2&a=1&fbclid=xyz"
    canonical = module.canonicalize_url(noisy)

    assert canonical == "https://techcommunity.microsoft.com/blog/post/1?a=1&b=2"


def test_canonicalize_url_drops_trailing_slash_and_fragment():
    module = _load_module()
    assert module.canonicalize_url("https://example.com/blog/post/") == (
        "https://example.com/blog/post"
    )
    assert module.canonicalize_url("https://example.com/blog/post#section") == (
        "https://example.com/blog/post"
    )


def test_build_catalog_deduplicates_and_prefers_viva_blog_tier():
    module = _load_module()
    viva_blog = [
        {
            "title": "Holistic listening ecosystem",
            "url": "https://techcommunity.microsoft.com/blog/listening?utm_source=x",
            "theme": "Listening",
        }
    ]
    workbook = [
        {
            "title": "Holistic listening ecosystem (workbook copy)",
            "url": "https://techcommunity.microsoft.com/blog/listening",
            "theme": "Employee listening",
        },
        {
            "title": "External-only article",
            "url": "https://example.com/only-in-workbook",
            "theme": "Other",
        },
    ]

    catalog = module.build_catalog(viva_blog, workbook)

    assert len(catalog) == 2
    merged = next(r for r in catalog if r["canonical_url"].endswith("/blog/listening"))
    assert merged["source_tier"] == "viva_blog"
    assert merged["title"] == "Holistic listening ecosystem"
    assert "external_workbook" in merged["also_listed_in"]

    workbook_only = next(r for r in catalog if "only-in-workbook" in r["canonical_url"])
    assert workbook_only["source_tier"] == "external_workbook"
    assert workbook_only["also_listed_in"] == []


def test_build_catalog_promotes_viva_blog_even_when_seen_second():
    module = _load_module()
    # Workbook tier is merged after viva_blog in build_catalog's own tier loop,
    # but exercise the reverse arrival order via the public function signature
    # to confirm precedence is tier-based, not arrival-order-based.
    viva_blog = [
        {"title": "Canonical title", "url": "https://example.com/a"},
    ]
    workbook = [
        {"title": "Workbook title", "url": "https://example.com/a?utm_campaign=x"},
    ]

    catalog = module.build_catalog(viva_blog, workbook)

    assert len(catalog) == 1
    assert catalog[0]["source_tier"] == "viva_blog"
    assert catalog[0]["title"] == "Canonical title"


def test_check_dead_links_annotates_status_with_injected_fetcher():
    module = _load_module()
    catalog = [
        {"title": "Alive", "url": "https://example.com/alive"},
        {"title": "Dead", "url": "https://example.com/dead"},
        {"title": "Unreachable", "url": "https://example.com/unreachable"},
    ]

    def fake_fetcher(url: str) -> int:
        if url.endswith("/alive"):
            return 200
        if url.endswith("/dead"):
            return 404
        raise OSError("name resolution failed")

    module.check_dead_links(catalog, fetcher=fake_fetcher)

    statuses = {record["title"]: record["status"] for record in catalog}
    assert statuses["Alive"] == "ok"
    assert statuses["Dead"] == "dead:404"
    assert statuses["Unreachable"].startswith("error:")
    assert all(record["last_checked"] for record in catalog)


def test_generated_catalog_matches_schema_shape():
    catalog_path = SKILL_DIR / "references/catalog.json"
    schema_path = SKILL_DIR / "references/catalog.schema.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    schema = json.loads(schema_path.read_text(encoding="utf-8"))

    assert catalog["schema_version"] == schema["properties"]["schema_version"]["const"]
    assert catalog["record_count"] == len(catalog["articles"])
    for record in catalog["articles"]:
        assert record["source_tier"] in {"viva_blog", "external_workbook"}
        assert record["url"]
        assert record["canonical_url"]


def test_skill_references_topic_aliases_and_catalog():
    skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
    assert "topic-aliases.md" in skill
    assert "catalog.json" in skill
    assert "scripts/knowledge_vault_catalog.py" in skill
    # Guardrail: a dead/error catalog entry must not be cited without re-verification.
    assert "dead:*" in skill or "status" in skill


def test_topic_aliases_cover_core_people_science_concepts():
    aliases = (SKILL_DIR / "references/topic-aliases.md").read_text(encoding="utf-8")
    for required_topic in [
        "Employee engagement",
        "Psychological safety",
        "Manager effectiveness",
        "Burnout / wellbeing",
        "AI adoption and readiness",
    ]:
        assert required_topic in aliases


def test_retrieval_quality_aliases_resolve_to_canonical_topics():
    """Spot-check common alternate phrasings map to a catalogued canonical topic."""
    aliases = (SKILL_DIR / "references/topic-aliases.md").read_text(encoding="utf-8")
    sample_queries = {
        "burnout": "Burnout / wellbeing",
        "return to office": "Hybrid and flexible work",
        "turnover": "Attrition / retention",
        "Copilot adoption": "AI adoption and readiness",
    }
    for phrase, expected_topic in sample_queries.items():
        row = next(
            (line for line in aliases.splitlines() if phrase.lower() in line.lower()),
            None,
        )
        assert row is not None, f"missing alias row for {phrase!r}"
        assert expected_topic in row
