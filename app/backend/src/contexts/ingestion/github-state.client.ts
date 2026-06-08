export interface GitHubStateClient {
  fetchState(): Promise<unknown>;
}

type FetchOptions = {
  timeoutMs: number;
  token?: string;
};

export class FetchGitHubStateClient implements GitHubStateClient {
  constructor(
    private readonly stateUrl: string,
    private readonly timeoutMs: number,
    private readonly token?: string
  ) {}

  async fetchState(): Promise<unknown> {
    return await fetchJson(this.stateUrl, {
      timeoutMs: this.timeoutMs,
      ...(this.token ? { token: this.token } : {})
    });
  }
}

export class GitHubContentsStateClient implements GitHubStateClient {
  constructor(
    private readonly repository: string,
    private readonly branch: string,
    private readonly path: string,
    private readonly timeoutMs: number,
    private readonly token?: string
  ) {}

  async fetchState(): Promise<unknown> {
    const encodedPath = this.path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const encodedBranch = encodeURIComponent(this.branch);
    const url = `https://api.github.com/repos/${this.repository}/contents/${encodedPath}?ref=${encodedBranch}`;
    const payload = (await fetchJson(url, {
      timeoutMs: this.timeoutMs,
      ...(this.token ? { token: this.token } : {})
    })) as {
      content?: string;
      encoding?: string;
    };

    if (!payload.content) {
      throw new Error("GitHub contents response did not include file content.");
    }

    const normalized = payload.content.replace(/\n/g, "");
    const decoded = Buffer.from(
      normalized,
      payload.encoding === "base64" || payload.encoding === undefined ? "base64" : "utf8"
    ).toString("utf8");
    return JSON.parse(decoded);
  }
}

async function fetchJson(url: string, options: FetchOptions): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
      },
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

export class StaticGitHubStateClient implements GitHubStateClient {
  constructor(private readonly state: unknown) {}

  async fetchState(): Promise<unknown> {
    return this.state;
  }
}
