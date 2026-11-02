"""Check public source bodies and evidence anchors; never count player pages as audio."""

from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import hashlib
import html
import io
import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

from search_knowledge_vault import INDEX_PATH, is_public_url, load_json, normalize

MAX_BYTES = 32 * 1024 * 1024
MIN_BODY_CHARS = 600


class PublicRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not is_public_url(newurl):
            raise ValueError("redirect target is not a registered public-source host")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def retrieve(url: str, timeout: int = 30) -> tuple[str, str, bytes]:
    if not is_public_url(url):
        raise ValueError("URL is not a registered public-source host")
    request = Request(url, headers={"User-Agent": "GlintLabs-KnowledgeVault-SourceCheck/1.0"})
    with build_opener(PublicRedirects()).open(request, timeout=timeout) as response:
        content = response.read(MAX_BYTES + 1)
        if len(content) > MAX_BYTES:
            raise ValueError("source exceeds 32 MiB; manual retrieval required")
        return response.url, response.headers.get("Content-Type", ""), content


class ArticleParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.text: list[str] = []
        self.scripts: list[str] = []
        self.script_parts: list[str] | None = None

    def handle_starttag(self, tag, attrs):
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input",
                       "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append(tag)
        if tag == "script" and dict(attrs).get("type") == "application/ld+json":
            self.script_parts = []

    def handle_endtag(self, tag):
        if tag == "script" and self.script_parts is not None:
            self.scripts.append("".join(self.script_parts))
            self.script_parts = None
        if tag in self.stack:
            position = len(self.stack) - 1 - self.stack[::-1].index(tag)
            del self.stack[position:]

    def handle_data(self, data):
        if self.script_parts is not None:
            self.script_parts.append(data)
        if (
            any(tag in self.stack for tag in ("main", "article"))
            and not any(tag in self.stack for tag in (
                "script", "style", "noscript", "nav", "aside", "header", "footer"
            ))
        ):
            self.text.append(data)


def article_text(content: bytes) -> str:
    parser = ArticleParser()
    parser.feed(content.decode("utf-8"))
    candidates = [" ".join(parser.text)]

    def collect(value):
        if isinstance(value, dict):
            types = value.get("@type", [])
            if isinstance(types, str):
                types = [types]
            if any(kind in types for kind in ("BlogPosting", "Article", "TechArticle")):
                # Community Hub publishes its complete written body in description.
                for field in ("articleBody", "description"):
                    body = value.get(field)
                    if isinstance(body, str) and len(body) >= MIN_BODY_CHARS:
                        candidates.append(body)
            for nested in value.values():
                collect(nested)
        elif isinstance(value, list):
            for nested in value:
                collect(nested)

    for script in parser.scripts:
        try:
            collect(json.loads(script))
        except json.JSONDecodeError as error:
            raise ValueError(f"invalid article metadata: {error.msg}") from error
    return html.unescape(html.unescape(max(candidates, key=len))).strip()


def pdf_text(content: bytes) -> str:
    try:
        from pypdf import PdfReader
        from pypdf.errors import PdfReadError
    except ImportError as error:
        raise ValueError(
            "PDF extraction unavailable; install requirements-knowledge-vault-checks.txt"
        ) from error
    try:
        return "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(content)).pages)
    except (PdfReadError, ValueError) as error:
        raise ValueError(f"PDF text extraction failed: {error}") from error


def check_resource(resource: dict, fetch=retrieve) -> dict:
    result = {"resource_id": resource["id"], "url": resource["url"]}
    if resource["review_status"] == "gap":
        return {**result, "status": "known-gap", "reason": resource["gap_reason"]}
    try:
        final_url, content_type, content = fetch(resource["url"])
        result["final_url"] = final_url
        result["response_sha256"] = hashlib.sha256(content).hexdigest()
        if final_url != resource["url"]:
            return {**result, "status": "content-gap", "reason": "canonical URL redirected; review required"}
        expected_format = resource["provenance"]["format"]
        if expected_format == "pdf":
            if not content.startswith(b"%PDF-"):
                raise ValueError("expected PDF bytes, received a different response")
            body = pdf_text(content)
        else:
            if "html" not in content_type.lower():
                raise ValueError("expected an HTML article response")
            body = article_text(content)
        if len(body) < MIN_BODY_CHARS:
            raise ValueError("no substantive article/PDF body extracted")
        normalized = normalize(body)
        missing = [
            theme["id"] for theme in resource["themes"]
            if not theme["evidence"]["locator"].startswith("s")
            and normalize(theme["evidence"]["anchor"]) not in normalized
        ]
        result.update({
            "body_characters": len(body),
            "body_sha256": hashlib.sha256(body.encode("utf-8")).hexdigest(),
            "missing_text_anchor_themes": missing,
        })
        if missing:
            return {**result, "status": "content-gap",
                    "reason": "text anchors absent; changed source or figure/manual review required"}
        return {**result, "status": "verified-text",
                "scope": "body and text-anchor presence only; no research, figure, or audio re-review"}
    except (OSError, ValueError, HTTPError, URLError) as error:
        return {**result, "status": "retrieval-error", "reason": str(error)}


def check_media(resource: dict, asset: dict, fetch=retrieve) -> dict:
    result = {"resource_id": resource["id"], "url": asset["url"]}
    try:
        final_url, content_type, content = fetch(asset["url"])
        if final_url != asset["url"] or "html" not in content_type.lower() or not content:
            raise ValueError("recording player response changed; review required")
        return {**result, "status": "player-page-only",
                "reason": "player reachable; playback, captions, transcript, and audio claims not verified"}
    except (OSError, ValueError, HTTPError, URLError) as error:
        return {**result, "status": "retrieval-error", "reason": str(error)}


def run_checks(index: dict, workers: int = 4, fetch=retrieve) -> dict:
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        resources = list(pool.map(lambda item: check_resource(item, fetch), index["resources"]))
        media_jobs = [
            (resource, asset) for resource in index["resources"]
            for asset in resource.get("additional_media", [])
        ]
        media = list(pool.map(lambda pair: check_media(*pair, fetch=fetch), media_jobs))
    failures = sum(
        item["status"] in {"retrieval-error", "content-gap"} for item in resources + media
    )
    return {
        "schema_version": 1,
        "checked_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "index_reviewed_at": index["reviewed_at"],
        "scope": "public body/text anchors and player-page reachability, not complete evidence re-review",
        "resources": resources,
        "media": media,
        "failures": failures,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--workers", type=int, choices=range(1, 9), default=4)
    args = parser.parse_args(argv)
    try:
        report = run_checks(load_json(INDEX_PATH), args.workers)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError, KeyError) as error:
        print(f"Source check failed: {error}", file=sys.stderr)
        return 1
    print(f"{len(report['resources'])} resources; {len(report['media'])} media pages; "
          f"{report['failures']} content/retrieval failures. Report: {args.output}")
    return 1 if report["failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
