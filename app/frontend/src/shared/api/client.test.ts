import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "./client.js";

describe("ApiClient", () => {
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
});
