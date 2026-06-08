# Modul 3 Backend/Frontend API Kontratlari

## 1. Purpose

Bu dokuman, Modul 3 AI Sprint Review & Management Dashboard icin React/Vite frontend ile Express backend arasindaki v1 JSON REST kontratini tanimlar.

Kapsam: reviewable sprint listesi, sprint evidence, manager/admin remark, versioned Turkish sprint demo report, Markdown export, planned vs actual variance, bonus spillover metrics ve sprint health score.

Modul 3, mevcut Identity & Access session cookie yapisini, Work Item Catalog `JiraIssueDto`/`JiraSprintDto` read model'lerini ve Modul 2 capacity/allocation read model'lerini kullanir. Jira/GitHub write yoktur.

## 2. Contract Rules

- Base path: `/api`.
- Request/response format: `application/json`.
- Auth: tum Modul 3 endpoint'leri httpOnly JWT cookie session ister. Frontend fetch cagrilarinda `credentials: "include"` kullanir.
- Read: `user|manager|admin` sprint listesi, evidence, report ve analytics okuyabilir.
- Write/generate: `manager|admin` remark ekler ve sprint demo report generate eder.
- Admin: mevcut admin user/KB CRUD yetkisi korunur.
- `UserRole` v1'de `"user" | "manager" | "admin"` olur.
- Frontend `createdBy`, `authorId`, `authorRole`, `accountId` veya owner id gondermez. Backend bunlari session'dan cozer.
- ID alanlari opaque string'dir; frontend id formatina anlam yuklemez.
- Tarihler ISO-8601 string'dir.
- Percent alanlari `0..100`, confidence alanlari `0..1`, health score `1..100` araligindadir.
- `trendWindow` `1..12` integer'dir; default `6`.
- Sprint start snapshot planned baseline, sprint close snapshot Done items actual baseline'dir.
- `timeSpentHours` eksikse analytics `HOURS_PER_STORY_POINT` fallback kullanabilir ve warning dondurur.
- Raw Jira/GitHub payload, raw prompt, raw provider payload veya sensitive company text response/log olarak sizmaz.
- Context'ler private aggregate/entity shape dondurmez; DTO, query, command input veya read model dondurur.
- `WarningDto` non-blocking sinyaldir. Sparse data, unmatched PR/commit, fallback hour, provider fallback ve low sprint history warning olarak doner.
- Blocking hata response'lari mevcut `ErrorEnvelope` kullanir. Modul 3 warning code'lari `ErrorEnvelope.error.code` union'ina eklenmez.
- OpenRouter provider P2'dir. Anonymizer ve schema validation olmadan dis provider calisamaz.
- Jira write, GitHub write, PDF export, Slack/email publish ve automatic workflow decision v1 disidir.

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
| `403` | Auth var, yetki yok veya user disabled/role yetersiz. |
| `404` | Resource yok veya gorunur/aktif degil. |
| `409` | Invariant conflict; empty markdown, duplicate version, invalid report state. |
| `500` | Beklenmeyen backend hatasi. |

## 3. Common DTOs

Mevcut shared DTO'lar tekrar kullanilir: `WarningDto`, `PageInfoDto`, `SessionUserDto`, `JiraIssueDto`, `JiraSprintDto`, `ErrorEnvelope`.

