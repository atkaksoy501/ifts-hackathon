# Modul 2 Plani: Task Decomposition & Smart Allocation

## Kaynak Okuma Notu

- `.codesight/wiki/index.md` repo icinde yok. Onun yerine `.codesight/CODESIGHT.md`, `.codesight/routes.md`, `.codesight/components.md`, Modul 1 plan/task/docs ve gercek kaynak dosyalari okundu.
- Mevcut app: `app/` TypeScript monorepo, Express backend, React/Vite frontend, shared Zod contracts.
- Mevcut backend: in-memory DDD servisler, `/api` route yapisi, httpOnly JWT cookie auth, admin role guard, merkezi `ErrorEnvelope`.
- Mevcut frontend: tek dashboard, mock data, local shadcn-style UI primitive'leri, TanStack Query dependency hazir.
- Modul 2 sadece planlanir. Bu dosya app kodu degistirmez.

## Modul 2 Amaci

High-level Jira story/task + acceptance criteria girdisini al, teknik alt islere bol, team skill/capacity verisiyle en uygun kisilere ata, sonuc raporu uret.

Ana ciktialar:

- Teknik alt gorev kirilimi: `Frontend`, `Backend`, `Database`, `QA/Test`, gerekiyorsa `Integration`, `DevOps`, `Security`, `UX/Docs`, `Data/AI`.
- Akilli atama onerisi: en uygun ve musait ekip uyesi, alternatifler, risk, kapasite etkisi.
- Rapor: kirilim + atama + utilization + risk + uyarilar + karar gerekceleri.

## Modul 1 ile Baglanti

- Auth/admin guard aynen kullanilir.
- Task input kaynagi Modul 1 backlog issue olabilir: `GET /api/backlog`, `JiraIssueDto`.
- Modul 2 kendi context'lerini ekler; `Predictive Sizing` ve `Blockage Advisory` domain logic'ine dokunmaz.
- `@module1/contracts` hackathon hizi icin genisletilir. Paket rename (`@hackathon/contracts`) P2 kararidir.
- Reporting UI, mevcut `DeliveryDashboard` icine yeni tab olarak baslayabilir; buyurse `features/planning` altina ayrilir.

## P0 - Acik Sorular / Kararlar

Bu sorular cevaplanmadan implementasyonda gri alan kalir. Her karar icin onerilen default yazildi.

- [ ] DEC-201 Input kaynagi: sadece serbest metin mi, Jira issue secimi + serbest metin mi? Default: ikisi de.
- [ ] DEC-202 Acceptance criteria formati: plain text mi, madde listesi mi, Gherkin desteklensin mi? Default: plain text + madde listesi.
- [ ] DEC-203 Output dili: UI ve rapor Turkce mi, teknik task title'lari Ingilizce mi? Default: UI Turkce, domain labels Ingilizce.
- [ ] DEC-204 AI provider: MVP deterministic heuristic mi, OpenRouter adapter hemen mi? Default: heuristic MVP, OpenRouter P2.
- [ ] DEC-205 Jira/company text privacy: dis LLM'e gondermeden once anonimlestirme zorunlu mu? Default: zorunlu.
- [ ] DEC-206 Prompt ve model ciktisi loglanacak mi? Default: raw prompt log yok, sadece run metadata + normalized output.
- [ ] DEC-207 Team skill olcegi: 0-5, 1-5, beginner/intermediate/senior? Default: 0-5 numeric.
- [ ] DEC-208 Skill taxonomy kim belirler: admin UI mi, sabit liste mi? Default: admin CRUD + seed list.
- [ ] DEC-209 Capacity birimi: saat mi, story point mi, ikisi mi? Default: saat primary, SP optional.
- [ ] DEC-210 Sprint capacity kaynagi: manuel UI mi, Jira sprint read model mi, ikisi mi? Default: manuel + Jira context snapshot.
- [ ] DEC-211 Current workload hesabi: sadece Modul 2 assignment mi, Jira assignee workload de dahil mi? Default: manuel committedHours + Modul 2 allocation.
- [ ] DEC-212 Max velocity hard limit mi, warning mi? Default: hard limit, admin override ile warning.
- [ ] DEC-213 Task dependency ordering assignment'i etkilesin mi? Default: evet, blocked task atanir ama start warning alir.
- [ ] DEC-214 Multi-owner task desteklensin mi? Default: MVP tek primary owner, P2 collaborator.
- [ ] DEC-215 Assignment objective onceligi: skill fit, risk dusurme, load balance, hiz? Default: risk-adjusted skill fit > capacity > balance.
- [ ] DEC-216 Unassigned task izinli mi? Default: evet, constraint saglanmazsa `unassigned` + reason.
- [ ] DEC-217 Rapor formatlari: JSON, Markdown, PDF? Default: JSON + Markdown; PDF P2.
- [ ] DEC-218 Rapor persist edilsin mi, yoksa anlik mi? Default: persist + versioned report run.
- [ ] DEC-219 Kimler team matrix/capacity duzenler? Default: admin only; normal user read.
- [ ] DEC-220 Audit trail gerekli mi? Default: assignment override ve matrix/capacity edit audit P2.

