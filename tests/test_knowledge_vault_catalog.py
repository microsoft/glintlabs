"""Retrieval-quality and consistency checks for the people-science-knowledge-vault
catalog, workbook schema, and generated resources list.

These tests guard the unification between
the publisher catalog, its public `skills/people-science-knowledge-vault/references/catalog.json`, and
`skills/analyze-survey/references/people-science-source-index.json`, and make sure
the generated `prioritized-resources.md` stays in sync with `catalog.json`.
"""

from __future__ import annotations

import copy
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VAULT_DIR = ROOT / "skills/people-science-knowledge-vault/references"
MAINTENANCE_DIR = ROOT / "references/maintenance/knowledge-vault"
CATALOG_PATH = MAINTENANCE_DIR / "catalog.json"
WORKBOOK_SCHEMA_PATH = MAINTENANCE_DIR / "workbook-schema.json"
PRIORITIZED_RESOURCES_PATH = VAULT_DIR / "prioritized-resources.md"
MAINTENANCE_GUIDE_PATH = MAINTENANCE_DIR / "README.md"
SOURCE_INDEX_PATH = (
    ROOT / "skills/analyze-survey/references/people-science-source-index.json"
)
BUILD_SCRIPT = ROOT / "scripts/build_knowledge_vault_resources.py"
sys.path.insert(0, str(ROOT / "scripts"))
import build_knowledge_vault_resources as builder

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
KNOWN_TIERS = {"viva-blog", "curated-external", "microsoft-learn", "adoption-center"}
KNOWN_PRIORITY_TIERS = {"top5", "high", "medium", "low", "curated"}


def load_catalog() -> dict:
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


def load_source_index() -> dict:
    return json.loads(SOURCE_INDEX_PATH.read_text(encoding="utf-8"))


def load_workbook_schema() -> dict:
    return json.loads(WORKBOOK_SCHEMA_PATH.read_text(encoding="utf-8"))


def test_canonicalize_url_preserves_meaningful_query_parameters():
    noisy = (
        "HTTPS://TechCommunity.Microsoft.com:443/blog/post/1/"
        "?utm_source=mail&b=2&a=1&fbclid=xyz#section"
    )
    assert builder.canonicalize_url(noisy) == (
        "https://techcommunity.microsoft.com/blog/post/1?a=1&b=2"
    )
    assert builder.canonicalize_url("http://example.com:80/") == "http://example.com/"
    assert builder.canonicalize_url("https://example.com/?page=1") != (
        builder.canonicalize_url("https://example.com/?page=2")
    )


def test_catalog_rejects_canonical_duplicates_without_changing_priorities():
    catalog = load_catalog()
    duplicate = copy.deepcopy(catalog["entries"][0])
    duplicate["id"] = "tracking-link-duplicate"
    duplicate["url"] = duplicate["url"].rstrip("/") + "/?utm_source=mail#section"
    catalog["entries"].append(duplicate)
    original = copy.deepcopy(catalog)
    assert any("duplicate entry url" in issue for issue in builder.validate_catalog(catalog))
    assert catalog == original


def test_research_workflow_links_topic_aliases_for_discovery():
    workflow = (VAULT_DIR / "research-workflow.md").read_text(encoding="utf-8")
    assert "(topic-aliases.md)" in workflow
    aliases = (VAULT_DIR / "topic-aliases.md").read_text(encoding="utf-8")
    for phrase in ("burnout", "return to office", "turnover", "copilot adoption"):
        assert phrase in aliases.casefold()
    assert "not interchangeable validated survey constructs" in aliases


def test_catalog_entries_have_required_fields_and_are_unique():
    catalog = load_catalog()
    entries = catalog["entries"]
    assert entries, "catalog.json must have at least one entry"

    ids = []
    urls = []
    for entry in entries:
        for field in REQUIRED_ENTRY_FIELDS:
            assert entry.get(field), f"entry '{entry.get('id')}' missing '{field}'"
        assert entry["tier"] in KNOWN_TIERS, f"unknown tier '{entry['tier']}'"
        assert (
            entry["priority_tier"] in KNOWN_PRIORITY_TIERS
        ), f"unknown priority_tier '{entry['priority_tier']}'"
        assert isinstance(
            entry["research_questions"], list
        ) and entry["research_questions"], (
            f"entry '{entry['id']}' research_questions must be a non-empty list"
        )
        ids.append(entry["id"])
        urls.append(entry["url"])

    assert len(ids) == len(set(ids)), "catalog.json has duplicate entry ids"
    assert len(urls) == len(set(urls)), "catalog.json has duplicate entry urls"