```ts
type WarningDto = {
  code: string;
  message: string;
  severity: "info" | "warning";
};

type UserRole = "user" | "manager" | "admin";

type SessionUserDto = {
  id: string;
  username: string;
  displayName?: string;
  role: UserRole;
  active: boolean;
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

type JiraSprintDto = {
  id: string;
  name: string;
  state: "closed";
  projectKey: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
};

type SprintEvidenceSource =
  | "jira-snapshot"
  | "jira-changelog"
  | "jira-comment"
  | "github-pr"
  | "github-commit"
  | "manager-remark";

type SourceRefDto = {
  sourceType: SprintEvidenceSource;
  externalId: string;
  url?: string;
  capturedAt: string;
};

type ReviewableSprintDto = {
  id: string;
  name: string;
  projectKey: string;
  state: "closed";
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  evidenceStatus: "ready" | "sparse" | "missing";
  reportCount: number;
  latestReportId?: string;
  sourceRefs: SourceRefDto[];
  warnings: WarningDto[];
};

type SprintSnapshotDto = {
  id: string;
  sprintId: string;
  projectKey: string;
  kind: "start" | "close";
  capturedAt: string;
  sourceRef: SourceRefDto;
  issueCount: number;
  storyPointsTotal: number;
  hoursTotal?: number;
  warnings: WarningDto[];
};

type StatusHistoryEntryDto = {
  fromStatus?: string;
  toStatus: string;
  statusCategory?: string;
  changedAt: string;
  sourceRef: SourceRefDto;
};

type EvidenceIssueDto = {
  key: string;
  projectKey: string;
  summary: string;
  issueType?: string;
  statusCategory?: string;
  statusName?: string;
  assignee?: string;
  storyPoints?: number;
  timeSpentHours?: number;
  labels: string[];
  components: string[];
  completionState: "planned" | "completed" | "incomplete" | "removed";
  statusHistory: StatusHistoryEntryDto[];
  sourceRefs: SourceRefDto[];
  warnings: WarningDto[];
};

type PullRequestEvidenceDto = {
  id: string;
  title: string;
  url?: string;
  state: "open" | "merged" | "closed";
  author?: string;
  branch?: string;
  mergedAt?: string;
  mappedIssueKeys: string[];
  sourceRef: SourceRefDto;
  warnings: WarningDto[];
};

type CommitEvidenceDto = {
  sha: string;
  message: string;
  url?: string;
  author?: string;
  committedAt: string;
  mappedIssueKeys: string[];
  sourceRef: SourceRefDto;
  warnings: WarningDto[];
};

type ClosingRemarkDto = {
  id: string;
  text: string;
  source: "jira-comment" | "jira-resolution" | "manager-remark";
  issueKey?: string;
  authorDisplayName?: string;
  createdAt: string;
  sourceRef: SourceRefDto;
};

type UnmatchedEvidenceDto = {
  id: string;
  kind: "pull-request" | "commit";
  titleOrMessage: string;
  url?: string;
  sourceRef: SourceRefDto;
  warnings: WarningDto[];
};

type SprintEvidenceDto = {
  id: string;
  sprint: ReviewableSprintDto;
  snapshots: SprintSnapshotDto[];
  completedItems: EvidenceIssueDto[];
  incompleteItems: EvidenceIssueDto[];
  removedItems: EvidenceIssueDto[];
  pullRequests: PullRequestEvidenceDto[];
  commits: CommitEvidenceDto[];
  closingRemarks: ClosingRemarkDto[];
  unmatchedEvidence: UnmatchedEvidenceDto[];
  warnings: WarningDto[];
  generatedAt: string;
};

type SprintRemarkDto = {
  id: string;
  sprintId: string;
  text: string;
  author: {
    id: string;
    displayName?: string;
    role: "manager" | "admin";
  };
  createdAt: string;
  sourceRef: SourceRefDto;
};

type SummaryProviderName = "heuristic" | "openrouter";

type ReportSectionDto = {
  key:
    | "executive-summary"
    | "completed-work"
    | "demo-notes"
    | "risks"
    | "blockers"
    | "warnings"
    | "next-actions";
  title: string;
  items: string[];
};

type SprintDemoReportDto = {
  id: string;
  sprintId: string;
  projectKey: string;
  version: number;
  title: string;
  language: "tr";
  provider: {
    name: SummaryProviderName;
    promptVersion: string;
    fallbackUsed: boolean;
    anonymized: boolean;
  };
  sections: ReportSectionDto[];
  source: {
    evidenceSetId: string;
    remarkIds: string[];
    sourceRefs: SourceRefDto[];
  };
  markdown: string;
  warnings: WarningDto[];
  createdBy: string;
  createdAt: string;
};

type VarianceDirection = "ahead" | "behind" | "on-track";

type VarianceMetricDto = {
  planned: number;
  actual: number;
  delta: number;
  deltaPercent: number | null;
  direction: VarianceDirection;
  usedFallback: boolean;
};

type VelocityTrendPointDto = {
  sprintId: string;
  sprintName?: string;
  completedStoryPoints: number;
  completedHours: number;
  completeDate?: string;
};

type BottleneckGroupDto = {
  groupType: "assignee" | "issueType" | "status" | "component" | "blockageReason";
  groupKey: string;
  plannedStoryPoints: number;
  actualStoryPoints: number;
  spilloverStoryPoints: number;
  itemCount: number;
  warnings: WarningDto[];
};

type VarianceAnalyticsDto = {
  id: string;
  projectKey: string;
  sprintId: string;
  trendWindow: number;
  baselines: {
    startSnapshotId?: string;
    closeSnapshotId?: string;
  };
  storyPoints: VarianceMetricDto;
  hours: VarianceMetricDto;
  velocityTrend: VelocityTrendPointDto[];
  bottlenecks: BottleneckGroupDto[];
  warnings: WarningDto[];
  computedAt: string;
};

type SpilloverItemDto = {
  issueKey: string;
  summary: string;
  issueType?: string;
  assignee?: string;
  storyPoints?: number;
  sourceRefs: SourceRefDto[];
};

type SpilloverGroupDto = {
  groupType: "assignee" | "issueType" | "component";
  groupKey: string;
  itemCount: number;
  storyPoints: number;
};

type SpilloverMetricsDto = {
  id: string;
  projectKey: string;
  sprintId: string;
  plannedItemCount: number;
  spilloverItemCount: number;
  carryoverPercent: number;
  spilloverStoryPoints: number;
  items: SpilloverItemDto[];
  byIssueType: SpilloverGroupDto[];
  byAssignee: SpilloverGroupDto[];
  scopeVolatility: {
    addedItemCount: number;
    removedItemCount: number;
    changedStoryPoints: number;
  };
  warnings: WarningDto[];
  computedAt: string;
};

type SprintHealthScoreDto = {
  id: string;
  projectKey: string;
  sprintId: string;
  score: number;
  band: "healthy" | "watch" | "at-risk";
  breakdown: Array<{
    key: "velocityVariance" | "spillover" | "burnout" | "blockDuration";
    label: string;
    weight: number;
    score: number;
    explanation: string;
    warnings: WarningDto[];
  }>;
  thresholds: {
    healthyMin: number;
    watchMin: number;
    atRiskBelow: number;
  };
  warnings: WarningDto[];
  computedAt: string;
};
```

