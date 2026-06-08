import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { clearSessionCookie, readSession, setSessionCookie, signSession } from "./auth.js";
import type { AppConfig } from "./config.js";

const baseConfig: AppConfig = {
  NODE_ENV: "test",
  PORT: 8080,
  FRONTEND_ORIGIN: "http://localhost:5173",
  JWT_SECRET: "test-secret-123",
  JWT_COOKIE_NAME: "module1_session",
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "admin12345",
  ADMIN_DISPLAY_NAME: "Admin",
  MONGO_URI: "mongodb://localhost:27017/hackathon-test",
  MONGO_DB_NAME: "hackathon-test",
  GITHUB_TOKEN: undefined,
  GITHUB_STATE_REPOSITORY: undefined,
  GITHUB_STATE_BRANCH: "jira-live",
  GITHUB_STATE_PATH: "jira-live/state.json",
  GITHUB_STATE_URL: "https://example.com/state.json",
  GITHUB_STATE_TIMEOUT_MS: 10000,
  CATALOG_STORE: "memory",
  SYNC_DISABLED: true,
  SYNC_STARTUP_ENABLED: false,
  SYNC_INTERVAL_MS: 300000,
  HOURS_PER_STORY_POINT: 6,
  DEFAULT_PROJECT_KEY: "ICTFT",
  FRONTEND_DIST: "frontend/dist"
};

describe("auth helpers", () => {
  it("round-trips signed session claims", () => {
    const token = signSession({ id: "u-1", username: "admin", role: "admin", active: true }, baseConfig);

    expect(readSession(token, baseConfig)).toMatchObject({ sub: "u-1", role: "admin" });
  });

  it("rejects tokens with malformed role claims", () => {
    const token = jwt.sign({ sub: "u-1", role: "owner" }, baseConfig.JWT_SECRET);

    expect(() => readSession(token, baseConfig)).toThrow("Session cookie is invalid.");
  });

  it("sets httpOnly session cookie flags and only marks secure in production", () => {
    const testResponse = fakeResponse();
    setSessionCookie(testResponse as never, "token", baseConfig);
    expect(testResponse.cookieOptions).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/"
    });

    const productionResponse = fakeResponse();
    setSessionCookie(productionResponse as never, "token", { ...baseConfig, NODE_ENV: "production" });
    expect(productionResponse.cookieOptions).toMatchObject({ secure: true });
  });

  it("clears the same cookie path and flags used for sessions", () => {
    const response = fakeResponse();
    clearSessionCookie(response as never, baseConfig);

    expect(response.clearedCookie).toBe("module1_session");
    expect(response.clearOptions).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/"
    });
  });
});

function fakeResponse() {
  return {
    cookieName: undefined as string | undefined,
    cookieValue: undefined as string | undefined,
    cookieOptions: undefined as unknown,
    clearedCookie: undefined as string | undefined,
    clearOptions: undefined as unknown,
    cookie(name: string, value: string, options: unknown) {
      this.cookieName = name;
      this.cookieValue = value;
      this.cookieOptions = options;
      return this;
    },
    clearCookie(name: string, options: unknown) {
      this.clearedCookie = name;
      this.clearOptions = options;
      return this;
    }
  };
}
