import type { DecompositionRunDto, PlanningInputDto } from "@module1/contracts";

export interface PlanningInputRepository {
  save(input: PlanningInputDto): Promise<void>;
  getById(id: string): Promise<PlanningInputDto | undefined>;
}

export interface DecompositionRunRepository {
  save(run: DecompositionRunDto): Promise<void>;
  getById(id: string): Promise<DecompositionRunDto | undefined>;
}

export class InMemoryPlanningInputRepository implements PlanningInputRepository {
  private readonly inputs = new Map<string, PlanningInputDto>();

  async save(input: PlanningInputDto): Promise<void> {
    this.inputs.set(input.id, structuredClone(input));
  }

  async getById(id: string): Promise<PlanningInputDto | undefined> {
    const input = this.inputs.get(id);
    return input ? structuredClone(input) : undefined;
  }
}

export class InMemoryDecompositionRunRepository implements DecompositionRunRepository {
  private readonly runs = new Map<string, DecompositionRunDto>();

  async save(run: DecompositionRunDto): Promise<void> {
    this.runs.set(run.id, structuredClone(run));
  }

  async getById(id: string): Promise<DecompositionRunDto | undefined> {
    const run = this.runs.get(id);
    return run ? structuredClone(run) : undefined;
  }
}
