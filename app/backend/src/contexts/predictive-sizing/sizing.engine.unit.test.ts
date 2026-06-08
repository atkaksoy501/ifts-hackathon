import { describe, expect, it } from "vitest";
import { SizingEngine, tokenize } from "./sizing.engine.js";

const baseIssue = {
  projectKey: "ICTFT",
  issueType: "Story",
  statusName: "Done",
  sprintIds: ["sprint-1"],
  labels: ["sizing"],
  components: ["recommendation"]
};

describe("SizingEngine", () => {
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

  it("tokenizes Turkish letters", () => {
    expect(tokenize({ summary: "Öneri çalışma", labels: [], components: [] })).toContain("öneri");
  });
});
