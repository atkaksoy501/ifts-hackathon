# Modul 3 DDD Dokumanlari

Bu klasor, `modul_3_plan.md` icindeki AI Sprint Review & Management Dashboard kapsami icin compact DDD tasarimini icerir.

Kaynaklar: `modul_3_plan.md`, `.codesight/CODESIGHT.md`, `.codesight/routes.md`, `.codesight/components.md`, mevcut Express route/service dosyalari, `@module1/contracts`, React `DeliveryDashboard`, Modul 2 DDD dokumanlari. `.codesight/wiki/index.md` repoda yok; Codesight ana haritasi kullanildi.

## Dosya Haritasi

- `domain-overview.md`: urun hedefi, aktorler, subdomain'ler, kabiliyetler.
- `bounded-contexts.md`: bounded context sahipligi, sorumluluklar, disarida kalan isler.
- `ubiquitous-language.md`: ortak terimler, anlamlar, dil kurallari.
- `context-map.md`: context iliskileri, veri akisi, entegrasyon kurallari.
- `aggregates-and-entities.md`: aggregate root'lar, entity'ler, value object'ler, invariants.
- `use-cases.md`: ana kullanim senaryolari, sonuc, hata ve uyari yollari.
- `../modul-3-contracts/backend-frontend-api-contracts.md`: backend/frontend API kontratlari.

## Sistem Haritasi

```text
Jira + GitHub read-only state
  -> Sprint Evidence Intake
  -> Sprint Review Workspace
  -> Sprint Demo Reporting
  -> Delivery Analytics
  -> Delivery Experience UI

Team capacity/allocation read models
  -> Delivery Analytics
  -> Sprint Health & Spillover
```

## Kapsam

- `UserRole` enum'unu `"user" | "manager" | "admin"` olacak sekilde genisletme.
- `manager|admin` icin sprint remark ve sprint demo/report generate izni.
- `admin` icin mevcut user/admin CRUD ve admin-only edit politikasini koruma.
- Jira sprint start/close snapshot, story point, timeSpent, assignee, issueType, changelog/status history, comments ve resolution remarks verisini ingest etme.
- GitHub PR/commit metadata toplama ve issue mapping regex'i ile sprint evidence'e baglama: `/[A-Z][A-Z0-9]+-\d+/`.
- Sprint listesi ve sprint evidence goruntuleme.
- Manager/admin tarafindan sprint remark ekleme.
- Completed items, PR'lar, commit'ler, closing remarks ve warnings ile normalized sprint evidence uretme.
- Deterministic heuristic Turkish executive/demo summary uretme.
- OpenRouter adapter'i P2 olarak sinirlama; anonymizer zorunlu.
- Versioned JSON sprint demo report persist etme.
- Markdown report render ve export yuzeyi saglama.
- Planned vs actual story point/hour variance hesaplama.
- Velocity trend ve bottleneck grouping uretme.
- Bonus olarak spillover metrics ve sprint health score hesaplama.
- Mevcut auth, error envelope, `/api` route stili ve `@module1/contracts` Zod contract stiline uyma.
- Mevcut `DeliveryDashboard` icinde Sprint Review tab ve variance/report deneyimi ekleme.

## Kapsam Disi

- Jira write: assignee update, comment, transition, sprint close update.
- GitHub write veya PR status update.
- PDF export MVP.
- Slack/email publish.
- OpenRouter live generation P1/MVP; heuristic summary default provider.
- Dis AI provider'a anonimlestirme olmadan company text gonderme.
- Raw prompt, raw comment veya hassas source text loglama.
- Health score'u tek karar otoritesi yapmak; score advisory kalir.
- Bonus spillover/health panellerini core report tamamlanmadan one almak.

## Tasarim Ilkeleri

- Her kabiliyetin tek owning context'i vardir.
- Context'ler private entity paylasmaz; ID, DTO, query, event veya read model paylasir.
- Sprint start snapshot planned baseline'dir; sprint close Done items actual baseline'dir.
- TimeSpent eksikse `HOURS_PER_STORY_POINT` fallback kullanilir ve warning uretilir.
- Heuristic summary deterministik olur; testler stabil kalir.
- Report JSON ve Markdown ayni report version'a baglidir.
- Evidence traceable olmalidir: Jira issue, sprint snapshot, PR, commit, remark source referanslari korunur.
- Sparse data, mapping miss ve fallback kullaniciya warning olarak doner.
- UI ve rapor dili Turkce; enum/developer domain key'leri English kalabilir.

## MVP Kararlari

- Trend window default: `6`.
- Report provider default: `heuristic`.
- Report export: JSON + Markdown.
- Health final score: `1..100`.
- Health weights: velocity variance 30%, spillover 25%, burnout 20%, block duration 25%.
- Planned baseline: sprint start snapshot.
- Actual baseline: sprint close snapshot icindeki Done items.
- Burnout/over-allocation: Modul 2 capacity + allocation read model'lerinden hesaplanir.
- Spillover ve health score bonus sirasinda gelir; once demo summary + variance dashboard.
