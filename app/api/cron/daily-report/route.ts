import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchGraphicDesignJobs, scoreJob, shouldExcludeJob, extractDomain } from "@/lib/job-fetcher";
import { lookupHiringManager, getCompanyProfile } from "@/lib/hiring-manager";
import { sendDailyReport } from "@/lib/email";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const clientId = searchParams.get("clientId");

  // Allow UI-triggered preview (with clientId) without secret; require secret for batch cron
  if (!clientId && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXTAUTH_URL || "https://your-app.railway.app";
  const fromAddress = process.env.RESEND_FROM || "JobApp <reports@yourdomain.com>";

  const clients = clientId
    ? await prisma.client.findMany({ where: { id: clientId }, include: { criteria: true } })
    : await prisma.client.findMany({ include: { criteria: true } });

  if (!clients.length) {
    return NextResponse.json({ error: "No clients found" }, { status: 404 });
  }

  const results: Record<string, { added: number; emailed: boolean; error?: string }> = {};

  for (const client of clients) {
    if (!client.email) {
      results[client.id] = { added: 0, emailed: false, error: "No email on profile" };
      continue;
    }

    const criteria = client.criteria;
    const titles = criteria?.titles?.split(",").map(t => t.trim()) ?? ["Graphic Designer"];
    const locations = criteria?.locations?.split(",").map(l => l.trim()) ?? ["Denver, CO"];
    const salaryMin = criteria?.salaryMin ?? 50000;

    const rawJobs = await fetchGraphicDesignJobs(titles, locations, salaryMin);
    const newJobs = [];

    for (const raw of rawJobs) {
      const { exclude } = shouldExcludeJob(raw, criteria);
      if (exclude) continue;

      const existing = await prisma.jobLead.findFirst({
        where: { jobUrl: raw.jobUrl, clientId: client.id },
      });
      if (existing) continue;

      const { priority } = scoreJob(raw, criteria);
      const domain = raw.companyDomain || extractDomain(raw.companyWebsite);
      const [managerInfo, companyProfile] = await Promise.all([
        lookupHiringManager(raw.company, domain),
        getCompanyProfile(domain, raw.company),
      ]);

      const lead = await prisma.jobLead.create({
        data: {
          clientId: client.id,
          title: raw.title,
          company: raw.company,
          location: raw.location,
          isRemote: raw.isRemote,
          salaryMin: raw.salaryMin,
          salaryMax: raw.salaryMax,
          salaryText: raw.salaryText,
          experienceYears: raw.experienceYears,
          jobUrl: raw.jobUrl,
          source: raw.source,
          description: raw.description,
          postedAt: raw.postedAt,
          companyDomain: domain,
          companyWebsite: raw.companyWebsite,
          hiringManager: managerInfo.name,
          hiringManagerTitle: managerInfo.title,
          hiringManagerLinkedIn: managerInfo.linkedInUrl,
          companyNotes: companyProfile.notes,
          coverLetterFocus: companyProfile.focus,
          priority,
          status: "new",
        },
      });

      newJobs.push({
        title: lead.title,
        company: lead.company,
        location: lead.location,
        salaryText: lead.salaryText ?? undefined,
        priority: lead.priority,
        jobUrl: lead.jobUrl,
        description: lead.description ?? undefined,
        companyNotes: lead.companyNotes ?? undefined,
      });
    }

    const { sent, error } = await sendDailyReport(
      client.email,
      client.name,
      newJobs,
      appUrl,
      fromAddress,
    );

    results[client.id] = { added: newJobs.length, emailed: sent, error };
  }

  return NextResponse.json({ success: true, results, sentAt: new Date().toISOString() });
}
