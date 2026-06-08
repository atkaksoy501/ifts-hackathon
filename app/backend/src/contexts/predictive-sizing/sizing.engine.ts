import type { JiraIssueDto, SizingRecommendationDto, WarningDto } from "@module1/contracts";
import { randomUUID } from "node:crypto";

export type SizingEngineConfig = {
  hoursPerStoryPoint: number;
};

export interface SizingRecommendationRepository {
  saveSizingRecommendation(recommendation: SizingRecommendationDto): SizingRecommendationDto;
  listSizingRecommendations(issueKey?: string): SizingRecommendationDto[];
}

export class InMemorySizingRecommendationRepository implements SizingRecommendationRepository {
  private readonly recommendations: SizingRecommendationDto[] = [];

  saveSizingRecommendation(recommendation: SizingRecommendationDto): SizingRecommendationDto {
    this.recommendations.push(recommendation);
    return recommendation;
  }

  listSizingRecommendations(issueKey?: string): SizingRecommendationDto[] {
    return this.recommendations.filter((recommendation) => !issueKey || recommendation.issueKey === issueKey);
  }
}

type Neighbor = {
  issue: JiraIssueDto;
  similarity: number;
};

type WeightedSample = {
  value: number;
  weight: number;
};

const stopWords = new Set([
  "and",
  "the",
  "for",
  "with",
  "bir",
  "ile",
  "icin",
  "için",
  "ve",
  "bu",
  "that",
  "this"
]);

export class SizingEngine {
  private readonly repository: SizingRecommendationRepository;

  constructor(
    private readonly config: SizingEngineConfig,
    repository: SizingRecommendationRepository = new InMemorySizingRecommendationRepository()
  ) {
    this.repository = repository;
  }

  recommend(target: JiraIssueDto, historicalIssues: JiraIssueDto[], neighborLimit = 5): SizingRecommendationDto {
    const candidates = historicalIssues.filter((issue) => issue.key !== target.key);
    const neighbors = rankNeighbors(target, candidates).slice(0, neighborLimit);
    const warnings = buildWarnings(target, candidates, neighbors);

    const storyPointSamples = neighbors
      .filter((entry) => typeof entry.issue.storyPoints === "number")
      .map((entry) => ({ value: entry.issue.storyPoints as number, weight: entry.similarity }));
    const estimatedStoryPoints = weightedAverage(storyPointSamples);
    const storyPoints = roundToNearestStoryPoint(estimatedStoryPoints || target.storyPoints || 3);

    const hourSamples = neighbors
      .filter((entry) => typeof entry.issue.timeSpentHours === "number")
      .map((entry) => ({ value: entry.issue.timeSpentHours as number, weight: entry.similarity }));
    let idealHours = weightedAverage(hourSamples);
    if (!idealHours) {
      idealHours = storyPoints * this.config.hoursPerStoryPoint;
    }

    const confidenceBreakdown = {
      similarity: neighbors[0]?.similarity ?? 0,
      neighborCount: clamp(neighbors.length / 3),
      dataCompleteness: dataCompletenessScore(target, neighbors),
      variance: varianceScore(storyPointSamples.map((sample) => sample.value))
    };
    const confidence = clamp(
      confidenceBreakdown.similarity * 0.45 +
        confidenceBreakdown.neighborCount * 0.2 +
        confidenceBreakdown.dataCompleteness * 0.25 +
        confidenceBreakdown.variance * 0.1
    );

    const recommendation: SizingRecommendationDto = {
      id: randomUUID(),
      issueKey: target.key,
      storyPoints,
      idealHours: Math.round(idealHours),
      confidence,
      confidenceBreakdown,
      warnings,
      similarIssues: neighbors.map((entry) => ({
        key: entry.issue.key,
        summary: entry.issue.summary,
        similarity: entry.similarity,
        ...(entry.issue.storyPoints === undefined ? {} : { storyPoints: entry.issue.storyPoints }),
        ...(entry.issue.timeSpentHours === undefined ? {} : { timeSpentHours: entry.issue.timeSpentHours })
      })),
      rationale: buildRationale(neighbors, storyPoints, idealHours),
      createdAt: new Date().toISOString()
    };

    return this.repository.saveSizingRecommendation(recommendation);
  }

