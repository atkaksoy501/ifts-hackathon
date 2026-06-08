import { describe, expect, it } from "vitest";
import { CatalogService } from "./catalog.service.js";
import { InMemoryCatalogRepositories } from "./repositories.js";
import type { GitHubStateClient } from "./github-state.client.js";

describe("CatalogService", () => {
  it("seeds dummy Jira data when first sync fails and catalog is empty", async () => {
    const repositories = new InMemoryCatalogRepositories();
    const service = new CatalogService(
      repositories,
      new FailingGitHubStateClient("jira bridge offline"),
      "ICTFT",
      () => new Date("2026-06-08T00:00:00.000Z")
    );

    const run = await service.runManualSync();

    expect(run.status).toBe("warning");
    expect(run.issueUpserts).toBeGreaterThan(0);
    expect(run.sprintUpserts).toBeGreaterThan(0);
    expect(run.error).toBe("jira bridge offline");
    expect(run.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "DUMMY_JIRA_FALLBACK" })]));
    await expect(repositories.hasUsableData()).resolves.toBe(true);
    await expect(repositories.getIssue("ICTFT-201")).resolves.toMatchObject({
      key: "ICTFT-201",
      summary: "Seçilen issue için sizing önerisi göster"
    });
  });

  it("keeps failure status when sync fails after usable data already exists", async () => {
    const repositories = new InMemoryCatalogRepositories({
      issues: [
        {
          key: "ICTFT-501",
          projectKey: "ICTFT",
          summary: "Existing real issue",
          statusCategory: "To Do",
          sprintIds: [],
          labels: [],
          components: []
        }
      ],
      sprints: [],
      fieldMappings: []
    });
    const service = new CatalogService(repositories, new FailingGitHubStateClient("jira bridge offline"), "ICTFT");

    const run = await service.runManualSync();

    expect(run.status).toBe("failed");
    await expect(repositories.getIssue("ICTFT-501")).resolves.toMatchObject({ key: "ICTFT-501" });
    await expect(repositories.getIssue("ICTFT-201")).resolves.toBeUndefined();
  });
});

class FailingGitHubStateClient implements GitHubStateClient {
  constructor(private readonly message: string) {}

  async fetchState(): Promise<unknown> {
    throw new Error(this.message);
  }
}
