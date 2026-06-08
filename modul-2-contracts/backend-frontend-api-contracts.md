# Modul 2 Backend/Frontend API Kontratlari

## 1. Purpose

Bu dokuman, Modul 2 Task Decomposition & Smart Allocation icin React/Vite frontend ile Express backend arasindaki v1 JSON REST kontratini tanimlar.

Kapsam: planning input, Jira issue snapshot, technical decomposition, team skill matrix, sprint capacity, smart allocation, JSON + Markdown allocation report.

Modul 2, mevcut Identity & Access session cookie yapisini ve Work Item Catalog `JiraIssueDto` read model'ini kullanir. Predictive Sizing ve Blockage Advisory domain logic'i bu kontratin parcasi degildir.

## 2. Contract Rules

- Base path: `/api`.
- Request/response format: `application/json`.
- Auth: tum Modul 2 endpoint'leri httpOnly JWT cookie session ister. Frontend fetch cagrilarinda `credentials: "include"` kullanir.
- Admin: team member, skill taxonomy ve sprint capacity write endpoint'leri `admin` role ister.
- Frontend `createdBy`, `userId`, `accountId` veya owner context id gondermez. Backend bunlari session'dan cozer.
- ID alanlari opaque string'dir; frontend id formatina anlam yuklemez.
- Tarihler ISO-8601 string'dir.
- Score ve confidence alanlari `0..1` araligindadir.
- Skill level `0..5` integer'dir.
- Estimate ve capacity MVP'de hour birimindedir. Story point sadece optional metadata'dir.
- Context'ler private aggregate/entity shape dondurmez; DTO, query, command input veya read model dondurur.
- `WarningDto` non-blocking sinyaldir. Missing AC, low confidence, provider fallback, stale capacity ve unassigned task warning olarak doner.
- Blocking hata response'lari mevcut `ErrorEnvelope` kullanir. Modul 2 warning code'lari `ErrorEnvelope.error.code` union'ina eklenmez.
- Raw prompt, raw external provider payload veya sensitive Jira/company text persist edilmez.
- Jira write, Jira assignment update, comment, transition, Slack/email publish ve PDF export v1 disidir.

### Shared Error Envelope

```ts
type ErrorEnvelope = {
  error: {
    code:
      | "INVALID_REQUEST"
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "CONFLICT"
      | "SYNC_FAILED"
      | "INTERNAL_ERROR";
    message: string;
    details?: Record<string, unknown>;
    correlationId: string;
  };
};
```

Meaningful status set:

| Status | Kullanim |
| --- | --- |
| `400` | Invalid body, query, path param veya validation fail. |
| `401` | Missing/invalid session cookie. |
| `403` | Auth var, yetki yok veya user disabled. |
| `404` | Resource yok veya gorunur/aktif degil. |
| `409` | Invariant/uniqueness conflict. |
| `500` | Beklenmeyen backend hatasi. |

## 3. Common DTOs

Mevcut shared DTO'lar tekrar kullanilir: `WarningDto`, `PageInfoDto`, `SessionUserDto`, `JiraIssueDto`, `ErrorEnvelope`.

