"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Clock, Mail, ChevronRight, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FollowUp {
  id: string;
  scheduledFor: string;
  message: string;
  type: string;
  sent: boolean;
}

interface EmailEvent {
  id: string;
  subject: string;
  from: string;
  receivedAt: string;
  snippet: string;
  statusChange?: string;
}

interface Application {
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
  followUps: FollowUp[];
  emailEvents: EmailEvent[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "neutral" | "danger"; color: string }> = {
  saved: { label: "Saved", variant: "neutral", color: "bg-gray-200" },
  applied: { label: "Applied", variant: "default", color: "bg-blue-400" },
  viewed: { label: "Viewed", variant: "info", color: "bg-purple-400" },
  phone_screen: { label: "Phone Screen", variant: "info", color: "bg-indigo-400" },
  interview: { label: "Interview", variant: "warning", color: "bg-yellow-400" },
  offer: { label: "Offer!", variant: "success", color: "bg-green-400" },
  rejected: { label: "Rejected", variant: "danger", color: "bg-red-400" },
  withdrawn: { label: "Withdrawn", variant: "neutral", color: "bg-gray-300" },
};

const PIPELINE_STAGES = ["applied", "phone_screen", "interview", "offer"];

function PipelineBar({ status }: { status: string }) {
  const currentIndex = PIPELINE_STAGES.indexOf(status);
  if (currentIndex === -1) return null;

  return (
    <div className="flex items-center gap-1 mt-2">
      {PIPELINE_STAGES.map((stage, i) => (
        <div key={stage} className="flex items-center gap-1">
          <div
            className={`h-2 w-12 rounded-full transition-colors ${
              i <= currentIndex ? statusConfig[stage]?.color || "bg-blue-400" : "bg-gray-200"
            }`}
          />
          {i < PIPELINE_STAGES.length - 1 && (
            <ChevronRight className="w-3 h-3 text-gray-300" />
          )}
        </div>
      ))}
    </div>
  );
}

function FollowUpItem({ followUp }: { followUp: FollowUp }) {
  const dueDate = new Date(followUp.scheduledFor);
  const isPast = dueDate < new Date();
  const isToday = dueDate.toDateString() === new Date().toDateString();

  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${isPast && !followUp.sent ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
      <Bell className={`w-4 h-4 mt-0.5 shrink-0 ${isPast && !followUp.sent ? "text-red-500" : "text-gray-400"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium ${isPast && !followUp.sent ? "text-red-600" : isToday ? "text-amber-600" : "text-gray-600"}`}>
            {followUp.sent ? "Sent" : isPast ? "Overdue" : isToday ? "Due today" : `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`}
          </span>
          <Badge variant={followUp.type === "email" ? "default" : "neutral"}>{followUp.type}</Badge>
          {followUp.sent && <Badge variant="success">Sent</Badge>}
        </div>
        <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-line">{followUp.message.slice(0, 120)}...</p>
      </div>
    </div>
  );
}

export function ApplicationTracker({ applications, onStatusChange }: {
  applications: Application[];
  onStatusChange?: (id: string, status: string) => void;
}) {
  const grouped = PIPELINE_STAGES.reduce<Record<string, Application[]>>((acc, stage) => {
    acc[stage] = applications.filter((a) => a.status === stage);
    return acc;
  }, {});

  const other = applications.filter((a) => !PIPELINE_STAGES.includes(a.status));

  return (
    <div className="space-y-6">
      {/* Kanban Pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PIPELINE_STAGES.map((stage) => (
          <div key={stage} className="min-h-32">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">{statusConfig[stage].label}</h3>
              <Badge variant={statusConfig[stage].variant}>{grouped[stage]?.length || 0}</Badge>
            </div>
            <div className="space-y-2">
              {(grouped[stage] || []).map((app) => (
                <div key={app.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm text-sm">
                  <p className="font-medium text-gray-900 truncate">{app.jobLead.company}</p>
                  <p className="text-gray-500 text-xs truncate">{app.jobLead.title}</p>
                  {app.lastEmailAt && (
                    <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Email {formatDistanceToNow(new Date(app.lastEmailAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Cards */}
      <div className="space-y-4">
        {applications.map((app) => {
          const config = statusConfig[app.status] || statusConfig.applied;
          const upcomingFollowUps = app.followUps.filter((f) => !f.sent).slice(0, 2);

          return (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={config.variant}>{config.label}</Badge>
                      {app.lastEmailAt && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          Last email {formatDistanceToNow(new Date(app.lastEmailAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">{app.jobLead.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{app.jobLead.company}</span>
                      <span>·</span>
                      <span>{app.jobLead.location}</span>
                    </div>
                    <PipelineBar status={app.status} />
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    <select
                      value={app.status}
                      onChange={(e) => onStatusChange?.(app.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {Object.entries(statusConfig).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>

              {(upcomingFollowUps.length > 0 || app.emailEvents.length > 0) && (
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Follow-ups */}
                    {upcomingFollowUps.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Upcoming Follow-ups
                        </h4>
                        <div className="space-y-2">
                          {upcomingFollowUps.map((f) => (
                            <FollowUpItem key={f.id} followUp={f} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Email activity */}
                    {app.emailEvents.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Email Activity
                        </h4>
                        <div className="space-y-2">
                          {app.emailEvents.slice(0, 3).map((event) => (
                            <div key={event.id} className="flex gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                              <Mail className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-medium text-gray-800">{event.subject}</p>
                                <p className="text-xs text-gray-500">{event.snippet?.slice(0, 80)}...</p>
                                {event.statusChange && (
                                  <Badge variant="info" className="mt-1">{statusConfig[event.statusChange]?.label}</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
