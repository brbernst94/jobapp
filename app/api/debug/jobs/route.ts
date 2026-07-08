import { NextResponse } from "next/server";
import { shouldExcludeJob } from "@/lib/job-fetcher";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "graphic designer";
  const location = searchParams.get("l") || "Denver, CO";

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return NextResponse.json({ error: "RAPIDAPI_KEY not set" }, { status: 500 });

  const q = encodeURIComponent(`${query} in ${location}`);
  const res = await fetch(
    `https://jsearch.p.rapidapi.com/search?query=${q}&num_pages=1&date_posted=month`,
    {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
    }
  );

  const raw = await res.json();
  const jobs: Record<string, unknown>[] = Array.isArray(raw.data)
    ? raw.data
    : (raw.data?.jobs || []);

  const summary = jobs.map(job => {
    const publisher = (job.job_publisher as string) || "unknown";
    const salaryMin = job.job_min_salary as number | undefined;
    const salaryMax = job.job_max_salary as number | undefined;
    const title = job.job_title as string;
    const city = job.job_city as string;
    const state = job.job_state as string;

    const rawJob = {
      title,
      company: job.employer_name as string,
      location: city && state ? `${city}, ${state}` : "?",
      isRemote: (job.job_is_remote as boolean) || false,
      salaryMin,
      salaryMax,
      salaryText: salaryMin && salaryMax ? `$${(salaryMin/1000).toFixed(0)}k–$${(salaryMax/1000).toFixed(0)}k` : undefined,
      jobUrl: (job.job_apply_link || job.job_google_link) as string,
      description: job.job_description ? (job.job_description as string).slice(0, 200) : undefined,
      postedAt: job.job_posted_at_datetime_utc as string | undefined,
      source: publisher,
      experienceYears: undefined,
    };

    const { exclude, reason } = shouldExcludeJob(rawJob, { salaryMin: 55000, expMin: 1, expMax: 3, locations: "Denver, CO", remoteOk: true });

    return {
      title,
      publisher,
      hasSalary: !!(salaryMin || salaryMax),
      salary: salaryMin ? `$${(salaryMin/1000).toFixed(0)}k` : "none",
      postedAt: job.job_posted_at_datetime_utc,
      excluded: exclude,
      excludeReason: reason,
    };
  });

  const kept = summary.filter(j => !j.excluded);
  const dropped = summary.filter(j => j.excluded);

  return NextResponse.json({
    apiStatus: res.status,
    totalFromApi: jobs.length,
    kept: kept.length,
    dropped: dropped.length,
    keptJobs: kept,
    droppedJobs: dropped,
  });
}
