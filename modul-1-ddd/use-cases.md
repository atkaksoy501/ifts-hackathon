# Use Cases

## UC-01: Jira Field Discovery Çalıştır

| Alan | Değer |
| --- | --- |
| Aktör | Jira Publisher Operatörü |
| Owner Context | Jira Source Publishing |
| Önkoşul | Jira token, `JIRA_PROJECT_KEY`, opsiyonel `JIRA_STORY_POINT_FIELD` config hazır. |
| Akış | Publisher `/rest/api/2/field` çağırır; env override varsa onu seçer; mapping state'e yazılır. |
| Sonuç | Story point field mapping publish state içinde yer alır. |
| Hata/Uyarı | Field bulunamazsa warning yazılır; publish akışı bloklanmaz. |

## UC-02: Jira State Publish Et

| Alan | Değer |
| --- | --- |
| Aktör | Jira Publisher Operatörü / Scheduled Publisher |
| Owner Context | Jira Source Publishing |
| Önkoşul | Şirket PC Jira REST'e ve GitHub'a erişebilir. |
| Akış | Publisher closed sprint, backlog issue, historical issue ve field mapping verisini çeker; state payload üretir; GitHub `jira-live/state.json` dosyasını günceller. |
| Sonuç | Backend'in ingest edeceği read-only state hazır olur. |
| Hata/Uyarı | Minimum 3 closed sprint yoksa warning eklenir. Jira write yapılmaz. |

## UC-03: Backend Startup Sync Yap

| Alan | Değer |
| --- | --- |
| Aktör | Backend Sync Job |
| Owner Context | Work Item Ingestion & Catalog |
| Önkoşul | Backend başlar, GitHub state config erişilebilir. |
| Akış | Job state'i indirir, parse eder, normalize eder, Mongo upsert yapar, `sync_runs` kaydı üretir. |
| Sonuç | `jira_issues`, `jira_sprints`, `jira_field_mappings` güncellenir. |
| Hata/Uyarı | Fetch/parse hatası sync status'a yazılır; eski veri otomatik silinmez. |

## UC-04: Admin Manual Sync Tetikle

| Alan | Değer |
| --- | --- |
| Aktör | Admin |
| Owner Context | Work Item Ingestion & Catalog |
| Önkoşul | Admin login olmuş. |
| Akış | Admin `POST /api/sync/github/run` çağırır; backend ingest job'ı tek sefer çalıştırır. |
| Sonuç | Sync result ve warnings UI'a döner. |
| Hata/Uyarı | Yetkisiz kullanıcı 403 alır; GitHub erişim hatası sync error olur. |

## UC-05: Sync Health Gör

| Alan | Değer |
| --- | --- |
| Aktör | Kullanıcı / Admin |
| Owner Context | Work Item Ingestion & Catalog |
| Önkoşul | Kullanıcı login olmuş. |
| Akış | UI `GET /api/sync/status` çağırır; son sync zamanı, status, warning/error bilgilerini gösterir. |
| Sonuç | Kullanıcı verinin güncelliğini görür. |
| Hata/Uyarı | Hiç sync yoksa empty state ve warning gösterilir. |

## UC-06: Login Ol

| Alan | Değer |
| --- | --- |
| Aktör | Kullanıcı |
| Owner Context | Identity & Access |
| Önkoşul | User active ve password hash kayıtlı. |
| Akış | Kullanıcı `POST /api/auth/login` ile credential gönderir; backend hash doğrular; httpOnly JWT cookie set eder. |
| Sonuç | `GET /api/auth/me` session user döner. |
| Hata/Uyarı | Hatalı credential 401; disabled user 403. |

## UC-07: Admin User CRUD Yap

| Alan | Değer |
| --- | --- |
| Aktör | Admin |
| Owner Context | Identity & Access |
| Önkoşul | Admin role ile login. |
| Akış | Admin user listeler, oluşturur veya patch eder. Password varsa hashlenir, role/active state güncellenir. |
| Sonuç | `users` collection güncel kalır. |
| Hata/Uyarı | Non-admin 403; duplicate username validation error. |

## UC-08: Backlog Listele ve Filtrele

| Alan | Değer |
| --- | --- |
| Aktör | Kullanıcı |
| Owner Context | Work Item Ingestion & Catalog |
| Önkoşul | Kullanıcı login olmuş, ingest edilmiş issue verisi var. |
| Akış | UI `GET /api/backlog?projectKey=ICTFT` çağırır; frontend issue type/status/label/component filtreleri uygular veya API query genişletilir. |
| Sonuç | Kullanıcı sizing için issue seçebilir. |
| Hata/Uyarı | Veri yoksa sync health bağlantılı empty state gösterilir. |

