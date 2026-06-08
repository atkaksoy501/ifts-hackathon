# Modul 2 Sub-Agent Tasks

## Source Summary

| Area | Finding |
| --- | --- |
| Input docs | `modul_2_plan.md`, `modul-2-ddd/*`, and `modul-2-contracts/*` define Task Decomposition + Smart Allocation. |
| Product scope | Manual/Jira planning input -> technical decomposition -> team/capacity -> smart allocation -> JSON/Markdown report. |
| Bounded contexts | Planning Intake, Technical Decomposition, Team Capability & Capacity, Smart Allocation, Reporting Engine, Delivery Experience UI. |
| Existing backend | Express API in `app/backend/src/routes.ts`; session/admin guards live inside `createApiRouter`; errors use `ApiError` + `ErrorEnvelope`. |
| Existing contracts | Shared Zod schemas live in `app/shared/src/index.ts`; extend `@module1/contracts` for Modul 2 v1. |
| Existing frontend | `DeliveryDashboard.tsx` is the only real screen; API client is thin and already uses `credentials: "include"`. |
| Existing tests | Vitest/Supertest for backend, Vitest for contracts/frontend, Playwright e2e scaffold. |
| Quality gates | `corepack pnpm build`, `test`, `test:integration`, `test:e2e`, `coverage`, `lint`, `quality`; Sonar config exists but no package script. |
| Codesight note | `.codesight/wiki/index.md` is missing; `.codesight/CODESIGHT.md`, routes, components, and source files were used. |

## Task Granularity Rule

One task should be one bounded-context test or implementation slice that a sub-agent can finish and verify. Do not split every DTO field or UI control into its own task.

## Atomic Backlog

### P0 - Coordination

- [ ] DEC-001 Lock MVP defaults: manual + Jira input, heuristic provider, JSON + Markdown report, no Jira write/PDF.
- [ ] ROOT-001 Add Modul 2 ownership/file map note before parallel agents touch shared route and contract files.

### P1 - Shared Contracts + Route Shell

- [ ] API-001 Add shared contract unit tests for Modul 2 DTO invariants, request refinements, warning codes, and score ranges.
- [ ] API-002 Implement Zod schemas/types for planning input, decomposition, team, capacity, allocation, report, and route request/response DTOs.
- [ ] API-003 Add backend route-shell integration tests for session auth, admin-only writes, validation errors, and `ErrorEnvelope`.
- [ ] API-004 Wire Modul 2 service interfaces and empty route shell into `createApiRouter`/`createApp` without domain logic.

### P1 - Planning Intake + Technical Decomposition

- [ ] PLAN-001 Add unit tests and fixtures for manual/Jira input normalization, AC parsing, constraints, and non-blocking warnings.
- [ ] PLAN-002 Implement `PlanningInputService` and in-memory repo using `CatalogService.getIssue` for immutable Jira snapshots.
- [ ] DECOMP-001 Add golden unit tests for heuristic domain detection, duplicate merge, dependencies, skills, estimates, risk, confidence, and warnings.
- [ ] DECOMP-002 Implement `HeuristicDecompositionProvider`, output normalizer, provider interface, and fallback warning path.
- [ ] DECOMP-003 Implement planning/decomposition route handlers and integration tests for happy, inline-input, inputId, and sparse-input paths.

### P1 - Team Capability + Capacity

- [ ] TEAM-001 Add unit tests for seed skill taxonomy, duplicate skill keys, member skill levels, active state, and capacity hour math.
- [ ] TEAM-002 Implement team member, skill taxonomy, and sprint capacity services with in-memory repos and warning generation.
- [ ] TEAM-003 Implement team/capacity routes with admin write policy and normal-user read policy.
- [ ] TEAM-004 Add integration tests for admin writes, user reads, invalid capacity, inactive members, and duplicate skills.

### P1 - Smart Allocation

- [ ] ALLOC-001 Add optimizer fixtures and unit tests for hard constraints, score formula, alternatives, unassigned reason, and utilization.
- [ ] ALLOC-002 Implement deterministic `AllocationEngine` with sequential utilization and one local rebalance pass.
- [ ] ALLOC-003 Implement allocation service, repo, and `/api/allocations/recommend` + `GET /api/allocations/:id` routes.
- [ ] ALLOC-004 Add integration tests for assigned, over-capacity, missing-skill, high-risk, and dependency-heavy runs.

### P1 - Reporting Engine

- [ ] REP-001 Add unit tests for report JSON, Markdown sections, utilization summary, warnings, assumptions, and empty-body invariant.
- [ ] REP-002 Implement report renderer, repository, and task-allocation report routes.
- [ ] REP-003 Add integration and frontend client contract tests for JSON report and Markdown response.

### P2 - Frontend Experience

- [ ] UI-001 Add `ApiClient` Modul 2 methods and tests for credentials, body validation, query params, and error paths.
- [ ] UI-002 Add Modul 2 dashboard tab with Jira/manual source input and acceptance-criteria editor.
- [ ] UI-003 Add decomposition grouped table plus warnings, loading, empty, and error states.
- [ ] UI-004 Add team matrix/capacity admin panels with permission-visible controls.
- [ ] UI-005 Add allocation recommendations, alternatives, utilization bars, report preview, and Markdown copy/download states with unit tests.

