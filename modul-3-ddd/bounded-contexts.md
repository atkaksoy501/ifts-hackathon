# Bounded Contexts

## 1. Sprint Evidence Intake

**Amac:** Jira ve GitHub read-only state'i sprint review icin normalized, traceable evidence set'ine donusturur.

**Sahip oldugu isler**

- Jira sprint start/close snapshot'larini alma ve immutable baseline olarak saklama.
- Issue story point, timeSpent, assignee, issueType, status history, comments ve resolution remarks normalize etme.
- Completed items, incomplete items, blocked items ve closing remarks uretme.
- GitHub PR/commit metadata okuma.
- PR title, branch ve commit message icinden issue key mapping yapma.
- Mapping regex'i uygulama: `/[A-Z][A-Z0-9]+-\d+/`.
- Missing timeSpent, missing start snapshot, unmatched PR/commit ve sparse data warning'leri uretme.

**Sahip olmadigi isler**

- Manager remark ownership.
- Summary/report generation.
- Variance, spillover veya health score hesaplama.
- Jira/GitHub write.

**Public contract**

- `GET /api/sprint-review/sprints/:sprintId/evidence`
- `SprintEvidenceDto`
- Internal ingest: Jira/GitHub state publisher output'u.

## 2. Sprint Review Workspace

**Amac:** Sprint review ekrani icin sprint secimi, evidence read ve manager/admin remark akisini sahiplenir.

**Sahip oldugu isler**

- Reviewable sprint listesini sunma.
- Sprint evidence'e read facade saglama.
- Manager/admin remark alma.
- Remark author, role, createdAt ve sprintId metadata'sini saklama.
- Remark history/version bilgisini koruma.
- Permission policy: remark write sadece `manager|admin`.

**Sahip olmadigi isler**

- Jira comment yazma.
- Evidence normalization.
- AI summary uretme.
- Analytics hesaplama.

**Public contract**

- `GET /api/sprint-review/sprints`
- `POST /api/sprint-review/sprints/:sprintId/remarks`
- `SprintRemarkDto`

## 3. Sprint Demo Reporting

**Amac:** Sprint evidence ve manager remark'larindan Turkce, versioned JSON + Markdown sprint demo raporu uretir.

**Sahip oldugu isler**

- Heuristic Turkish executive/demo summary provider.
- Summary section'lari: ozet, tamamlananlar, riskler, blokajlar, demo notlari, warnings, next actions.
- OpenRouter provider interface P2.
- Anonymizer ve schema validation zorunlulugu.
- Provider fallback warning uretimi.
- Versioned JSON report persistence.
- Markdown render.
- Report source refs ve warnings korunmasi.

**Sahip olmadigi isler**

- Evidence ingest.
- Manager remark CRUD disinda issue yorumu yazma.
- Variance/spillover/health hesaplama.
- PDF, Slack, email publish.

**Public contract**

- `POST /api/sprint-review/reports`
- `GET /api/sprint-review/reports/:id`
- `GET /api/sprint-review/reports/:id/markdown`
- `SprintDemoReportDto`

## 4. Delivery Analytics

**Amac:** Sprint planlanan/gerceklesen farklarini ve trendleri explainable analytics olarak hesaplar.

**Sahip oldugu isler**

- Planned vs actual story point variance.
- Planned vs actual hour variance.
- Velocity trend hesaplama.
- Trend window default `6` ve query override.
- Bottleneck grouping: assignee, issueType, status/category, component veya blockage reason.
- Sparse data warnings.
- TimeSpent eksikse `HOURS_PER_STORY_POINT` fallback ve warning.

**Sahip olmadigi isler**

- Report summary text generation.
- Sprint remark write.
- Team capacity source verisini edit.
- UI chart state.

**Public contract**

- `GET /api/analytics/variance?projectKey&sprintId&trendWindow=6`
- `VarianceAnalyticsDto`

## 5. Sprint Health & Spillover

**Amac:** Bonus sirada carryover/spillover metrikleri ve health score uretir.

**Sahip oldugu isler**

- Spillover/carryover yuzdesi.
- Spillover by issueType.
- Spillover by assignee.
- Scope volatility sinyali.
- Burnout/over-allocation sinyali icin Modul 2 capacity + allocation read model'lerini okuma.
- Health score `1..100` hesaplama.
- Weighted breakdown: velocity variance 30%, spillover 25%, burnout 20%, block duration 25%.
- Threshold ve warning uretme.

**Sahip olmadigi isler**

- Core report generation.
- Allocation recommendation uretme.
- Capacity edit.
- Score ile otomatik workflow karari verme.

**Public contract**

- `GET /api/analytics/spillover`
- `GET /api/analytics/health`
- `SpilloverMetricsDto`
- `SprintHealthScoreDto`

## 6. Delivery Experience - Modul 3 UI

**Amac:** Sprint review, evidence, remark, report export ve variance/bonus analytics akislarini mevcut dashboard icinde sunar.

**Sahip oldugu isler**

- `DeliveryDashboard` icinde Sprint Review tab.
- Sprint selector.
- Evidence view: completed items, PRs, commits, remarks, warnings.
- Manager remark form ve permission visibility.
- Report generate button, preview, copy/download JSON + Markdown.
- Variance visuals icin lightweight React/SVG.
- Bonus spillover ve health panelleri.
- Turkce UI dictionary key'leri.

**Sahip olmadigi isler**

- Domain hesaplama.
- Backend persistence.
- Auth token uretimi.
- Provider secimi.

**Public contract**

- Backend DTO'lari.
- Existing session/auth state.
- Mevcut `DeliveryDashboard` tab yapisi.

## Existing Supporting Contexts

| Existing Context | Modul 3 Kullanimi |
| --- | --- |
| Identity & Access | Session, `user|manager|admin` role policy, author metadata. |
| Work Item Ingestion & Catalog | Existing Jira issue/sprint read model ve sync status. |
| Modul 2 Team Capability & Capacity | Burnout/over-allocation icin capacity baseline. |
| Modul 2 Smart Allocation | Assigned workload ve utilization read model'i. |
| Shared Contracts | Zod schemas, DTO types, WarningDto, ErrorEnvelope. |
