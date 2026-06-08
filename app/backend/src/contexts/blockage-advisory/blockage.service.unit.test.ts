import { describe, expect, it } from "vitest";
import { ApiError } from "../../shared/http.js";
import {
  BlockageService,
  InMemoryBlockagePatternRepository,
  InMemoryBlockageRecommendationRepository
} from "./blockage.service.js";

const baseIssue = {
  key: "ICTFT-301",
  projectKey: "ICTFT",
  summary: "Payment integration blocked",
  description: "Blocked by upstream payment API dependency in staging.",
  issueType: "Story",
  statusCategory: "To Do",
  statusName: "Backlog",
  sprintIds: [],
  labels: ["blocked"],
  components: ["payments"]
};

describe("BlockageService", () => {
  it("enforces active pattern signal and action invariants", () => {
    const service = new BlockageService(new InMemoryBlockagePatternRepository());

    expect(() =>
      service.createPattern({
        name: "Invalid active pattern",
        keywords: [],
        componentHints: [],
        actions: ["Set owner."],
        active: true
      })
    ).toThrow(ApiError);

    const inactive = service.createPattern({
      name: "Inactive draft",
      keywords: [],
      componentHints: [],
      actions: [],
      active: false
    });

    expect(() => service.patchPattern(inactive.id, { active: true })).toThrow(ApiError);
  });

  it("combines issue text, components, local KB, and Jira examples", () => {
    const service = new BlockageService(new InMemoryBlockagePatternRepository());
    service.createPattern({
      name: "Payment dependency",
      keywords: ["upstream", "dependency"],
      componentHints: ["payments"],
      actions: ["Confirm upstream payment API owner and recovery date."],
      active: true
    });

    const recommendation = service.recommend(baseIssue.description ?? "", {
      issue: baseIssue,
      jiraExamples: [
        {
          ...baseIssue,
          key: "ICTFT-202",
          summary: "Payment API dependency resolved",
          statusCategory: "Done",
          sprintIds: ["sprint-1"],
          storyPoints: 5,
          timeSpentHours: 30
        }
      ]
    });

    expect(recommendation.confidence).toBeGreaterThan(0.7);
    expect(recommendation.evidence).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Local KB: Payment dependency"),
        expect.stringContaining("Jira example: ICTFT-202"),
        "Issue text: dependency or blocked wording"
      ])
    );
    expect(recommendation.actions).toContain("Confirm upstream payment API owner and recovery date.");
  });

  it("returns low-confidence warning when evidence is weak", () => {
    const service = new BlockageService(new InMemoryBlockagePatternRepository());
    const recommendation = service.recommend("Need environment access before release");

    expect(recommendation.confidence).toBeLessThan(0.5);
    expect(recommendation.warnings.map((warning) => warning.code)).toContain("LOW_CONFIDENCE");
  });

  it("persists blockage recommendations through the repository interface", () => {
    const recommendationRepository = new InMemoryBlockageRecommendationRepository();
    const service = new BlockageService(new InMemoryBlockagePatternRepository(), recommendationRepository);

    const recommendation = service.recommend("blocked by dependency", { issue: baseIssue });

    expect(recommendationRepository.listBlockageRecommendations("ICTFT-301")).toEqual([recommendation]);
  });
});
