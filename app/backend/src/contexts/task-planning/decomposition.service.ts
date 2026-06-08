import type {
  DecompositionRunDto,
  EngineeringDomain,
  PlanningInputDto,
  RunDecompositionRequest,
  TechnicalSubTaskDto,
  WarningDto
} from "@module1/contracts";
import { randomUUID } from "node:crypto";
import { ApiError } from "../../shared/http.js";
import type { PlanningInputService } from "./planning.service.js";
import type { DecompositionRunRepository } from "./repositories.js";

type SessionActor = { id: string };

export interface DecompositionProvider {
  readonly name: "heuristic";
  decompose(input: PlanningInputDto): TechnicalSubTaskDto[];
}

export class HeuristicDecompositionProvider implements DecompositionProvider {
  readonly name = "heuristic" as const;

  decompose(input: PlanningInputDto): TechnicalSubTaskDto[] {
    const text = `${input.title} ${input.description} ${input.acceptanceCriteria.join(" ")} ${input.constraints.join(" ")} ${input.tags.join(" ")}`.toLowerCase();
    const domains = detectDomains(text);
    const taskIds = new Map<EngineeringDomain, string>(domains.map((domain) => [domain, randomUUID()]));
    const contractId = domains.includes("backend") && domains.includes("frontend") ? randomUUID() : undefined;
    const tasks: TechnicalSubTaskDto[] = [];

    if (contractId) {
      tasks.push(makeTask(contractId, "backend", "Define API and validation contracts", input, [], 4, "low", 0.9));
    }

    for (const domain of domains) {
      const dependencies: string[] = [];
      if (contractId && (domain === "backend" || domain === "frontend")) dependencies.push(contractId);
      if (domain === "backend" && taskIds.get("database")) dependencies.push(taskIds.get("database")!);
      if (domain === "qa") {
        dependencies.push(...tasks.filter((task) => task.domain !== "qa").map((task) => task.id));
      }
      tasks.push(
        makeTask(
          taskIds.get(domain)!,
          domain,
          titleFor(domain),
          input,
          [...new Set(dependencies)],
          estimateFor(domain, input),
          riskFor(domain),
          confidenceFor(domain, text)
        )
      );
    }

    return tasks;
  }
}

export class DecompositionService {
  constructor(
    private readonly planningInputs: PlanningInputService,
    private readonly repository: DecompositionRunRepository,
    private readonly heuristic: DecompositionProvider = new HeuristicDecompositionProvider(),
    private readonly clock: () => Date = () => new Date()
  ) {}

  async run(request: RunDecompositionRequest, actor: SessionActor): Promise<DecompositionRunDto> {
    const input = request.input
      ? await this.planningInputs.create(request.input, actor.id)
      : await this.planningInputs.getById(request.inputId!);
    const warnings: WarningDto[] = [...input.warnings];

    if (request.provider === "openrouter") {
      warnings.push({
        code: "PROVIDER_FALLBACK_USED",
        message: "OpenRouter is not enabled in MVP; deterministic heuristic provider was used.",
        severity: "warning"
      });
    }

    const subTasks = this.heuristic.decompose(input);
    if (subTasks.length === 1 && subTasks[0]?.domain === "other") {
      warnings.push({
        code: "AMBIGUOUS_INPUT",
        message: "No strong engineering-domain signal was found; review generated work.",
        severity: "warning"
      });
    }

    const run: DecompositionRunDto = {
      id: randomUUID(),
      inputId: input.id,
      provider: "heuristic",
      promptVersion: "heuristic-v1",
      subTasks,
      warnings,
      createdAt: this.clock().toISOString()
    };
    await this.repository.save(run);
    return run;
  }

  async getById(id: string): Promise<DecompositionRunDto> {
    const run = await this.repository.getById(id);
    if (!run) throw new ApiError(404, "NOT_FOUND", "Decomposition run was not found.");
    return run;
  }
}