## Bounded Contexts

### 1. Planning Intake

Amac: story/task inputunu normalize eder, source snapshot olusturur.

Sahip oldugu isler:

- Free-form story/task + acceptance criteria alma.
- Jira issue key ile Modul 1 catalog'dan issue snapshot alma.
- Input language, projectKey, source type, tags, constraints saklama.
- Eksik acceptance criteria, cok kisa aciklama, belirsiz scope warning uretme.

Sahip olmadigi isler:

- Teknik bolme algoritmasi.
- Ekip atamasi.
- Rapor rendering.

Public contract:

- `POST /api/planning-inputs`
- `GET /api/planning-inputs/:id`

### 2. Technical Decomposition

Amac: high-level task'i disiplinlere gore test edilebilir sub-task'lara boler.

Sahip oldugu isler:

- Domain-specific prompt/heuristic pipeline.
- Engineering dimension detection: UI, API, domain, DB, test, integration, security, docs.
- Sub-task DTO uretimi: title, domain, description, deliverables, acceptance checks, required skills, dependencies, estimate, risk, confidence.
- Deterministic fallback ve malformed AI output normalizer.
- Decomposition run persistence.

Sahip olmadigi isler:

- Team member secimi.
- Sprint capacity karari.
- Jira issue write.

Public contract:

- `POST /api/decompositions/run`
- `GET /api/decompositions/:id`

### 3. Team Capability & Capacity

Amac: ekip uyelikleri, yetkinlik matrisi, sprint kapasitesi ve mevcut yuk bilgisini yonetir.

Sahip oldugu isler:

- Team member CRUD.
- Skill taxonomy + level matrix.
- Sprint capacity log: availabilityHours, committedHours, maxVelocity, timeOffHours, wipLimit.
- Active/inactive member state.
- Capacity validation ve admin-only edit.

Sahip olmadigi isler:

- Decomposition karar logic'i.
- Assignment optimizer score hesaplama.

Public contract:

- `GET /api/team/members`
- `POST /api/team/members`
- `PATCH /api/team/members/:id`
- `GET /api/team/skills`
- `PUT /api/team/skills`
- `GET /api/sprint-capacity/current`
- `PUT /api/sprint-capacity/current`

### 4. Smart Allocation

Amac: sub-task'lari en uygun ve musait ekip uyelerine atar.

Sahip oldugu isler:

- Multi-constraint allocation score.
- Hard constraints: active member, remaining capacity, max velocity, required minimum skill, role/admin policy.
- Soft constraints: load balance, skill depth, domain preference, context continuity, risk seniority fit.
- Alternative owner listesi.
- Utilization before/after.
- Unassigned reason ve risk warning.
- Manual override input modeli P2.

Sahip olmadigi isler:

- Team data CRUD.
- Rapor dokuman rendering.
- Jira assignee write.

Public contract:

- `POST /api/allocations/recommend`
- `GET /api/allocations/:id`

### 5. Reporting Engine

Amac: decomposition + allocation sonucunu strukturize rapora donusturur.

Sahip oldugu isler:

- Report run olusturma.
- JSON report DTO.
- Markdown report render.
- Risk/utilization summary.
- Warnings, assumptions, unanswered decision list.
- Report history/version.

Sahip olmadigi isler:

- PDF generation MVP.
- Email/Slack/Jira publish.

Public contract:

- `POST /api/reports/task-allocation`
- `GET /api/reports/task-allocation/:id`
- `GET /api/reports/task-allocation/:id/markdown`

### 6. Delivery Experience - Modul 2 UI

