import type {
  BottleneckGroupDto,
  CreateSprintDemoReportRequest,
  EvidenceIssueDto,
  JiraIssueDto,
  JiraSprintDto,
  ReviewableSprintDto,
  SessionUserDto,
  SourceRefDto,
  SprintDemoReportDto,
  SprintEvidenceDto,
  SprintRemarkDto,
  VarianceAnalyticsDto,
  VarianceMetricDto,
  WarningDto
} from "@module1/contracts";
import { randomUUID } from "node:crypto";
import { ApiError } from "../../shared/http.js";
import type { CatalogService } from "../ingestion/catalog.service.js";

type Clock = () => Date;

export class SprintReviewService {
  private readonly remarks = new Map<string, SprintRemarkDto[]>();
  private readonly reports = new Map<string, SprintDemoReportDto>();

  constructor(
    private readonly catalog: CatalogService,
    private readonly defaultProjectKey: string,
    private readonly hoursPerStoryPoint: number,
    private readonly clock: Clock = () => new Date()
  ) {}

  async listReviewableSprints(projectKey = this.defaultProjectKey, limit = 10) {
    const { sprints, warnings } = await this.catalog.listClosedSprints(projectKey, limit);
    const reviewable = await Promise.all(sprints.map((sprint) => this.toReviewableSprint(sprint)));
    return {
      sprints: reviewable,
      warnings: reviewable.length
        ? warnings
        : [{ code: "NO_REVIEWABLE_SPRINTS", message: "Review edilebilir kapali sprint bulunamadi.", severity: "info" as const }]
    };
  }

  async getEvidence(sprintId: string, projectKey = this.defaultProjectKey): Promise<SprintEvidenceDto> {
    const sprint = await this.getSprint(projectKey, sprintId);
    const issues = await this.catalog.listIssuesBySprint(projectKey, sprintId);
    const now = this.now();
    const snapshotRef = sourceRef("jira-snapshot", sprint.id, sprint.completeDate ?? now);
    const planned = issues;
    const completed = issues.filter((issue) => issue.statusCategory === "Done");
    const incomplete = issues.filter((issue) => issue.statusCategory !== "Done");
    const warnings: WarningDto[] = [];
    if (!issues.length) {
      warnings.push({ code: "SPARSE_EVIDENCE", message: "Sprint icin issue evidence az veya yok.", severity: "warning" });
    }
    if (issues.some((issue) => issue.timeSpentHours === undefined)) {
      warnings.push({ code: "MISSING_TIME_SPENT", message: "Bazi saat verileri eksik; fallback saat kullanildi.", severity: "warning" });
    }

    const evidence: SprintEvidenceDto = {
      id: `evidence:${projectKey}:${sprintId}`,
      sprint: await this.toReviewableSprint(sprint),
      snapshots: [
        {
          id: `snapshot:${sprintId}:start`,
          sprintId,
          projectKey,
          kind: "start",
          capturedAt: sprint.startDate ?? sprint.completeDate ?? now,
          sourceRef: snapshotRef,
          issueCount: planned.length,
          storyPointsTotal: sumStoryPoints(planned),
          hoursTotal: sumHours(planned),
          warnings: []
        },
        {
          id: `snapshot:${sprintId}:close`,
          sprintId,
          projectKey,
          kind: "close",
          capturedAt: sprint.completeDate ?? now,
          sourceRef: snapshotRef,
          issueCount: completed.length,
          storyPointsTotal: sumStoryPoints(completed),
          hoursTotal: sumHours(completed),
          warnings
        }
      ],
      completedItems: completed.map((issue) => this.toEvidenceIssue(issue, "completed")),
      incompleteItems: incomplete.map((issue) => this.toEvidenceIssue(issue, "incomplete")),
      removedItems: [],
      pullRequests: [],
      commits: [],
      closingRemarks: (this.remarks.get(sprintId) ?? []).map((remark) => ({
        id: remark.id,
        text: remark.text,
        source: "manager-remark",
        authorDisplayName: remark.author.displayName,
        createdAt: remark.createdAt,
        sourceRef: remark.sourceRef
      })),
      unmatchedEvidence: [],
      warnings,
      generatedAt: now
    };
    return evidence;
  }

  async addRemark(sprintId: string, text: string, user: SessionUserDto): Promise<SprintRemarkDto> {
    if (user.role !== "manager" && user.role !== "admin") {
      throw new ApiError(403, "FORBIDDEN", "Manager or admin role is required.");
    }
    if (!text.trim()) {
      throw new ApiError(400, "INVALID_REQUEST", "Remark text cannot be empty.");
    }
    const remark: SprintRemarkDto = {
      id: randomUUID(),
      sprintId,
      text: text.trim(),
      author: {
        id: user.id,
        displayName: user.displayName,
        role: user.role
      },
      createdAt: this.now(),
      sourceRef: sourceRef("manager-remark", sprintId, this.now())
    };
    this.remarks.set(sprintId, [...(this.remarks.get(sprintId) ?? []), remark]);
    return remark;
  }