def test_catalog_matches_analyze_survey_source_index():
    """Every analyze-survey source must exist in the canonical catalog with the
    same title and url, so the two duplicated lists cannot silently drift apart.
    """
    catalog = load_catalog()
    by_id = {entry["id"]: entry for entry in catalog["entries"]}
    source_index = load_source_index()

    for source in source_index["sources"]:
        catalog_entry = by_id.get(source["id"])
        assert catalog_entry is not None, (
            f"analyze-survey source '{source['id']}' has no matching entry in "
            "catalog.json"
        )
        assert catalog_entry["title"] == source["title"]
        assert catalog_entry["url"] == source["url"]


def test_curated_external_entries_cite_publicly_retrievable_links():
    """The curated externally facing resources section was previously dropped
    upstream; this guards against losing it again. It also guards the
    retrievability rework: `url` (the citable, retrieval-contract link) must be
    a publicly fetchable host, never a gated SharePoint/OneDrive link, and
    `internal_record` must retain the original gated link for provenance only.
    """
    gated_hosts = ("sharepoint-df.com", "sharepoint.com", "onedrive")
    catalog = load_catalog()
    curated = [e for e in catalog["entries"] if e["tier"] == "curated-external"]
    assert curated, "catalog.json must keep at least one curated-external entry"
    for entry in curated:
        assert entry.get(
            "internal_record"
        ), f"curated-external entry '{entry['id']}' is missing an internal_record"
        assert any(host in entry["internal_record"] for host in gated_hosts), (
            f"curated-external entry '{entry['id']}' internal_record should be the "
            "gated SharePoint/OneDrive link"
        )
        assert not any(host in entry["url"] for host in gated_hosts), (
            f"curated-external entry '{entry['id']}' url must be the publicly "
            "retrievable link, not the gated internal record"
        )


def test_workbook_schema_matches_publisher_maintenance_prose():
    """workbook-schema.json is the machine-readable version of the workbook facts
    described in the publisher maintenance guide; keep the facts consistent.
    """
    schema = load_workbook_schema()
    prose = MAINTENANCE_GUIDE_PATH.read_text(encoding="utf-8")

    assert schema["observed_workbook_name"] in prose
    assert schema["required_worksheet"] == "External"
    assert f"`{schema['required_worksheet']}`" in prose
    for worksheet in schema["excluded_worksheets"]:
        assert f"`{worksheet}`" in prose, (
            f"excluded worksheet '{worksheet}' from workbook-schema.json is not "
            "mentioned in the publisher maintenance guide"
        )


def test_prioritized_resources_is_up_to_date():
    """Guards against hand-editing prioritized-resources.md or forgetting to
    regenerate it after a catalog.json change.
    """
    assert PRIORITIZED_RESOURCES_PATH.exists()
    result = subprocess.run(
        [sys.executable, str(BUILD_SCRIPT), "--check"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, (
        "prioritized-resources.md is out of date or catalog.json has problems:\n"
        f"{result.stdout}\n{result.stderr}"
    )


def test_prioritized_resources_lists_every_catalog_entry():
    catalog = load_catalog()
    content = PRIORITIZED_RESOURCES_PATH.read_text(encoding="utf-8")
    for entry in catalog["entries"]:
        assert entry["title"] in content, (
            f"entry '{entry['id']}' title is missing from prioritized-resources.md"
        )
        assert entry["url"] in content, (
            f"entry '{entry['id']}' url is missing from prioritized-resources.md"
        )


def test_prioritized_resources_notes_the_live_workbook_tier():
    content = PRIORITIZED_RESOURCES_PATH.read_text(encoding="utf-8")
    assert "External" in content
    assert "source-priority.md" in content


def test_external_tab_snapshot_matches_workbook_schema():
    """The saved snapshot is the local copy of the gated workbook's `External`
    worksheet; keep its row count and worksheet name honest against the
    machine-readable facts in workbook-schema.json.
    """
    snapshot_path = MAINTENANCE_DIR / "external-tab-snapshot.json"
    assert snapshot_path.exists(), "external-tab-snapshot.json is missing"
    snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
    schema = load_workbook_schema()

    assert snapshot["worksheet"] == schema["required_worksheet"]
    assert snapshot["row_count"] == schema["observed_record_count"]
    assert snapshot["row_count"] == len(snapshot["rows"])
