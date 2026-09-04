// Static mock data — will be replaced by real API calls in later tasks.
// Kept in one file so it's easy to find and swap out.

export const docs = [
  {
    id: 1,
    title: "Payments service runbook",
    type: "PDF",
    project: "Payments",
    icon: "▤",
    status: "Current",
    meta: "updated 3d ago · Nadia R.",
    excerpt:
      "On-call procedures for the settlement pipeline: retry windows, dead-letter replay, and the escalation ladder for stuck payouts.",
    tags: ["oncall", "runbook", "settlement"],
  },
  {
    id: 2,
    title: "README — atlas-ingest",
    type: "README",
    project: "Platform",
    icon: "›_",
    status: "Current",
    meta: "synced from GitHub · 1d ago",
    excerpt:
      "Local setup, env vars and the ingestion CLI. Covers parser plugins for PDF, Markdown and Google Docs exports.",
    tags: ["setup", "cli", "ingest"],
  },
  {
    id: 3,
    title: "Onboarding checklist for new hires",
    type: "Google Doc",
    project: "People",
    icon: "◲",
    status: "Outdated",
    meta: "updated 7mo ago · Priya M.",
    excerpt:
      "Day-one accounts, laptop provisioning and the buddy programme. Some tooling steps predate the SSO migration.",
    tags: ["onboarding", "accounts", "sso"],
  },
  {
    id: 4,
    title: "Designing idempotent webhooks",
    type: "Medium",
    project: "Platform",
    icon: "✎",
    status: "Current",
    meta: "saved by Tom B. · 2w ago",
    excerpt:
      "External write-up the team uses as the reference for webhook keys, replay windows and consumer-side deduplication.",
    tags: ["webhooks", "idempotency"],
  },
  {
    id: 5,
    title: "Multi-region failover drill notes",
    type: "PDF",
    project: "Platform",
    icon: "▤",
    status: "In review",
    meta: "updated 5d ago · Sam O.",
    excerpt:
      "What broke during the June drill, how long DNS propagation actually took, and the follow-up actions still open.",
    tags: ["failover", "incident", "dns"],
  },
];

export const threads = [
  {
    id: 1,
    title: "Why do payouts stall at 'pending_capture'?",
    project: "Payments",
    status: "Answered",
    preview: "Seeing payouts stuck for over an hour. Nothing in the dead-letter queue.",
    meta: "6 replies · 2d ago",
  },
  {
    id: 2,
    title: "Which accounts are auto-provisioned after SSO?",
    project: "People",
    status: "Answered",
    preview: "The onboarding doc still lists manual Jira and Figma steps.",
    meta: "2 replies · 5d ago",
  },
  {
    id: 3,
    title: "How do I add a new parser plugin?",
    project: "Platform",
    status: "Answered",
    preview: "Want to index Confluence exports without patching the ingest service.",
    meta: "3 replies · 1w ago",
  },
  {
    id: 4,
    title: "Do we still need a manual DNS cutover?",
    project: "Platform",
    status: "Open",
    preview: "Drill notes say yes, but the new health checks might handle it.",
    meta: "4 replies · open",
  },
];

export const projects = ["All projects", "Platform", "Payments", "People", "Design"];

export const sources = [
  { name: "Google Drive",    icon: "◲", meta: "3 folders · auto-sync hourly" },
  { name: "GitHub READMEs", icon: "›_", meta: "12 repos · on push" },
  { name: "Medium",         icon: "✎", meta: "Saved links · manual" },
  { name: "Dev.to",         icon: "✎", meta: "Saved links · manual" },
  { name: "Accepted answers", icon: "◇", meta: "68 threads indexed" },
];
