# AI hackathon-real — AI Context Map

> **Stack:** express | none | react | typescript
> **Monorepo:** predictive-sizing-blockage-advisor, @module1/backend, @module1/frontend, @module1/contracts

> 17 routes (17 inferred) | 0 models | 2 components | 2 lib files | 24 env vars | 4 middleware | 29% test coverage
> **Token savings:** this file is ~2,100 tokens. Without it, AI exploration would cost ~23,300 tokens. **Saves ~21,200 tokens per conversation.**
> **Last scanned:** 2026-06-08 11:47 — re-run after significant changes

---

# Routes

## CRUD Resources

- **`/api/admin/users`** GET | POST | GET/:id | PATCH/:id → User
- **`/api/admin/blockage-patterns`** GET | POST | GET/:id | PATCH/:id → Blockage-pattern

## Other Routes

- `GET` `/healthz` `[inferred]` ✓
- `GET` `*` `[inferred]` ✓
- `POST` `/api/auth/login` [auth] `[inferred]` ✓
- `POST` `/api/auth/logout` [auth] `[inferred]`
- `GET` `/api/auth/me` [auth] `[inferred]` ✓
- `GET` `/api/sync/status` [auth] `[inferred]`
- `POST` `/api/sync/github/run` [auth] `[inferred]`
- `GET` `/api/backlog` [auth] `[inferred]`
- `GET` `/api/sprints/history` [auth] `[inferred]`
- `POST` `/api/sizing/recommend` [auth] `[inferred]` ✓
- `POST` `/api/blockage/recommend` [auth] `[inferred]`

---

# Components

- **App** — `app\frontend\src\app\App.tsx`
- **DeliveryDashboard** — `app\frontend\src\features\delivery\DeliveryDashboard.tsx`

---

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

---

# Config

## Environment Variables

- `ADMIN_DISPLAY_NAME` (has default) — app\.env.example
- `ADMIN_PASSWORD` (has default) — app\.env.example
- `ADMIN_USERNAME` (has default) — app\.env.example
- `DEFAULT_PROJECT_KEY` (has default) — app\.env.example
- `FRONTEND_DIST` (has default) — app\.env.example
- `FRONTEND_ORIGIN` (has default) — app\.env.example
- `GITHUB_STATE_URL` (has default) — app\.env.example
- `HOURS_PER_STORY_POINT` (has default) — app\.env.example
- `JIRA_API_VERSION` **required** — integrations\jira\jira_smoke_test.py
- `JIRA_AUTH_MODE` (has default) — integrations\jira\.env.example
- `JIRA_CA_BUNDLE` **required** — integrations\jira\.env.example
- `JIRA_PROJECT_KEY` **required** — integrations\jira\.env.example
- `JIRA_SMOKE_JQL` (has default) — integrations\jira\.env.example
- `JIRA_TOKEN` (has default) — integrations\jira\.env.example
- `JIRA_URL` (has default) — integrations\jira\.env.example
- `JIRA_USERNAME` **required** — integrations\jira\.env.example
- `JIRA_VERIFY_SSL` (has default) — integrations\jira\.env.example
- `JWT_COOKIE_NAME` (has default) — app\.env.example
- `JWT_SECRET` (has default) — app\.env.example
- `MONGO_DB_NAME` (has default) — app\.env.example
- `MONGO_URI` (has default) — app\.env.example
- `NODE_ENV` (has default) — app\.env.example
- `PORT` (has default) — app\.env.example
- `SYNC_INTERVAL_MS` (has default) — app\.env.example

## Config Files

- `app\.env.example`
- `app\frontend\tailwind.config.ts`
- `app\frontend\vite.config.ts`
- `integrations\jira\.env.example`

---

# Middleware

## auth
- auth — `app\backend\src\shared\auth.ts`
- requireSession — `app\backend\src\routes.ts`

## cors
- cors — `app\backend\src\app.ts`