  async createReport(input: CreateSprintDemoReportRequest, user: SessionUserDto): Promise<SprintDemoReportDto> {
    if (user.role !== "manager" && user.role !== "admin") {
      throw new ApiError(403, "FORBIDDEN", "Manager or admin role is required.");
    }
    const projectKey = input.projectKey ?? this.defaultProjectKey;
    const evidence = await this.getEvidence(input.sprintId, projectKey);
    const allRemarks = this.remarks.get(input.sprintId) ?? [];
    const remarks = input.includeRemarkIds ? allRemarks.filter((remark) => input.includeRemarkIds?.includes(remark.id)) : allRemarks;
    const version = [...this.reports.values()].filter((report) => report.sprintId === input.sprintId).length + 1;
    const report: SprintDemoReportDto = {
      id: randomUUID(),
      sprintId: input.sprintId,
      projectKey,
      version,
      title: `${evidence.sprint.name} Sprint Demo Raporu`,
      language: "tr",
      provider: {
        name: "heuristic",
        promptVersion: "heuristic-tr-v1",
        fallbackUsed: input.provider === "openrouter",
        anonymized: input.provider === "openrouter"
      },
      sections: buildSections(evidence, remarks),
      source: {
        evidenceSetId: evidence.id,
        remarkIds: remarks.map((remark) => remark.id),
        sourceRefs: [...evidence.sprint.sourceRefs, ...remarks.map((remark) => remark.sourceRef)]
      },
      markdown: "",
      warnings: input.provider === "openrouter"
        ? [{ code: "PROVIDER_FALLBACK_USED", message: "OpenRouter P2; heuristik ozet kullanildi.", severity: "info" }]
        : evidence.warnings,
      createdBy: user.id,
      createdAt: this.now()
    };
    report.markdown = renderMarkdown(report);
    this.reports.set(report.id, report);
    return report;
  }

  getReport(id: string): SprintDemoReportDto {
    const report = this.reports.get(id);
    if (!report) {
      throw new ApiError(404, "NOT_FOUND", "Report was not found.");
    }
    return report;
  }

  async computeVariance(projectKey: string, sprintId: string, trendWindow: number): Promise<VarianceAnalyticsDto> {
    const evidence = await this.getEvidence(sprintId, projectKey);
    const start = evidence.snapshots.find((snapshot) => snapshot.kind === "start");
    const close = evidence.snapshots.find((snapshot) => snapshot.kind === "close");
    const warnings = [...evidence.warnings];
    const plannedSp = start?.storyPointsTotal ?? 0;
    const actualSp = close?.storyPointsTotal ?? 0;
    const plannedHours = start?.hoursTotal ?? plannedSp * this.hoursPerStoryPoint;
    const actualHours = close?.hoursTotal ?? actualSp * this.hoursPerStoryPoint;
    if (plannedSp === 0) {
      warnings.push({ code: "ZERO_PLANNED_BASELINE", message: "Planlanan baseline 0; yuzde delta hesaplanmadi.", severity: "warning" });
    }
    const history = await this.catalog.listClosedSprints(projectKey, trendWindow);
    if (history.sprints.length < 3) {
      warnings.push(...history.warnings);
    }

    return {
      id: `variance:${projectKey}:${sprintId}`,
      projectKey,
      sprintId,
      trendWindow,
      baselines: {
        startSnapshotId: start?.id,
        closeSnapshotId: close?.id
      },
      storyPoints: metric(plannedSp, actualSp, false),
      hours: metric(plannedHours, actualHours, evidence.warnings.some((warning) => warning.code === "MISSING_TIME_SPENT")),
      velocityTrend: await Promise.all(
        history.sprints.map(async (sprint) => {
          const sprintIssues = await this.catalog.listIssuesBySprint(projectKey, sprint.id);
          const completed = sprintIssues.filter((issue) => issue.statusCategory === "Done");
          return {
            sprintId: sprint.id,
            sprintName: sprint.name,
            completedStoryPoints: sumStoryPoints(completed),
            completedHours: sumHours(completed) ?? sumStoryPoints(completed) * this.hoursPerStoryPoint,
            completeDate: sprint.completeDate
          };
        })
      ),
      bottlenecks: bottlenecks(evidence.incompleteItems),
      warnings,
      computedAt: this.now()
    };
  }

  private async getSprint(projectKey: string, sprintId: string): Promise<JiraSprintDto> {
    const { sprints } = await this.catalog.listClosedSprints(projectKey, 50);
    const sprint = sprints.find((item) => item.id === sprintId);
    if (!sprint) {
      throw new ApiError(404, "NOT_FOUND", "Sprint was not found.");
    }
    return sprint;
  }

  private async toReviewableSprint(sprint: JiraSprintDto): Promise<ReviewableSprintDto> {
    const issues = await this.catalog.listIssuesBySprint(sprint.projectKey, sprint.id);
    const reports = [...this.reports.values()].filter((report) => report.sprintId === sprint.id);
    const warnings = issues.length ? [] : [{ code: "SPARSE_EVIDENCE", message: "Sprint evidence sparse.", severity: "warning" as const }];
    return {
      ...sprint,
      evidenceStatus: issues.length ? "ready" : "sparse",
      reportCount: reports.length,
      latestReportId: reports.at(-1)?.id,
      sourceRefs: [sourceRef("jira-snapshot", sprint.id, sprint.completeDate ?? this.now())],
      warnings
    };
  }

