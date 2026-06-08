# Modul 3 Planı: AI Sprint Review & Management Dashboard

## Summary

- Hedef dosya: `modul_3_plan.md`.
- M3, M2 kontratları stabil olduktan sonra gelir; burnout/over-allocation M2 capacity+allocation verisinden hesaplanır.
- Veri kaynağı: Jira+GitHub read-only state. Jira write yok.
- AI MVP: deterministic heuristic summary. OpenRouter adapter P2, anonymizer zorunlu.
- UI/rapor dili: Türkçe. Export: JSON + Markdown. Raporlar versioned persist edilir.
- Bonus işler en son: önce demo summary + variance dashboard, sonra spillover, en son health score.

## Key Decisions + Contracts

- `UserRole` genişler: `"user" | "manager" | "admin"`.
  `manager|admin`: sprint remark/report generate. `admin`: user/admin CRUD.
- Publisher/ingest genişler:
  Jira sprint start/close snapshots, story point, timeSpent, assignee, issueType, changelog/status history, comments/resolution remarks.
  GitHub PR/commit metadata; issue mapping regex: `/[A-Z][A-Z0-9]+-\d+/` from PR title, branch, commit message.
- Core routes:
  `GET /api/sprint-review/sprints`
  `GET /api/sprint-review/sprints/:sprintId/evidence`
  `POST /api/sprint-review/sprints/:sprintId/remarks`
  `POST /api/sprint-review/reports`
  `GET /api/sprint-review/reports/:id`
  `GET /api/sprint-review/reports/:id/markdown`
  `GET /api/analytics/variance?projectKey&sprintId&trendWindow=6`
  Bonus: `GET /api/analytics/spillover`, `GET /api/analytics/health`
- DTO families:
  `SprintEvidenceDto`, `SprintDemoReportDto`, `VarianceAnalyticsDto`, `SpilloverMetricsDto`, `SprintHealthScoreDto`.
- Health formula:
  final score `1..100`, balanced weights: velocity variance 30%, spillover 25%, burnout 20%, block duration 25%.

## Implementation Backlog

- [ ] M3API-001 Add contracts/tests for manager role, sprint evidence, reports, variance, spillover, health score.
- [ ] M3DATA-001 Extend Jira state publisher/ingest with sprint snapshots, changelog, comments, planned/actual fields.
- [ ] M3DATA-002 Add GitHub PR/commit evidence adapter and issue-key mapping warnings.
- [ ] M3BE-001 Add in-memory repos/services and route shell using existing auth/error style.
- [ ] M3EVID-001 Normalize sprint evidence: completed items, PRs, commits, closing remarks, warnings.
- [ ] M3SUM-001 Implement heuristic Turkish executive/demo summary provider.
- [ ] M3SUM-002 Persist versioned JSON report and render Markdown.
- [ ] M3VAR-001 Implement planned vs actual SP/hour variance, velocity trend, bottleneck grouping.
- [ ] M3UI-001 Add Sprint Review tab in `DeliveryDashboard`, sprint selector, evidence view, remark form.
- [ ] M3UI-002 Add report preview/copy/download and variance visuals using lightweight React/SVG, no chart dependency.
- [ ] M3BONUS-001 Implement spillover metrics after core: carryover %, by issueType, by assignee, volatility.
- [ ] M3BONUS-002 Implement health score after spillover: score, breakdown, thresholds, warnings.
- [ ] M3E2E-001 Add e2e: login -> select sprint -> add remark -> generate report -> view variance -> export Markdown.
- [ ] M3QG-001 Run `corepack pnpm build`, `test`, `test:integration`, `test:e2e`, `quality`.
- [ ] M3DOC-001 Update docs and rerun Codesight after implementation.

## Test Plan

- Contract tests: role enum, DTO ranges, required report fields, score `1..100`.
- Backend unit: evidence normalization, summary sections, variance math, spillover math, health formula.
- Integration: auth, manager/admin write, sparse data warnings, Markdown route.
- Frontend unit: tab states, report preview, variance charts, permission visibility.
- E2E: core flow first; bonus panels tested only after bonus tasks land.

## Assumptions

- `.codesight/wiki/index.md` yok; `.codesight/CODESIGHT.md`, route/component docs, M1/M2 plans/tasks, gerçek source kullanıldı.
- Trend window configurable; default `6`.
- Planned baseline = sprint start snapshot. Actual = sprint close Done items.
- TimeSpent eksikse `HOURS_PER_STORY_POINT` fallback + warning.
- PDF, Jira write, Slack/email publish, OpenRouter live generation P2 dışı.
