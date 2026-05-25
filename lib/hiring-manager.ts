import Anthropic from "@anthropic-ai/sdk";

export interface HiringManagerInfo {
  name?: string;
  title?: string;
  linkedInUrl?: string;
  source: string;
}

export interface CompanyProfile {
  notes: string;
  focus: string;
  mission?: string;
  products?: string;
  culture?: string;
}

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

export async function lookupHiringManager(
  company: string,
  domain?: string
): Promise<HiringManagerInfo> {
  const client = getClient();
  const linkedInUrl = `https://www.linkedin.com/company/${company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  if (!client) {
    return {
      title: "Creative Director / Design Manager",
      linkedInUrl,
      source: "Add ANTHROPIC_API_KEY to Railway for AI-researched contacts",
    };
  }

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `For the company "${company}"${domain ? ` (website: ${domain})` : ""}, who would typically be the hiring manager for a Graphic Designer role? Respond in JSON only with these fields: title (their likely job title), linkedInSearchTip (a specific LinkedIn search query to find them, e.g. '"Company Name" "Creative Director"'), notes (1 sentence on how to find and approach them). No markdown, just JSON.`,
        },
      ],
    });

    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    const json = JSON.parse(text.replace(/```json?|```/g, "").trim());
    return {
      title: json.title,
      linkedInUrl: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(json.linkedInSearchTip || `${company} Creative Director`)}`,
      source: json.notes || "AI-researched",
    };
  } catch {
    return {
      title: "Creative Director / Design Manager",
      linkedInUrl,
      source: "LinkedIn: visit company page → People → filter by Design or Creative",
    };
  }
}

export async function getCompanyProfile(
  domain?: string,
  company?: string
): Promise<CompanyProfile> {
  const client = getClient();
  const companyName = company || "this company";

  if (!client) {
    return {
      notes: `Research ${companyName} on their website and LinkedIn. Note their mission, products/services, design aesthetic, and recent news.`,
      focus: "company mission alignment, visual brand consistency, specific role impact",
    };
  }

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Research "${companyName}"${domain ? ` (${domain})` : ""} for a Graphic Designer job application. Respond in JSON only with these fields: notes (2-3 sentences: what the company does, their design aesthetic, anything notable about their brand or recent news), focus (comma-separated list of 3-4 specific design skills/themes that matter for this company's cover letter), mission (their mission statement or a close paraphrase), culture (2-4 words describing their culture). No markdown, just JSON.`,
        },
      ],
    });

    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    const json = JSON.parse(text.replace(/```json?|```/g, "").trim());
    return {
      notes: json.notes || `Research ${companyName} on their website and LinkedIn.`,
      focus: json.focus || "company mission alignment, visual brand consistency",
      mission: json.mission,
      culture: json.culture,
    };
  } catch {
    return {
      notes: `Research ${companyName} on their website and LinkedIn. Note their mission, design aesthetic, and recent milestones.`,
      focus: "company mission alignment, visual brand consistency, specific role impact",
    };
  }
}
