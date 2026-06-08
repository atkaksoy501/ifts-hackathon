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

export const userRoleSchema = z.enum(["user", "admin"]);
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

export const engineeringDomainSchema = z.enum([
  "frontend",
  "backend",
  "database",
  "qa",
  "integration",
  "devops",
  "security",
  "ux",
  "docs",
  "data-ai",
  "other"
]);

export type EngineeringDomain = z.infer<typeof engineeringDomainSchema>;

export const riskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const providerNameSchema = z.enum(["heuristic", "openrouter"]);
export type ProviderName = z.infer<typeof providerNameSchema>;

export const sourceTypeSchema = z.enum(["manual", "jira-issue"]);
export type SourceType = z.infer<typeof sourceTypeSchema>;

export const planningInputSourceSnapshotSchema = z.object({
  sourceType: sourceTypeSchema,
  manual: z
    .object({
      title: z.string(),
      description: z.string()
    })
    .optional(),
  jiraIssue: jiraIssueSchema.optional(),
  capturedAt: z.string()
});

export type PlanningInputSourceSnapshotDto = z.infer<typeof planningInputSourceSnapshotSchema>;

export const planningInputSchema = z.object({
  id: z.string(),
  sourceType: sourceTypeSchema,
  issueKey: z.string().optional(),
  projectKey: z.string().optional(),
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()),
  constraints: z.array(z.string()),
  tags: z.array(z.string()),
  sourceSnapshot: planningInputSourceSnapshotSchema,
  warnings: z.array(warningSchema),
  createdBy: z.string(),
  createdAt: z.string()
});

export type PlanningInputDto = z.infer<typeof planningInputSchema>;

export const requiredSkillSchema = z.object({
  key: z.string(),
  minLevel: z.number(),
  weight: z.number()
});

export type RequiredSkillDto = z.infer<typeof requiredSkillSchema>;

export const technicalSubTaskSchema = z.object({
  id: z.string(),
  domain: engineeringDomainSchema,
  title: z.string(),
  description: z.string(),
  deliverables: z.array(z.string()),
  acceptanceChecks: z.array(z.string()),
  requiredSkills: z.array(requiredSkillSchema),
  dependencies: z.array(z.string()),
  estimateHours: z.number().positive(),
  risk: riskLevelSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string()
});

export type TechnicalSubTaskDto = z.infer<typeof technicalSubTaskSchema>;

export const decompositionRunSchema = z.object({
  id: z.string(),
  inputId: z.string(),
  provider: providerNameSchema,
  promptVersion: z.string(),
  subTasks: z.array(technicalSubTaskSchema),
  warnings: z.array(warningSchema),
  createdAt: z.string()
});

export type DecompositionRunDto = z.infer<typeof decompositionRunSchema>;

export const createManualPlanningInputRequestSchema = z.object({
  sourceType: z.literal("manual"),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  projectKey: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

export type CreateManualPlanningInputRequest = z.infer<typeof createManualPlanningInputRequestSchema>;

export const createJiraPlanningInputRequestSchema = z.object({
  sourceType: z.literal("jira-issue"),
  issueKey: z.string().trim().min(1),
  projectKey: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

export type CreateJiraPlanningInputRequest = z.infer<typeof createJiraPlanningInputRequestSchema>;

export const createPlanningInputRequestSchema = z.discriminatedUnion("sourceType", [
  createManualPlanningInputRequestSchema,
  createJiraPlanningInputRequestSchema
]);

export type CreatePlanningInputRequest = z.infer<typeof createPlanningInputRequestSchema>;

export const runDecompositionRequestSchema = z
  .object({
    inputId: z.string().min(1).optional(),
    input: createPlanningInputRequestSchema.optional(),
    provider: providerNameSchema.optional()
  })
  .refine((value) => Number(value.inputId !== undefined) + Number(value.input !== undefined) === 1, {
    message: "Exactly one of inputId or input is required"
  });

export type RunDecompositionRequest = z.infer<typeof runDecompositionRequestSchema>;

export const createPlanningInputResponseSchema = z.object({
  planningInput: planningInputSchema
});

export type CreatePlanningInputResponse = z.infer<typeof createPlanningInputResponseSchema>;

export const getPlanningInputResponseSchema = z.object({
  planningInput: planningInputSchema
});

export type GetPlanningInputResponse = z.infer<typeof getPlanningInputResponseSchema>;

export const runDecompositionResponseSchema = z.object({
  decompositionRun: decompositionRunSchema
});

export type RunDecompositionResponse = z.infer<typeof runDecompositionResponseSchema>;

export const getDecompositionResponseSchema = z.object({
  decompositionRun: decompositionRunSchema
});

export type GetDecompositionResponse = z.infer<typeof getDecompositionResponseSchema>;

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
