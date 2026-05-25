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

async function fetchFromJooble(keywords: string, location: string, salaryMin: number): Promise<RawJob[]> {
  const apiKey = process.env.JOOBLE_API_KEY;
  if (!apiKey || apiKey === "your_jooble_api_key") return [];
  try {
    const res = await fetch(`https://jooble.org/api/${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords, location, salary: salaryMin }),
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || []).map((job: Record<string, unknown>) => ({
      title: job.title as string,
      company: job.company as string,
      location: job.location as string,
      isRemote: String(job.location).toLowerCase().includes("remote"),
      salaryText: job.salary as string | undefined,
      jobUrl: job.link as string,
      description: job.snippet as string | undefined,
      postedAt: job.updated as string | undefined,
      source: "Jooble",
    }));
  } catch { return []; }
}

function getMockJobs(titles: string[], locations: string[], salaryMin: number): RawJob[] {
  const allMocks: RawJob[] = [
    {
      title: "Graphic Designer",
      company: "Ibotta",
      location: "Denver, CO",
      isRemote: false,
      salaryMin: 60000,
      salaryMax: 80000,
      salaryText: "$60,000 – $80,000/yr",
      jobUrl: "https://www.linkedin.com/jobs/view/ibotta-graphic-designer",
      description: "Ibotta is seeking a creative Graphic Designer with 1-3 years of experience to join our growing marketing team. You will design digital assets, social media content, and brand materials. Proficiency in Adobe Creative Suite required.",
      postedAt: new Date().toISOString(),
      source: "LinkedIn (Demo)",
      experienceYears: "1-3 years",
      companyDomain: "ibotta.com",
      companyWebsite: "https://ibotta.com",
    },
    {
      title: "Brand Designer",
      company: "Evolent Health",
      location: "Denver, CO",
      isRemote: true,
      salaryMin: 65000,
      salaryMax: 85000,
      salaryText: "$65,000 – $85,000/yr",
      jobUrl: "https://builtincolorado.com/jobs/evolent-health-brand-designer",
      description: "Evolent Health is looking for a Brand Designer to support our communications and patient engagement initiatives. 2+ years of graphic design experience required.",
      postedAt: new Date().toISOString(),
      source: "BuiltIn Colorado (Demo)",
      experienceYears: "2+ years",
      companyDomain: "evolenthealth.com",
      companyWebsite: "https://evolenthealth.com",
    },
    {
      title: "Junior Visual Designer",
      company: "Birdview Outdoor",
      location: "Denver, CO",
      isRemote: false,
      salaryMin: 52000,
      salaryMax: 65000,
      salaryText: "$52,000 – $65,000/yr",
      jobUrl: "https://indeed.com/jobs/birdview-junior-visual-designer",
      description: "Join Birdview's creative team designing out-of-home advertising campaigns. 1-2 years experience in graphic design with strong layout skills.",
      postedAt: new Date().toISOString(),
      source: "Indeed (Demo)",
      experienceYears: "1-2 years",
      companyDomain: "birdviewoutdoor.com",
      companyWebsite: "https://birdviewoutdoor.com",
    },
    {
      title: "Digital Marketing Designer",
      company: "Craftsy",
      location: "Denver, CO",
      isRemote: false,
      salaryMin: 58000,
      salaryMax: 72000,
      salaryText: "$58,000 – $72,000/yr",
      jobUrl: "https://builtincolorado.com/jobs/craftsy-digital-marketing-designer",
      description: "Craftsy is hiring a Digital Marketing Designer to create compelling email campaigns, social assets, and landing pages. 1-3 years of design experience.",
      postedAt: new Date().toISOString(),
      source: "BuiltIn Colorado (Demo)",
      experienceYears: "1-3 years",
      companyDomain: "craftsy.com",
      companyWebsite: "https://craftsy.com",
    },
    {
      title: "Graphic Designer – Marketing",
      company: "Centura Health",
      location: "Englewood, CO",
      isRemote: false,
      salaryMin: 56000,
      salaryMax: 70000,
      salaryText: "$56,000 – $70,000/yr",
      jobUrl: "https://indeed.com/jobs/centura-health-graphic-designer",
      description: "Centura Health is seeking a Graphic Designer to support our marketing department across print and digital channels. 2-3 years graphic design experience required.",
      postedAt: new Date().toISOString(),
      source: "Indeed (Demo)",
      experienceYears: "2-3 years",
      companyDomain: "centura.org",
      companyWebsite: "https://centura.org",
    },
    {
      title: "Creative Designer (Remote)",
      company: "Gusto",
      location: "Remote (US)",
      isRemote: true,
      salaryMin: 70000,
      salaryMax: 95000,
      salaryText: "$70,000 – $95,000/yr",
      jobUrl: "https://www.linkedin.com/jobs/view/gusto-creative-designer",
      description: "Gusto is looking for a Creative Designer to join our brand team. You will develop marketing campaigns, product illustrations, and brand assets. 2+ years of design experience.",
      postedAt: new Date().toISOString(),
      source: "LinkedIn (Demo)",
      experienceYears: "2+ years",
      companyDomain: "gusto.com",
      companyWebsite: "https://gusto.com",
    },
    {
      title: "UX/UI Designer",
      company: "Webflow",
      location: "Remote (US)",
      isRemote: true,
      salaryMin: 75000,
      salaryMax: 100000,
      salaryText: "$75,000 – $100,000/yr",
      jobUrl: "https://www.linkedin.com/jobs/view/webflow-ux-designer",
      description: "Webflow is hiring a UX/UI Designer with a strong visual design sensibility. 2-4 years experience. Proficient in Figma, experience with design systems.",
      postedAt: new Date().toISOString(),
      source: "LinkedIn (Demo)",
      experienceYears: "2-4 years",
      companyDomain: "webflow.com",
      companyWebsite: "https://webflow.com",
    },
    {
      title: "Motion Graphic Designer",
      company: "GreenPages Technology",
      location: "Remote (US)",
      isRemote: true,
      salaryMin: 62000,
      salaryMax: 80000,
      salaryText: "$62,000 – $80,000/yr",
      jobUrl: "https://indeed.com/jobs/greenpages-motion-graphic-designer",
      description: "GreenPages seeks a Motion Graphic Designer skilled in After Effects and Premiere Pro. Create compelling video content, animated explainers, and social media videos. 1-3 years experience.",
      postedAt: new Date().toISOString(),
      source: "Indeed (Demo)",
      experienceYears: "1-3 years",
      companyDomain: "greenpages.com",
      companyWebsite: "https://greenpages.com",
    },
  ];

  // Use titles/locations for reference, filter by salaryMin
  void titles;
  void locations;
  return allMocks.filter(j => !j.salaryMin || j.salaryMin >= salaryMin * 0.85);
}

export async function fetchGraphicDesignJobs(
  titles: string[],
  locations: string[],
  salaryMin: number
): Promise<RawJob[]> {
  const results: RawJob[] = [];
  const primaryTitle = titles[0] || "graphic designer";
  const primaryLocation = locations[0] || "Denver, CO";

  const [adzunaDenver, adzunaRemote, jooble] = await Promise.all([
    fetchFromAdzuna(primaryTitle, primaryLocation, salaryMin),
    fetchFromAdzuna(`${primaryTitle} remote`, "", salaryMin),
    fetchFromJooble(titles.join(" OR "), primaryLocation, salaryMin),
  ]);

  results.push(...adzunaDenver, ...adzunaRemote, ...jooble);

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
