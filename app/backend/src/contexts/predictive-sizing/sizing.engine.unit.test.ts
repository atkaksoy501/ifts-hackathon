import { describe, expect, it } from "vitest";
import { InMemorySizingRecommendationRepository, SizingEngine, tokenize } from "./sizing.engine.js";

const baseIssue = {
  projectKey: "ICTFT",
  issueType: "Story",
  statusName: "Done",
  sprintIds: ["sprint-1"],
  labels: ["sizing"],
  components: ["recommendation"]
};

describe("SizingEngine", () => {
  it("ranks by deterministic TF-IDF and keyword hybrid signals", () => {
    const target = {
      ...baseIssue,
      key: "ICTFT-10",
      summary: "Payment webhook retry sizing",
      description: "Retry failed payment webhook callbacks for billing",
      statusCategory: "To Do",
      labels: ["billing"],
      components: ["payments"]
    };

    const recommendation = new SizingEngine({ hoursPerStoryPoint: 6 }).recommend(target, [
      {
        ...baseIssue,
        key: "ICTFT-12",
        summary: "Profile avatar upload",
        description: "Upload image files from settings",
        labels: ["profile"],
        components: ["identity"],
        storyPoints: 3,
        timeSpentHours: 18
      },
      {
        ...baseIssue,
        key: "ICTFT-11",
        summary: "Payment webhook retry handling",
        description: "Retry failed billing callbacks",
        labels: ["billing"],
        components: ["payments"],
        storyPoints: 5,
        timeSpentHours: 32
      }
    ]);

    expect(recommendation.similarIssues[0]?.key).toBe("ICTFT-11");
    expect(recommendation.storyPoints).toBe(5);
  });

  it("excludes target issue from similar issues", () => {
    const target = {
      ...baseIssue,
      key: "ICTFT-1",
      summary: "Sizing recommendation",
      statusCategory: "To Do",
      labels: ["sizing"],
      components: ["recommendation"]
    };

    const recommendation = new SizingEngine({ hoursPerStoryPoint: 6 }).recommend(target, [
      { ...target, statusCategory: "Done", storyPoints: 13, timeSpentHours: 80 },
      {
        ...baseIssue,
        key: "ICTFT-2",
        summary: "Recommendation sizing result",
        statusCategory: "Done",
        storyPoints: 5,
        timeSpentHours: 30
      }
    ]);

    expect(recommendation.similarIssues.map((issue) => issue.key)).not.toContain("ICTFT-1");
  });

  it("uses hour fallback when time tracking is missing", () => {
    const target = {
      ...baseIssue,
      key: "ICTFT-3",
      summary: "Auth blockage sizing",
      statusCategory: "To Do"
    };

    const recommendation = new SizingEngine({ hoursPerStoryPoint: 6 }).recommend(target, [
      {
        ...baseIssue,
        key: "ICTFT-4",
        summary: "Auth sizing",
        statusCategory: "Done",
        storyPoints: 5
      }
    ]);

    expect(recommendation.idealHours).toBe(30);
    expect(recommendation.warnings.some((warning) => warning.code === "HOURS_FALLBACK_USED")).toBe(true);
  });

  it("returns confidence breakdown and sparse data warnings", () => {
    const target = {
      ...baseIssue,
      key: "ICTFT-5",
      summary: "Sparse sizing",
      description: "",
      statusCategory: "To Do"
    };

    const recommendation = new SizingEngine({ hoursPerStoryPoint: 6 }).recommend(target, [
      {
        ...baseIssue,
        key: "ICTFT-6",
        summary: "Sparse sizing",
        statusCategory: "Done"
      }
    ]);

    expect(recommendation.confidenceBreakdown).toMatchObject({
      neighborCount: expect.any(Number),
      dataCompleteness: expect.any(Number),
      similarity: expect.any(Number),
      variance: expect.any(Number)
    });
    expect(recommendation.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["LOW_NEIGHBOR_COUNT", "SPARSE_STORY_POINTS", "TARGET_DESCRIPTION_MISSING"])
    );
  });

  it("persists recommendations through the repository interface", () => {
    const repository = new InMemorySizingRecommendationRepository();
    const engine = new SizingEngine({ hoursPerStoryPoint: 6 }, repository);
    const target = {
      ...baseIssue,
      key: "ICTFT-7",
      summary: "Sizing persistence",
      statusCategory: "To Do"
    };

    const recommendation = engine.recommend(target, [
      {
        ...baseIssue,
        key: "ICTFT-8",
        summary: "Sizing persistence",
        statusCategory: "Done",
        storyPoints: 3,
        timeSpentHours: 18
      }
    ]);

    expect(repository.listSizingRecommendations("ICTFT-7")).toEqual([recommendation]);
  });

  it("tokenizes Turkish letters", () => {
    expect(tokenize({ summary: "Öneri çalışma", labels: [], components: [] })).toContain("öneri");
  });
});
