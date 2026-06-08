# Modül 1 Backend/Frontend API Kontratları

## 1. Purpose

Bu doküman, Modül 1 için React/Vite frontend ile Express backend arasındaki v1 JSON REST kontratını tanımlar. Kapsam: auth, admin user CRUD, sync health/manual sync, backlog/sprint read model query, sizing recommendation, blockage recommendation, blockage KB yönetimi.

Backend Jira'ya direkt gitmez. Jira verisi Company PC publisher -> GitHub `jira-live/state.json` -> backend ingest -> MongoDB akışıyla gelir.

## 2. Contract Rules

- Base path: `/api`.
- Request/response format: `application/json`.
- Auth: httpOnly JWT cookie. Frontend fetch çağrılarında `credentials: "include"` kullanır.
- Session identity backend tarafından cookie'den çözülür. Frontend `userId`, `accountId` veya owner id göndermez.
- Admin endpoint'leri `admin` role ister.
- Response DTO'ları aggregate/entity private shape'i sızdırmaz; sadece read model, command input ve recommendation DTO döner.
- `warning` akışı bloklamaz; hata değil, düşük confidence veya eksik veri sinyalidir.
- `storyPoints: undefined` ile `storyPoints: 0` farklıdır.
- `confidence` her yerde `0..1` aralığındadır. UI yüzdeye çevirebilir.
- Tarihler ISO-8601 string'dir.
- ID alanları opaque string'dir; frontend ID formatına anlam yüklemez.
- V1 export, Jira write, Jira transition, SSO, OpenRouter çağrısı kapsam dışıdır.

### Shared Error Envelope

Tüm hata response'ları aynı envelope'u kullanır.

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

| Status | Kullanım |
| --- | --- |
| `400` | Invalid body, query, path param. |
| `401` | Missing/invalid session cookie. |
| `403` | Auth var, yetki yok veya user disabled. |
| `404` | Resource yok veya görünür/aktif değil. |
| `409` | Invariant/uniqueness conflict. |
| `500` | Beklenmeyen backend hatası. |

## 3. Common DTOs

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

type UserRole = "user" | "admin";

type SessionUserDto = {
  id: string;
  username: string;
  displayName?: string;
  role: UserRole;
  active: boolean;
};

