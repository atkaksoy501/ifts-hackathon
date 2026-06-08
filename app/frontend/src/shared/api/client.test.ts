import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiClientError } from "./client.js";

describe("ApiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends credentials for cookie auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: "1", username: "admin", role: "admin", active: true } })
    });
    vi.stubGlobal("fetch", fetchMock);

    await new ApiClient("/api").login({ username: "admin", password: "admin12345" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        credentials: "include",
        method: "POST"
      })
    );
  });

  it("serializes backlog filters and omits empty values", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ issues: [], page: { page: 1, pageSize: 50, total: 0 }, warnings: [] })
    });
    vi.stubGlobal("fetch", fetchMock);

    await new ApiClient("/api").backlog({
      projectKey: "ICTFT",
      pageSize: 50,
      search: "session",
      component: ""
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backlog?projectKey=ICTFT&pageSize=50&search=session",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("handles 204 logout responses without parsing json", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: vi.fn()
    });
    vi.stubGlobal("fetch", fetchMock);

    await new ApiClient("/api").logout();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({
        credentials: "include",
        method: "POST"
      })
    );
  });

  it("raises backend error envelope messages", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: "User is disabled." } })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(new ApiClient("/api").me()).rejects.toEqual(new ApiClientError(403, "User is disabled."));
  });
});
