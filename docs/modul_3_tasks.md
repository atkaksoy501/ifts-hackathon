# Modul 3 Sub-Agent Tasks

## Source Summary

| Area | Finding |
| --- | --- |
| Input docs | `modul_3_plan.md`, `modul-3-ddd/*`, and `modul-3-contracts/*` define AI Sprint Review & Management Dashboard. |
| Product scope | Closed sprint evidence -> manager remark -> Turkish demo report -> Markdown/JSON export -> variance dashboard; spillover/health are bonus after core. |
| Bounded contexts | Sprint Evidence Intake, Sprint Review Workspace, Sprint Demo Reporting, Delivery Analytics, Sprint Health & Spillover, Delivery Experience UI. |
| Existing backend | Express routes live in `app/backend/src/routes.ts`; service construction in `app/backend/src/app.ts`; auth errors use `ApiError` + `ErrorEnvelope`. |
| Existing contracts | Shared Zod schemas live in `app/shared/src/index.ts`; `UserRole` is currently `user | admin` and must become `user | manager | admin`. |
| Existing frontend | `DeliveryDashboard.tsx` is the main screen; `ApiClient` uses `credentials: "include"`; UI currently uses mock data. |
| Existing tests | Vitest contract/unit, backend Supertest integration, frontend Testing Library unit, Playwright e2e. |
| Quality gates | `corepack pnpm build`, `test`, `test:integration`, `test:e2e`, `coverage`, `lint`, `quality`; Sonar config exists at `app/sonar-project.properties`. |
| Codesight note | `.codesight/wiki/index.md` is missing; `.codesight/CODESIGHT.md`, routes, components, and source files were used. |

## Task Granularity Rule

One task should be one bounded-context test or implementation slice that a sub-agent can finish and verify. Do not split every DTO field, chart label, or warning code into its own task.

## Atomic Backlog

### P0 - Coordination

- [ ] DEC-001 Lock MVP defaults: heuristic provider, JSON + Markdown export, no Jira/GitHub write, OpenRouter P2, bonus last.
- [ ] ROOT-001 Add Modul 3 ownership/file map before agents touch shared contracts, routes, app wiring, and dashboard files.

### P1 - Shared Contracts + Route Shell

- [ ] API-001 Add contract unit tests for `manager` role, sprint evidence/report/variance DTO invariants, score ranges, and `trendWindow`.
- [ ] API-002 Implement Modul 3 Zod schemas/types for sprint review, evidence, remarks, reports, variance, spillover, and health responses.
- [ ] API-003 Add route-shell integration tests and wire empty Modul 3 service interfaces/routes into `createApiRouter` and `createApp`.

### P1 - Sprint Evidence Intake

- [ ] EVID-001 Add fixtures and unit tests for start/close snapshots, completion state, source refs, sparse data, and timeSpent fallback warnings.
- [ ] EVID-002 Implement `SprintEvidenceService`, in-memory evidence repo, and normalization from existing `CatalogService` sprint/issue read models.
- [ ] EVID-003 Add GitHub PR/commit mapping tests and adapter for `/[A-Z][A-Z0-9]+-\d+/`, preserving unmatched evidence with warnings.

### P1 - Sprint Review Workspace

- [ ] REV-001 Add tests for reviewable sprint list, empty-list warning, manager/admin remark write, user 403, and blank remark 400.
- [ ] REV-002 Implement review workspace service, remark repo, sprint list route, and remark route using session-derived author metadata.

### P1 - Sprint Demo Reporting

- [ ] REP-001 Add unit tests for deterministic Turkish heuristic sections, warning propagation, report version increment, and non-empty Markdown.
- [ ] REP-002 Implement heuristic summary provider, report repository, Markdown renderer, and JSON/Markdown consistency checks.
- [ ] REP-003 Add integration tests for `POST /api/sprint-review/reports`, `GET /reports/:id`, and `GET /reports/:id/markdown`.

### P1 - Delivery Analytics

- [ ] VAR-001 Add unit tests for planned vs actual SP/hour variance, zero planned percent, fallback hours, velocity trend, and bottleneck grouping.
- [ ] VAR-002 Implement `VarianceEngine`, analytics service, and `GET /api/analytics/variance` route with query validation.

### P2 - Bonus Spillover + Health

- [ ] BONUS-001 Add tests and implementation for spillover metrics: carryover percent, by issueType, by assignee, and scope volatility.
- [ ] BONUS-002 Add tests and implementation for health score: `1..100`, weights `30/25/20/25`, capacity-signal fallback, and advisory warnings.

### P2 - Frontend Experience

- [ ] UI-001 Add `ApiClient` Modul 3 methods and tests for credentials, query params, body validation, and API error paths.
- [ ] UI-002 Add Sprint Review tab with sprint selector, evidence panels, warnings, remark form, and role-based visibility tests.
- [ ] UI-003 Add report preview/copy/download, variance visuals, optional bonus panels, Turkish dictionary keys, and dashboard unit tests.

### P2 - E2E + Quality + Docs

