export interface RawJob {
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryText?: string;
  jobUrl: string;
  description?: string;
  postedAt?: string;
  source: string;
  experienceYears?: string;
  companyDomain?: string;
  companyWebsite?: string;
}

const ALLOWED_PUBLISHERS = ["linkedin", "ziprecruiter", "indeed", "builtin", "mediabistro", "workday"];

// JSearch via RapidAPI — filters to LinkedIn, Indeed, ZipRecruiter only
async function fetchFromJSearch(query: string, location: string, salaryMin: number): Promise<RawJob[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey || apiKey === "your_rapidapi_key") return [];
  try {
    const q = encodeURIComponent(`${query} in ${location}`);
    const res = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=${q}&num_pages=4&date_posted=month`,
      {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
        next: { revalidate: 0 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const jobs: Record<string, unknown>[] = Array.isArray(data.data)
      ? data.data
      : (data.data?.jobs || []);
    return jobs
      .filter((job: Record<string, unknown>) => {
        const publisher = ((job.job_publisher as string) || "").toLowerCase();
        if (!ALLOWED_PUBLISHERS.some(p => publisher.includes(p))) return false;
        const min = job.job_min_salary as number | undefined;
        return !min || min >= salaryMin * 0.8;
      })
      .map((job: Record<string, unknown>) => {
        const city = job.job_city as string | undefined;
        const state = job.job_state as string | undefined;
        const locationStr = city && state ? `${city}, ${state}` : (job.job_country as string) || location;
        const minSal = job.job_min_salary as number | undefined;
        const maxSal = job.job_max_salary as number | undefined;
        const website = job.employer_website as string | undefined;
        let domain: string | undefined;
        if (website) {
          try { domain = new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
        }
        return {
          title: job.job_title as string,
          company: job.employer_name as string,
          location: locationStr,
          isRemote: (job.job_is_remote as boolean) || false,
          salaryMin: minSal,
          salaryMax: maxSal,
          salaryText: minSal && maxSal && minSal > 0 ? `$${(minSal / 1000).toFixed(0)}k – $${(maxSal / 1000).toFixed(0)}k/yr` : undefined,
          jobUrl: (job.job_apply_link || job.job_google_link) as string,
          description: job.job_description ? (job.job_description as string).slice(0, 600) : undefined,
          postedAt: job.job_posted_at_datetime_utc as string | undefined,
          source: (job.job_publisher as string) || "JSearch",
          companyWebsite: website,
          companyDomain: domain,
        };
      });
  } catch { return []; }
}

// BuiltIn Colorado — tech/startup job board, design roles
async function fetchFromBuiltIn(keywords: string): Promise<RawJob[]> {
  try {
    const params = new URLSearchParams({
      search: keywords,
      "roles[]": "Design",
      location: "Colorado",
    });
    const res = await fetch(`https://api.builtin.com/jobs?${params}`, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items: Record<string, unknown>[] = data.jobs || data.data || data || [];
    if (!Array.isArray(items)) return [];
    const kw = keywords.toLowerCase().split(/[\s,]+/);
    return items
      .filter((job) => {
        const title = ((job.title || job.name || "") as string).toLowerCase();
        return kw.some(w => title.includes(w)) ||
          title.includes("graphic") || title.includes("brand") || title.includes("visual") || title.includes("design");
      })
      .map((job: Record<string, unknown>) => ({
        title: ((job.title || job.name) as string),
        company: ((job as Record<string, Record<string, unknown>>).company?.name as string || job.companyName as string || "Unknown"),
        location: (job.locationName || job.location || "Colorado") as string,
        isRemote: !!(job.isRemote || job.remote),
        jobUrl: (job.url || job.applyUrl || `https://www.builtincolorado.com/job/${job.slug || job.id}`) as string,
        description: job.description ? (job.description as string).replace(/<[^>]*>/g, "").slice(0, 500) : undefined,
        postedAt: (job.postedDate || job.createdAt) as string | undefined,
        source: "BuiltIn",
      }));
  } catch { return []; }
}

// Indeed RSS — free, no key, real listings
async function fetchFromIndeedRSS(keywords: string, location: string): Promise<RawJob[]> {
  try {
    const params = new URLSearchParams({ q: keywords, l: location, radius: "25", sort: "date" });
    const res = await fetch(`https://www.indeed.com/rss?${params}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobApp/1.0)" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    return items.slice(0, 20).flatMap((item) => {
      const getTag = (tag: string) =>
        item.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`))?.[1] ||
        item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1] || "";
      const rawTitle = getTag("title");
      const link = getTag("link") || item.match(/<link\s*\/?>(.*?)<\/link>/)?.[1] || "";
      if (!rawTitle || !link) return [];
      const parts = rawTitle.split(" - ");
      const title = parts[0]?.trim() || rawTitle;
      const company = parts[1]?.trim() || "Unknown";
      const loc = parts[2]?.trim() || location;
      const desc = getTag("description").replace(/<[^>]*>/g, "").trim().slice(0, 500);
      const pubDate = getTag("pubDate");
      return [{ title, company, location: loc, isRemote: loc.toLowerCase().includes("remote"), jobUrl: link, description: desc || undefined, postedAt: pubDate || undefined, source: "Indeed" }];
    });
  } catch { return []; }
}