Recommended warning codes:

| Code | Owner | Meaning |
| --- | --- | --- |
| `NO_REVIEWABLE_SPRINTS` | Sprint Review Workspace | Sprint listesi bos; flow empty state gosterir. |
| `MISSING_START_SNAPSHOT` | Sprint Evidence Intake / Analytics | Planned baseline eksik. |
| `MISSING_CLOSE_SNAPSHOT` | Sprint Evidence Intake / Analytics | Actual baseline eksik. |
| `MISSING_TIME_SPENT` | Evidence / Analytics | Hour actual fallback gerektirir. |
| `UNMATCHED_GITHUB_EVIDENCE` | Sprint Evidence Intake | PR/commit issue key'e baglanamadi. |
| `SPARSE_EVIDENCE` | Sprint Evidence Intake | Evidence eksik ama flow devam eder. |
| `PROVIDER_FALLBACK_USED` | Sprint Demo Reporting | OpenRouter fail; heuristic kullanildi. |
| `ANONYMIZER_REQUIRED` | Sprint Demo Reporting | External provider calisamaz; fallback veya hata. |
| `LOW_SPRINT_HISTORY` | Delivery Analytics | Trend icin 3'ten az sprint var. |
| `ZERO_PLANNED_BASELINE` | Delivery Analytics | Delta percent null olur. |
| `MISSING_CAPACITY_SIGNAL` | Sprint Health & Spillover | Burnout signal conservative hesaplanir. |
| `BONUS_FEATURE_DISABLED` | Sprint Health & Spillover | Spillover/health route feature flag kapali. |

