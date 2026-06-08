#!/usr/bin/env python3
"""Pull Jira state from GitHub, upsert MongoDB, and serve a live UI."""

from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from pymongo import MongoClient, UpdateOne
from pymongo.collection import Collection


INDEX_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Jira Live</title>
  <style>
    :root { color-scheme: light; --ink:#172026; --muted:#66717b; --line:#d9e0e6; --bg:#f5f7f9; --panel:#fff; --accent:#0f766e; --warn:#a16207; }
    * { box-sizing: border-box; }
    body { margin: 0; font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); background: var(--bg); }
    header { padding: 18px 24px 12px; border-bottom: 1px solid var(--line); background: var(--panel); display:flex; align-items:center; justify-content:space-between; gap:16px; }
    h1 { margin: 0; font-size: 20px; font-weight: 650; }
    .meta { color: var(--muted); font-size: 13px; }
    main { padding: 18px 24px; }
    table { width: 100%; border-collapse: collapse; background: var(--panel); border: 1px solid var(--line); }
    th, td { padding: 10px 12px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
    th { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; background: #fbfcfd; }
    tr:last-child td { border-bottom: 0; }
    .key { font-weight: 650; white-space: nowrap; }
    .pill { display:inline-flex; align-items:center; min-height:22px; padding:2px 8px; border:1px solid var(--line); border-radius:999px; font-size:12px; background:#fbfcfd; }
    .done { color: var(--accent); border-color: #99d6cd; background: #effaf8; }
    .progress { color: var(--warn); border-color: #ead08b; background: #fff8e6; }
    .empty { padding: 28px; color: var(--muted); background: var(--panel); border:1px solid var(--line); }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Jira Live</h1>
      <div class="meta" id="sync">Connecting...</div>
    </div>
    <div class="meta" id="count">0 issues</div>
  </header>
  <main id="root"><div class="empty">Waiting for Jira data.</div></main>
  <script>
    const root = document.getElementById("root");
    const sync = document.getElementById("sync");
    const count = document.getElementById("count");

    function esc(value) {
      return String(value ?? "").replace(/[&<>"']/g, c => {
        if (c === "&") return "&amp;";
        if (c === "<") return "&lt;";
        if (c === ">") return "&gt;";
        if (c === '"') return "&quot;";
        return "&#39;";
      });
    }

    function statusClass(issue) {
      const cat = String(issue.statusCategory || "").toLowerCase();
      if (cat.includes("done")) return "done";
      if (cat.includes("progress")) return "progress";
      return "";
    }

    function render(payload) {
      const issues = payload.issues || [];
      count.textContent = `${issues.length} issues`;
      sync.textContent = payload.lastIngestedAt ? `Last sync: ${new Date(payload.lastIngestedAt).toLocaleString()}` : "Waiting for sync";
      if (!issues.length) {
        root.innerHTML = '<div class="empty">No Jira issues have been ingested yet.</div>';
        return;
      }
      root.innerHTML = `<table>
        <thead><tr><th>Key</th><th>Summary</th><th>Status</th><th>Assignee</th><th>Updated</th></tr></thead>
        <tbody>${issues.map(issue => `<tr>
          <td class="key">${esc(issue.key)}</td>
          <td>${esc(issue.summary)}</td>
          <td><span class="pill ${statusClass(issue)}">${esc(issue.status)}</span></td>
          <td>${esc(issue.assignee || "Unassigned")}</td>
          <td>${esc(issue.updated || "")}</td>
        </tr>`).join("")}</tbody>
      </table>`;
    }

    async function refresh() {
      const res = await fetch("/api/issues", {cache: "no-store"});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      render(await res.json());
    }

    refresh().catch(err => sync.textContent = err.message);
    const events = new EventSource("/events");
    events.onmessage = event => render(JSON.parse(event.data));
    events.onerror = () => {
      sync.textContent = "SSE reconnecting...";
      setTimeout(() => refresh().catch(() => {}), 2000);
    };
  </script>
</body>
</html>
"""


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


def request_json(url: str, token: str = "", timeout: int = 20) -> dict[str, Any]:
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_github_state() -> dict[str, Any]:
    repo = env("GITHUB_REPOSITORY", "atkaksoy501/ifts-hackathon")
    branch = env("GITHUB_STATE_BRANCH", "jira-live")
    path = env("GITHUB_STATE_PATH", "jira-live/state.json").lstrip("/")
    token = github_token()
    encoded_path = urllib.parse.quote(path)
    encoded_branch = urllib.parse.quote(branch)
    url = f"https://api.github.com/repos/{repo}/contents/{encoded_path}?ref={encoded_branch}"
    content = request_json(url, token)
    raw = base64.b64decode(content["content"]).decode("utf-8")
    return json.loads(raw)


def collection() -> Collection:
    client = MongoClient(env("MONGO_URI", "mongodb://localhost:27017"))
    db = client[env("MONGO_DB", "hackathon")]
    coll = db[env("MONGO_COLLECTION", "jira_issues")]
    coll.create_index("key", unique=True)
    coll.create_index("updated")
    return coll


def upsert_state(coll: Collection, state: dict[str, Any]) -> int:
    fetched_at = state.get("fetchedAtEpochMs")
    ops = []
    for issue in state.get("issues", []):
        if not issue.get("key"):
            continue
        document = {
            **issue,
            "source": "jira",
            "lastIngestedAt": int(time.time() * 1000),
            "sourceFetchedAtEpochMs": fetched_at,
            "sourceJql": state.get("jql"),
        }
        ops.append(UpdateOne({"key": issue["key"]}, {"$set": document}, upsert=True))
    if not ops:
        return 0
    result = coll.bulk_write(ops, ordered=False)
    return result.upserted_count + result.modified_count + result.matched_count


def snapshot(coll: Collection, limit: int = 100) -> dict[str, Any]:
    docs = []
    cursor = coll.find({}, {"_id": False}).sort("updated", -1).limit(limit)
    for doc in cursor:
        docs.append(doc)
    last_ingested = max((doc.get("lastIngestedAt", 0) for doc in docs), default=0)
    return {
        "lastIngestedAt": last_ingested,
        "issues": docs,
    }


def ingest_loop(coll: Collection, stop: threading.Event) -> None:
    interval = int(env("GITHUB_POLL_INTERVAL_SECONDS", "3"))
    last_seen = ""
    while not stop.is_set():
        try:
            state = fetch_github_state()
            raw = json.dumps(state, ensure_ascii=False, sort_keys=True)
            if raw != last_seen:
                count = upsert_state(coll, state)
                last_seen = raw
                print(f"Ingested Jira state: {count} issue writes")
        except urllib.error.HTTPError as exc:
            print(f"GitHub state fetch failed: HTTP {exc.code}", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001
            print(f"Ingest failed: {exc}", file=sys.stderr)
        stop.wait(interval)


class Handler(BaseHTTPRequestHandler):
    coll: Collection

    def send_json(self, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/":
            body = INDEX_HTML.encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if self.path.startswith("/api/issues"):
            self.send_json(snapshot(self.coll))
            return

        if self.path.startswith("/events"):
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            last_payload = ""
            while True:
                payload = json.dumps(snapshot(self.coll), ensure_ascii=False, sort_keys=True)
                if payload != last_payload:
                    self.wfile.write(f"data: {payload}\n\n".encode("utf-8"))
                    self.wfile.flush()
                    last_payload = payload
                time.sleep(2)

        self.send_error(HTTPStatus.NOT_FOUND)

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"{self.address_string()} - {fmt % args}")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Ingest GitHub Jira state into MongoDB and serve live UI.")
    parser.add_argument("--env-file", default="integrations/jira/live_bridge/.env.mac-mini", help="Optional env file")
    parser.add_argument("--once", action="store_true", help="Ingest once and exit")
    args = parser.parse_args()
    load_dotenv(Path(args.env_file))

    coll = collection()
    if args.once:
        state = fetch_github_state()
        count = upsert_state(coll, state)
        print(f"Ingested Jira state once: {count} issue writes")
        return 0

    stop = threading.Event()
    thread = threading.Thread(target=ingest_loop, args=(coll, stop), daemon=True)
    thread.start()

    Handler.coll = coll
    host = env("APP_HOST", "0.0.0.0")
    port = int(env("APP_PORT", "8088"))
    print(f"Serving Jira live UI at http://{host}:{port}")
    try:
        ThreadingHTTPServer((host, port), Handler).serve_forever()
    except KeyboardInterrupt:
        stop.set()
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
