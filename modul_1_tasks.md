# Modul 1 Tasks

## Source Summary

| Area | Current state |
| --- | --- |
| Product scope | Predictive Sizing + Blockage Advisor for Jira backlog issues. |
| App scaffold | `app/` created with `shared`, `backend`, `frontend`. |
| Backend | Express.js + TypeScript app factory, `/healthz`, REST route skeleton, httpOnly JWT cookie path, in-memory DDD services. |
| Frontend | React/Vite + TypeScript + Tailwind + shadcn-style local UI components + Radix Tabs/Slot. |
| Shared contracts | `@module1/contracts` DTOs and Zod schemas based on `modul-1-contracts`. |
| Tests | Vitest unit/integration tests and Playwright e2e smoke test are present. |
| Docker | Single runtime image scaffold plus `docker-compose.yml` with MongoDB. |
| Runtime note | Use Node `>=22`; local default Node `v14` is too old for Vite. |

## Verification Snapshot

| Check | Result |
| --- | --- |
| Dependency install | `corepack pnpm install` passed. |
| Build | `corepack pnpm build` passed with bundled Node `v24.14.0`. |
| Unit/integration tests | `corepack pnpm test` passed: shared 2, backend 5, frontend 2. |
| Backend dev server | `http://localhost:8080/healthz` returned `{"ok":true,"service":"module1-advisor"}`. |
| Frontend dev server | `http://localhost:5173/` returned HTTP 200. |
| E2E smoke | `corepack pnpm --filter @module1/frontend test:e2e` passed: chromium + mobile. |

## Task Granularity Rule

One task should create one testable edit set for one owner. Keep TDD order: failing test first, implementation second, API/UI/e2e after core behavior.

## Atomic Backlog

### P0 - Completed Scaffold

- [x] DEC-001 Lock MVP boundaries: no Jira write, no export, no OpenRouter runtime.
- [x] ROOT-001 Create `app/` monorepo with `shared`, `backend`, `frontend`.
- [x] ROOT-002 Add package dependencies and scripts for build, unit, integration, e2e, coverage, quality.
- [x] ROOT-003 Add Dockerfile, docker-compose, env example, Sonar paths, README.
- [x] API-001 Add shared DTO/Zod contract package from backend/frontend API contract docs.
- [x] BE-001 Scaffold Express.js app factory, health route, API route skeleton, cookie auth middleware.
- [x] FE-001 Scaffold React/Vite/Tailwind UI shell with local shadcn-style primitives.
- [x] TEST-001 Add initial shared, backend, frontend, and Playwright smoke tests.
- [x] VERIFY-001 Prove backend and frontend can build, test, start, and respond locally.

### P0 - Open Decisions

- [ ] DEC-002 Confirm real GitHub state URL, branch, path, and auth mode for backend ingest.
- [ ] DEC-003 Confirm production Mongo Atlas URI naming and secret source.
- [ ] DEC-004 Confirm `HOURS_PER_STORY_POINT` default for ICTFT team.

### P1 - Shared Contracts

- [ ] API-002 Add request/response schemas for every admin, sync, backlog, sprint, sizing, and blockage route.
- [ ] API-003 Add contract tests that verify route responses never leak persistence/internal shapes.
- [ ] API-004 Add generated frontend API types or import policy so DTO drift is caught in CI.

### P1 - Express Backend Foundation

- [ ] BE-002 Replace in-memory service wiring with dependency container interfaces and test fixtures.
- [ ] BE-003 Add MongoDB connection lifecycle, indexes, health details, and graceful shutdown tests.
- [ ] BE-004 Add centralized validation helpers, correlation IDs, and `ErrorEnvelope` integration tests.
- [ ] BE-005 Add startup sync scheduler shell with disabled/test mode and deterministic clock.

### P1 - Identity and Access

- [ ] AUTH-001 Add failing unit tests for password hash, JWT claims, roles, disabled users.
- [ ] AUTH-002 Implement Mongo `users` repository and idempotent admin seed.
- [ ] AUTH-003 Add integration tests for login, logout, me, and admin user CRUD.
- [ ] AUTH-004 Harden cookie flags, role guard, duplicate username, empty patch, and disabled login paths.

### P1 - Work Item Ingestion and Catalog

- [ ] ING-001 Add failing tests for GitHub state fetch, parse, normalization, warnings, and stable upsert.
- [ ] ING-002 Implement GitHub state client and Mongo repositories for issues, sprints, field mappings, sync runs.
- [ ] ING-003 Implement startup, interval, and manual sync with run records and old-data preservation.
- [ ] ING-004 Add integration tests for sync status, manual sync, backlog filters, sprint history warnings.
- [ ] ING-005 Wire real query endpoints to Mongo read models and remove scaffold seed data from production mode.

