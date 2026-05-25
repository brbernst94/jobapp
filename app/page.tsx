"use client";

import { useState, useEffect } from "react";
import { Briefcase, FileText, Mail, LayoutDashboard, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { JobCard } from "@/components/jobs/job-card";
import { ApplicationTracker } from "@/components/applications/application-tracker";

type Tab = "dashboard" | "jobs" | "resume" | "cover-letter" | "applications" | "gmail";

interface Client {
  id: string;
  name: string;
  email: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  location?: string;
}

interface Stats {
  total: number;
  high: number;
  applied: number;
  interviews: number;
}

type JobLeadData = {
  id: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryText?: string;
  experienceYears?: string;
  jobUrl: string;
  source: string;
  description?: string;
  postedAt?: string;
  hiringManager?: string;
  hiringManagerTitle?: string;
  hiringManagerLinkedIn?: string;
  companyNotes?: string;
  coverLetterFocus?: string;
  priority: string;
  status: string;
  application?: { id: string; status: string } | null;
};

type ApplicationData = {
  id: string;
  status: string;
  appliedAt?: string;
  lastEmailAt?: string;
  lastEmailSubject?: string;
  notes?: string;
  jobLead: {
    title: string;
    company: string;
    location: string;
    isRemote: boolean;
    salaryText?: string;
    salaryMin?: number;
    salaryMax?: number;
    companyDomain?: string;
    hiringManager?: string;
  };
  followUps: Array<{ id: string; scheduledFor: string; message: string; type: string; sent: boolean }>;
  emailEvents: Array<{ id: string; subject: string; from: string; receivedAt: string; snippet: string; statusChange?: string }>;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [client, setClient] = useState<Client | null>(null);
  const [jobs, setJobs] = useState<JobLeadData[]>([]);
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [resumeContent, setResumeContent] = useState("");
  const [coverLetterContent, setCoverLetterContent] = useState("");
  const [stats, setStats] = useState<Stats>({ total: 0, high: 0, applied: 0, interviews: 0 });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  async function seedClient() {
    setSeeding(true);
    await fetch("/api/seed", { method: "POST" });
    await loadData();
    setSeeding(false);
  }

  async function loadData() {
    setLoading(true);
    try {
      const clientsRes = await fetch("/api/clients");
      const clients = await clientsRes.json();
      if (!clients.length) { setLoading(false); return; }
      const c = clients[0];
      setClient(c);

      const [jobsRes, appsRes, resumeRes, clRes] = await Promise.all([
        fetch(`/api/jobs?clientId=${c.id}`),
        fetch(`/api/applications?clientId=${c.id}`),
        fetch(`/api/clients/${c.id}/resume`),
        fetch(`/api/clients/${c.id}/cover-letter`),
      ]);

      const jobsData = await jobsRes.json();
      const appsData = await appsRes.json();
      setJobs(jobsData);
      setApplications(appsData);

      if (resumeRes.ok) { const r = await resumeRes.json(); setResumeContent(r.content || ""); }
      if (clRes.ok) { const cl = await clRes.json(); setCoverLetterContent(cl.content || ""); }

      setStats({
        total: jobsData.length,
        high: jobsData.filter((j: JobLeadData) => j.priority === "high").length,
        applied: appsData.length,
        interviews: appsData.filter((a: ApplicationData) => a.status === "interview" || a.status === "phone_screen").length,
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchJobs() {
    setFetching(true);
    await fetch("/api/cron/fetch-jobs");
    await loadData();
    setFetching(false);
  }

  async function markApplied(jobId: string) {
    if (!client) return;
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, jobLeadId: jobId, status: "applied" }),
    });
    await loadData();
  }

  async function saveJob(jobId: string) {
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "saved" }),
    });
    await loadData();
  }

  async function dismissJob(jobId: string) {
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
    await loadData();
  }

  async function saveResume() {
    if (!client) return;
    await fetch(`/api/clients/${client.id}/resume`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: resumeContent }),
    });
    setSaveMsg("Saved!");
    setTimeout(() => setSaveMsg(""), 2000);
  }

  async function saveCoverLetter() {
    if (!client) return;
    await fetch(`/api/clients/${client.id}/cover-letter`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: coverLetterContent }),
    });
    setSaveMsg("Saved!");
    setTimeout(() => setSaveMsg(""), 2000);
  }

  async function updateApplicationStatus(appId: string, status: string) {
    await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadData();
  }

  useEffect(() => { loadData(); }, []);

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: LayoutDashboard },
    { id: "jobs" as Tab, label: "Job Leads", icon: Briefcase },
    { id: "resume" as Tab, label: "Resume", icon: FileText },
    { id: "cover-letter" as Tab, label: "Cover Letter", icon: FileText },
    { id: "applications" as Tab, label: "Applications", icon: Briefcase },
    { id: "gmail" as Tab, label: "Gmail Tracker", icon: Mail },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">JobApp Recruiter</h1>
            <p className="text-gray-600 mb-6">
              Set up Patrick Selner&apos;s recruitment dashboard with his base resume, cover letter, and job search criteria.
            </p>
            <Button onClick={seedClient} disabled={seeding} size="lg">
              {seeding ? "Setting up..." : "Set Up Patrick Selner's Dashboard"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-10">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">JobApp</p>
              <p className="text-xs text-gray-500">Graphic Designer</p>
            </div>
          </div>
          <div className="mt-3 p-2.5 bg-gray-50 rounded-lg">
            <p className="text-xs font-semibold text-gray-800">{client.name}</p>
            <p className="text-xs text-gray-500">{client.location}</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "jobs" && stats.total > 0 && (
                <Badge variant="default" className="ml-auto">{stats.total}</Badge>
              )}
              {tab.id === "applications" && stats.applied > 0 && (
                <Badge variant="info" className="ml-auto">{stats.applied}</Badge>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <Button onClick={fetchJobs} variant="secondary" size="sm" className="w-full" disabled={fetching}>
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
            {fetching ? "Fetching..." : "Fetch Today's Jobs"}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="max-w-5xl mx-auto p-6">

          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, Patrick!</h1>
                <p className="text-gray-600 mt-1">
                  Here&apos;s your job search overview for today,{" "}
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Job Leads", value: stats.total, color: "text-indigo-600" },
                  { label: "High Priority", value: stats.high, color: "text-green-600" },
                  { label: "Applications", value: stats.applied, color: "text-blue-600" },
                  { label: "Interviews", value: stats.interviews, color: "text-amber-600" },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="pt-4 pb-4 text-center">
                      <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* High priority jobs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">Top Matches Today</h2>
                  <button onClick={() => setActiveTab("jobs")} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                    View all <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {jobs.filter((j) => j.priority === "high").length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                      <p>No job leads yet.</p>
                      <Button onClick={fetchJobs} variant="secondary" size="sm" className="mt-3">
                        <RefreshCw className="w-3.5 h-3.5" /> Fetch Today&apos;s Jobs
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {jobs.filter((j) => j.priority === "high").slice(0, 3).map((job) => (
                      <JobCard key={job.id} job={job} onApply={markApplied} onSave={saveJob} onDismiss={dismissJob} />
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming follow-ups */}
              {applications.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Pending Follow-ups</h2>
                  <div className="space-y-2">
                    {applications
                      .flatMap((a) =>
                        a.followUps
                          .filter((f) => !f.sent && new Date(f.scheduledFor) <= new Date(Date.now() + 7 * 86400000))
                          .map((f) => ({ ...f, company: a.jobLead.company, title: a.jobLead.title }))
                      )
                      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
                      .slice(0, 5)
                      .map((f, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-200">
                          <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-800">{f.company}</span>
                            <span className="text-sm text-gray-500"> — {f.title}</span>
                          </div>
                          <span className="text-xs text-amber-700 font-medium shrink-0">
                            {new Date(f.scheduledFor).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* JOBS */}
          {activeTab === "jobs" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Job Leads</h1>
                  <p className="text-sm text-gray-600 mt-1">Graphic design roles in Denver, CO (+ remote) — $50k+ salary range</p>
                </div>
                <Button onClick={fetchJobs} variant="secondary" disabled={fetching}>
                  <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
                  {fetching ? "Fetching..." : "Refresh Jobs"}
                </Button>
              </div>
              {jobs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No job leads yet. Click &quot;Fetch Today&apos;s Jobs&quot; to pull the latest openings.</p>
                    <Button onClick={fetchJobs} disabled={fetching}>
                      <RefreshCw className="w-4 h-4" /> Fetch Jobs Now
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} onApply={markApplied} onSave={saveJob} onDismiss={dismissJob} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RESUME */}
          {activeTab === "resume" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Base Resume</h1>
                <div className="flex items-center gap-2">
                  {saveMsg && <span className="text-sm text-green-600 font-medium">{saveMsg}</span>}
                  <Button onClick={saveResume}>Save Resume</Button>
                </div>
              </div>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-gray-500 mb-2">Edit your base resume below. Customize per-application before submitting.</p>
                  <textarea
                    value={resumeContent}
                    onChange={(e) => setResumeContent(e.target.value)}
                    className="w-full h-[600px] font-mono text-sm border border-gray-200 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Paste or type your resume here..."
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* COVER LETTER */}
          {activeTab === "cover-letter" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Base Cover Letter</h1>
                <div className="flex items-center gap-2">
                  {saveMsg && <span className="text-sm text-green-600 font-medium">{saveMsg}</span>}
                  <Button onClick={saveCoverLetter}>Save Cover Letter</Button>
                </div>
              </div>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-gray-500 mb-2">
                    This is your base template. Use the Company Notes from each job lead to customize before sending.
                    Placeholders in [brackets] should be filled in per application.
                  </p>
                  <textarea
                    value={coverLetterContent}
                    onChange={(e) => setCoverLetterContent(e.target.value)}
                    className="w-full h-[600px] font-mono text-sm border border-gray-200 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Paste or type your cover letter template here..."
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* APPLICATIONS */}
          {activeTab === "applications" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
              {applications.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">No applications yet. Mark jobs as applied from the Job Leads tab.</p>
                  </CardContent>
                </Card>
              ) : (
                <ApplicationTracker applications={applications} onStatusChange={updateApplicationStatus} />
              )}
            </div>
          )}

          {/* GMAIL */}
          {activeTab === "gmail" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gray-900">Gmail Application Tracker</h1>

              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-indigo-600" />
                    How It Works
                  </h2>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4 text-sm text-gray-700">
                    {[
                      {
                        n: 1,
                        title: "Domain Matching",
                        body: 'When you apply to a company (e.g., ibotta.com), the tracker watches your Gmail inbox for emails from *@ibotta.com and automatically links them to your application.',
                      },
                      {
                        n: 2,
                        title: "Status Detection",
                        body: 'Email subjects and content are scanned for signals like "thank you for applying," "schedule an interview," "not moving forward" — and your application status updates automatically.',
                      },
                      {
                        n: 3,
                        title: "Follow-up Reminders",
                        body: "When you mark a job as applied, the system automatically schedules follow-up reminders at 1 week, 2 weeks, and 3 weeks with pre-written draft emails you can customize and send.",
                      },
                      {
                        n: 4,
                        title: "Chrome Extension",
                        body: "The Gmail plugin reads your inbox in the background, calls /api/gmail/sync with matched emails, and badges the extension icon when a status changes.",
                      },
                    ].map((s) => (
                      <li key={s.n} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">{s.n}</span>
                        <div><strong>{s.title}:</strong> {s.body}</div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><h2 className="font-semibold text-gray-900">Setup Instructions</h2></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-amber-800 mb-2">Gmail API Configuration</h3>
                      <ol className="text-sm text-amber-700 space-y-1.5 list-decimal list-inside">
                        <li>Go to <strong>console.cloud.google.com</strong> → Create a new project</li>
                        <li>Enable the <strong>Gmail API</strong></li>
                        <li>Create OAuth 2.0 credentials (Web Application)</li>
                        <li>Add <code className="bg-amber-100 px-1 rounded">http://localhost:3000/api/auth/callback/google</code> as redirect URI</li>
                        <li>Copy Client ID and Secret into <code className="bg-amber-100 px-1 rounded">.env</code>:
                          <pre className="mt-1 bg-amber-100 rounded p-2 text-xs whitespace-pre">{`GMAIL_CLIENT_ID=your_client_id\nGMAIL_CLIENT_SECRET=your_secret`}</pre>
                        </li>
                      </ol>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-blue-800 mb-2">Chrome Extension Installation</h3>
                      <ol className="text-sm text-blue-700 space-y-1.5 list-decimal list-inside">
                        <li>Open Chrome → <code className="bg-blue-100 px-1 rounded">chrome://extensions</code></li>
                        <li>Enable <strong>Developer Mode</strong></li>
                        <li>Click <strong>Load unpacked</strong> → select the <code className="bg-blue-100 px-1 rounded">/chrome-extension</code> folder</li>
                        <li>Pin the JobApp extension to your toolbar</li>
                        <li>Click the extension icon → sign in with Gmail</li>
                      </ol>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-800 mb-1">API Endpoint</h3>
                      <code className="block bg-gray-100 rounded p-2 text-xs">POST /api/gmail/sync</code>
                      <p className="text-xs text-gray-500 mt-2">Body: <code>{"{ emails: [{ threadId, messageId, subject, from, snippet, receivedAt }] }"}</code></p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><h2 className="font-semibold text-gray-900">Email Status Signal Keywords</h2></CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    {[
                      { status: "Applied", keywords: ["thank you for applying", "application received"], color: "blue" },
                      { status: "Phone Screen", keywords: ["schedule a call", "phone screen", "next steps"], color: "indigo" },
                      { status: "Interview", keywords: ["interview", "meet with our team", "video interview"], color: "yellow" },
                      { status: "Offer", keywords: ["offer", "pleased to offer", "offer letter"], color: "green" },
                      { status: "Rejected", keywords: ["not moving forward", "unfortunately", "not selected"], color: "red" },
                    ].map((s) => (
                      <div key={s.status} className={`p-3 rounded-lg bg-${s.color}-50 border border-${s.color}-200`}>
                        <p className={`text-xs font-semibold text-${s.color}-700 uppercase mb-1`}>{s.status}</p>
                        <ul className="space-y-0.5">
                          {s.keywords.map((k) => (
                            <li key={k} className={`text-xs text-${s.color}-600`}>&ldquo;{k}&rdquo;</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