- [ ] E2E-001 Add deterministic Modul 3 seed fixtures and e2e flow: login -> select sprint -> add remark -> generate report -> view variance -> export Markdown.
- [ ] QG-001 Run `corepack pnpm build`, `corepack pnpm test`, `corepack pnpm test:integration`, and fix failures.
- [ ] QG-002 Run `corepack pnpm test:e2e` and `corepack pnpm quality`; verify Sonar lcov paths stay valid.
- [ ] DOC-001 Update Modul 3 docs and rerun Codesight after implementation changes.

## Parallel Agent Plan

| Agent | Task range | Can start after | Owns | Must not touch | Verify |
| --- | --- | --- | --- | --- | --- |
| A0 | `DEC-*`, `ROOT-*` | Now | MVP decisions, file ownership map | Feature internals | Written defaults + coordination map |
| A1 | `API-*` | `DEC-001` | `app/shared/src/index.ts`, route shell, service contracts | Context algorithms, UI panels | Contract tests + route-shell integration |
| A2 | `EVID-*`, `REV-*` | `API-001`, `API-002`, `API-003` | Evidence normalization, GitHub mapping, remarks, sprint review routes | Report renderer, analytics math, frontend shell | Evidence/review unit + integration tests |
| A3 | `REP-*` | `EVID-002`, `REV-002` | Heuristic summary, report repo, Markdown export, report routes | Variance/health formulas, UI layout | Report unit + integration tests |
| A4 | `VAR-*`, `BONUS-*` | `EVID-002` for variance; `VAR-002` for health | Analytics, spillover, health engines/routes | Report generation, dashboard layout | Analytics unit + route tests |
| A5 | `UI-*` | `API-002`, stable route shell | `ApiClient`, `DeliveryDashboard`, dictionary/mock fixtures/tests | Backend domain internals | Frontend unit tests |
| A6 | `E2E-*`, `QG-*`, `DOC-*` | P1 backend + P2 UI stable | Playwright flow, final gates, docs, Codesight refresh | Feature internals except verified fixes | Build/test/e2e/quality |

## Coordination Points

| Shared file/area | Owner lane | Rule |
| --- | --- | --- |
| `app/shared/src/index.ts` | A1 | Other agents wait for DTO/schema names or coordinate through A1. |
| `app/backend/src/routes.ts` | A1 first, then A2/A3/A4 | Route shell lands first; context agents fill only their endpoint blocks. |
| `app/backend/src/app.ts` | A1 | Service construction changes stay in one lane until shell is stable. |
| `app/backend/src/contexts/ingestion/catalog.service.ts` | A2 | Extend read methods without breaking existing backlog/sizing tests. |
| `app/frontend/src/shared/api/client.ts` | A5 | Backend agents do not edit client methods. |
| `app/frontend/src/features/delivery/DeliveryDashboard.tsx` | A5 | UI lane owns tab layout and visible states. |
| Package scripts, lockfile, Sonar config | A6 | Avoid dependency/script churn unless a gate failure proves need. |

## Local Quality Gate

| Tool | Command | Task IDs | Blocks release |
| --- | --- | --- | --- |
| Build | `corepack pnpm build` | `QG-001` | Yes |
| Unit/all package tests | `corepack pnpm test` | `QG-001` | Yes |
| Backend integration | `corepack pnpm test:integration` | `QG-001` | Yes |
| Frontend e2e | `corepack pnpm test:e2e` | `QG-002` | Yes |
| Coverage + type lint | `corepack pnpm quality` | `QG-002` | Yes |
| Sonar config check | `app/sonar-project.properties` lcov paths | `QG-002` | Yes if local Sonar gate is active |
| Codesight refresh | project Codesight command | `DOC-001` | Yes for updated AI map |

## Acceptance Matrix

| Flow | Unit | Integration | E2E |
| --- | --- | --- | --- |
| User role + route auth | `API-001`, `REV-001` | `API-003`, `REV-002` | `E2E-001` |
| Sprint list + evidence | `EVID-001`, `EVID-003` | `REV-002` | `E2E-001` |
| Manager remark | `REV-001` | `REV-002` | `E2E-001` |
| Demo report JSON/Markdown | `REP-001` | `REP-003` | `E2E-001` |
| Variance analytics | `VAR-001` | `VAR-002` | `E2E-001` |
| Spillover + health bonus | `BONUS-001`, `BONUS-002` | `BONUS-001`, `BONUS-002` | Optional after core |
| Dashboard experience | `UI-001`..`UI-003` | Backend routes above | `E2E-001` |

## Open Decisions

- Keep MVP persistence in-memory unless implementation lane decides Mongo is already necessary.
- Keep OpenRouter behind P2 interface; no external provider call without anonymizer and schema validation.
- Keep bonus spillover/health after core report + variance demo path.
- Keep Markdown export as JSON envelope; no PDF in v1.

## Verification

- Task count: 24 unchecked tasks.
- Sub-agent lanes: 7 lanes; 5 feature lanes can run after shared contracts/route shell.
- Source coverage: input docs, Codesight route/component map, shared contracts, backend routes/app/http/catalog/identity, frontend client/dashboard/tests, package scripts, Playwright, Sonar config.
- Test coverage: contract unit, backend unit/integration, frontend unit, e2e, build, coverage, lint, quality.
- Quality gate coverage: local commands only; no new CI invented.
- Granularity: medium atomic packs, intentionally not field-by-field.
