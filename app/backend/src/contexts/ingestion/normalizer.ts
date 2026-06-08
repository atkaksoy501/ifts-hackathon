import type { JiraIssueDto, JiraSprintDto, WarningDto } from "@module1/contracts";
import type { FieldMappingDto, UpsertCatalogInput } from "./repositories.js";

export type NormalizedGitHubState = UpsertCatalogInput & {
  warnings: WarningDto[];
};

export function normalizeGitHubState(state: unknown, defaultProjectKey: string): NormalizedGitHubState {
  const root = asRecord(state);
  const issuesInput = arrayFrom(root.issues ?? root.jiraIssues ?? root.backlog ?? root.items);
  const sprintsInput = arrayFrom(root.sprints ?? root.jiraSprints ?? root.closedSprints);
  const fieldMappingsInput = root.fieldMappings ?? root.fields ?? [];
  const warnings = normalizeWarnings(root.warnings);

  const issues: JiraIssueDto[] = [];
  for (const rawIssue of issuesInput) {
    const issue = normalizeIssue(rawIssue, defaultProjectKey, warnings);
    if (issue) issues.push(issue);
  }

  const sprints: JiraSprintDto[] = [];
  for (const rawSprint of sprintsInput) {
    const sprint = normalizeSprint(rawSprint, defaultProjectKey, warnings);
    if (sprint) sprints.push(sprint);
  }

  return {
    issues,
    sprints,
    fieldMappings: normalizeFieldMappings(fieldMappingsInput, defaultProjectKey),
    warnings
  };
}

function normalizeIssue(raw: unknown, defaultProjectKey: string, warnings: WarningDto[]): JiraIssueDto | undefined {
  const issue = asRecord(raw);
  const fields = asRecord(issue.fields);
  const key = stringValue(issue.key);
  const projectKey = stringValue(issue.projectKey) ?? stringValue(asRecord(fields.project).key) ?? key?.split("-")[0] ?? defaultProjectKey;
  const summary = stringValue(issue.summary) ?? stringValue(fields.summary);

  if (!key || !summary) {
    warnings.push({
      code: "ISSUE_SKIPPED",
      message: "Issue was skipped because key or summary was missing.",
      severity: "warning"
    });
    return undefined;
  }

  const description = stringValue(issue.description) ?? stringValue(fields.description);
  const storyPoints = numberValue(issue.storyPoints ?? issue.storyPoint ?? fields.storyPoints ?? fields.storyPoint ?? firstCustomNumber(fields));
  const timeSpentHours =
    numberValue(issue.timeSpentHours ?? issue.hoursSpent ?? fields.timeSpentHours ?? fields.hoursSpent) ??
    secondsToHours(numberValue(asRecord(fields.timetracking).timeSpentSeconds ?? fields.timespent));
  const statusCategory =
    stringValue(issue.statusCategory) ??
    stringValue(asRecord(issue.status).statusCategory) ??
    stringValue(asRecord(asRecord(fields.status).statusCategory).name);

  const dto: JiraIssueDto = {
    key,
    projectKey,
    summary,
    sprintIds: stringArray(issue.sprintIds ?? issue.sprints ?? fields.sprintIds ?? fields.sprints, "id"),
    labels: stringArray(issue.labels ?? fields.labels),
    components: stringArray(issue.components ?? fields.components, "name")
  };

  assignOptional(dto, "description", description);
  assignOptional(dto, "issueType", stringValue(issue.issueType) ?? stringValue(asRecord(fields.issuetype).name));
  assignOptional(dto, "statusCategory", statusCategory);
  assignOptional(dto, "statusName", stringValue(issue.statusName) ?? stringValue(asRecord(issue.status).name) ?? stringValue(asRecord(fields.status).name));
  assignOptional(dto, "storyPoints", storyPoints);
  assignOptional(dto, "timeSpentHours", timeSpentHours);
  assignOptional(dto, "updatedAt", stringValue(issue.updatedAt) ?? stringValue(fields.updated));

  if (!description) {
    warnings.push({ code: "ISSUE_DESCRIPTION_MISSING", message: `${key} has no description.`, severity: "info" });
  }
  if (storyPoints === undefined && statusCategory === "Done") {
    warnings.push({ code: "STORY_POINTS_MISSING", message: `${key} has no story point value.`, severity: "warning" });
  }

  return dto;
}

function normalizeSprint(raw: unknown, defaultProjectKey: string, warnings: WarningDto[]): JiraSprintDto | undefined {
  const sprint = asRecord(raw);
  const id = stringValue(sprint.id);
  const name = stringValue(sprint.name);
  const state = stringValue(sprint.state)?.toLowerCase();

  if (!id || !name) {
    warnings.push({ code: "SPRINT_SKIPPED", message: "Sprint was skipped because id or name was missing.", severity: "warning" });
    return undefined;
  }
  if (state !== "closed") return undefined;

  const dto: JiraSprintDto = {
    id,
    name,
    state: "closed",
    projectKey: stringValue(sprint.projectKey) ?? defaultProjectKey
  };

  assignOptional(dto, "startDate", stringValue(sprint.startDate));
  assignOptional(dto, "endDate", stringValue(sprint.endDate));
  assignOptional(dto, "completeDate", stringValue(sprint.completeDate));
  return dto;
}

function normalizeWarnings(raw: unknown): WarningDto[] {
  return arrayFrom(raw).flatMap((entry) => {
    const warning = asRecord(entry);
    const code = stringValue(warning.code);
    const message = stringValue(warning.message);
    if (!code || !message) return [];
    return [{ code, message, severity: warning.severity === "info" ? "info" : "warning" as const }];
  });
}

function normalizeFieldMappings(raw: unknown, defaultProjectKey: string): FieldMappingDto[] {
  if (!Array.isArray(raw) && raw && typeof raw === "object") {
    return Object.entries(raw).flatMap(([fieldKey, value]) => {
      const name = stringValue(value) ?? fieldKey;
      return [{ id: `${defaultProjectKey}:${fieldKey}`, projectKey: defaultProjectKey, fieldKey, name }];
    });
  }

  return arrayFrom(raw).flatMap((entry) => {
    const mapping = asRecord(entry);
    const fieldKey = stringValue(mapping.fieldKey ?? mapping.id ?? mapping.key);
    if (!fieldKey) return [];
    const projectKey = stringValue(mapping.projectKey) ?? defaultProjectKey;
    return [
      {
        id: stringValue(mapping.id) ?? `${projectKey}:${fieldKey}`,
        projectKey,
        fieldKey,
        name: stringValue(mapping.name) ?? fieldKey
      }
    ];
  });
}

function firstCustomNumber(fields: Record<string, unknown>): number | undefined {
  for (const [key, value] of Object.entries(fields)) {
    if (key.startsWith("customfield_")) {
      const parsed = numberValue(value);
      if (parsed !== undefined) return parsed;
    }
  }
  return undefined;
}

function secondsToHours(seconds: number | undefined): number | undefined {
  return seconds === undefined ? undefined : Math.round((seconds / 3600) * 100) / 100;
}

function stringArray(value: unknown, objectKey?: string): string[] {
  return arrayFrom(value).flatMap((entry) => {
    const parsed = stringValue(entry) ?? stringValue(objectKey ? asRecord(entry)[objectKey] : entry);
    return parsed ? [parsed] : [];
  });
}

function arrayFrom(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function assignOptional<T extends object, K extends string, V>(target: T, key: K, value: V | undefined): asserts target is T & Record<K, V> {
  if (value !== undefined) {
    Object.assign(target, { [key]: value });
  }
}
