export interface GitHubStateClient {
  fetchState(): Promise<unknown>;
}

export class FetchGitHubStateClient implements GitHubStateClient {
  constructor(
    private readonly stateUrl: string,
    private readonly timeoutMs: number
  ) {}

  async fetchState(): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.stateUrl, {
        headers: { accept: "application/json" },
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`GitHub state fetch failed with HTTP ${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class StaticGitHubStateClient implements GitHubStateClient {
  constructor(private readonly state: unknown) {}

  async fetchState(): Promise<unknown> {
    return this.state;
  }
}
