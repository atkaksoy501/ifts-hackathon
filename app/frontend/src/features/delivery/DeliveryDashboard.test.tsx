import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeliveryDashboard } from "./DeliveryDashboard.js";

const now = "2026-06-08T10:00:00.000Z";

describe("DeliveryDashboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("bootstraps session and renders API-backed backlog, sync warnings, sizing, and blockage", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/auth/me") return json({ user: adminUser });
      if (url.startsWith("/api/sync/status")) {
        return json({
          hasUsableData: true,
          projectKeys: ["ICTFT"],
          latestRun: syncRun,
          lastSuccessfulSyncAt: now,
          warnings: [{ code: "LOW_SPRINT_HISTORY", message: "Fewer than 3 closed sprints are available.", severity: "warning" }]
        });
      }
      if (url.startsWith("/api/backlog")) {
        return json({
          issues: [backlogIssue],
          page: { page: 1, pageSize: 50, total: 1 },
          warnings: []
        });
      }
      if (url.startsWith("/api/sprints/history")) {
        return json({ sprints: [], warnings: [] });
      }
      if (url === "/api/sizing/recommend" && method === "POST") {
        return json({
          id: "rec-1",
          issueKey: "ICTFT-201",
          storyPoints: 5,
          idealHours: 30,
          confidence: 0.82,
          confidenceBreakdown: { similarity: 0.8, neighborCount: 0.6, dataCompleteness: 0.9, variance: 0.7 },
          warnings: [],
          similarIssues: [{ key: "ICTFT-101", summary: "Login akışı", similarity: 0.78, storyPoints: 5, timeSpentHours: 28 }],
          rationale: "Benzer işler 5 SP etrafında kümeleniyor.",
          createdAt: now
        });
      }
      if (url === "/api/blockage/recommend" && method === "POST") {
        return json({
          id: "blk-1",
          issueKey: "ICTFT-201",
          inputText: "blocked integration",
          actions: ["Bağımlı ekip ve beklenen çıktı netleştirilsin."],
          confidence: 0.75,
          evidence: ["Pattern: Bağımlılık bekleniyor"],
          warnings: [],
          createdAt: now
        });
      }

      return json({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithQuery(<DeliveryDashboard />);

    expect(await screen.findByRole("heading", { name: "Predictive Sizing + Blockage Advisor" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /ICTFT-201/ })).toBeInTheDocument();
    expect(screen.getByText("Fewer than 3 closed sprints are available.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Sizing öner/ }));
    expect(await screen.findByText("Benzer işler 5 SP etrafında kümeleniyor.")).toBeInTheDocument();
    expect(screen.getByText("ICTFT-101")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /Blockage/ }));
    await userEvent.click(screen.getByRole("button", { name: /Blockage öner/ }));
    expect(await screen.findByText("Bağımlı ekip ve beklenen çıktı netleştirilsin.")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sizing/recommend",
      expect.objectContaining({ credentials: "include", method: "POST" })
    );
  });

  it("shows login form when session bootstrap is unauthenticated", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/auth/me") return json({ error: { message: "No session" } }, 401);
      if (url === "/api/auth/login" && init?.method === "POST") return json({ user: adminUser });
      return json({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithQuery(<DeliveryDashboard />);

    const usernameInput = (await screen.findByLabelText("Kullanıcı adı")) as HTMLInputElement;
    const passwordInput = screen.getByLabelText("Şifre") as HTMLInputElement;

    expect(usernameInput.value).toBe("");
    expect(passwordInput.value).toBe("");
    expect(screen.queryByText("Oturum yok veya kullanıcı bilgileri hatalı.")).not.toBeInTheDocument();

    await userEvent.type(usernameInput, "admin");
    await userEvent.type(passwordInput, "admin12345");
    await userEvent.click(screen.getByRole("button", { name: "Giriş" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST" })));
  });

  it("submits admin user and KB forms against admin APIs", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/auth/me") return json({ user: adminUser });
      if (url.startsWith("/api/sync/status")) return json({ hasUsableData: true, projectKeys: ["ICTFT"], warnings: [] });
      if (url.startsWith("/api/backlog")) return json({ issues: [backlogIssue], page: { page: 1, pageSize: 50, total: 1 }, warnings: [] });
      if (url.startsWith("/api/sprints/history")) return json({ sprints: [], warnings: [] });
      if (url === "/api/admin/users" && method === "GET") return json({ users: [adminAccount] });
      if (url === "/api/admin/users" && method === "POST") return json({ user: newUser }, 201);
      if (url === "/api/admin/blockage-patterns" && method === "GET") return json({ patterns: [pattern] });
      if (url === "/api/admin/blockage-patterns" && method === "POST") return json({ pattern: newPattern }, 201);
      return json({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithQuery(<DeliveryDashboard />);

    await userEvent.click(await screen.findByRole("tab", { name: /Admin/ }));
    fireEvent.change(screen.getByPlaceholderText("Kullanıcı adı"), { target: { value: "analyst" } });
    fireEvent.change(screen.getByPlaceholderText("En az 8 karakter şifre"), { target: { value: "analyst123" } });
    await userEvent.click(screen.getByRole("button", { name: /Kullanıcı ekle/ }));

    fireEvent.change(screen.getByPlaceholderText("Pattern adı"), { target: { value: "External dependency" } });
    fireEvent.change(screen.getByPlaceholderText("Keywords: blocked, bekliyor"), { target: { value: "blocked" } });
    fireEvent.change(screen.getByPlaceholderText("Aksiyonlar: owner ata, tarih belirle"), { target: { value: "Owner ata" } });
    await userEvent.click(screen.getByRole("button", { name: /KB pattern ekle/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/users", expect.objectContaining({ method: "POST" })));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/blockage-patterns", expect.objectContaining({ method: "POST" }))
    );
  });
});

function renderWithQuery(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

function json(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response);
}

const adminUser = {
  id: "user-1",
  username: "admin",
  displayName: "Admin",
  role: "admin",
  active: true
};

const adminAccount = {
  ...adminUser,
  createdAt: now,
  updatedAt: now
};

const newUser = {
  id: "user-2",
  username: "analyst",
  role: "user",
  active: true,
  createdAt: now,
  updatedAt: now
};

const backlogIssue = {
  key: "ICTFT-201",
  projectKey: "ICTFT",
  summary: "Seçilen issue için sizing önerisi göster",
  description: "Benzer historical issue listesinden story point ve ideal saat öner.",
  issueType: "Story",
  statusCategory: "To Do",
  statusName: "Backlog",
  sprintIds: [],
  labels: ["sizing"],
  components: ["recommendation"],
  updatedAt: now
};

const syncRun = {
  id: "sync-1",
  source: "github-state",
  status: "warning",
  startedAt: now,
  completedAt: now,
  issueUpserts: 3,
  sprintUpserts: 2,
  fieldMappingUpserts: 1,
  warnings: []
};

const pattern = {
  id: "pattern-1",
  name: "Bağımlılık bekleniyor",
  keywords: ["blocked"],
  componentHints: ["integration"],
  actions: ["Bağımlı ekip ve beklenen çıktı netleştirilsin."],
  active: true,
  createdAt: now,
  updatedAt: now
};

const newPattern = {
  ...pattern,
  id: "pattern-2",
  name: "External dependency"
};
