# Aggregates and Entities

## Shared Value Objects

| Value Object | Alanlar | Invariant |
| --- | --- | --- |
| `Warning` | code, message, severity | Severity `info` veya `warning`; akisi bloklamaz. |
| `ProjectKey` | string | Bos olamaz. |
| `SprintId` | string | Bos olamaz; route param veya source snapshot ile trace edilir. |
| `IssueKey` | string | Regex `/[A-Z][A-Z0-9]+-\d+/` ile eslesebilir olmalidir; unmatched ise warning. |
| `StoryPoints` | number | Negatif olamaz. |
| `Hours` | number | Negatif olamaz. |
| `Percent` | number | 0-100 araliginda normalize edilir. |
| `Score100` | number | 1-100 araliginda integer. |
| `TrendWindow` | number | 1-12 araliginda; default `6`. |
| `SourceRef` | sourceType, externalId, url?, capturedAt | Evidence trace icin bos olamaz. |
| `ReportVersion` | number/string | Ayni sprint icinde unique ve sirali olmalidir. |
| `MarkdownBody` | string | Bos olamaz. |
| `JsonReportBody` | object | Source report id/version ile uyumlu olmalidir. |

## Sprint Evidence Intake

### Aggregate Root: `SprintEvidenceSet`

**Entities**

- `SprintSnapshot`: start veya close snapshot.
- `EvidenceIssue`: sprint kapsamindaki Jira issue evidence'i.
- `StatusHistoryEntry`: changelog/status gecisi.
- `JiraCommentEvidence`: comment veya resolution remark.
- `PullRequestEvidence`: PR metadata ve mapped issue keys.
- `CommitEvidence`: commit metadata ve mapped issue keys.
- `UnmatchedEvidence`: issue key'e baglanamayan PR/commit.

**Value Objects**

- `SnapshotKind`: `start` veya `close`.
- `CompletionState`: planned, completed, incomplete, removed.
- `IssueKeyMapping`: matched issue keys, source field, warnings.

**Invariants**

- Bir evidence set tek `sprintId` ve `projectKey` icindir.
- Start snapshot planned baseline'dir; close snapshot actual baseline'dir.
- Snapshot'lar capturedAt ile immutable kabul edilir.
- Completed item close snapshot'ta Done status category tasir.
- Incomplete item start snapshot'ta planned olup close snapshot'ta Done olmayan issue'dur.
- PR/commit mapping title, branch veya message icinden regex ile yapilir.
- Unmatched PR/commit atilmaz; `UnmatchedEvidence` ve warning olarak saklanir.
- Missing timeSpent analytics icin fallback'e izin verir ama evidence icinde warning kalir.
- Source refs evidence item'larda kaybolmaz.

## Sprint Review Workspace

### Aggregate Root: `SprintReviewSession`

**Entities**

- `SprintRemark`: manager/admin tarafindan eklenen lokal review notu.
- `ReviewParticipant`: author user id, role, display name snapshot.

**Invariants**

- Bir review session tek sprint'e baglidir.
- Remark eklemek icin role `manager` veya `admin` olmalidir.
- Remark text bos olamaz.
- Remark Jira'ya yazilmaz; lokal domain entity olarak kalir.
- Remark author ve createdAt saklanir.
- Eski remark'lar report source ref olarak trace edilebilir kalir.

## Sprint Demo Reporting

### Aggregate Root: `SprintDemoReport`

**Entities**

- `ReportSection`: executive summary, completed work, demo notes, risks, blockers, warnings, next actions.
- `ReportSource`: evidence set id, remark ids, provider metadata.
- `ReportRender`: JSON body ve Markdown body.

**Value Objects**

- `SummaryProviderRun`: provider, promptVersion, fallbackUsed, anonymized.
- `ReportFormat`: json veya markdown.

**Invariants**

- Report tek sprint ve tek report version icindir.
- Report generation `manager|admin` role ister.
- JSON report ve Markdown ayni report id/version'dan uretilir.
- Markdown body bos olamaz.
- Evidence warnings ve assumptions report'ta kaybolmaz.
- Heuristic provider default ve deterministiktir.
- OpenRouter provider P2'dir; anonymizer tamamlanmadan dis cagrisi yapilamaz.
- Raw prompt veya raw sensitive evidence persist edilmez.
- Report dili Turkce'dir.

## Delivery Analytics

### Aggregate Root: `VarianceAnalysis`

**Entities**

- `VarianceRow`: planned, actual, delta, deltaPercent.
- `VelocityTrendPoint`: sprintId, completedStoryPoints, completedHours.
- `BottleneckGroup`: groupKey, groupType, planned, actual, spillover, warnings.

**Value Objects**

- `VarianceDirection`: ahead, behind, on-track.
- `BaselinePair`: start snapshot id, close snapshot id.

**Invariants**

- Variance analysis tek projectKey + sprintId icin hesaplanir.
- Planned SP/hour start snapshot'tan gelir.
- Actual SP/hour close snapshot Done items'dan gelir.
- Hour actual icin timeSpent yoksa `HOURS_PER_STORY_POINT` fallback ve warning gerekir.
- `trendWindow` default `6`; query ile valid aralikta override edilebilir.
- Planned deger 0 ise deltaPercent bolme yapmaz; warning veya null percent kullanilir.
- Bottleneck group numeric toplamlarinin source row'lari trace edilebilir olmalidir.

## Sprint Health & Spillover

### Aggregate Root: `SpilloverMetrics`

**Entities**

- `SpilloverItem`: planned ama Done olmayan issue evidence'i.
- `SpilloverGroup`: assignee, issueType veya component bazli ozet.
- `ScopeVolatilitySignal`: added/removed/changed scope sinyali.

**Invariants**

- Spillover metrics tek sprint ve project icindir.
- Carryover percent planned scope uzerinden hesaplanir.
- By issueType ve by assignee gruplari toplam item sayisi ile tutarli olmalidir.
- Scope volatility start ve close snapshot farkindan turetilir.
- Bonus context oldugu icin core report'u bloklamaz.

### Aggregate Root: `SprintHealthScore`

**Entities**

- `HealthBreakdown`: velocity variance, spillover, burnout, block duration.
- `HealthWarning`: threshold veya sparse data warning'i.

**Value Objects**

- `HealthBand`: healthy, watch, at-risk.
- `HealthWeight`: metric key + weight.

**Invariants**

- Final score `1..100` araligindadir.
- Weight toplam %100'dur: velocity variance 30%, spillover 25%, burnout 20%, block duration 25%.
- Burnout signal Modul 2 capacity + allocation read model'lerinden hesaplanir.
- Block duration status history/comment evidence'ten turetilir; veri yoksa warning ve conservative score kullanilir.
- Health score advisory'dir; otomatik Jira/GitHub aksiyonu uretmez.

## Aggregate Olmayanlar

- `JiraIssueDto`: existing Catalog read model; Modul 3 icinde source evidence olarak kullanilir.
- `JiraSprintDto`: existing Catalog read model; reviewable sprint icin kullanilir.
- `SessionUserDto`: Identity & Access DTO'su; role ve author policy icin kullanilir.
- `TechnicalSubTaskDto` ve `AllocationRunDto`: Modul 2 read model'leri; health/burnout hesaplarinda okunabilir.
- React component'leri: domain aggregate degildir.
- Mongo collection adi aggregate degildir; collection sadece persistence boundary'dir.
