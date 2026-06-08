import {
  adminUserResponseSchema,
  adminUsersResponseSchema,
  authUserResponseSchema,
  backlogQuerySchema,
  backlogResponseSchema,
  blockagePatternResponseSchema,
  blockagePatternsResponseSchema,
  blockageRecommendResponseSchema,
  blockageRecommendRequestSchema,
  createBlockagePatternRequestSchema,
  createUserRequestSchema,
  loginRequestSchema,
  pathIdParamsSchema,
  patchBlockagePatternRequestSchema,
  patchUserRequestSchema,
  sizingRecommendRequestSchema,
  sizingRecommendResponseSchema,
  sprintHistoryQuerySchema,
  sprintHistoryResponseSchema,
  syncRunResponseSchema,
  syncStatusResponseSchema
} from "@module1/contracts";
import type { z } from "zod";
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
    response.locals.user = await services.identity.getSessionUser(claims.sub);
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
      json(response, authUserResponseSchema, { user });
    })
  );

  router.post("/auth/logout", (_request, response) => {
    clearSessionCookie(response, config);
    response.status(204).send();
  });

  router.get("/auth/me", requireSession, (_request, response) => {
    json(response, authUserResponseSchema, { user: sessionUser(response) });
  });

  router.get(
    "/admin/users",
    requireSession,
    requireAdmin,
    asyncHandler(async (_request, response) => {
      json(response, adminUsersResponseSchema, { users: await services.identity.listUsers() });
    })
  );

  router.post(
    "/admin/users",
    requireSession,
    requireAdmin,
    asyncHandler(async (request, response) => {
      const body = createUserRequestSchema.parse(request.body);
      const user = await services.identity.createUser(body);
      json(response.status(201), adminUserResponseSchema, { user });
    })
  );

  router.patch(
    "/admin/users/:id",
    requireSession,
    requireAdmin,
    asyncHandler(async (request, response) => {
      const params = pathIdParamsSchema.parse(request.params);
      const body = patchUserRequestSchema.parse(request.body);
      const user = await services.identity.patchUser(params.id, body);
      json(response, adminUserResponseSchema, { user });
    })
  );

  router.get(
    "/sync/status",
    requireSession,
    asyncHandler(async (_request, response) => {
      json(response, syncStatusResponseSchema, await services.catalog.getSyncStatus());
    })
  );

  router.post(
    "/sync/github/run",
    requireSession,
    requireAdmin,
    asyncHandler(async (_request, response) => {
      json(response, syncRunResponseSchema, await services.catalog.runManualSync());
    })
  );

  router.get(
    "/backlog",
    requireSession,
    asyncHandler(async (request, response) => {
      const query = backlogQuerySchema.parse(request.query);
      const projectKey = query.projectKey ?? config.DEFAULT_PROJECT_KEY;
      const backlogQuery = { projectKey };
      withOptional(backlogQuery, "issueType", query.issueType);
      withOptional(backlogQuery, "statusCategory", query.statusCategory);
      withOptional(backlogQuery, "label", query.label);
      withOptional(backlogQuery, "component", query.component);
      withOptional(backlogQuery, "search", query.search);
      withOptional(backlogQuery, "page", query.page);
      withOptional(backlogQuery, "pageSize", query.pageSize);
      json(response, backlogResponseSchema, await services.catalog.listBacklog(backlogQuery));
    })
  );

  router.get(
    "/sprints/history",
    requireSession,
    asyncHandler(async (request, response) => {
      const query = sprintHistoryQuerySchema.parse(request.query);
      const projectKey = query.projectKey ?? config.DEFAULT_PROJECT_KEY;
      json(response, sprintHistoryResponseSchema, await services.catalog.listClosedSprints(projectKey, query.limit));
    })
  );

  router.post("/sizing/recommend", requireSession, asyncHandler(async (request, response) => {
    const body = sizingRecommendRequestSchema.parse(request.body);
    const target = await services.catalog.getIssue(body.issueKey, body.projectKey);
    const historical = await services.catalog.findHistoricalIssues(target.projectKey);
    json(response, sizingRecommendResponseSchema, services.sizing.recommend(target, historical, body.neighborLimit));
  }));

  router.post("/blockage/recommend", requireSession, asyncHandler(async (request, response) => {
    const body = blockageRecommendRequestSchema.parse(request.body);
    const issue = body.issueKey ? await services.catalog.getIssue(body.issueKey, body.projectKey) : undefined;
    const inputText = body.inputText ?? `${issue?.summary ?? ""}\n${issue?.description ?? ""}`;
    const jiraExamples = await services.catalog.findHistoricalIssues(issue?.projectKey ?? body.projectKey ?? config.DEFAULT_PROJECT_KEY);
    json(
      response,
      blockageRecommendResponseSchema,
      services.blockage.recommend(inputText, {
        ...(issue ? { issue } : {}),
        jiraExamples,
        ...(body.maxActions === undefined ? {} : { maxActions: body.maxActions })
      })
    );
  }));

  router.get("/admin/blockage-patterns", requireSession, requireAdmin, (_request, response) => {
    json(response, blockagePatternsResponseSchema, { patterns: services.blockage.listPatterns() });
  });

  router.post("/admin/blockage-patterns", requireSession, requireAdmin, (request, response) => {
    const body = createBlockagePatternRequestSchema.parse(request.body);
    json(response.status(201), blockagePatternResponseSchema, { pattern: services.blockage.createPattern(body) });
  });

  router.patch("/admin/blockage-patterns/:id", requireSession, requireAdmin, (request, response) => {
    const params = pathIdParamsSchema.parse(request.params);
    const body = patchBlockagePatternRequestSchema.parse(request.body);
    json(response, blockagePatternResponseSchema, { pattern: services.blockage.patchPattern(params.id, body) });
  });

  return router;
}

function sessionUser(response: Response) {
  return response.locals.user as { id: string; username: string; role: "user" | "admin"; active: boolean };
}

function json<T extends z.ZodTypeAny>(response: Response, schema: T, body: z.infer<T>) {
  response.json(schema.parse(body));
}

function withOptional<T extends object, K extends string, V>(target: T, key: K, value: V | undefined): asserts target is T & Record<K, V> {
  if (value !== undefined) {
    Object.assign(target, { [key]: value });
  }
}