### P2 - E2E + Quality + Docs

- [ ] E2E-001 Add deterministic Modul 2 seed fixtures/helpers for API and UI tests.
- [ ] E2E-002 Add e2e flow: login -> select or enter task -> decompose -> allocate -> generate Markdown report.
- [ ] QG-001 Run `corepack pnpm build`, `corepack pnpm test`, `corepack pnpm test:integration`, and fix failures.
- [ ] QG-002 Run `corepack pnpm test:e2e`, `corepack pnpm quality`, verify Sonar lcov paths; document local Sonar scan only if server/token are used.
- [ ] DOC-001 Update Modul 2 docs and re-run Codesight after source implementation changes.

## Parallel Agent Plan

| Agent | Task range | Can start after | Owns | Must not touch | Verify |
| --- | --- | --- | --- | --- | --- |
| A0 | `DEC-*`, `ROOT-*` | Now | Decisions, ownership map | Feature internals | Written defaults + file map |
| A1 | `API-*` | `DEC-001` | `app/shared`, route shell, service interface contracts | Context algorithms, UI panels | Contract tests + route-shell integration |
| A2 | `PLAN-*`, `DECOMP-*` | `API-001`, `API-002`, `API-004` | Planning Intake, decomposition provider/service/routes | Team/capacity, allocation scoring | Unit + integration focused run |
| A3 | `TEAM-*` | `API-001`, `API-002`, `API-004` | Team, skill taxonomy, sprint capacity services/routes | Decomposition, allocation scoring | Unit + integration focused run |
| A4 | `ALLOC-*` | `DECOMP-002`, `TEAM-002` | Allocation engine/service/routes | Report renderer, UI shell | Optimizer unit + allocation integration |
| A5 | `REP-*` | `ALLOC-003` | Report renderer/repo/routes/client contract | Allocation score math | Report unit + integration |
| A6 | `UI-*` | `API-002`, stable route shell | Frontend client and dashboard experience | Backend domain internals | Frontend unit tests |
| A7 | `E2E-*`, `QG-*`, `DOC-*` | P1 backend + P2 UI stable | E2E fixtures, final gates, docs, Codesight refresh | Feature internals except verified fixes | Build/test/e2e/quality |

## Coordination Points

| Shared file/area | Owner lane | Rule |
| --- | --- | --- |
| `app/shared/src/index.ts` | A1 | Other agents wait for DTO names or add changes through A1. |
| `app/backend/src/routes.ts` | A1 first, then context agents | Route shell lands first; context agents fill only their endpoint blocks. |
| `app/backend/src/app.ts` | A1 | Service construction changes coordinated in one lane. |
| `app/frontend/src/shared/api/client.ts` | A6 | Backend agents do not edit client methods. |
| `app/frontend/src/features/delivery/DeliveryDashboard.tsx` | A6 | UI lane owns tab layout and visible states. |
| Lockfile/package scripts | A7 | Avoid dependency/script churn unless gate failure proves need. |

## Local Quality Gate

| Tool | Command | Task IDs | Blocks release |
| --- | --- | --- | --- |
| Build | `corepack pnpm build` | `QG-001` | Yes |
| Unit/all package tests | `corepack pnpm test` | `QG-001` | Yes |
| Backend integration | `corepack pnpm test:integration` | `QG-001` | Yes |
| Frontend e2e | `corepack pnpm test:e2e` | `QG-002` | Yes |
| Coverage + type lint | `corepack pnpm quality` | `QG-002` | Yes |
| Sonar config check | `app/sonar-project.properties` lcov paths | `QG-002` | Yes if Sonar gate is active locally |
| Codesight refresh | project Codesight command | `DOC-001` | Yes for updated AI map |

## Acceptance Matrix

| Flow | Unit | Integration | E2E |
| --- | --- | --- | --- |
| Planning input from manual/Jira | `PLAN-001` | `DECOMP-003` | `E2E-002` |
| Heuristic decomposition | `DECOMP-001` | `DECOMP-003` | `E2E-002` |
| Team/skill/capacity admin | `TEAM-001` | `TEAM-004` | `E2E-002` |
| Smart allocation | `ALLOC-001` | `ALLOC-004` | `E2E-002` |
| Report JSON/Markdown | `REP-001` | `REP-003` | `E2E-002` |
| Dashboard experience | `UI-001`..`UI-005` | Backend routes above | `E2E-002` |

## Open Decisions

- Keep `@module1/contracts` package name for v1; rename later only if project branding matters.
- Keep OpenRouter as P2 adapter; heuristic provider is required for stable tests.
- Keep Markdown export as MVP; PDF stays out of scope.
- No Jira write/comment/assignee update in Modul 2 v1.

## Verification

- Task count: 32 unchecked tasks.
- Sub-agent lanes: 8 lanes; 6 can run after shared contracts/route shell.
- Source coverage: input docs, Codesight route/component map, shared contracts, backend routes/app/http/catalog/identity, frontend client/dashboard/tests, package scripts, Sonar config.
- Test coverage: unit, integration, frontend unit, e2e, build, coverage, lint, quality.
- Quality gate coverage: local commands only; no new CI invented.
- Granularity: medium atomic packs, intentionally not field-by-field.
