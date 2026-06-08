# Use Cases

## UC-301: Reviewable Sprint Listesi Gor

| Alan | Deger |
| --- | --- |
| Aktor | Kullanici |
| Owner Context | Sprint Review Workspace |
| Onkosul | Kullanici login olmus. |
| Akis | UI `GET /api/sprint-review/sprints` cagirir; backend closed/reviewable sprint listesini source refs ve basic status ile dondurur. |
| Sonuc | Kullanici Sprint Review tab'inda sprint secer. |
| Hata/Uyari | Sprint yoksa empty state ve warning. |

## UC-302: Sprint Evidence Gor

| Alan | Deger |
| --- | --- |
| Aktor | Kullanici |
| Owner Context | Sprint Evidence Intake |
| Onkosul | Sprint id mevcut; kullanici login olmus. |
| Akis | UI `GET /api/sprint-review/sprints/:sprintId/evidence` cagirir; backend completed items, incomplete items, PRs, commits, closing remarks ve warnings dondurur. |
| Sonuc | `SprintEvidenceDto` UI'da gorunur. |
| Hata/Uyari | Evidence yoksa `NOT_FOUND` veya sparse data warning policy uygulanir. |

## UC-303: Jira Sprint Snapshot Ingest Et

| Alan | Deger |
| --- | --- |
| Aktor | Jira State Publisher / Backend Service |
| Owner Context | Sprint Evidence Intake |
| Onkosul | Jira read-only state erisilebilir. |
| Akis | Publisher sprint start/close snapshot, story point, timeSpent, assignee, issueType, changelog/status history, comments ve resolution remarks verisini normalize edilecek state'e tasir. |
| Sonuc | Sprint planned ve actual baseline icin source data hazir olur. |
| Hata/Uyari | Start snapshot yoksa planned baseline warning; timeSpent eksikse fallback warning. |

## UC-304: GitHub PR/Commit Evidence Bagla

| Alan | Deger |
| --- | --- |
| Aktor | GitHub Evidence Adapter |
| Owner Context | Sprint Evidence Intake |
| Onkosul | PR/commit metadata read-only olarak alinmis. |
| Akis | Adapter PR title, branch ve commit message icinden `/[A-Z][A-Z0-9]+-\d+/` regex'i ile issue key arar; matched evidence issue'ya baglanir. |
| Sonuc | PR ve commit evidence'i sprint evidence set'ine eklenir. |
| Hata/Uyari | Issue key bulunamazsa unmatched evidence ve warning uretilir. |

## UC-305: Manager Remark Ekle

| Alan | Deger |
| --- | --- |
| Aktor | Manager / Admin |
| Owner Context | Sprint Review Workspace |
| Onkosul | Kullanici role `manager` veya `admin`; sprint mevcut. |
| Akis | UI remark formundan `POST /api/sprint-review/sprints/:sprintId/remarks` cagirir; backend text, author, role ve createdAt saklar. |
| Sonuc | Remark sprint review session'a eklenir ve sonraki report'a source olur. |
| Hata/Uyari | `user` role 403; bos remark `INVALID_REQUEST`. |

## UC-306: Heuristic Turkish Demo Summary Uret

| Alan | Deger |
| --- | --- |
| Aktor | Manager / Admin |
| Owner Context | Sprint Demo Reporting |
| Onkosul | Sprint evidence mevcut; role `manager` veya `admin`. |
| Akis | `POST /api/sprint-review/reports` heuristic provider'i calistirir; completed items, PR/commit evidence, closing remarks ve warnings ile Turkce summary section'lari uretir. |
| Sonuc | Versioned `SprintDemoReportDto` JSON olarak persist edilir. |
| Hata/Uyari | Evidence sparse ise report uretilir ama warning section'i dolu olur. |

## UC-307: OpenRouter Provider Fallback Kullan

| Alan | Deger |
| --- | --- |
| Aktor | Sprint Demo Reporting Service |
| Owner Context | Sprint Demo Reporting |
| Onkosul | P2 OpenRouter provider aktif edilmis. |
| Akis | Service evidence'i anonymizer'dan gecirir, schema validation uygular; provider unavailable/malformed ise heuristic provider'a doner. |
| Sonuc | Valid report uretilir; provider metadata fallback durumunu kaydeder. |
| Hata/Uyari | `PROVIDER_FALLBACK_USED` veya `ANONYMIZER_REQUIRED` warning/error policy uygulanir. |

## UC-308: JSON Report Oku

| Alan | Deger |
| --- | --- |
| Aktor | Kullanici |
| Owner Context | Sprint Demo Reporting |
| Onkosul | Report id mevcut; kullanici login olmus. |
| Akis | UI `GET /api/sprint-review/reports/:id` cagirir. |
| Sonuc | Versioned `SprintDemoReportDto` doner. |
| Hata/Uyari | Report bulunamazsa `NOT_FOUND`. |

## UC-309: Markdown Report Oku

| Alan | Deger |
| --- | --- |
| Aktor | Kullanici |
| Owner Context | Sprint Demo Reporting |
| Onkosul | Report id mevcut; Markdown render hazir. |
| Akis | UI `GET /api/sprint-review/reports/:id/markdown` cagirir; backend Markdown body dondurur. |
| Sonuc | Kullanici preview, copy veya download yapar. |
| Hata/Uyari | Markdown body bos olamaz; report bulunamazsa `NOT_FOUND`. |

