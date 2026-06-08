import {
  blockageRecommendRequestSchema,
  createBlockagePatternRequestSchema,
  createUserRequestSchema,
  loginRequestSchema,
  patchBlockagePatternRequestSchema,
  patchUserRequestSchema,
  sizingRecommendRequestSchema,
  type AdminUserResponse,
  type AdminUsersResponse,
  type BacklogQuery,
  type BacklogResponse,
  type BlockagePatternResponse,
  type BlockagePatternsResponse,
  type BlockageRecommendationDto,
  type CreateBlockagePatternRequest,
  type CreateUserRequest,
  type ErrorEnvelope,
  type LoginRequest,
  type PatchBlockagePatternRequest,
  type PatchUserRequest,
  type SessionUserDto,
  type SizingRecommendationDto,
  type SprintHistoryResponse,
  type SyncRunDto,
  type SyncStatusDto
} from "@module1/contracts";

export class ApiClient {
  constructor(private readonly baseUrl = "/api") {}

  login(input: LoginRequest): Promise<{ user: SessionUserDto }> {
    return this.request("/auth/login", {
      method: "POST",
      body: loginRequestSchema.parse(input)
    });
  }

  me(): Promise<{ user: SessionUserDto }> {
    return this.request("/auth/me");
  }

  async logout(): Promise<void> {
    await this.request("/auth/logout", { method: "POST", expectJson: false });
  }

  syncStatus(): Promise<SyncStatusDto> {
    return this.request("/sync/status");
  }

  manualSync(): Promise<SyncRunDto> {
    return this.request("/sync/github/run", { method: "POST" });
  }

  backlog(query: BacklogQuery): Promise<BacklogResponse> {
    return this.request(`/backlog?${toSearchParams(query)}`);
  }

  sprintHistory(projectKey: string): Promise<SprintHistoryResponse> {
    return this.request(`/sprints/history?${toSearchParams({ projectKey, limit: 5 })}`);
  }

  sizing(input: unknown): Promise<SizingRecommendationDto> {
    return this.request("/sizing/recommend", {
      method: "POST",
      body: sizingRecommendRequestSchema.parse(input)
    });
  }

  blockage(input: unknown): Promise<BlockageRecommendationDto> {
    return this.request("/blockage/recommend", {
      method: "POST",
      body: blockageRecommendRequestSchema.parse(input)
    });
  }

  adminUsers(): Promise<AdminUsersResponse> {
    return this.request("/admin/users");
  }

  createUser(input: CreateUserRequest): Promise<AdminUserResponse> {
    return this.request("/admin/users", {
      method: "POST",
      body: createUserRequestSchema.parse(input)
    });
  }

  patchUser(id: string, input: PatchUserRequest): Promise<AdminUserResponse> {
    return this.request(`/admin/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: patchUserRequestSchema.parse(input)
    });
  }

  blockagePatterns(): Promise<BlockagePatternsResponse> {
    return this.request("/admin/blockage-patterns");
  }

  createBlockagePattern(input: CreateBlockagePatternRequest): Promise<BlockagePatternResponse> {
    return this.request("/admin/blockage-patterns", {
      method: "POST",
      body: createBlockagePatternRequestSchema.parse(input)
    });
  }

  patchBlockagePattern(id: string, input: PatchBlockagePatternRequest): Promise<BlockagePatternResponse> {
    return this.request(`/admin/blockage-patterns/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: patchBlockagePatternRequestSchema.parse(input)
    });
  }

  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown; expectJson?: boolean } = {}
  ): Promise<T> {
    const requestInit: RequestInit = {
      method: init.method ?? "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {})
      }
    };

    if (init.body !== undefined) {
      requestInit.body = JSON.stringify(init.body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, requestInit);

    if (!response.ok) {
      throw new ApiClientError(response.status, await parseErrorMessage(response));
    }

    if (init.expectJson === false || response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}

export const apiClient = new ApiClient();

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function toSearchParams(input: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

async function parseErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as Partial<ErrorEnvelope>;
    return payload.error?.message ?? `API request failed: ${response.status}`;
  } catch {
    return `API request failed: ${response.status}`;
  }
}