Amac: kullanicinin task girip kirilim, atama ve raporu tek akista gormesini saglar.

Sahip oldugu isler:

- Story/task input formu.
- Acceptance criteria editor.
- Jira issue select/search integration.
- Decomposition result table.
- Team matrix/capacity admin screens.
- Allocation board + utilization bars.
- Report preview + Markdown export.

Sahip olmadigi isler:

- Domain/optimizer hesaplama.
- DB persistence.

Public contract:

- Backend DTO'lari.
- Turkce dictionary keys.
- Existing session/auth state.

## Database Tasarimi

Mongo collections:

- `planning_inputs`: source snapshot, description, acceptance criteria, projectKey, createdBy, createdAt.
- `decomposition_runs`: inputId, provider, promptVersion, subTasks, warnings, confidence, createdAt.
- `team_members`: name, role, active, skills, domainPreferences, createdAt, updatedAt.
- `skill_taxonomy`: skill key, label, domain, active.
- `sprint_capacity_logs`: sprintId, member capacities, committed load, max velocity, time off, updatedAt.
- `allocation_runs`: decompositionRunId, recommendations, utilization, unassigned, warnings, score, createdAt.
- `task_allocation_reports`: allocationRunId, json, markdown, createdAt, createdBy.

Indexes:

- `planning_inputs.createdAt`
- `decomposition_runs.inputId`
- `team_members.active`
- `team_members.skills.key`
- `sprint_capacity_logs.sprintId`
- `allocation_runs.decompositionRunId`
- `task_allocation_reports.allocationRunId`

## API / DTO Taslagi

### Core Types

```ts
type EngineeringDomain =
  | "frontend"
  | "backend"
  | "database"
  | "qa"
  | "integration"
  | "devops"
  | "security"
  | "ux"
  | "docs"
  | "data-ai"
  | "other";

type PlanningInputDto = {
  id: string;
  sourceType: "manual" | "jira-issue";
  issueKey?: string;
  projectKey?: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  constraints: string[];
  warnings: WarningDto[];
  createdBy: string;
  createdAt: string;
};

type TechnicalSubTaskDto = {
  id: string;
  domain: EngineeringDomain;
  title: string;
  description: string;
  deliverables: string[];
  acceptanceChecks: string[];
  requiredSkills: Array<{ key: string; minLevel: number; weight: number }>;
  dependencies: string[];
  estimateHours: number;
  risk: "low" | "medium" | "high";
  confidence: number;
  rationale: string;
};

type DecompositionRunDto = {
  id: string;
  inputId: string;
  provider: "heuristic" | "openrouter";
  promptVersion: string;
  subTasks: TechnicalSubTaskDto[];
  warnings: WarningDto[];
  createdAt: string;
};

type TeamMemberDto = {
  id: string;
  displayName: string;
  role: string;
  active: boolean;
  skills: Array<{ key: string; level: number }>;
  domainPreferences: EngineeringDomain[];
  createdAt: string;
  updatedAt: string;
};

type SprintCapacityDto = {
  sprintId: string;
  memberCapacities: Array<{
    memberId: string;
    availabilityHours: number;
    committedHours: number;
    maxVelocityPoints?: number;
    timeOffHours: number;
    wipLimit?: number;
  }>;
  updatedAt: string;
};

type AssignmentRecommendationDto = {
  subTaskId: string;
  memberId?: string;
  score: number;
  fitBreakdown: {
    skillFit: number;
    availabilityFit: number;
    balanceFit: number;
    riskFit: number;
    continuityFit: number;
  };
  reasons: string[];
  alternatives: Array<{ memberId: string; score: number; reasons: string[] }>;
  warnings: WarningDto[];
};

type AllocationRunDto = {
  id: string;
  decompositionRunId: string;
  sprintId: string;
  recommendations: AssignmentRecommendationDto[];
  utilization: Array<{
    memberId: string;
    beforeHours: number;
    assignedHours: number;
    afterHours: number;
    capacityHours: number;
    utilizationPercent: number;
  }>;
  riskSummary: string;
  warnings: WarningDto[];
  createdAt: string;
};
```

### Routes

