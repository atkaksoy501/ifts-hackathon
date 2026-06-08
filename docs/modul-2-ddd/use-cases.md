# Use Cases

## UC-201: Manual Planning Input Olustur

| Alan | Deger |
| --- | --- |
| Aktor | Kullanici |
| Owner Context | Planning Intake |
| Onkosul | Kullanici login olmus. |
| Akis | Kullanici title, description, acceptance criteria ve constraints girer; backend payload'i validate eder; source snapshot olusturur. |
| Sonuc | `PlanningInputDto` persist edilir ve id doner. |
| Hata/Uyari | Title/description bos ise `INVALID_REQUEST`; AC eksikse warning. |

## UC-202: Jira Issue'dan Planning Input Olustur

| Alan | Deger |
| --- | --- |
| Aktor | Kullanici |
| Owner Context | Planning Intake |
| Onkosul | Kullanici login olmus; issue key Modul 1 Catalog'da mevcut. |
| Akis | UI backlog issue secer; backend Catalog'dan `JiraIssueDto` okur; summary/description/metadata snapshot'a kopyalanir; kullanici AC ekleyebilir. |
| Sonuc | Source type `jira-issue` olan planning input olusur. |
| Hata/Uyari | Issue bulunamazsa `NOT_FOUND`; Jira description kisa ise warning. |

## UC-203: Input Quality Warning Uret

| Alan | Deger |
| --- | --- |
| Aktor | Planning Intake Service |
| Owner Context | Planning Intake |
| Onkosul | Planning input parse edilmistir. |
| Akis | Service AC sayisi, description uzunlugu, belirsiz scope ve constraint ipuclarini kontrol eder. |
| Sonuc | Warning listesi planning input icinde saklanir. |
| Hata/Uyari | Warning run'u bloklamaz. |

## UC-204: Technical Decomposition Calistir

| Alan | Deger |
| --- | --- |
| Aktor | Kullanici / Backend Service |
| Owner Context | Technical Decomposition |
| Onkosul | Planning input mevcut veya inline input valid. |
| Akis | `POST /api/decompositions/run` provider secer; heuristic signal detection calisir; sub-task'lar domain, deliverables, checks, skills, dependencies, estimate, risk ve confidence ile uretilir. |
| Sonuc | `DecompositionRunDto` persist edilir. |
| Hata/Uyari | Input fazla belirsizse low confidence ve warning doner. |

## UC-205: Provider Fallback Kullan

| Alan | Deger |
| --- | --- |
| Aktor | Technical Decomposition Service |
| Owner Context | Technical Decomposition |
| Onkosul | OpenRouter provider P2 aktif veya provider output validation calisir. |
| Akis | Provider output Zod schema ile validate edilir; malformed veya unavailable durumda heuristic provider calistirilir. |
| Sonuc | Deterministic normalized decomposition run olusur. |
| Hata/Uyari | `PROVIDER_FALLBACK_USED` warning eklenir; raw prompt loglanmaz. |

## UC-206: Skill Taxonomy Yonet

| Alan | Deger |
| --- | --- |
| Aktor | Admin |
| Owner Context | Team Capability & Capacity |
| Onkosul | Admin role ile login. |
| Akis | Admin skill key, label, domain ve active state listesini gorur veya replace eder. |
| Sonuc | `SkillTaxonomy` guncellenir. |
| Hata/Uyari | Duplicate skill key `INVALID_REQUEST`; non-admin 403. |

## UC-207: Team Member Skill Matrix Yonet

| Alan | Deger |
| --- | --- |
| Aktor | Admin |
| Owner Context | Team Capability & Capacity |
| Onkosul | Admin role ile login; skill taxonomy mevcut. |
| Akis | Admin member olusturur veya patch eder; skills, role, active state ve domainPreferences girer. |
| Sonuc | Team member assignment adayi olarak hazir olur. |
| Hata/Uyari | Skill level 0-5 disinda ise validation error; inactive member assignment disi kalir. |

## UC-208: Sprint Capacity Guncelle

| Alan | Deger |
| --- | --- |
| Aktor | Admin |
| Owner Context | Team Capability & Capacity |
| Onkosul | Admin role ile login; member listesi mevcut. |
| Akis | Admin current sprint icin availabilityHours, committedHours, timeOffHours, maxVelocityPoints ve wipLimit girer. |
| Sonuc | Current `SprintCapacityDto` kaydedilir. |
| Hata/Uyari | Negatif hour validation error; committed + timeOff availability'yi asarsa warning veya override policy gerekir. |

## UC-209: Assignment Recommendation Uret

