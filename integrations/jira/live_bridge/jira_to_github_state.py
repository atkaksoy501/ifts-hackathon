#!/usr/bin/env python3
"""Poll Jira from the company PC and publish issue state to a GitHub branch."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_FIELDS = ["summary", "status", "assignee", "issuetype", "project", "priority", "updated", "created"]
DEFAULT_JQL = "updated >= -15m ORDER BY updated DESC"


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def github_token() -> str:
    token = env("GITHUB_TOKEN")
    if token:
        return token
    try:
        return subprocess.check_output(["gh", "auth", "token"], text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


def normalize_url(value: str) -> str:
    if "://" not in value:
        value = f"https://{value}"
    return value.rstrip("/")


def jira_auth_headers() -> dict[str, str]:
    mode = env("JIRA_AUTH_MODE", "bearer").lower()
    token = env("JIRA_TOKEN")
    username = env("JIRA_USERNAME")
    if not token:
        raise ValueError("JIRA_TOKEN is required")
    if mode == "bearer":
        return {"Authorization": f"Bearer {token}"}
    if mode == "basic":
        if not username:
            raise ValueError("JIRA_USERNAME is required when JIRA_AUTH_MODE=basic")
        encoded = base64.b64encode(f"{username}:{token}".encode("utf-8")).decode("ascii")
        return {"Authorization": f"Basic {encoded}"}
    raise ValueError("JIRA_AUTH_MODE must be bearer or basic")


def request_json(
    method: str,
    url: str,
    headers: dict[str, str],
    payload: dict[str, Any] | None = None,
    timeout: int = 30,
) -> dict[str, Any]:
    body = None
    request_headers = {"Accept": "application/json", "Content-Type": "application/json", **headers}
    if payload is not None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=request_headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def jira_search(jql: str, max_results: int) -> dict[str, Any]:
    base_url = normalize_url(env("JIRA_URL", "https://jira.turkcell.com.tr"))
    api_version = env("JIRA_API_VERSION", "2")
    url = f"{base_url}/rest/api/{api_version}/search"
    payload = {"jql": jql, "maxResults": max_results, "fields": DEFAULT_FIELDS}
    return request_json("POST", url, jira_auth_headers(), payload)


def normalize_issue(issue: dict[str, Any]) -> dict[str, Any]:
    fields = issue.get("fields", {})
    return {
        "key": issue.get("key"),
        "id": issue.get("id"),
        "summary": fields.get("summary"),
        "status": (fields.get("status") or {}).get("name"),
        "statusCategory": ((fields.get("status") or {}).get("statusCategory") or {}).get("name"),
        "assignee": (fields.get("assignee") or {}).get("displayName"),
        "issueType": (fields.get("issuetype") or {}).get("name"),
        "projectKey": ((fields.get("project") or {}).get("key")),
        "projectName": ((fields.get("project") or {}).get("name")),
        "priority": (fields.get("priority") or {}).get("name"),
        "created": fields.get("created"),
        "updated": fields.get("updated"),
    }


def build_state(jql: str, max_results: int) -> dict[str, Any]:
    search = jira_search(jql, max_results)
    issues = [normalize_issue(issue) for issue in search.get("issues", [])]
    return {
        "schemaVersion": 1,
        "source": "jira",
        "jql": jql,
        "total": search.get("total", 0),
        "fetchedAtEpochMs": int(time.time() * 1000),
        "issues": issues,
    }


def stable_hash(state: dict[str, Any]) -> str:
    comparable = {key: value for key, value in state.items() if key != "fetchedAtEpochMs"}
    raw = json.dumps(comparable, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


class GitHubStateWriter:
    def __init__(self) -> None:
        self.repo = env("GITHUB_REPOSITORY", "atkaksoy501/ifts-hackathon")
        self.base_branch = env("GITHUB_BASE_BRANCH", "main")
        self.state_branch = env("GITHUB_STATE_BRANCH", "jira-live")
        self.state_path = env("GITHUB_STATE_PATH", "jira-live/state.json").lstrip("/")
        self.token = github_token()
        if not self.token:
            raise ValueError("GITHUB_TOKEN is required, or gh must be authenticated")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    def api_url(self, path: str) -> str:
        normalized = path.lstrip("/")
        if not normalized:
            return f"https://api.github.com/repos/{self.repo}"
        return f"https://api.github.com/repos/{self.repo}/{normalized}"

    def repository_metadata(self) -> dict[str, Any]:
        return request_json("GET", self.api_url(""), self.headers)

    def default_branch_name(self) -> str:
        metadata = self.repository_metadata()
        return (metadata.get("default_branch") or self.base_branch or "main").strip()

    def bootstrap_empty_repository(self) -> None:
        branch_name = self.default_branch_name()
        readme_body = (
            "# Jira Live State\n\n"
            "This private repository stores Jira state published for the hackathon demo.\n"
        )
        blob = request_json(
            "POST",
            self.api_url("git/blobs"),
            self.headers,
            {"content": readme_body, "encoding": "utf-8"},
        )
        blob_sha = blob.get("sha")
        if not blob_sha:
            raise ValueError("Could not create blob while bootstrapping the private repository")

        tree = request_json(
            "POST",
            self.api_url("git/trees"),
            self.headers,
            {
                "tree": [
                    {
                        "path": "README.md",
                        "mode": "100644",
                        "type": "blob",
                        "sha": blob_sha,
                    }
                ]
            },
        )
        tree_sha = tree.get("sha")
        if not tree_sha:
            raise ValueError("Could not create tree while bootstrapping the private repository")

        commit = request_json(
            "POST",
            self.api_url("git/commits"),
            self.headers,
            {
                "message": "Initialize private Jira state repository",
                "tree": tree_sha,
                "parents": [],
            },
        )
        commit_sha = commit.get("sha")
        if not commit_sha:
            raise ValueError("Could not create initial commit while bootstrapping the private repository")

        request_json(
            "POST",
            self.api_url("git/refs"),
            self.headers,
            {"ref": f"refs/heads/{branch_name}", "sha": commit_sha},
        )
        self.base_branch = branch_name

    def ensure_branch(self) -> None:
        try:
            request_json("GET", self.api_url(f"git/ref/heads/{self.state_branch}"), self.headers)
            return
        except urllib.error.HTTPError as exc:
            if exc.code != 404:
                raise

        try:
            base_ref = request_json("GET", self.api_url(f"git/ref/heads/{self.base_branch}"), self.headers)
        except urllib.error.HTTPError as exc:
            if exc.code != 404:
                raise
            self.bootstrap_empty_repository()
            base_ref = request_json("GET", self.api_url(f"git/ref/heads/{self.base_branch}"), self.headers)
        sha = ((base_ref.get("object") or {}).get("sha"))
        if not sha:
            raise ValueError(f"Could not read base branch sha for {self.base_branch}")
        if self.state_branch == self.base_branch:
            return
        request_json("POST", self.api_url("git/refs"), self.headers, {"ref": f"refs/heads/{self.state_branch}", "sha": sha})

    def current_file_sha(self) -> str | None:
        url = self.api_url(f"contents/{urllib.parse.quote(self.state_path)}?ref={urllib.parse.quote(self.state_branch)}")
        try:
            content = request_json("GET", url, self.headers)
            return content.get("sha")
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return None
            raise

    def put_state(self, state: dict[str, Any]) -> None:
        self.ensure_branch()
        content = json.dumps(state, ensure_ascii=False, indent=2).encode("utf-8")
        payload: dict[str, Any] = {
            "message": f"Update Jira live state ({len(state.get('issues', []))} issues)",
            "branch": self.state_branch,
            "content": base64.b64encode(content).decode("ascii"),
        }
        sha = self.current_file_sha()
        if sha:
            payload["sha"] = sha
        request_json("PUT", self.api_url(f"contents/{self.state_path}"), self.headers, payload)


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")

    env_parser = argparse.ArgumentParser(add_help=False)
    env_parser.add_argument("--env-file", default="integrations/jira/live_bridge/.env.company-pc")
    env_args, remaining = env_parser.parse_known_args()
    load_dotenv(Path(env_args.env_file))

    parser = argparse.ArgumentParser(description="Publish Jira changes to a GitHub state file.")
    parser.add_argument("--env-file", default="integrations/jira/live_bridge/.env.company-pc", help="Optional env file")
    parser.add_argument("--interval", type=int, default=int(env("JIRA_POLL_INTERVAL_SECONDS", "10")))
    parser.add_argument("--max-results", type=int, default=int(env("JIRA_MAX_RESULTS", "50")))
    parser.add_argument("--once", action="store_true", help="Run one poll and exit")
    parser.add_argument("--jql", default=env("JIRA_LIVE_JQL") or DEFAULT_JQL)
    args = parser.parse_args(remaining)
    if env("JIRA_PROJECT_KEY") and args.jql == DEFAULT_JQL:
        args.jql = f"project = {env('JIRA_PROJECT_KEY')} AND updated >= -15m ORDER BY updated DESC"

    writer = GitHubStateWriter()
    last_hash = ""
    print(f"Publishing Jira state to {writer.repo}:{writer.state_branch}/{writer.state_path}")
    print(f"JQL: {args.jql}")

    while True:
        try:
            state = build_state(args.jql, args.max_results)
            current_hash = stable_hash(state)
            if current_hash != last_hash:
                writer.put_state(state)
                last_hash = current_hash
                print(f"Published {len(state['issues'])} issues at {state['fetchedAtEpochMs']}")
            else:
                print("No Jira state change")
        except Exception as exc:  # noqa: BLE001
            print(f"Publish failed: {exc}", file=sys.stderr)

        if args.once:
            return 0
        time.sleep(args.interval)


if __name__ == "__main__":
    raise SystemExit(main())
