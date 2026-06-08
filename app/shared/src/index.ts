import { z } from "zod";

export const warningSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(["info", "warning"])
});

export type WarningDto = z.infer<typeof warningSchema>;

export const pageInfoSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0)
});

export type PageInfoDto = z.infer<typeof pageInfoSchema>;

export const userRoleSchema = z.enum(["user", "manager", "admin"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const sessionUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string().optional(),
  role: userRoleSchema,
  active: z.boolean()
});

export type SessionUserDto = z.infer<typeof sessionUserSchema>;

export const userAccountSchema = sessionUserSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string()
});

export type UserAccountDto = z.infer<typeof userAccountSchema>;

export const jiraIssueSchema = z.object({
  key: z.string(),
  projectKey: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  issueType: z.string().optional(),
  statusCategory: z.string().optional(),
  statusName: z.string().optional(),
  sprintIds: z.array(z.string()),
  storyPoints: z.number().optional(),
  timeSpentHours: z.number().optional(),
  labels: z.array(z.string()),
  components: z.array(z.string()),
  updatedAt: z.string().optional()
});

export type JiraIssueDto = z.infer<typeof jiraIssueSchema>;

export const jiraSprintSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: z.literal("closed"),
  projectKey: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  completeDate: z.string().optional()
});

export type JiraSprintDto = z.infer<typeof jiraSprintSchema>;

export const syncRunSchema = z.object({
  id: z.string(),
  source: z.literal("github-state"),
  status: z.enum(["success", "warning", "failed", "running"]),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  issueUpserts: z.number().int().min(0),
  sprintUpserts: z.number().int().min(0),
  fieldMappingUpserts: z.number().int().min(0),
  warnings: z.array(warningSchema),
  error: z.string().optional()
});

export type SyncRunDto = z.infer<typeof syncRunSchema>;

export const syncStatusSchema = z.object({
  latestRun: syncRunSchema.optional(),
  projectKeys: z.array(z.string()),
  lastSuccessfulSyncAt: z.string().optional(),
  hasUsableData: z.boolean(),
  warnings: z.array(warningSchema)
});

export type SyncStatusDto = z.infer<typeof syncStatusSchema>;

export const similarIssueSchema = z.object({
  key: z.string(),
  summary: z.string(),
  similarity: z.number().min(0).max(1),
  storyPoints: z.number().optional(),
  timeSpentHours: z.number().optional()
});

export type SimilarIssueDto = z.infer<typeof similarIssueSchema>;

export const confidenceBreakdownSchema = z.object({
  similarity: z.number().min(0).max(1),
  neighborCount: z.number().min(0).max(1),
  dataCompleteness: z.number().min(0).max(1),
  variance: z.number().min(0).max(1)
});

export type ConfidenceBreakdownDto = z.infer<typeof confidenceBreakdownSchema>;

export const sizingRecommendationSchema = z.object({
  id: z.string(),
  issueKey: z.string(),
  storyPoints: z.number(),
  idealHours: z.number(),
  confidence: z.number().min(0).max(1),
  confidenceBreakdown: confidenceBreakdownSchema,
  warnings: z.array(warningSchema),
  similarIssues: z.array(similarIssueSchema),
  rationale: z.string().min(1),
  createdAt: z.string()
});

export type SizingRecommendationDto = z.infer<typeof sizingRecommendationSchema>;

export const blockagePatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  keywords: z.array(z.string()),
  componentHints: z.array(z.string()),
  actions: z.array(z.string()),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type BlockagePatternDto = z.infer<typeof blockagePatternSchema>;

export const blockageRecommendationSchema = z.object({
  id: z.string(),
  issueKey: z.string().optional(),
  inputText: z.string(),
  actions: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
  warnings: z.array(warningSchema),
  createdAt: z.string()
});

export type BlockageRecommendationDto = z.infer<typeof blockageRecommendationSchema>;

