import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { StaticGitHubStateClient, type GitHubStateClient } from "./contexts/ingestion/github-state.client.js";
import { InMemoryCatalogRepositories } from "./contexts/ingestion/repositories.js";
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
    expect(cookieText(login.headers["set-cookie"])).toContain("HttpOnly");
    expect(cookieText(login.headers["set-cookie"])).toContain("SameSite=Lax");

    const cookie = cookieHeader(login.headers["set-cookie"]);
    const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(200);
    expect(me.body.user.role).toBe("admin");
  });

  it("supports logout by clearing the session cookie", async () => {
    const app = await createApp(config);
    const login = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin12345" });

    const logout = await request(app).post("/api/auth/logout").set("Cookie", cookieHeader(login.headers["set-cookie"]));

    expect(logout.status).toBe(204);
    expect(cookieText(logout.headers["set-cookie"])).toContain("module1_session=");
    expect(cookieText(logout.headers["set-cookie"])).toContain("HttpOnly");
  });

  it("enforces admin user CRUD invariants", async () => {
    const app = await createApp(config);
    const login = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin12345" });
    const adminCookie = cookieHeader(login.headers["set-cookie"]);

    const created = await request(app).post("/api/admin/users").set("Cookie", adminCookie).send({
      username: "dev",
      password: "dev12345",
      displayName: "Developer",
      role: "user"
    });

    expect(created.status).toBe(201);
    expect(created.body.user).toMatchObject({ username: "dev", role: "user", active: true });
    expect(created.body.user.passwordHash).toBeUndefined();

    const duplicate = await request(app).post("/api/admin/users").set("Cookie", adminCookie).send({
      username: "dev",
      password: "other12345",
      role: "user"
    });
    expect(duplicate.status).toBe(409);

    const emptyPatch = await request(app).patch(`/api/admin/users/${created.body.user.id}`).set("Cookie", adminCookie).send({});
    expect(emptyPatch.status).toBe(400);

    const disabled = await request(app)
      .patch(`/api/admin/users/${created.body.user.id}`)
      .set("Cookie", adminCookie)
      .send({ active: false });
    expect(disabled.status).toBe(200);
    expect(disabled.body.user.active).toBe(false);

    const disabledLogin = await request(app).post("/api/auth/login").send({ username: "dev", password: "dev12345" });
    expect(disabledLogin.status).toBe(403);
  });

  it("uses the current stored role for admin authorization", async () => {
    const app = await createApp(config);
    const login = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin12345" });
    const adminCookie = cookieHeader(login.headers["set-cookie"]);

    const created = await request(app).post("/api/admin/users").set("Cookie", adminCookie).send({
      username: "lead",
      password: "lead12345",
      role: "admin"
    });
    const leadLogin = await request(app).post("/api/auth/login").send({ username: "lead", password: "lead12345" });
    const leadCookie = cookieHeader(leadLogin.headers["set-cookie"]);

    await request(app).patch(`/api/admin/users/${created.body.user.id}`).set("Cookie", adminCookie).send({ role: "user" });

    const adminOnly = await request(app).get("/api/admin/users").set("Cookie", leadCookie);
    expect(adminOnly.status).toBe(403);
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
    expect(response.body.confidenceBreakdown).toMatchObject({
      similarity: expect.any(Number),
      neighborCount: expect.any(Number),
      dataCompleteness: expect.any(Number),
      variance: expect.any(Number)
    });
    expect(response.body.similarIssues.map((issue: { key: string }) => issue.key)).not.toContain("ICTFT-201");
  });

  it("returns blockage recommendation from issue text, local KB, and Jira examples", async () => {
    const app = await createApp(config);
    const login = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin12345" });

    const response = await request(app)
      .post("/api/blockage/recommend")
      .set("Cookie", cookieHeader(login.headers["set-cookie"]))
      .send({ issueKey: "ICTFT-201", inputText: "blocked by ingestion dependency", maxActions: 3 });

    expect(response.status).toBe(200);
    expect(response.body.issueKey).toBe("ICTFT-201");
    expect(response.body.confidence).toBeGreaterThan(0.5);
    expect(response.body.evidence).toEqual(expect.arrayContaining([expect.stringContaining("Local KB")]));
    expect(response.body.actions.length).toBeGreaterThan(0);
  });

  it("supports admin blockage KB create and patch invariants", async () => {
    const app = await createApp(config);
    const login = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin12345" });
    const cookie = cookieHeader(login.headers["set-cookie"]);

    const invalid = await request(app)
      .post("/api/admin/blockage-patterns")
      .set("Cookie", cookie)
      .send({ name: "No signals", actions: ["Set owner."], active: true });
    expect(invalid.status).toBe(400);

    const created = await request(app)
      .post("/api/admin/blockage-patterns")
      .set("Cookie", cookie)
      .send({
        name: "Payment blocker",
        keywords: ["payment"],
        componentHints: ["payments"],
        actions: ["Confirm payment API owner."],
        active: true
      });
    expect(created.status).toBe(201);

    const patched = await request(app)
      .patch(`/api/admin/blockage-patterns/${created.body.pattern.id}`)
      .set("Cookie", cookie)
      .send({ active: false });
    expect(patched.status).toBe(200);
    expect(patched.body.pattern.active).toBe(false);
  });

  it("runs manual GitHub state sync and serves filtered backlog read models", async () => {
    const app = await createApp(config, {
      catalogRepositories: new InMemoryCatalogRepositories(),
      githubStateClient: new StaticGitHubStateClient(githubStateFixture())
    });
    const cookie = await loginCookie(app);

    const run = await request(app).post("/api/sync/github/run").set("Cookie", cookie).send({});
    expect(run.status).toBe(200);
    expect(run.body.status).toBe("success");
    expect(run.body.issueUpserts).toBe(3);
    expect(run.body.sprintUpserts).toBe(2);

    const status = await request(app).get("/api/sync/status").set("Cookie", cookie);
    expect(status.status).toBe(200);
    expect(status.body.hasUsableData).toBe(true);
    expect(status.body.latestRun.id).toBe(run.body.id);
    expect(status.body.lastSuccessfulSyncAt).toBe(run.body.completedAt);

    const backlog = await request(app).get("/api/backlog?projectKey=ICTFT&label=sync&component=ingestion&search=normalize").set("Cookie", cookie);
    expect(backlog.status).toBe(200);
    expect(backlog.body.issues.map((issue: { key: string }) => issue.key)).toEqual(["ICTFT-201"]);
    expect(backlog.body.page.total).toBe(1);
  });

  it("returns sprint history warnings when fewer than 3 closed sprints exist", async () => {
    const app = await createApp(config, {
      catalogRepositories: new InMemoryCatalogRepositories(),
      githubStateClient: new StaticGitHubStateClient(githubStateFixture())
    });
    const cookie = await loginCookie(app);
    await request(app).post("/api/sync/github/run").set("Cookie", cookie).send({});

    const response = await request(app).get("/api/sprints/history?projectKey=ICTFT&limit=10").set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.body.sprints).toHaveLength(2);
    expect(response.body.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "LOW_SPRINT_HISTORY", severity: "warning" })])
    );
  });

  it("preserves old catalog data when the latest sync fails", async () => {
    const client = new MutableGitHubStateClient(githubStateFixture());
    const app = await createApp(config, {
      catalogRepositories: new InMemoryCatalogRepositories(),
      githubStateClient: client
    });
    const cookie = await loginCookie(app);

    await request(app).post("/api/sync/github/run").set("Cookie", cookie).send({});
    client.failWith = new Error("fixture fetch failed");
    const failed = await request(app).post("/api/sync/github/run").set("Cookie", cookie).send({});
    expect(failed.status).toBe(200);
    expect(failed.body.status).toBe("failed");

    const status = await request(app).get("/api/sync/status").set("Cookie", cookie);
    expect(status.body.hasUsableData).toBe(true);
    expect(status.body.latestRun.status).toBe("failed");

    const backlog = await request(app).get("/api/backlog?projectKey=ICTFT").set("Cookie", cookie);
    expect(backlog.body.issues.map((issue: { key: string }) => issue.key)).toContain("ICTFT-201");
  });
});