const DOMAIN_SIGNALS: Array<[EngineeringDomain, RegExp]> = [
  ["frontend", /\b(ui|ux|frontend|react|component|screen|form|dashboard|button)\b/],
  ["backend", /\b(api|backend|express|endpoint|service|route|server)\b/],
  ["database", /\b(database|mongodb|mongo|persist|repository|collection|query)\b/],
  ["integration", /\b(integration|jira|github|webhook|external|sync)\b/],
  ["security", /\b(auth|security|permission|role|session|token|privacy)\b/],
  ["devops", /\b(devops|docker|deploy|pipeline|ci|cloud|monitor)\b/],
  ["data-ai", /\b(ai|model|prompt|prediction|analytics|data)\b/],
  ["docs", /\b(document|documentation|readme|guide)\b/]
];

function detectDomains(text: string): EngineeringDomain[] {
  const domains = DOMAIN_SIGNALS.filter(([, pattern]) => pattern.test(text)).map(([domain]) => domain);
  if (!domains.includes("qa")) domains.push("qa");
  return domains.length === 1 ? ["other"] : [...new Set(domains)];
}

function makeTask(
  id: string,
  domain: EngineeringDomain,
  title: string,
  input: PlanningInputDto,
  dependencies: string[],
  estimateHours: number,
  risk: "low" | "medium" | "high",
  confidence: number
): TechnicalSubTaskDto {
  return {
    id,
    domain,
    title,
    description: `${input.title}: ${title}.`,
    deliverables: [`Completed ${domain} implementation for ${input.title}`],
    acceptanceChecks:
      input.acceptanceCriteria.length > 0
        ? input.acceptanceCriteria
        : [`Implementation for ${domain} is testable and reviewable.`],
    requiredSkills: skillsFor(domain),
    dependencies,
    estimateHours,
    risk,
    confidence,
    rationale: `Generated from ${domain} signals in planning input.`
  };
}

function skillsFor(domain: EngineeringDomain) {
  const skillMap: Record<EngineeringDomain, string[]> = {
    frontend: ["typescript", "react"],
    backend: ["typescript", "express"],
    database: ["mongodb", "data-modeling"],
    qa: ["vitest", "qa"],
    integration: ["api-integration"],
    devops: ["devops"],
    security: ["security"],
    ux: ["ux"],
    docs: ["technical-writing"],
    "data-ai": ["data-ai"],
    other: ["technical-analysis"]
  };
  return skillMap[domain].map((key, index) => ({ key, minLevel: index === 0 ? 3 : 2, weight: index === 0 ? 1 : 0.6 }));
}

function titleFor(domain: EngineeringDomain): string {
  const titles: Record<EngineeringDomain, string> = {
    frontend: "Implement user interface flow",
    backend: "Implement backend application flow",
    database: "Define persistence model and repository",
    qa: "Add automated verification",
    integration: "Implement external integration boundary",
    devops: "Prepare deployment and operational configuration",
    security: "Apply authentication and authorization controls",
    ux: "Refine user experience and accessibility",
    docs: "Document behavior and operating steps",
    "data-ai": "Implement data and AI processing",
    other: "Clarify scope and implement core behavior"
  };
  return titles[domain];
}

function estimateFor(domain: EngineeringDomain, input: PlanningInputDto): number {
  const base: Record<EngineeringDomain, number> = {
    frontend: 8,
    backend: 8,
    database: 6,
    qa: 6,
    integration: 8,
    devops: 5,
    security: 5,
    ux: 4,
    docs: 3,
    "data-ai": 10,
    other: 8
  };
  return base[domain] + (input.constraints.length > 1 ? 2 : 0);
}

function riskFor(domain: EngineeringDomain): "low" | "medium" | "high" {
  if (domain === "security" || domain === "data-ai") return "high";
  if (domain === "database" || domain === "integration" || domain === "devops") return "medium";
  return "low";
}

function confidenceFor(domain: EngineeringDomain, text: string): number {
  return domain === "other" ? 0.45 : DOMAIN_SIGNALS.some(([candidate, pattern]) => candidate === domain && pattern.test(text)) ? 0.85 : 0.75;
}
