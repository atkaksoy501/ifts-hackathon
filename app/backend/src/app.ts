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
import {
  FetchGitHubStateClient,
  GitHubContentsStateClient,
  type GitHubStateClient
} from "./contexts/ingestion/github-state.client.js";
import { MongoCatalogRepositories } from "./contexts/ingestion/mongo.repositories.js";
import { InMemoryCatalogRepositories, type CatalogRepositories } from "./contexts/ingestion/repositories.js";
import { SyncScheduler } from "./contexts/ingestion/sync.scheduler.js";
import { SizingEngine } from "./contexts/predictive-sizing/sizing.engine.js";
import { DecompositionService } from "./contexts/task-planning/decomposition.service.js";
import { PlanningInputService } from "./contexts/task-planning/planning.service.js";
import {
  InMemoryDecompositionRunRepository,
  InMemoryPlanningInputRepository,
  type DecompositionRunRepository,
  type PlanningInputRepository
} from "./contexts/task-planning/repositories.js";
import { createApiRouter } from "./routes.js";
import { loadConfig, type AppConfig } from "./shared/config.js";
import { correlationIdMiddleware, errorHandler } from "./shared/http.js";

type CreateAppOptions = {
  catalogRepositories?: CatalogRepositories;
  githubStateClient?: GitHubStateClient;
  userRepository?: UserRepository;
  blockagePatternRepository?: BlockagePatternRepository;
  blockageRecommendationRepository?: BlockageRecommendationRepository;
  planningInputRepository?: PlanningInputRepository;
  decompositionRunRepository?: DecompositionRunRepository;
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
    options.githubStateClient ?? createGitHubStateClient(config),
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
  const planningInputRepository = options.planningInputRepository ?? new InMemoryPlanningInputRepository();
  const decompositionRunRepository = options.decompositionRunRepository ?? new InMemoryDecompositionRunRepository();
  const planningInputs = new PlanningInputService(planningInputRepository, catalog);
  const decompositions = new DecompositionService(planningInputs, decompositionRunRepository);
  app.locals.planningInputRepository = planningInputRepository;
  app.locals.decompositionRunRepository = decompositionRunRepository;

  app.use(
    "/api",
    createApiRouter(config, {
      identity,
      catalog,
      sizing: new SizingEngine({ hoursPerStoryPoint: config.HOURS_PER_STORY_POINT }),
      blockage: new BlockageService(blockagePatternRepository, blockageRecommendationRepository),
      planningInputs,
      decompositions
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
  if (config.NODE_ENV === "test" || config.CATALOG_STORE === "memory" || !config.MONGO_URI) {
    const seed = config.NODE_ENV === "production" ? undefined : createDemoCatalogSeed(config.DEFAULT_PROJECT_KEY);
    return new InMemoryCatalogRepositories(seed);
  }

  return new MongoCatalogRepositories(config.MONGO_URI, config.MONGO_DB_NAME);
}

function createUserRepository(config: AppConfig): UserRepository {
  if (config.NODE_ENV === "test" || config.CATALOG_STORE === "memory" || !config.MONGO_URI) {
    return new InMemoryUserRepository();
  }

  return new MongoUserRepository(config.MONGO_URI, config.MONGO_DB_NAME);
}

function createGitHubStateClient(config: AppConfig): GitHubStateClient {
  if (config.GITHUB_STATE_REPOSITORY) {
    return new GitHubContentsStateClient(
      config.GITHUB_STATE_REPOSITORY,
      config.GITHUB_STATE_BRANCH,
      config.GITHUB_STATE_PATH,
      config.GITHUB_STATE_TIMEOUT_MS,
      config.GITHUB_TOKEN
    );
  }

  if (!config.GITHUB_STATE_URL) {
    throw new Error("GitHub state source is not configured. Set GITHUB_STATE_REPOSITORY or GITHUB_STATE_URL.");
  }

  return new FetchGitHubStateClient(config.GITHUB_STATE_URL, config.GITHUB_STATE_TIMEOUT_MS, config.GITHUB_TOKEN);
}

function createBlockagePatternRepository(config: AppConfig): BlockagePatternRepository {
  if (config.NODE_ENV === "test" || config.CATALOG_STORE === "memory" || !config.MONGO_URI) {
    return new InMemoryBlockagePatternRepository();
  }

  return new MongoBlockagePatternRepository(config.MONGO_URI, config.MONGO_DB_NAME);
}

function createBlockageRecommendationRepository(config: AppConfig): BlockageRecommendationRepository {
  if (config.NODE_ENV === "test" || config.CATALOG_STORE === "memory" || !config.MONGO_URI) {
    return new InMemoryBlockageRecommendationRepository();
  }

  return new MongoBlockageRecommendationRepository(config.MONGO_URI, config.MONGO_DB_NAME);
}