export async function fetchGraphicDesignJobs(
  titles: string[],
  locations: string[],
  salaryMin: number
): Promise<RawJob[]> {
  const primaryLocation = locations[0] || "Denver, CO";

  // Run each title as its own query — different terms surface different publishers
  // (LinkedIn results tend to appear under exact title searches)
  const titleQueries = titles.slice(0, 4).map(t => t.trim()).filter(Boolean);
  if (!titleQueries.length) titleQueries.push("Graphic Designer");

  const fetches = [
    // Per-title local searches via JSearch (LinkedIn, Indeed, ZipRecruiter, Mediabistro, Workday)
    ...titleQueries.map(t => fetchFromJSearch(t, primaryLocation, salaryMin)),
    // Per-title remote searches
    ...titleQueries.map(t => fetchFromJSearch(`${t} remote`, "United States", salaryMin)),
    // Indeed RSS — free direct feed, adds volume
    fetchFromIndeedRSS(titleQueries[0], primaryLocation),
    fetchFromIndeedRSS(`${titleQueries[0]} remote`, ""),
    // BuiltIn Colorado
    fetchFromBuiltIn(titleQueries[0]),
  ];

  const allResults = await Promise.all(fetches);
  const results = allResults.flat();

  const seen = new Set<string>();
  return results.filter((job) => {
    if (!job.jobUrl || seen.has(job.jobUrl)) return false;
    seen.add(job.jobUrl);
    return true;
  });
}

type Criteria = {
  salaryMin?: number;
  locations?: string;
  remoteOk?: boolean;
  expMin?: number;
  expMax?: number;
  titles?: string;
} | null;

// Extracts the minimum years of experience required from a job description.
function parseRequiredExpYears(text: string): number | undefined {
  const t = text.toLowerCase();
  const patterns = [
    // "over/more than/minimum/at least/requires 5 years"
    /(?:over|more than|minimum|at least|requires?)\s+(\d+)\+?\s+years?/,
    // "5+ years of experience" or "5+ years of design experience"
    /(\d+)\+\s*years?\s+of\s+(?:\w+\s+){0,3}experience/,
    // "5-7 years of (any words) experience"
    /(\d+)\s*[-–]\s*\d+\s+years?\s+of\s+(?:\w+\s+){0,3}experience/,
    // "5 years of (any words) experience"
    /(\d+)\s+years?\s+of\s+(?:\w+\s+){0,3}experience/,
    // "5+ years experience" (no "of")
    /(\d+)\+\s*years?\s+experience/,
    // "experience: 5+ years"
    /experience[:\s]+(\d+)\+?\s+years?/,
  ];
  for (const pattern of patterns) {
    const m = t.match(pattern);
    if (m) return parseInt(m[1]);
  }
  return undefined;
}

// Checks if a job URL is still active by making a HEAD request.
// Returns false (exclude) if the URL is 404/410/Gone or redirects to a known "job closed" pattern.
export async function isJobUrlActive(url: string): Promise<boolean> {
  if (!url || url.startsWith("https://www.google.com")) return true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (res.status === 404 || res.status === 410 || res.status === 400) return false;
    const finalUrl = res.url.toLowerCase();
    const closedPatterns = ["jobnotfound", "job-not-found", "job_not_found", "expired", "job-closed", "jobclosed", "no-longer", "position-filled", "not-available", "unavailable"];
    if (closedPatterns.some(p => finalUrl.includes(p))) return false;
    return true;
  } catch { return true; } // timeout or network error → assume active
}

