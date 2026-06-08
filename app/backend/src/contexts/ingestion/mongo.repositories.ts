import type { JiraIssueDto, JiraSprintDto, SyncRunDto } from "@module1/contracts";
import { MongoClient, type Collection, type Db, type Filter } from "mongodb";
import type {
  BacklogFilters,
  BacklogListResult,
  CatalogRepositories,
  FieldMappingDto,
  UpsertCatalogInput,
  UpsertCatalogResult
} from "./repositories.js";

export class MongoCatalogRepositories implements CatalogRepositories {
  private readonly client: MongoClient;
  private db: Db | undefined;

  constructor(
    mongoUri: string,
    private readonly dbName: string
  ) {
    this.client = new MongoClient(mongoUri);
  }

  async ensureReady(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    await Promise.all([
      this.issues.createIndex({ key: 1 }, { unique: true }),
      this.issues.createIndex({ projectKey: 1, statusCategory: 1 }),
      this.issues.createIndex({ projectKey: 1, issueType: 1 }),
      this.issues.createIndex({ labels: 1 }),
      this.issues.createIndex({ components: 1 }),
      this.sprints.createIndex({ id: 1 }, { unique: true }),
      this.sprints.createIndex({ projectKey: 1, state: 1, completeDate: -1 }),
      this.fieldMappings.createIndex({ id: 1 }, { unique: true }),
      this.syncRuns.createIndex({ startedAt: -1 })
    ]);
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  async listProjectKeys(): Promise<string[]> {
    return (await this.issues.distinct("projectKey")).sort();
  }

  async latestSyncRun(): Promise<SyncRunDto | undefined> {
    return (await this.syncRuns.find().sort({ startedAt: -1 }).limit(1).next()) ?? undefined;
  }

  async lastSuccessfulSyncRun(): Promise<SyncRunDto | undefined> {
    return (
      (await this.syncRuns
        .find({ status: { $in: ["success", "warning"] } })
        .sort({ completedAt: -1, startedAt: -1 })
        .limit(1)
        .next()) ?? undefined
    );
  }

  async createSyncRun(run: SyncRunDto): Promise<void> {
    await this.syncRuns.insertOne(run);
  }

  async updateSyncRun(run: SyncRunDto): Promise<void> {
    await this.syncRuns.updateOne({ id: run.id }, { $set: run }, { upsert: true });
  }

  async upsertCatalog(input: UpsertCatalogInput): Promise<UpsertCatalogResult> {
    await Promise.all([
      ...input.issues.map((issue) => this.issues.updateOne({ key: issue.key }, { $set: issue }, { upsert: true })),
      ...input.sprints.map((sprint) => this.sprints.updateOne({ id: sprint.id }, { $set: sprint }, { upsert: true })),
      ...input.fieldMappings.map((mapping) => this.fieldMappings.updateOne({ id: mapping.id }, { $set: mapping }, { upsert: true }))
    ]);

    return {
      issueUpserts: input.issues.length,
      sprintUpserts: input.sprints.length,
      fieldMappingUpserts: input.fieldMappings.length
    };
  }

  async listBacklog(filters: BacklogFilters): Promise<BacklogListResult> {
    const query: Filter<JiraIssueDto> = {
      projectKey: filters.projectKey,
      statusCategory: { $ne: "Done" }
    };
    if (filters.issueType) query.issueType = filters.issueType;
    if (filters.statusCategory) query.statusCategory = filters.statusCategory;
    if (filters.label) query.labels = filters.label;
    if (filters.component) query.components = filters.component;
    if (filters.search) {
      const escaped = escapeRegex(filters.search);
      query.$or = [{ key: new RegExp(escaped, "i") }, { summary: new RegExp(escaped, "i") }, { description: new RegExp(escaped, "i") }];
    }

    const skip = (filters.page - 1) * filters.pageSize;
    const [issues, total] = await Promise.all([
      this.issues.find(query).sort({ updatedAt: -1, key: 1 }).skip(skip).limit(filters.pageSize).toArray(),
      this.issues.countDocuments(query)
    ]);

    return { issues: issues.map(normalizeStoredIssue), total };
  }

  async listClosedSprints(projectKey: string, limit: number): Promise<JiraSprintDto[]> {
    return await this.sprints.find({ projectKey, state: "closed" }).sort({ completeDate: -1 }).limit(limit).toArray();
  }

  async getIssue(issueKey: string): Promise<JiraIssueDto | undefined> {
    const issue = await this.issues.findOne({ key: issueKey });
    return issue ? normalizeStoredIssue(issue) : undefined;
  }

  async findHistoricalIssues(projectKey: string): Promise<JiraIssueDto[]> {
    const issues = await this.issues.find({ projectKey, statusCategory: "Done" }).sort({ updatedAt: -1, key: 1 }).toArray();
    return issues.map(normalizeStoredIssue);
  }

  async hasUsableData(): Promise<boolean> {
    return (await this.issues.estimatedDocumentCount()) > 0;
  }

  private get database(): Db {
    if (!this.db) {
      throw new Error("Mongo catalog repository is not ready.");
    }
    return this.db;
  }

  private get issues(): Collection<JiraIssueDto> {
    return this.database.collection<JiraIssueDto>("jira_issues");
  }

  private get sprints(): Collection<JiraSprintDto> {
    return this.database.collection<JiraSprintDto>("jira_sprints");
  }

  private get fieldMappings(): Collection<FieldMappingDto> {
    return this.database.collection<FieldMappingDto>("jira_field_mappings");
  }

  private get syncRuns(): Collection<SyncRunDto> {
    return this.database.collection<SyncRunDto>("sync_runs");
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeStoredIssue(issue: JiraIssueDto): JiraIssueDto {
  return {
    ...issue,
    sprintIds: Array.isArray(issue.sprintIds) ? issue.sprintIds : [],
    labels: Array.isArray(issue.labels) ? issue.labels : [],
    components: Array.isArray(issue.components) ? issue.components : []
  };
}
