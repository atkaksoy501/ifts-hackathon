# Dependency Graph

## Most Imported Files (change these carefully)

- `app\backend\src\shared\http.ts` — imported by **6** files
- `app\backend\src\shared\config.ts` — imported by **5** files
- `app\frontend\src\shared\lib\cn.ts` — imported by **5** files
- `app\backend\src\contexts\predictive-sizing\sizing.engine.ts` — imported by **3** files
- `app\backend\src\app.ts` — imported by **2** files
- `app\backend\src\contexts\blockage-advisory\blockage.service.ts` — imported by **2** files
- `app\backend\src\contexts\identity\identity.service.ts` — imported by **2** files
- `app\backend\src\contexts\ingestion\catalog.service.ts` — imported by **2** files
- `app\frontend\src\features\delivery\DeliveryDashboard.tsx` — imported by **2** files
- `app\backend\src\routes.ts` — imported by **1** files
- `app\backend\src\shared\auth.ts` — imported by **1** files
- `app\frontend\src\shared\ui\badge.tsx` — imported by **1** files
- `app\frontend\src\shared\ui\button.tsx` — imported by **1** files
- `app\frontend\src\shared\ui\card.tsx` — imported by **1** files
- `app\frontend\src\shared\ui\input.tsx` — imported by **1** files
- `app\frontend\src\shared\ui\tabs.tsx` — imported by **1** files
- `app\frontend\src\features\delivery\mockData.ts` — imported by **1** files
- `app\frontend\src\features\delivery\dictionary.ts` — imported by **1** files
- `app\frontend\src\app\App.tsx` — imported by **1** files
- `app\frontend\src\shared\api\client.ts` — imported by **1** files

## Import Map (who imports what)

- `app\backend\src\shared\http.ts` ← `app\backend\src\app.ts`, `app\backend\src\contexts\blockage-advisory\blockage.service.ts`, `app\backend\src\contexts\identity\identity.service.ts`, `app\backend\src\contexts\ingestion\catalog.service.ts`, `app\backend\src\routes.ts` +1 more
- `app\backend\src\shared\config.ts` ← `app\backend\src\app.integration.test.ts`, `app\backend\src\app.ts`, `app\backend\src\routes.ts`, `app\backend\src\server.ts`, `app\backend\src\shared\auth.ts`
- `app\frontend\src\shared\lib\cn.ts` ← `app\frontend\src\shared\ui\badge.tsx`, `app\frontend\src\shared\ui\button.tsx`, `app\frontend\src\shared\ui\card.tsx`, `app\frontend\src\shared\ui\input.tsx`, `app\frontend\src\shared\ui\tabs.tsx`
- `app\backend\src\contexts\predictive-sizing\sizing.engine.ts` ← `app\backend\src\app.ts`, `app\backend\src\contexts\predictive-sizing\sizing.engine.unit.test.ts`, `app\backend\src\routes.ts`
- `app\backend\src\app.ts` ← `app\backend\src\app.integration.test.ts`, `app\backend\src\server.ts`
- `app\backend\src\contexts\blockage-advisory\blockage.service.ts` ← `app\backend\src\app.ts`, `app\backend\src\routes.ts`
- `app\backend\src\contexts\identity\identity.service.ts` ← `app\backend\src\app.ts`, `app\backend\src\routes.ts`
- `app\backend\src\contexts\ingestion\catalog.service.ts` ← `app\backend\src\app.ts`, `app\backend\src\routes.ts`
- `app\frontend\src\features\delivery\DeliveryDashboard.tsx` ← `app\frontend\src\app\App.tsx`, `app\frontend\src\features\delivery\DeliveryDashboard.test.tsx`
- `app\backend\src\routes.ts` ← `app\backend\src\app.ts`
