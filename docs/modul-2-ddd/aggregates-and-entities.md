# Aggregates and Entities

## Shared Value Objects

| Value Object | Alanlar | Invariant |
| --- | --- | --- |
| `Warning` | code, message, severity | Severity `info` veya `warning`; akisi bloklamaz. |
| `EngineeringDomain` | enum | Bilinen domain enum veya `other`. |
| `RiskLevel` | low, medium, high | Risk bos olamaz. |
| `ConfidenceScore` | number | 0-1 araliginda. |
| `FitScore` | number | 0-1 araliginda. |
| `Hours` | number | Negatif olamaz. |
| `SkillKey` | string | Taxonomy icinde unique ve active olmali. |
| `SkillLevel` | number | 0-5 integer. |
| `DependencyRef` | subTaskId | Ayni decomposition run icinde var olmali. |

## Planning Intake

### Aggregate Root: `PlanningInput`

**Entities**

- `SourceSnapshot`: manual text veya Jira issue snapshot.
- `AcceptanceCriterion`: parsed AC maddesi.
- `InputConstraint`: deadline, dependency, policy veya technology constraint.

**Invariants**

- `title` ve `description` bos olamaz.
- `sourceType = jira-issue` ise `issueKey` gerekir.
- `sourceType = manual` ise manual title/description gerekir.
- `createdBy` session user id olmalidir.
- Acceptance criteria bos olabilir; bu durumda warning uretir, error degil.
- Source snapshot immutable'dir; sonraki Jira degisikligi existing planning input'u degistirmez.

## Technical Decomposition

### Aggregate Root: `DecompositionRun`

**Entities**

- `TechnicalSubTask`: generated teknik is parcasi.
- `ProviderRunMetadata`: provider, promptVersion, createdAt, fallback flag.

**Value Objects**

- `RequiredSkill`: key, minLevel, weight.
- `AcceptanceCheck`: dogrulanabilir check.
- `Deliverable`: somut cikti.
- `DependencyRef`: sub-task bagimliligi.

**Invariants**

- Bir run tek `PlanningInput`'a baglidir.
- Her sub-task tek `EngineeringDomain` tasir.
- Her sub-task title, description, estimateHours, risk ve confidence tasir.
- `estimateHours > 0` olmali.
- Required skill weight negatif olamaz.
- Dependencies ayni run icindeki sub-task id'lerine referans verir.
- Provider cikti malformed ise normalized output veya heuristic fallback kullanilir.
- Raw prompt persist edilmez.

## Team Capability & Capacity

### Aggregate Root: `TeamMember`

**Entities**

- `MemberSkill`: skill key + level.

**Invariants**

- Display name bos olamaz.
- Active member assignment adayi olabilir; inactive member olamaz.
- Ayni member icinde duplicate skill key olamaz.
- Skill level 0-5 integer'dir.
- Skill key taxonomy'de yoksa warning veya validation policy uygulanir; MVP admin formunda validation error tercih edilir.

### Aggregate Root: `SkillTaxonomy`

**Entities**

- `SkillDefinition`: key, label, domain, active.

**Invariants**

- Skill key unique.
- Active skill assignment/decomposition requiredSkills icin kullanilabilir.
- Inactive skill eski run'larda gorulebilir, yeni recommendation icin tercih edilmez.

### Aggregate Root: `SprintCapacityLog`

**Entities**

- `MemberCapacity`: memberId, availabilityHours, committedHours, maxVelocityPoints, timeOffHours, wipLimit.

**Invariants**

- Sprint id bos olamaz.
- Member capacity duplicate memberId iceremez.
- Hours negatif olamaz.
- `committedHours + timeOffHours` availabilityHours'u asarsa warning veya admin override gerekir.
- Capacity log update admin-only'dir.

## Smart Allocation

### Aggregate Root: `AllocationRun`

**Entities**

- `AssignmentRecommendation`: subTaskId, optional memberId, score, reasons, alternatives, warnings.
- `UnassignedTask`: subTaskId, reason, blocking constraints.

**Value Objects**

- `FitBreakdown`: skillFit, availabilityFit, balanceFit, riskFit, continuityFit.
- `AlternativeOwner`: memberId, score, reasons.
- `UtilizationRow`: memberId, beforeHours, assignedHours, afterHours, capacityHours, utilizationPercent.

**Invariants**

- Bir allocation run tek decompositionRun ve sprintId ile calisir.
- Her sub-task icin tam bir recommendation veya unassigned reason vardir.
- Hard constraints fail ederse memberId atanmaz.
- Score breakdown parcalari 0-1 araligindadir.
- Top alternatives primary owner'i tekrar etmez.
- Utilization sequential assignment sonrasi yeniden hesaplanir.
- High risk task uygun senior skill yoksa warning alir.

## Reporting Engine

### Aggregate Root: `TaskAllocationReport`

**Entities**

- `ReportSection`: decomposition summary, allocation summary, utilization, risks, warnings, assumptions.

**Value Objects**

- `MarkdownBody`: rendered report text.
- `JsonReportBody`: structured report payload.

**Invariants**

- Report tek allocationRun'a baglidir.
- JSON report ve Markdown ayni source run'dan uretildigini belirtir.
- Markdown body bos olamaz.
- Warnings ve assumptions kaybolmaz.
- Report version createdAt ile izlenebilir.

## Aggregate Olmayanlar

- `JiraIssueDto`: Modul 1 Catalog read model'i; Modul 2 icinde source snapshot olarak kullanilir.
- `SessionUserDto`: Identity & Access DTO'su; createdBy/admin policy icin kullanilir.
- React component'leri: domain aggregate degildir.
- Mongo collection adi aggregate degildir; collection sadece persistence boundary'dir.
