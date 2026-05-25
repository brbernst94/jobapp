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

async function fetchFromAdzuna(query: string, location: string, salaryMin: number): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || appKey === "your_adzuna_app_key" || !appKey) return [];
  try {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: "20",
      what: query,
      where: location,
      salary_min: String(salaryMin),
      distance: "25",
      content_type: "application/json",
    });
    const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((job: Record<string, unknown>) => ({
      title: job.title as string,
      company: (job.company as Record<string, string>)?.display_name || "Unknown",
      location: (job.location as Record<string, string>)?.display_name || location,
      isRemote: String(job.title).toLowerCase().includes("remote"),
      salaryMin: job.salary_min as number | undefined,
      salaryMax: job.salary_max as number | undefined,
      jobUrl: job.redirect_url as string,
      description: job.description as string | undefined,
      postedAt: job.created as string | undefined,
      source: "Adzuna",
      companyWebsite: (job.company as Record<string, string>)?.href,
    }));
  } catch { return []; }
}

// JSearch via RapidAPI — aggregates LinkedIn, Indeed, Glassdoor, ZipRecruiter
// Free tier: 200 req/month at rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
async function fetchFromJSearch(query: string, location: string, salaryMin: number): Promise<RawJob[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey || apiKey === "your_rapidapi_key") return [];
  try {
    const q = encodeURIComponent(`${query} in ${location}`);
    const res = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=${q}&num_pages=2&date_posted=week`,
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
    return (data.data || [])
      .filter((job: Record<string, unknown>) => {
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
          salaryText: minSal && maxSal ? `$${(minSal / 1000).toFixed(0)}k – $${(maxSal / 1000).toFixed(0)}k/yr` : undefined,
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

// Indeed RSS feed — free, no API key required
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
    return items.slice(0, 15).flatMap((item) => {
      const getTag = (tag: string) =>
        item.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`))?.[1] ||
        item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1] || "";
      const rawTitle = getTag("title");
      const link = getTag("link") || item.match(/<link\s*\/?>(.*?)<\/link>/)?.[1] || "";
      if (!rawTitle || !link) return [];
      // Indeed title format: "Job Title - Company - Location"
      const parts = rawTitle.split(" - ");
      const title = parts[0]?.trim() || rawTitle;
      const company = parts[1]?.trim() || "Unknown";
      const loc = parts[2]?.trim() || location;
      const desc = getTag("description").replace(/<[^>]*>/g, "").trim().slice(0, 500);
      const pubDate = getTag("pubDate");
      return [{
        title,
        company,
        location: loc,
        isRemote: loc.toLowerCase().includes("remote"),
        jobUrl: link,
        description: desc || undefined,
        postedAt: pubDate || undefined,
        source: "Indeed",
      }];
    });
  } catch { return []; }
}

// Build real working search URLs based on the user's actual criteria
function indeedSearchUrl(title: string, location: string) {
  return `https://www.indeed.com/jobs?q=${encodeURIComponent(title)}&l=${encodeURIComponent(location)}&sort=date`;
}
function linkedinSearchUrl(title: string, location: string) {
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}&location=${encodeURIComponent(location)}&f_TPR=r604800`;
}
function builtinSearchUrl(title: string) {
  return `https://www.builtincolorado.com/jobs?search=${encodeURIComponent(title)}`;
}