## error-handler
- errorHandler — `app\backend\src\app.ts`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `app\backend\src\shared\http.ts` — imported by **6** files
- `app\backend\src\shared\config.ts` — imported by **5** files
- `app\frontend\src\shared\lib\cn.ts` — imported by **5** files
- `app\backend\src\contexts\predictive-sizing\sizing.engine.ts` — imported by **3** files
- `app\backend\src\app.ts` — imported by **2** files
- `app\backend\src\contexts\blockage-advisory\blockage.service.ts` — imported by **2** files
- `app\backend\src\contexts\identity\identity.service.ts` — imported by **2** files
- `app\backend\src\contexts\ingestion\catalog.service.ts` — imported by **2** files
- `app\frontend\src\features\delivery\DeliveryDashboard.tsx` — imported by **2** files
- `app\backend\src\routes.ts` — imported by **1** files
- `app\backend\src\shared\auth.ts` — imported by **1** files
- `app\frontend\src\shared\ui\badge.tsx` — imported by **1** files
- `app\frontend\src\shared\ui\button.tsx` — imported by **1** files
- `app\frontend\src\shared\ui\card.tsx` — imported by **1** files
- `app\frontend\src\shared\ui\input.tsx` — imported by **1** files
- `app\frontend\src\shared\ui\tabs.tsx` — imported by **1** files
- `app\frontend\src\features\delivery\mockData.ts` — imported by **1** files
- `app\frontend\src\features\delivery\dictionary.ts` — imported by **1** files
- `app\frontend\src\app\App.tsx` — imported by **1** files
- `app\frontend\src\shared\api\client.ts` — imported by **1** files

## Import Map (who imports what)

- `app\backend\src\shared\http.ts` ← `app\backend\src\app.ts`, `app\backend\src\contexts\blockage-advisory\blockage.service.ts`, `app\backend\src\contexts\identity\identity.service.ts`, `app\backend\src\contexts\ingestion\catalog.service.ts`, `app\backend\src\routes.ts` +1 more
- `app\backend\src\shared\config.ts` ← `app\backend\src\app.integration.test.ts`, `app\backend\src\app.ts`, `app\backend\src\routes.ts`, `app\backend\src\server.ts`, `app\backend\src\shared\auth.ts`
- `app\frontend\src\shared\lib\cn.ts` ← `app\frontend\src\shared\ui\badge.tsx`, `app\frontend\src\shared\ui\button.tsx`, `app\frontend\src\shared\ui\card.tsx`, `app\frontend\src\shared\ui\input.tsx`, `app\frontend\src\shared\ui\tabs.tsx`
- `app\backend\src\contexts\predictive-sizing\sizing.engine.ts` ← `app\backend\src\app.ts`, `app\backend\src\contexts\predictive-sizing\sizing.engine.unit.test.ts`, `app\backend\src\routes.ts`
- `app\backend\src\app.ts` ← `app\backend\src\app.integration.test.ts`, `app\backend\src\server.ts`
- `app\backend\src\contexts\blockage-advisory\blockage.service.ts` ← `app\backend\src\app.ts`, `app\backend\src\routes.ts`
- `app\backend\src\contexts\identity\identity.service.ts` ← `app\backend\src\app.ts`, `app\backend\src\routes.ts`
- `app\backend\src\contexts\ingestion\catalog.service.ts` ← `app\backend\src\app.ts`, `app\backend\src\routes.ts`
- `app\frontend\src\features\delivery\DeliveryDashboard.tsx` ← `app\frontend\src\app\App.tsx`, `app\frontend\src\features\delivery\DeliveryDashboard.test.tsx`
- `app\backend\src\routes.ts` ← `app\backend\src\app.ts`

---

# Test Coverage

> **29%** of routes and models are covered by tests
> 7 test files found

## Covered Routes

- GET:/healthz
- GET:*
- POST:/api/auth/login
- GET:/api/auth/me
- POST:/api/sizing/recommend

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_