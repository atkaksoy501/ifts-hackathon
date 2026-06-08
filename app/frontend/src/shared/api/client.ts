import {
  blockageRecommendRequestSchema,
  loginRequestSchema,
  sizingRecommendRequestSchema,
  type BlockageRecommendationDto,
  type JiraIssueDto,
  type LoginRequest,
  type SessionUserDto,
  type SizingRecommendationDto,
  type SyncStatusDto
} from "@module1/contracts";

type BacklogResponse = {
  issues: JiraIssueDto[];
};

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

  syncStatus(): Promise<SyncStatusDto> {
    return this.request("/sync/status");
  }

  backlog(projectKey: string): Promise<BacklogResponse> {
    return this.request(`/backlog?projectKey=${encodeURIComponent(projectKey)}`);
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

  private async request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
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
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}

export const apiClient = new ApiClient();