```ts
type WarningDto = {
  code: string;
  message: string;
  severity: "info" | "warning";
};

type PageInfoDto = {
  page: number;
  pageSize: number;
  total: number;
};

type JiraIssueDto = {
  key: string;
  projectKey: string;
  summary: string;
  description?: string;
  issueType?: string;
  statusCategory?: string;
  statusName?: string;
  sprintIds: string[];
  storyPoints?: number;
  timeSpentHours?: number;
  labels: string[];
  components: string[];
  updatedAt?: string;
};

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

type RiskLevel = "low" | "medium" | "high";
type ProviderName = "heuristic" | "openrouter";
type SourceType = "manual" | "jira-issue";

type PlanningInputSourceSnapshotDto = {
  sourceType: SourceType;
  manual?: {
    title: string;
    description: string;
  };
  jiraIssue?: JiraIssueDto;
  capturedAt: string;
};

type PlanningInputDto = {
  id: string;
  sourceType: SourceType;
  issueKey?: string;
  projectKey?: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  constraints: string[];
  tags: string[];
  sourceSnapshot: PlanningInputSourceSnapshotDto;
  warnings: WarningDto[];
  createdBy: string;
  createdAt: string;
};

type RequiredSkillDto = {
  key: string;
  minLevel: number;
  weight: number;
};

type TechnicalSubTaskDto = {
  id: string;
  domain: EngineeringDomain;
  title: string;
  description: string;
  deliverables: string[];
  acceptanceChecks: string[];
  requiredSkills: RequiredSkillDto[];
  dependencies: string[];
  estimateHours: number;
  risk: RiskLevel;
  confidence: number;
  rationale: string;
};

type DecompositionRunDto = {
  id: string;
  inputId: string;
  provider: ProviderName;
  promptVersion: string;
  subTasks: TechnicalSubTaskDto[];
  warnings: WarningDto[];
  createdAt: string;
};

type SkillDefinitionDto = {
  key: string;
  label: string;
  domain: EngineeringDomain;
  active: boolean;
  createdAt: string;
  updatedAt: string;
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
  warnings: WarningDto[];
  updatedAt: string;
};

type FitBreakdownDto = {
  skillFit: number;
  availabilityFit: number;
  balanceFit: number;
  riskFit: number;
  continuityFit: number;
};

type AssignmentRecommendationDto = {
  subTaskId: string;
  memberId?: string;
  score: number;
  fitBreakdown: FitBreakdownDto;
  reasons: string[];
  alternatives: Array<{
    memberId: string;
    score: number;
    reasons: string[];
  }>;
  warnings: WarningDto[];
};

type UnassignedTaskDto = {
  subTaskId: string;
  reason: string;
  blockingConstraints: string[];
  warnings: WarningDto[];
};

type UtilizationRowDto = {
  memberId: string;
  beforeHours: number;
  assignedHours: number;
  afterHours: number;
  capacityHours: number;
  utilizationPercent: number;
};

type AllocationRunDto = {
  id: string;
  decompositionRunId: string;
  sprintId: string;
  recommendations: AssignmentRecommendationDto[];
  unassigned: UnassignedTaskDto[];
  utilization: UtilizationRowDto[];
  riskSummary: string;
  warnings: WarningDto[];
  createdAt: string;
};

type ReportSummaryDto = {
  totalSubTasks: number;
  assignedCount: number;
  unassignedCount: number;
  totalEstimateHours: number;
  highRiskCount: number;
};

type ReportSectionDto = {
  key: string;
  title: string;
  items: string[];
};

type TaskAllocationReportDto = {
  id: string;
  allocationRunId: string;
  decompositionRunId: string;
  sprintId: string;
  version: number;
  title: string;
  summary: ReportSummaryDto;
  sections: ReportSectionDto[];
  markdown: string;
  warnings: WarningDto[];
  assumptions: string[];
  createdBy: string;
  createdAt: string;
};
```

Recommended warning codes:

| Code | Owner | Meaning |
| --- | --- | --- |
| `MISSING_ACCEPTANCE_CRITERIA` | Planning Intake | AC yok; flow devam eder. |
| `SHORT_DESCRIPTION` | Planning Intake | Input az; confidence dusebilir. |
| `AMBIGUOUS_SCOPE` | Planning Intake / Decomposition | Scope net degil. |
| `PROVIDER_FALLBACK_USED` | Technical Decomposition | OpenRouter/AI output fail; heuristic kullanildi. |
| `LOW_DECOMPOSITION_CONFIDENCE` | Technical Decomposition | Sub-task guveni dusuk. |
| `STALE_TEAM_DATA` | Team Capability & Capacity | Skill/capacity guncel olmayabilir. |
| `OVER_CAPACITY` | Team Capability & Capacity / Smart Allocation | Capacity limit asildi veya asilmak uzere. |
| `MISSING_REQUIRED_SKILL` | Smart Allocation | Uygun skill yok. |
| `TASK_UNASSIGNED` | Smart Allocation | Owner atanamadi. |
| `HIGH_RISK_WITHOUT_SENIOR_FIT` | Smart Allocation | High risk task icin senior fit yok. |