- `POST /api/planning-inputs`: create normalized task input.
- `GET /api/planning-inputs/:id`: fetch source snapshot.
- `POST /api/decompositions/run`: run decomposition from inputId or inline input.
- `GET /api/decompositions/:id`: fetch decomposition run.
- `GET /api/team/members`: list team members.
- `POST /api/team/members`: admin create member.
- `PATCH /api/team/members/:id`: admin update member/skills/active.
- `GET /api/team/skills`: list skill taxonomy.
- `PUT /api/team/skills`: admin replace skill taxonomy.
- `GET /api/sprint-capacity/current`: fetch current capacity log.
- `PUT /api/sprint-capacity/current`: admin upsert capacity log.
- `POST /api/allocations/recommend`: run optimizer for decompositionRunId + sprintId.
- `GET /api/allocations/:id`: fetch allocation run.
- `POST /api/reports/task-allocation`: create report from allocationRunId.
- `GET /api/reports/task-allocation/:id`: fetch report JSON.
- `GET /api/reports/task-allocation/:id/markdown`: fetch Markdown report.

## AI / Heuristic Logic

MVP provider: deterministic `HeuristicDecompositionProvider`.

Pipeline:

1. Normalize input text and acceptance criteria.
2. Detect verbs/nouns/domain signals: UI, endpoint, persistence, integration, auth/security, analytics/reporting, tests.
3. Map signals to engineering domains.
4. Generate sub-task candidates from templates.
5. Merge duplicates and remove too-small tasks.
6. Add required skill tags and min levels.
7. Add dependencies: DB before backend persistence, contracts before backend/frontend, backend before e2e.
8. Estimate hours using scope/risk/rules.
9. Emit warnings when AC missing, domain ambiguity high, or task too broad.

P2 provider: `OpenRouterDecompositionProvider`.

- Uses same interface.
- Runs anonymizer before external call.
- Validates output with Zod schema.
- Falls back to heuristic on provider failure.
- Stores promptVersion + provider metadata, not raw sensitive prompt by default.

## Allocation Algorithm

MVP: deterministic constrained scoring + local rebalance.

Hard constraints:

- Member active.
- Remaining hours >= task estimate unless override.
- Required skill level meets minLevel for all hard required skills.
- WIP limit not exceeded when configured.
- Admin-only tasks need admin-capable role if task has `security/admin` flag.

Score:

```txt
score =
  skillFit * 0.40 +
  availabilityFit * 0.25 +
  riskFit * 0.15 +
  balanceFit * 0.15 +
  continuityFit * 0.05
```

Risk rule:

- `high` risk task prefers strongest relevant skill and lower utilization.
- `medium` risk can favor balance.
- `low` risk can fill remaining capacity.

Output rule:

- Pick best valid owner.
- Keep top 2 alternatives.
- If no valid owner, mark unassigned with reason.
- Recompute utilization after each assignment.
- Run one rebalance pass to reduce overloaded members.

## Frontend UX Plan

New primary flow:

1. User picks Jira issue or enters manual task.
2. User edits acceptance criteria.
3. Click "Gorevlere Bol".
4. UI shows sub-task table grouped by domain.
5. Admin/team lead checks team matrix/capacity.
6. Click "Akilli Ata".
7. UI shows assignments, alternatives, utilization, risk warnings.
8. Click "Rapor Olustur".
9. UI previews Markdown report and can download/copy Markdown.

Screens/components:

- `TaskDecompositionPanel`
- `AcceptanceCriteriaEditor`
- `SubTaskBreakdownTable`
- `TeamMatrixAdmin`
- `SprintCapacityPanel`
- `AllocationRecommendations`
- `UtilizationSummary`
- `TaskAllocationReportPreview`

Design constraints:

- Same restrained dashboard style as Modul 1.
- No landing page.
- Dense tables, clear empty/error/loading states.
- Long task text wraps safely on mobile.
- Icons from `lucide-react`.

## Atomic Backlog

### P0 - Decisions

- [ ] DEC-201..DEC-220 Answer open questions above and lock MVP defaults.
- [ ] DEC-221 Confirm package naming: keep `@module1/contracts` or rename to project-level package.
- [ ] DEC-222 Confirm report export MVP: Markdown only or Markdown + PDF.

### P0 - Shared Contracts

- [ ] M2API-001 Add Zod schemas/types for planning input, decomposition run, sub-task, team member, skill taxonomy, sprint capacity, allocation run, report.
- [ ] M2API-002 Add request/response schemas for all Modul 2 routes and contract unit tests.
- [ ] M2API-003 Add shared warning/error codes for ambiguous input, insufficient team data, over capacity, unassigned task, provider fallback.
- [ ] M2API-004 Add DTO drift tests for frontend API client and backend route responses.

