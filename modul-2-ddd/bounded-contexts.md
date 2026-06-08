# Bounded Contexts

## 1. Planning Intake

**Amac:** Story/task inputunu normalize eder, source snapshot olusturur, decomposition icin guvenilir input saglar.

**Sahip oldugu isler**

- Manual title, description, acceptance criteria ve constraints alma.
- Jira issue key ile Modul 1 Catalog'dan `JiraIssueDto` snapshot alma.
- Source type, projectKey, issueKey, tags, createdBy ve createdAt saklama.
- Acceptance criteria parsing.
- Missing AC, short description, ambiguous scope warning uretme.

**Sahip olmadigi isler**

- Teknik decomposition algoritmasi.
- Team member secimi veya capacity hesabi.
- Report rendering.
- Jira write.

**Public contract**

- `POST /api/planning-inputs`
- `GET /api/planning-inputs/:id`
- `PlanningInputDto`

## 2. Technical Decomposition

**Amac:** High-level task'i test edilebilir teknik sub-task'lara boler.

**Sahip oldugu isler**

- Heuristic decomposition provider.
- P2 OpenRouter provider interface.
- Input signal detection: UI, API, domain, DB, test, integration, security, docs, data-ai.
- `TechnicalSubTaskDto` uretimi.
- Required skill, dependency, estimate, risk, confidence ve rationale hesaplama.
- Malformed AI output normalizer.
- Provider fallback warning uretimi.
- Decomposition run persistence.

**Sahip olmadigi isler**

- Team data CRUD.
- Owner/member assignment.
- Sprint capacity karari.
- Jira issue yazma.

**Public contract**

- `POST /api/decompositions/run`
- `GET /api/decompositions/:id`
- `DecompositionRunDto`

## 3. Team Capability & Capacity

**Amac:** Ekip uyelikleri, skill matrix ve sprint capacity bilgisini yonetir.

**Sahip oldugu isler**

- Team member CRUD.
- Active/inactive member state.
- Skill taxonomy CRUD/replace.
- Skill level validation, 0-5 numeric scale.
- Sprint capacity log: availabilityHours, committedHours, maxVelocityPoints, timeOffHours, wipLimit.
- Admin-only edit policy.
- Capacity data warning ve freshness metadata.

**Sahip olmadigi isler**

- Sub-task decomposition.
- Assignment optimizer score hesabi.
- Report rendering.
- Jira assignee workload writeback.

**Public contract**

- `GET /api/team/members`
- `POST /api/team/members`
- `PATCH /api/team/members/:id`
- `GET /api/team/skills`
- `PUT /api/team/skills`
- `GET /api/sprint-capacity/current`
- `PUT /api/sprint-capacity/current`

## 4. Smart Allocation

**Amac:** Sub-task'lari en uygun ve musait ekip uyelerine atar veya unassigned olarak aciklar.

**Sahip oldugu isler**

- Hard constraints: active member, remaining capacity, max velocity, min skill, WIP, admin/security policy.
- Soft constraints: skill depth, availability, load balance, risk fit, context continuity.
- Weighted score hesabi.
- Top alternatives uretimi.
- Utilization before/after hesaplama.
- Unassigned reason ve risk warning uretme.
- Deterministic assignment order.
- P1 local rebalance pass.

**Sahip olmadigi isler**

- Team/capacity data edit.
- Decomposition provider calistirma.
- Report template rendering.
- Jira assignment write.

**Public contract**

- `POST /api/allocations/recommend`
- `GET /api/allocations/:id`
- `AllocationRunDto`

## 5. Reporting Engine

**Amac:** Decomposition + allocation sonucunu JSON ve Markdown rapora donusturur.

**Sahip oldugu isler**

- Report run olusturma.
- JSON report DTO.
- Markdown report render.
- Utilization summary, risk summary, warnings, assumptions.
- Unanswered decision listesi.
- Report history/version.

**Sahip olmadigi isler**

- PDF generation MVP.
- Email/Slack/Jira publish.
- Assignment score hesabi.
- UI state yonetimi.

**Public contract**

- `POST /api/reports/task-allocation`
- `GET /api/reports/task-allocation/:id`
- `GET /api/reports/task-allocation/:id/markdown`
- `TaskAllocationReportDto`

## 6. Delivery Experience - Modul 2 UI

**Amac:** Kullaniciya task girme, decomposition, allocation ve report preview akislarini tek dashboard deneyiminde sunar.

**Sahip oldugu isler**

- Jira issue select/search ve manual mode.
- Acceptance criteria editor.
- Sub-task grouped table.
- Team matrix ve sprint capacity admin screens.
- Allocation recommendations, alternatives, warnings.
- Utilization bars.
- Markdown report preview ve export/copy.
- Turkce dictionary keys.

**Sahip olmadigi isler**

- Domain/optimizer hesaplama.
- Backend persistence.
- Auth token uretimi.
- Provider secimi.

**Public contract**

- Backend DTO'lari.
- Existing session/auth state.
- Mevcut `DeliveryDashboard` tab yapisi.

## Existing Supporting Contexts

| Existing Context | Modul 2 Kullanimi |
| --- | --- |
| Identity & Access | Session, admin guard, createdBy, permission policy. |
| Work Item Ingestion & Catalog | Backlog issue query ve `JiraIssueDto` source snapshot. |
| Shared Contracts | Zod schemas, DTO types, WarningDto, ErrorEnvelope. |