export const sprintEvidenceSourceSchema = z.enum([
  "jira-snapshot",
  "jira-changelog",
  "jira-comment",
  "github-pr",
  "github-commit",
  "manager-remark"
]);

export const sourceRefSchema = z.object({
  sourceType: sprintEvidenceSourceSchema,
  externalId: z.string(),
  url: z.string().optional(),
  capturedAt: z.string()
});

export type SourceRefDto = z.infer<typeof sourceRefSchema>;

export const reviewableSprintSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectKey: z.string(),
  state: z.literal("closed"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  completeDate: z.string().optional(),
  evidenceStatus: z.enum(["ready", "sparse", "missing"]),
  reportCount: z.number().int().min(0),
  latestReportId: z.string().optional(),
  sourceRefs: z.array(sourceRefSchema),
  warnings: z.array(warningSchema)
});

export type ReviewableSprintDto = z.infer<typeof reviewableSprintSchema>;

export const sprintSnapshotSchema = z.object({
  id: z.string(),
  sprintId: z.string(),
  projectKey: z.string(),
  kind: z.enum(["start", "close"]),
  capturedAt: z.string(),
  sourceRef: sourceRefSchema,
  issueCount: z.number().int().min(0),
  storyPointsTotal: z.number().min(0),
  hoursTotal: z.number().min(0).optional(),
  warnings: z.array(warningSchema)
});

export type SprintSnapshotDto = z.infer<typeof sprintSnapshotSchema>;

export const statusHistoryEntrySchema = z.object({
  fromStatus: z.string().optional(),
  toStatus: z.string(),
  statusCategory: z.string().optional(),
  changedAt: z.string(),
  sourceRef: sourceRefSchema
});

export const evidenceIssueSchema = z.object({
  key: z.string(),
  projectKey: z.string(),
  summary: z.string(),
  issueType: z.string().optional(),
  statusCategory: z.string().optional(),
  statusName: z.string().optional(),
  assignee: z.string().optional(),
  storyPoints: z.number().optional(),
  timeSpentHours: z.number().optional(),
  labels: z.array(z.string()),
  components: z.array(z.string()),
  completionState: z.enum(["planned", "completed", "incomplete", "removed"]),
  statusHistory: z.array(statusHistoryEntrySchema),
  sourceRefs: z.array(sourceRefSchema),
  warnings: z.array(warningSchema)
});

export type EvidenceIssueDto = z.infer<typeof evidenceIssueSchema>;

export const pullRequestEvidenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().optional(),
  state: z.enum(["open", "merged", "closed"]),
  author: z.string().optional(),
  branch: z.string().optional(),
  mergedAt: z.string().optional(),
  mappedIssueKeys: z.array(z.string()),
  sourceRef: sourceRefSchema,
  warnings: z.array(warningSchema)
});

export const commitEvidenceSchema = z.object({
  sha: z.string(),
  message: z.string(),
  url: z.string().optional(),
  author: z.string().optional(),
  committedAt: z.string(),
  mappedIssueKeys: z.array(z.string()),
  sourceRef: sourceRefSchema,
  warnings: z.array(warningSchema)
});

export const closingRemarkSchema = z.object({
  id: z.string(),
  text: z.string(),
  source: z.enum(["jira-comment", "jira-resolution", "manager-remark"]),
  issueKey: z.string().optional(),
  authorDisplayName: z.string().optional(),
  createdAt: z.string(),
  sourceRef: sourceRefSchema
});

export const unmatchedEvidenceSchema = z.object({
  id: z.string(),
  kind: z.enum(["pull-request", "commit"]),
  titleOrMessage: z.string(),
  url: z.string().optional(),
  sourceRef: sourceRefSchema,
  warnings: z.array(warningSchema)
});