## 4. Public API by Owning Context

### Planning Intake

#### `POST /api/planning-inputs`

Auth: user.

Request:

```ts
type CreateManualPlanningInputRequest = {
  sourceType: "manual";
  title: string;
  description: string;
  projectKey?: string;
  acceptanceCriteria?: string[];
  constraints?: string[];
  tags?: string[];
};

type CreateJiraPlanningInputRequest = {
  sourceType: "jira-issue";
  issueKey: string;
  projectKey?: string;
  acceptanceCriteria?: string[];
  constraints?: string[];
  tags?: string[];
};

type CreatePlanningInputRequest =
  | CreateManualPlanningInputRequest
  | CreateJiraPlanningInputRequest;
```

Response `201`:

```ts
type CreatePlanningInputResponse = {
  planningInput: PlanningInputDto;
};
```

Rules:

- Manual input requires non-empty `title` and `description`.
- Jira issue input requires `issueKey`; backend resolves `JiraIssueDto` from Catalog and freezes it into `sourceSnapshot`.
- `createdBy` comes from session, never from frontend.
- Missing AC returns `MISSING_ACCEPTANCE_CRITERIA` warning, not error.
- Jira issue not found returns `404`.

Errors: `400`, `401`, `403`, `404`.

#### `GET /api/planning-inputs/:id`

Auth: user.

Response `200`:

```ts
type GetPlanningInputResponse = {
  planningInput: PlanningInputDto;
};
```

Rules:

- Source snapshot is immutable.
- Frontend renders warning list exactly as returned.

Errors: `400`, `401`, `403`, `404`.

### Technical Decomposition

#### `POST /api/decompositions/run`

Auth: user.

Request:

```ts
type RunDecompositionRequest = {
  inputId?: string;
  input?: CreatePlanningInputRequest;
  provider?: ProviderName;
};
```

Response `201`:

```ts
type RunDecompositionResponse = {
  decompositionRun: DecompositionRunDto;
};
```

Rules:

- Exactly one of `inputId` or `input` is required.
- `provider` defaults to `"heuristic"`.
- If `input` is sent, backend first creates a planning input, then runs decomposition.
- Each returned sub-task has `domain`, `deliverables`, `acceptanceChecks`, `requiredSkills`, `dependencies`, `estimateHours`, `risk`, `confidence`, `rationale`.
- `estimateHours` must be `> 0`.
- `dependencies` must reference sub-task ids inside same run.
- OpenRouter P2 output must pass Zod validation; malformed/unavailable provider falls back to heuristic and adds `PROVIDER_FALLBACK_USED`.
- Raw prompt is not persisted.

Errors: `400`, `401`, `403`, `404`, `500`.

#### `GET /api/decompositions/:id`

Auth: user.

Response `200`:

```ts
type GetDecompositionResponse = {
  decompositionRun: DecompositionRunDto;
};
```

Rules:

- Existing run result is stable; GET does not rerun provider.
- Warnings remain attached to historical run.

Errors: `400`, `401`, `403`, `404`.

### Team Capability & Capacity

#### `GET /api/team/members`

Auth: user.

Query:

```ts
type TeamMembersQuery = {
  active?: boolean;
  skillKey?: string;
};
```

Response `200`:

```ts
type TeamMembersResponse = {
  members: TeamMemberDto[];
  warnings: WarningDto[];
};
```

Rules:

