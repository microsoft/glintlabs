"""Public bundle completeness, permission gates, and actual-content checks."""

import hashlib
import json
import shutil
import sys
import zipfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_knowledge_vault_bundle as bundle
import check_knowledge_vault_sources as live
import search_knowledge_vault as lookup


def test_standalone_zip_is_complete_public_and_reproducible(tmp_path):
    first = bundle.build(tmp_path / "first")
    second = bundle.build(tmp_path / "second")
    assert first.read_bytes() == second.read_bytes()
    with zipfile.ZipFile(first) as archive:
        archive.extractall(tmp_path / "installed")
    installed = tmp_path / "installed" / "people-science-knowledge-vault"
    metadata = lookup.load_json(installed / "bundle.json")
    for filename, expected in metadata["files"].items():
        assert hashlib.sha256((installed / filename).read_bytes()).hexdigest() == expected
    catalog = lookup.load_json(installed / "references/catalog.json")
    index = lookup.load_json(installed / "references/theme-index.json")
    assert lookup.validate_index(index, catalog) == []
    assert lookup.search(index, "manager burnout")
    assert lookup.coverage(index)["themes"] == 550
    assert not list(installed.rglob("*snapshot*"))
    assert not list(installed.rglob("*workbook*"))
    assert all("internal_record" not in entry and "notes" not in entry for entry in catalog["entries"])
    assert (installed / "references/public-use.md").is_file()
    assert (installed / "references/topic-lookup.md").is_file()
    assert (installed / "LICENSE").is_file()
    bundle.validate_links(bundle.bundle_files())
    bundle.validate_links({"example.md": b"```markdown\n[Example](URL)\n```\n"})


def test_changed_payload_cannot_overwrite_same_version(tmp_path):
    skill = tmp_path / "skill"
    shutil.copytree(bundle.SKILL, skill)
    path = bundle.build(tmp_path / "dist", skill)
    original = path.read_bytes()
    with (skill / "SKILL.md").open("a", encoding="utf-8") as output:
        output.write("\nChanged public instructions.\n")
    with pytest.raises(ValueError, match="new version"):
        bundle.build(tmp_path / "dist", skill)
    assert path.read_bytes() == original


def test_private_locations_and_missing_references_block_packaging(tmp_path):
    skill = tmp_path / "skill"
    shutil.copytree(bundle.SKILL, skill)
    path = skill / "references/public-use.md"
    original = path.read_text(encoding="utf-8")
    path.write_text(original + "\nhttps://example.sharepoint.com/private\n", encoding="utf-8")
    with pytest.raises(ValueError, match="private ownership"):
        bundle.bundle_files(skill)
    path.write_text(original + "\n[Missing](not-shipped.md)\n", encoding="utf-8")
    with pytest.raises(ValueError, match="missing bundled link"):
        bundle.bundle_files(skill)


def media_fixture(tmp_path):
    index = lookup.load_json(lookup.INDEX_PATH)
    manifest = lookup.load_json(bundle.SKILL / "references/media-alternatives.json")
    resource = next(item for item in index["resources"] if item.get("additional_media"))
    source = resource["additional_media"][0]["url"]
    # Synthetic text and grant metadata test the gate, not real redistribution rights.
    content = f"Synthetic test attribution: {source}\nSynthetic audio-only excerpt.\n".encode()
    path = "references/media/synthetic-test.txt"
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
    assert bundle.validate_media(tmp_path, index, manifest) == {asset["path"]: content}
    asset["redistribution_verified"] = False
    with pytest.raises(ValueError, match="redistribution permission"):
        bundle.validate_media(tmp_path, index, manifest)
    asset["redistribution_verified"] = True
    asset["permission_summary"] = ""
    with pytest.raises(ValueError, match="redistribution permission"):
        bundle.validate_media(tmp_path, index, manifest)
    asset["permission_summary"] = "Synthetic test redistribution permission with bounded scope."
    asset["sha256"] = "0" * 64
    with pytest.raises(ValueError, match="hash mismatch"):
        bundle.validate_media(tmp_path, index, manifest)
    asset["path"] = "../outside.txt"
    with pytest.raises(ValueError, match="invalid bundled text path"):
        bundle.validate_media(tmp_path, index, manifest)


def test_every_recording_has_an_explicit_permission_gap_or_text():
    manifest = lookup.load_json(bundle.SKILL / "references/media-alternatives.json")
    assert bundle.validate_media(bundle.SKILL, lookup.load_json(lookup.INDEX_PATH), manifest) == {}
    manifest["gaps"].pop()
    with pytest.raises(ValueError, match="every registered recording"):
        bundle.validate_media(bundle.SKILL, lookup.load_json(lookup.INDEX_PATH), manifest)


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
    source_priority = (bundle.SKILL / "references/source-priority.md").read_text(encoding="utf-8")
    assert "workbook-schema.json" not in source_priority
    assert "sharepoint-df.com" not in source_priority
    assert not (bundle.SKILL / "references/workbook-schema.json").exists()
    assert (ROOT / "references/maintenance/knowledge-vault/workbook-schema.json").is_file()
