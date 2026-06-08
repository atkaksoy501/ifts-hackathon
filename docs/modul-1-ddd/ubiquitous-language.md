# Ubiquitous Language

## Terimler

| Terim | Anlam | Sahip Context |
| --- | --- | --- |
| Project Key | Jira proje anahtarı; v1 varsayılan `ICTFT`, config ile değişebilir. | Jira Source Publishing |
| Board ID | Jira Agile board kimliği; sprint history için gerekir. | Jira Source Publishing |
| Story Point Field | Jira custom field; env override varsa discovery sonucunu ezer. | Jira Source Publishing |
| Jira Issue | Jira'dan gelen upstream issue kaydı. App içinde private Jira entity olarak paylaşılmaz. | Jira Source Publishing |
| Backlog Issue | Henüz tamamlanmamış, sizing önerisi alınabilecek normalized issue. | Work Item Ingestion & Catalog |
| Historical Issue | Closed sprint geçmişinden gelen, recommendation için neighbor adayı olan issue. | Work Item Ingestion & Catalog |
| Closed Sprint | Agile API'den alınan tamamlanmış sprint. Minimum 3 yoksa warning üretilir. | Jira Source Publishing |
| GitHub State | `jira-live/state.json`; publisher ile backend arasındaki published language. | Jira Source Publishing |
| Sync Run | Backend ingest denemesinin sonucu, zamanı, warning/error bilgisi. | Work Item Ingestion & Catalog |
| Field Mapping | Jira field adı ile app alanı arasındaki mapping. | Work Item Ingestion & Catalog |
| Story Point | Tahmin ölçeği; yokluk `undefined`, sıfır story point ile aynı değildir. | Predictive Sizing |
| Time Spent Hours | Jira time tracking kaynaklı gerçekleşen saat. | Predictive Sizing |
| Ideal Hours | Önerilen ideal saat. Time tracking varsa oradan türetilir; yoksa fallback kullanılır. | Predictive Sizing |
| `HOURS_PER_STORY_POINT` | Story point'i saate çevirmek için config fallback katsayısı. | Predictive Sizing |
| Similar Issue | Hedef issue'ya metin ve metadata olarak benzeyen historical issue. | Predictive Sizing |
| Similarity | TF-IDF/keyword benzerlik skoru. Confidence'ın tek girdisi değildir. | Predictive Sizing |
| Neighbor Count | Recommendation hesabına katılan benzer issue sayısı. | Predictive Sizing |
| Data Completeness | Story point, hour, sprint, description gibi alanların yeterlilik oranı. | Predictive Sizing |
| Variance | Neighbor story point/hour dağılım farkı. Yüksek variance confidence düşürür. | Predictive Sizing |
| Confidence | 0..1 arası güven skoru. UI yüzdeye çevirebilir. | Predictive Sizing / Blockage Advisory |
| Warning | Akışı bloklamayan, kullanıcıya açıklanacak veri/kalite uyarısı. | Tüm context'ler |
| Recommendation | Kullanıcı talebiyle üretilen sizing veya blockage çıktısı. | Predictive Sizing / Blockage Advisory |
| Rationale | Sizing sonucunun neden önerildiğini açıklayan kısa metin. | Predictive Sizing |
| Blockage Pattern | Local KB'deki blokaj sinyali, eşleşme kuralı ve önerilen aksiyon seti. | Blockage Advisory |
| Evidence | Blockage recommendation için eşleşen issue örneği, pattern veya metin sinyali. | Blockage Advisory |
| Action | Kullanıcının deneyebileceği blokaj çözüm adımı. | Blockage Advisory |
| Local User | Uygulama içinde yönetilen kullanıcı; Jira user ile aynı olmak zorunda değildir. | Identity & Access |
| Admin | Kullanıcı, sync ve blockage KB yönetme yetkisine sahip local user. | Identity & Access |
| httpOnly JWT Cookie | Browser JS tarafından okunamayan oturum cookie'si. | Identity & Access |
| Dictionary | Türkçe UI metinlerinin ileride i18n için key-value yapısı. | Delivery Experience |
| OpenRouter Adapter | V1 sonrası eklenebilecek provider. Domain interface arkasında kalır. | Predictive Sizing / Blockage Advisory |
| Anonymization | Jira metinlerini dış AI servisine göndermeden önce hassas veriden arındırma. | Future AI Boundary |

## Dil Kuralları

- "Warning" engel değildir; kullanıcı akışı devam eder.
- "Eksik veri" recommendation yok demek değildir; confidence düşer ve warning eklenir.
- "Story point yok" ile `0` story point farklıdır.
- "Ideal hour" her zaman gerçekleşen süre değildir; fallback ile tahmin olabilir.
- "Similar issue" sadece normalized read model ile temsil edilir; Jira private entity taşınmaz.
- "Blockage action" Jira'ya otomatik yazılmaz; kullanıcıya öneridir.
- "Admin" local uygulama rolüdür; Jira admin anlamına gelmez.
- "OpenRouter" domain motoru değildir; adapter'dır.
- "Anonimleştirme" dış provider kullanımı için zorunlu boundary'dir.
