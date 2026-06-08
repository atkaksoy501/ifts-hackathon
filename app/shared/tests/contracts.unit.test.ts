import { describe, expect, it } from "vitest";
import { blockageRecommendRequestSchema, sizingRecommendationSchema } from "../src/index.js";

describe("contracts", () => {
  it("keeps confidence values inside 0..1", () => {
    expect(() =>
      sizingRecommendationSchema.parse({
        id: "rec-1",
        issueKey: "ICTFT-1",
        storyPoints: 5,
        idealHours: 30,
        confidence: 1.1,
        confidenceBreakdown: {
          similarity: 1,
          neighborCount: 1,
          dataCompleteness: 1,
          variance: 0
        },
        warnings: [],
        similarIssues: [],
        rationale: "Historical issues are similar.",
        createdAt: new Date().toISOString()
      })
    ).toThrow();
  });

  it("requires issue key or input text for blockage requests", () => {
    expect(blockageRecommendRequestSchema.safeParse({}).success).toBe(false);
    expect(blockageRecommendRequestSchema.safeParse({ inputText: "blocked by dependency" }).success).toBe(true);
  });
});
