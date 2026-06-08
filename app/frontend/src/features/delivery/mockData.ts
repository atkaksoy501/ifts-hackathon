import type { JiraIssueDto, SizingRecommendationDto, SyncStatusDto } from "@module1/contracts";

export const syncStatus: SyncStatusDto = {
  projectKeys: ["ICTFT"],
  hasUsableData: true,
  warnings: [
    {
      code: "LOW_SPRINT_HISTORY",
      message: "3 sprint altı veri var; öneri bloklanmadı.",
      severity: "warning"
    }
  ]
};

export const backlogIssues: JiraIssueDto[] = [
  {
    key: "ICTFT-201",
    projectKey: "ICTFT",
    summary: "Seçilen issue için sizing önerisi göster",
    description: "Historical issue benzerliğiyle story point ve ideal saat önerilir.",
    issueType: "Story",
    statusCategory: "To Do",
    statusName: "Backlog",
    sprintIds: [],
    labels: ["sizing"],
    components: ["recommendation"]
  },
  {
    key: "ICTFT-202",
    projectKey: "ICTFT",
    summary: "Blockage advisor aksiyonlarını göster",
    description: "Issue metninden olası blokaj aksiyonları ve evidence çıkarılır.",
    issueType: "Story",
    statusCategory: "To Do",
    statusName: "Backlog",
    sprintIds: [],
    labels: ["blockage"],
    components: ["advisor"]
  }
];

export const sizingRecommendation: SizingRecommendationDto = {
  id: "rec-demo",
  issueKey: "ICTFT-201",
  storyPoints: 5,
  idealHours: 30,
  confidence: 0.72,
  confidenceBreakdown: {
    similarity: 0.68,
    neighborCount: 0.66,
    dataCompleteness: 0.8,
    variance: 0.7
  },
  warnings: syncStatus.warnings,
  similarIssues: [
    {
      key: "ICTFT-101",
      summary: "Login akışı ve session guard",
      similarity: 0.62,
      storyPoints: 5,
      timeSpentHours: 28
    },
    {
      key: "ICTFT-102",
      summary: "Backlog verisini normalize et",
      similarity: 0.58,
      storyPoints: 8,
      timeSpentHours: 44
    }
  ],
  rationale: "Benzer geçmiş işler, veri tamlığı ve varyans birlikte değerlendirildi.",
  createdAt: new Date().toISOString()
};
