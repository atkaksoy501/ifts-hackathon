import {
  blockageRecommendRequestSchema,
  createBlockagePatternRequestSchema,
  createUserRequestSchema,
  loginRequestSchema,
  patchBlockagePatternRequestSchema,
  patchUserRequestSchema,
  sizingRecommendRequestSchema
} from "@module1/contracts";
import { Router } from "express";
import type { Response } from "express";
import type { AppConfig } from "./shared/config.js";
import { clearSessionCookie, readSession, setSessionCookie, signSession } from "./shared/auth.js";
import { ApiError, asyncHandler } from "./shared/http.js";
import type { IdentityService } from "./contexts/identity/identity.service.js";
import type { CatalogService } from "./contexts/ingestion/catalog.service.js";
import type { SizingEngine } from "./contexts/predictive-sizing/sizing.engine.js";
import type { BlockageService } from "./contexts/blockage-advisory/blockage.service.js";

type Services = {
  identity: IdentityService;
  catalog: CatalogService;
  sizing: SizingEngine;
  blockage: BlockageService;
};

export function createApiRouter(config: AppConfig, services: Services) {
  const router = Router();

  const requireSession = asyncHandler(async (request, response, next) => {
    const claims = readSession(request.cookies?.[config.JWT_COOKIE_NAME], config);
    response.locals.user = services.identity.getSessionUser(claims.sub);
    next();
  });

  const requireAdmin = asyncHandler(async (_request, response, next) => {
    const user = sessionUser(response);
    if (user.role !== "admin") {
      throw new ApiError(403, "FORBIDDEN", "Admin role is required.");
    }
    next();
  });

  router.post(
    "/auth/login",
    asyncHandler(async (request, response) => {
      const body = loginRequestSchema.parse(request.body);
      const user = await services.identity.login(body.username, body.password);
      setSessionCookie(response, signSession(user, config), config);
      response.json({ user });
    })
  );

  router.post("/auth/logout", (_request, response) => {
    clearSessionCookie(response, config);
    response.status(204).send();
  });

  router.get("/auth/me", requireSession, (_request, response) => {
    response.json({ user: sessionUser(response) });
  });

  router.get("/admin/users", requireSession, requireAdmin, (_request, response) => {
    response.json({ users: services.identity.listUsers() });
  });

  router.post(
    "/admin/users",
    requireSession,
    requireAdmin,
    asyncHandler(async (request, response) => {
      const body = createUserRequestSchema.parse(request.body);
      const user = await services.identity.createUser(body);
      response.status(201).json({ user });
    })
  );

  router.patch(
    "/admin/users/:id",
    requireSession,
    requireAdmin,
    asyncHandler(async (request, response) => {
      const body = patchUserRequestSchema.parse(request.body);
      const user = await services.identity.patchUser(pathParam(request.params.id), body);
      response.json({ user });
    })
  );

  router.get("/sync/status", requireSession, (_request, response) => {
    response.json(services.catalog.getSyncStatus());
  });

  router.post("/sync/github/run", requireSession, requireAdmin, (_request, response) => {
    response.json(services.catalog.runManualSync());
  });

  router.get("/backlog", requireSession, (request, response) => {
    const projectKey = String(request.query.projectKey ?? config.DEFAULT_PROJECT_KEY);
    const backlogQuery = { projectKey };
    withOptional(backlogQuery, "issueType", stringQuery(request.query.issueType));
    withOptional(backlogQuery, "statusCategory", stringQuery(request.query.statusCategory));
    withOptional(backlogQuery, "label", stringQuery(request.query.label));
    withOptional(backlogQuery, "component", stringQuery(request.query.component));
    withOptional(backlogQuery, "search", stringQuery(request.query.search));
    withOptional(backlogQuery, "page", numberQuery(request.query.page));
    withOptional(backlogQuery, "pageSize", numberQuery(request.query.pageSize));
    response.json(services.catalog.listBacklog(backlogQuery));
  });

  router.get("/sprints/history", requireSession, (request, response) => {
    const projectKey = String(request.query.projectKey ?? config.DEFAULT_PROJECT_KEY);
    response.json(services.catalog.listClosedSprints(projectKey, numberQuery(request.query.limit)));
  });

  router.post("/sizing/recommend", requireSession, (request, response) => {
    const body = sizingRecommendRequestSchema.parse(request.body);
    const target = services.catalog.getIssue(body.issueKey, body.projectKey);
    const historical = services.catalog.findHistoricalIssues(target.projectKey);
    response.json(services.sizing.recommend(target, historical, body.neighborLimit));
  });

  router.post("/blockage/recommend", requireSession, (request, response) => {
    const body = blockageRecommendRequestSchema.parse(request.body);
    const issue = body.issueKey ? services.catalog.getIssue(body.issueKey, body.projectKey) : undefined;
    const inputText = body.inputText ?? `${issue?.summary ?? ""}\n${issue?.description ?? ""}`;
    response.json(
      services.blockage.recommend(inputText, {
        ...(issue ? { issue } : {}),
        ...(body.maxActions === undefined ? {} : { maxActions: body.maxActions })
      })
    );
  });

  router.get("/admin/blockage-patterns", requireSession, requireAdmin, (_request, response) => {
    response.json({ patterns: services.blockage.listPatterns() });
  });

  router.post("/admin/blockage-patterns", requireSession, requireAdmin, (request, response) => {
    const body = createBlockagePatternRequestSchema.parse(request.body);
    response.status(201).json({ pattern: services.blockage.createPattern(body) });
  });

  router.patch("/admin/blockage-patterns/:id", requireSession, requireAdmin, (request, response) => {
    const body = patchBlockagePatternRequestSchema.parse(request.body);
    response.json({ pattern: services.blockage.patchPattern(pathParam(request.params.id), body) });
  });

  return router;
}

function sessionUser(response: Response) {
  return response.locals.user as { id: string; username: string; role: "user" | "admin"; active: boolean };
}

function stringQuery(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberQuery(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function pathParam(value: string | undefined): string {
  if (!value) {
    throw new ApiError(400, "INVALID_REQUEST", "Path parameter is missing.");
  }

  return value;
}

function withOptional<T extends object, K extends string, V>(target: T, key: K, value: V | undefined): asserts target is T & Record<K, V> {
  if (value !== undefined) {
    Object.assign(target, { [key]: value });
  }
}
