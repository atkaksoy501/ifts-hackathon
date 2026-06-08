# Ubiquitous Language

## Terimler

| Terim | Anlam | Context |
| --- | --- | --- |
| Planning Input | Decomposition icin normalize edilmis kaynak task/story. | Planning Intake |
| Source Type | Input kaynaginin `manual` veya `jira-issue` olmasi. | Planning Intake |
| Source Snapshot | Input anindaki Jira issue veya manual text kopyasi. | Planning Intake |
| Jira Issue Snapshot | Modul 1 `JiraIssueDto` verisinin Modul 2 icin dondurulmus hali. | Planning Intake |
| Acceptance Criteria | Kullanici tarafindan verilen kabul kosullari listesi. | Planning Intake |
| Constraint | Deadline, teknoloji, dependency veya policy kisiti. | Planning Intake |
| Warning | Non-blocking risk/eksik veri mesaji. | Shared |
| Engineering Domain | Sub-task teknik alani: frontend, backend, database, qa, integration, devops, security, ux, docs, data-ai, other. | Technical Decomposition |
| Technical Sub-task | High-level task'tan uretilen test edilebilir teknik is parcasi. | Technical Decomposition |
| Deliverable | Sub-task tamamlaninca ortaya cikacak somut cikti. | Technical Decomposition |
| Acceptance Check | Sub-task icin dogrulanabilir test/kabul kontrolu. | Technical Decomposition |
| Required Skill | Sub-task icin gereken skill key, minimum level ve weight. | Technical Decomposition |
| Dependency | Bir sub-task'in baslamadan once bekledigi baska sub-task referansi. | Technical Decomposition |
| Estimate Hours | Sub-task icin saat tahmini. | Technical Decomposition |
| Risk | `low`, `medium`, `high` risk sinifi. | Technical Decomposition |
| Confidence | Provider ciktisina guven skoru, 0-1. | Technical Decomposition |
| Decomposition Run | Bir input icin provider tarafindan uretilen sub-task seti. | Technical Decomposition |
| Provider | Heuristic veya OpenRouter gibi decomposition ureten adapter. | Technical Decomposition |
| Prompt Version | Provider prompt/heuristic rule set surumu. | Technical Decomposition |
| Skill Taxonomy | Kullanilabilir skill key ve label listesi. | Team Capability & Capacity |
| Team Member | Assignment adayi olan aktif/pasif ekip uyesi. | Team Capability & Capacity |
| Skill Level | Team member'in skill seviyesini 0-5 olceginde gosteren deger. | Team Capability & Capacity |
| Sprint Capacity | Sprint icin member bazli available/committed/timeOff/WIP verisi. | Team Capability & Capacity |
| Remaining Capacity | `availabilityHours - committedHours - timeOffHours - assignedHours`. | Smart Allocation |
| WIP Limit | Member'a ayni anda atanabilecek aktif sub-task ust siniri. | Smart Allocation |
| Max Velocity | Member capacity kararinda kullanilan opsiyonel story point limiti. | Smart Allocation |
| Assignment Recommendation | Sub-task icin onerilen primary owner, score, reasons ve alternatives. | Smart Allocation |
| Fit Breakdown | Skill, availability, balance, risk ve continuity skor parcalari. | Smart Allocation |
| Alternative Owner | Primary owner disinda uygun aday. | Smart Allocation |
| Unassigned Reason | Constraint saglanmadigi icin owner atanamama aciklamasi. | Smart Allocation |
| Allocation Run | Bir decompositionRun + sprintCapacity icin uretilen assignment sonucu. | Smart Allocation |
| Utilization | Member bazli before, assigned, after, capacity ve percent ozeti. | Smart Allocation |
| Report Run | Allocation sonucu icin uretilmis versioned rapor. | Reporting Engine |
| Markdown Report | Insan okunur rapor export'u. | Reporting Engine |
| JSON Report | UI ve ileride API entegrasyonlari icin structured rapor. | Reporting Engine |

## Dil Kurallari

- `Issue`, Jira kaynak isini anlatir. `Technical Sub-task`, Modul 2 tarafindan uretilen teknik isi anlatir.
- `Task` tek basina kullanilmaz; `planning input`, `source issue` veya `technical sub-task` denir.
- `Owner`, assignment verilen team member'dir. Context owner ile karistirilmaz.
- `Admin`, auth role'dur; team lead kavrami UI/organizasyon aktorudur.
- Score ve confidence 0-1 araliginda tutulur.
- Skill level 0-5 araligindadir; 0 = yok, 5 = expert.
- Estimate MVP'de hours birimindedir. Story point optional metadata'dir.
- Warning akisi bloklamaz. ErrorEnvelope validasyon/auth gibi bloklayan hatalar icindir.
- Provider raw prompt'u domain terimi degildir; saklanan alan `provider`, `promptVersion`, metadata ve normalized output'tur.
- `Unassigned`, basarisiz run degildir; constraint sonucu uretilmis gecerli allocation sonucudur.

## Ortak Enumlar

```ts
type EngineeringDomain =
  | "frontend"
  | "backend"
  | "database"
  | "qa"
  | "integration"
  | "devops"
  | "security"
  | "ux"
  | "docs"
  | "data-ai"
  | "other";

type RiskLevel = "low" | "medium" | "high";
type ProviderName = "heuristic" | "openrouter";
type SourceType = "manual" | "jira-issue";
```
