import { createApp } from "./app.js";
import { loadConfig } from "./shared/config.js";

const config = loadConfig();
const app = await createApp(config);

const server = app.listen(config.PORT, () => {
  console.log(`module1-advisor listening on :${config.PORT}`);
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  console.log(`module1-advisor shutting down on ${signal}`);

  app.locals.catalogScheduler?.stop?.();
  await Promise.allSettled([
    app.locals.catalogRepositories?.close?.(),
    app.locals.userRepository?.close?.(),
    app.locals.blockagePatternRepository?.close?.(),
    app.locals.blockageRecommendationRepository?.close?.()
  ]);

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void shutdown(signal)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("module1-advisor shutdown failed", error);
        process.exit(1);
      });
  });
}
