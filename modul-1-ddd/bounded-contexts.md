# Bounded Contexts

## 1. Jira Source Publishing

**Amaç:** Şirket PC'de Jira'ya read-only erişir, uygulamanın tüketebileceği GitHub state üretir.

**Sahip olduğu işler**

- Jira credential ve env config okuma.
- `JIRA_PROJECT_KEY`, `JIRA_BOARD_ID`, `JIRA_STORY_POINT_FIELD` desteği.
- Story point field discovery ve env override önceliği.
- Agile API ile closed sprint history okuma.
- Backlog ve historical issue alanlarını çekme: `summary`, `description`, `issueType`, `status`, `sprint`, `storyPoint`, `timetracking`, `labels`, `components`.
- Minimum veri uyarılarını state'e yazma.
- GitHub `jira-live/state.json` publish.

**Sahip olmadığı işler**

- Jira write, transition, comment, assignment.
- Mongo upsert.
- Recommendation hesaplama.
- Kullanıcı auth.

**Public contract**

- Published GitHub state JSON.
- State warning listesi.
- Publisher run metadata.

## 2. Work Item Ingestion & Catalog

**Amaç:** GitHub state'i backend içinde normalize eder, Mongo read model'lerini güncel tutar, backlog/history sorgularını servis eder.

**Sahip olduğu işler**

- Startup ve interval poll.
- Admin manual sync endpoint.
- State normalization.
- Mongo upsert: `jira_issues`, `jira_sprints`, `jira_field_mappings`, `sync_runs`.
- Sync health/status.
- Backlog ve sprint history query endpoint'leri.

**Sahip olmadığı işler**

- Jira REST çağrısı.
- Story point tahmini.
- Blockage aksiyonu üretme.
- UI state yönetimi.

**Public contract**

- `GET /api/sync/status`
- `POST /api/sync/github/run`
- `GET /api/backlog?projectKey=ICTFT`
- `GET /api/sprints/history?projectKey=ICTFT`
- Normalized `JiraIssue` DTO.

## 3. Identity & Access

**Amaç:** Local multi-user erişim, admin yetkisi ve oturum güvenliği sağlar.

**Sahip olduğu işler**

- Seed admin ENV.
- Password hash.
- Login/logout/me.
- httpOnly JWT cookie.
- Role ve active user kontrolü.
- Admin user CRUD API.

**Sahip olmadığı işler**

- Jira user identity sync.
- SSO/LDAP/OAuth.
- Recommendation authorization policy dışında domain kararı.

**Public contract**

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`

## 4. Predictive Sizing

**Amaç:** Seçilen backlog issue için historical issue benzerliğine dayalı story point ve ideal hour önerisi üretir.

**Sahip olduğu işler**

- TF-IDF/keyword similarity.
- Similar historical issue seçimi.
- Story point önerisi.
- Ideal hour hesabı: time tracking varsa kullan, yoksa `HOURS_PER_STORY_POINT`.
- Confidence hesabı: similarity, neighbor count, data completeness, variance.
- Sizing warnings.
- Recommendation ve rationale kaydı.

**Sahip olmadığı işler**

- Jira state ingest.
- Blockage KB yönetimi.
- UI rendering.
- OpenRouter provider implementasyonu; yalnızca interface boundary.

**Public contract**

- `POST /api/sizing/recommend`
- `SizingRecommendation` DTO.
- `recommendations` collection içinde sizing kayıtları.

## 5. Blockage Advisory

**Amaç:** Issue metni veya serbest input için olası blokaj aksiyonları, evidence ve confidence üretir.

**Sahip olduğu işler**

- Jira örneklerinden ve local KB'den blockage pattern eşleme.
- Admin blockage KB CRUD.
- Action, evidence, confidence, warning üretimi.
- Blockage recommendation kaydı.

**Sahip olmadığı işler**

- Story point/ideal hour önerisi.
- Jira write veya issue update.
- User CRUD.

**Public contract**

- `POST /api/blockage/recommend`
- `GET /api/admin/blockage-patterns`
- `POST /api/admin/blockage-patterns`
- `PATCH /api/admin/blockage-patterns/:id`
- `BlockageRecommendation` DTO.
- `blockage_patterns` collection.

## 6. Delivery Experience

**Amaç:** Türkçe React/Vite UI ile auth, sync health, backlog, sizing, rationale, blockage ve admin ekranlarını akışa bağlar.

**Sahip olduğu işler**

- Login ekranı.
- Sync health görünümü.
- Backlog list/filter.
- Selected issue sizing result.
- Similar issues/rationale görünümü.
- Blockage advisor ekranı.
- Admin users ekranı.
- Admin blockage KB ekranı.
- Türkçe dictionary yapısı.

**Sahip olmadığı işler**

- Domain hesaplama.
- Mongo persistence.
- Auth token üretimi.
- CSV/Markdown/PDF export v1.

**Public contract**

- Backend API DTO'ları.
- Türkçe dictionary keys.
- Route/view state.
