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


def test_required_workflows_are_reachable_from_skill_and_public_context():
    skill = context_check.SKILL_PATH.read_text(encoding="utf-8")
    entry = lookup.render_web_context(lookup.load_json(lookup.INDEX_PATH))["README.md"]
    for name in context_check.RUNTIME_GUIDES:
        assert f"(references/{name})" in skill
        assert f"({lookup.RAW_BASE}/{name})" in entry
        context_check.validate_links(lookup.REFERENCES / name)


def test_reference_gate_requires_complete_guidance_before_substantive_work():
    skill = context_check.SKILL_PATH.read_text(encoding="utf-8")
    gate = " ".join(
        skill.split("## Required-reference gate", 1)[1].split("\n## ", 1)[0].split()
    )
    for name in ("README.md", "source-priority.md", "public-use.md"):
        assert f"`references/{name}`" in gate
    assert "task's required workflows from the routing table" in gate
    assert "complete readable bodies" in gate
    assert "stop the affected substantive workflow" in gate
    assert "Do not bypass the gate with model memory" in gate
    assert "verified visible facts" in gate
    for name in context_check.RUNTIME_GUIDES:
        body = (lookup.REFERENCES / name).read_text(encoding="utf-8")
        assert "(../SKILL.md#required-reference-gate)" in body


def test_reference_reuse_requires_retained_content_not_a_loaded_summary():
    skill = " ".join(context_check.SKILL_PATH.read_text(encoding="utf-8").split())
    assert "Reuse complete same-ref bodies while they remain available in context" in skill
    assert "On task changes, load newly required files" in skill
    assert "after lost context, compaction, or revision changes" in skill
    assert 'A summary saying "loaded" is not the body' in skill
    assert "Do not repeatedly fetch unchanged, available files" in skill


def test_controlled_host_guidance_does_not_promise_portable_enforcement():
    public_use = " ".join(
        (lookup.REFERENCES / "public-use.md").read_text(encoding="utf-8").split()
    )
    assert "guidance for integrators, not an implemented runtime" in public_use
    assert "Preload their full validated bodies into the model context" in public_use
    assert "block the affected workflow when required content is unavailable" in public_use
    assert "does not guarantee correct model behavior" in public_use


@pytest.mark.parametrize("name", context_check.RUNTIME_GUIDES)
@pytest.mark.parametrize("failure", ["missing", "oversized"])
def test_runtime_workflows_cannot_be_omitted_or_outgrow_retrieval_budget(
    tmp_path, name, failure
):
    root = tmp_path / "repository"
    context = root / "skills/people-science-knowledge-vault/references"
    shutil.copytree(lookup.REFERENCES, context)
    shutil.copyfile(context_check.SKILL_PATH, context.parent / "SKILL.md")
    path = context / name
    if failure == "missing":
        path.unlink()
        message = "missing/unregistered files"
    else:
        path.write_text("x" * (context_check.MAX_PAGE_BYTES + 1), encoding="utf-8")
        message = f"{name}: exceeds small-page retrieval budget"
    with pytest.raises(ValueError, match=message):
        context_check.validate_context(context, root)


def test_registering_workflows_does_not_allow_arbitrary_public_context(tmp_path):
    root = tmp_path / "repository"
    context = root / "skills/people-science-knowledge-vault/references"
    shutil.copytree(lookup.REFERENCES, context)
    shutil.copyfile(context_check.SKILL_PATH, context.parent / "SKILL.md")
    (context / "unreviewed.md").write_text("Unregistered content", encoding="utf-8")
    with pytest.raises(ValueError, match="missing/unregistered files"):
        context_check.validate_context(context, root)


def test_runtime_workflow_symlink_is_rejected_before_reading_its_body(monkeypatch):
    guide = lookup.REFERENCES / context_check.RUNTIME_GUIDES[0]
    original_is_symlink = Path.is_symlink
    original_read_bytes = Path.read_bytes

    def guarded_read(path):
        assert path != guide, "runtime workflow body read before checking symlinks"
        return original_read_bytes(path)

    monkeypatch.setattr(
        Path, "is_symlink", lambda path: path == guide or original_is_symlink(path)
    )
    monkeypatch.setattr(Path, "read_bytes", guarded_read)
    with pytest.raises(ValueError, match="context cannot contain symlinks"):
        context_check.validate_context()


def test_results_contract_requires_research_and_conditional_brief_followups():
    skill = " ".join(context_check.SKILL_PATH.read_text(encoding="utf-8").split())
    results = " ".join(
        (lookup.REFERENCES / "results-exploration.md").read_text(encoding="utf-8").split()
    )
    research = " ".join(
        (lookup.REFERENCES / "research-workflow.md").read_text(encoding="utf-8").split()
    )
    assert "Substantive results interpretation requires research retrieval." in skill
    assert "Research must influence which uncertainty to investigate" in results
    assert "full original public body before supporting a claim" in research
    assert "Ask one brief, specific request at a time" in results
    assert "Stop when another screenshot would not materially change" in results
    assert "end your response with 1-3" not in skill + research + results


def test_screenshot_routing_preserves_artifact_qa_without_manifest_intake():
    vault = context_check.SKILL_PATH.read_text(encoding="utf-8")
    analysis = (ROOT / "skills/analyze-survey/SKILL.md").read_text(encoding="utf-8")
    handoff = " ".join(
        (ROOT / "skills/analyze-survey/references/interpretation.md")
        .read_text(encoding="utf-8").split()
    )
    assert "screenshots" in vault and "analyze-survey" in vault
    assert "../people-science-knowledge-vault/SKILL.md" in analysis
    assert "Do not require a manifest merely to discuss a screen" in handoff
    assert "reuse established QA" in (
        lookup.REFERENCES / "results-exploration.md"
    ).read_text(encoding="utf-8")
    assert "Apply the **Analysis QA** gate" in handoff


def test_context_is_colocated_with_the_skill_not_a_root_level_library():
    assert lookup.REFERENCES == context_check.SKILL_PATH.parent / "references"
    assert lookup.RAW_BASE.endswith("/skills/people-science-knowledge-vault/references")
    assert not (ROOT / "context" / "people-science-knowledge-vault").exists()
