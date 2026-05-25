// Job fetching from multiple sources with graceful fallbacks

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

const GRAPHIC_DESIGN_KEYWORDS = [
  "graphic designer",
  "graphic design",
  "visual designer",
  "brand designer",
  "creative designer",
  "marketing designer",
  "digital designer",
];

const DENVER_LOCATIONS = ["Denver, CO", "Denver, Colorado", "Colorado"];

// Adzuna API — free tier available at developer.adzuna.com
async function fetchFromAdzuna(query: string, location: string): Promise<RawJob[]> {
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
      salary_min: "50000",
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
  } catch {
    return [];
  }
}

// Jooble API — free at jooble.org/api/registered
async function fetchFromJooble(keywords: string, location: string): Promise<RawJob[]> {
  const apiKey = process.env.JOOBLE_API_KEY;
  if (!apiKey || apiKey === "your_jooble_api_key") return [];

  try {
    const res = await fetch(`https://jooble.org/api/${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords, location, salary: 50000 }),
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
  } catch {
    return [];
  }
}

// Mock seed jobs for demonstration when API keys aren't set
function getMockJobs(): RawJob[] {
  return [
    {
      title: "Graphic Designer",
      company: "Ibotta",
      location: "Denver, CO",
      isRemote: false,
      salaryMin: 60000,
      salaryMax: 80000,
      salaryText: "$60,000 – $80,000/yr",
      jobUrl: "https://www.linkedin.com/jobs/view/ibotta-graphic-designer",
      description:
        "Ibotta is seeking a creative Graphic Designer with 1-3 years of experience to join our growing marketing team. You will design digital assets, social media content, and brand materials. Proficiency in Adobe Creative Suite required. Experience with motion graphics a plus.",
      postedAt: new Date().toISOString(),
      source: "LinkedIn (Mock)",
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
      description:
        "Evolent Health is looking for a Brand Designer to support our communications and patient engagement initiatives. 2+ years of graphic design experience required. Strong portfolio demonstrating brand identity, print, and digital design work.",
      postedAt: new Date().toISOString(),
      source: "BuiltIn Colorado (Mock)",
      experienceYears: "2+ years",
      companyDomain: "evolenthealth.com",
      companyWebsite: "https://evolenthealth.com",
    },
    {
      title: "Junior Visual Designer",
      company: "Birdview Outdoor Communications",
      location: "Denver, CO",
      isRemote: false,
      salaryMin: 52000,
      salaryMax: 65000,
      salaryText: "$52,000 – $65,000/yr",
      jobUrl: "https://indeed.com/jobs/birdview-junior-visual-designer",
      description:
        "Join Birdview's creative team designing out-of-home advertising campaigns. 1-2 years experience in graphic design with strong layout skills. Proficient in Adobe Illustrator and Photoshop. Experience with large format printing a plus.",
      postedAt: new Date().toISOString(),
      source: "Indeed (Mock)",
      experienceYears: "1-2 years",
      companyDomain: "birdviewoutdoor.com",
      companyWebsite: "https://birdviewoutdoor.com",
    },
    {
      title: "Digital Marketing Designer",
      company: "Craftsy (Bluprint)",
      location: "Denver, CO",
      isRemote: false,
      salaryMin: 58000,
      salaryMax: 72000,
      salaryText: "$58,000 – $72,000/yr",
      jobUrl: "https://builtincolorado.com/jobs/craftsy-digital-marketing-designer",
      description:
        "Craftsy is hiring a Digital Marketing Designer to create compelling email campaigns, social assets, and landing pages. 1-3 years of design experience, strong eye for typography and color. Experience with email design platforms like Klaviyo or Mailchimp preferred.",
      postedAt: new Date().toISOString(),
      source: "BuiltIn Colorado (Mock)",
      experienceYears: "1-3 years",
      companyDomain: "craftsy.com",
      companyWebsite: "https://craftsy.com",
    },
    {
      title: "Graphic Designer – Marketing",
      company: "Centura Health",
      location: "Englewood, CO (Denver Metro)",
      isRemote: false,
      salaryMin: 56000,
      salaryMax: 70000,
      salaryText: "$56,000 – $70,000/yr",
      jobUrl: "https://indeed.com/jobs/centura-health-graphic-designer",
      description:
        "Centura Health is seeking a Graphic Designer to support our marketing department across print and digital channels. 2-3 years graphic design experience required. Healthcare industry experience a plus. Adobe Creative Suite proficiency required.",
      postedAt: new Date().toISOString(),
      source: "Indeed (Mock)",
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
      description:
        "Gusto is looking for a Creative Designer to join our brand team. You will develop marketing campaigns, product illustrations, and brand assets. 2+ years of design experience. Strong motion and illustration skills preferred.",
      postedAt: new Date().toISOString(),
      source: "LinkedIn (Mock)",
      experienceYears: "2+ years",
      companyDomain: "gusto.com",
      companyWebsite: "https://gusto.com",
    },
  ];
}

export async function fetchGraphicDesignJobs(): Promise<RawJob[]> {
  const results: RawJob[] = [];

  // Try live APIs
  const [adzunaDenver, adzunaRemote, jooble] = await Promise.all([
    fetchFromAdzuna("graphic designer", "Denver, CO"),
    fetchFromAdzuna("graphic designer remote", ""),
    fetchFromJooble("graphic designer", "Denver, CO"),
  ]);

  results.push(...adzunaDenver, ...adzunaRemote, ...jooble);

  // If no live results, use mock data for demo
  if (results.length === 0) {
    results.push(...getMockJobs());
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return results.filter((job) => {
    if (seen.has(job.jobUrl)) return false;
    seen.add(job.jobUrl);
    return true;
  });
}

export function scoreJob(job: RawJob): { score: number; priority: string } {
  let score = 0;

  // Salary scoring
  const salary = job.salaryMin || 0;
  if (salary >= 60000) score += 30;
  else if (salary >= 50000) score += 15;

  // Denver/Colorado location bonus
  const loc = job.location.toLowerCase();
  if (loc.includes("denver")) score += 25;
  else if (loc.includes("colorado")) score += 15;
  else if (job.isRemote) score += 10;

  // Title relevance
  const title = job.title.toLowerCase();
  if (title.includes("graphic designer")) score += 20;
  else if (title.includes("brand designer") || title.includes("visual designer")) score += 15;
  else if (title.includes("designer")) score += 10;

  // Experience match (1-3 years preferred)
  const exp = (job.experienceYears || job.description || "").toLowerCase();
  if (exp.includes("1-3") || exp.includes("1 to 3") || exp.includes("entry")) score += 10;
  else if (exp.includes("2-4") || exp.includes("2+ year") || exp.includes("3+ year")) score += 5;

  const priority = score >= 60 ? "high" : score >= 35 ? "medium" : "low";
  return { score, priority };
}

// Extract company domain from website URL
export function extractDomain(website?: string): string | undefined {
  if (!website) return undefined;
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}