type UserAccountDto = SessionUserDto & {
  createdAt: string;
  updatedAt: string;
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

type SyncRunDto = {
  id: string;
  source: "github-state";
  status: "success" | "warning" | "failed" | "running";
  startedAt: string;
  completedAt?: string;
  issueUpserts: number;
  sprintUpserts: number;
  fieldMappingUpserts: number;
  warnings: WarningDto[];
  error?: string;
};

type SyncStatusDto = {
  latestRun?: SyncRunDto;
  projectKeys: string[];
  lastSuccessfulSyncAt?: string;
  hasUsableData: boolean;
  warnings: WarningDto[];
};

type SimilarIssueDto = {
  key: string;
  summary: string;
  similarity: number;
  storyPoints?: number;
  timeSpentHours?: number;
};

type ConfidenceBreakdownDto = {
  similarity: number;
  neighborCount: number;
  dataCompleteness: number;
  variance: number;
};

type SizingRecommendationDto = {
  id: string;
  issueKey: string;
  storyPoints: number;
  idealHours: number;
  confidence: number;
  confidenceBreakdown: ConfidenceBreakdownDto;
  warnings: WarningDto[];
  similarIssues: SimilarIssueDto[];
  rationale: string;
  createdAt: string;
};

type BlockagePatternDto = {
  id: string;
  name: string;
  keywords: string[];
  componentHints: string[];
  actions: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type BlockageRecommendationDto = {
  id: string;
  issueKey?: string;
  inputText: string;
  actions: string[];
  confidence: number;
  evidence: string[];
  warnings: WarningDto[];
  createdAt: string;
};
```

## 4. Public API by Owning Context

### Identity & Access

#### `POST /api/auth/login`

Auth: none.

Request:

```ts
type LoginRequest = {
  username: string;
  password: string;
};
```

Response `200`:

```ts
type LoginResponse = {
  user: SessionUserDto;
};
```

Side effect: backend sets httpOnly JWT cookie. Errors: `400`, `401`, `403`.

#### `POST /api/auth/logout`

Auth: optional session.

Request: empty body.

Response: `204 No Content`.

Side effect: backend clears session cookie.

#### `GET /api/auth/me`

Auth: user.

Response `200`:

```ts
type MeResponse = {
  user: SessionUserDto;
};
```

Errors: `401`, `403`.

#### `GET /api/admin/users`

Auth: admin.

Response `200`:

```ts
type AdminUsersResponse = {
  users: UserAccountDto[];
};
```

Errors: `401`, `403`.

#### `POST /api/admin/users`

Auth: admin.

Request:

```ts
type CreateUserRequest = {
  username: string;
  password: string;
  displayName?: string;
  role: UserRole;
  active?: boolean;
};
```

Response `201`:

```ts
type CreateUserResponse = {
  user: UserAccountDto;
};
```

Rules:

- `username` unique.
- Raw password never returned.
- `active` defaults to `true`.

Errors: `400`, `401`, `403`, `409`.

#### `PATCH /api/admin/users/:id`

Auth: admin.

Request:

```ts
type PatchUserRequest = {
  username?: string;
  password?: string;
  displayName?: string;
  role?: UserRole;
  active?: boolean;
};
```

Response `200`:

```ts
type PatchUserResponse = {
  user: UserAccountDto;
};
```

Rules:

- Empty patch body returns `400`.
- Password, if present, is hashed before persistence.
- Disabled user cannot login after update.

Errors: `400`, `401`, `403`, `404`, `409`.

### Work Item Ingestion & Catalog

#### `GET /api/sync/status`

Auth: user.

Response `200`: `SyncStatusDto`.

Rules:

- If no sync exists, return `hasUsableData: false` and warning, not `404`.
- Failed sync does not imply old read models were deleted.

Errors: `401`, `403`.

#### `POST /api/sync/github/run`

Auth: admin.

Request: empty body.

Response `200`: `SyncRunDto`.

Rules:

- Starts one manual ingest from configured GitHub state.
- If ingest completes with warnings, `status` can be `"warning"` and HTTP status remains `200`.
- GitHub fetch/parse/upsert failure returns `200` with `status: "failed"` when run record is created; unexpected failure can return `500`.

Errors: `401`, `403`, `500`.

#### `GET /api/backlog`

Auth: user.

Query:

```ts
type BacklogQuery = {
  projectKey: string;
  issueType?: string;
  statusCategory?: string;
  label?: string;
  component?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};
```

Response `200`:

```ts
type BacklogResponse = {
  issues: JiraIssueDto[];
  page: PageInfoDto;
  warnings: WarningDto[];
};
```

Rules:

- Default `projectKey` can be `ICTFT` in UI config, but frontend sends explicit query.
- Only backlog/non-closed issues are returned.
- Empty backlog returns `issues: []` and warnings if data is stale/missing.

Errors: `400`, `401`, `403`.

#### `GET /api/sprints/history`

Auth: user.

Query:

```ts
type SprintHistoryQuery = {
  projectKey: string;
  limit?: number;
};
```

Response `200`:

```ts
type SprintHistoryResponse = {
  sprints: JiraSprintDto[];
  warnings: WarningDto[];
};
```

Rules:

- Only closed sprints are returned.
- Fewer than 3 closed sprints returns warning, not error.

Errors: `400`, `401`, `403`.

### Predictive Sizing

#### `POST /api/sizing/recommend`

Auth: user.

Request:

```ts
type SizingRecommendRequest = {
  issueKey: string;
  projectKey?: string;
  neighborLimit?: number;
};
```

Response `200`: `SizingRecommendationDto`.

Rules:

- Backend resolves target issue from normalized catalog.
- Target issue cannot appear in `similarIssues`.
- Missing story point, hour, sprint, description, or too few neighbors returns warnings and lowers confidence.
- `idealHours` must be present. Use Jira time tracking when usable; else use `HOURS_PER_STORY_POINT` fallback.
- Recommendation may be persisted in `recommendations`.

Errors: `400`, `401`, `403`, `404`.

### Blockage Advisory

#### `POST /api/blockage/recommend`

Auth: user.

Request:

```ts
type BlockageRecommendRequest = {
  issueKey?: string;
  inputText?: string;
  projectKey?: string;
  maxActions?: number;
};
```

Response `200`: `BlockageRecommendationDto`.

Rules:

- At least one of `issueKey` or non-empty `inputText` is required.
- If only `issueKey` is sent, backend resolves issue text from catalog and returns it in `inputText`.
- Evidence can come from local KB, Jira examples, or text signals.
- High confidence requires evidence.
- Actions are suggestions only. Backend never writes to Jira.
- Recommendation may be persisted in `recommendations`.

Errors: `400`, `401`, `403`, `404`.

#### `GET /api/admin/blockage-patterns`

Auth: admin.

Response `200`:

```ts
type BlockagePatternsResponse = {
  patterns: BlockagePatternDto[];
};
```

Errors: `401`, `403`.

#### `POST /api/admin/blockage-patterns`

Auth: admin.

Request:

```ts
type CreateBlockagePatternRequest = {
  name: string;
  keywords?: string[];
  componentHints?: string[];
  actions: string[];
  active?: boolean;
};
```

Response `201`:

```ts
type CreateBlockagePatternResponse = {
  pattern: BlockagePatternDto;
};
```

Rules:

- Active pattern must have at least one signal: `keywords` or `componentHints`.
- Active pattern must have at least one action.
- Pattern action is never auto-written to Jira.

Errors: `400`, `401`, `403`, `409`.

#### `PATCH /api/admin/blockage-patterns/:id`

Auth: admin.

Request:

```ts
type PatchBlockagePatternRequest = {
  name?: string;
  keywords?: string[];
  componentHints?: string[];
  actions?: string[];
  active?: boolean;
};
```

Response `200`:

```ts
type PatchBlockagePatternResponse = {
  pattern: BlockagePatternDto;
};
```

Rules:

- Empty patch body returns `400`.
- If resulting pattern is active, signal/action invariant must hold.

Errors: `400`, `401`, `403`, `404`, `409`.

## 5. Frontend Flow Contracts

| Flow | Frontend calls | Success state | Warning/empty state |
| --- | --- | --- | --- |
| Login bootstrap | `POST /api/auth/login`, then `GET /api/auth/me` on refresh | Session user loaded; route access decided by `role`. | `401` shows login error; `403` shows disabled user state. |
| Sync health | `GET /api/sync/status` | Latest sync, warnings, data usability shown. | No sync => empty state with sync warning. |
| Manual sync | `POST /api/sync/github/run`, then `GET /api/sync/status` | Admin sees run result and latest health. | Run `status: "warning"` remains successful UI path. |
| Backlog list/filter | `GET /api/backlog?projectKey=ICTFT...` | User selects issue for sizing/blockage. | Empty issues => prompt to check sync health. |
| Sizing result | `POST /api/sizing/recommend` | Story point, ideal hour, confidence, similar issues, rationale shown. | Warnings shown inline; result still usable. |
| Rationale review | Uses `SizingRecommendationDto` from sizing call | Similar issue table + rationale rendered. | Empty `similarIssues` + warning shown. |
| Blockage advisor | `POST /api/blockage/recommend` | Actions, evidence, confidence shown. | Low evidence => low confidence warning; no Jira write affordance. |
| Admin users | `GET/POST/PATCH /api/admin/users` | Admin maintains local users. | Duplicate username => `409`; validation => `400`. |
| Admin blockage KB | `GET/POST/PATCH /api/admin/blockage-patterns` | Admin maintains KB patterns. | Missing signal/action => `400`. |

## 6. Backend Internal Application Contracts

| Caller | Provider | Contract | Purpose |
| --- | --- | --- | --- |
| Auth middleware | Identity & Access | `requireSession(cookie) -> SessionUserDto` | Resolve local user and role from httpOnly JWT. |
| Admin routes | Identity & Access | `requireAdmin(sessionUser) -> void` | Enforce admin-only commands. |
| `POST /api/sync/github/run` | Work Item Ingestion & Catalog | `runManualSync(triggeredByUserId) -> SyncRunDto` | Manual GitHub state ingest. |
| Startup/interval job | Work Item Ingestion & Catalog | `runScheduledSync() -> SyncRunDto` | Background ingest without frontend action. |
| Work Item Ingestion & Catalog | GitHub State client | `fetchPublishedState() -> PublishedStateDto` | Read published Jira state; no Jira REST call. |
| Work Item Ingestion & Catalog | Catalog repositories | `upsertState(state) -> SyncRunDto` | Normalize state and upsert Mongo read models. |
| Backlog route | Work Item Ingestion & Catalog | `listBacklog(query) -> BacklogResponse` | Serve normalized backlog read model. |
| Sprint route | Work Item Ingestion & Catalog | `listClosedSprints(projectKey, limit?) -> SprintHistoryResponse` | Serve sprint history. |
| Predictive Sizing | Work Item Ingestion & Catalog | `getIssue(issueKey, projectKey?) -> JiraIssueDto` | Resolve target issue. |
| Predictive Sizing | Work Item Ingestion & Catalog | `findHistoricalIssues(projectKey) -> JiraIssueDto[]` | Build neighbor candidate set. |
| Predictive Sizing | Recommendation repo | `saveSizingRecommendation(result) -> SizingRecommendationDto` | Persist audit/result record. |
| Blockage Advisory | Work Item Ingestion & Catalog | `getIssueText(issueKey, projectKey?) -> { issue: JiraIssueDto; inputText: string }` | Resolve issue-backed blockage input. |
| Blockage Advisory | Blockage pattern repo | `listActivePatterns() -> BlockagePatternDto[]` | Match local KB signals/actions. |
| Blockage Advisory | Recommendation repo | `saveBlockageRecommendation(result) -> BlockageRecommendationDto` | Persist audit/result record. |

## 7. V1 Decisions

- Public API stays JSON REST under `/api`.
- Responses return named DTO objects directly; only errors use `ErrorEnvelope`.
- Cookie auth is shared across frontend routes; frontend never reads JWT.
- Backlog filters can be frontend-only or query-backed; contract supports query-backed filters.
- Missing 3 closed sprints, story points, hours, or descriptions never blocks recommendation.
- Sizing v1 engine is heuristic TF-IDF/keyword similarity.
- OpenRouter adapter is future-only; if added, API shape remains stable and anonymization is mandatory.
- Jira write/transition/comment endpoints are intentionally absent.
- CSV/Markdown/PDF export is intentionally absent from v1.

## 8. Verification Checklist

- UC-04 through UC-13 have frontend-facing endpoints.
- Each endpoint maps to one owning bounded context.
- DTOs expose read models/results, not aggregate internals.
- Frontend does not send auth-derived user/account ownership ids.
- Admin-only commands require admin role.
- Warnings cover missing sprint/story point/hour/evidence data.
- Sizing result always includes `storyPoints`, `idealHours`, `confidence`, `similarIssues`, `rationale`.
- Blockage result always includes `actions`, `confidence`, `evidence`, `warnings`.
- No Jira write or direct Jira backend contract exists.
- Out-of-scope export, SSO, OpenRouter runtime calls are absent.

