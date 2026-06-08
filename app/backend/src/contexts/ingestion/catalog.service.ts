import type { JiraIssueDto, JiraSprintDto, SyncRunDto, SyncStatusDto, WarningDto } from "@module1/contracts";
import { randomUUID } from "node:crypto";
import { ApiError } from "../../shared/http.js";

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

export class CatalogService {
  private latestRun: SyncRunDto | undefined;
  private readonly issues = new Map<string, JiraIssueDto>();
  private readonly sprints = new Map<string, JiraSprintDto>();

  constructor(private readonly defaultProjectKey: string) {
    this.seedDemoData(defaultProjectKey);
  }

  getSyncStatus(): SyncStatusDto {
    const projectKeys = [...new Set([...this.issues.values()].map((issue) => issue.projectKey))];
    const warnings = this.latestRun?.warnings ?? [
      {
        code: "SYNC_NOT_CONFIGURED",
        message: "GitHub state sync has not run in this scaffold yet.",
        severity: "warning"
      }
    ];

    const status: SyncStatusDto = {
      projectKeys,
      hasUsableData: this.issues.size > 0,
      warnings
    };

    if (this.latestRun) {
      status.latestRun = this.latestRun;
      if (this.latestRun.status === "success" || this.latestRun.status === "warning") {
        status.lastSuccessfulSyncAt = this.latestRun.completedAt;
      }
    }

    return status;
  }

  runManualSync(): SyncRunDto {
    const now = new Date().toISOString();
    const warnings: WarningDto[] = [
      {
        code: "GITHUB_CLIENT_STUB",
        message: "Manual sync route is wired; GitHub state adapter is a TODO.",
        severity: "warning"
      }
    ];

    this.latestRun = {
      id: randomUUID(),
      source: "github-state",
      status: "warning",
      startedAt: now,
      completedAt: now,
      issueUpserts: this.issues.size,
      sprintUpserts: this.sprints.size,
      fieldMappingUpserts: 1,
      warnings
    };

    return this.latestRun;
  }

  listBacklog(query: BacklogQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const search = query.search?.toLowerCase();
    const filtered = [...this.issues.values()].filter((issue) => {
      if (issue.projectKey !== query.projectKey) return false;
      if (issue.statusCategory === "Done") return false;
      if (query.issueType && issue.issueType !== query.issueType) return false;
      if (query.statusCategory && issue.statusCategory !== query.statusCategory) return false;
      if (query.label && !issue.labels.includes(query.label)) return false;
      if (query.component && !issue.components.includes(query.component)) return false;
      if (search && !`${issue.key} ${issue.summary} ${issue.description ?? ""}`.toLowerCase().includes(search)) {
        return false;
      }
      return true;
    });

    const start = (page - 1) * pageSize;
    return {
      issues: filtered.slice(start, start + pageSize),
      page: {
        page,
        pageSize,
        total: filtered.length
      },
      warnings: filtered.length
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

  listClosedSprints(projectKey = this.defaultProjectKey, limit = 10) {
    const sprints = [...this.sprints.values()]
      .filter((sprint) => sprint.projectKey === projectKey)
      .slice(0, limit);

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

  getIssue(issueKey: string, projectKey?: string): JiraIssueDto {
    const issue = this.issues.get(issueKey);
    if (!issue || (projectKey && issue.projectKey !== projectKey)) {
      throw new ApiError(404, "NOT_FOUND", "Issue was not found.");
    }

    return issue;
  }

  findHistoricalIssues(projectKey: string): JiraIssueDto[] {
    return [...this.issues.values()].filter((issue) => issue.projectKey === projectKey && issue.statusCategory === "Done");
  }

  private seedDemoData(projectKey: string) {
    const now = new Date().toISOString();
    const issues: JiraIssueDto[] = [
      {
        key: `${projectKey}-101`,
        projectKey,
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
        key: `${projectKey}-102`,
        projectKey,
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
        key: `${projectKey}-201`,
        projectKey,
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

    for (const issue of issues) {
      this.issues.set(issue.key, issue);
    }

    for (let index = 1; index <= 2; index += 1) {
      this.sprints.set(`sprint-${index}`, {
        id: `sprint-${index}`,
        name: `Closed Sprint ${index}`,
        state: "closed",
        projectKey,
        completeDate: now
      });
    }
  }
}
