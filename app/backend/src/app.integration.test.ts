import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { loadConfig } from "./shared/config.js";

const config = loadConfig({
  NODE_ENV: "test",
  PORT: "8080",
  FRONTEND_ORIGIN: "http://localhost:5173",
  JWT_SECRET: "test-secret-123",
  JWT_COOKIE_NAME: "module1_session",
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "admin12345",
  ADMIN_DISPLAY_NAME: "Admin",
  MONGO_URI: "mongodb://localhost:27017/hackathon-test",
  MONGO_DB_NAME: "hackathon-test",
  GITHUB_STATE_URL: "https://example.com/state.json",
  SYNC_INTERVAL_MS: "300000",
  HOURS_PER_STORY_POINT: "6",
  DEFAULT_PROJECT_KEY: "ICTFT"
});

describe("api", () => {
  it("supports login and session bootstrap", async () => {
    const app = await createApp(config);
    const login = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin12345" });

    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"]).toBeDefined();

    const cookie = cookieHeader(login.headers["set-cookie"]);
    const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(200);
    expect(me.body.user.role).toBe("admin");
  });

  it("returns sizing recommendation with warnings instead of blocking sparse data", async () => {
    const app = await createApp(config);
    const login = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin12345" });

    const response = await request(app)
      .post("/api/sizing/recommend")
      .set("Cookie", cookieHeader(login.headers["set-cookie"]))
      .send({ issueKey: "ICTFT-201" });

    expect(response.status).toBe(200);
    expect(response.body.issueKey).toBe("ICTFT-201");
    expect(response.body.warnings.length).toBeGreaterThan(0);
  });
});

function cookieHeader(value: string[] | string | undefined): string[] {
  if (!value) {
    throw new Error("Missing set-cookie header");
  }

  return Array.isArray(value) ? value : [value];
}
