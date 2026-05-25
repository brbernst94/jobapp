// Gmail integration helpers for application tracking
// Uses Gmail API via OAuth — requires GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface EmailThread {
  threadId: string;
  subject: string;
  from: string;
  fromDomain: string;
  snippet: string;
  receivedAt: Date;
  statusChange?: ApplicationStatus;
}

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "viewed"
  | "phone_screen"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

// Keywords that signal status changes when found in email subjects/snippets
const STATUS_SIGNALS: { keywords: string[]; status: ApplicationStatus }[] = [
  {
    keywords: ["thank you for applying", "application received", "we received your application", "application confirmed"],
    status: "applied",
  },
  {
    keywords: ["moved forward", "next steps", "schedule a call", "phone screen", "phone interview", "initial interview"],
    status: "phone_screen",
  },
  {
    keywords: ["interview", "meet with our team", "video interview", "onsite", "on-site"],
    status: "interview",
  },
  {
    keywords: ["offer", "pleased to offer", "compensation package", "offer letter"],
    status: "offer",
  },
  {
    keywords: [
      "not moving forward",
      "decided to move forward with other",
      "unfortunately",
      "not selected",
      "regret to inform",
      "other candidates",
      "decided not to",
      "position has been filled",
    ],
    status: "rejected",
  },
];

export function detectStatusFromEmail(subject: string, snippet: string): ApplicationStatus | undefined {
  const text = `${subject} ${snippet}`.toLowerCase();
  for (const signal of STATUS_SIGNALS) {
    if (signal.keywords.some((k) => text.includes(k))) {
      return signal.status;
    }
  }
  return undefined;
}

export function extractDomainFromEmail(email: string): string {
  const match = email.match(/@([^>]+)/);
  return match ? match[1].toLowerCase().trim() : "";
}

// Follow-up schedule: 1 week after apply, 2 weeks, 3 weeks
export function generateFollowUpSchedule(appliedAt: Date): { scheduledFor: Date; message: string; type: string }[] {
  const oneWeek = new Date(appliedAt);
  oneWeek.setDate(oneWeek.getDate() + 7);

  const twoWeeks = new Date(appliedAt);
  twoWeeks.setDate(twoWeeks.getDate() + 14);

  const threeWeeks = new Date(appliedAt);
  threeWeeks.setDate(threeWeeks.getDate() + 21);

  return [
    {
      scheduledFor: oneWeek,
      type: "email",
      message: `Subject: Following Up – Graphic Designer Application\n\nHi [Hiring Manager],\n\nI hope this finds you well! I wanted to follow up on my application for the Graphic Designer position at [Company], which I submitted on [Date].\n\nI'm very excited about the opportunity to contribute my design skills to [Company's mission/project]. My experience in [relevant skill] aligns well with what you're looking for, and I'd love the chance to discuss how I can add value to your team.\n\nIs there any additional information I can provide? I look forward to hearing from you.\n\nBest regards,\nPatrick Selner\n[Phone] | [Portfolio URL]`,
    },
    {
      scheduledFor: twoWeeks,
      type: "email",
      message: `Subject: Re: Graphic Designer Application – Patrick Selner\n\nHi [Hiring Manager],\n\nI wanted to check in once more regarding the Graphic Designer role at [Company]. I remain very interested in the position and in contributing to [specific company initiative].\n\nIf the timeline has shifted or if there's anything else you need from me, please don't hesitate to reach out.\n\nThank you for your consideration.\n\nBest,\nPatrick Selner`,
    },
    {
      scheduledFor: threeWeeks,
      type: "note",
      message: `Consider whether to send a final follow-up or mark this application as inactive. If sending: keep it brief, express continued interest, and offer to stay in touch for future opportunities.`,
    },
  ];
}

// Gmail OAuth URL builder (for frontend redirect)
export function buildGmailAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}