## 4. Public API by Owning Context

### Sprint Review Workspace

#### `GET /api/sprint-review/sprints`

Auth: user.

Query:

```ts
type ReviewableSprintsQuery = {
  projectKey?: string;
  limit?: number;
};
```

Response `200`:

```ts
type ReviewableSprintsResponse = {
  sprints: ReviewableSprintDto[];
  warnings: WarningDto[];
};
```

Rules:

- Backend returns closed/reviewable sprints only.
- `projectKey` defaults to backend `DEFAULT_PROJECT_KEY` when omitted.
- Empty list returns `sprints: []` and `NO_REVIEWABLE_SPRINTS`, not `404`.
- `evidenceStatus` tells UI whether selecting sprint can show full, sparse or missing evidence.

Errors: `400`, `401`, `403`.

#### `POST /api/sprint-review/sprints/:sprintId/remarks`

Auth: manager/admin.

Request:

```ts
type CreateSprintRemarkRequest = {
  text: string;
};
```

Response `201`:

```ts
type CreateSprintRemarkResponse = {
  remark: SprintRemarkDto;
};
```

Rules:

- `text` is required and trimmed; empty text returns `400`.
- `author.id`, `author.role`, `author.displayName` come from session.
- `user` role receives `403`.
- Remark is local Modul 3 review data; backend never writes Jira comment.
- Created remark becomes source ref for future reports.

Errors: `400`, `401`, `403`, `404`.

### Sprint Evidence Intake

#### `GET /api/sprint-review/sprints/:sprintId/evidence`

Auth: user.

Query:

```ts
type SprintEvidenceQuery = {
  projectKey?: string;
};
```

Response `200`:

```ts
type SprintEvidenceResponse = {
  evidence: SprintEvidenceDto;
};
```

Rules:

- Backend normalizes Jira sprint start/close snapshots, issues, changelog, comments, resolution remarks and GitHub PR/commit metadata.
- PR title, branch and commit message use `/[A-Z][A-Z0-9]+-\d+/` issue key regex.
- Unmatched PR/commit is returned under `unmatchedEvidence`, not discarded.
- Completed item means close snapshot Done status category.
- Incomplete item means start snapshot planned and close snapshot not Done.
- Missing evidence can return `404` when no evidence set exists; sparse evidence returns `200` with warnings.
- Raw Jira/GitHub payload is not exposed.

Errors: `400`, `401`, `403`, `404`.

### Sprint Demo Reporting

#### `POST /api/sprint-review/reports`

Auth: manager/admin.

Request:

```ts
type CreateSprintDemoReportRequest = {
  sprintId: string;
  projectKey?: string;
  provider?: SummaryProviderName;
  includeRemarkIds?: string[];
};
```

Response `201`:

```ts
type CreateSprintDemoReportResponse = {
  report: SprintDemoReportDto;
};
```

Rules:

- `provider` defaults to `"heuristic"`.
- If `includeRemarkIds` is omitted, backend includes all remarks for sprint.
- Backend loads `SprintEvidenceDto` and selected `SprintRemarkDto[]`.
- Heuristic provider is deterministic and Turkish.
- OpenRouter provider is P2; anonymizer + schema validation required. Failure falls back to heuristic and adds warning.
- Report `version` increments per sprint.
- JSON report and `markdown` must describe same `id` and `version`.
- `createdBy` comes from session.

Errors: `400`, `401`, `403`, `404`, `409`, `500`.

#### `GET /api/sprint-review/reports/:id`

Auth: user.

Response `200`:

```ts
type GetSprintDemoReportResponse = {
  report: SprintDemoReportDto;
};
```

Rules:

- Historical report is stable; GET does not regenerate summary.
- Markdown body can be rendered directly from `report.markdown`.

