"""Link-only context traversal, permission gates, and actual-content checks."""

import hashlib
import json
import shutil
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import check_knowledge_vault_context as context_check
import check_knowledge_vault_sources as live
import search_knowledge_vault as lookup


def test_link_entry_reaches_all_topics_and_sources_in_small_public_pages():
    context_check.validate_context()
    index = lookup.load_json(lookup.INDEX_PATH)
    pages = lookup.render_web_context(index)
    assert len(pages) == 1 + len(index["topics"]) + len(index["resources"])
    assert all(len(body.encode("utf-8")) <= context_check.MAX_PAGE_BYTES for body in pages.values())
    entry = pages["README.md"]
    reached = set()
    for topic in index["topics"]:
        assert f"{lookup.RAW_BASE}/topics/{topic}.md" in entry
        topic_page = pages[f"topics/{topic}.md"]
        for resource in index["resources"]:
            link = f"{lookup.RAW_BASE}/sources/{resource['id']}.md"
            expected = any(topic in theme["topics"] for theme in resource["themes"])
            assert (link in topic_page) == expected
            if expected:
                reached.add(resource["id"])
                profile = pages[f"sources/{resource['id']}.md"]
                assert resource["url"] in profile
                assert resource["context"] in profile
                assert resource["asset_scope"] in profile
                for theme in resource["themes"]:
                    assert theme["summary"] in profile
    assert reached == {r["id"] for r in index["resources"] if r["review_status"] == "reviewed"}
    assert "think-like-a-people-scientist-series-hub.md" in entry
    catalog = lookup.load_json(lookup.CATALOG_PATH)
    assert all("internal_record" not in entry and "notes" not in entry for entry in catalog["entries"])


def test_private_locations_and_missing_links_block_context_checks(tmp_path):
    root = tmp_path / "repository"
    context = root / "skills/people-science-knowledge-vault/references"
    shutil.copytree(lookup.REFERENCES, context)
    skill = root / "skills/people-science-knowledge-vault/SKILL.md"
    shutil.copyfile(context_check.SKILL_PATH, skill)
    path = context / "public-use.md"
    original = path.read_text(encoding="utf-8")
    path.write_text(original + "\nhttps://example.sharepoint.com/private\n", encoding="utf-8")
    with pytest.raises(ValueError, match="private ownership"):
        context_check.validate_context(context, root)
    path.write_text(original + "\n[Missing](not-shipped.md)\n", encoding="utf-8")
    with pytest.raises(ValueError, match="missing repository link"):
        context_check.validate_context(context, root)
    path.write_text("```markdown\n[Example](URL)\n```\n", encoding="utf-8")
    context_check.validate_links(path, root)


def media_fixture(tmp_path):
    index = lookup.load_json(lookup.INDEX_PATH)
    manifest = lookup.load_json(lookup.REFERENCES / "media-alternatives.json")
    resource = next(item for item in index["resources"] if item.get("additional_media"))
    source = resource["additional_media"][0]["url"]
    # Synthetic text and grant metadata test the gate, not real redistribution rights.
    content = f"Synthetic test attribution: {source}\nSynthetic audio-only excerpt.\n".encode()
    path = "media/synthetic-test.txt"
    target = tmp_path / path
    target.parent.mkdir(parents=True)
    target.write_bytes(content)
    asset = {
        "resource_id": resource["id"], "source_url": source,
        "permission_url": "https://www.microsoft.com/example-permission",
        "permission_summary": "Synthetic test grant permits redistribution of this test excerpt.",
        "redistribution_verified": True,
        "permission_reviewed_at": "2026-11-02", "text_reviewed_at": "2026-11-02",
        "coverage": "bounded-audio-excerpt", "coverage_notes": "Synthetic excerpt, not full audio.",
        "path": path, "sha256": hashlib.sha256(content).hexdigest(),
    }
    manifest["gaps"] = [gap for gap in manifest["gaps"] if gap["resource_id"] != resource["id"]]
    manifest["approved"] = [asset]
    return index, manifest, asset, content


def test_only_rights_reviewed_attributed_hash_matched_text_can_ship(tmp_path):
    index, manifest, asset, content = media_fixture(tmp_path)
    assert context_check.validate_media(tmp_path, index, manifest) == {tmp_path / asset["path"]}
    asset["redistribution_verified"] = False
    with pytest.raises(ValueError, match="redistribution permission"):
        context_check.validate_media(tmp_path, index, manifest)
    asset["redistribution_verified"] = True
    asset["permission_summary"] = ""
    with pytest.raises(ValueError, match="redistribution permission"):
        context_check.validate_media(tmp_path, index, manifest)
    asset["permission_summary"] = "Synthetic test redistribution permission with bounded scope."
    asset["sha256"] = "0" * 64
    with pytest.raises(ValueError, match="hash mismatch"):
        context_check.validate_media(tmp_path, index, manifest)
    asset["path"] = "../outside.txt"
    with pytest.raises(ValueError, match="invalid hosted text path"):
        context_check.validate_media(tmp_path, index, manifest)


