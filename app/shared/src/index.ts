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

export const loginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const createUserRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
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
