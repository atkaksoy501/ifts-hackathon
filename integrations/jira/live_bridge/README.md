# Jira Live Bridge

Bu bridge, birbirini goremeyen iki cihazi GitHub uzerinden bulusturur:

```text
Sirket PC -> Jira REST -> GitHub jira-live/state.json
Mac mini app -> GitHub state -> MongoDB -> browser UI
```

GitHub Actions runner CI icin kalir. Realtime benzeri akis icin uzun calisan iki process kullanilir.

## Sirket PC: Jira Publisher

Sirket PC Jira'ya erisebildigi icin bu process orada calisir.

```powershell
cd C:\Users\TCATAKSOY\actions-runner\_work\ifts-hackathon\ifts-hackathon
copy integrations\jira\live_bridge\.env.company-pc.example integrations\jira\live_bridge\.env.company-pc
notepad integrations\jira\live_bridge\.env.company-pc
py -3 integrations\jira\live_bridge\jira_to_github_state.py --interval 10
```

Gerekli secret'lar:

- `JIRA_TOKEN`: Jira token
- `GITHUB_TOKEN`: GitHub fine-grained token, repository contents read/write yetkili

Publisher sadece issue payload'i degisince `jira-live` branch'indeki `jira-live/state.json` dosyasini gunceller.

Tek seferlik test:

```powershell
py -3 integrations\jira\live_bridge\jira_to_github_state.py --once
```

## Mac Mini: Mongo Ingest + UI

Mac mini GitHub state dosyasini okur, MongoDB'ye upsert eder ve UI'i sunar.

```bash
cd /Users/hackathon/actions-runner/_work/ifts-hackathon/ifts-hackathon
cp integrations/jira/live_bridge/.env.mac-mini.example integrations/jira/live_bridge/.env.mac-mini
chmod 600 integrations/jira/live_bridge/.env.mac-mini
.venv/bin/pip install -r integrations/jira/live_bridge/requirements.txt
.venv/bin/python integrations/jira/live_bridge/github_to_mongo_app.py
```

UI:

```text
http://localhost:8088
```

Tek seferlik ingest testi:

```bash
.venv/bin/python integrations/jira/live_bridge/github_to_mongo_app.py --once
```

## Notlar

- Bu cozum direkt network gerektirmez; iki tarafin GitHub'a outbound erisimi yeterlidir.
- UI sayfa yenilenmeden Server-Sent Events ile guncellenir.
- Mongo collection default: `hackathon.jira_issues`.
- Current Docker MongoDB auth ister. `MONGO_URI` degerini `authSource=admin` ile tanimlayin.
- GitHub'a her poll'de commit atilmaz; payload degismediyse publish atlanir.