| Alan | Deger |
| --- | --- |
| Aktor | Team Lead / Kullanici |
| Owner Context | Smart Allocation |
| Onkosul | Decomposition run ve current sprint capacity mevcut. |
| Akis | `POST /api/allocations/recommend` hard constraints uygular; valid member'lar icin skill, availability, risk, balance ve continuity score hesaplar; best owner ve top alternatives secer. |
| Sonuc | `AllocationRunDto` recommendation, reasons, alternatives ve utilization ile persist edilir. |
| Hata/Uyari | Capacity veya skill eksikse unassigned reason ve warning uretilir. |

## UC-210: Over Capacity veya Missing Skill Nedeniyle Unassigned Birak

| Alan | Deger |
| --- | --- |
| Aktor | Smart Allocation Engine |
| Owner Context | Smart Allocation |
| Onkosul | Sub-task icin valid owner bulunamadi. |
| Akis | Engine failed constraints listesini toplar; memberId bos recommendation veya unassigned entry uretir. |
| Sonuc | UI sub-task'i unassigned ve reason ile gosterir. |
| Hata/Uyari | Run basarisiz sayilmaz; risk summary yukselir. |

## UC-211: Task Allocation Report Olustur

| Alan | Deger |
| --- | --- |
| Aktor | Kullanici |
| Owner Context | Reporting Engine |
| Onkosul | Allocation run mevcut. |
| Akis | `POST /api/reports/task-allocation` allocation, decomposition, utilization, warnings ve assumptions verisini toplar; JSON + Markdown render eder. |
| Sonuc | `TaskAllocationReportDto` persist edilir. |
| Hata/Uyari | Allocation run bulunamazsa `NOT_FOUND`. |

## UC-212: Markdown Report Gor

| Alan | Deger |
| --- | --- |
| Aktor | Kullanici |
| Owner Context | Reporting Engine |
| Onkosul | Report run mevcut. |
| Akis | UI `GET /api/reports/task-allocation/:id/markdown` cagirir; backend Markdown body dondurur. |
| Sonuc | Kullanici report preview, copy veya download yapabilir. |
| Hata/Uyari | Markdown body bos olamaz; report bulunamazsa `NOT_FOUND`. |

## UC-213: Modul 2 Dashboard Akisini Kullan

| Alan | Deger |
| --- | --- |
| Aktor | Kullanici / Team Lead |
| Owner Context | Delivery Experience |
| Onkosul | Kullanici login olmus; backend route'lari hazir. |
| Akis | Kullanici issue/manual input secer, AC duzenler, "Gorevlere Bol" der, sub-task table gorur, "Akilli Ata" der, utilization ve alternatives gorur, "Rapor Olustur" der. |
| Sonuc | Tek dashboard akisi icinde decomposition, allocation ve report tamamlanir. |
| Hata/Uyari | Loading, empty, error ve permission states UI'da gorunur. |

## UC-214: Permission Policy Uygula

| Alan | Deger |
| --- | --- |
| Aktor | Backend API |
| Owner Context | Identity & Access + Modul 2 Contexts |
| Onkosul | Request `/api` altinda gelir. |
| Akis | Session guard tum Modul 2 endpoint'lerinde calisir; team/capacity edits admin guard ister. |
| Sonuc | Normal user read/run yapabilir; admin edit yapabilir. |
| Hata/Uyari | No session 401; non-admin edit 403. |

## API Coverage

| Endpoint | Use Case |
| --- | --- |
| `POST /api/planning-inputs` | UC-201, UC-202 |
| `GET /api/planning-inputs/:id` | UC-201, UC-202 |
| `POST /api/decompositions/run` | UC-204, UC-205 |
| `GET /api/decompositions/:id` | UC-204 |
| `GET /api/team/members` | UC-207, UC-209 |
| `POST /api/team/members` | UC-207, UC-214 |
| `PATCH /api/team/members/:id` | UC-207, UC-214 |
| `GET /api/team/skills` | UC-206, UC-209 |
| `PUT /api/team/skills` | UC-206, UC-214 |
| `GET /api/sprint-capacity/current` | UC-208, UC-209 |
| `PUT /api/sprint-capacity/current` | UC-208, UC-214 |
| `POST /api/allocations/recommend` | UC-209, UC-210 |
| `GET /api/allocations/:id` | UC-209 |
| `POST /api/reports/task-allocation` | UC-211 |
| `GET /api/reports/task-allocation/:id` | UC-211 |
| `GET /api/reports/task-allocation/:id/markdown` | UC-212 |