## UC-09: Sizing Recommendation Al

| Alan | Değer |
| --- | --- |
| Aktör | Kullanıcı |
| Owner Context | Predictive Sizing |
| Önkoşul | Hedef backlog issue mevcut. |
| Akış | UI `POST /api/sizing/recommend` çağırır; context normalized issue'yu alır; historical issue neighbor set'i bulur; story point, ideal hour, confidence, warnings ve rationale üretir. |
| Sonuç | `SizingRecommendation` döner ve `recommendations` collection'a kaydedilebilir. |
| Hata/Uyarı | Yetersiz neighbor, eksik story point/hour/sprint verisi warning üretir; kullanıcı akışı devam eder. |

## UC-10: Ideal Hour Fallback Hesapla

| Alan | Değer |
| --- | --- |
| Aktör | Predictive Sizing Engine |
| Owner Context | Predictive Sizing |
| Önkoşul | Story point önerisi var; historical time tracking eksik veya yetersiz. |
| Akış | Engine `HOURS_PER_STORY_POINT` config katsayısını story point önerisiyle çarpar; warning ekler. |
| Sonuç | `idealHours` alanı boş kalmaz. |
| Hata/Uyarı | Config yoksa default policy kullanılır veya warning ile düşük confidence döner. |

## UC-11: Similar Issues ve Rationale İncele

| Alan | Değer |
| --- | --- |
| Aktör | Kullanıcı |
| Owner Context | Delivery Experience |
| Önkoşul | Sizing recommendation üretilmiş. |
| Akış | UI similar issue key, summary, similarity, story point, time spent ve rationale alanlarını gösterir. |
| Sonuç | Kullanıcı önerinin nedenini anlayabilir. |
| Hata/Uyarı | Similar issue listesi boşsa warning ve düşük confidence görünür. |

## UC-12: Blockage Recommendation Al

| Alan | Değer |
| --- | --- |
| Aktör | Kullanıcı |
| Owner Context | Blockage Advisory |
| Önkoşul | Issue key veya input text sağlanmış. |
| Akış | UI `POST /api/blockage/recommend` çağırır; context issue text, Jira examples ve local KB pattern'leriyle action/evidence/confidence üretir. |
| Sonuç | `BlockageRecommendation` UI'a döner. |
| Hata/Uyarı | Evidence zayıfsa confidence düşer; warning döner. Jira'ya write yapılmaz. |

## UC-13: Admin Blockage KB Yönet

| Alan | Değer |
| --- | --- |
| Aktör | Admin |
| Owner Context | Blockage Advisory |
| Önkoşul | Admin login olmuş. |
| Akış | Admin blockage pattern listeler, oluşturur veya patch eder. Signal/action/status güncellenir. |
| Sonuç | `blockage_patterns` collection recommendation motoru için güncel kalır. |
| Hata/Uyarı | Signal veya action eksikse validation error. |

## UC-14: OpenRouter Adapter Ekleme Boundary'si

| Alan | Değer |
| --- | --- |
| Aktör | Geliştirici |
| Owner Context | Predictive Sizing / Blockage Advisory |
| Önkoşul | Heuristic engine interface stabil; anonimleştirme policy hazır. |
| Akış | OpenRouter adapter aynı recommendation interface'ine bağlanır; Jira metni provider'a gitmeden önce anonimleştirilir. |
| Sonuç | Provider değişimi UI/API contract'ını kırmaz. |
| Hata/Uyarı | Anonimleştirme yoksa external call kapalı kalır. |

## API Coverage

| Endpoint | Use Case |
| --- | --- |
| `POST /api/auth/login` | UC-06 |
| `POST /api/auth/logout` | UC-06 |
| `GET /api/auth/me` | UC-06 |
| `GET /api/admin/users` | UC-07 |
| `POST /api/admin/users` | UC-07 |
| `PATCH /api/admin/users/:id` | UC-07 |
| `GET /api/admin/blockage-patterns` | UC-13 |
| `POST /api/admin/blockage-patterns` | UC-13 |
| `PATCH /api/admin/blockage-patterns/:id` | UC-13 |
| `GET /api/sync/status` | UC-05 |
| `POST /api/sync/github/run` | UC-04 |
| `GET /api/backlog?projectKey=ICTFT` | UC-08 |
| `GET /api/sprints/history?projectKey=ICTFT` | UC-03 |
| `POST /api/sizing/recommend` | UC-09 |
| `POST /api/blockage/recommend` | UC-12 |