async function loginCookie(app: Awaited<ReturnType<typeof createApp>>): Promise<string[]> {
  const login = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin12345" });
  expect(login.status).toBe(200);
  return cookieHeader(login.headers["set-cookie"]);
}

function cookieHeader(value: string[] | string | undefined): string[] {
  if (!value) {
    throw new Error("Missing set-cookie header");
  }

  return Array.isArray(value) ? value : [value];
}

function cookieText(value: string[] | string | undefined): string {
  return cookieHeader(value).join("; ");
}

class MutableGitHubStateClient implements GitHubStateClient {
  failWith: Error | undefined;

  constructor(private readonly state: unknown) {}

  async fetchState(): Promise<unknown> {
    if (this.failWith) throw this.failWith;
    return this.state;
  }
}

function githubStateFixture() {
  return {
    issues: [
      {
        key: "ICTFT-101",
        projectKey: "ICTFT",
        summary: "Historical auth session",
        description: "Login and session guard are implemented.",
        issueType: "Story",
        statusCategory: "Done",
        statusName: "Done",
        sprintIds: ["sprint-1"],
        storyPoints: 5,
        timeSpentHours: 30,
        labels: ["auth"],
        components: ["identity"],
        updatedAt: "2026-06-01T00:00:00.000Z"
      },
      {
        key: "ICTFT-201",
        projectKey: "ICTFT",
        summary: "Normalize GitHub state into backlog catalog",
        description: "Read GitHub state JSON and upsert normalized work item data.",
        issueType: "Story",
        statusCategory: "To Do",
        statusName: "Backlog",
        sprintIds: [],
        labels: ["sync"],
        components: ["ingestion"],
        updatedAt: "2026-06-02T00:00:00.000Z"
      },
      {
        key: "ICTFT-202",
        projectKey: "ICTFT",
        summary: "Render delivery filters",
        description: "Filter backlog by issue type and labels.",
        issueType: "Bug",
        statusCategory: "In Progress",
        statusName: "Doing",
        sprintIds: [],
        labels: ["ui"],
        components: ["frontend"],
        updatedAt: "2026-06-03T00:00:00.000Z"
      }
    ],
    sprints: [
      {
        id: "sprint-1",
        name: "Sprint 1",
        state: "closed",
        projectKey: "ICTFT",
        completeDate: "2026-05-15T00:00:00.000Z"
      },
      {
        id: "sprint-2",
        name: "Sprint 2",
        state: "closed",
        projectKey: "ICTFT",
        completeDate: "2026-05-29T00:00:00.000Z"
      }
    ],
    fieldMappings: {
      storyPoints: "Story Points"
    }
  };
}
