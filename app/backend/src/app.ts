import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { BlockageService } from "./contexts/blockage-advisory/blockage.service.js";
import { IdentityService } from "./contexts/identity/identity.service.js";
import { CatalogService } from "./contexts/ingestion/catalog.service.js";
import { SizingEngine } from "./contexts/predictive-sizing/sizing.engine.js";
import { createApiRouter } from "./routes.js";
import { loadConfig, type AppConfig } from "./shared/config.js";
import { errorHandler } from "./shared/http.js";

export async function createApp(config: AppConfig = loadConfig()) {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.FRONTEND_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/healthz", (_request, response) => {
    response.json({ ok: true, service: "module1-advisor" });
  });

  const identity = await IdentityService.create({
    username: config.ADMIN_USERNAME,
    password: config.ADMIN_PASSWORD,
    displayName: config.ADMIN_DISPLAY_NAME
  });

  app.use(
    "/api",
    createApiRouter(config, {
      identity,
      catalog: new CatalogService(config.DEFAULT_PROJECT_KEY),
      sizing: new SizingEngine({ hoursPerStoryPoint: config.HOURS_PER_STORY_POINT }),
      blockage: new BlockageService()
    })
  );

  const frontendDist = path.resolve(process.cwd(), config.FRONTEND_DIST);
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get("*", (_request, response) => response.sendFile(path.join(frontendDist, "index.html")));
  }

  app.use(errorHandler);
  return app;
}