## UC-310: Planned vs Actual Variance Hesapla

| Alan | Deger |
| --- | --- |
| Aktor | Kullanici |
| Owner Context | Delivery Analytics |
| Onkosul | Sprint evidence start/close baseline mevcut. |
| Akis | UI `GET /api/analytics/variance?projectKey&sprintId&trendWindow=6` cagirir; backend planned/actual SP ve hour delta hesaplar. |
| Sonuc | `VarianceAnalyticsDto` variance rows ve summary ile doner. |
| Hata/Uyari | Planned baseline yoksa warning; planned 0 ise delta percent null/warning. |

## UC-311: Velocity Trend Uret

| Alan | Deger |
| --- | --- |
| Aktor | Delivery Analytics Service |
| Owner Context | Delivery Analytics |
| Onkosul | Closed sprint history mevcut. |
| Akis | Service default `trendWindow=6` veya query degerine gore completed SP/hour trend point'leri hesaplar. |
| Sonuc | Variance analytics icinde velocity trend doner. |
| Hata/Uyari | 3'ten az sprint varsa `LOW_SPRINT_HISTORY` warning. |

## UC-312: Bottleneck Grouping Uret

| Alan | Deger |
| --- | --- |
| Aktor | Delivery Analytics Service |
| Owner Context | Delivery Analytics |
| Onkosul | Sprint evidence issue, status, assignee ve component bilgisi icerir. |
| Akis | Service incomplete/spillover ve time variance sinyallerini assignee, issueType, status/category ve component bazinda gruplar. |
| Sonuc | Bottleneck groups UI variance panelinde gorunur. |
| Hata/Uyari | Assignee/component eksikse `unknown` group ve warning kullanilir. |

## UC-313: Spillover Metrics Hesapla

| Alan | Deger |
| --- | --- |
| Aktor | Kullanici |
| Owner Context | Sprint Health & Spillover |
| Onkosul | Core evidence ve variance hazir; bonus scope aktif. |
| Akis | UI `GET /api/analytics/spillover` cagirir; backend planned olup Done olmayan item'lari carryover %, by issueType, by assignee ve volatility olarak ozetler. |
| Sonuc | `SpilloverMetricsDto` doner. |
| Hata/Uyari | Bonus yoksa route P2/P3 olarak gizli veya 404/feature flag policy. |

## UC-314: Sprint Health Score Hesapla

| Alan | Deger |
| --- | --- |
| Aktor | Kullanici |
| Owner Context | Sprint Health & Spillover |
| Onkosul | Variance, spillover, capacity/allocation ve block duration sinyalleri mevcut veya fallback warning'leri hazir. |
| Akis | UI `GET /api/analytics/health` cagirir; backend velocity variance 30%, spillover 25%, burnout 20%, block duration 25% agirliklariyla score hesaplar. |
| Sonuc | `SprintHealthScoreDto` score `1..100`, breakdown, thresholds ve warnings ile doner. |
| Hata/Uyari | Capacity/allocation eksikse burnout signal warning ve conservative score. |

## UC-315: Sprint Review Dashboard Akisini Kullan

| Alan | Deger |
| --- | --- |
| Aktor | Kullanici / Manager / Admin |
| Owner Context | Delivery Experience |
| Onkosul | Kullanici login olmus; backend route'lari hazir. |
| Akis | Kullanici Sprint Review tab'a girer, sprint secer, evidence gorur; manager/admin remark ekler ve report generate eder; user report/variance gorur; bonus aktifse spillover/health panelleri gorunur. |
| Sonuc | Tek dashboard icinde sprint review, report export ve analytics tamamlanir. |
| Hata/Uyari | Loading, empty, error, warning ve permission states UI'da gorunur. |

## UC-316: Permission Policy Uygula

| Alan | Deger |
| --- | --- |
| Aktor | Backend API |
| Owner Context | Identity & Access + Modul 3 Contexts |
| Onkosul | Request `/api` altinda gelir. |
| Akis | Session guard tum Modul 3 endpoint'lerinde calisir; remark/report generate `manager|admin`; admin CRUD `admin`. |
| Sonuc | Role policy tutarli uygulanir. |
| Hata/Uyari | No session 401; insufficient role 403. |

## API Coverage

| Endpoint | Use Case |
| --- | --- |
| `GET /api/sprint-review/sprints` | UC-301 |
| `GET /api/sprint-review/sprints/:sprintId/evidence` | UC-302, UC-303, UC-304 |
| `POST /api/sprint-review/sprints/:sprintId/remarks` | UC-305, UC-316 |
| `POST /api/sprint-review/reports` | UC-306, UC-307, UC-316 |
| `GET /api/sprint-review/reports/:id` | UC-308 |
| `GET /api/sprint-review/reports/:id/markdown` | UC-309 |
| `GET /api/analytics/variance?projectKey&sprintId&trendWindow=6` | UC-310, UC-311, UC-312 |
| `GET /api/analytics/spillover` | UC-313 |
| `GET /api/analytics/health` | UC-314 |
