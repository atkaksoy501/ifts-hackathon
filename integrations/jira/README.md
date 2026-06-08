# Jira Integration Hazirligi

Bu klasor Turkcell Jira entegrasyonu icin yerel test, CI smoke test ve uygulama gelistirme hazirliklarini toplar.

## Guvenli Kimlik Bilgisi Akisi

Token'i repoya yazmayin. Yerelde `integrations/jira/.env` dosyasi veya shell environment kullanin; CI'da GitHub Secrets kullanin.

```bash
cp integrations/jira/.env.example integrations/jira/.env
chmod 600 integrations/jira/.env
```

Gerekli alanlar:

- `JIRA_URL=https://jira.turkcell.com.tr`
- `JIRA_AUTH_MODE=bearer`
- `JIRA_TOKEN=<personal-access-token>`
- `JIRA_USERNAME=<kullanici>` sadece `JIRA_AUTH_MODE=basic` ise gerekli

Jira Server/Data Center personal access token'lari cogunlukla `Authorization: Bearer <token>` ile calisir. Basic auth istenirse `JIRA_AUTH_MODE=basic` yapin.

## Yerel Baglanti Testi

Script ek kutuphane gerektirmez; Python standart kutuphanesiyle calisir.

```bash
python3 integrations/jira/jira_smoke_test.py
```

Belirli proje icin:

```bash
python3 integrations/jira/jira_smoke_test.py --project-key ABC --max-results 10
```

Belirli JQL icin:

```bash
python3 integrations/jira/jira_smoke_test.py --jql 'project = ABC AND statusCategory != Done ORDER BY updated DESC'
```

Kurumsal sertifika sorunu olursa once CA bundle tercih edin:

```bash
export JIRA_CA_BUNDLE=/path/to/corporate-ca.pem
```

Son care olarak, sadece gecici testte:

```bash
export JIRA_VERIFY_SSL=false
```

## Ag ve BigIP/F5 Notu

Mac mini uzerinden yapilan ilk kontrol:

- `jira.turkcell.com.tr` DNS kaydi cozuluyor.
- HTTPS host cevap veriyor.
- `GET /rest/api/2/serverInfo` istegi Jira JSON'u yerine `302 Location: /my.policy` donduruyor.

Bu genellikle Jira'nin onunde BigIP/F5, VPN veya ZTNA katmani oldugunu gosterir. Token dogru olsa bile runner bu katmandan Jira REST'e gecemeyebilir. Cozum secenekleri:

- Mac mini'yi kurumsal VPN/ZTNA oturumuyla Jira REST'e erisebilir hale getirmek.
- Runner IP/host'unu Jira REST icin allowlist'e aldirmak.
- Hackathon icin servis hesabi ve servis-to-servis route tanimlatmak.
- Gerekirse proxy degiskenlerini CI'a eklemek: `HTTPS_PROXY`, `NO_PROXY`.

Smoke test `302 /my.policy` gorurse bunu ag/SSO gecidi problemi olarak ele alin.

## SDK ve Kutuphaneler

