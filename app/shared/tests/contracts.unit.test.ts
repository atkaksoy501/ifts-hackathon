import { describe, expect, it } from "vitest";
import {
  adminUserResponseSchema,
  adminUsersResponseSchema,
  authUserResponseSchema,
  backlogQuerySchema,
  backlogResponseSchema,
  blockagePatternResponseSchema,
  blockagePatternsResponseSchema,
  blockageRecommendRequestSchema,
  blockageRecommendResponseSchema,
  createBlockagePatternRequestSchema,
  createUserRequestSchema,
  healthResponseSchema,
  loginRequestSchema,
  patchBlockagePatternRequestSchema,
  patchUserRequestSchema,
  reviewableSprintsResponseSchema,
  sizingRecommendRequestSchema,
  sizingRecommendResponseSchema,
  sprintHistoryQuerySchema,
  sprintHistoryResponseSchema,
  sprintDemoReportResponseSchema,
  sprintEvidenceResponseSchema,
  varianceAnalyticsQuerySchema,
  varianceAnalyticsResponseSchema,
  syncRunResponseSchema,
  syncStatusResponseSchema,
  sizingRecommendationSchema,
  userRoleSchema
} from "../src/index.js";

describe("contracts", () => {
  it("keeps confidence values inside 0..1", () => {
    expect(() =>
      sizingRecommendationSchema.parse({
        id: "rec-1",
        issueKey: "ICTFT-1",
        storyPoints: 5,
        idealHours: 30,
        confidence: 1.1,
        confidenceBreakdown: {
          similarity: 1,
          neighborCount: 1,
          dataCompleteness: 1,
          variance: 0
        },
        warnings: [],
        similarIssues: [],
        rationale: "Historical issues are similar.",
        createdAt: new Date().toISOString()
      })
    ).toThrow();
  });

  it("requires issue key or input text for blockage requests", () => {
    expect(blockageRecommendRequestSchema.safeParse({}).success).toBe(false);
    expect(blockageRecommendRequestSchema.safeParse({ inputText: "blocked by dependency" }).success).toBe(true);
  });

  it("defines request schemas for every mutating API route", () => {
    expect(loginRequestSchema.safeParse({ username: "admin", password: "admin12345" }).success).toBe(true);
    expect(createUserRequestSchema.safeParse({ username: "dev", password: "pass12345", role: "user" }).success).toBe(true);
    expect(patchUserRequestSchema.safeParse({ active: false }).success).toBe(true);
    expect(sizingRecommendRequestSchema.safeParse({ issueKey: "ICTFT-201", neighborLimit: 3 }).success).toBe(true);
    expect(blockageRecommendRequestSchema.safeParse({ issueKey: "ICTFT-201" }).success).toBe(true);
    expect(
      createBlockagePatternRequestSchema.safeParse({
        name: "Dependency wait",
        keywords: ["blocked"],
        actions: ["Set owner and due date."]
      }).success
    ).toBe(true);
    expect(patchBlockagePatternRequestSchema.safeParse({ active: false }).success).toBe(true);
  });

  it("supports module 3 manager role and analytics query invariants", () => {
    expect(userRoleSchema.safeParse("manager").success).toBe(true);
    expect(varianceAnalyticsQuerySchema.parse({ sprintId: "sprint-1", trendWindow: "6" })).toMatchObject({ trendWindow: 6 });
    expect(varianceAnalyticsQuerySchema.safeParse({ sprintId: "sprint-1", trendWindow: "13" }).success).toBe(false);
  });

  it("normalizes query schemas for backlog and sprint history routes", () => {
    expect(backlogQuerySchema.parse({ projectKey: "ICTFT", page: "2", pageSize: "10" })).toMatchObject({
      projectKey: "ICTFT",
      page: 2,
      pageSize: 10
    });
    expect(sprintHistoryQuerySchema.parse({ limit: "3" })).toMatchObject({ limit: 3 });
    expect(backlogQuerySchema.safeParse({ page: "not-a-number" }).success).toBe(false);
  });

  it("defines response schemas for every API route", () => {
    const now = new Date().toISOString();
    const sessionUser = { id: "u-1", username: "admin", displayName: "Admin", role: "admin", active: true };
    const account = { ...sessionUser, createdAt: now, updatedAt: now };
    const issue = {
      key: "ICTFT-201",
      projectKey: "ICTFT",
      summary: "Show sizing recommendation",
      sprintIds: [],
      labels: ["sizing"],
      components: ["recommendation"]
    };
    const sprint = { id: "sprint-1", name: "Sprint 1", state: "closed", projectKey: "ICTFT" };
    const warning = { code: "LOW_DATA", message: "Sparse data.", severity: "warning" };
    const syncRun = {
      id: "sync-1",
      source: "github-state",
      status: "warning",
      startedAt: now,
      completedAt: now,
      issueUpserts: 1,
      sprintUpserts: 1,
      fieldMappingUpserts: 1,
      warnings: [warning]
    };
    const sizing = {
      id: "rec-1",
      issueKey: "ICTFT-201",
      storyPoints: 5,
      idealHours: 30,
      confidence: 0.8,
      confidenceBreakdown: { similarity: 0.8, neighborCount: 1, dataCompleteness: 1, variance: 0.7 },
      warnings: [],
      similarIssues: [],
      rationale: "Historical issues are similar.",
      createdAt: now
    };
    const blockage = {
      id: "blk-1",
      issueKey: "ICTFT-201",
      inputText: "blocked by dependency",
      actions: ["Set owner and due date."],
      confidence: 0.75,
      evidence: ["Pattern: Dependency wait"],
      warnings: [],
      createdAt: now
    };
    const pattern = {
      id: "pat-1",
      name: "Dependency wait",
      keywords: ["blocked"],
      componentHints: ["integration"],
      actions: ["Set owner and due date."],
      active: true,
      createdAt: now,
      updatedAt: now
    };
    const sourceRef = { sourceType: "jira-snapshot", externalId: "sprint-1", capturedAt: now };
    const reviewSprint = {
      ...sprint,
      evidenceStatus: "ready",
      reportCount: 1,
      latestReportId: "report-1",
      sourceRefs: [sourceRef],
      warnings: []
    };
    const evidence = {
      id: "evidence-1",
      sprint: reviewSprint,
      snapshots: [],
      completedItems: [],
      incompleteItems: [],
      removedItems: [],
      pullRequests: [],
      commits: [],
      closingRemarks: [],
      unmatchedEvidence: [],
      warnings: [],
      generatedAt: now
    };
    const report = {
      id: "report-1",
      sprintId: "sprint-1",
      projectKey: "ICTFT",
      version: 1,
      title: "Sprint 1 Sprint Demo Raporu",
      language: "tr",
      provider: { name: "heuristic", promptVersion: "heuristic-tr-v1", fallbackUsed: false, anonymized: false },
      sections: [{ key: "executive-summary", title: "Yonetici Ozeti", items: ["Bir is tamamlandi."] }],
      source: { evidenceSetId: "evidence-1", remarkIds: [], sourceRefs: [sourceRef] },
      markdown: "# Sprint 1",
      warnings: [],
      createdBy: "u-1",
      createdAt: now
    };
    const variance = {
      id: "variance-1",
      projectKey: "ICTFT",
      sprintId: "sprint-1",
      trendWindow: 6,
      baselines: { startSnapshotId: "start", closeSnapshotId: "close" },
      storyPoints: { planned: 5, actual: 5, delta: 0, deltaPercent: 0, direction: "on-track", usedFallback: false },
      hours: { planned: 30, actual: 30, delta: 0, deltaPercent: 0, direction: "on-track", usedFallback: false },
      velocityTrend: [],
      bottlenecks: [],
      warnings: [],
      computedAt: now
    };

    expect(healthResponseSchema.safeParse({ ok: true, service: "module1-advisor" }).success).toBe(true);
    expect(authUserResponseSchema.safeParse({ user: sessionUser }).success).toBe(true);
    expect(adminUsersResponseSchema.safeParse({ users: [account] }).success).toBe(true);
    expect(adminUserResponseSchema.safeParse({ user: account }).success).toBe(true);
    expect(syncStatusResponseSchema.safeParse({ latestRun: syncRun, projectKeys: ["ICTFT"], hasUsableData: true, warnings: [] }).success).toBe(true);
    expect(syncRunResponseSchema.safeParse(syncRun).success).toBe(true);
    expect(backlogResponseSchema.safeParse({ issues: [issue], page: { page: 1, pageSize: 25, total: 1 }, warnings: [] }).success).toBe(true);
    expect(sprintHistoryResponseSchema.safeParse({ sprints: [sprint], warnings: [warning] }).success).toBe(true);
    expect(sizingRecommendResponseSchema.safeParse(sizing).success).toBe(true);
    expect(blockageRecommendResponseSchema.safeParse(blockage).success).toBe(true);
    expect(blockagePatternsResponseSchema.safeParse({ patterns: [pattern] }).success).toBe(true);
    expect(blockagePatternResponseSchema.safeParse({ pattern }).success).toBe(true);
    expect(reviewableSprintsResponseSchema.safeParse({ sprints: [reviewSprint], warnings: [] }).success).toBe(true);
    expect(sprintEvidenceResponseSchema.safeParse({ evidence }).success).toBe(true);
    expect(sprintDemoReportResponseSchema.safeParse({ report }).success).toBe(true);
    expect(varianceAnalyticsResponseSchema.safeParse({ analytics: variance }).success).toBe(true);
  });
});
