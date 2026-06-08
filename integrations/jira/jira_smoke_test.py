#!/usr/bin/env python3
"""Jira REST smoke test for local and CI integration checks."""

from __future__ import annotations

import argparse
import base64
import json
import os
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_JQL = "ORDER BY updated DESC"


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[no-untyped-def]
        return None


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def env_bool(name: str, default: bool = True) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() not in {"0", "false", "no", "off"}


def normalize_base_url(value: str) -> str:
    if not value:
        raise ValueError("JIRA_URL is required")
    if "://" not in value:
        value = f"https://{value}"
    return value.rstrip("/")


def auth_headers() -> dict[str, str]:
    mode = os.getenv("JIRA_AUTH_MODE", "bearer").strip().lower()
    token = os.getenv("JIRA_TOKEN", "").strip()
    username = os.getenv("JIRA_USERNAME", "").strip()

    if not token:
        raise ValueError("JIRA_TOKEN is required")

    if mode == "bearer":
        return {"Authorization": f"Bearer {token}"}

    if mode == "basic":
        if not username:
            raise ValueError("JIRA_USERNAME is required when JIRA_AUTH_MODE=basic")
        raw = f"{username}:{token}".encode("utf-8")
        encoded = base64.b64encode(raw).decode("ascii")
        return {"Authorization": f"Basic {encoded}"}

    raise ValueError("JIRA_AUTH_MODE must be either bearer or basic")


def ssl_context() -> ssl.SSLContext | None:
    if not env_bool("JIRA_VERIFY_SSL", True):
        return ssl._create_unverified_context()

    ca_bundle = os.getenv("JIRA_CA_BUNDLE", "").strip()
    if ca_bundle:
        return ssl.create_default_context(cafile=ca_bundle)

    return None


def request_json(
    base_url: str,
    path: str,
    headers: dict[str, str],
    *,
    method: str = "GET",
    payload: dict[str, Any] | None = None,
    timeout: int = 20,
) -> dict[str, Any]:
    url = urllib.parse.urljoin(f"{base_url}/", path.lstrip("/"))
    body = None
    request_headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        **headers,
    }

    if payload is not None:
        body = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(url, data=body, headers=request_headers, method=method)
    opener = urllib.request.build_opener(
        urllib.request.HTTPSHandler(context=ssl_context()),
        NoRedirectHandler,
    )
    with opener.open(req, timeout=timeout) as response:
        content = response.read().decode("utf-8")
        if not content:
            return {}
        return json.loads(content)


def print_kv(label: str, value: Any) -> None:
    print(f"{label}: {value if value not in (None, '') else '-'}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Jira connectivity and a sample JQL search.")
    parser.add_argument("--env-file", default="integrations/jira/.env", help="Optional .env file to load")
    parser.add_argument("--api-version", default=os.getenv("JIRA_API_VERSION") or "2", help="Jira REST API version")
    parser.add_argument("--jql", default=os.getenv("JIRA_SMOKE_JQL") or DEFAULT_JQL, help="JQL query to run")
    parser.add_argument("--project-key", default=os.getenv("JIRA_PROJECT_KEY", ""), help="Optional project key")
    parser.add_argument("--max-results", type=int, default=5, help="Maximum issues to fetch")
    args = parser.parse_args()

    load_dotenv(Path(args.env_file))

    try:
        base_url = normalize_base_url(os.getenv("JIRA_URL", "https://jira.turkcell.com.tr"))
        headers = auth_headers()
        api_prefix = f"/rest/api/{args.api_version}"
        jql = args.jql
        if args.project_key and jql == DEFAULT_JQL:
            jql = f"project = {args.project_key} ORDER BY updated DESC"

        print_kv("Jira URL", base_url)
        print_kv("Auth mode", os.getenv("JIRA_AUTH_MODE", "bearer"))

        server_info = request_json(base_url, f"{api_prefix}/serverInfo", headers)
        print_kv("Server title", server_info.get("serverTitle"))
        print_kv("Version", server_info.get("version"))
        print_kv("Deployment type", server_info.get("deploymentType"))

        me = request_json(base_url, f"{api_prefix}/myself", headers)
        print_kv("Authenticated user", me.get("displayName") or me.get("name"))
        print_kv("Account/user key", me.get("accountId") or me.get("key") or me.get("name"))

        search_payload = {
            "jql": jql,
            "maxResults": args.max_results,
            "fields": ["summary", "status", "assignee", "issuetype", "project", "updated"],
        }
        search = request_json(base_url, f"{api_prefix}/search", headers, method="POST", payload=search_payload)
        print_kv("JQL", jql)
        print_kv("Total matching issues", search.get("total"))

        for issue in search.get("issues", []):
            fields = issue.get("fields", {})
            status = (fields.get("status") or {}).get("name")
            issue_type = (fields.get("issuetype") or {}).get("name")
            assignee = (fields.get("assignee") or {}).get("displayName") or "Unassigned"
            summary = fields.get("summary")
            print(f"- {issue.get('key')} | {issue_type} | {status} | {assignee} | {summary}")

        print("Jira smoke test completed successfully.")
        return 0

    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        location = exc.headers.get("Location")
        if location:
            print(f"HTTP {exc.code} from Jira, redirect location: {location}", file=sys.stderr)
        else:
            print(f"HTTP {exc.code} from Jira: {detail[:1000]}", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"Could not reach Jira: {exc.reason}", file=sys.stderr)
        return 1
    except (ValueError, ssl.SSLError, json.JSONDecodeError) as exc:
        print(f"Jira smoke test failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
