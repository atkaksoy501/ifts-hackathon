# Domain Overview

## Ürün Hedefi

Modül 1, Jira backlog işlerini geçmiş Jira verisiyle karşılaştırarak story point ve ideal hour önerisi üretir. Aynı akışta blockage advisor, seçilen issue veya serbest metin için olası blokaj aksiyonları önerir. Sistem Jira'ya yazmaz; şirket ağı içindeki publisher read-only veri toplar, uygulama GitHub state üzerinden beslenir.

## Aktörler

| Aktör | Amaç |
| --- | --- |
| Kullanıcı | Backlog issue seçer, sizing ve blockage önerisi alır, rationale inceler. |
| Admin | Kullanıcıları, sync'i ve blockage KB kayıtlarını yönetir. |
| Jira Publisher Operatörü | Şirket PC'de Python publisher config ve çalışmasını yönetir. |
| Backend Sync Job | GitHub state'i startup ve interval ile ingest eder. |
| Jira | Upstream read-only kaynak sistem. |
| GitHub State | Jira ile uygulama arasındaki yayınlanmış state aracı. |
| MongoDB | Uygulama read model ve karar kayıtlarının kalıcı deposu. |
| OpenRouter | v1 sonrası opsiyonel AI provider; anonimleştirme olmadan kullanılmaz. |

## Subdomain'ler

| Tip | Subdomain | Neden |
| --- | --- | --- |
| Core | Predictive Sizing | Ürünün ana değer önerisi: story point, ideal hour, confidence, rationale. |
| Core | Blockage Advisory | İkinci ana değer: blokaj aksiyonu, evidence, confidence. |
| Supporting | Jira Source Publishing | Kurumsal ağ/Jira erişim kısıtını çözer, read-only state üretir. |
| Supporting | Work Item Ingestion & Catalog | GitHub state'i normalize eder, Mongo read model'lerini güncel tutar. |
| Supporting | Identity & Access | Local multi-user auth ve admin CRUD sağlar. |
| Supporting | Delivery Experience | Türkçe UI, dictionary hazırlığı, ekran akışları ve API tüketimi. |
| Generic | Persistence & Runtime | MongoDB, Docker image, Express/React altyapısı. |

## Kabiliyet Sahipliği

| Kabiliyet | Owning Context |
| --- | --- |
| `JIRA_PROJECT_KEY`, `JIRA_BOARD_ID`, `JIRA_STORY_POINT_FIELD` env desteği | Jira Source Publishing |
| `/rest/api/2/field` ile story point field discovery | Jira Source Publishing |
| Agile API ile son closed sprintleri çekme | Jira Source Publishing |
| Minimum 3 sprint yoksa state warning yazma | Jira Source Publishing |
| Backlog ve historical issue alanlarını toplama | Jira Source Publishing |
| GitHub `jira-live/state.json` yazma | Jira Source Publishing |
| GitHub state poll, normalize, Mongo upsert | Work Item Ingestion & Catalog |
| Startup/interval sync job | Work Item Ingestion & Catalog |
| Admin manual sync endpoint | Work Item Ingestion & Catalog |
| Sync health/status okuma | Work Item Ingestion & Catalog |
| Login/logout/me, password hash, httpOnly JWT | Identity & Access |
| Admin user CRUD | Identity & Access |
| Backlog list/filter data servisleri | Work Item Ingestion & Catalog |
| Backlog list/filter UI | Delivery Experience |
| Similar historical issues bulma | Predictive Sizing |
| Story point önerisi | Predictive Sizing |
| Ideal hour önerisi ve fallback | Predictive Sizing |
| Confidence ve sizing warning üretimi | Predictive Sizing |
| Similar issues/rationale gösterimi | Delivery Experience |
| Blockage recommendation | Blockage Advisory |
| Admin blockage KB CRUD | Blockage Advisory |
| Türkçe UI dictionary yapısı | Delivery Experience |

## V1 Politika Özeti

- V1 recommendation engine heuristic TF-IDF/keyword similarity ile başlar.
- OpenRouter adapter aynı interface'i kullanır, fakat MVP sonrası eklenir.
- Jira metinleri anonimleştirilmeden dış servise çıkmaz.
- Eksik sprint, story point veya hour verisi öneriyi engellemez; `warnings[]` ve confidence düşüşü üretir.
