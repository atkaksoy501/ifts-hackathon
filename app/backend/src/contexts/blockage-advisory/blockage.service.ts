import type {
  BlockagePatternDto,
  BlockageRecommendationDto,
  CreateBlockagePatternRequest,
  JiraIssueDto,
  PatchBlockagePatternRequest,
  WarningDto
} from "@module1/contracts";
import { MongoClient, type Collection, type Db } from "mongodb";
import { randomUUID } from "node:crypto";
import { ApiError } from "../../shared/http.js";

export interface BlockagePatternRepository {
  ensureReady?(): Promise<void>;
  close?(): Promise<void>;
  listPatterns(): BlockagePatternDto[];
  listActivePatterns(): BlockagePatternDto[];
  savePattern(pattern: BlockagePatternDto): BlockagePatternDto;
  getPattern(id: string): BlockagePatternDto | undefined;
}

export interface BlockageRecommendationRepository {
  ensureReady?(): Promise<void>;
  close?(): Promise<void>;
  saveBlockageRecommendation(recommendation: BlockageRecommendationDto): BlockageRecommendationDto;
  listBlockageRecommendations(issueKey?: string): BlockageRecommendationDto[];
}

export class InMemoryBlockagePatternRepository implements BlockagePatternRepository {
  private readonly patterns = new Map<string, BlockagePatternDto>();

  listPatterns(): BlockagePatternDto[] {
    return [...this.patterns.values()];
  }

  listActivePatterns(): BlockagePatternDto[] {
    return this.listPatterns().filter((pattern) => pattern.active);
  }

  savePattern(pattern: BlockagePatternDto): BlockagePatternDto {
    this.patterns.set(pattern.id, pattern);
    return pattern;
  }

  getPattern(id: string): BlockagePatternDto | undefined {
    return this.patterns.get(id);
  }
}

export class InMemoryBlockageRecommendationRepository implements BlockageRecommendationRepository {
  private readonly recommendations: BlockageRecommendationDto[] = [];

  saveBlockageRecommendation(recommendation: BlockageRecommendationDto): BlockageRecommendationDto {
    this.recommendations.push(recommendation);
    return recommendation;
  }

  listBlockageRecommendations(issueKey?: string): BlockageRecommendationDto[] {
    return this.recommendations.filter((recommendation) => !issueKey || recommendation.issueKey === issueKey);
  }
}

export class MongoBlockagePatternRepository implements BlockagePatternRepository {
  private readonly client: MongoClient;
  private db: Db | undefined;
  private readonly cache = new Map<string, BlockagePatternDto>();
  private readonly pendingWrites = new Set<Promise<void>>();

  constructor(
    mongoUri: string,
    private readonly dbName: string
  ) {
    this.client = new MongoClient(mongoUri);
  }

  async ensureReady(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    await Promise.all([
      this.patterns.createIndex({ id: 1 }, { unique: true }),
      this.patterns.createIndex({ active: 1 }),
      this.patterns.createIndex({ keywords: 1 }),
      this.patterns.createIndex({ componentHints: 1 })
    ]);
    for (const pattern of await this.patterns.find().toArray()) {
      this.cache.set(pattern.id, pattern);
    }
  }

  async close(): Promise<void> {
    await Promise.all(this.pendingWrites);
    await this.client.close();
  }

  listPatterns(): BlockagePatternDto[] {
    return [...this.cache.values()];
  }

  listActivePatterns(): BlockagePatternDto[] {
    return this.listPatterns().filter((pattern) => pattern.active);
  }

  savePattern(pattern: BlockagePatternDto): BlockagePatternDto {
    this.cache.set(pattern.id, pattern);
    this.trackWrite(this.patterns.updateOne({ id: pattern.id }, { $set: pattern }, { upsert: true }));
    return pattern;
  }

  getPattern(id: string): BlockagePatternDto | undefined {
    return this.cache.get(id);
  }

  private get database(): Db {
    if (!this.db) {
      throw new Error("Mongo blockage pattern repository is not ready.");
    }
    return this.db;
  }

  private get patterns(): Collection<BlockagePatternDto> {
    return this.database.collection<BlockagePatternDto>("blockage_patterns");
  }

  private trackWrite(write: Promise<unknown>): void {
    let tracked: Promise<void>;
    tracked = write
      .then(() => undefined)
      .catch((error: unknown) => {
        console.error("Mongo blockage pattern write failed", error);
      })
      .finally(() => {
        this.pendingWrites.delete(tracked);
      });
    this.pendingWrites.add(tracked);
  }
}

export class MongoBlockageRecommendationRepository implements BlockageRecommendationRepository {
  private readonly client: MongoClient;
  private db: Db | undefined;
  private readonly cache: BlockageRecommendationDto[] = [];
  private readonly pendingWrites = new Set<Promise<void>>();

  constructor(
    mongoUri: string,
    private readonly dbName: string
  ) {
    this.client = new MongoClient(mongoUri);
  }