export const sprintEvidenceSchema = z.object({
  id: z.string(),
  sprint: reviewableSprintSchema,
  snapshots: z.array(sprintSnapshotSchema),
  completedItems: z.array(evidenceIssueSchema),
  incompleteItems: z.array(evidenceIssueSchema),
  removedItems: z.array(evidenceIssueSchema),
  pullRequests: z.array(pullRequestEvidenceSchema),
  commits: z.array(commitEvidenceSchema),
  closingRemarks: z.array(closingRemarkSchema),
  unmatchedEvidence: z.array(unmatchedEvidenceSchema),
  warnings: z.array(warningSchema),
  generatedAt: z.string()
});

export type SprintEvidenceDto = z.infer<typeof sprintEvidenceSchema>;

export const sprintRemarkSchema = z.object({
  id: z.string(),
  sprintId: z.string(),
  text: z.string(),
  author: z.object({
    id: z.string(),
    displayName: z.string().optional(),
    role: z.enum(["manager", "admin"])
  }),
  createdAt: z.string(),
  sourceRef: sourceRefSchema
});

export type SprintRemarkDto = z.infer<typeof sprintRemarkSchema>;

export const summaryProviderNameSchema = z.enum(["heuristic", "openrouter"]);

export const reportSectionSchema = z.object({
  key: z.enum(["executive-summary", "completed-work", "demo-notes", "risks", "blockers", "warnings", "next-actions"]),
  title: z.string(),
  items: z.array(z.string())
});

export const sprintDemoReportSchema = z.object({
  id: z.string(),
  sprintId: z.string(),
  projectKey: z.string(),
  version: z.number().int().min(1),
  title: z.string(),
  language: z.literal("tr"),
  provider: z.object({
    name: summaryProviderNameSchema,
    promptVersion: z.string(),
    fallbackUsed: z.boolean(),
    anonymized: z.boolean()
  }),
  sections: z.array(reportSectionSchema),
  source: z.object({
    evidenceSetId: z.string(),
    remarkIds: z.array(z.string()),
    sourceRefs: z.array(sourceRefSchema)
  }),
  markdown: z.string().min(1),
  warnings: z.array(warningSchema),
  createdBy: z.string(),
  createdAt: z.string()
});

export type SprintDemoReportDto = z.infer<typeof sprintDemoReportSchema>;

export const varianceMetricSchema = z.object({
  planned: z.number(),
  actual: z.number(),
  delta: z.number(),
  deltaPercent: z.number().nullable(),
  direction: z.enum(["ahead", "behind", "on-track"]),
  usedFallback: z.boolean()
});

export type VarianceMetricDto = z.infer<typeof varianceMetricSchema>;

export const velocityTrendPointSchema = z.object({
  sprintId: z.string(),
  sprintName: z.string().optional(),
  completedStoryPoints: z.number(),
  completedHours: z.number(),
  completeDate: z.string().optional()
});

export const bottleneckGroupSchema = z.object({
  groupType: z.enum(["assignee", "issueType", "status", "component", "blockageReason"]),
  groupKey: z.string(),
  plannedStoryPoints: z.number(),
  actualStoryPoints: z.number(),
  spilloverStoryPoints: z.number(),
  itemCount: z.number().int().min(0),
  warnings: z.array(warningSchema)
});

export type BottleneckGroupDto = z.infer<typeof bottleneckGroupSchema>;

export const varianceAnalyticsSchema = z.object({
  id: z.string(),
  projectKey: z.string(),
  sprintId: z.string(),
  trendWindow: z.number().int().min(1).max(12),
  baselines: z.object({
    startSnapshotId: z.string().optional(),
    closeSnapshotId: z.string().optional()
  }),
  storyPoints: varianceMetricSchema,
  hours: varianceMetricSchema,
  velocityTrend: z.array(velocityTrendPointSchema),
  bottlenecks: z.array(bottleneckGroupSchema),
  warnings: z.array(warningSchema),
  computedAt: z.string()
});

export type VarianceAnalyticsDto = z.infer<typeof varianceAnalyticsSchema>;

export const createSprintRemarkRequestSchema = z.object({
  text: z.string().trim().min(1)
});

