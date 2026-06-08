# Domain Overview

## Urun Hedefi

Modul 2, high-level Jira story/task ve acceptance criteria girdisini teknik alt islere boler, ekip skill/capacity verisiyle en uygun kisilere atama onerir, karar gerekceleriyle rapor uretir.

Mevcut Modul 1 backlog, auth, admin guard ve dashboard altyapisini kullanir. Predictive Sizing ve Blockage Advisory hesaplama modelleri Modul 2 tarafindan degistirilmez.

## Aktorler

| Aktor | Amac |
| --- | --- |
| Kullanici | Jira issue veya manual task girer, decomposition/allocation/report sonucunu gorur. |
| Team Lead | Sub-task kirilimini inceler, assignment onerilerini degerlendirir. |
| Admin | Team member, skill taxonomy ve sprint capacity verisini yonetir. |
| Backend Service | Input normalize eder, decomposition/allocation/report run'larini persist eder. |
| Heuristic Provider | Deterministic sub-task uretir ve test-stabil fallback saglar. |
| OpenRouter Provider | P2 dis AI adapter; anonymizer ve schema validation arkasinda calisir. |
| Delivery UI | Tek akista input, decomposition, allocation, utilization ve report preview gosterir. |

## Subdomain Siniflama

| Subdomain | Tip | Owning Context |
| --- | --- | --- |
| Technical Decomposition | Core | Technical Decomposition |
| Smart Allocation | Core | Smart Allocation |
| Planning Intake | Supporting | Planning Intake |
| Team Capability & Capacity | Supporting | Team Capability & Capacity |
| Reporting | Supporting | Reporting Engine |
| Delivery UX | Generic/Supporting | Delivery Experience |
| Identity/Auth | Existing Supporting | Identity & Access, Modul 1 |
| Work Item Catalog | Existing Supporting | Work Item Ingestion & Catalog, Modul 1 |

## Kabiliyetler

| Capability | Owner Context | MVP Notu |
| --- | --- | --- |
| Manual planning input olustur | Planning Intake | Title, description, AC, constraints, createdBy. |
| Jira issue snapshot al | Planning Intake | `GET /api/backlog` ve `JiraIssueDto` read model'ine dayanir. |
| Input warning uret | Planning Intake | Missing AC, too-short description, ambiguous scope. |
| Sub-task decomposition calistir | Technical Decomposition | Heuristic provider default. |
| Provider output normalize et | Technical Decomposition | Zod contract + malformed output fallback. |
| Engineering domain ata | Technical Decomposition | Enum bazli domain ownership. |
| Skill taxonomy yonet | Team Capability & Capacity | Admin edit, normal user read. |
| Team skill matrix yonet | Team Capability & Capacity | Skill level 0-5. |
| Sprint capacity yonet | Team Capability & Capacity | availabilityHours, committedHours, maxVelocity, timeOff, WIP. |
| Assignment recommendation uret | Smart Allocation | Hard constraints + weighted score. |
| Alternatives ve unassigned reasons uret | Smart Allocation | Top 2 alternatives, explicit failure reason. |
| Utilization hesapla | Smart Allocation | Before/assigned/after/capacity/percent. |
| JSON report olustur | Reporting Engine | Persisted report run. |
| Markdown report render et | Reporting Engine | MVP export surface. |
| Modul 2 dashboard akisi sagla | Delivery Experience | Mevcut dashboard icinde yeni tab/flow. |

## Policy Ozeti

- Auth: Tum Modul 2 read/run endpoint'leri session ister.
- Admin: Team member, skill taxonomy, sprint capacity edit admin ister.
- Normal user: Planning input, decomposition, allocation recommendation ve report read/run yapabilir.
- Privacy: Dis provider'a giden metin anonymizer'dan gecmeden cikamaz.
- Logging: Raw prompt yok; run metadata, provider, promptVersion, warnings ve normalized output saklanir.
- Persistence: MVP in-memory repository ile baslayabilir; Mongo collection sozlesmeleri tasarimda hazirdir.

## Basari Olcutleri

- Kullanici task/AC girer veya Jira issue secer.
- Sistem structured sub-task breakdown dondurur.
- Her sub-task domain, deliverables, acceptance checks, required skills, dependencies, estimate, risk, confidence tasir.
- Admin team/capacity verisini yonetir.
- Allocation capacity, skill, velocity/WIP constraint'lerine uyar.
- Recommendation score breakdown, reasons, alternatives, warnings ve utilization impact icerir.
- JSON + Markdown report persist edilir.
- ErrorEnvelope, auth/admin policy ve route stili mevcut app ile uyumludur.