- Normal users can read members for allocation transparency.
- Inactive members can be listed when `active=false`, but Smart Allocation never assigns them.

Errors: `400`, `401`, `403`.

#### `POST /api/team/members`

Auth: admin.

Request:

```ts
type CreateTeamMemberRequest = {
  displayName: string;
  role: string;
  active?: boolean;
  skills?: Array<{ key: string; level: number }>;
  domainPreferences?: EngineeringDomain[];
};
```

Response `201`:

```ts
type CreateTeamMemberResponse = {
  member: TeamMemberDto;
};
```

Rules:

- `displayName` is required.
- `active` defaults to `true`.
- Skill keys must exist in active taxonomy.
- Duplicate skill key for same member returns `400` or `409`.
- Skill level must be integer `0..5`.

Errors: `400`, `401`, `403`, `409`.

#### `PATCH /api/team/members/:id`

Auth: admin.

Request:

```ts
type PatchTeamMemberRequest = {
  displayName?: string;
  role?: string;
  active?: boolean;
  skills?: Array<{ key: string; level: number }>;
  domainPreferences?: EngineeringDomain[];
};
```

Response `200`:

```ts
type PatchTeamMemberResponse = {
  member: TeamMemberDto;
};
```

Rules:

- Empty patch body returns `400`.
- Setting `active=false` removes member from future assignment candidates, not from old reports.
- Existing allocation/report history keeps old member ids as opaque refs.

Errors: `400`, `401`, `403`, `404`, `409`.

#### `GET /api/team/skills`

Auth: user.

Response `200`:

```ts
type SkillTaxonomyResponse = {
  skills: SkillDefinitionDto[];
  warnings: WarningDto[];
};
```

Rules:

- Normal users can read taxonomy.
- Inactive skills can be returned for old run display; UI should not offer inactive skills for new edits unless admin chooses.

Errors: `401`, `403`.

#### `PUT /api/team/skills`

Auth: admin.

Request:

```ts
type ReplaceSkillTaxonomyRequest = {
  skills: Array<{
    key: string;
    label: string;
    domain: EngineeringDomain;
    active?: boolean;
  }>;
};
```

Response `200`:

```ts
type ReplaceSkillTaxonomyResponse = {
  skills: SkillDefinitionDto[];
  warnings: WarningDto[];
};
```

Rules:

- Replace is atomic.
- Skill key must be unique.
- Missing known seed skills may return warning but can still be accepted if admin confirms policy in UI.
- Old runs keep historical skill keys even if skill becomes inactive.

Errors: `400`, `401`, `403`, `409`.

#### `GET /api/sprint-capacity/current`

Auth: user.

Query:

```ts
type CurrentSprintCapacityQuery = {
  sprintId?: string;
  projectKey?: string;
};
```

Response `200`:

```ts
type CurrentSprintCapacityResponse = {
  capacity: SprintCapacityDto;
  warnings: WarningDto[];
};
```

Rules:

- If `sprintId` is omitted, backend returns current/default sprint capacity.
- Missing capacity returns empty `memberCapacities` plus warning, not `404`, when sprint exists.
- Negative hours never appear in response.

Errors: `400`, `401`, `403`, `404`.

#### `PUT /api/sprint-capacity/current`

Auth: admin.

Request:

```ts
type UpsertSprintCapacityRequest = {
  sprintId: string;
  memberCapacities: Array<{
    memberId: string;
    availabilityHours: number;
    committedHours?: number;
    maxVelocityPoints?: number;
    timeOffHours?: number;
    wipLimit?: number;
  }>;
};
```

Response `200`:

```ts
type UpsertSprintCapacityResponse = {
  capacity: SprintCapacityDto;
  warnings: WarningDto[];
};
```

Rules:

- `memberId` must reference known team member.
- Duplicate member capacity row returns `400`.
- Hours must be non-negative.
- `committedHours + timeOffHours > availabilityHours` returns warning or `409` if hard-limit policy is locked.
- Update is admin-only.