  async ensureReady(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    await Promise.all([
      this.recommendations.createIndex({ id: 1 }, { unique: true }),
      this.recommendations.createIndex({ issueKey: 1, createdAt: -1 })
    ]);
    this.cache.splice(0, this.cache.length, ...(await this.recommendations.find().sort({ createdAt: -1 }).limit(100).toArray()));
  }

  async close(): Promise<void> {
    await Promise.all(this.pendingWrites);
    await this.client.close();
  }

  saveBlockageRecommendation(recommendation: BlockageRecommendationDto): BlockageRecommendationDto {
    this.cache.unshift(recommendation);
    this.trackWrite(this.recommendations.updateOne({ id: recommendation.id }, { $set: recommendation }, { upsert: true }));
    return recommendation;
  }

  listBlockageRecommendations(issueKey?: string): BlockageRecommendationDto[] {
    return this.cache.filter((recommendation) => !issueKey || recommendation.issueKey === issueKey);
  }

  private get database(): Db {
    if (!this.db) {
      throw new Error("Mongo blockage recommendation repository is not ready.");
    }
    return this.db;
  }

  private get recommendations(): Collection<BlockageRecommendationDto> {
    return this.database.collection<BlockageRecommendationDto>("recommendations");
  }

  private trackWrite(write: Promise<unknown>): void {
    let tracked: Promise<void>;
    tracked = write
      .then(() => undefined)
      .catch((error: unknown) => {
        console.error("Mongo blockage recommendation write failed", error);
      })
      .finally(() => {
        this.pendingWrites.delete(tracked);
      });
    this.pendingWrites.add(tracked);
  }
}

type EvidenceSignal = {
  text: string;
  strength: number;
  actions: string[];
};

export class BlockageService {
  constructor(
    private readonly patternRepository: BlockagePatternRepository = new InMemoryBlockagePatternRepository(),
    private readonly recommendationRepository: BlockageRecommendationRepository = new InMemoryBlockageRecommendationRepository()
  ) {
    if (!this.patternRepository.listPatterns().length) {
      this.seedDefaultPatterns();
    }
  }

  listPatterns(): BlockagePatternDto[] {
    return this.patternRepository.listPatterns();
  }

  createPattern(input: CreateBlockagePatternRequest): BlockagePatternDto {
    validatePattern({
      active: input.active ?? true,
      keywords: normalizeList(input.keywords ?? []),
      componentHints: normalizeList(input.componentHints ?? []),
      actions: normalizeList(input.actions)
    });
    const now = new Date().toISOString();
    const pattern: BlockagePatternDto = {
      id: randomUUID(),
      name: input.name.trim(),
      keywords: normalizeList(input.keywords ?? []),
      componentHints: normalizeList(input.componentHints ?? []),
      actions: normalizeList(input.actions),
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now
    };
    return this.patternRepository.savePattern(pattern);
  }

  patchPattern(id: string, input: PatchBlockagePatternRequest): BlockagePatternDto {
    const current = this.patternRepository.getPattern(id);
    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Blockage pattern was not found.");
    }

    const next: BlockagePatternDto = {
      ...current,
      name: input.name?.trim() ?? current.name,
      active: input.active ?? current.active,
      keywords: input.keywords ? normalizeList(input.keywords) : current.keywords,
      componentHints: input.componentHints ? normalizeList(input.componentHints) : current.componentHints,
      actions: input.actions ? normalizeList(input.actions) : current.actions,
      updatedAt: new Date().toISOString()
    };

    validatePattern(next);
    return this.patternRepository.savePattern(next);
  }

  recommend(
    inputText: string,
    options: { issue?: JiraIssueDto; maxActions?: number; jiraExamples?: JiraIssueDto[] } = {}
  ): BlockageRecommendationDto {
    const signals = [
      ...localKbSignals(inputText, options.issue, this.patternRepository.listActivePatterns()),
      ...jiraExampleSignals(inputText, options.issue, options.jiraExamples ?? []),
      ...textSignals(inputText, options.issue)
    ].sort((left, right) => right.strength - left.strength || left.text.localeCompare(right.text));

    const warnings: WarningDto[] = [];
    if (!signals.length) {
      warnings.push({
        code: "LOW_EVIDENCE",
        message: "No strong local KB, Jira example, or issue text evidence was found.",
        severity: "warning"
      });
    }

    const evidenceStrength = clamp(signals.reduce((sum, signal) => sum + signal.strength, 0));
    if (evidenceStrength > 0 && evidenceStrength < 0.45) {
      warnings.push({
        code: "LOW_CONFIDENCE",
        message: "Evidence exists but is weak; validate the recommendation before acting.",
        severity: "warning"
      });
    }

    const actions = unique(
      signals.flatMap((signal) => signal.actions).filter(Boolean)
    ).slice(0, options.maxActions ?? 5);
    const evidence = signals.map((signal) => signal.text);
    const recommendation: BlockageRecommendationDto = {
      id: randomUUID(),
      ...(options.issue ? { issueKey: options.issue.key } : {}),
      inputText,
      actions: actions.length ? actions : ["Blokaj sinyali netleştirilip owner, tarih ve beklenen çıktı yazılsın."],
      confidence: signals.length ? clamp(0.25 + evidenceStrength * 0.75) : 0.2,
      evidence,
      warnings,
      createdAt: new Date().toISOString()
    };

    return this.recommendationRepository.saveBlockageRecommendation(recommendation);
  }

  listRecommendations(issueKey?: string): BlockageRecommendationDto[] {
    return this.recommendationRepository.listBlockageRecommendations(issueKey);
  }

  private seedDefaultPatterns() {
    this.createPattern({
      name: "Bağımlılık bekleniyor",
      keywords: ["dependency", "blocked", "bekliyor", "entegrasyon"],
      componentHints: ["integration", "ingestion"],
      actions: ["Bağımlı ekip ve beklenen çıktı netleştirilsin.", "Blokaj için tarih ve owner atansın."],
      active: true
    });
  }
}

