import type { JiraIssueDto, JiraSprintDto, SyncRunDto } from "@module1/contracts";

export type FieldMappingDto = {
  id: string;
  projectKey: string;
  fieldKey: string;
  name: string;
};

export type BacklogFilters = {
  projectKey: string;
  issueType?: string;
  statusCategory?: string;
  label?: string;
  component?: string;
  search?: string;
  page: number;
  pageSize: number;
};

export type BacklogListResult = {
  issues: JiraIssueDto[];
  total: number;
};

export type UpsertCatalogInput = {
  issues: JiraIssueDto[];
  sprints: JiraSprintDto[];
  fieldMappings: FieldMappingDto[];
};

export type UpsertCatalogResult = {
  issueUpserts: number;
  sprintUpserts: number;
  fieldMappingUpserts: number;
};

export interface CatalogRepositories {
  ensureReady?(): Promise<void>;
  close?(): Promise<void>;
  listProjectKeys(): Promise<string[]>;
  latestSyncRun(): Promise<SyncRunDto | undefined>;
  lastSuccessfulSyncRun(): Promise<SyncRunDto | undefined>;
  createSyncRun(run: SyncRunDto): Promise<void>;
  updateSyncRun(run: SyncRunDto): Promise<void>;
  upsertCatalog(input: UpsertCatalogInput): Promise<UpsertCatalogResult>;
  listBacklog(filters: BacklogFilters): Promise<BacklogListResult>;
  listClosedSprints(projectKey: string, limit: number): Promise<JiraSprintDto[]>;
  listIssuesBySprint(projectKey: string, sprintId: string): Promise<JiraIssueDto[]>;
  getIssue(issueKey: string): Promise<JiraIssueDto | undefined>;
  findHistoricalIssues(projectKey: string): Promise<JiraIssueDto[]>;
  hasUsableData(): Promise<boolean>;
}

export class InMemoryCatalogRepositories implements CatalogRepositories {
  private readonly issues = new Map<string, JiraIssueDto>();
  private readonly sprints = new Map<string, JiraSprintDto>();
  private readonly fieldMappings = new Map<string, FieldMappingDto>();
  private readonly syncRuns = new Map<string, SyncRunDto>();

  constructor(seed?: UpsertCatalogInput) {
    if (seed) {
      void this.upsertCatalog(seed);
    }
  }

  async listProjectKeys(): Promise<string[]> {
    return [...new Set([...this.issues.values()].map((issue) => issue.projectKey))].sort();
  }

  async latestSyncRun(): Promise<SyncRunDto | undefined> {
    return [...this.syncRuns.values()].sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0];
  }

  async lastSuccessfulSyncRun(): Promise<SyncRunDto | undefined> {
    return [...this.syncRuns.values()]
      .filter((run) => run.status === "success" || run.status === "warning")
      .sort((left, right) => (right.completedAt ?? right.startedAt).localeCompare(left.completedAt ?? left.startedAt))[0];
  }

  async createSyncRun(run: SyncRunDto): Promise<void> {
    this.syncRuns.set(run.id, run);
  }

  async updateSyncRun(run: SyncRunDto): Promise<void> {
    this.syncRuns.set(run.id, run);
  }

  async upsertCatalog(input: UpsertCatalogInput): Promise<UpsertCatalogResult> {
    for (const issue of input.issues) {
      this.issues.set(issue.key, issue);
    }
    for (const sprint of input.sprints) {
      this.sprints.set(sprint.id, sprint);
    }
    for (const mapping of input.fieldMappings) {
      this.fieldMappings.set(mapping.id, mapping);
    }

    return {
      issueUpserts: input.issues.length,
      sprintUpserts: input.sprints.length,
      fieldMappingUpserts: input.fieldMappings.length
    };
  }

  async listBacklog(filters: BacklogFilters): Promise<BacklogListResult> {
    const search = filters.search?.toLowerCase();
    const filtered = [...this.issues.values()].filter((issue) => {
      if (issue.projectKey !== filters.projectKey) return false;
      if (issue.statusCategory === "Done") return false;
      if (filters.issueType && issue.issueType !== filters.issueType) return false;
      if (filters.statusCategory && issue.statusCategory !== filters.statusCategory) return false;
      if (filters.label && !issue.labels.includes(filters.label)) return false;
      if (filters.component && !issue.components.includes(filters.component)) return false;
      if (search && !`${issue.key} ${issue.summary} ${issue.description ?? ""}`.toLowerCase().includes(search)) return false;
      return true;
    });
    const start = (filters.page - 1) * filters.pageSize;

    return {
      issues: filtered.slice(start, start + filters.pageSize),
      total: filtered.length
    };
  }

  async listClosedSprints(projectKey: string, limit: number): Promise<JiraSprintDto[]> {
    return [...this.sprints.values()]
      .filter((sprint) => sprint.projectKey === projectKey && sprint.state === "closed")
      .sort((left, right) => (right.completeDate ?? "").localeCompare(left.completeDate ?? ""))
      .slice(0, limit);
  }

  async listIssuesBySprint(projectKey: string, sprintId: string): Promise<JiraIssueDto[]> {
    return [...this.issues.values()]
      .filter((issue) => issue.projectKey === projectKey && issue.sprintIds.includes(sprintId))
      .sort((left, right) => left.key.localeCompare(right.key));
  }

  async getIssue(issueKey: string): Promise<JiraIssueDto | undefined> {
    return this.issues.get(issueKey);
  }

  async findHistoricalIssues(projectKey: string): Promise<JiraIssueDto[]> {
    return [...this.issues.values()].filter((issue) => issue.projectKey === projectKey && issue.statusCategory === "Done");
  }

  async hasUsableData(): Promise<boolean> {
    return this.issues.size > 0;
  }
}
