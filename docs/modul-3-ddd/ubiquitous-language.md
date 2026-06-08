# Ubiquitous Language

## Terimler

| Terim | Anlam | Context |
| --- | --- | --- |
| Sprint Review | Closed veya review edilecek sprint uzerinden evidence, remark, report ve analytics akisi. | Sprint Review Workspace |
| Reviewable Sprint | Sprint review ekraninda secilebilen sprint. | Sprint Review Workspace |
| Sprint Evidence | Bir sprintin Jira ve GitHub kaynakli traceable kanit seti. | Sprint Evidence Intake |
| Sprint Evidence Set | Tek sprint icin normalized evidence aggregate'i. | Sprint Evidence Intake |
| Sprint Snapshot | Sprintin belirli andaki issue ve field gorunumu. | Sprint Evidence Intake |
| Start Snapshot | Sprint baslangicinda planned baseline olarak alinan snapshot. | Sprint Evidence Intake |
| Close Snapshot | Sprint kapanisinda actual baseline olarak alinan snapshot. | Sprint Evidence Intake |
| Planned Baseline | Start snapshot'tan gelen planned story point/hour ve issue listesi. | Delivery Analytics |
| Actual Baseline | Close snapshot'ta Done olan issue'lar ve gerceklesen timeSpent. | Delivery Analytics |
| Completed Item | Close snapshot'ta Done sayilan sprint issue'su. | Sprint Evidence Intake |
| Incomplete Item | Sprint planinda olup close aninda Done olmayan issue. | Sprint Evidence Intake |
| Spillover | Planned olup sprint sonunda tamamlanmayan isin sonraki sprint'e tasma sinyali. | Sprint Health & Spillover |
| Carryover Percent | Planned scope icinde tamamlanmadan kalan is orani. | Sprint Health & Spillover |
| Closing Remark | Jira comment/resolution veya manager remark kaynakli kapanis notu. | Sprint Evidence Intake, Sprint Review Workspace |
| Manager Remark | Manager/admin tarafindan sprint review icin eklenen lokal not. | Sprint Review Workspace |
| Evidence Warning | Eksik veri, mapping miss, sparse history veya fallback gibi non-blocking uyari. | Shared |
| Source Ref | Evidence item'in geldigi Jira issue, sprint snapshot, PR, commit veya remark referansi. | Shared |
| Issue Key Mapping | PR title, branch veya commit message icinden Jira issue key baglantisi kurma. | Sprint Evidence Intake |
| Unmatched Evidence | Issue key'e baglanamayan PR veya commit evidence'i. | Sprint Evidence Intake |
| Sprint Demo Report | Sprint evidence ve remark'lardan uretilen versioned JSON + Markdown rapor. | Sprint Demo Reporting |
| Report Version | Ayni sprint icin her yeni report generation ciktisinin surum kimligi. | Sprint Demo Reporting |
| Executive Summary | Sprint sonucu, risk ve demo notlarini kisaca anlatan Turkce ozet. | Sprint Demo Reporting |
| Summary Provider | `heuristic` veya P2 `openrouter` gibi summary ureten adapter. | Sprint Demo Reporting |
| Anonymizer | Dis provider'a gidecek text icinden hassas/company verisini temizleyen katman. | Sprint Demo Reporting |
| Markdown Report | Insan okunur report export'u. | Sprint Demo Reporting |
| JSON Report | UI ve entegrasyon icin structured report payload'i. | Sprint Demo Reporting |
| Variance | Planned ve actual degerler arasindaki fark. | Delivery Analytics |
| Story Point Variance | Planned SP ile actual Done SP arasindaki fark ve yuzde. | Delivery Analytics |
| Hour Variance | Planned hour ile actual timeSpent/fallback hour arasindaki fark ve yuzde. | Delivery Analytics |
| Velocity Trend | Son sprintlerde actual completed story point hareketi. | Delivery Analytics |
| Trend Window | Trend hesabinda kullanilan sprint sayisi; default `6`. | Delivery Analytics |
| Bottleneck Group | Gecikme/fark sinyalinin assignee, issueType, component veya status'a gore gruplanmasi. | Delivery Analytics |
| Burnout Signal | Capacity/allocation verisine gore asiri yuklenme sinyali. | Sprint Health & Spillover |
| Block Duration | Blocked/status history veya comments uzerinden hesaplanan blokaj suresi. | Sprint Health & Spillover |
| Sprint Health Score | Velocity variance, spillover, burnout ve block duration agirliklariyla `1..100` score. | Sprint Health & Spillover |

## Dil Kurallari

- `Sprint Evidence`, raw Jira/GitHub payload degildir; normalized ve source ref'li kanit setidir.
- `Remark`, lokal Modul 3 notudur; Jira comment yazma anlamina gelmez.
- `Closing Remark`, Jira kaynakli kapanis aciklamasi veya manager remark'tan tureyen review notu olabilir; source ref ile ayrilir.
- `Planned`, start snapshot'a baglidir. `Actual`, close snapshot Done item'lara baglidir.
- `Spillover`, sprint planinda olup kapanista Done olmayan is icin kullanilir.
- `Carryover` ve `spillover` MVP'de ayni ana sinyali anlatir; metric adlarinda `spillover` tercih edilir.
- `Health Score`, advisory metric'tir; otomatik karar vermez.
- `Warning` akisi bloklamaz. `ErrorEnvelope` validation/auth/not found gibi bloklayan hatalar icindir.
- Score `1..100`; confidence ve fit tarzindaki skorlar 0-1 kalabilir.
- Story point ve hour birlikte raporlanir; hour eksikse fallback ve warning gerekir.
- UI ve report metni Turkce olur; enum key'leri English kalabilir.
- Dis AI provider kullanimi P2'dir ve anonymizer olmadan calisamaz.

## Ortak Enumlar

```ts
type UserRole = "user" | "manager" | "admin";
type SummaryProviderName = "heuristic" | "openrouter";
type SprintEvidenceSource = "jira-snapshot" | "jira-changelog" | "jira-comment" | "github-pr" | "github-commit" | "manager-remark";
type ReportFormat = "json" | "markdown";
type VarianceDirection = "ahead" | "behind" | "on-track";
type HealthBand = "healthy" | "watch" | "at-risk";
```

## Route Terimleri

| Route | Dil Karsiligi |
| --- | --- |
| `GET /api/sprint-review/sprints` | Review sprint listesi. |
| `GET /api/sprint-review/sprints/:sprintId/evidence` | Sprint evidence goruntuleme. |
| `POST /api/sprint-review/sprints/:sprintId/remarks` | Manager/admin review remark ekleme. |
| `POST /api/sprint-review/reports` | Sprint demo report generate etme. |
| `GET /api/sprint-review/reports/:id` | JSON report okuma. |
| `GET /api/sprint-review/reports/:id/markdown` | Markdown report okuma. |
| `GET /api/analytics/variance` | Planned vs actual analytics. |
| `GET /api/analytics/spillover` | Bonus spillover metrics. |
| `GET /api/analytics/health` | Bonus sprint health score. |
