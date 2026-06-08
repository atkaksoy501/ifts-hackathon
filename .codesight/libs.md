# Libraries

- `integrations\jira\live_bridge\github_to_mongo_app.py`
  - function load_dotenv: (path) -> None
  - function env: (name, default) -> str
  - function github_token: () -> str
  - function request_json: (url, token, timeout) -> dict[str, Any]
  - function fetch_github_state: () -> dict[str, Any]
  - function collection: () -> Collection
  - _...5 more_
- `integrations\jira\live_bridge\jira_to_github_state.py`
  - function load_dotenv: (path) -> None
  - function env: (name, default) -> str
  - function github_token: () -> str
  - function normalize_url: (value) -> str
  - function jira_auth_headers: () -> dict[str, str]
  - function request_json: (method, url, headers, str], payload, Any] | None, timeout) -> dict[str, Any]
  - _...6 more_