function getMockJobs(titles: string[], locations: string[], salaryMin: number): RawJob[] {
  const primaryTitle = titles[0] || "Graphic Designer";
  const primaryLocation = locations[0] || "Denver, CO";

  const allMocks: RawJob[] = [
    {
      title: primaryTitle,
      company: "Search Indeed →",
      location: primaryLocation,
      isRemote: false,
      salaryMin: salaryMin,
      salaryText: `$${(salaryMin / 1000).toFixed(0)}k+ (add RAPIDAPI_KEY for real listings)`,
      jobUrl: indeedSearchUrl(primaryTitle, primaryLocation),
      description: `Click "View Job" to search Indeed for "${primaryTitle}" roles in ${primaryLocation}. Add your RAPIDAPI_KEY in Railway to get real job listings pulled automatically.`,
      postedAt: new Date().toISOString(),
      source: "Indeed (Live Search)",
    },
    {
      title: primaryTitle,
      company: "Search LinkedIn →",
      location: primaryLocation,
      isRemote: false,
      salaryMin: salaryMin,
      salaryText: `$${(salaryMin / 1000).toFixed(0)}k+`,
      jobUrl: linkedinSearchUrl(primaryTitle, primaryLocation),
      description: `Click "View Job" to search LinkedIn for "${primaryTitle}" roles in ${primaryLocation} posted in the last week.`,
      postedAt: new Date().toISOString(),
      source: "LinkedIn (Live Search)",
    },
    {
      title: primaryTitle,
      company: "Search BuiltIn Colorado →",
      location: "Colorado",
      isRemote: false,
      salaryMin: salaryMin,
      salaryText: `$${(salaryMin / 1000).toFixed(0)}k+`,
      jobUrl: builtinSearchUrl(primaryTitle),
      description: `Click "View Job" to search BuiltIn Colorado for "${primaryTitle}" roles at tech and startup companies in Colorado.`,
      postedAt: new Date().toISOString(),
      source: "BuiltIn Colorado (Live Search)",
    },
    {
      title: `${primaryTitle} (Remote)`,
      company: "Search Indeed Remote →",
      location: "Remote (US)",
      isRemote: true,
      salaryMin: salaryMin,
      salaryText: `$${(salaryMin / 1000).toFixed(0)}k+`,
      jobUrl: indeedSearchUrl(`${primaryTitle} remote`, ""),
      description: `Click "View Job" to search Indeed for remote "${primaryTitle}" roles across the US.`,
      postedAt: new Date().toISOString(),
      source: "Indeed (Live Search)",
    },
    {
      title: `${primaryTitle} (Remote)`,
      company: "Search LinkedIn Remote →",
      location: "Remote (US)",
      isRemote: true,
      salaryMin: salaryMin,
      salaryText: `$${(salaryMin / 1000).toFixed(0)}k+`,
      jobUrl: linkedinSearchUrl(`${primaryTitle} remote`, "United States"),
      description: `Click "View Job" to search LinkedIn for remote "${primaryTitle}" roles posted in the last week.`,
      postedAt: new Date().toISOString(),
      source: "LinkedIn (Live Search)",
    },
  ];

  return allMocks;
}

export async function fetchGraphicDesignJobs(
  titles: string[],
  locations: string[],
  salaryMin: number
): Promise<RawJob[]> {
  const results: RawJob[] = [];
  const primaryTitle = titles[0] || "graphic designer";
  const primaryLocation = locations[0] || "Denver, CO";

  const [adzunaDenver, adzunaRemote, jsearch, indeedRSS] = await Promise.all([
    fetchFromAdzuna(primaryTitle, primaryLocation, salaryMin),
    fetchFromAdzuna(`${primaryTitle} remote`, "", salaryMin),
    fetchFromJSearch(titles.join(" "), primaryLocation, salaryMin),
    fetchFromIndeedRSS(primaryTitle, primaryLocation),
  ]);

  results.push(...adzunaDenver, ...adzunaRemote, ...jsearch, ...indeedRSS);

  if (results.length === 0) {
    results.push(...getMockJobs(titles, locations, salaryMin));
  }

  const seen = new Set<string>();
  return results.filter((job) => {
    if (seen.has(job.jobUrl)) return false;
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

export function scoreJob(job: RawJob, criteria?: Criteria): { score: number; priority: string } {
  let score = 0;
  const salaryMin = criteria?.salaryMin ?? 50000;
  const preferredLocations = (criteria?.locations ?? "Denver, CO").split(",").map(l => l.trim().toLowerCase());
  const remoteOk = criteria?.remoteOk ?? true;
  const expMin = criteria?.expMin ?? 1;
  const expMax = criteria?.expMax ?? 3;

  const salary = job.salaryMin || 0;
  if (salary >= salaryMin + 10000) score += 30;
  else if (salary >= salaryMin) score += 20;
  else if (salary >= salaryMin * 0.9) score += 10;

  const loc = job.location.toLowerCase();
  const matchesLocation = preferredLocations.some(pl => loc.includes(pl.split(",")[0].toLowerCase()));
  if (matchesLocation) score += 25;
  else if (job.isRemote && remoteOk) score += 12;

  const title = job.title.toLowerCase();
  if (title.includes("graphic designer") || title.includes("brand designer")) score += 20;
  else if (title.includes("visual designer") || title.includes("creative designer")) score += 15;
  else if (title.includes("designer")) score += 10;

  const exp = (job.experienceYears || job.description || "").toLowerCase();
  const expNums = exp.match(/(\d+)[\s-]+(\d+)?\s*year/);
  if (expNums) {
    const jobExpMin = parseInt(expNums[1]);
    const jobExpMax = expNums[2] ? parseInt(expNums[2]) : jobExpMin + 2;
    if (jobExpMin >= expMin && jobExpMax <= expMax + 2) score += 10;
    else if (jobExpMin <= expMax) score += 5;
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
