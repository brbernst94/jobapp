import { Resend } from "resend";

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

interface JobSummary {
  title: string;
  company: string;
  location: string;
  salaryText?: string;
  priority: string;
  jobUrl: string;
  description?: string;
  companyNotes?: string;
}

function priorityColor(p: string) {
  if (p === "high") return "#16a34a";
  if (p === "medium") return "#d97706";
  return "#6b7280";
}

function priorityLabel(p: string) {
  if (p === "high") return "★ High Match";
  if (p === "medium") return "Good Match";
  return "Match";
}

export function buildDailyReportHtml(name: string, jobs: JobSummary[], appUrl: string): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    timeZone: "America/Denver",
  });

  const high = jobs.filter(j => j.priority === "high");
  const rest = jobs.filter(j => j.priority !== "high");
  const ordered = [...high, ...rest];

  const jobCards = ordered.map(job => `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:16px;background:#fff;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="background:${priorityColor(job.priority)};color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;">
          ${priorityLabel(job.priority)}
        </span>
      </div>
      <h3 style="margin:0 0 4px;font-size:17px;color:#111827;">${job.title}</h3>
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
        ${job.company} &nbsp;·&nbsp; ${job.location}${job.salaryText ? ` &nbsp;·&nbsp; <strong style="color:#16a34a;">${job.salaryText}</strong>` : ""}
      </p>
      ${job.description ? `<p style="margin:0 0 12px;font-size:13px;color:#374151;line-height:1.5;">${job.description.slice(0, 200)}…</p>` : ""}
      ${job.companyNotes ? `
      <div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:10px 12px;border-radius:4px;margin-bottom:12px;">
        <p style="margin:0;font-size:12px;color:#92400e;font-weight:600;">COVER LETTER NOTE</p>
        <p style="margin:4px 0 0;font-size:12px;color:#78350f;">${job.companyNotes}</p>
      </div>` : ""}
      <a href="${job.jobUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600;">View Job →</a>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="text-align:center;margin-bottom:28px;">
      <h1 style="margin:0;font-size:24px;color:#111827;">Your Daily Job Report</h1>
      <p style="margin:6px 0 0;color:#6b7280;font-size:14px;">${today} &nbsp;·&nbsp; ${jobs.length} new listing${jobs.length !== 1 ? "s" : ""} for ${name}</p>
    </div>

    ${high.length > 0 ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;color:#166534;">
        <strong>${high.length} high-priority match${high.length !== 1 ? "es" : ""}</strong> today — these best fit your salary, location, and experience criteria.
      </p>
    </div>` : ""}

    ${jobCards.length > 0 ? jobCards : `
    <div style="text-align:center;padding:40px;color:#6b7280;">
      <p>No new jobs today — check back tomorrow.</p>
    </div>`}

    <div style="text-align:center;margin-top:24px;">
      <a href="${appUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        Open Job Dashboard →
      </a>
    </div>

    <p style="text-align:center;margin-top:20px;font-size:11px;color:#9ca3af;">
      Sent to ${name} · Jobs matching your criteria · Replies not monitored
    </p>
  </div>
</body>
</html>`;
}

export async function sendDailyReport(
  to: string,
  name: string,
  jobs: JobSummary[],
  appUrl: string,
  fromAddress: string,
): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) return { sent: false, error: "RESEND_API_KEY not set" };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    timeZone: "America/Denver",
  });

  try {
    await resend.emails.send({
      from: fromAddress,
      to,
      subject: `Your Job Report · ${jobs.length} new listing${jobs.length !== 1 ? "s" : ""} · ${today}`,
      html: buildDailyReportHtml(name, jobs, appUrl),
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: String(err) };
  }
}
