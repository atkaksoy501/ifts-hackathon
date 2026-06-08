import type {
  BacklogQuery,
  BlockagePatternDto,
  JiraIssueDto,
  SessionUserDto,
  UserAccountDto,
  WarningDto
} from "@module1/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  FileText,
  Gauge,
  ListFilter,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Users
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiClientError, apiClient } from "../../shared/api/client.js";
import { Badge } from "../../shared/ui/badge.js";
import { Button } from "../../shared/ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card.js";
import { Input } from "../../shared/ui/input.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../shared/ui/tabs.js";
import { tr } from "./dictionary.js";

const DEFAULT_PROJECT_KEY = "ICTFT";
const emptyWarnings: WarningDto[] = [];

export function DeliveryDashboard() {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: () => apiClient.me(),
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: (input: { username: string; password: string }) => apiClient.login(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: async () => {
      queryClient.removeQueries();
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  });

  if (sessionQuery.isLoading) {
    return <Shell status="Oturum kontrol ediliyor" />;
  }

  if (!sessionQuery.data?.user) {
    return (
      <Shell status="Oturum gerekli">
        <LoginPanel
          error={loginMutation.error ? messageFromError(loginMutation.error) : undefined}
          isPending={loginMutation.isPending}
          onLogin={(input) => loginMutation.mutate(input)}
        />
      </Shell>
    );
  }

  return (
    <DashboardBody
      onLogout={() => logoutMutation.mutate()}
      user={sessionQuery.data.user}
      logoutPending={logoutMutation.isPending}
    />
  );
}

