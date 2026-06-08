import type {
  BlockagePatternDto,
  BlockageRecommendationDto,
  CreateBlockagePatternRequest,
  JiraIssueDto,
  PatchBlockagePatternRequest,
  WarningDto
} from "@module1/contracts";
import { randomUUID } from "node:crypto";
import { ApiError } from "../../shared/http.js";

export class BlockageService {
  private readonly patterns = new Map<string, BlockagePatternDto>();

  constructor() {
    this.createPattern({
      name: "Bağımlılık bekleniyor",
      keywords: ["dependency", "blocked", "bekliyor", "entegrasyon"],
      componentHints: ["integration", "ingestion"],
      actions: ["Bağımlı ekip ve beklenen çıktı netleştirilsin.", "Blokaj için tarih ve owner atansın."],
      active: true
    });
  }

  listPatterns(): BlockagePatternDto[] {
    return [...this.patterns.values()];
  }

  createPattern(input: CreateBlockagePatternRequest): BlockagePatternDto {
    validatePattern({
      active: input.active ?? true,
      keywords: input.keywords ?? [],
      componentHints: input.componentHints ?? [],
      actions: input.actions
    });
    const now = new Date().toISOString();
    const pattern: BlockagePatternDto = {
      id: randomUUID(),
      name: input.name,
      keywords: input.keywords ?? [],
      componentHints: input.componentHints ?? [],
      actions: input.actions,
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now
    };
    this.patterns.set(pattern.id, pattern);
    return pattern;
  }

  patchPattern(id: string, input: PatchBlockagePatternRequest): BlockagePatternDto {
    const current = this.patterns.get(id);
    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Blockage pattern was not found.");
    }

    const next: BlockagePatternDto = {
      ...current,
      name: input.name ?? current.name,
      active: input.active ?? current.active,
      keywords: input.keywords ?? current.keywords,
      componentHints: input.componentHints ?? current.componentHints,
      actions: input.actions ?? current.actions,
      updatedAt: new Date().toISOString()
    };

    validatePattern(next);
    this.patterns.set(id, next);
    return next;
  }

  recommend(inputText: string, options: { issue?: JiraIssueDto; maxActions?: number } = {}): BlockageRecommendationDto {
    const normalized = inputText.toLowerCase();
    const matches = [...this.patterns.values()].filter((pattern) => {
      if (!pattern.active) return false;
      const keywordMatch = pattern.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
      const componentMatch = options.issue?.components.some((component) =>
        pattern.componentHints.some((hint) => hint.toLowerCase() === component.toLowerCase())
      );
      return keywordMatch || componentMatch;
    });

    const warnings: WarningDto[] = [];
    if (!matches.length) {
      warnings.push({
        code: "LOW_EVIDENCE",
        message: "No strong local KB evidence was found.",
        severity: "warning"
      });
    }

    const actions = matches.flatMap((pattern) => pattern.actions).slice(0, options.maxActions ?? 5);
    const evidence = matches.map((pattern) => `Pattern: ${pattern.name}`);

    return {
      id: randomUUID(),
      ...(options.issue ? { issueKey: options.issue.key } : {}),
      inputText,
      actions: actions.length ? actions : ["Blokaj sinyali netleştirilip owner, tarih ve beklenen çıktı yazılsın."],
      confidence: matches.length ? 0.75 : 0.35,
      evidence,
      warnings,
      createdAt: new Date().toISOString()
    };
  }
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

  const hasSignal = Boolean(input.keywords?.length || input.componentHints?.length);
  const hasAction = Boolean(input.actions?.length);

  if (!hasSignal || !hasAction) {
    throw new ApiError(400, "INVALID_REQUEST", "Active blockage pattern requires signal and action.");
  }
}