### P1 - Predictive Sizing

- [ ] SIZE-001 Expand failing unit tests for tokenizer, similarity weighting, target exclusion, and sparse data.
- [ ] SIZE-002 Replace starter similarity with TF-IDF/keyword hybrid engine and deterministic fixtures.
- [ ] SIZE-003 Implement confidence breakdown, story point estimate, ideal hour fallback, and warning policies.
- [ ] SIZE-004 Persist sizing recommendations and add `POST /api/sizing/recommend` integration tests.

### P1 - Blockage Advisory

- [ ] BLK-001 Add failing unit tests for active pattern invariants, evidence strength, low-confidence paths.
- [ ] BLK-002 Implement Mongo `blockage_patterns` repository and recommendation persistence.
- [ ] BLK-003 Implement admin KB CRUD integration tests and route behavior.
- [ ] BLK-004 Expand recommendation service to combine issue text, components, local KB, and Jira examples.

### P2 - Delivery Experience Frontend

- [ ] UI-001 Replace mock data with TanStack Query API calls and session bootstrap.
- [ ] UI-002 Implement real login/logout, route guards, admin-only views, and disabled user state.
- [ ] UI-003 Implement sync health, manual sync, backlog filters, sprint warning, empty-state flows.
- [ ] UI-004 Implement sizing result, confidence breakdown, similar issues table, warning/rationale states.
- [ ] UI-005 Implement blockage advisor input, issue-backed recommendation, evidence/actions states.
- [ ] UI-006 Implement admin users and admin blockage KB forms with validation/error handling tests.

### P2 - E2E, Quality, Docker, Docs

- [ ] E2E-001 Add seed fixtures for admin, backlog, historical issues, and blockage patterns.
- [ ] E2E-002 Add e2e login -> backlog -> sizing -> blockage happy path against running backend.
- [ ] E2E-003 Add e2e admin manual sync and warning/empty-state path.
- [ ] DOCKER-001 Verify Docker image boots API + built frontend and reaches Mongo through compose.
- [ ] QG-001 Add coverage thresholds, Sonar quality settings, Semgrep notes, and CI build/test commands.
- [ ] DOC-001 Update runbook for Node version, pnpm, Docker, env, publisher, ingest, verify.

## Parallel Agent Plan

| Agent | Task range | Can start after | Owns | Must not touch | Verify |
| --- | --- | --- | --- | --- | --- |
| A1 | `API-*`, `BE-002` | Completed scaffold | Shared contracts, backend interfaces | UI views | Contract/unit tests |
| A2 | `AUTH-*` | `API-002`, `BE-002` | Identity domain, Mongo repo, auth routes | Sizing/blockage code | Auth unit + integration |
| A3 | `ING-*` | `BE-002`, `DEC-002` | GitHub ingest, Mongo read models, sync/backlog APIs | Publisher internals | Ingest integration |
| A4 | `SIZE-*` | `ING-002` fixtures | Sizing engine, persistence, route | Blockage KB | Sizing unit + integration |
| A5 | `BLK-*` | `ING-002` fixtures | Blockage KB, recommendation, route | Sizing engine | Blockage unit + integration |
| A6 | `UI-*` | API stubs/contracts stable | React views, API client, forms, tests | Backend domain logic | Frontend unit + e2e |
| A7 | `E2E-*`, `DOCKER-*`, `QG-*`, `DOC-*` | P1 backend + P2 UI stable | Fixtures, e2e, Docker, quality, docs | Feature internals except fixes | Build, test, e2e, compose |

## Local Quality Gate

| Tool | Command | Blocks release |
| --- | --- | --- |
| Build | `corepack pnpm build` | Yes |
| Unit/integration | `corepack pnpm test` | Yes |
| E2E smoke | `corepack pnpm --filter @module1/frontend test:e2e` | Yes |
| Coverage | `corepack pnpm coverage` | Yes |
| Docker | `corepack pnpm docker:up` | Yes |
| Sonar/Semgrep | CI plus local configured scan | Yes |

## Verification

- Task count: 48 total, 9 completed, 39 remaining.
- Scaffold path: `app/`.
- Backend framework: Express.js.
- Frontend framework: React/Vite/Tailwind with shadcn-style local components.
- Test coverage lanes: unit, integration, e2e present.
- Quality lanes: build, coverage, Docker, Sonar, Semgrep present.