export const createSprintDemoReportRequestSchema = z.object({
  sprintId: z.string().min(1),
  projectKey: z.string().optional(),
  provider: summaryProviderNameSchema.optional(),
  includeRemarkIds: z.array(z.string()).optional()
});

export const usernameSchema = z.string().trim().min(1);
export const passwordSchema = z.string().min(8);

export const loginRequestSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1)
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const createUserRequestSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  displayName: z.string().optional(),
  role: userRoleSchema,
  active: z.boolean().optional()
});

export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;

export const patchUserRequestSchema = createUserRequestSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Patch body cannot be empty");

export type PatchUserRequest = z.infer<typeof patchUserRequestSchema>;

export const sizingRecommendRequestSchema = z.object({
  issueKey: z.string().min(1),
  projectKey: z.string().optional(),
  neighborLimit: z.number().int().min(1).max(20).optional()
});

export type SizingRecommendRequest = z.infer<typeof sizingRecommendRequestSchema>;

export const blockageRecommendRequestSchema = z
  .object({
    issueKey: z.string().optional(),
    inputText: z.string().optional(),
    projectKey: z.string().optional(),
    maxActions: z.number().int().min(1).max(10).optional()
  })
  .refine((value) => Boolean(value.issueKey || value.inputText?.trim()), {
    message: "issueKey or inputText is required"
  });

export type BlockageRecommendRequest = z.infer<typeof blockageRecommendRequestSchema>;

export const createBlockagePatternRequestSchema = z.object({
  name: z.string().min(1),
  keywords: z.array(z.string()).optional(),
  componentHints: z.array(z.string()).optional(),
  actions: z.array(z.string()).min(1),
  active: z.boolean().optional()
});

export type CreateBlockagePatternRequest = z.infer<typeof createBlockagePatternRequestSchema>;

export const patchBlockagePatternRequestSchema = createBlockagePatternRequestSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Patch body cannot be empty");

export type PatchBlockagePatternRequest = z.infer<typeof patchBlockagePatternRequestSchema>;

const optionalStringQuerySchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value : undefined),
  z.string().optional()
);

const optionalPositiveIntQuerySchema = z.preprocess((value) => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : value;
}, z.number().int().min(1).optional());

export const sprintReviewSprintsQuerySchema = z.object({
  projectKey: optionalStringQuerySchema,
  limit: optionalPositiveIntQuerySchema
});

export const sprintEvidenceQuerySchema = z.object({
  projectKey: optionalStringQuerySchema
});

export const varianceAnalyticsQuerySchema = z.object({
  projectKey: optionalStringQuerySchema,
  sprintId: z.string().min(1),
  trendWindow: optionalPositiveIntQuerySchema.refine((value) => value === undefined || value <= 12, "trendWindow must be 1..12")
});

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal("module1-advisor")
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const authUserResponseSchema = z.object({
  user: sessionUserSchema
});

export type AuthUserResponse = z.infer<typeof authUserResponseSchema>;

export const adminUsersResponseSchema = z.object({
  users: z.array(userAccountSchema)
});

export type AdminUsersResponse = z.infer<typeof adminUsersResponseSchema>;

export const adminUserResponseSchema = z.object({
  user: userAccountSchema
});

export type AdminUserResponse = z.infer<typeof adminUserResponseSchema>;

export const pathIdParamsSchema = z.object({
  id: z.string().min(1)
});

export type PathIdParams = z.infer<typeof pathIdParamsSchema>;

export const backlogQuerySchema = z.object({
  projectKey: optionalStringQuerySchema,
  issueType: optionalStringQuerySchema,
  statusCategory: optionalStringQuerySchema,
  label: optionalStringQuerySchema,
  component: optionalStringQuerySchema,
  search: optionalStringQuerySchema,
  page: optionalPositiveIntQuerySchema,
  pageSize: optionalPositiveIntQuerySchema
});

export type BacklogQuery = z.infer<typeof backlogQuerySchema>;