Errors: `400`, `401`, `403`, `404`.

#### `GET /api/sprint-review/reports/:id/markdown`

Auth: user.

Response `200`:

```ts
type SprintDemoMarkdownResponse = {
  reportId: string;
  version: number;
  markdown: string;
  createdAt: string;
};
```

Rules:

- Response stays JSON to match existing frontend `ApiClient`.
- Frontend can preview, copy or download a `.md` Blob from `markdown`.
- Empty Markdown is invariant failure and returns `409` or `500` depending persistence state.

Errors: `400`, `401`, `403`, `404`, `409`, `500`.

### Delivery Analytics

#### `GET /api/analytics/variance`

Auth: user.

Query:

```ts
type VarianceAnalyticsQuery = {
  projectKey?: string;
  sprintId: string;
  trendWindow?: number;
};
```

Response `200`:

```ts
type VarianceAnalyticsResponse = {
  analytics: VarianceAnalyticsDto;
};
```

Rules:

- `trendWindow` defaults to `6`; valid range `1..12`.
- Planned story points/hours come from start snapshot.
- Actual story points/hours come from close snapshot Done items.
- If planned is `0`, `deltaPercent` is `null` and warning is returned.
- If `timeSpentHours` is missing, backend uses `HOURS_PER_STORY_POINT` fallback and sets `usedFallback: true`.
- Bottlenecks group by assignee, issueType, status/category, component or blockage reason.
- Fewer than 3 closed sprints returns `LOW_SPRINT_HISTORY`, not error.

Errors: `400`, `401`, `403`, `404`.

### Sprint Health & Spillover

#### `GET /api/analytics/spillover`

Auth: user.

Query:

```ts
type SpilloverMetricsQuery = {
  projectKey?: string;
  sprintId: string;
};
```

Response `200`:

```ts
type SpilloverMetricsResponse = {
  metrics: SpilloverMetricsDto;
};
```

Rules:

- Bonus route can be hidden by feature flag; disabled route returns `404` or `BONUS_FEATURE_DISABLED` warning policy.
- Spillover item means planned in start snapshot and not Done in close snapshot.
- `carryoverPercent` is normalized `0..100`.
- Group totals must match item count/story point totals.
- Scope volatility compares start and close snapshots.

Errors: `400`, `401`, `403`, `404`.

#### `GET /api/analytics/health`

Auth: user.

Query:

```ts
type SprintHealthScoreQuery = {
  projectKey?: string;
  sprintId: string;
  trendWindow?: number;
};
```

Response `200`:

```ts
type SprintHealthScoreResponse = {
  health: SprintHealthScoreDto;
};
```

Rules:

- Bonus route can be hidden by feature flag; disabled route returns `404` or `BONUS_FEATURE_DISABLED` warning policy.
- Final score is integer `1..100`.
- Weights sum to 100: velocity variance `30`, spillover `25`, burnout `20`, block duration `25`.
- Burnout reads Modul 2 capacity/allocation read models. Missing data returns warning and conservative score.
- Block duration derives from status history/comment evidence when available.
- Health score is advisory; backend emits no Jira/GitHub action.

Errors: `400`, `401`, `403`, `404`.

## 5. Frontend Flow Contracts

