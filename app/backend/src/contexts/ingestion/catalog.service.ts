import type { JiraIssueDto, JiraSprintDto, SyncRunDto, SyncStatusDto, WarningDto } from "@module1/contracts";
import { randomUUID } from "node:crypto";
import { ApiError } from "../../shared/http.js";
import type { GitHubStateClient } from "./github-state.client.js";
import { normalizeGitHubState } from "./normalizer.js";
import type { CatalogRepositories } from "./repositories.js";

type BacklogQuery = {
  projectKey: string;
  issueType?: string;
  statusCategory?: string;
  label?: string;
  component?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type SyncTrigger = "manual" | "startup" | "interval";
export type Clock = () => Date;

export class CatalogService {
  private runningSync: Promise<SyncRunDto> | undefined;

  constructor(
    private readonly repositories: CatalogRepositories,
    private readonly githubStateClient: GitHubStateClient,
    private readonly defaultProjectKey: string,
    private readonly clock: Clock = () => new Date()
  ) {}

  async getSyncStatus(): Promise<SyncStatusDto> {
    const [latestRun, lastSuccessfulRun, projectKeys, hasUsableData] = await Promise.all([
      this.repositories.latestSyncRun(),
      this.repositories.lastSuccessfulSyncRun(),
      this.repositories.listProjectKeys(),
      this.repositories.hasUsableData()
    ]);

    const warnings: WarningDto[] = [];
    if (!latestRun) {
      warnings.push({
        code: "SYNC_NOT_RUN",
        message: "GitHub state sync has not run yet.",
        severity: "warning"
      });
    } else if (latestRun.status === "failed") {
      warnings.push({
        code: "LAST_SYNC_FAILED",
        message: "Latest sync failed; existing catalog data was preserved.",
        severity: "warning"
      });
    }
    warnings.push(...(latestRun?.warnings ?? []));

    const status: SyncStatusDto = {
      projectKeys,
      hasUsableData,
      warnings
    };
    assignOptional(status, "latestRun", latestRun);
    assignOptional(status, "lastSuccessfulSyncAt", lastSuccessfulRun?.completedAt);
    return status;
  }

  async runManualSync(): Promise<SyncRunDto> {
    return await this.runSync("manual");
  }

  async runScheduledSync(_trigger: Exclude<SyncTrigger, "manual">): Promise<SyncRunDto> {
    if (this.runningSync) return await this.runningSync;
    this.runningSync = this.runSync(_trigger).finally(() => {
      this.runningSync = undefined;
    });
    return await this.runningSync;
  }

  async listBacklog(query: BacklogQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const result = await this.repositories.listBacklog({
      projectKey: query.projectKey,
      ...(query.issueType === undefined ? {} : { issueType: query.issueType }),
      ...(query.statusCategory === undefined ? {} : { statusCategory: query.statusCategory }),
      ...(query.label === undefined ? {} : { label: query.label }),
      ...(query.component === undefined ? {} : { component: query.component }),
      ...(query.search === undefined ? {} : { search: query.search }),
      page,
      pageSize
    });

    return {
      issues: result.issues,
      page: {
        page,
        pageSize,
        total: result.total
      },
      warnings: result.total
        ? []
        : [
            {
              code: "EMPTY_BACKLOG",
              message: "Backlog is empty for selected filters.",
              severity: "info" as const
            }
          ]
    };
  }

  async listClosedSprints(projectKey = this.defaultProjectKey, limit = 10) {
    const sprints = await this.repositories.listClosedSprints(projectKey, limit);

    return {
      sprints,
      warnings:
        sprints.length < 3
          ? [
              {
                code: "LOW_SPRINT_HISTORY",
                message: "Fewer than 3 closed sprints are available.",
                severity: "warning" as const
              }
            ]
          : []
    };
  }

  async getIssue(issueKey: string, projectKey?: string): Promise<JiraIssueDto> {
    const issue = await this.repositories.getIssue(issueKey);
    if (!issue || (projectKey && issue.projectKey !== projectKey)) {
      throw new ApiError(404, "NOT_FOUND", "Issue was not found.");
    }

    return issue;
  }

  async findHistoricalIssues(projectKey: string): Promise<JiraIssueDto[]> {
    return await this.repositories.findHistoricalIssues(projectKey);
  }

  async listIssuesBySprint(projectKey: string, sprintId: string): Promise<JiraIssueDto[]> {
    return await this.repositories.listIssuesBySprint(projectKey, sprintId);
  }

  private async runSync(trigger: SyncTrigger): Promise<SyncRunDto> {
    const startedAt = this.now();
    const baseRun: SyncRunDto = {
      id: randomUUID(),
      source: "github-state",
      status: "running",
      startedAt,
      issueUpserts: 0,
      sprintUpserts: 0,
      fieldMappingUpserts: 0,
      warnings: trigger === "manual" ? [] : [{ code: "SCHEDULED_SYNC", message: `Sync triggered by ${trigger}.`, severity: "info" }]
    };
    await this.repositories.createSyncRun(baseRun);

    try {
      const state = await this.githubStateClient.fetchState();
      const normalized = normalizeGitHubState(state, this.defaultProjectKey);
      const upserts = await this.repositories.upsertCatalog(normalized);
      const warnings = [...baseRun.warnings, ...normalized.warnings];
      const completedRun: SyncRunDto = {
        ...baseRun,
        ...upserts,
        status: warnings.some((warning) => warning.severity === "warning") ? "warning" : "success",
        completedAt: this.now(),
        warnings
      };
      await this.repositories.updateSyncRun(completedRun);
      return completedRun;
    } catch (error) {
      if (!(await this.repositories.hasUsableData())) {
        const fallbackSeed = createDemoCatalogSeed(this.defaultProjectKey);
        const upserts = await this.repositories.upsertCatalog(fallbackSeed);
        const fallbackRun: SyncRunDto = {
          ...baseRun,
          ...upserts,
          status: "warning",
          completedAt: this.now(),
          warnings: [
            ...baseRun.warnings,
            {
              code: "DUMMY_JIRA_FALLBACK",
              message: `Live Jira state unavailable; demo Jira catalog seeded. Cause: ${error instanceof Error ? error.message : "Unknown sync failure"}`,
              severity: "warning"
            }
          ],
          error: error instanceof Error ? error.message : "Unknown sync failure"
        };
        await this.repositories.updateSyncRun(fallbackRun);
        return fallbackRun;
      }

      const failedRun: SyncRunDto = {
        ...baseRun,
        status: "failed",
        completedAt: this.now(),
        warnings: baseRun.warnings,
        error: error instanceof Error ? error.message : "Unknown sync failure"
      };
      await this.repositories.updateSyncRun(failedRun);
      return failedRun;
    }
  }

  private now(): string {
    return this.clock().toISOString();
  }
}

export function createDemoCatalogSeed(defaultProjectKey: string) {
  const now = new Date().toISOString();
  const issues: JiraIssueDto[] = [
    {
      key: `${defaultProjectKey}-101`,
      projectKey: defaultProjectKey,
      summary: "Login akışı ve session guard",
      description: "Kullanıcı login olur, httpOnly cookie ile session korunur.",
      issueType: "Story",
      statusCategory: "Done",
      statusName: "Done",
      sprintIds: ["sprint-1"],
      storyPoints: 5,
      timeSpentHours: 28,
      labels: ["auth"],
      components: ["identity"],
      updatedAt: now
    },
    {
      key: `${defaultProjectKey}-102`,
      projectKey: defaultProjectKey,
      summary: "Backlog verisini normalize et",
      description: "GitHub state JSON okunur ve Mongo read model upsert edilir.",
      issueType: "Story",
      statusCategory: "Done",
      statusName: "Done",
      sprintIds: ["sprint-2"],
      storyPoints: 8,
      timeSpentHours: 44,
      labels: ["sync"],
      components: ["ingestion"],
      updatedAt: now
    },
    {
      key: `${defaultProjectKey}-201`,
      projectKey: defaultProjectKey,
      summary: "Seçilen issue için sizing önerisi göster",
      description: "Benzer historical issue listesinden story point ve ideal saat öner.",
      issueType: "Story",
      statusCategory: "To Do",
      statusName: "Backlog",
      sprintIds: [],
      labels: ["sizing"],
      components: ["recommendation"],
      updatedAt: now
    }
  ];

  const sprints: JiraSprintDto[] = [1, 2].map((index) => ({
    id: `sprint-${index}`,
    name: `Closed Sprint ${index}`,
    state: "closed",
    projectKey: defaultProjectKey,
    completeDate: now
  }));

  return {
    issues,
    sprints,
    fieldMappings: [{ id: `${defaultProjectKey}:storyPoints`, projectKey: defaultProjectKey, fieldKey: "storyPoints", name: "Story Points" }]
  };
}

function assignOptional<T extends object, K extends string, V>(target: T, key: K, value: V | undefined): asserts target is T & Record<K, V> {
  if (value !== undefined) {
    Object.assign(target, { [key]: value });
  }
}
