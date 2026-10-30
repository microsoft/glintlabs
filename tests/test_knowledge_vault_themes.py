"""Grounded resource coverage, routing, and evidence-verification regressions."""

import copy
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import search_knowledge_vault as lookup


@pytest.fixture
def index():
    return lookup.load_json(lookup.INDEX_PATH)


def test_theme_inventory_reconciles_with_catalog_and_public_drops(index):
    catalog = lookup.load_json(lookup.CATALOG_PATH)
    assert lookup.validate_index(index, catalog) == []
    assert len(index["resources"]) == len(catalog["entries"]) + 17
    assert lookup.coverage(index)["reviewed"] == 55
    assert lookup.coverage(index)["themes"] == 550
    for resource in index["resources"]:
        assert len(resource["themes"]) == (10 if resource["review_status"] == "reviewed" else 0)
        if resource["group"] == "research-drop":
            assert resource["priority_tier"] is None
            assert "published" in resource["asset_scope"].lower()


def test_redirect_is_a_gap_not_an_unrelated_body(index):
    resource = next(r for r in index["resources"] if r["id"] == "think-like-a-people-scientist-series-hub")
    assert resource["review_status"] == "gap"
    assert not resource["themes"]
    assert resource["observed_redirect"].endswith("/viva/")
    assert not resource.get("provenance")
    assert not lookup.search(index, resource_id=resource["id"])


def test_priority_and_inventory_drift_are_detected(index):
    catalog = lookup.load_json(lookup.CATALOG_PATH)
    changed = copy.deepcopy(catalog)
    changed["entries"][0]["priority_tier"] = "low"
    issues = lookup.validate_index(index, changed)
    assert any("catalog changed" in issue for issue in issues)
    assert any("priority drift" in issue for issue in issues)
    index["resources"] = [r for r in index["resources"] if r["id"] != catalog["entries"][0]["id"]]
    assert any("reconcile" in issue for issue in lookup.validate_index(index, catalog))


def test_private_records_and_invalid_evidence_are_rejected(index):
    resource = next(r for r in index["resources"] if r["review_status"] == "reviewed")
    resource["url"] = "https://microsoft.sharepoint.com/private"
    resource["themes"][0]["evidence"]["locator"] = "slide 15"
    issues = lookup.validate_index(index, lookup.load_json(lookup.CATALOG_PATH))
    assert any("non-public" in issue for issue in issues)
    assert any("private ownership" in issue for issue in issues)
    assert any("invalid evidence" in issue for issue in issues)


def test_public_product_names_are_not_private_locations(index):
    index["resources"][0]["context"] += " Public guidance can discuss SharePoint and OneDrive."
    assert lookup.validate_index(index, lookup.load_json(lookup.CATALOG_PATH)) == []


def test_shared_research_is_linked_and_methods_preserved(index):
    by_id = {r["id"]: r for r in index["resources"]}
    april = by_id["research-drop-4511230"]
    may = by_id["research-drop-4518613"]
    assert set(april["study_families"]) == set(may["study_families"])
    assert len(april["study_families"]) == 3
    assert "No repeated participants" in april["context"]
    assert "one-factor-at-a-time" in " ".join(t["summary"] for t in may["themes"])
    assert "independent" in next(
        family["description"] for family in index["study_families"]
        if family["id"] == "agentic-teaming-trust-july-2025"
    )


def test_filters_return_only_matching_reviewed_themes(index):
    result = lookup.search(index, "psychological safety", topic="psychological-safety",
                           kind="finding", group="research-drop")
    assert result
    assert any(r["id"] == "research-drop-4493933" for r in result)
    for resource in result:
        assert resource["group"] == "research-drop"
        assert all(t["kind"] == "finding" and "psychological-safety" in t["topics"] for t in resource["themes"])
    assert not lookup.search(index, "no-such-concept-957134")


def test_aliases_and_priority_preserve_source_contract(index):
    result = lookup.search(index, "manager burnout")
    assert result
    assert any(r["group"] == "research-drop" for r in result)
    ranks = [
        lookup.PRIORITY_TIER_GROUPS[r["priority_tier"]][0]
        for r in result if r["group"] == "catalog"
    ]
    assert ranks == sorted(ranks)
    assert not lookup.search(index, "manager no-such-concept-957134")


def test_new_catalog_precedes_top5_without_changing_original_vault_order(index):
    results = lookup.search(index, "AI")
    drops = [r for r in results if r["group"] == "research-drop"]
    vault = [r for r in results if r["group"] == "catalog"]
    assert drops and any(r["priority_tier"] == "top5" for r in vault)
    assert results == drops + vault
    assert [r["id"] for r in vault] == [
        r["id"] for r in lookup.search(index, "AI", group="catalog")
    ]
    ranks = [lookup.PRIORITY_TIER_GROUPS[r["priority_tier"]][0] for r in vault]
    assert ranks == sorted(ranks)
    assert not lookup.search(index, "AI no-such-concept-957134")
    assert lookup.search(index, resource_id="privacy-protection")[0]["group"] == "catalog"


