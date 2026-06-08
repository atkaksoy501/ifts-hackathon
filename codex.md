# Project Context

This is a typescript project using express.
It is a monorepo with workspaces: predictive-sizing-blockage-advisor (app), @module1/backend (app\backend), @module1/frontend (app\frontend), @module1/contracts (app\shared).

The API has 17 routes. See .codesight/routes.md for the full route map with methods, paths, and tags.
The UI has 2 components. See .codesight/components.md for the full list with props.
Middleware includes: auth, cors, error-handler.

High-impact files (most imported, changes here affect many other files):
- app\backend\src\shared\http.ts (imported by 6 files)
- app\backend\src\shared\config.ts (imported by 5 files)
- app\frontend\src\shared\lib\cn.ts (imported by 5 files)
- app\backend\src\contexts\predictive-sizing\sizing.engine.ts (imported by 3 files)
- app\backend\src\app.ts (imported by 2 files)
- app\backend\src\contexts\blockage-advisory\blockage.service.ts (imported by 2 files)
- app\backend\src\contexts\identity\identity.service.ts (imported by 2 files)
- app\backend\src\contexts\ingestion\catalog.service.ts (imported by 2 files)

Required environment variables (no defaults):
- JIRA_API_VERSION (integrations\jira\jira_smoke_test.py)
- JIRA_CA_BUNDLE (integrations\jira\.env.example)
- JIRA_PROJECT_KEY (integrations\jira\.env.example)
- JIRA_USERNAME (integrations\jira\.env.example)

Read .codesight/wiki/index.md for orientation (WHERE things live). Then read actual source files before implementing. Wiki articles are navigation aids, not implementation guides.
Read .codesight/CODESIGHT.md for the complete AI context map including all routes, schema, components, libraries, config, middleware, and dependency graph.
