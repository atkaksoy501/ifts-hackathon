import { Activity, AlertTriangle, Gauge, Lock, Search, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "../../shared/ui/badge.js";
import { Button } from "../../shared/ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card.js";
import { Input } from "../../shared/ui/input.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../shared/ui/tabs.js";
import { backlogIssues, sizingRecommendation, syncStatus } from "./mockData.js";
import { tr } from "./dictionary.js";

export function DeliveryDashboard() {
  const [selectedKey, setSelectedKey] = useState(backlogIssues[0]?.key ?? "");
  const [search, setSearch] = useState("");
  const selectedIssue = backlogIssues.find((issue) => issue.key === selectedKey) ?? backlogIssues[0];
  const filteredIssues = useMemo(
    () =>
      backlogIssues.filter((issue) =>
        `${issue.key} ${issue.summary} ${issue.components.join(" ")}`.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-primary">ICTFT</p>
            <h1 className="text-xl font-semibold md:text-2xl">{tr.appName}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm">
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Button>
            <Button size="sm">
              <Activity className="h-4 w-4" />
              Sync
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{tr.login}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="grid gap-1 text-sm">
                {tr.username}
                <Input defaultValue="admin" />
              </label>
              <label className="grid gap-1 text-sm">
                {tr.password}
                <Input type="password" defaultValue="admin12345" />
              </label>
              <Button className="w-full">
                <Lock className="h-4 w-4" />
                {tr.login}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tr.syncHealth}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Usable data</span>
                <Badge tone={syncStatus.hasUsableData ? "success" : "warning"}>
                  {syncStatus.hasUsableData ? "OK" : "Eksik"}
                </Badge>
              </div>
              {syncStatus.warnings.map((warning) => (
                <div className="flex gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-800" key={warning.code}>
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{warning.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-4">
          <Tabs defaultValue="sizing">
            <TabsList>
              <TabsTrigger value="sizing">
                <Gauge className="mr-2 h-4 w-4" />
                {tr.sizing}
              </TabsTrigger>
              <TabsTrigger value="blockage">
                <AlertTriangle className="mr-2 h-4 w-4" />
                {tr.blockage}
              </TabsTrigger>
              <TabsTrigger value="admin">
                <Users className="mr-2 h-4 w-4" />
                {tr.admin}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sizing">
              <div className="grid gap-4 xl:grid-cols-[minmax(280px,420px)_minmax(0,1fr)]">
                <Card>
                  <CardHeader>
                    <CardTitle>{tr.backlog}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" onChange={(event) => setSearch(event.target.value)} value={search} />
                    </div>
                    <div className="space-y-2">
                      {filteredIssues.map((issue) => (
                        <button
                          className={`w-full rounded-md border p-3 text-left text-sm transition ${
                            issue.key === selectedKey
                              ? "border-primary bg-teal-50"
                              : "border-border bg-white hover:bg-muted"
                          }`}
                          key={issue.key}
                          onClick={() => setSelectedKey(issue.key)}
                          type="button"
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span className="font-semibold">{issue.key}</span>
                            <Badge tone="info">{issue.issueType}</Badge>
                          </span>
                          <span className="mt-1 block text-muted-foreground">{issue.summary}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{tr.selectedIssue}: {selectedIssue?.key}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <Metric label={tr.storyPoint} value={sizingRecommendation.storyPoints} />
                      <Metric label={tr.idealHour} value={sizingRecommendation.idealHours} />
                      <Metric label={tr.confidence} value={`%${Math.round(sizingRecommendation.confidence * 100)}`} />
                    </div>
                    <p className="rounded-md bg-muted p-3 text-sm">{sizingRecommendation.rationale}</p>
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
                          {sizingRecommendation.similarIssues.map((issue) => (
                            <tr className="border-b border-border last:border-0" key={issue.key}>
                              <td className="py-2 pr-3">
                                <span className="font-medium">{issue.key}</span>
                                <span className="block text-muted-foreground">{issue.summary}</span>
                              </td>
                              <td className="py-2 pr-3">%{Math.round(issue.similarity * 100)}</td>
                              <td className="py-2 pr-3">{issue.storyPoints}</td>
                              <td className="py-2 pr-3">{issue.timeSpentHours}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="blockage">
              <Card>
                <CardHeader>
                  <CardTitle>{tr.actions}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {["Bağımlı ekip ve beklenen çıktı netleştirilsin.", "Owner ve tarih issue açıklamasına eklensin."].map(
                    (action) => (
                      <div className="rounded-md border border-border bg-white p-3 text-sm" key={action}>
                        {action}
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin">
              <Card>
                <CardHeader>
                  <CardTitle>Admin KB</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <Input defaultValue="Bağımlılık bekleniyor" />
                  <Button>
                    <ShieldCheck className="h-4 w-4" />
                    Kaydet
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </main>
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