def test_generic_privacy_and_career_growth_do_not_imply_ai(index):
    ai_results = {r["id"] for r in lookup.search(index, "AI", group="catalog")}
    assert "privacy-protection" not in ai_results
    assert "privacy-protection" in {
        r["id"] for r in lookup.search(index, "confidentiality", group="catalog")
    }
    assert "people-success" in {
        r["id"] for r in lookup.search(index, topic="growth-development")
    }
    assert "people-success" not in {
        r["id"] for r in lookup.search(index, topic="ai-skills")
    }


def test_priority_policy_and_browsable_order_cannot_silently_drift(index):
    rendered = lookup.render_lookup(index)
    assert rendered.index("<a id=\"research-drop-") < rendered.index("<a id=\"people-success\"")
    index["priority_policy"] = "Original vault always first"
    assert any("priority policy drift" in issue for issue in lookup.validate_index(
        index, lookup.load_json(lookup.CATALOG_PATH)
    ))


def test_short_terms_do_not_match_substrings():
    assert not lookup.contains("email maintains quality", "ai")
    assert lookup.contains("human-AI collaboration", "ai")
    assert lookup.contains("ai-governance", "ai")
    with pytest.raises(ValueError, match="searchable concept"):
        lookup.search({"resources": []}, "and the")


def test_resource_lookup_returns_all_ten_in_editorial_order(index):
    result = lookup.search(index, resource_id="research-drop-4493933")
    assert len(result) == 1
    assert [t["id"] for t in result[0]["themes"]] == [
        f"research-drop-4493933:{number:02}" for number in range(1, 11)
    ]


def test_cached_body_check_detects_anchor_and_source_changes(tmp_path):
    body = "A grounded first line.\n\nA second line."
    source = {
        "status": "retrieved", "sha256": "a" * 64, "body": body,
        "final_url": "https://learn.microsoft.com/en-us/viva/glint/test",
    }
    resource = {
        "id": "test", "review_status": "reviewed", "url": source["final_url"],
        "provenance": {
            "cache_file": "test.json", "content_sha256": source["sha256"],
            "extracted_text_sha256": lookup.digest(body),
        },
        "themes": [{
            "id": "test:01", "evidence": {
                "locator": "L2", "anchor": "second line",
                "unit_sha256": lookup.digest("A second line."),
            },
        }],
    }
    path = tmp_path / "test.json"
    path.write_text(json.dumps(source), encoding="utf-8")
    minimal_index = {"resources": [resource]}
    assert lookup.verify_bodies(minimal_index, tmp_path) == []
    resource["themes"][0]["evidence"]["locator"] = "L1"
    assert "anchor/locator" in lookup.verify_bodies(minimal_index, tmp_path)[0]
    source["body"] = "Different body"
    path.write_text(json.dumps(source), encoding="utf-8")
    assert any("body/provenance" in issue for issue in lookup.verify_bodies(minimal_index, tmp_path))


@pytest.mark.parametrize("damage", ["none", "text", "timestamp", "missing"])
def test_webinar_evidence_checks_transcript_and_timestamp(tmp_path, damage):
    body = "The public recap."
    url = "https://medius.microsoft.com/Embed/video-nc/test"
    segment = {"start": 60.5, "end": 64.0, "text": " Interpret results in context."}
    transcript = {"url": url, "status": "machine_transcribed", "segments": [segment]}
    source = {
        "status": "retrieved", "sha256": "a" * 64, "body": body,
        "final_url": "https://learn.microsoft.com/en-us/viva/glint/test",
    }
    resource = {
        "id": "test", "review_status": "reviewed", "url": source["final_url"],
        "provenance": {
            "cache_file": "test.json", "content_sha256": source["sha256"],
            "extracted_text_sha256": lookup.digest(body),
        },
        "additional_media": [{
            "url": url, "cache_file": "test-webinar.json",
            "transcript_sha256": lookup.digest(json.dumps([segment], sort_keys=True)),
        }],
        "themes": [{
            "id": "test:01", "evidence": {
                "locator": "s1", "anchor": "in context",
                "unit_sha256": lookup.digest(segment["text"].strip()),
                "url": url, "start_seconds": segment["start"],
            },
        }],
    }
    (tmp_path / "test.json").write_text(json.dumps(source), encoding="utf-8")
    if damage == "text":
        segment["text"] = "Different advice."
    elif damage == "timestamp":
        resource["themes"][0]["evidence"]["start_seconds"] = 65.0
    if damage != "missing":
        (tmp_path / "test-webinar.json").write_text(json.dumps(transcript), encoding="utf-8")
    issues = lookup.verify_bodies({"resources": [resource]}, tmp_path)
    if damage == "none":
        assert issues == []
    else:
        expected = {
            "text": "transcript/provenance mismatch",
            "timestamp": "timestamp mismatch",
            "missing": "cannot verify transcript cache",
        }[damage]
        assert any(expected in issue for issue in issues)