function DashboardBody({
  user,
  logoutPending,
  onLogout
}: {
  user: SessionUserDto;
  logoutPending: boolean;
  onLogout: () => void;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("sizing");
  const [selectedKey, setSelectedKey] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    issueType: "",
    statusCategory: "",
    label: "",
    component: ""
  });
  const [blockageText, setBlockageText] = useState("");

  const backlogQuery = useMemo<BacklogQuery>(
    () => ({
      projectKey: DEFAULT_PROJECT_KEY,
      pageSize: 50,
      search: filters.search || undefined,
      issueType: filters.issueType || undefined,
      statusCategory: filters.statusCategory || undefined,
      label: filters.label || undefined,
      component: filters.component || undefined
    }),
    [filters]
  );

  const syncQuery = useQuery({
    queryKey: ["sync-status"],
    queryFn: () => apiClient.syncStatus()
  });
  const backlog = useQuery({
    queryKey: ["backlog", backlogQuery],
    queryFn: () => apiClient.backlog(backlogQuery)
  });
  const sprintHistory = useQuery({
    queryKey: ["sprints", DEFAULT_PROJECT_KEY],
    queryFn: () => apiClient.sprintHistory(DEFAULT_PROJECT_KEY)
  });

  const selectedIssue = backlog.data?.issues.find((issue) => issue.key === selectedKey);

  useEffect(() => {
    if (!selectedKey && backlog.data?.issues[0]) {
      setSelectedKey(backlog.data.issues[0].key);
    }
    if (selectedKey && backlog.data && !backlog.data.issues.some((issue) => issue.key === selectedKey)) {
      setSelectedKey(backlog.data.issues[0]?.key ?? "");
    }
  }, [backlog.data, selectedKey]);

  useEffect(() => {
    if (selectedIssue && !blockageText) {
      setBlockageText(`${selectedIssue.summary}\n${selectedIssue.description ?? ""}`.trim());
    }
  }, [blockageText, selectedIssue]);

  const manualSync = useMutation({
    mutationFn: () => apiClient.manualSync(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sync-status"] }),
        queryClient.invalidateQueries({ queryKey: ["backlog"] }),
        queryClient.invalidateQueries({ queryKey: ["sprints"] })
      ]);
    }
  });
  const sizing = useMutation({
    mutationFn: (issueKey: string) => apiClient.sizing({ issueKey, projectKey: DEFAULT_PROJECT_KEY, neighborLimit: 5 })
  });
  const blockage = useMutation({
    mutationFn: (input: { issueKey?: string; inputText?: string }) =>
      apiClient.blockage({ ...input, projectKey: DEFAULT_PROJECT_KEY, maxActions: 5 })
  });

  const canAdmin = user.role === "admin";
  const warnings = [
    ...(syncQuery.data?.warnings ?? emptyWarnings),
    ...(backlog.data?.warnings ?? emptyWarnings),
    ...(sprintHistory.data?.warnings ?? emptyWarnings)
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-primary">ICTFT</p>
            <h1 className="text-xl font-semibold md:text-2xl">{tr.appName}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={canAdmin ? "success" : "neutral"}>{user.role}</Badge>
            <span className="text-sm text-muted-foreground">{user.displayName ?? user.username}</span>
            <Button disabled={logoutPending} onClick={onLogout} size="sm" variant="secondary">
              <LogOut className="h-4 w-4" />
              Çıkış
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <SyncPanel
            canAdmin={canAdmin}
            latestRunStatus={manualSync.data?.status}
            pending={manualSync.isPending}
            status={syncQuery.data}
            error={messageFromError(syncQuery.error ?? manualSync.error)}
            onManualSync={() => manualSync.mutate()}
          />
          <FilterPanel filters={filters} onFiltersChange={setFilters} />
          <WarningsPanel warnings={warnings} />
        </aside>

        <section className="space-y-4">
          <Tabs onValueChange={setActiveTab} value={activeTab}>
            <TabsList>
              <TabsTrigger value="sizing">
                <Gauge className="mr-2 h-4 w-4" />
                {tr.sizing}
              </TabsTrigger>
              <TabsTrigger value="blockage">
                <AlertTriangle className="mr-2 h-4 w-4" />
                {tr.blockage}
              </TabsTrigger>
              <TabsTrigger value="review">
                <FileText className="mr-2 h-4 w-4" />
                Sprint Review
              </TabsTrigger>
              {canAdmin ? (
                <TabsTrigger value="admin">
                  <Users className="mr-2 h-4 w-4" />
                  {tr.admin}
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="sizing">
              <div className="grid gap-4 xl:grid-cols-[minmax(280px,420px)_minmax(0,1fr)]">
                <BacklogList
                  error={messageFromError(backlog.error)}
                  issues={backlog.data?.issues ?? []}
                  loading={backlog.isLoading}
                  selectedKey={selectedKey}
                  onSelect={(issue) => {
                    setSelectedKey(issue.key);
                    setBlockageText(`${issue.summary}\n${issue.description ?? ""}`.trim());
                  }}
                />
                <SizingPanel
                  issue={selectedIssue}
                  pending={sizing.isPending}
                  result={sizing.data}
                  error={messageFromError(sizing.error)}
                  onRecommend={() => selectedKey && sizing.mutate(selectedKey)}
                />
              </div>
            </TabsContent>

            <TabsContent value="blockage">
              <BlockagePanel
                issue={selectedIssue}
                inputText={blockageText}
                pending={blockage.isPending}
                result={blockage.data}
                error={messageFromError(blockage.error)}
                onInputTextChange={setBlockageText}
                onRecommend={() =>
                  blockage.mutate(selectedKey ? { issueKey: selectedKey, inputText: blockageText } : { inputText: blockageText })
                }
              />
            </TabsContent>

            <TabsContent value="review">
              <SprintReviewPanel canWrite={user.role === "manager" || user.role === "admin"} />
            </TabsContent>

            {canAdmin ? (
              <TabsContent value="admin">
                <AdminPanel />
              </TabsContent>
            ) : null}
          </Tabs>
        </section>
      </main>
    </div>
  );
}

function Shell({ status, children }: { status: string; children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-primary">ICTFT</p>
          <h1 className="text-xl font-semibold md:text-2xl">{tr.appName}</h1>
        </div>
      </header>
      <main className="mx-auto grid min-h-[calc(100vh-82px)] max-w-7xl place-items-center px-4 py-6">
        {children ?? <p className="text-sm text-muted-foreground">{status}</p>}
      </main>
    </div>
  );
}

function LoginPanel({
  error,
  isPending,
  onLogin
}: {
  error: string | undefined;
  isPending: boolean;
  onLogin: (input: { username: string; password: string }) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{tr.login}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onLogin({ username, password });
          }}
        >
          <label className="grid gap-1 text-sm">
            {tr.username}
            <Input autoComplete="username" onChange={(event) => setUsername(event.target.value)} value={username} />
          </label>
          <label className="grid gap-1 text-sm">
            {tr.password}
            <Input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          {error ? <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800">{error}</p> : null}
          <Button className="w-full" disabled={isPending} type="submit">
            <Lock className="h-4 w-4" />
            {isPending ? "Giriş yapılıyor" : tr.login}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SyncPanel({
  canAdmin,
  latestRunStatus,
  pending,
  status,
  error,
  onManualSync
}: {
  canAdmin: boolean;
  latestRunStatus: string | undefined;
  pending: boolean;
  status: Awaited<ReturnType<typeof apiClient.syncStatus>> | undefined;
  error: string | undefined;
  onManualSync: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tr.syncHealth}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Usable data</span>
          <Badge tone={status?.hasUsableData ? "success" : "warning"}>{status?.hasUsableData ? "OK" : "Eksik"}</Badge>
        </div>
        <div className="grid gap-2 text-sm">
          <span>Son başarılı sync: {formatDate(status?.lastSuccessfulSyncAt)}</span>
          <span>Son run: {status?.latestRun?.status ?? latestRunStatus ?? "Yok"}</span>
          <span>Projeler: {status?.projectKeys.join(", ") || DEFAULT_PROJECT_KEY}</span>
        </div>
        {canAdmin ? (
          <Button className="w-full" disabled={pending} onClick={onManualSync} variant="secondary">
            <RefreshCw className="h-4 w-4" />
            {pending ? "Sync çalışıyor" : "Manual sync"}
          </Button>
        ) : null}
        {error ? <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

function FilterPanel({
  filters,
  onFiltersChange
}: {
  filters: { search: string; issueType: string; statusCategory: string; label: string; component: string };
  onFiltersChange: (filters: { search: string; issueType: string; statusCategory: string; label: string; component: string }) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <ListFilter className="h-4 w-4" />
            Backlog filtreleri
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="grid gap-1 text-sm">
          Arama
          <Input
            onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
            placeholder="Issue, özet, açıklama"
            value={filters.search}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <label className="grid gap-1 text-sm">
            Issue type
            <Input onChange={(event) => onFiltersChange({ ...filters, issueType: event.target.value })} value={filters.issueType} />
          </label>
          <label className="grid gap-1 text-sm">
            Status category
            <Input
              onChange={(event) => onFiltersChange({ ...filters, statusCategory: event.target.value })}
              value={filters.statusCategory}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Label
            <Input onChange={(event) => onFiltersChange({ ...filters, label: event.target.value })} value={filters.label} />
          </label>
          <label className="grid gap-1 text-sm">
            Component
            <Input onChange={(event) => onFiltersChange({ ...filters, component: event.target.value })} value={filters.component} />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

function WarningsPanel({ warnings }: { warnings: WarningDto[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tr.warnings}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {warnings.length ? (
          warnings.map((warning) => (
            <div className="flex gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-800" key={`${warning.code}-${warning.message}`}>
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{warning.message}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Aktif uyarı yok.</p>
        )}
      </CardContent>
    </Card>
  );
}

function BacklogList({
  issues,
  selectedKey,
  loading,
  error,
  onSelect
}: {
  issues: JiraIssueDto[];
  selectedKey: string;
  loading: boolean;
  error: string | undefined;
  onSelect: (issue: JiraIssueDto) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tr.backlog}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <p className="text-sm text-muted-foreground">Backlog yükleniyor.</p> : null}
        {error ? <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800">{error}</p> : null}
        {!loading && !issues.length ? (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Filtrelerle eşleşen backlog issue bulunamadı. Sync durumunu ve filtreleri kontrol edin.
          </div>
        ) : null}
        <div className="space-y-2">
          {issues.map((issue) => (
            <button
              className={`w-full rounded-md border p-3 text-left text-sm transition ${
                issue.key === selectedKey ? "border-primary bg-teal-50" : "border-border bg-white hover:bg-muted"
              }`}
              key={issue.key}
              onClick={() => onSelect(issue)}
              type="button"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-semibold">{issue.key}</span>
                <Badge tone="info">{issue.issueType ?? "Issue"}</Badge>
              </span>
              <span className="mt-1 block text-muted-foreground">{issue.summary}</span>
              <span className="mt-2 flex flex-wrap gap-1">
                {issue.components.map((component) => (
                  <Badge key={component}>{component}</Badge>
                ))}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SizingPanel({
  issue,
  pending,
  result,
  error,
  onRecommend
}: {
  issue: JiraIssueDto | undefined;
  pending: boolean;
  result: Awaited<ReturnType<typeof apiClient.sizing>> | undefined;
  error: string | undefined;
  onRecommend: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {tr.selectedIssue}: {issue?.key ?? "Yok"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {issue ? (
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="font-medium">{issue.summary}</div>
            <div className="mt-1 text-muted-foreground">{issue.description}</div>
          </div>
        ) : null}
        <Button disabled={!issue || pending} onClick={onRecommend}>
          <Gauge className="h-4 w-4" />
          {pending ? "Hesaplanıyor" : "Sizing öner"}
        </Button>
        {error ? <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800">{error}</p> : null}
        {result ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label={tr.storyPoint} value={result.storyPoints} />
              <Metric label={tr.idealHour} value={result.idealHours} />
              <Metric label={tr.confidence} value={`%${Math.round(result.confidence * 100)}`} />
            </div>
            <ConfidenceBreakdown values={result.confidenceBreakdown} />
            {result.warnings.length ? <WarningsPanel warnings={result.warnings} /> : null}
            <p className="rounded-md bg-muted p-3 text-sm">{result.rationale}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-3">{tr.similarIssues}</th>
                    <th className="py-2 pr-3">Similarity</th>
                    <th className="py-2 pr-3">SP</th>
                    <th className="py-2 pr-3">Saat</th>
                  </tr>
                </thead>
                <tbody>
                  {result.similarIssues.length ? (
                    result.similarIssues.map((similar) => (
                      <tr className="border-b border-border last:border-0" key={similar.key}>
                        <td className="py-2 pr-3">
                          <span className="font-medium">{similar.key}</span>
                          <span className="block text-muted-foreground">{similar.summary}</span>
                        </td>
                        <td className="py-2 pr-3">%{Math.round(similar.similarity * 100)}</td>
                        <td className="py-2 pr-3">{similar.storyPoints ?? "-"}</td>
                        <td className="py-2 pr-3">{similar.timeSpentHours ?? "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-3 text-muted-foreground" colSpan={4}>
                        Benzer historical issue bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ConfidenceBreakdown({ values }: { values: Record<string, number> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {Object.entries(values).map(([key, value]) => (
        <div className="rounded-md border border-border p-2 text-sm" key={key}>
          <span className="block text-xs text-muted-foreground">{key}</span>
          <span className="font-medium">%{Math.round(value * 100)}</span>
        </div>
      ))}
    </div>
  );
}

function BlockagePanel({
  issue,
  inputText,
  pending,
  result,
  error,
  onInputTextChange,
  onRecommend
}: {
  issue: JiraIssueDto | undefined;
  inputText: string;
  pending: boolean;
  result: Awaited<ReturnType<typeof apiClient.blockage>> | undefined;
  error: string | undefined;
  onInputTextChange: (value: string) => void;
  onRecommend: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tr.blockage}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="grid gap-1 text-sm">
          Issue veya blokaj metni
          <textarea
            className="min-h-32 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onInputTextChange(event.target.value)}
            value={inputText}
          />
        </label>
        <Button disabled={pending || (!issue && !inputText.trim())} onClick={onRecommend}>
          <AlertTriangle className="h-4 w-4" />
          {pending ? "Öneri hazırlanıyor" : "Blockage öner"}
        </Button>
        {error ? <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800">{error}</p> : null}
        {result ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Metric label={tr.confidence} value={`%${Math.round(result.confidence * 100)}`} />
              <Metric label="Issue" value={result.issueKey ?? "Serbest metin"} />
            </div>
            {result.warnings.length ? <WarningsPanel warnings={result.warnings} /> : null}
            <ResultList title={tr.actions} items={result.actions} />
            <ResultList title={tr.evidence} items={result.evidence.length ? result.evidence : ["Kanıt bulunamadı"]} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SprintReviewPanel({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [remarkText, setRemarkText] = useState("");
  const [reportId, setReportId] = useState("");

  const sprints = useQuery({
    queryKey: ["sprint-review-sprints", DEFAULT_PROJECT_KEY],
    queryFn: () => apiClient.sprintReviewSprints({ projectKey: DEFAULT_PROJECT_KEY, limit: 10 })
  });
  const selectedSprint = sprints.data?.sprints.find((sprint) => sprint.id === selectedSprintId);

  useEffect(() => {
    if (!selectedSprintId && sprints.data?.sprints[0]) {
      setSelectedSprintId(sprints.data.sprints[0].id);
    }
  }, [selectedSprintId, sprints.data]);

  const evidence = useQuery({
    queryKey: ["sprint-evidence", selectedSprintId],
    queryFn: () => apiClient.sprintEvidence(selectedSprintId, { projectKey: DEFAULT_PROJECT_KEY }),
    enabled: Boolean(selectedSprintId)
  });
  const variance = useQuery({
    queryKey: ["variance", selectedSprintId],
    queryFn: () => apiClient.variance({ projectKey: DEFAULT_PROJECT_KEY, sprintId: selectedSprintId, trendWindow: 6 }),
    enabled: Boolean(selectedSprintId)
  });
  const createRemark = useMutation({
    mutationFn: () => apiClient.createSprintRemark(selectedSprintId, { text: remarkText }),
    onSuccess: async () => {
      setRemarkText("");
      await queryClient.invalidateQueries({ queryKey: ["sprint-evidence", selectedSprintId] });
    }
  });
  const createReport = useMutation({
    mutationFn: () => apiClient.createSprintReport({ sprintId: selectedSprintId, projectKey: DEFAULT_PROJECT_KEY }),
    onSuccess: (result) => setReportId(result.report.id)
  });
  const markdown = useQuery({
    queryKey: ["report-markdown", reportId],
    queryFn: () => apiClient.sprintReportMarkdown(reportId),
    enabled: Boolean(reportId)
  });

  const warnings = [
    ...(sprints.data?.warnings ?? emptyWarnings),
    ...(evidence.data?.evidence.warnings ?? emptyWarnings),
    ...(variance.data?.analytics.warnings ?? emptyWarnings),
    ...(createReport.data?.report.warnings ?? emptyWarnings)
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Sprint Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="grid gap-1 text-sm">
            Sprint
            <select
              className="h-10 rounded-md border border-border bg-white px-3 text-sm"
              onChange={(event) => setSelectedSprintId(event.target.value)}
              value={selectedSprintId}
            >
              {(sprints.data?.sprints ?? []).map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
            </select>
          </label>
          {selectedSprint ? (
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="font-medium">{selectedSprint.name}</div>
              <div className="text-muted-foreground">Evidence: {selectedSprint.evidenceStatus}</div>
            </div>
          ) : null}
          {canWrite ? (
            <form className="space-y-2" onSubmit={(event) => submit(event, () => createRemark.mutate())}>
              <textarea
                className="min-h-24 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setRemarkText(event.target.value)}
                placeholder="Demo notu veya kapanis yorumu"
                value={remarkText}
              />
              <Button disabled={!selectedSprintId || !remarkText.trim() || createRemark.isPending} type="submit">
                <FileText className="h-4 w-4" />
                Remark ekle
              </Button>
            </form>
          ) : null}
          <Button disabled={!selectedSprintId || !canWrite || createReport.isPending} onClick={() => createReport.mutate()} variant="secondary">
            <FileText className="h-4 w-4" />
            Rapor uret
          </Button>
          {warnings.length ? <WarningsPanel warnings={warnings} /> : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Evidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {evidence.isLoading ? <p className="text-sm text-muted-foreground">Evidence yukleniyor.</p> : null}
            {evidence.error ? <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800">{messageFromError(evidence.error)}</p> : null}
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Tamamlanan" value={evidence.data?.evidence.completedItems.length ?? 0} />
              <Metric label="Devreden" value={evidence.data?.evidence.incompleteItems.length ?? 0} />
              <Metric label="Remark" value={evidence.data?.evidence.closingRemarks.length ?? 0} />
            </div>
            <ResultList
              title="Tamamlanan isler"
              items={(evidence.data?.evidence.completedItems ?? []).map((item) => `${item.key} - ${item.summary}`)}
            />
            <ResultList
              title="Devreden isler"
              items={(evidence.data?.evidence.incompleteItems ?? []).map((item) => `${item.key} - ${item.summary}`)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Variance
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Plan SP" value={variance.data?.analytics.storyPoints.planned ?? 0} />
              <Metric label="Actual SP" value={variance.data?.analytics.storyPoints.actual ?? 0} />
              <Metric label="Delta" value={variance.data?.analytics.storyPoints.delta ?? 0} />
            </div>
            <ResultList
              title="Bottleneck"
              items={(variance.data?.analytics.bottlenecks ?? []).map(
                (item) => `${item.groupKey}: ${item.spilloverStoryPoints} SP / ${item.itemCount} is`
              )}
            />
          </CardContent>
        </Card>

        {createReport.data?.report ? (
          <Card>
            <CardHeader>
              <CardTitle>{createReport.data.report.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {createReport.data.report.sections.map((section) => (
                <ResultList key={section.key} title={section.title} items={section.items} />
              ))}
              {markdown.data ? <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">{markdown.data.markdown}</pre> : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function AdminPanel() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <AdminUsersPanel />
      <AdminKbPanel />
    </div>
  );
}

function AdminUsersPanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{
    username: string;
    password: string;
    displayName: string;
    role: "user" | "admin";
  }>({
    username: "",
    password: "",
    displayName: "",
    role: "user"
  });
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiClient.adminUsers()
  });
  const createUser = useMutation({
    mutationFn: () =>
      apiClient.createUser({
        username: form.username,
        password: form.password,
        displayName: form.displayName || undefined,
        role: form.role,
        active: true
      }),
    onSuccess: async () => {
      setForm({ username: "", password: "", displayName: "", role: "user" });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  });
  const patchUser = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => apiClient.patchUser(id, { active }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Users</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            createUser.mutate();
          }}
        >
          <Input
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            placeholder={tr.username}
            value={form.username}
          />
          <Input
            onChange={(event) => setForm({ ...form, displayName: event.target.value })}
            placeholder="Display name"
            value={form.displayName}
          />
          <Input
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="En az 8 karakter şifre"
            type="password"
            value={form.password}
          />
          <select
            className="h-10 rounded-md border border-border bg-white px-3 text-sm"
            onChange={(event) => setForm({ ...form, role: event.target.value as "user" | "admin" })}
            value={form.role}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <Button disabled={createUser.isPending} type="submit">
            <Users className="h-4 w-4" />
            Kullanıcı ekle
          </Button>
          {createUser.error ? <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800">{messageFromError(createUser.error)}</p> : null}
        </form>
        <UserTable users={users.data?.users ?? []} pendingId={patchUser.variables?.id} onToggle={(id, active) => patchUser.mutate({ id, active })} />
      </CardContent>
    </Card>
  );
}

function UserTable({
  users,
  pendingId,
  onToggle
}: {
  users: UserAccountDto[];
  pendingId: string | undefined;
  onToggle: (id: string, active: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      {users.map((user) => (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm" key={user.id}>
          <div>
            <div className="font-medium">{user.username}</div>
            <div className="text-muted-foreground">{user.role}</div>
          </div>
          <Button disabled={pendingId === user.id} onClick={() => onToggle(user.id, !user.active)} size="sm" variant="secondary">
            {user.active ? "Disable" : "Enable"}
          </Button>
        </div>
      ))}
    </div>
  );
}

function AdminKbPanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    keywords: "",
    componentHints: "",
    actions: ""
  });
  const patterns = useQuery({
    queryKey: ["blockage-patterns"],
    queryFn: () => apiClient.blockagePatterns()
  });
  const createPattern = useMutation({
    mutationFn: () =>
      apiClient.createBlockagePattern({
        name: form.name,
        keywords: splitList(form.keywords),
        componentHints: splitList(form.componentHints),
        actions: splitList(form.actions),
        active: true
      }),
    onSuccess: async () => {
      setForm({ name: "", keywords: "", componentHints: "", actions: "" });
      await queryClient.invalidateQueries({ queryKey: ["blockage-patterns"] });
    }
  });
  const patchPattern = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => apiClient.patchBlockagePattern(id, { active }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["blockage-patterns"] });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin KB</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="grid gap-3" onSubmit={(event) => submit(event, () => createPattern.mutate())}>
          <Input onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Pattern adı" value={form.name} />
          <Input
            onChange={(event) => setForm({ ...form, keywords: event.target.value })}
            placeholder="Keywords: blocked, bekliyor"
            value={form.keywords}
          />
          <Input
            onChange={(event) => setForm({ ...form, componentHints: event.target.value })}
            placeholder="Components: integration"
            value={form.componentHints}
          />
          <Input
            onChange={(event) => setForm({ ...form, actions: event.target.value })}
            placeholder="Aksiyonlar: owner ata, tarih belirle"
            value={form.actions}
          />
          <Button disabled={createPattern.isPending} type="submit">
            <ShieldCheck className="h-4 w-4" />
            KB pattern ekle
          </Button>
          {createPattern.error ? (
            <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800">{messageFromError(createPattern.error)}</p>
          ) : null}
        </form>
        <PatternList
          patterns={patterns.data?.patterns ?? []}
          pendingId={patchPattern.variables?.id}
          onToggle={(id, active) => patchPattern.mutate({ id, active })}
        />
      </CardContent>
    </Card>
  );
}

function PatternList({
  patterns,
  pendingId,
  onToggle
}: {
  patterns: BlockagePatternDto[];
  pendingId: string | undefined;
  onToggle: (id: string, active: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      {patterns.map((pattern) => (
        <div className="rounded-md border border-border p-3 text-sm" key={pattern.id}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">{pattern.name}</div>
              <div className="text-muted-foreground">{pattern.keywords.join(", ") || pattern.componentHints.join(", ")}</div>
            </div>
            <Button disabled={pendingId === pattern.id} onClick={() => onToggle(pattern.id, !pattern.active)} size="sm" variant="secondary">
              {pattern.active ? "Deactivate" : "Activate"}
            </Button>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
            {pattern.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <div className="rounded-md border border-border bg-white p-3 text-sm" key={item}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function submit(event: FormEvent<HTMLFormElement>, action: () => void) {
  event.preventDefault();
  action();
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString("tr-TR") : "Yok";
}

function messageFromError(error: unknown) {
  if (!error) return undefined;
  if (error instanceof ApiClientError && error.status === 401) {
    return "Oturum yok veya kullanıcı bilgileri hatalı.";
  }
  if (error instanceof ApiClientError && error.status === 403) {
    return "Kullanıcı devre dışı veya yetki eksik.";
  }
  return error instanceof Error ? error.message : "Beklenmeyen hata.";
}
