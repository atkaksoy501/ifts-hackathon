# Context Map

## Harita

```text
Identity & Access (existing)
  -> session user, admin policy

Work Item Ingestion & Catalog (existing)
  -> JiraIssueDto backlog read model

Planning Intake
  -> PlanningInputDto
  -> Technical Decomposition
  -> DecompositionRunDto

Team Capability & Capacity
  -> TeamMemberDto + SkillTaxonomy + SprintCapacityDto
  -> Smart Allocation

Smart Allocation
  -> AllocationRunDto
  -> Reporting Engine

Reporting Engine
  -> TaskAllocationReportDto + Markdown
  -> Delivery Experience UI
```

## Veri Akisi

1. Kullanici login olur; existing Identity & Access session cookie ve `GET /api/auth/me` ile user bilgisini saglar.
2. UI Jira issue secer veya manual task girer.
3. Planning Intake manual payload'i parse eder veya Catalog'dan `JiraIssueDto` snapshot alir.
4. Planning Intake AC, constraints ve source metadata ile `PlanningInputDto` olusturur.
5. Technical Decomposition `PlanningInputDto` ile provider calistirir.
6. Decomposition result `TechnicalSubTaskDto[]`, warnings ve confidence ile persist edilir.
7. Smart Allocation `DecompositionRunDto`, `TeamMemberDto[]`, `SkillTaxonomy` ve `SprintCapacityDto` okur.
8. Smart Allocation recommendation, alternatives, unassigned reasons ve utilization hesaplar.
9. Reporting Engine allocation sonucundan JSON ve Markdown report olusturur.
10. Delivery Experience UI sonuc tablolari, utilization bar'lari, warning'leri ve report preview'i gosterir.

## Iliski Tipleri

| Upstream | Downstream | Iliski | Paylasilan Sey |
| --- | --- | --- | --- |
| Identity & Access | Tum Modul 2 API | Customer/Supplier | Session user, role, createdBy. |
| Work Item Ingestion & Catalog | Planning Intake | Customer/Supplier | `JiraIssueDto`, backlog query. |
| Planning Intake | Technical Decomposition | Conformist DTO | `PlanningInputDto`, warning listesi. |
| Technical Decomposition | Smart Allocation | Customer/Supplier | `DecompositionRunDto`, `TechnicalSubTaskDto`. |
| Team Capability & Capacity | Smart Allocation | Customer/Supplier | Team members, skills, capacity log. |
| Smart Allocation | Reporting Engine | Customer/Supplier | `AllocationRunDto`, utilization, warnings. |
| Reporting Engine | Delivery Experience | Customer/Supplier | JSON report, Markdown report. |
| Shared Contracts | Backend + Frontend | Shared Kernel | Zod schemas, DTO types, ErrorEnvelope. |

## Anti-Corruption Rules

- Jira issue private source model, Modul 2 icinde `PlanningInputDto.sourceSnapshot` olarak dondurulur.
- Catalog context assignment veya decomposition karari vermez.
- Technical Decomposition team skill data okumaz.
- Smart Allocation provider prompt veya raw input parsing yapmaz; normalized sub-task ve capacity verisi kullanir.
- Reporting Engine allocation skorunu yeniden hesaplamaz; sadece aktarir ve ozetler.
- Delivery UI domain karar uretmez; backend DTO'larini render eder.

## Conceptual Events

Bu event'ler implementation zorunlulugu degil; audit ve future async flow icin isim standardidir.

| Event | Producer | Consumer |
| --- | --- | --- |
| `PlanningInputCreated` | Planning Intake | Technical Decomposition, audit. |
| `DecompositionCompleted` | Technical Decomposition | Smart Allocation, Reporting. |
| `TeamCapacityUpdated` | Team Capability & Capacity | Smart Allocation, audit. |
| `AllocationRecommended` | Smart Allocation | Reporting Engine. |
| `TaskAllocationReportCreated` | Reporting Engine | Delivery Experience UI. |

## Persistence Collections

| Collection | Owning Context |
| --- | --- |
| `planning_inputs` | Planning Intake |
| `decomposition_runs` | Technical Decomposition |
| `team_members` | Team Capability & Capacity |
| `skill_taxonomy` | Team Capability & Capacity |
| `sprint_capacity_logs` | Team Capability & Capacity |
| `allocation_runs` | Smart Allocation |
| `task_allocation_reports` | Reporting Engine |

## Route Boundary

Tum yeni endpoints mevcut app stiliyle `/api` altina eklenir. Request validation `@module1/contracts` Zod schema'lariyla yapilir. Hatalar mevcut `ErrorEnvelope` ve `ApiError` kodlariyla doner; gerekirse shared error code union genisletilir.