Smoke test bilincli olarak dependency'sizdir. Uygulama kodu icin onerilen Python kutuphaneleri:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r integrations/jira/requirements.txt
```

Ana secenekler:

- `jira`: Jira issue, project, board ve workflow operasyonlari icin yaygin Python SDK.
- `requests`: Dusuk seviyeli REST entegrasyonlari icin.
- `python-dotenv`: Yerel `.env` yuklemek icin.

## Jira REST Veri Modeli

En sik kullanilacak kaynaklar:

- Project: proje anahtari, ad, lead, issue type scheme.
- Issue: `key`, `id`, `fields`, `changelog`, `renderedFields`.
- Fields: `summary`, `description`, `status`, `assignee`, `reporter`, `issuetype`, `priority`, `labels`, `components`, `fixVersions`, `updated`, custom field'lar.
- Status: workflow durum adlari ve `statusCategory` (`To Do`, `In Progress`, `Done`).
- User: Data Center'da genellikle `name`/`key`; Cloud'da `accountId`.
- Sprint/board: Jira Software endpoint'leri `/rest/agile/1.0/...` altindadir.

Temel endpoint'ler:

- `GET /rest/api/2/serverInfo`
- `GET /rest/api/2/myself`
- `POST /rest/api/2/search`
- `GET /rest/api/2/issue/{issueKey}`
- `GET /rest/api/2/project`
- `GET /rest/api/2/field`
- `GET /rest/agile/1.0/board`

## Ornek JQL Sorgulari

```text
project = ABC ORDER BY updated DESC
project = ABC AND statusCategory != Done ORDER BY priority DESC, updated DESC
project = ABC AND assignee = currentUser() AND resolution = Unresolved ORDER BY due ASC
project = ABC AND updated >= -7d ORDER BY updated DESC
project = ABC AND labels in (hackathon) ORDER BY created DESC
project = ABC AND issuetype in (Bug, Story, Task) AND sprint in openSprints()
```

## CI Secret Hazirligi

GitHub repository veya organization secrets:

- `JIRA_URL`: `https://jira.turkcell.com.tr`
- `JIRA_TOKEN`: Jira token
- `JIRA_AUTH_MODE`: `bearer` veya `basic`
- `JIRA_USERNAME`: sadece Basic auth icin
- `JIRA_PROJECT_KEY`: smoke testte kontrol edilecek proje
- `JIRA_CA_BUNDLE`: runner uzerinde CA dosyasi gerekiyorsa path

Workflow adimi secret yoksa atlanacak sekilde ayarlandi; boylece mevcut CI kirilmaz.

## Ikinci Runner ile Gecici Cozum

Sirket agina bagli cihaz GitHub Actions self-hosted runner olarak eklendi:

- Runner name: `TC24631568`
- Runner labels: `self-hosted`, `Windows`, `X64`

Jira smoke test workflow'u sadece bu runner'a hedeflenir:

```yaml
runs-on:
  - self-hosted
  - Windows
  - X64
```

Mac mini uzerindeki ana CI ise `self-hosted`, `macOS`, `ARM64` label'larina sabitlendi. Boylece SonarQube, Kafka, MongoDB ve local DB isleri Mac mini'de kalir; Jira REST erisimi sirket agindaki Windows runner'da calisir.

Manuel calistirma:

```bash
gh workflow run jira-smoke.yml -R atkaksoy501/ifts-hackathon -f max_results=3
```

## Live UI Bridge

Mac mini ile sirket PC birbirini network uzerinden goremiyorsa live Jira guncellemeleri icin GitHub-backed bridge kullanin:

```text
Sirket PC -> Jira REST -> GitHub jira-live/state.json
Mac mini -> GitHub state -> MongoDB -> UI
```

Detayli kurulum:

```text
integrations/jira/live_bridge/README.md
```

## Hazirlik Kontrol Listesi

- Token scope'u en azindan `serverInfo`, `myself`, `search` ve hedef proje okuma yetkisini kapsiyor.
- Hedef proje anahtari netlestirildi.
- Custom field listesi `GET /rest/api/2/field` ile cikarildi.
- Ilk smoke JQL belirlendi.
- CI secrets eklendi.
- Kurumsal CA gerekiyorsa runner'a kuruldu veya `JIRA_CA_BUNDLE` tanimlandi.

## Mac Mini Test Ortami Durumu

2026-06-08 kontrolunde Docker uzerinde calisan servisler:

- `sonarqube`: `sonarqube:community`, `http://localhost:9000`
- `kafka`: `apache/kafka:3.7.1`, `localhost:9092`, `localhost:9094`
- `mongodb`: `mongo:7`, `localhost:27017`
- `sonarqube-db`: `postgres:16`, `localhost:5432`
