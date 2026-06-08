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
  createPlanningInputRequestSchema,
  createPlanningInputResponseSchema,
  createUserRequestSchema,
  decompositionRunSchema,
  getDecompositionResponseSchema,
  getPlanningInputResponseSchema,
  healthResponseSchema,
  loginRequestSchema,
  patchBlockagePatternRequestSchema,
  patchUserRequestSchema,
  planningInputSchema,
  runDecompositionRequestSchema,
  runDecompositionResponseSchema,
  sizingRecommendRequestSchema,
  sizingRecommendResponseSchema,
  sprintHistoryQuerySchema,
  sprintHistoryResponseSchema,
  syncRunResponseSchema,
  syncStatusResponseSchema,
  sizingRecommendationSchema,
  technicalSubTaskSchema
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

  it("discriminates manual and Jira planning input requests", () => {
    expect(
      createPlanningInputRequestSchema.safeParse({
        sourceType: "manual",
        title: "Build allocation view",
        description: "Show decomposed tasks and suggested owners."
      }).success
    ).toBe(true);
    expect(
      createPlanningInputRequestSchema.safeParse({
        sourceType: "jira-issue",
        issueKey: "ICTFT-202"
      }).success
    ).toBe(true);
    expect(
      createPlanningInputRequestSchema.safeParse({
        sourceType: "manual",
        issueKey: "ICTFT-202"
      }).success
    ).toBe(false);
    expect(
      createPlanningInputRequestSchema.safeParse({
        sourceType: "jira-issue",
        title: "Build allocation view",
        description: "Show decomposed tasks."
      }).success
    ).toBe(false);
  });

  it("requires exactly one decomposition input source", () => {
    expect(runDecompositionRequestSchema.safeParse({ inputId: "input-1" }).success).toBe(true);
    expect(
      runDecompositionRequestSchema.safeParse({
        input: {
          sourceType: "manual",
          title: "Build allocation view",
          description: "Show decomposed tasks and suggested owners."
        },
        provider: "openrouter"
      }).success
    ).toBe(true);
    expect(runDecompositionRequestSchema.safeParse({}).success).toBe(false);
    expect(
      runDecompositionRequestSchema.safeParse({
        inputId: "input-1",
        input: {
          sourceType: "jira-issue",
          issueKey: "ICTFT-202"
        }
      }).success
    ).toBe(false);
  });

  it("validates Module 2 planning and decomposition DTO invariants", () => {
    const now = new Date().toISOString();
    const planningInput = {
      id: "input-1",
      sourceType: "manual",
      title: "Build allocation view",
      description: "Show decomposed tasks and suggested owners.",
      acceptanceCriteria: ["Recommendations are visible."],
      constraints: [],
      tags: ["module-2"],
      sourceSnapshot: {
        sourceType: "manual",
        manual: {
          title: "Build allocation view",
          description: "Show decomposed tasks and suggested owners."
        },
        capturedAt: now
      },
      warnings: [],
      createdBy: "u-1",
      createdAt: now
    };
    const subTask = {
      id: "task-1",
      domain: "frontend",
      title: "Render recommendations",
      description: "Display task owners and fit reasons.",
      deliverables: ["Recommendation table"],
      acceptanceChecks: ["Primary owner and alternatives are visible."],
      requiredSkills: [{ key: "react", minLevel: 3, weight: 1 }],
      dependencies: [],
      estimateHours: 8,
      risk: "medium",
      confidence: 0.85,
      rationale: "The work is isolated to the allocation screen."
    };
    const decompositionRun = {
      id: "run-1",
      inputId: "input-1",
      provider: "heuristic",
      promptVersion: "v1",
      subTasks: [subTask],
      warnings: [],
      createdAt: now
    };

    expect(planningInputSchema.safeParse(planningInput).success).toBe(true);
    expect(technicalSubTaskSchema.safeParse(subTask).success).toBe(true);
    expect(decompositionRunSchema.safeParse(decompositionRun).success).toBe(true);
    expect(technicalSubTaskSchema.safeParse({ ...subTask, estimateHours: 0 }).success).toBe(false);
    expect(technicalSubTaskSchema.safeParse({ ...subTask, confidence: 1.01 }).success).toBe(false);
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
  });

  it("defines Module 2 planning and decomposition response schemas", () => {
    const now = new Date().toISOString();
    const planningInput = {
      id: "input-1",
      sourceType: "jira-issue",
      issueKey: "ICTFT-202",
      projectKey: "ICTFT",
      title: "Build allocation view",
      description: "Show decomposed tasks and suggested owners.",
      acceptanceCriteria: [],
      constraints: [],
      tags: [],
      sourceSnapshot: {
        sourceType: "jira-issue",
        jiraIssue: {
          key: "ICTFT-202",
          projectKey: "ICTFT",
          summary: "Build allocation view",
          sprintIds: [],
          labels: [],
          components: []
        },
        capturedAt: now
      },
      warnings: [
        {
          code: "MISSING_ACCEPTANCE_CRITERIA",
          message: "Acceptance criteria are missing.",
          severity: "warning"
        }
      ],
      createdBy: "u-1",
      createdAt: now
    };
    const decompositionRun = {
      id: "run-1",
      inputId: "input-1",
      provider: "heuristic",
      promptVersion: "v1",
      subTasks: [
        {
          id: "task-1",
          domain: "frontend",
          title: "Render recommendations",
          description: "Display task owners and fit reasons.",
          deliverables: ["Recommendation table"],
          acceptanceChecks: ["Primary owner and alternatives are visible."],
          requiredSkills: [{ key: "react", minLevel: 3, weight: 1 }],
          dependencies: [],
          estimateHours: 8,
          risk: "medium",
          confidence: 0.85,
          rationale: "The work is isolated to the allocation screen."
        }
      ],
      warnings: [],
      createdAt: now
    };

    expect(createPlanningInputResponseSchema.safeParse({ planningInput }).success).toBe(true);
    expect(getPlanningInputResponseSchema.safeParse({ planningInput }).success).toBe(true);
    expect(runDecompositionResponseSchema.safeParse({ decompositionRun }).success).toBe(true);
    expect(getDecompositionResponseSchema.safeParse({ decompositionRun }).success).toBe(true);
  });
});
