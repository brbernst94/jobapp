"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Briefcase, FileText, Mail, LayoutDashboard, ChevronRight,
  RefreshCw, User, ArrowLeft, Plus, Pencil, MapPin,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { JobCard } from "@/components/jobs/job-card";
import { ApplicationTracker } from "@/components/applications/application-tracker";

type Tab = "dashboard" | "jobs" | "resume" | "cover-letter" | "applications" | "gmail" | "profile";
type View = "landing" | "setup" | "dashboard";
type SetupStep = 1 | 2 | 3;

interface JobCriteria {
  salaryMin: number;
  salaryMax?: number;
  locations: string;
  remoteOk: boolean;
  expMin: number;
  expMax: number;
  titles: string;
  industry?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  bio?: string;
  criteria?: JobCriteria;
  gmailConnected?: boolean;
  gmailSyncedAt?: string;
  createdAt: string;
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

// --- Landing Page ---
function LandingPage({ clients, onSelect, onCreate }: {
  clients: Client[];
  onSelect: (c: Client) => void;
  onCreate: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <Briefcase className="w-4 h-4" /> AI-Powered Job Search
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Your Personal<br />
          <span className="text-indigo-600">Recruiting Assistant</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Tell us what you&apos;re looking for. We&apos;ll surface matching jobs daily,
          research hiring managers, prep your cover letter notes, and track every application.
        </p>
        <Button onClick={onCreate} size="lg">
          <Plus className="w-5 h-5" /> Create Your Profile
        </Button>
      </div>

      {/* Feature cards */}
      <div className="max-w-4xl mx-auto px-6 mb-16">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: Briefcase, title: "Daily Job Matching", desc: "We search LinkedIn, Indeed, BuiltIn CO and more every day using your criteria — salary, location, experience level." },
            { icon: User, title: "Hiring Manager Research", desc: "For each role, we surface the likely hiring contact and give you LinkedIn search instructions when a direct name isn't available." },
            { icon: Mail, title: "Gmail Status Tracking", desc: "Connect Gmail to auto-detect application status changes (applied → interview → offer) from incoming company emails." },
          ].map((f) => (
            <Card key={f.title} className="text-center p-2">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <f.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Existing profiles */}
      {clients.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-20">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Existing Profiles</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {clients.map((c) => (
              <button key={c.id} onClick={() => onSelect(c)} className="text-left">
                <Card className="hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{c.name}</p>
                        <p className="text-sm text-gray-500">{c.email}</p>
                        {c.location && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {c.location}
                          </p>
                        )}
                        {c.criteria && (
                          <p className="text-xs text-indigo-600 mt-1">
                            {c.criteria.titles.split(",")[0].trim()} · ${(c.criteria.salaryMin / 1000).toFixed(0)}k+ · {c.criteria.expMin}–{c.criteria.expMax} yrs exp
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 mt-0.5" />
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button onClick={onCreate} className="text-sm text-indigo-600 hover:underline flex items-center gap-1 mx-auto">
              <Plus className="w-4 h-4" /> Add another profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Setup Wizard ---
const TITLE_OPTIONS = [
  "Graphic Designer", "Brand Designer", "Visual Designer", "Digital Designer",
  "UI Designer", "Motion Designer", "Creative Designer", "Marketing Designer",
  "Illustrator", "Art Director", "Junior Designer", "Senior Designer",
];

const LOCATION_OPTIONS = [
  "Denver, CO", "Boulder, CO", "Aurora, CO", "Fort Collins, CO",
  "Colorado Springs, CO", "New York, NY", "Los Angeles, CA", "Chicago, IL",
  "Austin, TX", "Seattle, WA", "San Francisco, CA",
];

function SetupWizard({ onComplete, onBack }: {
  onComplete: (client: Client) => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<SetupStep>(1);
  const [saving, setSaving] = useState(false);

  // Step 1: About You
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [bio, setBio] = useState("");

  // Step 2: Job Criteria
  const [selectedTitles, setSelectedTitles] = useState<string[]>(["Graphic Designer"]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["Denver, CO"]);
  const [remoteOk, setRemoteOk] = useState(true);
  const [salaryMin, setSalaryMin] = useState(50000);
  const [expMin, setExpMin] = useState(1);
  const [expMax, setExpMax] = useState(3);
  const [industry, setIndustry] = useState("");

  // Step 3: Documents
  const [resume, setResume] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  function toggleTitle(t: string) {
    setSelectedTitles(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }
  function toggleLocation(l: string) {
    setSelectedLocations(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, phone, location, portfolioUrl, linkedinUrl, bio,
          criteria: {
            salaryMin,
            locations: selectedLocations.join(","),
            remoteOk,
            expMin,
            expMax,
            titles: selectedTitles.join(","),
            industry: industry || undefined,
          },
        }),
      });
      const client = await res.json();

      // Save resume and cover letter if provided
      if (resume) {
        await fetch(`/api/clients/${client.id}/resume`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: resume }),
        });
      }
      if (coverLetter) {
        await fetch(`/api/clients/${client.id}/cover-letter`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: coverLetter }),
        });
      }

      onComplete(client);
    } finally {
      setSaving(false);
    }
  }

  const step1Valid = name.trim() && email.trim();
  const step2Valid = selectedTitles.length > 0 && (selectedLocations.length > 0 || remoteOk);

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600 mr-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          {([1, 2, 3] as SetupStep[]).map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step > s ? "bg-indigo-600 text-white" : step === s ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${step >= s ? "text-gray-900" : "text-gray-400"}`}>
                {s === 1 ? "About You" : s === 2 ? "Job Criteria" : "Documents"}
              </span>
              {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? "bg-indigo-600" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: About You */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold text-gray-900">About You</h2>
              <p className="text-sm text-gray-500">Your basic contact information and online presence</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Full Name *</label>
                    <input value={name} onChange={e => setName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Jane Smith" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Email *</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="jane@email.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="(720) 555-0100" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Current City</label>
                    <input value={location} onChange={e => setLocation(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Denver, CO" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Portfolio URL</label>
                  <input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://yourportfolio.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">LinkedIn URL</label>
                  <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://linkedin.com/in/yourname" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Professional Summary <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="2-sentence summary of your design background and what you're looking for..." />
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={() => setStep(2)} disabled={!step1Valid}>
                    Next: Job Criteria <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Job Criteria */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold text-gray-900">Job Search Criteria</h2>
              <p className="text-sm text-gray-500">We&apos;ll use these to find and rank matching roles every day</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Target Job Titles (select all that apply)</label>
                  <div className="flex flex-wrap gap-2">
                    {TITLE_OPTIONS.map(t => (
                      <button key={t} onClick={() => toggleTitle(t)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          selectedTitles.includes(t)
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Preferred Locations</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {LOCATION_OPTIONS.map(l => (
                      <button key={l} onClick={() => toggleLocation(l)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          selectedLocations.includes(l)
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
                        }`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input type="checkbox" checked={remoteOk} onChange={e => setRemoteOk(e.target.checked)}
                      className="rounded text-indigo-600" />
                    <span className="text-sm text-gray-700">Include remote positions</span>
                  </label>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">
                    Minimum Salary: <span className="text-indigo-600">${salaryMin.toLocaleString()}/yr</span>
                  </label>
                  <input type="range" min={30000} max={150000} step={5000} value={salaryMin}
                    onChange={e => setSalaryMin(parseInt(e.target.value))}
                    className="w-full accent-indigo-600" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>$30k</span><span>$90k</span><span>$150k</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Years of Experience</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">Minimum</label>
                      <select value={expMin} onChange={e => setExpMin(parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n === 0 ? "Entry level" : `${n} year${n > 1 ? "s" : ""}`}</option>)}
                      </select>
                    </div>
                    <span className="text-gray-400 mt-4">–</span>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">Maximum</label>
                      <select value={expMax} onChange={e => setExpMax(parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} year{n > 1 ? "s" : ""}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Industry Focus <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input value={industry} onChange={e => setIndustry(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Healthcare, Tech, E-commerce, Non-profit..." />
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="secondary" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4" /> Back</Button>
                  <Button onClick={() => setStep(3)} disabled={!step2Valid}>
                    Next: Documents <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Documents */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold text-gray-900">Base Documents</h2>
              <p className="text-sm text-gray-500">Paste your resume and cover letter template. You can edit these later — skip if you don&apos;t have them ready.</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Base Resume</label>
                  <textarea value={resume} onChange={e => setResume(e.target.value)} rows={8}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Paste your resume text here..." />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Base Cover Letter Template</label>
                  <textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)} rows={8}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Paste your cover letter template here. Use [Company Name], [Hiring Manager], [Role] as placeholders..." />
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="secondary" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4" /> Back</Button>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? "Creating Profile..." : "Create Profile & Start Searching"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// --- Dashboard ---
function Dashboard({ client, onBack }: { client: Client; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [jobs, setJobs] = useState<JobLeadData[]>([]);
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [resumeContent, setResumeContent] = useState("");
  const [coverLetterContent, setCoverLetterContent] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [profileData, setProfileData] = useState(client);
  const [gmailConnected, setGmailConnected] = useState(client.gmailConnected ?? false);
  const [gmailSyncing, setGmailSyncing] = useState(false);
  const [gmailResult, setGmailResult] = useState<{ matched: number; emailsScanned: number } | null>(null);
  const [editingCriteria, setEditingCriteria] = useState(false);
  const [criteriaForm, setCriteriaForm] = useState<JobCriteria>(client.criteria ?? {
    salaryMin: 50000, locations: "Denver, CO", remoteOk: true, expMin: 1, expMax: 3,
    titles: "Graphic Designer,Brand Designer,Visual Designer",
  });

  const stats = {
    total: jobs.length,
    high: jobs.filter(j => j.priority === "high").length,
    applied: applications.length,
    interviews: applications.filter(a => a.status === "interview" || a.status === "phone_screen").length,
  };

  const loadData = useCallback(async () => {
    const [jobsRes, appsRes, resumeRes, clRes] = await Promise.all([
      fetch(`/api/jobs?clientId=${client.id}`),
      fetch(`/api/applications?clientId=${client.id}`),
      fetch(`/api/clients/${client.id}/resume`),
      fetch(`/api/clients/${client.id}/cover-letter`),
    ]);
    setJobs(await jobsRes.json());
    setApplications(await appsRes.json());
    if (resumeRes.ok) { const r = await resumeRes.json(); setResumeContent(r.content || ""); }
    if (clRes.ok) { const cl = await clRes.json(); setCoverLetterContent(cl.content || ""); }
  }, [client.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle Gmail OAuth redirect back (?gmailConnected=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmailConnected") === "1") {
      setGmailConnected(true);
      setActiveTab("gmail");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Keep profileData in sync when client prop changes
  useEffect(() => {
    setProfileData(client);
    setCriteriaForm(client.criteria ?? {
      salaryMin: 50000, locations: "Denver, CO", remoteOk: true, expMin: 1, expMax: 3,
      titles: "Graphic Designer,Brand Designer,Visual Designer",
    });
  }, [client]);

  async function fetchJobs() {
    setFetching(true);
    const res = await fetch(`/api/cron/fetch-jobs?clientId=${client.id}`);
    const data = await res.json();
    await loadData();
    setFetching(false);
    const added = data?.results?.[client.id]?.added ?? 0;
    const skipped = data?.results?.[client.id]?.skipped ?? 0;
    const sources = data?.sources ?? [];
    const sourceStr = sources.length ? ` from ${sources.join(", ")}` : "";
    alert(`Added ${added} new job${added !== 1 ? "s" : ""}${sourceStr}.\n${skipped} duplicate${skipped !== 1 ? "s" : ""} skipped.`);
  }

  async function clearAndRefetch() {
    setFetching(true);
    const delRes = await fetch(`/api/jobs/clear?clientId=${client.id}`, { method: "DELETE" });
    const delData = await delRes.json();
    const fetchRes = await fetch(`/api/cron/fetch-jobs?clientId=${client.id}`);
    const fetchData = await fetchRes.json();
    await loadData();
    setFetching(false);
    const added = fetchData?.results?.[client.id]?.added ?? 0;
    const sources = fetchData?.sources ?? [];
    const sourceStr = sources.length ? ` (${sources.join(", ")})` : "";
    alert(`Deleted ${delData.deleted ?? 0} old jobs.\nAdded ${added} new jobs${sourceStr}.${added === 0 ? "\n\nNo real listings found — check that RAPIDAPI_KEY is set correctly in Railway." : ""}`);
  }

  async function syncGmail() {
    setGmailSyncing(true);
    const res = await fetch(`/api/gmail/sync?clientId=${client.id}`);
    const data = await res.json();
    if (res.ok) {
      setGmailResult({ matched: data.matched, emailsScanned: data.emailsScanned });
      await loadData();
    }
    setGmailSyncing(false);
  }

  async function markApplied(jobId: string) {
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, jobLeadId: jobId, status: "applied" }),
    });
    await loadData();
  }

  async function saveJob(jobId: string) {
    await fetch(`/api/jobs/${jobId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "saved" }) });
    await loadData();
  }

  async function dismissJob(jobId: string) {
    await fetch(`/api/jobs/${jobId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "dismissed" }) });
    await loadData();
  }

  async function saveResume() {
    await fetch(`/api/clients/${client.id}/resume`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: resumeContent }) });
    setSaveMsg("Saved!"); setTimeout(() => setSaveMsg(""), 2000);
  }

  async function saveCoverLetter() {
    await fetch(`/api/clients/${client.id}/cover-letter`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: coverLetterContent }) });
    setSaveMsg("Saved!"); setTimeout(() => setSaveMsg(""), 2000);
  }

  async function updateApplicationStatus(appId: string, status: string) {
    await fetch(`/api/applications/${appId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await loadData();
  }

  async function saveCriteria() {
    await fetch(`/api/clients/${client.id}/criteria`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(criteriaForm) });
    setProfileData(prev => ({ ...prev, criteria: criteriaForm }));
    setEditingCriteria(false);
    setSaveMsg("Criteria saved!"); setTimeout(() => setSaveMsg(""), 2000);
  }

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: LayoutDashboard },
    { id: "jobs" as Tab, label: "Job Leads", icon: Briefcase, count: stats.total },
    { id: "resume" as Tab, label: "Resume", icon: FileText },
    { id: "cover-letter" as Tab, label: "Cover Letter", icon: FileText },
    { id: "applications" as Tab, label: "Applications", icon: Briefcase, count: stats.applied },
    { id: "gmail" as Tab, label: "Gmail Tracker", icon: Mail },
    { id: "profile" as Tab, label: "My Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-10">
        <div className="p-4 border-b border-gray-100">
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3">
            <ArrowLeft className="w-3 h-3" /> All Profiles
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              {client.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{client.name}</p>
              <p className="text-xs text-gray-500 truncate">{client.location || client.email}</p>
            </div>
          </div>
          {profileData.criteria && (
            <div className="mt-2 p-2 bg-indigo-50 rounded-lg">
              <p className="text-xs text-indigo-700 font-medium">{profileData.criteria.titles.split(",")[0].trim()}</p>
              <p className="text-xs text-indigo-600">${(profileData.criteria.salaryMin / 1000).toFixed(0)}k+ · {profileData.criteria.expMin}–{profileData.criteria.expMax} yrs</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="default" className="ml-auto">{tab.count}</Badge>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-2">
          <Button onClick={fetchJobs} variant="secondary" size="sm" className="w-full" disabled={fetching}>
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
            {fetching ? "Fetching..." : "Fetch Today's Jobs"}
          </Button>
          <Button onClick={clearAndRefetch} variant="ghost" size="sm" className="w-full text-xs text-gray-400 hover:text-red-600" disabled={fetching}>
            Clear old & re-fetch
          </Button>
        </div>
      </div>

      <div className="pl-64">
        <main className="max-w-5xl mx-auto p-6">

          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {client.name.split(" ")[0]}!</h1>
                <p className="text-gray-600 mt-1">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Job Leads", value: stats.total, color: "text-indigo-600" },
                  { label: "High Priority", value: stats.high, color: "text-green-600" },
                  { label: "Applications", value: stats.applied, color: "text-blue-600" },
                  { label: "Interviews", value: stats.interviews, color: "text-amber-600" },
                ].map(s => (
                  <Card key={s.label}><CardContent className="pt-4 pb-4 text-center">
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                  </CardContent></Card>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">Top Matches Today</h2>
                  <button onClick={() => setActiveTab("jobs")} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                    View all <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {jobs.filter(j => j.priority === "high").length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-gray-500">
                    <p>No job leads yet.</p>
                    <Button onClick={fetchJobs} variant="secondary" size="sm" className="mt-3">
                      <RefreshCw className="w-3.5 h-3.5" /> Fetch Today&apos;s Jobs
                    </Button>
                  </CardContent></Card>
                ) : (
                  <div className="space-y-3">
                    {jobs.filter(j => j.priority === "high").slice(0, 3).map(job => (
                      <JobCard key={job.id} job={job} onApply={markApplied} onSave={saveJob} onDismiss={dismissJob} />
                    ))}
                  </div>
                )}
              </div>

              {applications.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Pending Follow-ups</h2>
                  <div className="space-y-2">
                    {applications.flatMap(a =>
                      a.followUps.filter(f => !f.sent && new Date(f.scheduledFor) <= new Date(Date.now() + 7 * 86400000))
                        .map(f => ({ ...f, company: a.jobLead.company, title: a.jobLead.title }))
                    ).sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
                    .slice(0, 5).map((f, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-200">
                        <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-800">{f.company}</span>
                          <span className="text-sm text-gray-500"> — {f.title}</span>
                        </div>
                        <span className="text-xs text-amber-700 font-medium shrink-0">{new Date(f.scheduledFor).toLocaleDateString()}</span>
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
                  <p className="text-sm text-gray-600 mt-1">
                    {profileData.criteria?.titles?.split(",").slice(0,2).join(", ")} roles · ${((profileData.criteria?.salaryMin ?? 50000) / 1000).toFixed(0)}k+ · {profileData.criteria?.locations?.split(",")[0] || "Denver, CO"} {profileData.criteria?.remoteOk ? "+ Remote" : ""}
                  </p>
                </div>
                <Button onClick={fetchJobs} variant="secondary" disabled={fetching}>
                  <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
                  {fetching ? "Fetching..." : "Refresh"}
                </Button>
              </div>
              {jobs.length === 0 ? (
                <Card><CardContent className="py-12 text-center">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No job leads yet.</p>
                  <Button onClick={fetchJobs} disabled={fetching}><RefreshCw className="w-4 h-4" /> Fetch Jobs Now</Button>
                </CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {jobs.map(job => <JobCard key={job.id} job={job} onApply={markApplied} onSave={saveJob} onDismiss={dismissJob} />)}
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
              <Card><CardContent className="pt-4">
                <p className="text-xs text-gray-500 mb-2">Edit your base resume. Customize per-application before submitting.</p>
                <textarea value={resumeContent} onChange={e => setResumeContent(e.target.value)}
                  className="w-full h-[600px] font-mono text-sm border border-gray-200 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Paste or type your resume here..." />
              </CardContent></Card>
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
              <Card><CardContent className="pt-4">
                <p className="text-xs text-gray-500 mb-2">Your base template. Use [Company Name], [Hiring Manager], [Role] as placeholders. Customize from Company Notes on each job card.</p>
                <textarea value={coverLetterContent} onChange={e => setCoverLetterContent(e.target.value)}
                  className="w-full h-[600px] font-mono text-sm border border-gray-200 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Paste or type your cover letter template here..." />
              </CardContent></Card>
            </div>
          )}

          {/* APPLICATIONS */}
          {activeTab === "applications" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
              {applications.length === 0 ? (
                <Card><CardContent className="py-12 text-center">
                  <p className="text-gray-500">No applications yet. Mark jobs as applied from the Job Leads tab.</p>
                </CardContent></Card>
              ) : (
                <ApplicationTracker applications={applications} onStatusChange={updateApplicationStatus} />
              )}
            </div>
          )}

          {/* GMAIL */}
          {activeTab === "gmail" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gray-900">Gmail Application Tracker</h1>

              {/* Connection status card */}
              <Card>
                <CardContent className="pt-6">
                  {gmailConnected ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <div>
                          <p className="font-medium text-gray-900">Gmail Connected</p>
                          <p className="text-sm text-gray-500">{client.gmailSyncedAt ? `Last synced ${new Date(client.gmailSyncedAt).toLocaleString()}` : "Never synced"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={syncGmail} disabled={gmailSyncing} variant="secondary" size="sm">
                          <RefreshCw className={`w-4 h-4 ${gmailSyncing ? "animate-spin" : ""}`} />
                          {gmailSyncing ? "Syncing…" : "Sync Now"}
                        </Button>
                        <Button onClick={() => window.location.href = `/api/gmail/auth?clientId=${client.id}`} variant="ghost" size="sm" className="text-gray-400 text-xs">
                          Reconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 space-y-4">
                      <Mail className="w-12 h-12 text-gray-300 mx-auto" />
                      <div>
                        <p className="font-semibold text-gray-900">Connect your Gmail</p>
                        <p className="text-sm text-gray-500 mt-1">We&apos;ll scan your inbox for replies from companies you&apos;ve applied to and automatically update your application status.</p>
                      </div>
                      <Button onClick={() => window.location.href = `/api/gmail/auth?clientId=${client.id}`} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Mail className="w-4 h-4" /> Connect Gmail
                      </Button>
                      <p className="text-xs text-gray-400">Read-only access · We never send emails on your behalf</p>
                    </div>
                  )}
                  {gmailResult && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                      Scanned {gmailResult.emailsScanned} emails · Matched {gmailResult.matched} to your applications
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* How it works */}
              <Card>
                <CardHeader><h2 className="font-semibold text-gray-900">How It Works</h2></CardHeader>
                <CardContent>
                  <ol className="space-y-4 text-sm text-gray-700">
                    {[
                      { n: 1, title: "Domain Matching", body: "When you mark a job as applied (e.g., ibotta.com), we watch your inbox for emails from *@ibotta.com." },
                      { n: 2, title: "Status Detection", body: '"Thank you for applying" → Applied · "Schedule an interview" → Interview · "Not moving forward" → Rejected.' },
                      { n: 3, title: "Auto-updates", body: "Your Applications tab updates automatically. Click Sync Now any time to check for new replies." },
                      { n: 4, title: "Privacy", body: "Read-only Gmail access. We only look at sender domain + subject line. Email body content is never read or stored." },
                    ].map(s => (
                      <li key={s.n} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">{s.n}</span>
                        <div><strong>{s.title}:</strong> {s.body}</div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* Recent email events */}
              {applications.filter(a => a.emailEvents?.length > 0).length > 0 && (
                <Card>
                  <CardHeader><h2 className="font-semibold text-gray-900">Recent Email Activity</h2></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {applications.filter(a => a.emailEvents?.length > 0).flatMap(a =>
                        a.emailEvents.map(ev => (
                          <div key={ev.id} className="flex items-start gap-3 text-sm border-b border-gray-100 pb-3 last:border-0">
                            <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-900">{ev.subject || "(no subject)"}</p>
                              <p className="text-gray-500">{ev.from} · {new Date(ev.receivedAt).toLocaleDateString()}</p>
                              {ev.statusChange && <Badge className="mt-1 text-xs">{ev.statusChange}</Badge>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                {saveMsg && <span className="text-sm text-green-600 font-medium">{saveMsg}</span>}
              </div>

              <Card>
                <CardHeader><h2 className="font-semibold text-gray-900 flex items-center gap-2"><User className="w-4 h-4" /> Personal Info</h2></CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    {[
                      { label: "Name", value: profileData.name },
                      { label: "Email", value: profileData.email },
                      { label: "Phone", value: profileData.phone },
                      { label: "Location", value: profileData.location },
                      { label: "Portfolio", value: profileData.portfolioUrl },
                      { label: "LinkedIn", value: profileData.linkedinUrl },
                    ].map(f => f.value ? (
                      <div key={f.label}>
                        <p className="text-xs text-gray-500">{f.label}</p>
                        <p className="text-gray-900 font-medium">{f.value}</p>
                      </div>
                    ) : null)}
                    {profileData.bio && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Bio</p>
                        <p className="text-gray-900">{profileData.bio}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Job Search Criteria</h2>
                    <Button variant="ghost" size="sm" onClick={() => setEditingCriteria(!editingCriteria)}>
                      <Pencil className="w-3.5 h-3.5" /> {editingCriteria ? "Cancel" : "Edit"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!editingCriteria ? (
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Target Titles</p>
                        <div className="flex flex-wrap gap-1">
                          {(profileData.criteria?.titles || "").split(",").map(t => (
                            <Badge key={t} variant="default">{t.trim()}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Preferred Locations</p>
                        <div className="flex flex-wrap gap-1">
                          {(profileData.criteria?.locations || "").split(",").map(l => (
                            <Badge key={l} variant="neutral">{l.trim()}</Badge>
                          ))}
                          {profileData.criteria?.remoteOk && <Badge variant="info">Remote OK</Badge>}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Minimum Salary</p>
                        <p className="font-medium">${(profileData.criteria?.salaryMin ?? 50000).toLocaleString()}/yr</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Experience</p>
                        <p className="font-medium">{profileData.criteria?.expMin}–{profileData.criteria?.expMax} years</p>
                      </div>
                      {profileData.criteria?.industry && (
                        <div>
                          <p className="text-xs text-gray-500">Industry Focus</p>
                          <p className="font-medium">{profileData.criteria.industry}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Job Titles (comma-separated)</label>
                        <input value={criteriaForm.titles} onChange={e => setCriteriaForm(f => ({ ...f, titles: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Locations (comma-separated)</label>
                        <input value={criteriaForm.locations} onChange={e => setCriteriaForm(f => ({ ...f, locations: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">Min Salary</label>
                          <input type="number" value={criteriaForm.salaryMin} onChange={e => setCriteriaForm(f => ({ ...f, salaryMin: parseInt(e.target.value) }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">Exp Min (yrs)</label>
                          <input type="number" value={criteriaForm.expMin} onChange={e => setCriteriaForm(f => ({ ...f, expMin: parseInt(e.target.value) }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">Exp Max (yrs)</label>
                          <input type="number" value={criteriaForm.expMax} onChange={e => setCriteriaForm(f => ({ ...f, expMax: parseInt(e.target.value) }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={criteriaForm.remoteOk} onChange={e => setCriteriaForm(f => ({ ...f, remoteOk: e.target.checked }))} className="rounded text-indigo-600" />
                        <span className="text-sm text-gray-700">Include remote positions</span>
                      </label>
                      <div className="flex justify-end">
                        <Button onClick={saveCriteria}>Save Criteria</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// --- Root ---
export default function Home() {
  const [view, setView] = useState<View>("landing");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    // Restore last selected profile from localStorage
    const savedId = typeof window !== "undefined" ? localStorage.getItem("jobapp_client_id") : null;

    fetch("/api/clients")
      .then(r => r.json())
      .then((data: Client[]) => {
        setClients(data);
        if (savedId) {
          const found = data.find(c => c.id === savedId);
          if (found) {
            setSelectedClient(found);
            setView("dashboard");
          }
        }
        setLoadingClients(false);
      });
  }, []);

  function selectClient(c: Client) {
    setSelectedClient(c);
    setView("dashboard");
    localStorage.setItem("jobapp_client_id", c.id);
  }

  function handleBack() {
    setView("landing");
    setSelectedClient(null);
    localStorage.removeItem("jobapp_client_id");
  }

  function handleProfileCreated(c: Client) {
    setClients(prev => [...prev, c]);
    selectClient(c);
  }

  if (loadingClients) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400 animate-pulse">Loading...</div></div>;
  }

  if (view === "setup") {
    return <SetupWizard onComplete={handleProfileCreated} onBack={() => setView("landing")} />;
  }

  if (view === "dashboard" && selectedClient) {
    return <Dashboard client={selectedClient} onBack={handleBack} />;
  }

  return <LandingPage clients={clients} onSelect={selectClient} onCreate={() => setView("setup")} />;
}
