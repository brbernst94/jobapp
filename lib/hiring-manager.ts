// Hiring manager research utilities
// In production, integrate with LinkedIn API or Clearbit for real lookups

export interface HiringManagerInfo {
  name?: string;
  title?: string;
  linkedInUrl?: string;
  source: string;
}

// Company-specific notes generator for cover letter customization
export interface CompanyProfile {
  notes: string;
  focus: string;
  mission?: string;
  products?: string;
  culture?: string;
}

// Known company profiles — seeded with Denver area companies
const KNOWN_COMPANIES: Record<string, { manager?: HiringManagerInfo; profile: CompanyProfile }> = {
  "ibotta.com": {
    manager: {
      name: "Research via LinkedIn: search 'Ibotta Creative Director' or 'Ibotta Design Manager'",
      title: "Creative Director / Head of Design",
      linkedInUrl: "https://www.linkedin.com/company/ibotta",
      source: "LinkedIn Research Needed",
    },
    profile: {
      notes:
        "Ibotta is a Denver-based consumer technology company that operates a rewards and cash-back platform. They partner with major brands and retailers. IPO'd in April 2024, giving them significant growth momentum.",
      focus: "performance marketing design, digital consumer engagement, app UI/brand consistency",
      mission: "Making every purchase rewarding",
      products: "Cash-back app, brand promotions, publisher network",
      culture: "Fast-paced, data-driven, collaborative",
    },
  },
  "evolenthealth.com": {
    profile: {
      notes:
        "Evolent Health is a tech-enabled healthcare services company focused on value-based care. They serve health plans and providers across 30+ states, with a mission to improve health outcomes while reducing costs.",
      focus: "patient education design, healthcare communications, empathetic brand storytelling",
      mission: "Changing the way care is delivered",
      products: "Value-based care programs, specialty care management",
      culture: "Mission-driven, collaborative, impact-focused",
    },
  },
  "gusto.com": {
    manager: {
      name: "Research via LinkedIn: search 'Gusto Brand Designer Manager'",
      title: "Brand Design Lead",
      linkedInUrl: "https://www.linkedin.com/company/gustohq",
      source: "LinkedIn Research Needed",
    },
    profile: {
      notes:
        "Gusto is a cloud-based HR, payroll, and benefits platform for small businesses. Known for an exceptionally warm, human-centered brand voice and visual identity. Strong design culture — design is core to their product differentiation.",
      focus: "human-centered brand design, illustration, warm visual storytelling for SMBs",
      mission: "Creating a world where work empowers a better life",
      products: "Payroll, benefits, HR software for small businesses",
      culture: "People-first, transparent, design-forward",
    },
  },
  "craftsy.com": {
    profile: {
      notes:
        "Craftsy (now Bluprint) is a Denver-based online learning platform for creative hobbies — sewing, knitting, cooking, art, and more. Their audience is passionate DIY crafters and hobbyists. Visual identity should feel approachable, handcrafted, and warm.",
      focus: "email marketing design, lifestyle photography direction, community-driven visual language",
      mission: "Empowering crafters to pursue their passions",
      products: "Online courses, patterns, craft kits",
      culture: "Creative, community-focused, maker-friendly",
    },
  },
  "centura.org": {
    profile: {
      notes:
        "Centura Health is one of Colorado's largest integrated health systems, operating hospitals, urgent care centers, and physician practices across CO and KS. Non-profit with a faith-based mission. Design work spans patient communications, internal marketing, and community health campaigns.",
      focus:
        "healthcare accessibility design, community health education, brand consistency across large system",
      mission: "Extending the healing ministry of Christ",
      products: "Hospitals, urgent care, physician practices across Colorado",
      culture: "Mission-driven, collaborative, community-serving",
    },
  },
  "birdviewoutdoor.com": {
    profile: {
      notes:
        "Birdview Outdoor Communications is a Colorado-based outdoor advertising company specializing in billboards and out-of-home (OOH) media. Design work is large-format, high-impact, and must communicate clearly at speed.",
      focus:
        "large-format print design, bold visual hierarchy, out-of-home campaign execution, quick communication at scale",
      mission: "Connecting brands with their communities through outdoor media",
      products: "Billboard advertising, transit ads, digital OOH displays",
      culture: "Entrepreneurial, results-oriented, local Colorado roots",
    },
  },
};

export async function lookupHiringManager(
  company: string,
  domain?: string
): Promise<HiringManagerInfo> {
  const key = domain || "";
  const known = KNOWN_COMPANIES[key];
  if (known?.manager) return known.manager;

  // Generic guidance when no specific data
  return {
    name: undefined,
    title: "Creative Director / Design Manager / Marketing Manager",
    linkedInUrl: `https://www.linkedin.com/company/${company.toLowerCase().replace(/\s+/g, "-")}`,
    source:
      `LinkedIn Research: Visit company page, go to People tab, filter by 'Design' or 'Creative' department. Look for Creative Director, Design Manager, or Head of Marketing.`,
  };
}

export function getCompanyProfile(domain?: string, company?: string): CompanyProfile {
  const key = domain || "";
  const known = KNOWN_COMPANIES[key];
  if (known?.profile) return known.profile;

  return {
    notes: `Research ${company || "this company"} on their website and LinkedIn. Note their mission, primary products/services, design aesthetic, and recent news or milestones.`,
    focus: "company mission alignment, visual brand consistency, specific role impact",
  };
}