Errors: `400`, `401`, `403`, `404`, `409`.

### Smart Allocation

#### `POST /api/allocations/recommend`

Auth: user.

Request:

```ts
type RecommendAllocationRequest = {
  decompositionRunId: string;
  sprintId?: string;
};
```

Response `201`:

```ts
type RecommendAllocationResponse = {
  allocationRun: AllocationRunDto;
};
```

Rules:

- `sprintId` defaults to current sprint.
- Backend reads `DecompositionRunDto`, active `TeamMemberDto[]`, active skills and `SprintCapacityDto`.
- Hard constraints: active member, remaining capacity, max velocity, min skill, WIP, admin/security policy.
- Score formula v1:

```txt
score =
  skillFit * 0.40 +
  availabilityFit * 0.25 +
  riskFit * 0.15 +
  balanceFit * 0.15 +
  continuityFit * 0.05
```

- Every sub-task has either a recommendation with `memberId` or an `UnassignedTaskDto`.
- Alternatives never repeat primary `memberId`.
- Utilization is recomputed after each assigned sub-task.
- No Jira assignment write occurs.

Errors: `400`, `401`, `403`, `404`, `409`.

#### `GET /api/allocations/:id`

Auth: user.

Response `200`:

```ts
type GetAllocationResponse = {
  allocationRun: AllocationRunDto;
};
```

Rules:

- Historical run is stable; GET does not rerun optimizer.
- UI uses `unassigned` and recommendation warnings to show risk state.

Errors: `400`, `401`, `403`, `404`.

### Reporting Engine

#### `POST /api/reports/task-allocation`

Auth: user.

Request:

```ts
type CreateTaskAllocationReportRequest = {
  allocationRunId: string;
};
```

Response `201`:

```ts
type CreateTaskAllocationReportResponse = {
  report: TaskAllocationReportDto;
};
```

Rules:

- Backend loads allocation, decomposition and source planning input snapshots.
- Report includes decomposition summary, assignment summary, utilization, risks, warnings and assumptions.
- JSON report and Markdown body must describe same source run.
- Markdown body must be non-empty.
- `createdBy` comes from session.

Errors: `400`, `401`, `403`, `404`, `500`.

#### `GET /api/reports/task-allocation/:id`

Auth: user.

Response `200`:

```ts
type GetTaskAllocationReportResponse = {
  report: TaskAllocationReportDto;
};
```

Rules:

- Historical report is versioned and stable.
- UI can render structured JSON or the included Markdown.

Errors: `400`, `401`, `403`, `404`.

#### `GET /api/reports/task-allocation/:id/markdown`

Auth: user.

Response `200`:

```ts
type MarkdownReportResponse = {
  reportId: string;
  markdown: string;
  version: number;
  createdAt: string;
};
```

Rules:

- Response stays JSON to match existing frontend `ApiClient`.
- Frontend can create a `.md` download Blob from `markdown`.
- Empty Markdown is invariant failure and returns `500` or `409` depending persistence state.

Errors: `400`, `401`, `403`, `404`, `409`, `500`.

## 5. Frontend Flow Contracts

