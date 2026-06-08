# Modül 1 DDD Dokümanları

Bu klasör, `modul_1_plan.md` içindeki Predictive Sizing + Blockage Advisor kapsamı için compact DDD tasarımını içerir.

## Dosya Haritası

- `domain-overview.md`: ürün hedefi, aktörler, subdomain'ler, kabiliyetler.
- `bounded-contexts.md`: bounded context sahipliği, sorumluluklar, dışarıda bırakılan işler.
- `ubiquitous-language.md`: ortak terimler, bağlama göre anlamlar, dil kuralları.
- `context-map.md`: context ilişkileri, veri akışı, entegrasyon kuralları.
- `aggregates-and-entities.md`: aggregate root'lar, entity'ler, value object'ler, invariants.
- `use-cases.md`: ana kullanım senaryoları, sonuçlar, hata ve uyarı yolları.

## Sistem Haritası

```text
Company PC Python Publisher
  -> Jira REST read-only
  -> GitHub jira-live/state.json
  -> Express backend ingest job
  -> MongoDB
  -> Predictive Sizing + Blockage Advisor
  -> React/Vite Türkçe UI
```

## Kapsam

- Jira'dan read-only backlog, historical issue, sprint, field mapping verisi toplama.
- GitHub-backed `jira-live` state yayını.
- Backend startup/interval poll ve admin manual sync.
- Mongo upsert: `users`, `jira_issues`, `jira_sprints`, `jira_field_mappings`, `recommendations`, `blockage_patterns`, `sync_runs`.
- Local multi-user auth, admin seed, admin user CRUD, httpOnly JWT cookie.
- Heuristic TF-IDF/keyword similarity ile story point ve ideal hour önerisi.
- Jira time tracking yoksa `HOURS_PER_STORY_POINT` fallback.
- Confidence hesabı: similarity, neighbor count, data completeness, variance.
- Eksik veri durumunda non-blocking warning.
- Blockage advisor: Jira örnekleri + local KB üzerinden aksiyon önerisi.
- Türkçe UI ve ileride i18n için dictionary yapısı.

## Kapsam Dışı

- Jira'ya write operasyonu.
- Backend veya Cloud Run üzerinden direkt Jira erişimi.
- OpenRouter v1 implementasyonu; sadece ileride aynı interface'e bağlanacak adapter olarak düşünülür.
- Anonimleştirme olmadan dış AI servisine Jira metni gönderme.
- CSV/Markdown/PDF export; P2 nice-to-have.
- Tam multi-language runtime; v1 UI Türkçe.
- Enterprise workflow otomasyonu, Jira status transition, sprint yönetimi.

## Tasarım İlkeleri

- Her kabiliyetin tek owning context'i vardır.
- Context'ler private entity paylaşmaz; ID, event, query, DTO veya read model paylaşır.
- Jira kaynak modeli, uygulama domain modelinden anti-corruption layer ile ayrılır.
- Eksik veri kullanıcı akışını bloklamaz; uyarı ve düşük confidence üretir.
- Recommendation sonuçları açıklanabilir olmalıdır: similar issues, rationale, evidence, warnings.
- OpenRouter devreye alınırsa anonimleştirme zorunlu boundary olur.
