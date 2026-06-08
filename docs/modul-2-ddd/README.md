# Modul 2 DDD Dokumanlari

Bu klasor, `modul_2_plan.md` icindeki Task Decomposition & Smart Allocation kapsami icin compact DDD tasarimini icerir.

Kaynaklar: `modul_2_plan.md`, `.codesight/CODESIGHT.md`, `.codesight/routes.md`, `.codesight/components.md`, mevcut Express route/service dosyalari, `@module1/contracts`, React delivery dashboard. `.codesight/wiki/index.md` repoda yok; Codesight ana haritasi kullanildi.

## Dosya Haritasi

- `domain-overview.md`: urun hedefi, aktorler, subdomain'ler, kabiliyetler.
- `bounded-contexts.md`: bounded context sahipligi, sorumluluklar, disarida kalan isler.
- `ubiquitous-language.md`: ortak terimler, anlamlar, dil kurallari.
- `context-map.md`: context iliskileri, veri akisi, entegrasyon kurallari.
- `aggregates-and-entities.md`: aggregate root'lar, entity'ler, value object'ler, invariants.
- `use-cases.md`: ana kullanim senaryolari, sonuc, hata ve uyari yollari.
- `../modul-2-contracts/backend-frontend-api-contracts.md`: backend/frontend REST kontratlari ve DTO sozlesmeleri.

## Sistem Haritasi

```text
Manual task or JiraIssueDto
  -> Planning Intake
  -> Technical Decomposition
  -> Team Capability & Capacity
  -> Smart Allocation
  -> Reporting Engine
  -> Delivery Experience UI
```

## Kapsam

- Serbest metin veya Modul 1 backlog issue secimi ile planning input olusturma.
- Acceptance criteria, constraints, source snapshot ve input warning uretme.
- High-level story/task'i teknik sub-task'lara bolme.
- Engineering domain siniflama: frontend, backend, database, qa, integration, devops, security, ux, docs, data-ai.
- Her sub-task icin deliverables, acceptance checks, required skills, dependencies, estimate, risk, confidence, rationale uretme.
- Deterministic heuristic decomposition MVP.
- OpenRouter adapter P2 boundary: anonymizer, Zod validation, provider fallback.
- Team member, skill taxonomy, skill matrix ve sprint capacity yonetimi.
- Capacity, max velocity, WIP ve minimum skill constraint'leri ile assignment recommendation uretme.
- Alternatives, unassigned reasons, utilization before/after, warning ve risk summary hesaplama.
- Persisted JSON + Markdown task allocation report uretme.
- Mevcut auth/admin guard, ErrorEnvelope, `/api` route yapisi ve `@module1/contracts` genisletme stiline uyma.
- Modul 2 UI icin mevcut DeliveryDashboard icinde yeni tab/flow baslatma.

## Kapsam Disi

- Jira write, assignee update, comment, transition.
- Predictive Sizing ve Blockage Advisory domain logic'ini degistirme.
- OpenRouter MVP zorunlulugu; heuristic v1 ana provider.
- Dis LLM'e anonimlestirme olmadan Jira/company text gonderme.
- Raw prompt veya hassas source text loglama.
- PDF export MVP; Markdown ve JSON yeterli.
- Multi-owner task MVP; tek primary owner, P2 collaborator.
- Tam otomatik sprint planning veya enterprise workflow otomasyonu.

## Tasarim Ilkeleri

- Her kabiliyetin tek owning context'i vardir.
- Context'ler private entity paylasmaz; ID, DTO, query, event veya read model paylasir.
- Modul 1 Catalog sadece source snapshot saglar; Modul 2 allocation kararlarini sahiplenmez.
- Eksik input, yetersiz skill/capacity ve provider fallback kullanici akisina warning olarak doner.
- Assignment karari aciklanabilir olmalidir: score breakdown, reasons, alternatives, utilization.
- Admin-only edit policy team matrix ve capacity icin korunur.
- Deterministic heuristic cikti testlerin stabil kalmasi icin default provider'dir.
- Report run versioned ve audit'e hazir tasarlanir.

## MVP Kararlari

- Input source: Jira issue secimi + serbest metin.
- Acceptance criteria: plain text + madde listesi.
- UI dili: Turkce; domain labels: English enum.
- Skill scale: 0-5 numeric.
- Capacity unit: hours primary; story point optional.
- Assignment objective: risk-adjusted skill fit > capacity > balance.
- Hard limit: max velocity/capacity, admin override P2.
- Report format: JSON + Markdown.