def test_every_recording_has_an_explicit_permission_gap_or_text():
    manifest = lookup.load_json(lookup.REFERENCES / "media-alternatives.json")
    assert context_check.validate_media(lookup.REFERENCES, lookup.load_json(lookup.INDEX_PATH), manifest) == set()
    manifest["gaps"].pop()
    with pytest.raises(ValueError, match="every registered recording"):
        context_check.validate_media(lookup.REFERENCES, lookup.load_json(lookup.INDEX_PATH), manifest)


def sample_resource():
    return {
        "id": "test-article", "review_status": "reviewed",
        "url": "https://learn.microsoft.com/en-us/viva/glint/test",
        "provenance": {"format": "html"},
        "themes": [{"id": "test-article:01", "evidence": {"locator": "L1", "anchor": "actual evidence"}}],
    }


def test_http_success_with_wrong_or_empty_content_is_not_evidence():
    resource = sample_resource()
    wrong = ("<main>" + "Unrelated landing-page material. " * 40 + "</main>").encode()
    response = lambda url: (url, "text/html", wrong)
    result = live.check_resource(resource, response)
    assert result["status"] == "content-gap"
    assert result["missing_text_anchor_themes"] == ["test-article:01"]
    empty = lambda url: (url, "text/html", b"<title>Article preview only</title>")
    assert live.check_resource(resource, empty)["status"] == "retrieval-error"
    redirect = lambda url: ("https://adoption.microsoft.com/en-us/viva/", "text/html", wrong)
    assert live.check_resource(resource, redirect)["status"] == "content-gap"


def test_article_body_and_jsonld_evidence_are_extracted_not_scripts_or_navigation():
    body = "Actual evidence and useful source context. " * 30
    metadata = json.dumps({"@type": "BlogPosting", "description": body})
    page = (
        '<nav>not article evidence</nav><script type="application/ld+json">'
        + metadata + "</script>"
    ).encode()
    assert live.article_text(page) == body.strip()
    result = live.check_resource(sample_resource(), lambda url: (url, "text/html", page))
    assert result["status"] == "verified-text"
    assert "body" not in result
    assert live.article_text(b"<main>Body<nav>Navigation</nav><script>Script</script></main>") == "Body"


def test_pdf_content_and_extraction_are_required(monkeypatch):
    resource = sample_resource()
    resource["provenance"]["format"] = "pdf"
    monkeypatch.setattr(live, "pdf_text", lambda content: "Actual evidence. " * 60)
    response = lambda url: (url, "application/pdf", b"%PDF-synthetic-test")
    assert live.check_resource(resource, response)["status"] == "verified-text"
    response = lambda url: (url, "text/html", b"<main>Not a PDF</main>")
    assert live.check_resource(resource, response)["status"] == "retrieval-error"


def test_player_pages_and_recorded_gaps_never_count_as_verified_evidence():
    resource = sample_resource()
    asset = {"url": "https://medius.microsoft.com/Embed/video-nc/test"}
    response = lambda url: (url, "text/html", b"<main>Video player</main>")
    assert live.check_media(resource, asset, response)["status"] == "player-page-only"
    resource.update({"review_status": "gap", "gap_reason": "Recorded unavailable directory"})
    assert live.check_resource(resource, lambda url: pytest.fail("known gap must not be fetched"))["status"] == "known-gap"
    resource = sample_resource()
    resource["additional_media"] = [asset]
    report = live.run_checks({"resources": [resource], "reviewed_at": "2026-10-30"}, fetch=response)
    assert report["failures"] == 1
    assert report["media"][0]["status"] == "player-page-only"


def test_runtime_no_longer_requests_workbook_refresh():
    source_priority = (lookup.REFERENCES / "source-priority.md").read_text(encoding="utf-8")
    assert "workbook-schema.json" not in source_priority
    assert "sharepoint-df.com" not in source_priority
    assert not (lookup.REFERENCES / "workbook-schema.json").exists()
    assert (ROOT / "references/maintenance/knowledge-vault/workbook-schema.json").is_file()


def test_shared_skill_link_requires_no_local_installation_and_preserves_ref():
    skill = context_check.SKILL_PATH.read_text(encoding="utf-8")
    assert f"{lookup.RAW_BASE}/README.md" in skill
    assert "Do not ask users to download a ZIP" in skill
    assert "same ref" in skill
    assert "rather than a stale" in skill
    assert "not native skill registration" in skill
    assert not (context_check.SKILL_PATH.parent / "bundle.json").exists()


def test_context_is_colocated_with_the_skill_not_a_root_level_library():
    assert lookup.REFERENCES == context_check.SKILL_PATH.parent / "references"
    assert lookup.RAW_BASE.endswith("/skills/people-science-knowledge-vault/references")
    assert not (ROOT / "context" / "people-science-knowledge-vault").exists()