| Flow | Frontend calls | Success state | Warning/empty state |
| --- | --- | --- | --- |
| Session bootstrap | `GET /api/auth/me` | Session user loaded; role controls admin affordances. | `401` shows login state; `403` shows disabled/forbidden state. |
| Select source issue | `GET /api/backlog?projectKey=...` from Modul 1 | User selects `JiraIssueDto` for planning input. | Empty backlog shows sync/data warning. |
| Create manual input | `POST /api/planning-inputs` with `sourceType: "manual"` | UI stores `planningInput.id`. | Missing AC warning shown inline, flow can continue. |
| Create Jira-backed input | `POST /api/planning-inputs` with `sourceType: "jira-issue"` | UI shows frozen issue snapshot + editable AC. | Missing issue -> `404`; short description warning shown. |
| Run decomposition | `POST /api/decompositions/run` | Sub-task table grouped by `domain`. | Low confidence/fallback warnings shown above table. |
| Review previous decomposition | `GET /api/decompositions/:id` | Stable sub-task list. | `404` returns missing run state. |
| Team matrix read | `GET /api/team/members`, `GET /api/team/skills` | Allocation screen can explain fit. | Stale/missing team warning blocks no read flow. |
| Admin team edit | `POST/PATCH /api/team/members`, `PUT /api/team/skills` | Admin updates matrix; UI refreshes member/skill queries. | Non-admin -> `403`; duplicate/invalid skill -> `400`/`409`. |
| Capacity read/edit | `GET/PUT /api/sprint-capacity/current` | Admin sets current sprint capacity; users see utilization baseline. | Missing capacity warning; negative hour validation error. |
| Smart allocation | `POST /api/allocations/recommend` | Recommendation cards/table, alternatives, utilization bars. | Unassigned tasks shown with reason; run still succeeds. |
| Allocation replay | `GET /api/allocations/:id` | Stable recommendation view. | Missing run -> `404`. |
| Report create | `POST /api/reports/task-allocation` | JSON report + Markdown preview created. | Allocation missing -> `404`; report render failure -> `500`. |
| Markdown preview/export | `GET /api/reports/task-allocation/:id/markdown` | UI previews/copies/downloads Markdown. | Empty body invariant -> `409`/`500`. |

Frontend client method names:

```ts
planningInputs.create(input) -> Promise<{ planningInput: PlanningInputDto }>
planningInputs.get(id) -> Promise<{ planningInput: PlanningInputDto }>
decompositions.run(input) -> Promise<{ decompositionRun: DecompositionRunDto }>
decompositions.get(id) -> Promise<{ decompositionRun: DecompositionRunDto }>
team.members.list(query?) -> Promise<TeamMembersResponse>
team.members.create(input) -> Promise<{ member: TeamMemberDto }>
team.members.patch(id, input) -> Promise<{ member: TeamMemberDto }>
team.skills.list() -> Promise<SkillTaxonomyResponse>
team.skills.replace(input) -> Promise<ReplaceSkillTaxonomyResponse>
sprintCapacity.current(query?) -> Promise<CurrentSprintCapacityResponse>
sprintCapacity.upsert(input) -> Promise<UpsertSprintCapacityResponse>
allocations.recommend(input) -> Promise<{ allocationRun: AllocationRunDto }>
allocations.get(id) -> Promise<{ allocationRun: AllocationRunDto }>
reports.taskAllocation.create(input) -> Promise<{ report: TaskAllocationReportDto }>
reports.taskAllocation.get(id) -> Promise<{ report: TaskAllocationReportDto }>
reports.taskAllocation.markdown(id) -> Promise<MarkdownReportResponse>
```

## 6. Backend Internal Application Contracts

