"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  DollarSign,
  Building2,
  ExternalLink,
  User,
  Link,
  ChevronDown,
  ChevronUp,
  Clock,
  Star,
} from "lucide-react";
import { useState } from "react";

interface JobLead {
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
}

const priorityVariants: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  high: "success",
  medium: "warning",
  low: "neutral",
};

const statusVariants: Record<string, "default" | "success" | "warning" | "info" | "neutral" | "danger"> = {
  new: "default",
  applied: "info",
  saved: "warning",
  rejected: "danger",
  offer: "success",
  interview: "success",
  phone_screen: "info",
};

function formatSalary(min?: number, max?: number, text?: string): string {
  if (text) return text;
  if (min && max) return `$${(min / 1000).toFixed(0)}k – $${(max / 1000).toFixed(0)}k`;
  if (min) return `$${(min / 1000).toFixed(0)}k+`;
  return "Salary not listed";
}

export function JobCard({
  job,
  onApply,
  onSave,
  onDismiss,
}: {
  job: JobLead;
  onApply?: (jobId: string) => void;
  onSave?: (jobId: string) => void;
  onDismiss?: (jobId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant={priorityVariants[job.priority] || "neutral"}>
                {job.priority === "high" ? "★ High Match" : job.priority === "medium" ? "Good Match" : "Match"}
              </Badge>
              <Badge variant={statusVariants[job.application?.status || job.status] || "neutral"}>
                {job.application?.status || job.status}
              </Badge>
              {job.isRemote && <Badge variant="info">Remote</Badge>}
            </div>

            <h3 className="text-lg font-semibold text-gray-900 truncate">{job.title}</h3>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {job.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.location}
              </span>
              <span className="flex items-center gap-1 font-medium text-green-700">
                <DollarSign className="w-4 h-4" />
                {formatSalary(job.salaryMin, job.salaryMax, job.salaryText)}
              </span>
              {job.experienceYears && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {job.experienceYears}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
              <span>via {job.source}</span>
              {job.postedAt && (
                <span>· {new Date(job.postedAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <a href={job.jobUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="secondary">
                <ExternalLink className="w-3.5 h-3.5" />
                View Job
              </Button>
            </a>
            {!job.application && (
              <Button size="sm" onClick={() => onApply?.(job.id)}>
                Mark Applied
              </Button>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? "Hide details" : "Show details & recruiter notes"}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
            {/* Description */}
            {job.description && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Job Description</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{job.description}</p>
              </div>
            )}

            {/* Hiring Manager */}
            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Hiring Contact
              </h4>
              {job.hiringManager ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">{job.hiringManager}</p>
                  {job.hiringManagerTitle && (
                    <p className="text-xs text-gray-600">{job.hiringManagerTitle}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600 italic">Research needed</p>
              )}
              {job.hiringManagerLinkedIn && (
                <a
                  href={job.hiringManagerLinkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:underline"
                >
                  <Link className="w-3.5 h-3.5" />
                  {job.hiringManager ? "LinkedIn Profile" : "Search on LinkedIn →"}
                </a>
              )}
            </div>

            {/* Company Notes */}
            {job.companyNotes && (
              <div className="bg-amber-50 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" /> Company Notes (for cover letter)
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">{job.companyNotes}</p>
                {job.coverLetterFocus && (
                  <div className="mt-2 pt-2 border-t border-amber-200">
                    <span className="text-xs font-semibold text-amber-700">Focus on: </span>
                    <span className="text-xs text-gray-700">{job.coverLetterFocus}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              {!job.application && (
                <>
                  <Button size="sm" onClick={() => onSave?.(job.id)} variant="secondary">
                    Save for Later
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDismiss?.(job.id)}>
                    Dismiss
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
