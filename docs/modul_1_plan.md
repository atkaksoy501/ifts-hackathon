# Modül 1 Planı: Predictive Sizing + Blockage Advisor

## Özet

- Kurulum: TypeScript monorepo, `frontend` React/Vite, `backend` Express, MongoDB, tek Docker image.
- Jira erişim: uygulama Jira'ya direkt gitmez. Şirket PC'deki Python publisher genişler, read-only Jira verisini GitHub `jira-live` state'e yazar.
- App ingest: Express backend GitHub state'i poll eder, Mongo'ya upsert eder.
- Local Mongo URI default: `mongodb://hackathon:hackathon123@192.168.0.50:27017/hackathon?authSource=hackathon&authMechanism=SCRAM-SHA-256`.
- AI v1: OpenRouter implementasyonu sona kalır. Önce heuristic TF-IDF/keyword similarity çalışır. OpenRouter adapter aynı interface'e sonra eklenir, anonimleştirme zorunlu.

## Ana Değişiklikler

### Python Publisher

- `JIRA_PROJECT_KEY=ICTFT`, `JIRA_BOARD_ID`, `JIRA_STORY_POINT_FIELD` env destekle.
- Field discovery: `/rest/api/2/field` ile story point field bul; env override varsa onu kullan.
- Agile API ile son closed sprintleri çek; minimum 3 sprint yoksa state'e warning koy, bloklama yapma.
- Backlog ve historical issues için `summary`, `description`, `issueType`, `status`, `sprint`, `storyPoint`, `timetracking`, `labels`, `components` çek.
- Jira write yok; sadece GitHub state write.

### Backend

- Mongo collections: `users`, `jira_issues`, `jira_sprints`, `jira_field_mappings`, `recommendations`, `blockage_patterns`, `sync_runs`.
- Auth: local multi-user. Seed admin ENV'den; admin user CRUD UI/API; password hash; httpOnly JWT cookie.
- GitHub ingest job: startup + interval poll; admin manual sync endpoint.
- Sizing engine: similar historical issues -> story point + ideal hour önerisi.
- Ideal hour: Jira time tracking varsa kullan, yoksa `HOURS_PER_STORY_POINT` fallback.
- Confidence: similarity, neighbor count, data completeness, variance.
- Eksik 3 sprint/story point/hour için warning döndür, kullanıcı akışını bloklama.

### Frontend

- Türkçe UI, ileride i18n için dictionary yapısı hazır.
- Screens: login, sync health, backlog list/filter, selected issue sizing result, similar issues/rationale, blockage advisor, admin users, admin blockage KB.
- Export CSV/Markdown/PDF P2 nice-to-have, MVP dışında.

## API/Type Kontratı

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Admin

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `GET /api/admin/blockage-patterns`
- `POST /api/admin/blockage-patterns`
- `PATCH /api/admin/blockage-patterns/:id`

### Sync/Jira

- `GET /api/sync/status`
- `POST /api/sync/github/run`
- `GET /api/backlog?projectKey=ICTFT`
- `GET /api/sprints/history?projectKey=ICTFT`

### Recommendations

- `POST /api/sizing/recommend`
- `POST /api/blockage/recommend`

### Core DTO

```ts
type JiraIssue = {
  key: string;
  summary: string;
  description?: string;
  issueType?: string;
  statusCategory?: string;
  sprintIds: string[];
  storyPoints?: number;
  timeSpentHours?: number;
  labels: string[];
  components: string[];
};

type SizingRecommendation = {
  issueKey: string;
  storyPoints: number;
  idealHours: number;
  confidence: number;
  warnings: string[];
  similarIssues: Array<{
    key: string;
    summary: string;
    similarity: number;
    storyPoints?: number;
    timeSpentHours?: number;
  }>;
  rationale: string;
};

type BlockageRecommendation = {
  issueKey?: string;
  inputText: string;
  actions: string[];
  confidence: number;
  evidence: string[];
  warnings: string[];
};
```

## Test Planı

### Unit Testler

- Jira field discovery + env override.
- State normalization + Mongo upsert.
- Auth hashing/JWT/roles.
- Sizing similarity, story point prediction, hour fallback, warning paths.
- Blockage recommendation from Jira examples + local KB.

### Integration Testler

- Express routes with test Mongo/fake repositories.
- GitHub state ingest fixture.

### E2E Testler

- Login -> backlog seç -> sizing al -> blockage önerisi al.

## Varsayımlar

- `ICTFT` placeholder; env/config ile değişebilir.
- Board ID deploy/dev config ile verilecek.
- UI v1 Türkçe; ileride multi-language.
- Prod Cloud Run Jira'ya erişmez; prod data path aynı kalır: Company PC publisher -> GitHub state -> backend ingest -> Mongo Atlas.
- OpenRouter devreye alınırken Jira metinleri anonimleştirilmeden dış servise gönderilmez.

