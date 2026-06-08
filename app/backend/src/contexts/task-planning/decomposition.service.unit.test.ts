import { describe, expect, it } from "vitest";
import { DecompositionService } from "./decomposition.service.js";
import { PlanningInputService } from "./planning.service.js";
import { InMemoryDecompositionRunRepository, InMemoryPlanningInputRepository } from "./repositories.js";

describe("DecompositionService", () => {
  it("creates deterministic domain tasks with valid internal dependencies", async () => {
    const planning = new PlanningInputService(
      new InMemoryPlanningInputRepository(),
      { getIssue: async () => Promise.reject(new Error("catalog should not be called")) },
      () => new Date("2026-06-08T10:00:00.000Z")
    );
    const service = new DecompositionService(
      planning,
      new InMemoryDecompositionRunRepository(),
      undefined,
      () => new Date("2026-06-08T10:01:00.000Z")
    );

    const run = await service.run(
      {
        input: {
          sourceType: "manual",
          title: "Customer planning dashboard",
          description: "Build React UI, Express API, MongoDB persistence, auth controls, and automated tests.",
          acceptanceCriteria: ["Authenticated user can save and view a plan."]
        }
      },
      { id: "user-1" }
    );

    const taskIds = new Set(run.subTasks.map((task) => task.id));
    expect(run.subTasks.map((task) => task.domain)).toEqual(
      expect.arrayContaining(["frontend", "backend", "database", "security", "qa"])
    );
    expect(run.subTasks.every((task) => task.estimateHours > 0)).toBe(true);
    expect(run.subTasks.flatMap((task) => task.dependencies).every((id) => taskIds.has(id))).toBe(true);
  });

  it("falls back to heuristic when OpenRouter is requested", async () => {
    const planning = new PlanningInputService(new InMemoryPlanningInputRepository(), {
      getIssue: async () => Promise.reject(new Error("catalog should not be called"))
    });
    const service = new DecompositionService(planning, new InMemoryDecompositionRunRepository());

    const run = await service.run(
      {
        provider: "openrouter",
        input: {
          sourceType: "manual",
          title: "Build API",
          description: "Implement an Express endpoint and test its behavior."
        }
      },
      { id: "user-1" }
    );

    expect(run.provider).toBe("heuristic");
    expect(run.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "PROVIDER_FALLBACK_USED" })]));
  });
});