function localKbSignals(inputText: string, issue: JiraIssueDto | undefined, patterns: BlockagePatternDto[]): EvidenceSignal[] {
  const normalizedText = normalize(inputText);
  const components = issue?.components.map(normalize) ?? [];

  return patterns
    .map((pattern) => {
      const keywordHits = pattern.keywords.filter((keyword) => normalizedText.includes(normalize(keyword))).length;
      const componentHits = pattern.componentHints.filter((hint) => components.includes(normalize(hint))).length;
      const strength = clamp(keywordHits * 0.22 + componentHits * 0.28);
      return {
        text: `Local KB: ${pattern.name} (${keywordHits} keyword, ${componentHits} component)`,
        strength,
        actions: pattern.actions
      };
    })
    .filter((signal) => signal.strength > 0);
}

function jiraExampleSignals(inputText: string, issue: JiraIssueDto | undefined, examples: JiraIssueDto[]): EvidenceSignal[] {
  const inputTokens = new Set(tokenize(`${inputText} ${issue?.components.join(" ") ?? ""}`));

  return examples
    .filter((example) => example.statusCategory === "Done")
    .map((example) => {
      const exampleTokens = new Set(tokenize(issueText(example)));
      const shared = [...inputTokens].filter((token) => exampleTokens.has(token)).length;
      const strength = clamp(shared / Math.max(inputTokens.size, 1));
      return {
        text: `Jira example: ${example.key} shared ${shared} issue signals`,
        strength: strength * 0.45,
        actions: [`${example.key} benzeri kapanmış işteki çözüm adımları kontrol edilsin.`]
      };
    })
    .filter((signal) => signal.strength >= 0.12)
    .slice(0, 3);
}

function textSignals(inputText: string, issue: JiraIssueDto | undefined): EvidenceSignal[] {
  const normalizedText = normalize(`${inputText} ${issue?.labels.join(" ") ?? ""}`);
  const signals: EvidenceSignal[] = [];
  const dependencyTerms = ["blocked", "blocker", "dependency", "bekliyor", "bağımlı", "bagimli"];
  const environmentTerms = ["prod", "production", "staging", "environment", "ortam"];

  if (dependencyTerms.some((term) => normalizedText.includes(term))) {
    signals.push({
      text: "Issue text: dependency or blocked wording",
      strength: 0.18,
      actions: ["Blokaj nedeni, owner ve beklenen tarih issue üzerinde netleştirilsin."]
    });
  }
  if (environmentTerms.some((term) => normalizedText.includes(term))) {
    signals.push({
      text: "Issue text: environment or deployment wording",
      strength: 0.12,
      actions: ["Ortam erişimi, release penceresi ve rollback sorumlusu doğrulansın."]
    });
  }

  return signals;
}

function validatePattern(input: {
  active?: boolean;
  keywords?: string[];
  componentHints?: string[];
  actions?: string[];
}) {
  if (input.active === false) {
    return;
  }

  const hasSignal = Boolean(input.keywords?.some((value) => value.trim()) || input.componentHints?.some((value) => value.trim()));
  const hasAction = Boolean(input.actions?.some((value) => value.trim()));

  if (!hasSignal || !hasAction) {
    throw new ApiError(400, "INVALID_REQUEST", "Active blockage pattern requires signal and action.");
  }
}

function issueText(issue: JiraIssueDto) {
  return `${issue.summary} ${issue.description ?? ""} ${issue.labels.join(" ")} ${issue.components.join(" ")}`;
}

function tokenize(input: string): string[] {
  return normalize(input)
    .split(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function normalize(input: string) {
  return input.toLocaleLowerCase("tr");
}

function normalizeList(values: string[]) {
  return unique(values.map((value) => value.trim()).filter(Boolean));
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}