| Caller | Provider | Contract | Purpose |
| --- | --- | --- | --- |
| Modul 2 routes | Identity & Access | `requireSession(cookie) -> SessionUserDto` | Resolve user/role from httpOnly JWT. |
| Team/capacity write routes | Identity & Access | `requireAdmin(sessionUser) -> void` | Enforce admin-only commands. |
| Planning Intake | Work Item Catalog | `getIssue(issueKey, projectKey?) -> JiraIssueDto` | Create Jira source snapshot. |
| Planning Intake | PlanningInputRepository | `save(input) -> PlanningInputDto` | Persist normalized source input. |
| Planning Intake | PlanningInputRepository | `getById(id) -> PlanningInputDto` | Serve source snapshot and feed decomposition. |
| Technical Decomposition | Planning Intake | `getPlanningInput(inputId) -> PlanningInputDto` | Load normalized input. |
| Technical Decomposition | DecompositionProvider | `decompose(input, options) -> TechnicalSubTaskDto[]` | Generate sub-task set. |
| Technical Decomposition | OutputNormalizer | `normalize(providerOutput) -> TechnicalSubTaskDto[]` | Enforce schema and invariants. |
| Technical Decomposition | HeuristicProvider | `decompose(input) -> TechnicalSubTaskDto[]` | Deterministic MVP and fallback. |
| Technical Decomposition | DecompositionRepository | `save(run) -> DecompositionRunDto` | Persist run metadata and output. |
| Team Capability & Capacity | SkillTaxonomyRepository | `replace(skills) -> SkillDefinitionDto[]` | Maintain skill source of truth. |
| Team Capability & Capacity | TeamMemberRepository | `create/patch/list(...) -> TeamMemberDto` | Maintain skill matrix. |
| Team Capability & Capacity | SprintCapacityRepository | `upsertCurrent(input) -> SprintCapacityDto` | Maintain sprint capacity. |
| Smart Allocation | DecompositionRepository | `getById(id) -> DecompositionRunDto` | Load sub-tasks. |
| Smart Allocation | Team Capability & Capacity | `listActiveMembersWithCapacity(sprintId) -> TeamCapacityReadModel` | Load candidate owners and capacity. |
| Smart Allocation | AllocationEngine | `recommend(decomposition, teamCapacity) -> AllocationRunDto` | Score owners, alternatives, unassigned, utilization. |
| Smart Allocation | AllocationRepository | `save(run) -> AllocationRunDto` | Persist recommendation run. |
| Reporting Engine | AllocationRepository | `getById(id) -> AllocationRunDto` | Load recommendation source. |
| Reporting Engine | DecompositionRepository | `getById(id) -> DecompositionRunDto` | Load sub-task source. |
| Reporting Engine | PlanningInputRepository | `getById(id) -> PlanningInputDto` | Load source snapshot for report context. |
| Reporting Engine | MarkdownRenderer | `render(reportJson) -> string` | Build Markdown body. |
| Reporting Engine | ReportRepository | `save(report) -> TaskAllocationReportDto` | Persist versioned report. |

## 7. V1 Decisions

- Public API stays JSON REST under `/api`.
- Modul 2 uses existing cookie session and `ErrorEnvelope`.
- Heuristic provider is default; OpenRouter is P2 adapter behind anonymizer and Zod validation.
- `@module1/contracts` can be extended for speed; package rename is P2.
- Planning input supports manual and Jira issue source.
- Acceptance criteria supports plain text/list form normalized to `string[]`.
- Team skill scale is `0..5`.
- Capacity primary unit is hour; story point velocity is optional guard.
- Allocation objective is risk-adjusted skill fit, then capacity, then load balance.
- Unassigned task is valid allocation output, not failed run.
- Reports are persisted JSON + Markdown; PDF is out of v1.
- Jira write/comment/transition/assignee update endpoints are absent.
- Multi-owner task is out of v1; primary owner only, alternatives listed.
- Raw prompt and sensitive provider payload are not persisted.

## 8. Verification Checklist

- UC-201 through UC-214 have frontend-facing contracts or reused Modul 1 auth/catalog contracts.
- Each endpoint maps to exactly one owning bounded context.
- Shared DTOs avoid repeating private aggregate/entity shape.
- Frontend never sends auth-derived `createdBy` or account ownership ids.
- Admin-only commands require admin role.
- All score/confidence fields use `0..1`.
- All skill levels use integer `0..5`.
- Planning input warning paths do not block decomposition.
- Provider fallback returns warning and deterministic output.
- Allocation output covers every sub-task via recommendation or unassigned reason.
- Utilization before/assigned/after/capacity/percent is explicit.
- Markdown report route stays frontend-friendly JSON.
- No Jira write, PDF export, Slack/email publish or raw prompt logging is introduced.

