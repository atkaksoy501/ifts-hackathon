# Context Map

## Harita

```text
Identity & Access (existing)
  -> session user, user|manager|admin policy

Work Item Ingestion & Catalog (existing)
  -> JiraIssueDto + JiraSprintDto read models

Jira/GitHub State Publishers
  -> raw read-only state
  -> Sprint Evidence Intake
  -> SprintEvidenceDto

Sprint Review Workspace
  -> sprint list + manager remarks
  -> Sprint Demo Reporting
  -> SprintDemoReportDto + Markdown

Sprint Evidence Intake
  -> Delivery Analytics
  -> VarianceAnalyticsDto
  -> Sprint Health & Spillover
  -> SpilloverMetricsDto + SprintHealthScoreDto

Delivery Experience UI
  -> reads DTOs, renders Turkish dashboard
```

## Veri Akisi

1. Kullanici login olur; existing Identity & Access session cookie ve `GET /api/auth/me` ile user bilgisini saglar.
2. Shared contracts `UserRole` enum'u `user|manager|admin` olacak sekilde genisler.
3. Jira state publisher sprint start/close snapshot, story point, timeSpent, assignee, issueType, changelog, comments ve resolution remarks verisini read-only state'e tasir.
4. GitHub adapter PR/commit metadata okur; PR title, branch ve commit message icinden issue key regex'iyle mapping yapar.
5. Sprint Evidence Intake raw state'i `SprintEvidenceDto` olarak normalize eder; missing field ve unmatched evidence warning'leri ekler.
6. Sprint Review Workspace `GET /api/sprint-review/sprints` ile reviewable sprint listesini sunar.
7. UI sprint secer ve `GET /api/sprint-review/sprints/:sprintId/evidence` ile evidence gorur.
8. Manager/admin `POST /api/sprint-review/sprints/:sprintId/remarks` ile lokal review remark ekler.
9. Manager/admin `POST /api/sprint-review/reports` ile Sprint Demo Reporting'i calistirir.
10. Sprint Demo Reporting heuristic provider ile Turkce JSON report uretir, versioned persist eder ve Markdown render eder.
11. Delivery Analytics `GET /api/analytics/variance` ile planned vs actual SP/hour, velocity trend ve bottleneck grouping hesaplar.
12. Bonus sirada Sprint Health & Spillover spillover metrics ve health score uretir.
13. Delivery Experience UI report preview/export, variance visuals ve bonus panelleri render eder.

## Iliski Tipleri

| Upstream | Downstream | Iliski | Paylasilan Sey |
| --- | --- | --- | --- |
| Identity & Access | Tum Modul 3 API | Customer/Supplier | Session user, role, author policy. |
| Work Item Ingestion & Catalog | Sprint Evidence Intake | Customer/Supplier | `JiraIssueDto`, `JiraSprintDto`, sync status. |
| Jira/GitHub State Publishers | Sprint Evidence Intake | Anti-corruption | Raw read-only state, source refs. |
| Sprint Evidence Intake | Sprint Review Workspace | Customer/Supplier | `SprintEvidenceDto`, sprint ids, warnings. |
| Sprint Review Workspace | Sprint Demo Reporting | Customer/Supplier | Sprint selection, manager remarks. |
| Sprint Evidence Intake | Sprint Demo Reporting | Customer/Supplier | Evidence items, source refs, warnings. |
| Sprint Evidence Intake | Delivery Analytics | Customer/Supplier | Start/close snapshots, completed/incomplete items. |
| Modul 2 Capacity/Allocation | Sprint Health & Spillover | Customer/Supplier | Capacity and assigned workload read models. |
| Sprint Demo Reporting | Delivery Experience | Customer/Supplier | `SprintDemoReportDto`, Markdown body. |
| Delivery Analytics | Delivery Experience | Customer/Supplier | `VarianceAnalyticsDto`, warning listesi. |
| Shared Contracts | Backend + Frontend | Shared Kernel | Zod schemas, DTO types, ErrorEnvelope. |

## Anti-Corruption Rules

- Raw Jira/GitHub payload private kalir; Modul 3 icinde normalized DTO ve source ref kullanilir.
- Sprint Evidence Intake source systems'a yazmaz.
- GitHub evidence issue key'e baglanamazsa data atilmaz; `unmatchedEvidence` ve warning olur.
- Sprint Review Workspace remark'i Jira comment gibi davranmaz; lokal domain entity'dir.
- Sprint Demo Reporting analytics skorlarini yeniden hesaplamaz; gerekiyorsa DTO olarak okur.
- Delivery Analytics summary text uretmez; numeric ve grouped metrics uretir.
- Sprint Health & Spillover allocation karari vermez; Modul 2 read model'lerinden signal hesaplar.
- Delivery UI domain karari uretmez; backend DTO'larini render eder.
- OpenRouter provider P2'dir; anonymizer ve schema validation olmadan context boundary'den cikamaz.

## Conceptual Events

Bu event'ler implementation zorunlulugu degil; audit ve future async flow icin isim standardidir.

| Event | Producer | Consumer |
| --- | --- | --- |
| `SprintEvidenceIngested` | Sprint Evidence Intake | Sprint Review Workspace, Delivery Analytics. |
| `GitHubEvidenceMapped` | Sprint Evidence Intake | Sprint Demo Reporting, audit. |
| `SprintRemarkAdded` | Sprint Review Workspace | Sprint Demo Reporting. |
| `SprintDemoReportCreated` | Sprint Demo Reporting | Delivery Experience UI, audit. |
| `VarianceAnalyticsComputed` | Delivery Analytics | Delivery Experience UI. |
| `SpilloverMetricsComputed` | Sprint Health & Spillover | Delivery Experience UI. |
| `SprintHealthScoreComputed` | Sprint Health & Spillover | Delivery Experience UI. |

## Persistence Collections

| Collection | Owning Context |
| --- | --- |
| `sprint_evidence_sets` | Sprint Evidence Intake |
| `sprint_review_remarks` | Sprint Review Workspace |
| `sprint_demo_reports` | Sprint Demo Reporting |
| `variance_analytics_runs` | Delivery Analytics |
| `spillover_metrics_runs` | Sprint Health & Spillover |
| `sprint_health_scores` | Sprint Health & Spillover |

## Route Boundary

Tum yeni endpoints mevcut app stiliyle `/api` altina eklenir. Request validation `@module1/contracts` Zod schema'lariyla yapilir. Hatalar mevcut `ErrorEnvelope` ve `ApiError` kodlariyla doner; gerekirse shared error code union genisletilir.
