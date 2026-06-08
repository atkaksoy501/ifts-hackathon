import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { healthResponseSchema } from "@module1/contracts";
import {
  BlockageService,
  InMemoryBlockagePatternRepository,
  InMemoryBlockageRecommendationRepository,
  MongoBlockagePatternRepository,
  MongoBlockageRecommendationRepository,
  type BlockagePatternRepository,
  type BlockageRecommendationRepository
} from "./contexts/blockage-advisory/blockage.service.js";
import { IdentityService } from "./contexts/identity/identity.service.js";
import { InMemoryUserRepository, MongoUserRepository, type UserRepository } from "./contexts/identity/user.repository.js";
import { CatalogService, createDemoCatalogSeed } from "./contexts/ingestion/catalog.service.js";
import { FetchGitHubStateClient, type GitHubStateClient } from "./contexts/ingestion/github-state.client.js";
import { MongoCatalogRepositories } from "./contexts/ingestion/mongo.repositories.js";
import { InMemoryCatalogRepositories, type CatalogRepositories } from "./contexts/ingestion/repositories.js";
import { SyncScheduler } from "./contexts/ingestion/sync.scheduler.js";
import { SizingEngine } from "./contexts/predictive-sizing/sizing.engine.js";
import { createApiRouter } from "./routes.js";
import { loadConfig, type AppConfig } from "./shared/config.js";
import { correlationIdMiddleware, errorHandler } from "./shared/http.js";

type CreateAppOptions = {
  catalogRepositories?: CatalogRepositories;
  githubStateClient?: GitHubStateClient;
  userRepository?: UserRepository;
  blockagePatternRepository?: BlockagePatternRepository;
  blockageRecommendationRepository?: BlockageRecommendationRepository;
};

export async function createApp(config: AppConfig = loadConfig(), options: CreateAppOptions = {}) {
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
  app.use(correlationIdMiddleware);

  app.get("/healthz", (_request, response) => {
    response.json(healthResponseSchema.parse({ ok: true, service: "module1-advisor" }));
  });

  const userRepository = options.userRepository ?? createUserRepository(config);
  await userRepository.ensureReady?.();
  const identity = await IdentityService.create(
    {
      username: config.ADMIN_USERNAME,
      password: config.ADMIN_PASSWORD,
      displayName: config.ADMIN_DISPLAY_NAME
    },
    userRepository
  );
  const catalogRepositories = options.catalogRepositories ?? createCatalogRepositories(config);
  await catalogRepositories.ensureReady?.();
  const catalog = new CatalogService(
    catalogRepositories,
    options.githubStateClient ?? new FetchGitHubStateClient(config.GITHUB_STATE_URL, config.GITHUB_STATE_TIMEOUT_MS),
    config.DEFAULT_PROJECT_KEY
  );
  const scheduler = new SyncScheduler(catalog, {
    disabled: config.SYNC_DISABLED || config.NODE_ENV === "test",
    startupEnabled: config.SYNC_STARTUP_ENABLED,
    intervalMs: config.SYNC_INTERVAL_MS
  });
  scheduler.start();
  app.locals.catalogScheduler = scheduler;
  app.locals.catalogRepositories = catalogRepositories;
  app.locals.userRepository = userRepository;
  const blockagePatternRepository = options.blockagePatternRepository ?? createBlockagePatternRepository(config);
  const blockageRecommendationRepository = options.blockageRecommendationRepository ?? createBlockageRecommendationRepository(config);
  await Promise.all([blockagePatternRepository.ensureReady?.(), blockageRecommendationRepository.ensureReady?.()]);
  app.locals.blockagePatternRepository = blockagePatternRepository;
  app.locals.blockageRecommendationRepository = blockageRecommendationRepository;

  app.use(
    "/api",
    createApiRouter(config, {
      identity,
      catalog,
      sizing: new SizingEngine({ hoursPerStoryPoint: config.HOURS_PER_STORY_POINT }),
      blockage: new BlockageService(blockagePatternRepository, blockageRecommendationRepository)
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

function createCatalogRepositories(config: AppConfig): CatalogRepositories {
  if (config.NODE_ENV === "test" || config.CATALOG_STORE === "memory") {
    const seed = config.NODE_ENV === "production" ? undefined : createDemoCatalogSeed(config.DEFAULT_PROJECT_KEY);
    return new InMemoryCatalogRepositories(seed);
  }

  return new MongoCatalogRepositories(config.MONGO_URI, config.MONGO_DB_NAME);
}

function createUserRepository(config: AppConfig): UserRepository {
  if (config.NODE_ENV === "test" || config.CATALOG_STORE === "memory") {
    return new InMemoryUserRepository();
  }

  return new MongoUserRepository(config.MONGO_URI, config.MONGO_DB_NAME);
}

function createBlockagePatternRepository(config: AppConfig): BlockagePatternRepository {
  if (config.NODE_ENV === "test" || config.CATALOG_STORE === "memory") {
    return new InMemoryBlockagePatternRepository();
  }

  return new MongoBlockagePatternRepository(config.MONGO_URI, config.MONGO_DB_NAME);
}

function createBlockageRecommendationRepository(config: AppConfig): BlockageRecommendationRepository {
  if (config.NODE_ENV === "test" || config.CATALOG_STORE === "memory") {
    return new InMemoryBlockageRecommendationRepository();
  }

  return new MongoBlockageRecommendationRepository(config.MONGO_URI, config.MONGO_DB_NAME);
}
