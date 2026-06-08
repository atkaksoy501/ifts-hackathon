# Aggregates and Entities

## Jira Source Publishing

### Aggregate Root: `PublishedJiraState`

GitHub'a yazılacak state snapshot'ını temsil eder.

**Entity'ler**

- `PublishedIssue`: Jira'dan okunan issue alanları.
- `PublishedSprint`: Closed sprint metadata.
- `PublishedFieldMapping`: Story point ve diğer field çözümlemeleri.
- `PublisherRun`: Publish denemesi, zaman, warning/error.

**Value Object'ler**

- `ProjectKey`
- `BoardId`
- `JiraFieldId`
- `GitHubStateRef`
- `PublisherWarning`

**Invariant'lar**

- Publisher Jira'ya write yapamaz.
- Env `JIRA_STORY_POINT_FIELD` varsa discovery sonucundan önceliklidir.
- Minimum 3 closed sprint yoksa state geçerlidir, fakat warning zorunludur.
- Published issue payload'i recommendation hesaplamaz; sadece veri taşır.

## Work Item Ingestion & Catalog

### Aggregate Root: `SyncRun`

Her backend ingest denemesinin lifecycle kaydıdır.

**Entity'ler**

- `SyncSource`: GitHub branch/path/ref bilgisi.
- `SyncWarning`: State veya normalization uyarısı.
- `SyncError`: Fetch/parse/upsert hatası.

**Invariant'lar**

- Her manual veya scheduled ingest bir `SyncRun` üretir.
- Failed sync eski read model'i otomatik silmez.
- Warning varsa status yine success olabilir.

### Aggregate Root: `JiraIssueRecord`

Mongo `jira_issues` içindeki normalized issue read model'idir.

**Entity'ler**

- `IssueSprintMembership`
- `IssueTimeTracking`

**Value Object'ler**

- `IssueKey`
- `IssueType`
- `StatusCategory`
- `StoryPoint`
- `Hours`
- `LabelSet`
- `ComponentSet`

**Invariant'lar**

- `key` unique'dir.
- `storyPoints` yokluk değeri ile `0` farklıdır.
- `labels` ve `components` boş array olabilir, null olmaz.
- Historical ve backlog ayrımı status/sprint/read query ile yapılır; farklı aggregate tipi değildir.

### Aggregate Root: `JiraSprintRecord`

Mongo `jira_sprints` içindeki sprint read model'idir.

**Invariant'lar**

- Sprint ID unique'dir.
- Closed sprint recommendation history için kullanılabilir.

### Aggregate Root: `JiraFieldMappingRecord`

Mongo `jira_field_mappings` içindeki Jira field mapping kaydıdır.

**Invariant'lar**

- Project key başına aktif story point mapping tek olmalıdır.

## Identity & Access

### Aggregate Root: `UserAccount`

Local uygulama kullanıcısıdır.

**Entity'ler**

- `UserRoleAssignment`

**Value Object'ler**

- `EmailOrUsername`
- `PasswordHash`
- `Role`
- `JwtSessionClaims`

**Invariant'lar**

- Password raw olarak saklanamaz.
- Disabled user login olamaz.
- Admin user CRUD sadece admin role ile yapılır.
- Seed admin ENV'den oluşturulur; tekrar seed duplicate user üretmez.
- JWT httpOnly cookie ile taşınır.

## Predictive Sizing

### Aggregate Root: `SizingRecommendation`

Bir issue için üretilmiş story point, ideal hour, confidence ve rationale sonucudur.

**Entity'ler**

- `SimilarIssue`
- `ConfidenceBreakdown`
- `SizingWarning`

**Value Object'ler**

- `IssueKey`
- `StoryPointEstimate`
- `IdealHoursEstimate`
- `SimilarityScore`
- `NeighborCount`
- `DataCompletenessScore`
- `VarianceScore`
- `RationaleText`

**Invariant'lar**

- `confidence` 0 ile 1 arasındadır.
- Similar issue listesi target issue'yu içermez.
- Story point önerisi historical issue verisine veya açık fallback politikasına dayanır.
- Ideal hour time tracking varsa ondan, yoksa `HOURS_PER_STORY_POINT` fallback ile hesaplanır.
- Eksik story point/hour/sprint verisi recommendation'ı bloklamaz; warning üretir.
- Rationale boş olamaz.

## Blockage Advisory

### Aggregate Root: `BlockagePattern`

Admin tarafından yönetilen blokaj bilgi tabanı kaydıdır.

**Entity'ler**

- `PatternSignal`
- `PatternAction`

**Value Object'ler**

- `PatternName`
- `KeywordSet`
- `ComponentHint`
- `ActionText`
- `PatternStatus`

**Invariant'lar**

- Aktif pattern en az bir signal ve bir action içermelidir.
- Pattern action Jira'ya otomatik yazılmaz.
- Admin KB değişiklikleri audit için izlenebilir olmalıdır.

### Aggregate Root: `BlockageRecommendation`

Issue veya input text için üretilen action/evidence/confidence sonucudur.

**Entity'ler**

- `RecommendedAction`
- `EvidenceItem`
- `BlockageWarning`

**Value Object'ler**

- `InputText`
- `IssueKey`
- `ConfidenceScore`

**Invariant'lar**

- `inputText` boş olamaz.
- `confidence` 0 ile 1 arasındadır.
- Evidence olmadan high confidence üretilemez.
- Warning akışı bloklamaz.

## Delivery Experience

Delivery context domain aggregate sahiplenmez. View state, route state, form state ve dictionary entries presentation model'dir.

**Presentation Model'ler**

- `LoginViewModel`
- `SyncHealthViewModel`
- `BacklogFilterViewModel`
- `SizingResultViewModel`
- `SimilarIssuesViewModel`
- `BlockageAdvisorViewModel`
- `AdminUsersViewModel`
- `AdminBlockageKbViewModel`

**Invariant'lar**

- UI domain hesaplama yapmaz.
- UI warning'leri saklamaz; API sonucundan gösterir.
- Dictionary key'leri stable olmalıdır.

## Collection Mapping

| Collection | Context | Aggregate/Record |
| --- | --- | --- |
| `users` | Identity & Access | `UserAccount` |
| `jira_issues` | Work Item Ingestion & Catalog | `JiraIssueRecord` |
| `jira_sprints` | Work Item Ingestion & Catalog | `JiraSprintRecord` |
| `jira_field_mappings` | Work Item Ingestion & Catalog | `JiraFieldMappingRecord` |
| `recommendations` | Predictive Sizing / Blockage Advisory | `SizingRecommendation`, `BlockageRecommendation` |
| `blockage_patterns` | Blockage Advisory | `BlockagePattern` |
| `sync_runs` | Work Item Ingestion & Catalog | `SyncRun` |