export const backlogResponseSchema = z.object({
  issues: z.array(jiraIssueSchema),
  page: pageInfoSchema,
  warnings: z.array(warningSchema)
});

export type BacklogResponse = z.infer<typeof backlogResponseSchema>;

export const sprintHistoryQuerySchema = z.object({
  projectKey: optionalStringQuerySchema,
  limit: optionalPositiveIntQuerySchema
});

export type SprintHistoryQuery = z.infer<typeof sprintHistoryQuerySchema>;

export const sprintHistoryResponseSchema = z.object({
  sprints: z.array(jiraSprintSchema),
  warnings: z.array(warningSchema)
});

export type SprintHistoryResponse = z.infer<typeof sprintHistoryResponseSchema>;

export const syncStatusResponseSchema = syncStatusSchema;
export type SyncStatusResponse = z.infer<typeof syncStatusResponseSchema>;

export const syncRunResponseSchema = syncRunSchema;
export type SyncRunResponse = z.infer<typeof syncRunResponseSchema>;

export const sizingRecommendResponseSchema = sizingRecommendationSchema;
export type SizingRecommendResponse = z.infer<typeof sizingRecommendResponseSchema>;

export const blockageRecommendResponseSchema = blockageRecommendationSchema;
export type BlockageRecommendResponse = z.infer<typeof blockageRecommendResponseSchema>;

export const blockagePatternsResponseSchema = z.object({
  patterns: z.array(blockagePatternSchema)
});

export type BlockagePatternsResponse = z.infer<typeof blockagePatternsResponseSchema>;

export const blockagePatternResponseSchema = z.object({
  pattern: blockagePatternSchema
});

export type BlockagePatternResponse = z.infer<typeof blockagePatternResponseSchema>;

export const reviewableSprintsResponseSchema = z.object({
  sprints: z.array(reviewableSprintSchema),
  warnings: z.array(warningSchema)
});

export type ReviewableSprintsResponse = z.infer<typeof reviewableSprintsResponseSchema>;

export const sprintEvidenceResponseSchema = z.object({
  evidence: sprintEvidenceSchema
});

export type SprintEvidenceResponse = z.infer<typeof sprintEvidenceResponseSchema>;

export const createSprintRemarkResponseSchema = z.object({
  remark: sprintRemarkSchema
});

export type CreateSprintRemarkRequest = z.infer<typeof createSprintRemarkRequestSchema>;
export type CreateSprintRemarkResponse = z.infer<typeof createSprintRemarkResponseSchema>;

export type CreateSprintDemoReportRequest = z.infer<typeof createSprintDemoReportRequestSchema>;

export const createSprintDemoReportResponseSchema = z.object({
  report: sprintDemoReportSchema
});

export type CreateSprintDemoReportResponse = z.infer<typeof createSprintDemoReportResponseSchema>;

export const sprintDemoReportResponseSchema = z.object({
  report: sprintDemoReportSchema
});

export type SprintDemoReportResponse = z.infer<typeof sprintDemoReportResponseSchema>;

export const sprintDemoMarkdownResponseSchema = z.object({
  reportId: z.string(),
  version: z.number().int().min(1),
  markdown: z.string().min(1),
  createdAt: z.string()
});

export type SprintDemoMarkdownResponse = z.infer<typeof sprintDemoMarkdownResponseSchema>;

export type VarianceAnalyticsQuery = z.infer<typeof varianceAnalyticsQuerySchema>;

export const varianceAnalyticsResponseSchema = z.object({
  analytics: varianceAnalyticsSchema
});

export type VarianceAnalyticsResponse = z.infer<typeof varianceAnalyticsResponseSchema>;

export type ErrorEnvelope = {
  error: {
    code:
      | "INVALID_REQUEST"
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "CONFLICT"
      | "SYNC_FAILED"
      | "INTERNAL_ERROR";
    message: string;
    details?: Record<string, unknown>;
    correlationId: string;
  };
};