### P0 - Backend Foundation

- [ ] M2BE-001 Add Modul 2 service interfaces and in-memory repositories matching current scaffold style.
- [ ] M2BE-002 Add Mongo repository contracts and index plan without wiring prod persistence yet.
- [ ] M2BE-003 Add auth/admin policy matrix for team/capacity edits vs normal recommendation reads.
- [ ] M2BE-004 Add Express route shell under existing `/api`, with integration tests for auth, validation, and error envelopes.

### P1 - Planning Intake

- [ ] M2IN-001 Add unit tests for manual input normalization, AC parsing, constraints, warnings.
- [ ] M2IN-002 Implement `PlanningInputService` with manual input and Jira issue snapshot support.
- [ ] M2IN-003 Add `POST /api/planning-inputs` and `GET /api/planning-inputs/:id` integration tests.
- [ ] M2IN-004 Persist planning input snapshot and createdBy user metadata.

### P1 - Technical Decomposition

- [ ] M2DEC-001 Add fixtures for frontend/backend/db/qa/security/integration mixed stories.
- [ ] M2DEC-002 Add failing unit tests for domain detection, sub-task merging, required skills, dependencies, risk, estimate, warnings.
- [ ] M2DEC-003 Implement `HeuristicDecompositionProvider` with deterministic output.
- [ ] M2DEC-004 Implement AI provider interface, output normalizer, Zod validation, fallback warning path.
- [ ] M2DEC-005 Add `DecompositionService` persistence and `POST /api/decompositions/run` route.
- [ ] M2DEC-006 Add integration tests for inline input, inputId input, malformed/underspecified AC, and auth.

### P1 - Team Capability & Capacity

- [ ] M2TEAM-001 Add seed skill taxonomy: React, TypeScript, Express, MongoDB, Zod, API design, QA, Playwright, Vitest, DevOps, Security, AI prompting.
- [ ] M2TEAM-002 Add unit tests for skill level validation, duplicate skills, active/inactive members.
- [ ] M2TEAM-003 Implement team member service and admin CRUD routes.
- [ ] M2TEAM-004 Implement sprint capacity service with availability, committed load, max velocity, time off, WIP limit.
- [ ] M2TEAM-005 Add integration tests for admin-only edits, normal-user read, invalid capacity, inactive member handling.

### P1 - Smart Allocation

- [ ] M2ALLOC-001 Add optimizer fixtures for balanced team, over-capacity team, missing skill, high-risk task, dependency-heavy task.
- [ ] M2ALLOC-002 Add unit tests for hard constraints, score formula, alternatives, unassigned reason, utilization math.
- [ ] M2ALLOC-003 Implement allocation scoring engine and deterministic assignment order.
- [ ] M2ALLOC-004 Implement local rebalance pass and risk summary.
- [ ] M2ALLOC-005 Add `AllocationService` persistence and `POST /api/allocations/recommend` route.
- [ ] M2ALLOC-006 Add integration tests for allocation run from real decompositionRunId + capacity log.

### P1 - Reporting Engine

- [ ] M2REP-001 Define report JSON structure and Markdown template.
- [ ] M2REP-002 Add unit tests for report sections, utilization summary, unassigned tasks, warnings, assumptions.
- [ ] M2REP-003 Implement report renderer and persistence.
- [ ] M2REP-004 Add report routes for JSON and Markdown.
- [ ] M2REP-005 Add integration tests for report generation from allocationRunId.

### P2 - Frontend Experience

- [ ] M2UI-001 Extend API client with planning/decomposition/team/capacity/allocation/report methods and tests.
- [ ] M2UI-002 Add Modul 2 dashboard tab/route and dictionary keys.
- [ ] M2UI-003 Implement task input + AC editor with Jira issue select and manual mode.
- [ ] M2UI-004 Implement decomposition grouped table with loading/error/empty states.
- [ ] M2UI-005 Implement team matrix and sprint capacity admin screens.
- [ ] M2UI-006 Implement allocation recommendations with alternatives, warnings, and utilization bars.
- [ ] M2UI-007 Implement report preview and Markdown download/copy.
- [ ] M2UI-008 Add frontend unit tests for core states and permission visibility.

