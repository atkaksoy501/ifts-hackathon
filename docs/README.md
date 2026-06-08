# AI Hackathon Real - Doküman Özeti

Bu klasör, projenin modül modül tasarım ve geliştirme dokümanlarını içerir. Akış: fikirden DDD'ye, API kontratlarından feature task listesine, oradan multi-agent geliştirme ve test fazına gider.

## Geliştirme Fazları

```txt
Dizayn
  -> Fikir
  -> DDD dokümantasyonu
  -> API kontraktları
  -> Feature listesi

Geliştirme
  -> Multi-agent feature implementasyonu

Test
  -> Unit test
  -> Integration test
  -> E2E / kalite kontrolleri
```

## Modüller

| Modül | Kapsam | Dokümanlar |
| --- | --- | --- |
| Modül 1 | Predictive Sizing + Blockage Advisor | `modul_1_plan.md`, `modul_1_tasks.md`, `modul-1-ddd/`, `modul-1-contracts/` |
| Modül 2 | Task Decomposition & Smart Allocation | `modul_2_plan.md`, `modul_2_tasks.md`, `modul-2-ddd/`, `modul-2-contracts/` |
| Modül 3 | AI Sprint Review & Management Dashboard | `modul_3_plan.md`, `modul_3_tasks.md`, `modul-3-ddd/`, `modul-3-contracts/` |

## Temel Mimari

Proje `app/` altında TypeScript monorepo olarak kuruldu.

```txt
app/
  shared/    Zod DTO ve API kontratları
  backend/   Express.js API, auth, DDD servisleri, Mongo/in-memory repository
  frontend/  React/Vite/Tailwind dashboard ve API client
```

Backend Express.js kullanır. API kontratları `@module1/contracts` paketiyle frontend ve backend arasında ortak tutulur. Auth httpOnly JWT cookie ile çalışır. Veri akışı read-only Jira/GitHub state ingest -> backend servisleri -> frontend dashboard şeklindedir.

## Çalışma Notları

- DDD dosyaları boundary, use-case ve domain dilini belirler.
- Contract dosyaları endpoint, DTO, response ve error yapılarını belirler.
- Task dosyaları sub-agent'lara bölünebilir TDD iş listesidir.
- Test katmanı unit, integration ve e2e kontrolleriyle ilerler.