  listRecommendations(issueKey?: string): SizingRecommendationDto[] {
    return this.repository.listSizingRecommendations(issueKey);
  }
}

export function tokenize(issue: Pick<JiraIssueDto, "summary" | "description" | "labels" | "components">): string[] {
  return weightedTokens(issue)
    .map((entry) => entry.token)
    .filter((token, index, tokens) => tokens.indexOf(token) === index);
}

function rankNeighbors(target: JiraIssueDto, candidates: JiraIssueDto[]): Neighbor[] {
  const documents = [target, ...candidates].map(weightedTokens);
  const idf = inverseDocumentFrequencies(documents);
  const targetVector = vectorize(documents[0] ?? [], idf);

  return candidates
    .map((issue, index) => {
      const candidateVector = vectorize(documents[index + 1] ?? [], idf);
      const tfidfSimilarity = cosineSimilarity(targetVector, candidateVector);
      const keywordSimilarity = keywordScore(target, issue);
      return {
        issue,
        similarity: clamp(tfidfSimilarity * 0.7 + keywordSimilarity * 0.3)
      };
    })
    .filter((entry) => entry.similarity > 0)
    .sort((left, right) => {
      if (right.similarity !== left.similarity) return right.similarity - left.similarity;
      return left.issue.key.localeCompare(right.issue.key);
    });
}

function weightedTokens(issue: Pick<JiraIssueDto, "summary" | "description" | "labels" | "components">) {
  const fields: Array<{ text: string; weight: number }> = [
    { text: issue.summary, weight: 3 },
    { text: issue.description ?? "", weight: 1 },
    { text: issue.labels.join(" "), weight: 2 },
    { text: issue.components.join(" "), weight: 2.5 }
  ];

  return fields.flatMap((field) =>
    field.text
      .toLocaleLowerCase("tr")
      .split(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !stopWords.has(token))
      .map((token) => ({ token, weight: field.weight }))
  );
}