def test_recording_themes_require_reviewed_public_media(index):
    resource = next(r for r in index["resources"] if r.get("additional_media"))
    assert any(t["evidence"]["locator"].startswith("s") for t in resource["themes"])
    resource["additional_media"][0]["review_status"] = "machine_transcribed_pending_review"
    catalog = lookup.load_json(lookup.CATALOG_PATH)
    assert any("webinar provenance" in issue for issue in lookup.validate_index(index, catalog))
    resource["additional_media"] = []
    assert any("reviewed audio and timestamps" in issue for issue in lookup.validate_index(index, catalog))


def test_generated_lookup_is_current_and_includes_every_resource(index):
    rendered = lookup.render_lookup(index)
    assert lookup.LOOKUP_PATH.read_text(encoding="utf-8") == rendered
    for resource in index["resources"]:
        assert resource["title"] in rendered
        assert resource["url"] in rendered


def test_topic_directory_is_current_and_links_each_topic_to_its_sources(index):
    rendered = lookup.render_topic_lookup(index)
    assert lookup.TOPIC_LOOKUP_PATH.read_text(encoding="utf-8") == rendered
    for topic in index["topics"]:
        section = rendered.split(f"\n## {topic}\n", 1)[1].split("\n## ", 1)[0]
        for resource in index["resources"]:
            link = f"(theme-lookup.md#{resource['id']})"
            expected = any(topic in theme["topics"] for theme in resource["themes"])
            assert (link in section) == expected
            if expected:
                assert f"({resource['url']})" in section
    assert "not identical claims" in rendered
    assert "No claim-level redundancy percentage" in rendered


def test_overlap_separates_topic_similarity_from_shared_research():
    def resource(identifier, group, topics):
        return {
            "id": identifier, "group": group, "review_status": "reviewed",
            "themes": [{"topics": topics}],
        }

    minimal = {
        "resources": [
            resource("original", "catalog", ["shared", "old-only"]),
            resource("drop-a", "research-drop", ["shared", "new-only"]),
            resource("drop-b", "research-drop", ["shared"]),
        ],
        "study_families": [
            {"id": "family-a", "members": ["original", "drop-a", "drop-b"]},
            {"id": "family-b", "members": ["original", "drop-a"]},
            {"id": "new-family", "members": ["drop-a", "drop-b"]},
        ],
    }
    assert lookup.overlap(minimal) == {
        "shared_topics": ["shared"],
        "catalog_only_topics": ["old-only"],
        "research_drop_only_topics": ["new-only"],
        "shared_study_families": ["family-a", "family-b"],
        "drops_with_shared_study_families": ["drop-a", "drop-b"],
    }


def test_published_overlap_counts_are_recomputed_from_the_index(index):
    result = lookup.coverage(index)["overlap"]
    assert set(result["shared_topics"]) == set(index["topics"])
    assert not result["catalog_only_topics"]
    assert not result["research_drop_only_topics"]
    assert len(result["drops_with_shared_study_families"]) == 13
    assert len(result["shared_study_families"]) == 3


def test_repository_bundle_works_without_downloads_sharepoint_or_body_cache(tmp_path):
    bundle = tmp_path / "repository"
    scripts = bundle / "scripts"
    references = bundle / "skills/people-science-knowledge-vault/references"
    scripts.mkdir(parents=True)
    references.mkdir(parents=True)
    for name in ("search_knowledge_vault.py", "build_knowledge_vault_resources.py"):
        shutil.copyfile(ROOT / "scripts" / name, scripts / name)
    for name in (
        "catalog.json", "theme-index.json", "theme-lookup.md",
        "topic-lookup.md", "corpus-guide.md",
    ):
        shutil.copyfile(lookup.REFERENCES / name, references / name)
    for arguments in (
        ["--check"],
        ["--resource", "research-drop-4493933", "--json"],
        ["--topic", "privacy-confidentiality", "--json"],
    ):
        result = subprocess.run(
            [sys.executable, str(scripts / "search_knowledge_vault.py"), *arguments],
            cwd=tmp_path, capture_output=True, text=True,
        )
        assert result.returncode == 0, result.stderr


@pytest.mark.parametrize(
    ("arguments", "exit_code", "message"),
    [
        (["--resource", "research-drop-4493933", "--json"], 0, "research-drop-4493933:10"),
        (["--topic", "growth-development", "--json"], 0, "Growth and career opportunity"),
        (["--resource", "think-like-a-people-scientist-series-hub"], 2, "redirects"),
        (["--topic", "not-a-topic"], 2, "unknown topic"),
        (["--limit", "0", "AI"], 2, "positive"),
        (["--resource", "not-a-resource"], 2, "unknown resource"),
        (["--bodies-dir", "."], 2, "requires --check"),
        (["no-such-concept-957134"], 1, "No matching reviewed themes"),
    ],
)
def test_cli_outcomes_are_explicit(arguments, exit_code, message):
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts/search_knowledge_vault.py"), *arguments],
        capture_output=True, text=True, cwd=ROOT,
    )
    assert result.returncode == exit_code, result.stderr
    assert message in result.stdout + result.stderr
