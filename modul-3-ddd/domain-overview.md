# Domain Overview

## Urun Hedefi

Modul 3, Jira ve GitHub read-only state uzerinden sprint kapanis evidence'ini toplar, manager remark'lari ile zenginlestirir, Turkce sprint demo/review raporu uretir ve planned vs actual varyans, spillover ve health sinyallerini dashboard'da gosterir.

Modul 2 capacity/allocation verisi stabil olduktan sonra burnout ve over-allocation hesaplarinda kullanilir. Jira veya GitHub'a yazmaz.

## Aktorler

| Aktor | Amac |
| --- | --- |
| Kullanici | Sprint listesini, evidence'i, report'u ve analytics sonucunu gorur. |
| Manager | Sprint remark ekler, demo/review report generate eder, variance sonucunu yorumlar. |
| Admin | User/admin CRUD ve mevcut admin-only ayarlari yonetir; manager yetkilerini de kullanabilir. |
| Backend Service | Evidence normalize eder, report/analytics hesaplar, versioned persist eder. |
| Jira State Publisher | Sprint start/close snapshot, issue fields, changelog, comment ve resolution remark verisini read-only state'e tasir. |
| GitHub Evidence Adapter | PR/commit metadata okur, issue key mapping warning'leri uretir. |
| Heuristic Summary Provider | Deterministic Turkce executive/demo summary uretir. |
| OpenRouter Provider | P2 dis AI adapter; anonymizer, schema validation ve fallback arkasinda calisir. |
| Delivery UI | Sprint Review tab, evidence view, remark form, report preview/export ve variance visuals gosterir. |

## Subdomain Siniflama

| Subdomain | Tip | Owning Context |
| --- | --- | --- |
| Sprint Evidence Intake | Core | Sprint Evidence Intake |
| Sprint Review Workspace | Core | Sprint Review Workspace |
| Sprint Demo Reporting | Core | Sprint Demo Reporting |
| Delivery Analytics | Core | Delivery Analytics |
| Sprint Health & Spillover | Supporting/Bonus | Sprint Health & Spillover |
| Evidence Publishing | Supporting | Sprint Evidence Intake |
| Delivery UX | Generic/Supporting | Delivery Experience |
| Identity/Auth | Existing Supporting | Identity & Access |
| Work Item Catalog | Existing Supporting | Work Item Ingestion & Catalog |
| Team Capacity/Allocation | Existing Supporting | Modul 2 Team Capability & Capacity, Smart Allocation |

## Kabiliyetler

| Capability | Owner Context | MVP Notu |
| --- | --- | --- |
| User role'a `manager` ekle | Identity & Access | `user | manager | admin`; shared contract genisler. |
| Sprint listesi getir | Sprint Review Workspace | `GET /api/sprint-review/sprints`. |
| Sprint evidence getir | Sprint Evidence Intake | `GET /api/sprint-review/sprints/:sprintId/evidence`. |
| Jira sprint snapshot ingest et | Sprint Evidence Intake | Start/close planned/actual baseline. |
| Jira changelog/comment/resolution normalize et | Sprint Evidence Intake | Closing remarks ve status history evidence olur. |
| GitHub PR/commit evidence bagla | Sprint Evidence Intake | Regex issue key mapping; miss durumunda warning. |
| Manager remark ekle | Sprint Review Workspace | `manager|admin`; Jira write yok. |
| Turkish executive/demo summary uret | Sprint Demo Reporting | Heuristic default provider. |
| OpenRouter adapter siniri kur | Sprint Demo Reporting | P2; anonymizer zorunlu. |
| Versioned JSON report persist et | Sprint Demo Reporting | `SprintDemoReportDto`. |
| Markdown report render et | Sprint Demo Reporting | `GET /api/sprint-review/reports/:id/markdown`. |
| Planned vs actual variance hesapla | Delivery Analytics | SP/hour variance. |
| Velocity trend hesapla | Delivery Analytics | Default trendWindow `6`. |
| Bottleneck grouping uret | Delivery Analytics | Assignee, issueType, status, component gibi gruplar. |
| Spillover metrics hesapla | Sprint Health & Spillover | Bonus: carryover %, type, assignee, volatility. |
| Sprint health score hesapla | Sprint Health & Spillover | Bonus: score `1..100`, weighted breakdown. |
| Sprint Review UI akisi sagla | Delivery Experience | Mevcut `DeliveryDashboard` icinde yeni tab. |
| JSON/Markdown export sun | Delivery Experience | Copy/download/preview. |

## Policy Ozeti

- Auth: Tum Modul 3 endpoint'leri session ister.
- Read: `user|manager|admin` sprint listesi, evidence, report ve analytics okuyabilir.
- Generate/write: `manager|admin` remark ekler ve report generate eder.
- Admin: User/admin CRUD ve admin-only resource edit yetkisini korur.
- Privacy: Dis provider'a giden evidence anonymizer'dan gecmeden cikamaz.
- Logging: Raw prompt ve raw sensitive text yok; provider, promptVersion, reportVersion, warnings ve source refs saklanir.
- Persistence: MVP in-memory repository ile baslayabilir; report/evidence collection sozlesmeleri tasarimda hazirdir.

## Basari Olcutleri

- Kullanici closed sprint listesini gorur.
- Sprint secilince normalized Jira/GitHub evidence gorulur.
- Manager/admin sprint remark ekler.
- Manager/admin versioned JSON report generate eder.
- Markdown report preview/copy/download yapilir.
- Variance dashboard planned vs actual SP/hour, velocity trend ve bottleneck gruplarini gosterir.
- Sparse data, missing mapping ve fallback durumlari warning olarak gorulur.
- Bonus sirada spillover metrics ve health score dogru formulle uretilir.