| Flow | Frontend calls | Success state | Warning/empty state |
| --- | --- | --- | --- |
| Session bootstrap | `GET /api/auth/me` | Session user loaded; role controls remark/report affordances. | `401` shows login state; `403` shows disabled/forbidden state. |
| Sprint review tab load | `GET /api/sprint-review/sprints?projectKey=...` | Sprint selector populated. | Empty list shows `NO_REVIEWABLE_SPRINTS`. |
| Evidence view | `GET /api/sprint-review/sprints/:sprintId/evidence` | Completed/incomplete items, PRs, commits, remarks, warnings rendered. | Sparse evidence warnings shown inline; missing evidence -> empty/error state. |
| Manager remark | `POST /api/sprint-review/sprints/:sprintId/remarks` | Remark appears in evidence/report source list. | `user` role hides form; backend still enforces `403`. |
| Report generate | `POST /api/sprint-review/reports` | JSON report preview and Markdown body available. | Sparse evidence/provider fallback warnings shown but report can succeed. |
| Report replay | `GET /api/sprint-review/reports/:id` | Stable historical report shown. | Missing report -> `404`. |
| Markdown preview/export | `GET /api/sprint-review/reports/:id/markdown` | UI previews/copies/downloads Markdown. | Empty markdown invariant -> `409`/`500`. |
| Variance dashboard | `GET /api/analytics/variance?projectKey=...&sprintId=...&trendWindow=6` | SP/hour variance, velocity trend, bottleneck groups rendered. | Missing baseline/fallback hour warnings shown near chart/table. |
| Spillover bonus | `GET /api/analytics/spillover?projectKey=...&sprintId=...` | Carryover %, item list, by type/assignee groups rendered. | Bonus disabled -> hidden panel or `404` state. |
| Health bonus | `GET /api/analytics/health?projectKey=...&sprintId=...` | Score, band, weighted breakdown rendered. | Missing capacity/block data warnings shown; score advisory. |

Frontend client method names:

```ts
sprintReview.sprints.list(query?) -> Promise<ReviewableSprintsResponse>
sprintReview.evidence.get(sprintId, query?) -> Promise<{ evidence: SprintEvidenceDto }>
sprintReview.remarks.create(sprintId, input) -> Promise<{ remark: SprintRemarkDto }>
sprintReview.reports.create(input) -> Promise<{ report: SprintDemoReportDto }>
sprintReview.reports.get(id) -> Promise<{ report: SprintDemoReportDto }>
sprintReview.reports.markdown(id) -> Promise<SprintDemoMarkdownResponse>
analytics.variance(query) -> Promise<{ analytics: VarianceAnalyticsDto }>
analytics.spillover(query) -> Promise<{ metrics: SpilloverMetricsDto }>
analytics.health(query) -> Promise<{ health: SprintHealthScoreDto }>
```

## 6. Backend Internal Application Contracts

| Caller | Provider | Contract | Purpose |
| --- | --- | --- | --- |
| Modul 3 routes | Identity & Access | `requireSession(cookie) -> SessionUserDto` | Resolve user/role from httpOnly JWT. |
| Remark/report routes | Identity & Access | `requireManagerOrAdmin(sessionUser) -> void` | Enforce `manager|admin` command policy. |
| Sprint Review Workspace | Work Item Catalog | `listClosedSprints(projectKey, limit?) -> { sprints; warnings }` | Build reviewable sprint list. |
| Sprint Review Workspace | SprintEvidenceService | `getEvidence(sprintId, projectKey?) -> SprintEvidenceDto` | Read selected sprint evidence. |
| Sprint Review Workspace | RemarkRepository | `addRemark(sprintId, text, author) -> SprintRemarkDto` | Persist local manager/admin remark. |
| Sprint Review Workspace | RemarkRepository | `listRemarks(sprintId, ids?) -> SprintRemarkDto[]` | Feed report generation. |
| Jira State Publisher | SprintEvidenceService | `upsertSprintSnapshots(rawState) -> SprintEvidenceSet` | Store start/close planned/actual baselines. |
| GitHub Evidence Adapter | SprintEvidenceService | `mapPullRequestsAndCommits(rawGithubState) -> GitHubEvidenceMappingResult` | Link PR/commit evidence to issue keys. |
| Sprint Evidence Intake | Work Item Catalog | `getSprintIssues(projectKey, sprintId) -> JiraIssueDto[]` | Normalize sprint issue evidence. |
| Sprint Evidence Intake | EvidenceRepository | `save/getBySprint(sprintId, projectKey?) -> SprintEvidenceDto` | Persist/read normalized evidence. |
| Sprint Demo Reporting | SprintEvidenceService | `getEvidence(sprintId, projectKey?) -> SprintEvidenceDto` | Load report source evidence. |
| Sprint Demo Reporting | RemarkRepository | `listRemarks(sprintId, ids?) -> SprintRemarkDto[]` | Add manager context to report source. |
| Sprint Demo Reporting | SummaryProvider | `generate(evidence, remarks, options) -> ReportSectionDto[]` | Create Turkish report sections. |
| Sprint Demo Reporting | Anonymizer | `anonymize(evidence, remarks) -> SafeProviderInput` | Guard P2 external provider. |
| Sprint Demo Reporting | MarkdownRenderer | `render(reportJson) -> string` | Build Markdown export body. |
| Sprint Demo Reporting | ReportRepository | `create/get/getMarkdown(...) -> SprintDemoReportDto` | Persist versioned JSON + Markdown. |
| Delivery Analytics | SprintEvidenceService | `getEvidence(sprintId, projectKey?) -> SprintEvidenceDto` | Load baseline and issue evidence. |
| Delivery Analytics | VarianceEngine | `compute(evidence, trendWindow) -> VarianceAnalyticsDto` | Calculate planned/actual SP/hour, trend, bottlenecks. |
| Delivery Analytics | Work Item Catalog | `listClosedSprints(projectKey, limit) -> JiraSprintDto[]` | Build velocity trend. |
| Sprint Health & Spillover | SprintEvidenceService | `getEvidence(sprintId, projectKey?) -> SprintEvidenceDto` | Load planned/incomplete item set. |
| Sprint Health & Spillover | Modul 2 Capacity/Allocation | `getCapacitySignals(projectKey, sprintId) -> CapacitySignalReadModel` | Feed burnout/over-allocation score. |
| Sprint Health & Spillover | SpilloverEngine | `compute(evidence) -> SpilloverMetricsDto` | Calculate carryover and volatility. |
| Sprint Health & Spillover | HealthScoreEngine | `compute(variance, spillover, capacitySignals, evidence) -> SprintHealthScoreDto` | Calculate weighted advisory score. |