export function shouldExcludeJob(job: RawJob, criteria?: Criteria): { exclude: boolean; reason?: string } {
  const salaryMin = criteria?.salaryMin ?? 50000;
  const expMax = criteria?.expMax ?? 3;

  // Only keep jobs from approved sources
  const sourceLower = job.source.toLowerCase();
  if (!ALLOWED_PUBLISHERS.some(p => sourceLower.includes(p))) {
    return { exclude: true, reason: `Source not in allowlist: ${job.source}` };
  }

  // Exclude jobs posted more than 30 days ago
  if (job.postedAt) {
    const posted = new Date(job.postedAt);
    if (!isNaN(posted.getTime())) {
      const daysOld = (Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld > 30) {
        return { exclude: true, reason: `Posted ${Math.floor(daysOld)} days ago (over 30-day limit)` };
      }
    }
  }

  // Exclude if salary minimum is more than $20k above the user's desired salary
  if (job.salaryMin && job.salaryMin > salaryMin + 20000) {
    return { exclude: true, reason: `Salary too high: $${job.salaryMin.toLocaleString()} vs target $${salaryMin.toLocaleString()}` };
  }

  // Exclude if job requires more experience than the user's max (allow 1 year buffer)
  const text = (job.experienceYears || "") + " " + (job.description || "");
  const requiredExp = parseRequiredExpYears(text);
  if (requiredExp !== undefined && requiredExp > expMax + 1) {
    return { exclude: true, reason: `Requires ${requiredExp} yrs experience, user max is ${expMax}` };
  }

  // Note: no-salary jobs are kept but scored lower (many LinkedIn jobs never list pay)

  // Exclude contract/freelance/part-time postings — keep full-time only
  const title = job.title.toLowerCase();
  const titleAndDesc = title + " " + (job.description || "").toLowerCase();
  const CONTRACT_KEYWORDS = ["contract", "freelance", "part-time", "part time", "temporary", "temp ", "1099", "contractor"];
  const isContract = CONTRACT_KEYWORDS.some(kw => titleAndDesc.includes(kw));
  if (isContract) {
    return { exclude: true, reason: `Contract/part-time role: "${job.title}"` };
  }

  // Exclude jobs that aren't actually design roles — catches "graphics installer", "wrap technician", etc.
  const DESIGN_ROLE_KEYWORDS = ["designer", "design director", "art director", "creative director", "brand strategist", "visual artist"];
  const NON_DESIGN_KEYWORDS = ["install", "technician", "mechanic", "driver", "warehouse", "electrician", "plumber", "hvac", "welder", "vinyl wrap", "sign maker"];
  const isDesignRole = DESIGN_ROLE_KEYWORDS.some(kw => title.includes(kw));
  const isNonDesign = NON_DESIGN_KEYWORDS.some(kw => title.includes(kw));
  if (!isDesignRole || isNonDesign) {
    return { exclude: true, reason: `Not a design role: "${job.title}"` };
  }

  return { exclude: false };
}

// Strip markdown artifacts (##, **, •###, etc.) from scraped job descriptions
export function cleanDescription(text?: string): string | undefined {
  if (!text) return undefined;
  return text
    .replace(/#{1,6}\s*/g, "")       // headings
    .replace(/\*{1,2}([^*]*)\*{1,2}/g, "$1")  // bold/italic
    .replace(/•#{1,6}\s*/g, "• ")    // bullet+heading combos
    .replace(/\n{3,}/g, "\n\n")      // excess blank lines
    .trim();
}

export function scoreJob(job: RawJob, criteria?: Criteria): { score: number; priority: string } {
  let score = 0;
  const salaryMin = criteria?.salaryMin ?? 50000;
  const preferredLocations = (criteria?.locations ?? "Denver, CO").split(",").map(l => l.trim().toLowerCase());
  const remoteOk = criteria?.remoteOk ?? true;
  const expMin = criteria?.expMin ?? 1;
  const expMax = criteria?.expMax ?? 3;

  const salary = job.salaryMin && job.salaryMin > 0 ? job.salaryMin : 0;
  if (salary >= salaryMin + 10000) score += 30;
  else if (salary >= salaryMin) score += 20;
  else if (salary >= salaryMin * 0.9) score += 10;
  else if (salary === 0) score -= 10; // no salary listed — still show but deprioritise

  const loc = job.location.toLowerCase();
  const matchesLocation = preferredLocations.some(pl => loc.includes(pl.split(",")[0].toLowerCase()));
  if (matchesLocation) score += 25;
  else if (job.isRemote && remoteOk) score += 12;

  const title = job.title.toLowerCase();
  if (title.includes("graphic designer") || title.includes("brand designer")) score += 20;
  else if (title.includes("visual designer") || title.includes("creative designer")) score += 15;
  else if (title.includes("designer")) score += 10;

  const text = (job.experienceYears || "") + " " + (job.description || "");
  const requiredExp = parseRequiredExpYears(text);
  if (requiredExp !== undefined) {
    if (requiredExp >= expMin && requiredExp <= expMax) score += 10;
    else if (requiredExp <= expMax + 1) score += 5;
  }

  const priority = score >= 60 ? "high" : score >= 35 ? "medium" : "low";
  return { score, priority };
}

export function extractDomain(website?: string): string | undefined {
  if (!website) return undefined;
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, "");
  } catch { return undefined; }
}