### P2 - E2E, Quality, Docs

- [ ] M2E2E-001 Add seed fixtures for team members, skills, capacity, planning input, decomposition run.
- [ ] M2E2E-002 Add e2e: login -> select task -> decompose -> allocate -> generate report.
- [ ] M2E2E-003 Add e2e: admin edits capacity -> allocation changes owner/utilization.
- [ ] M2QG-001 Run build, unit, integration, e2e, coverage, quality.
- [ ] M2QG-002 Update Codesight after source implementation.
- [ ] M2DOC-001 Add Modul 2 API/DDD docs after contracts lock.

## Parallel Agent Plan

| Agent | Task range | Can start after | Owns | Must not touch | Verify |
| --- | --- | --- | --- | --- | --- |
| B1 | `M2API-*`, `M2BE-*` | Decisions locked | Shared contracts, route shells, service interfaces | UI implementation | Contract + backend integration |
| B2 | `M2IN-*`, `M2DEC-*` | `M2API-001`, `M2BE-001` | Planning intake, decomposition provider/service | Team/capacity optimizer | Unit + decomposition integration |
| B3 | `M2TEAM-*` | `M2API-001`, `M2BE-001` | Team matrix, skill taxonomy, capacity logs | Decomposition logic | Team/capacity integration |
| B4 | `M2ALLOC-*` | `M2DEC-003`, `M2TEAM-004` | Optimizer, allocation persistence/routes | UI report screens | Optimizer unit + allocation integration |
| B5 | `M2REP-*` | `M2ALLOC-005` | Report renderer/routes/templates | Optimizer scoring | Report unit + integration |
| B6 | `M2UI-*` | Route contracts stable | React Modul 2 experience | Backend domain logic | Frontend unit + visual/e2e |
| B7 | `M2E2E-*`, `M2QG-*`, `M2DOC-*` | P1 backend + P2 UI stable | Fixtures, e2e, quality, docs, Codesight refresh | Feature internals except bug fixes | Build/test/e2e/coverage |

## Local Quality Gate

| Tool | Command | Blocks release |
| --- | --- | --- |
| Build | `corepack pnpm build` | Yes |
| Unit/integration | `corepack pnpm test` | Yes |
| E2E smoke | `corepack pnpm --filter @module1/frontend test:e2e` | Yes |
| Coverage | `corepack pnpm coverage` | Yes |
| Type/lint | `corepack pnpm lint` | Yes |
| Quality aggregate | `corepack pnpm quality` | Yes |
| Docker boot | `corepack pnpm docker:up` | Yes before demo |

## Acceptance Criteria

- A user can create or select a high-level task and provide acceptance criteria.
- System returns structured sub-task breakdown across required technical domains.
- Each sub-task has domain, deliverables, acceptance checks, required skills, dependencies, estimate, risk, confidence.
- Admin can maintain team skill matrix and sprint capacity.
- System recommends assignments that respect capacity, skill, velocity/WIP constraints.
- Recommendations include score breakdown, reasons, alternatives, unassigned warnings, utilization impact.
- System generates persisted JSON + Markdown report.
- Auth, admin edit permissions, validation, error envelopes match existing app style.
- Unit, integration, frontend, and e2e tests cover happy path and major warning paths.

## Risk Register

- AI nondeterminism can create unstable tests. Mitigation: heuristic MVP + schema validation + golden fixtures.
- Team matrix can be stale. Mitigation: visible updatedAt + warnings + admin edit flow.
- Capacity constraints can make assignment impossible. Mitigation: unassigned state + explicit reason.
- Scope can grow into Jira write/assignment automation. Mitigation: no Jira write in MVP.
- Package naming `@module1/*` may confuse Modul 2. Mitigation: keep for speed, add P2 rename decision.
- Report PDF can consume time. Mitigation: Markdown MVP.

## Verification

- Checklist count: 71 unchecked lines total.
- Open question count: 20 decision questions.
- Atomic backlog count: 51 tasks total; 3 decision tasks + 48 delivery tasks.
- Medium granularity preserved: one task = one testable edit set.
- DDD lanes exist: contracts, backend foundation, intake, decomposition, team/capacity, allocation, reporting, UI, e2e/quality/docs.
- Mini-agent map exists.
- Codesight used; missing wiki index noted.
- File is ASCII for safe PowerShell/git display.
