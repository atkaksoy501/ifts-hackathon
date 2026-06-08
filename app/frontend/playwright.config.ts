import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command:
      "../node_modules/.bin/concurrently -k -n backend,frontend \"CATALOG_STORE=memory SYNC_DISABLED=true SYNC_STARTUP_ENABLED=false pnpm --dir .. --filter @module1/backend dev\" \"pnpm --dir .. --filter @module1/frontend dev\"",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } }
  ]
});
