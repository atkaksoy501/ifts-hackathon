import type { JiraIssueDto, SizingRecommendationDto, WarningDto } from "@module1/contracts";
import { randomUUID } from "node:crypto";

export type SizingEngineConfig = {
  hoursPerStoryPoint: number;
};

export class SizingEngine {
  constructor(private readonly config: SizingEngineConfig) {}

  recommend(target: JiraIssueDto, historicalIssues: JiraIssueDto[], neighborLimit = 5): SizingRecommendationDto {
    const neighbors = historicalIssues
      .filter((issue) => issue.key !== target.key)
      .map((issue) => ({
        issue,
        similarity: similarityScore(target, issue)
      }))
      .filter((entry) => entry.similarity > 0)
      .sort((left, right) => right.similarity - left.similarity)
      .slice(0, neighborLimit);

    const warnings: WarningDto[] = [];
    if (neighbors.length < 3) {
      warnings.push({
        code: "LOW_NEIGHBOR_COUNT",
        message: "Fewer than 3 similar historical issues are available.",
        severity: "warning"
      });
    }

    const storyPointSamples = neighbors
      .map((entry) => entry.issue.storyPoints)
      .filter((value): value is number => typeof value === "number");

    if (!storyPointSamples.length) {
      warnings.push({
        code: "MISSING_STORY_POINTS",
        message: "No historical story point samples were available.",
        severity: "warning"
      });
    }

    const storyPoints = roundToNearestStoryPoint(weightedAverage(storyPointSamples, neighbors.map((entry) => entry.similarity)) || 3);
    const hourSamples = neighbors
      .map((entry) => entry.issue.timeSpentHours)
      .filter((value): value is number => typeof value === "number");

    let idealHours = weightedAverage(hourSamples, neighbors.map((entry) => entry.similarity));
    if (!idealHours) {
      idealHours = storyPoints * this.config.hoursPerStoryPoint;
      warnings.push({
        code: "HOURS_FALLBACK_USED",
        message: "Time tracking was missing; HOURS_PER_STORY_POINT fallback was used.",
        severity: "warning"
      });
    }

    const maxSimilarity = neighbors[0]?.similarity ?? 0;
    const dataCompleteness = storyPointSamples.length && hourSamples.length ? 1 : 0.55;
    const neighborCount = Math.min(neighbors.length / 3, 1);
    const variance = varianceScore(storyPointSamples);
    const confidence = clamp((maxSimilarity * 0.4 + neighborCount * 0.25 + dataCompleteness * 0.25 + variance * 0.1));

    return {
      id: randomUUID(),
      issueKey: target.key,
      storyPoints,
      idealHours: Math.round(idealHours),
      confidence,
      confidenceBreakdown: {
        similarity: maxSimilarity,
        neighborCount,
        dataCompleteness,
        variance
      },
      warnings,
      similarIssues: neighbors.map((entry) => {
        const result = {
          key: entry.issue.key,
          summary: entry.issue.summary,
          similarity: entry.similarity
        };

        return {
          ...result,
          ...(entry.issue.storyPoints === undefined ? {} : { storyPoints: entry.issue.storyPoints }),
          ...(entry.issue.timeSpentHours === undefined ? {} : { timeSpentHours: entry.issue.timeSpentHours })
        };
      }),
      rationale: neighbors.length
        ? "Benzer geçmiş işler, veri tamlığı ve varyans birlikte değerlendirilerek öneri üretildi."
        : "Yeterli geçmiş veri olmadığı için güven düşük fallback öneri üretildi.",
      createdAt: new Date().toISOString()
    };
  }
}

export function tokenize(issue: Pick<JiraIssueDto, "summary" | "description" | "labels" | "components">): string[] {
  return `${issue.summary} ${issue.description ?? ""} ${issue.labels.join(" ")} ${issue.components.join(" ")}`
    .toLowerCase()
    .split(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function similarityScore(left: JiraIssueDto, right: JiraIssueDto): number {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? clamp(intersection / union) : 0;
}

function weightedAverage(values: number[], weights: number[]): number {
  if (!values.length) return 0;
  const safeWeights = weights.slice(0, values.length).map((weight) => (weight > 0 ? weight : 0.1));
  const totalWeight = safeWeights.reduce((sum, weight) => sum + weight, 0);
  return values.reduce((sum, value, index) => sum + value * (safeWeights[index] ?? 0.1), 0) / totalWeight;
}

function varianceScore(values: number[]): number {
  if (values.length < 2) return 0.6;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return clamp(1 - variance / 20);
}

function roundToNearestStoryPoint(value: number): number {
  const scale = [1, 2, 3, 5, 8, 13, 21];
  return scale.reduce((closest, candidate) =>
    Math.abs(candidate - value) < Math.abs(closest - value) ? candidate : closest
  );
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}
