"""Search reviewed themes; retrieve the linked full source before citing a claim."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

from build_knowledge_vault_resources import PRIORITY_TIER_GROUPS

ROOT = Path(__file__).resolve().parents[1]
REFERENCES = ROOT / "skills/people-science-knowledge-vault/references"
INDEX_PATH = REFERENCES / "theme-index.json"
LOOKUP_PATH = REFERENCES / "theme-lookup.md"
TOPIC_LOOKUP_PATH = REFERENCES / "topic-lookup.md"
CATALOG_PATH = REFERENCES / "catalog.json"
KINDS = {
    "framework", "finding", "recommendation", "method", "commentary",
    "hypothesis", "case-study", "documentation", "signpost",
}
PUBLIC_HOSTS = {
    "techcommunity.microsoft.com", "learn.microsoft.com",
    "adoption.microsoft.com", "www.microsoft.com",
    "cdn-dynmedia-1.microsoft.com", "medius.microsoft.com",
}
STOP_WORDS = {"a", "an", "and", "are", "for", "how", "in", "is", "of", "on", "the", "to", "with"}
ALIASES = {
    "burnout": "wellbeing", "well-being": "wellbeing", "wellness": "wellbeing",
    "manager": "manager-effectiveness", "managers": "manager-effectiveness",
    "agent": "ai-agents", "agents": "ai-agents", "skills": "ai-skills",
    "listening": "employee-listening", "attrition": "retention",
    "benchmark": "benchmarks", "safety": "psychological-safety",
    "purpose": "meaningful-work", "career": "growth-development",
    "confidential": "privacy-confidentiality",
}
PRIORITY_POLICY = (
    "Filter for relevance and applicability first. New-catalog Research Drops "
    "precede original vault resources. Within the original vault preserve "
    "top5/curated-equivalent > high > medium > low; within equal priority "
    "use relevance. Collection priority does not establish evidence quality, "
    "causality, or current product validity."
)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize(text: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", text).casefold().split())


def contains(text: str, term: str) -> bool:
    return re.search(r"(?<!\w)" + re.escape(term) + r"(?!\w)", text, re.IGNORECASE) is not None


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def catalog_digest(catalog: dict) -> str:
    public = [
        {key: entry[key] for key in ("id", "title", "url", "priority_tier")}
        for entry in catalog["entries"]
    ]
    return digest(json.dumps(public, sort_keys=True, ensure_ascii=True))


def priority_key(resource: dict) -> tuple[int, int]:
    return (
        0 if resource["group"] == "research-drop" else 1,
        PRIORITY_TIER_GROUPS.get(resource["priority_tier"], (5, ""))[0],
    )


def is_public_url(value: str) -> bool:
    url = urlparse(value)
    return (
        url.scheme == "https" and url.hostname in PUBLIC_HOSTS
        and not url.username and not url.password and not url.query
    )


def validate_index(index: dict, catalog: dict) -> list[str]:
    """Validate the curated routing data without pretending to re-fetch evidence."""
    issues = []
    if index.get("schema_version") != 1:
        issues.append("unsupported theme index schema")
    if index.get("catalog_sha256") != catalog_digest(catalog):
        issues.append("catalog changed: review theme coverage and priorities")
    if index.get("priority_policy") != PRIORITY_POLICY:
        issues.append("priority policy drift: review the collection-first ranking")
    catalog_by_id = {entry["id"]: entry for entry in catalog["entries"]}
    resources = index["resources"]
    ids = [r["id"] for r in resources]
    urls = [r["url"] for r in resources]
    if len(set(ids)) != len(ids) or len(set(urls)) != len(urls):
        issues.append("duplicate resource id or public URL")
    if {r["id"] for r in resources if r["group"] == "catalog"} != set(catalog_by_id):
        issues.append("theme inventory does not reconcile with the catalog")
    topics = set(index["topics"])
    families = {family["id"] for family in index["study_families"]}
    for family in index["study_families"]:
        if not set(family["members"]) <= set(ids):
            issues.append(f"{family['id']}: study family references unknown resources")
    for resource in resources:
        prefix = resource["id"]
        if resource["group"] not in {"catalog", "research-drop"}:
            issues.append(f"{prefix}: unknown resource group")
        for field in ("url", "catalog_url"):
            if field in resource and not is_public_url(resource[field]):
                issues.append(f"{prefix}: non-public {field}")
        if resource["group"] == "catalog":
            canonical = catalog_by_id.get(prefix)
            if canonical and any(
                resource[key] != canonical[key] for key in ("title", "priority_tier")
            ):
                issues.append(f"{prefix}: catalog title/priority drift")
            if canonical and resource["catalog_url"] != canonical["url"]:
                issues.append(f"{prefix}: catalog URL drift")
        elif resource["priority_tier"] is not None:
            issues.append(f"{prefix}: live-only publication has invented priority")
        if not set(resource["study_families"]) <= families:
            issues.append(f"{prefix}: unknown study family")
        reviewed = resource["review_status"] == "reviewed"
        if resource["review_status"] not in {"reviewed", "gap"}:
            issues.append(f"{prefix}: unknown review status")
        if len(resource["themes"]) != (10 if reviewed else 0):
            issues.append(f"{prefix}: reviewed resources need ten themes; gaps need zero")
        if not resource["context"] or not resource["asset_scope"]:
            issues.append(f"{prefix}: missing context or asset scope")
        if reviewed:
            evidence = resource["provenance"]
            if not all(
                re.fullmatch(r"[a-f0-9]{64}", evidence[key])
                for key in ("content_sha256", "extracted_text_sha256")
            ):
                issues.append(f"{prefix}: invalid provenance hash")
            if evidence["format"] not in {"html", "pdf"} or not evidence["retrieved_at"]:
                issues.append(f"{prefix}: incomplete retrieval provenance")
            if not re.fullmatch(r"[a-z0-9-]+\.json", evidence["cache_file"]):
                issues.append(f"{prefix}: cache file must be a public extraction basename")
        elif not resource.get("gap_reason"):
            issues.append(f"{prefix}: missing explicit gap reason")
        media = resource.get("additional_media", [])
        if len(media) > 1:
            issues.append(f"{prefix}: this schema supports one embedded webinar per resource")
        for asset in media:
            if (
                not is_public_url(asset["url"])
                or asset["review_status"] != "reviewed_machine_transcript"
                or not re.fullmatch(r"[a-z0-9-]+\.json", asset["cache_file"])
                or not re.fullmatch(r"[a-f0-9]{64}", asset["transcript_sha256"])
            ):
                issues.append(f"{prefix}: invalid public webinar provenance")
        labels = [normalize(theme["label"]) for theme in resource["themes"]]
        if len(set(labels)) != len(labels):
            issues.append(f"{prefix}: repeated themes")
        for number, theme in enumerate(resource["themes"], 1):
            evidence = theme["evidence"]
            if theme["id"] != f"{prefix}:{number:02}":
                issues.append(f"{prefix}: unstable theme identifier")
            if not theme["label"] or not theme["summary"] or theme["kind"] not in KINDS:
                issues.append(f"{prefix}: missing theme content or unknown kind")
            if not theme["topics"] or not set(theme["topics"]) <= topics:
                issues.append(f"{prefix}: unknown/missing topic")
            if (
                not re.fullmatch(r"(L|p|s)[1-9][0-9]*", evidence["locator"])
                or not evidence["anchor"] or len(evidence["anchor"]) > 160
                or not re.fullmatch(r"[a-f0-9]{64}", evidence["unit_sha256"])
            ):
                issues.append(f"{prefix}: invalid evidence locator, anchor, or hash")
            if evidence["locator"].startswith("s"):
                if (
                    not media or evidence.get("url") != media[0]["url"]
                    or not isinstance(evidence.get("start_seconds"), (int, float))
                    or evidence["start_seconds"] < 0
                ):
                    issues.append(f"{prefix}: transcript themes need reviewed audio and timestamps")
    serialized = json.dumps(index).casefold()
    if any(value in serialized for value in (
        "sharepoint.com/", "sharepoint-df.com/", "onedrive.live.com/",
        "internal_record", "c:\\\\",
    )):
        issues.append("private ownership/location metadata must not enter the theme index")
    return issues


def verify_bodies(index: dict, directory: Path) -> list[str]:
    """Recheck local extraction hashes and every anchor; no network or private files."""
    issues = []
    for resource in index["resources"]:
        if resource["review_status"] != "reviewed":
            continue
        path = directory / resource["provenance"]["cache_file"]
        try:
            source = load_json(path)
        except (OSError, ValueError) as error:
            issues.append(f"{resource['id']}: cannot read body cache: {error}")
            continue
        provenance = resource["provenance"]
        if (
            source.get("status") != "retrieved"
            or source["sha256"] != provenance["content_sha256"]
            or digest(source["body"]) != provenance["extracted_text_sha256"]
            or source["final_url"] != resource["url"]
        ):
            issues.append(f"{resource['id']}: body/provenance mismatch")
        if source.get("pages"):
            units = {f"p{page['page']}": page["text"] for page in source["pages"]}
        else:
            units = {
                f"L{i}": text.strip()
                for i, text in enumerate(
                    (line for line in source["body"].splitlines() if line.strip()), 1
                )
            }
        for media in resource.get("additional_media", []):
            try:
                transcript = load_json(directory / media["cache_file"])
                if (
                    transcript["url"] != media["url"]
                    or transcript["status"] != "machine_transcribed"
                    or digest(json.dumps(transcript["segments"], sort_keys=True)) != media["transcript_sha256"]
                ):
                    issues.append(f"{resource['id']}: transcript/provenance mismatch")
                units.update({
                    f"s{i}": segment["text"].strip()
                    for i, segment in enumerate(transcript["segments"], 1)
                })
                for theme in resource["themes"]:
                    evidence = theme["evidence"]
                    if evidence["locator"].startswith("s"):
                        segment = transcript["segments"][int(evidence["locator"][1:]) - 1]
                        if evidence["start_seconds"] != segment["start"]:
                            issues.append(f"{theme['id']}: transcript timestamp mismatch")
            except (OSError, ValueError, KeyError, IndexError) as error:
                issues.append(f"{resource['id']}: cannot verify transcript cache: {error}")
        for theme in resource["themes"]:
            evidence = theme["evidence"]
            text = units.get(evidence["locator"], "")
            if (
                normalize(evidence["anchor"]) not in normalize(text)
                or digest(text) != evidence["unit_sha256"]
            ):
                issues.append(f"{theme['id']}: anchor/locator no longer matches source")
    return issues


def overlap(index: dict) -> dict:
    """Describe shared tags and recorded study lineage, not duplicate claims."""
    resources = {
        r["id"]: r for r in index["resources"] if r["review_status"] == "reviewed"
    }
    topics = {
        group: {
            topic for r in resources.values() if r["group"] == group
            for theme in r["themes"] for topic in theme["topics"]
        }
        for group in ("catalog", "research-drop")
    }
    shared_families = []
    related_drops = set()
    for family in index["study_families"]:
        members = [resources[member] for member in family["members"] if member in resources]
        if {r["group"] for r in members} == {"catalog", "research-drop"}:
            shared_families.append(family["id"])
            related_drops.update(r["id"] for r in members if r["group"] == "research-drop")
    return {
        "shared_topics": sorted(topics["catalog"] & topics["research-drop"]),
        "catalog_only_topics": sorted(topics["catalog"] - topics["research-drop"]),
        "research_drop_only_topics": sorted(topics["research-drop"] - topics["catalog"]),
        "shared_study_families": sorted(shared_families),
        "drops_with_shared_study_families": sorted(related_drops),
    }


def coverage(index: dict) -> dict:
    counts = Counter(r["review_status"] for r in index["resources"])
    return {
        "resources": len(index["resources"]),
        "reviewed": counts["reviewed"],
        "gaps": [
            {"id": r["id"], "reason": r["gap_reason"]}
            for r in index["resources"] if r["review_status"] == "gap"
        ],
        "themes": sum(len(r["themes"]) for r in index["resources"]),
        "reviewed_webinars": sum(len(r.get("additional_media", [])) for r in index["resources"]),
        "topics": len(index["topics"]),
        "collections": {
            group: {
                "resources": sum(r["group"] == group for r in index["resources"]),
                "reviewed": sum(
                    r["group"] == group and r["review_status"] == "reviewed"
                    for r in index["resources"]
                ),
                "themes": sum(
                    len(r["themes"]) for r in index["resources"] if r["group"] == group
                ),
            }
            for group in ("research-drop", "catalog")
        },
        "priority_policy": index["priority_policy"],
        "overlap": overlap(index),
        "scope": index["scope"],
    }


def search(index: dict, query: str = "", *, topic: str | None = None,
           kind: str | None = None, group: str | None = None,
           resource_id: str | None = None) -> list[dict]:
    terms = [term for term in re.findall(r"[\w-]+", normalize(query)) if term not in STOP_WORDS]
    if query and not terms:
        raise ValueError("query must contain a searchable concept, not only stop words")
    results = []
    for resource in index["resources"]:
        if resource["review_status"] != "reviewed":
            continue
        if group and resource["group"] != group:
            continue
        if resource_id and resource["id"] != resource_id:
            continue
        matching = []
        found_terms = set()
        for theme in resource["themes"]:
            if topic and topic not in theme["topics"] or kind and kind != theme["kind"]:
                continue
            label = normalize(theme["label"])
            body = normalize(theme["summary"])
            tags = " ".join(theme["topics"])
            title = normalize(resource["title"])
            hits = {
                term for term in terms
                if contains(label, term) or contains(body, term) or contains(title, term)
                or contains(tags, ALIASES.get(term, term))
            }
            found_terms |= hits
            score = sum(
                4 * contains(label, term) + 2 * contains(body, term)
                + contains(title, term) + contains(tags, ALIASES.get(term, term))
                for term in hits
            )
            if not terms or hits:
                matching.append({**theme, "score": score})
        if not matching or len(found_terms) != len(set(terms)):
            continue
        matching.sort(key=lambda t: (-t["score"], t["id"]))
        results.append({
            "id": resource["id"], "title": resource["title"], "url": resource["url"],
            "group": resource["group"], "priority_tier": resource["priority_tier"],
            "context": resource["context"], "asset_scope": resource["asset_scope"],
            "study_families": resource["study_families"], "themes": matching,
            "score": sum(theme["score"] for theme in matching),
        })
    # Collection precedence wraps, rather than replaces, the original tier order.
    results.sort(key=lambda r: (
        *priority_key(r),
        -r["score"], r["id"],
    ))
    return results


def render_lookup(index: dict) -> str:
    counts = coverage(index)
    resources = sorted(index["resources"], key=lambda r: (*priority_key(r), r["title"]))
    lines = [
        "# Reviewed People Science theme lookup", "",
        "Start with the [corpus guide](corpus-guide.md) or "
        "[topic-first directory](topic-lookup.md); this file preserves "
        "the individual source profiles.", "",
        f"**{counts['reviewed']} reviewed resources; {counts['themes']} themes; "
        f"{len(counts['gaps'])} explicit gap.**", "",
        f"**Reviewed companion webinar audio:** {counts['reviewed_webinars']} recordings "
        "(machine transcripts; visual-only content not certified).", "",
        index["scope"], "",
        "**Source priority:** " + index["priority_policy"], "",
        "Editorial routing summaries, not statistical topic-model results or a "
        "replacement for full-source retrieval. Ten themes need not be ten empirical "
        "findings: kinds distinguish guidance, methods, documentation, and signposts. "
        "Related publications are not automatically independent studies.", "",
        "Generated from `theme-index.json` by "
        "`python scripts/search_knowledge_vault.py --write-reference`.", "",
        "## Topics", "",
    ]
    for topic, label in index["topics"].items():
        count = sum(topic in theme["topics"] for r in index["resources"] for theme in r["themes"])
        lines.append(f"- [`{topic}`](topic-lookup.md#{topic}) - {label} ({count} themes)")
    lines.extend(["", "## Resource directory", ""])
    for resource in resources:
        priority = (
            "new catalog - first collection"
            if resource["group"] == "research-drop"
            else f"original vault - {resource['priority_tier']}"
        )
        lines.append(f"- [{resource['title']}](#{resource['id']}) ({priority})")
    for resource in resources:
        lines.extend([
            "", f"<a id=\"{resource['id']}\"></a>", f"## {resource['title']}", "",
            f"`{resource['id']}` | {resource['group']} | {resource['review_status']}", "",
            "**Priority:** " + (
                "New catalog; before relevant original-vault resources."
                if resource["group"] == "research-drop"
                else f"Original vault; retained tier `{resource['priority_tier']}`."
            ), "",
            f"**Source:** {resource['url']}", "", resource["context"], "",
            f"**Reviewed asset scope:** {resource['asset_scope']}", "",
        ])
        if resource["study_families"]:
            lines.extend(["**Study-family links:** " + ", ".join(resource["study_families"]), ""])
        for media in resource.get("additional_media", []):
            lines.extend([
                f"**Reviewed webinar audio:** {media['url']} "
                "(local machine transcript; visual-only content not certified).", "",
            ])
        if resource["review_status"] == "gap":
            lines.extend([f"**Gap:** {resource['gap_reason']}", ""])
        for number, theme in enumerate(resource["themes"], 1):
            evidence = theme["evidence"]
            media_note = (
                f" at {evidence['start_seconds']:.1f}s, [recording]({evidence['url']})"
                if evidence["locator"].startswith("s") else ""
            )
            lines.extend([
                f"{number}. **{theme['label']}** ({theme['kind']}) - {theme['summary']}",
                f"   Topics: {', '.join(theme['topics'])}. "
                f"Evidence: `{evidence['locator']}`{media_note}, \"{evidence['anchor']}\".",
            ])
    lines.extend(["", "## Evidence and refresh boundaries", ""])
    lines.extend(f"- {note}" for note in index["limitations"])
    lines.extend(["", "## Shared study families", ""])
    for family in index["study_families"]:
        lines.extend([f"### {family['id']}", "", family["description"], ""])
    return "\n".join(lines).rstrip() + "\n"


def render_topic_lookup(index: dict) -> str:
    counts = coverage(index)
    shared = counts["overlap"]
    resources = sorted(
        (r for r in index["resources"] if r["review_status"] == "reviewed"),
        key=lambda r: (*priority_key(r), r["title"]),
    )
    lines = [
        "# People Science topic-first directory", "",
        f"Reviewed {index['reviewed_at']}. "
        f"**{counts['topics']} topics; {counts['reviewed']} reviewed resources; "
        f"{counts['themes']} source-level summaries.**", "",
        "Browse concepts here instead of treating every source summary as a "
        "different idea. Read the [corpus guide](corpus-guide.md) for grouping, "
        "eligibility, coverage gaps, and evidence limits.", "",
        f"**Overlap:** {len(shared['shared_topics'])} topic tags occur in both "
        f"collections; {len(shared['drops_with_shared_study_families'])} of "
        f"{counts['collections']['research-drop']['reviewed']} reviewed Drops "
        "link to study families also represented in the original vault. "
        "Shared tags are not identical claims, and shared studies can support "
        "different analyses. No claim-level redundancy percentage is certified.", "",
        "**Source priority:** " + index["priority_policy"], "",
        "Theme counts are nonexclusive: one summary can carry several topic tags. "
        "Resource order within a collection is for browsing, not a relevance score. "
        "Source-profile links open the reviewed summaries; public-source links "
        "open the original publication.", "",
        "## Topics", "",
    ]
    lines.extend(f"- [{label}](#{topic})" for topic, label in index["topics"].items())
    for topic, label in index["topics"].items():
        lines.extend(["", f"## {topic}", "", label, ""])
        for group, heading in (
            ("research-drop", "New Research Drops"),
            ("catalog", "Original vault"),
        ):
            matches = [
                (r, sum(topic in theme["topics"] for theme in r["themes"]))
                for r in resources if r["group"] == group
            ]
            matches = [(r, count) for r, count in matches if count]
            resource_label = "resource" if len(matches) == 1 else "resources"
            theme_count = sum(count for _, count in matches)
            theme_label = "summary" if theme_count == 1 else "summaries"
            lines.extend([
                f"### {heading}", "",
                f"{len(matches)} {resource_label}; {theme_count} "
                f"tagged {theme_label}.", "",
            ])
            for resource, count in matches:
                label_count = "summary" if count == 1 else "summaries"
                lines.append(
                    f"- [{resource['title']}](theme-lookup.md#{resource['id']}) "
                    f"({count} {label_count}); [public source]({resource['url']})."
                )
            lines.append("")
    lines.extend([
        "", "## Shared research lineage", "",
        "These registered families span both collections. Do not count their "
        "publications as independent replications:", "",
    ])
    for family in index["study_families"]:
        if family["id"] in shared["shared_study_families"]:
            lines.extend([f"### {family['id']}", "", family["description"], ""])
    return "\n".join(lines).rstrip() + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query", nargs="?", default="")
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--resource", help="return all ten themes for one resource ID")
    modes.add_argument("--coverage", action="store_true")
    modes.add_argument("--topics", action="store_true")
    modes.add_argument("--check", action="store_true")
    modes.add_argument("--write-reference", action="store_true")
    parser.add_argument("--topic")
    parser.add_argument("--kind", choices=sorted(KINDS))
    parser.add_argument("--group", choices=["catalog", "research-drop"])
    parser.add_argument("--limit", type=int, default=5, help="maximum resources, not themes")
    parser.add_argument("--json", action="store_true", dest="as_json")
    parser.add_argument("--bodies-dir", type=Path, help="with --check, verify cached public bodies")
    args = parser.parse_args(argv)
    if args.limit < 1:
        parser.error("--limit must be positive")
    if args.bodies_dir and not args.check:
        parser.error("--bodies-dir requires --check")
    special = args.coverage or args.topics or args.check or args.write_reference or args.resource
    if special and (args.query or args.topic or args.kind or args.group):
        parser.error("resource/coverage/topics/check/write-reference cannot be combined with search filters")
    if not special and not (args.query or args.topic or args.kind or args.group):
        parser.error("provide a query, filter, --resource, --topics, or --coverage")
    try:
        index = load_json(INDEX_PATH)
        issues = validate_index(index, load_json(CATALOG_PATH))
        if args.bodies_dir:
            issues.extend(verify_bodies(index, args.bodies_dir))
        if issues:
            raise ValueError("\n".join(issues))
        if args.topic and args.topic not in index["topics"]:
            parser.error(f"unknown topic {args.topic!r}; use --topics")
        if args.check or args.write_reference:
            for path, rendered in (
                (LOOKUP_PATH, render_lookup(index)),
                (TOPIC_LOOKUP_PATH, render_topic_lookup(index)),
            ):
                if args.write_reference:
                    path.write_text(rendered, encoding="utf-8")
                elif not path.exists() or path.read_text(encoding="utf-8") != rendered:
                    raise ValueError(f"{path.name} is stale; run --write-reference")
            print("Theme index validated" + ("; all source anchors verified" if args.bodies_dir else ""))
            return 0
        if args.coverage:
            result = coverage(index)
        elif args.topics:
            result = {
                topic: {"label": label, "themes": sum(
                    topic in theme["topics"] for r in index["resources"] for theme in r["themes"]
                )}
                for topic, label in index["topics"].items()
            }
        else:
            if args.resource:
                resource = next((r for r in index["resources"] if r["id"] == args.resource), None)
                if not resource:
                    parser.error(f"unknown resource {args.resource!r}")
                if resource["review_status"] == "gap":
                    raise ValueError(f"{resource['id']}: {resource['gap_reason']}")
            result = search(
                index, args.query, topic=args.topic, kind=args.kind, group=args.group,
                resource_id=args.resource,
            )[:args.limit]
            if not result:
                print("No matching reviewed themes.", file=sys.stderr)
                return 1
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"Knowledge vault lookup error: {error}", file=sys.stderr)
        return 2
    if args.as_json or args.coverage or args.topics:
        print(json.dumps(result, ensure_ascii=True, indent=2))
    else:
        for resource in result:
            print(f"\n{resource['title']} [{resource['id']}]")
            print(resource["url"])
            print(f"Context: {resource['context']}")
            for theme in resource["themes"]:
                print(f"  {theme['id']} | {theme['label']} ({theme['kind']})")
                print(f"    {theme['summary']}")
                print(f"    Evidence: {theme['evidence']['locator']} | {theme['evidence']['anchor']}")
                if theme["evidence"]["locator"].startswith("s"):
                    print(f"    Recording: {theme['evidence']['url']} at {theme['evidence']['start_seconds']:.1f}s")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    raise SystemExit(main())
