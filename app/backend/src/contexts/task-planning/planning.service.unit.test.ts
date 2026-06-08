import type { JiraIssueDto } from "@module1/contracts";
import { describe, expect, it, vi } from "vitest";
import { PlanningInputService, type PlanningIssueCatalog } from "./planning.service.js";
import { InMemoryPlanningInputRepository } from "./repositories.js";

const clock = () => new Date("2026-06-08T10:00:00.000Z");

describe("PlanningInputService", () => {
  it("creates manual input without reading the Module 1 catalog", async () => {
    const catalog: PlanningIssueCatalog = { getIssue: vi.fn() };
    const service = new PlanningInputService(new InMemoryPlanningInputRepository(), catalog, clock);

    const input = await service.create(
      {
        sourceType: "manual",
        title: "Build planning workflow",
        description: "Create an Express API and React screen for task planning.",
        acceptanceCriteria: ["The user can create a plan."]
      },
      "user-1"
    );

    expect(catalog.getIssue).not.toHaveBeenCalled();
    expect(input).toMatchObject({
      sourceType: "manual",
      title: "Build planning workflow",
      createdBy: "user-1",
      createdAt: "2026-06-08T10:00:00.000Z"
    });
  });

  it("freezes a Jira issue snapshot and warns for missing acceptance criteria", async () => {
    const issue: JiraIssueDto = {
      key: "ICTFT-42",
      projectKey: "ICTFT",
      summary: "Build planning workflow",
      description: "Create an Express API and React screen for task planning.",
      sprintIds: [],
      labels: ["planning"],
      components: ["backend"]
    };
    const catalog: PlanningIssueCatalog = { getIssue: vi.fn().mockResolvedValue(issue) };
    const service = new PlanningInputService(new InMemoryPlanningInputRepository(), catalog, clock);

    const input = await service.create({ sourceType: "jira-issue", issueKey: issue.key }, "user-1");
    issue.summary = "Changed after capture";

    expect(input.sourceSnapshot.jiraIssue?.summary).toBe("Build planning workflow");
    expect(input.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "MISSING_ACCEPTANCE_CRITERIA" })])
    );
  });
});
