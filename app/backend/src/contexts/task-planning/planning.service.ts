import type { CreatePlanningInputRequest, JiraIssueDto, PlanningInputDto, WarningDto } from "@module1/contracts";
import { randomUUID } from "node:crypto";
import { ApiError } from "../../shared/http.js";
import type { PlanningInputRepository } from "./repositories.js";

export interface PlanningIssueCatalog {
  getIssue(issueKey: string, projectKey?: string): Promise<JiraIssueDto>;
}

export type PlanningClock = () => Date;

export class PlanningInputService {
  constructor(
    private readonly repository: PlanningInputRepository,
    private readonly catalog: PlanningIssueCatalog,
    private readonly clock: PlanningClock = () => new Date()
  ) {}

  async create(request: CreatePlanningInputRequest, createdBy: string): Promise<PlanningInputDto> {
    const createdAt = this.clock().toISOString();
    const acceptanceCriteria = cleanList(request.acceptanceCriteria);
    const constraints = cleanList(request.constraints);
    const tags = cleanList(request.tags);
    const warnings: WarningDto[] = [];

    if (acceptanceCriteria.length === 0) {
      warnings.push({
        code: "MISSING_ACCEPTANCE_CRITERIA",
        message: "Acceptance criteria are missing; decomposition confidence may be lower.",
        severity: "warning"
      });
    }

    let input: PlanningInputDto;
    if (request.sourceType === "manual") {
      const title = request.title.trim();
      const description = request.description.trim();
      addDescriptionWarnings(description, warnings);
      input = {
        id: randomUUID(),
        sourceType: "manual",
        ...(request.projectKey ? { projectKey: request.projectKey } : {}),
        title,
        description,
        acceptanceCriteria,
        constraints,
        tags,
        sourceSnapshot: {
          sourceType: "manual",
          manual: { title, description },
          capturedAt: createdAt
        },
        warnings,
        createdBy,
        createdAt
      };
    } else {
      const issue = await this.catalog.getIssue(request.issueKey, request.projectKey);
      const description = issue.description?.trim() || issue.summary;
      addDescriptionWarnings(description, warnings);
      input = {
        id: randomUUID(),
        sourceType: "jira-issue",
        issueKey: issue.key,
        projectKey: issue.projectKey,
        title: issue.summary,
        description,
        acceptanceCriteria,
        constraints,
        tags: [...new Set([...tags, ...issue.labels, ...issue.components])],
        sourceSnapshot: {
          sourceType: "jira-issue",
          jiraIssue: structuredClone(issue),
          capturedAt: createdAt
        },
        warnings,
        createdBy,
        createdAt
      };
    }

    await this.repository.save(input);
    return input;
  }

  async getById(id: string): Promise<PlanningInputDto> {
    const input = await this.repository.getById(id);
    if (!input) throw new ApiError(404, "NOT_FOUND", "Planning input was not found.");
    return input;
  }
}

function cleanList(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function addDescriptionWarnings(description: string, warnings: WarningDto[]) {
  if (description.length < 40) {
    warnings.push({
      code: "SHORT_DESCRIPTION",
      message: "Task description is short; decomposition may need review.",
      severity: "warning"
    });
  }
}