function inverseDocumentFrequencies(documents: Array<Array<{ token: string }>>) {
  const frequencies = new Map<string, number>();
  for (const document of documents) {
    for (const token of new Set(document.map((entry) => entry.token))) {
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [token, count] of frequencies.entries()) {
    idf.set(token, Math.log((documents.length + 1) / (count + 1)) + 1);
  }
  return idf;
}

function vectorize(tokens: Array<{ token: string; weight: number }>, idf: Map<string, number>) {
  const vector = new Map<string, number>();
  for (const entry of tokens) {
    vector.set(entry.token, (vector.get(entry.token) ?? 0) + entry.weight * (idf.get(entry.token) ?? 1));
  }
  return vector;
}

function cosineSimilarity(left: Map<string, number>, right: Map<string, number>) {
  const leftMagnitude = magnitude(left);
  const rightMagnitude = magnitude(right);
  if (!leftMagnitude || !rightMagnitude) return 0;

  let dot = 0;
  for (const [token, leftValue] of left.entries()) {
    dot += leftValue * (right.get(token) ?? 0);
  }
  return dot / (leftMagnitude * rightMagnitude);
}

function keywordScore(left: JiraIssueDto, right: JiraIssueDto): number {
  const labelOverlap = overlapRatio(left.labels, right.labels);
  const componentOverlap = overlapRatio(left.components, right.components);
  const typeMatch = left.issueType && right.issueType && left.issueType === right.issueType ? 1 : 0;
  const summaryOverlap = overlapRatio(tokenize(left), tokenize(right));
  return clamp(labelOverlap * 0.25 + componentOverlap * 0.35 + typeMatch * 0.15 + summaryOverlap * 0.25);
}

function overlapRatio(left: string[], right: string[]) {
  if (!left.length || !right.length) return 0;
  const normalizedRight = new Set(right.map((value) => value.toLocaleLowerCase("tr")));
  const intersection = left.filter((value) => normalizedRight.has(value.toLocaleLowerCase("tr"))).length;
  return intersection / Math.min(left.length, right.length);
}

function magnitude(vector: Map<string, number>) {
  return Math.sqrt([...vector.values()].reduce((sum, value) => sum + value ** 2, 0));
}

function buildWarnings(target: JiraIssueDto, candidates: JiraIssueDto[], neighbors: Neighbor[]): WarningDto[] {
  const warnings: WarningDto[] = [];
  const storyPointSamples = neighbors.filter((entry) => typeof entry.issue.storyPoints === "number").length;
  const hourSamples = neighbors.filter((entry) => typeof entry.issue.timeSpentHours === "number").length;
  const sprintSamples = candidates.filter((entry) => entry.sprintIds.length).length;

  if (neighbors.length < 3) {
    warnings.push({
      code: "LOW_NEIGHBOR_COUNT",
      message: "Fewer than 3 similar historical issues are available.",
      severity: "warning"
    });
  }
  if (storyPointSamples < Math.min(3, neighbors.length || 1)) {
    warnings.push({
      code: "SPARSE_STORY_POINTS",
      message: "Story point samples are sparse for the matched historical issues.",
      severity: "warning"
    });
  }
  if (!hourSamples) {
    warnings.push({
      code: "HOURS_FALLBACK_USED",
      message: "Time tracking was missing; HOURS_PER_STORY_POINT fallback was used.",
      severity: "warning"
    });
  } else if (hourSamples < neighbors.length) {
    warnings.push({
      code: "SPARSE_TIME_TRACKING",
      message: "Some matched historical issues are missing time tracking.",
      severity: "info"
    });
  }
  if (!target.description?.trim()) {
    warnings.push({
      code: "TARGET_DESCRIPTION_MISSING",
      message: "Target issue description is missing; summary, labels, and components carried the estimate.",
      severity: "info"
    });
  }
  if (sprintSamples < 3) {
    warnings.push({
      code: "LOW_SPRINT_HISTORY",
      message: "Fewer than 3 historical sprint samples are available.",
      severity: "warning"
    });
  }

  return warnings;
}

function dataCompletenessScore(target: JiraIssueDto, neighbors: Neighbor[]) {
  if (!neighbors.length) return 0.2;
  const storyPointRatio = neighbors.filter((entry) => typeof entry.issue.storyPoints === "number").length / neighbors.length;
  const hourRatio = neighbors.filter((entry) => typeof entry.issue.timeSpentHours === "number").length / neighbors.length;
  const descriptionScore = target.description?.trim() ? 1 : 0.55;
  return clamp(storyPointRatio * 0.45 + hourRatio * 0.35 + descriptionScore * 0.2);
}

function weightedAverage(samples: WeightedSample[]): number {
  if (!samples.length) return 0;
  const totalWeight = samples.reduce((sum, sample) => sum + Math.max(sample.weight, 0.01), 0);
  return samples.reduce((sum, sample) => sum + sample.value * Math.max(sample.weight, 0.01), 0) / totalWeight;
}

function varianceScore(values: number[]): number {
  if (values.length < 2) return values.length ? 0.65 : 0.25;
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

function buildRationale(neighbors: Neighbor[], storyPoints: number, idealHours: number) {
  if (!neighbors.length) {
    return `Yeterli benzer geçmiş iş bulunamadığı için ${storyPoints} SP ve ${Math.round(idealHours)} saat fallback önerildi.`;
  }

  const keys = neighbors
    .slice(0, 3)
    .map((entry) => entry.issue.key)
    .join(", ");
  return `${keys} benzerlikleri, story point dağılımı, zaman takibi ve veri tamlığı birlikte değerlendirilerek ${storyPoints} SP önerildi.`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}