  private toEvidenceIssue(issue: JiraIssueDto, completionState: EvidenceIssueDto["completionState"]): EvidenceIssueDto {
    const ref = sourceRef("jira-snapshot", issue.key, issue.updatedAt ?? this.now());
    const dto: EvidenceIssueDto = {
      key: issue.key,
      projectKey: issue.projectKey,
      summary: issue.summary,
      issueType: issue.issueType,
      statusCategory: issue.statusCategory,
      statusName: issue.statusName,
      storyPoints: issue.storyPoints,
      timeSpentHours: issue.timeSpentHours,
      labels: issue.labels,
      components: issue.components,
      completionState,
      statusHistory: [
        {
          toStatus: issue.statusName ?? issue.statusCategory ?? "Unknown",
          statusCategory: issue.statusCategory,
          changedAt: issue.updatedAt ?? this.now(),
          sourceRef: ref
        }
      ],
      sourceRefs: [ref],
      warnings: issue.timeSpentHours === undefined ? [{ code: "MISSING_TIME_SPENT", message: "timeSpentHours eksik.", severity: "warning" }] : []
    };
    return dto;
  }

  private now(): string {
    return this.clock().toISOString();
  }
}

function sourceRef(sourceType: SourceRefDto["sourceType"], externalId: string, capturedAt: string): SourceRefDto {
  return { sourceType, externalId, capturedAt };
}

function sumStoryPoints(issues: JiraIssueDto[] | EvidenceIssueDto[]): number {
  return issues.reduce((total, issue) => total + (issue.storyPoints ?? 0), 0);
}

function sumHours(issues: JiraIssueDto[] | EvidenceIssueDto[]): number | undefined {
  if (issues.some((issue) => issue.timeSpentHours === undefined)) return undefined;
  return issues.reduce((total, issue) => total + (issue.timeSpentHours ?? 0), 0);
}

function metric(planned: number, actual: number, usedFallback: boolean): VarianceMetricDto {
  const delta = actual - planned;
  return {
    planned,
    actual,
    delta,
    deltaPercent: planned === 0 ? null : Math.round((delta / planned) * 10000) / 100,
    direction: delta > 0 ? "ahead" : delta < 0 ? "behind" : "on-track",
    usedFallback
  };
}

function bottlenecks(items: EvidenceIssueDto[]): BottleneckGroupDto[] {
  const groups = new Map<string, EvidenceIssueDto[]>();
  for (const item of items) {
    groups.set(item.issueType ?? "Unknown", [...(groups.get(item.issueType ?? "Unknown") ?? []), item]);
  }
  return [...groups.entries()].map(([groupKey, grouped]) => ({
    groupType: "issueType",
    groupKey,
    plannedStoryPoints: sumStoryPoints(grouped),
    actualStoryPoints: 0,
    spilloverStoryPoints: sumStoryPoints(grouped),
    itemCount: grouped.length,
    warnings: []
  }));
}

function buildSections(evidence: SprintEvidenceDto, remarks: SprintRemarkDto[]) {
  const completed = evidence.completedItems.map((item) => `${item.key}: ${item.summary}`);
  const incomplete = evidence.incompleteItems.map((item) => `${item.key}: ${item.summary}`);
  return [
    {
      key: "executive-summary" as const,
      title: "Yonetici Ozeti",
      items: [`${evidence.sprint.name} icinde ${completed.length} is tamamlandi, ${incomplete.length} is devretti.`]
    },
    { key: "completed-work" as const, title: "Tamamlanan Isler", items: completed.length ? completed : ["Tamamlanan is kaydi yok."] },
    {
      key: "demo-notes" as const,
      title: "Demo Notlari",
      items: remarks.length ? remarks.map((remark) => remark.text) : ["Demo icin yonetici notu eklenmedi."]
    },
    { key: "risks" as const, title: "Riskler", items: incomplete.length ? incomplete : ["Belirgin risk bulunmadi."] },
    { key: "blockers" as const, title: "Blokajlar", items: evidence.warnings.map((warning) => warning.message) },
    {
      key: "warnings" as const,
      title: "Uyarilar",
      items: evidence.warnings.length ? evidence.warnings.map((warning) => `${warning.code}: ${warning.message}`) : ["Aktif uyari yok."]
    },
    { key: "next-actions" as const, title: "Sonraki Aksiyonlar", items: incomplete.length ? ["Devreden isleri sonraki sprint planina tasi."] : ["Demo kaydini paylas."] }
  ];
}

function renderMarkdown(report: SprintDemoReportDto): string {
  const sections = report.sections
    .map((section) => `## ${section.title}\n${section.items.map((item) => `- ${item}`).join("\n")}`)
    .join("\n\n");
  return `# ${report.title}\n\nRapor ID: ${report.id}\nVersion: ${report.version}\n\n${sections}\n`;
}