## 7. V1 Decisions

- Public API stays JSON REST under `/api`.
- Modul 3 uses existing cookie session and `ErrorEnvelope`.
- `UserRole` extends to `"user" | "manager" | "admin"`.
- Sprint list/evidence/report/analytics read is allowed for all active authenticated roles.
- Remark and report generation require `manager|admin`.
- Heuristic Turkish summary provider is default and deterministic.
- OpenRouter is P2 only; anonymizer and schema validation are mandatory.
- Report persistence is versioned JSON + Markdown.
- Markdown route returns JSON envelope, not raw `text/markdown`, to match current frontend API client.
- Planned baseline is sprint start snapshot; actual baseline is close snapshot Done items.
- `HOURS_PER_STORY_POINT` fallback is allowed only with warning.
- Bonus spillover/health endpoints may be feature-flagged after core report + variance.
- Health score is advisory; no automatic Jira/GitHub action follows.
- Jira write/comment/transition, GitHub write, PDF export, Slack/email publish and raw prompt logging are absent.

## 8. Verification Checklist

- UC-301 through UC-316 have frontend-facing contracts or reused auth/catalog contracts.
- Each endpoint maps to exactly one owning bounded context.
- Shared DTOs avoid repeating private aggregate/entity shape.
- Frontend never sends auth-derived `createdBy`, `authorId`, `authorRole` or account ownership ids.
- All Modul 3 endpoints require session auth.
- Remark/report generation requires `manager|admin`.
- User/admin CRUD remains admin-only through existing contracts.
- Evidence exposes normalized source refs, not raw Jira/GitHub payload.
- Unmatched PR/commit evidence is preserved with warning.
- TimeSpent fallback returns warning and `usedFallback`.
- Variance percent handles planned `0` with `null`, not divide-by-zero.
- Report JSON and Markdown share same report id/version.
- Health score range and weights are explicit: `1..100`, `30/25/20/25`.
- Bonus endpoints are marked optional/feature-flag friendly.
- No Jira write, GitHub write, PDF export, Slack/email publish or raw prompt logging is introduced.
