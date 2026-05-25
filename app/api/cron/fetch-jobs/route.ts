import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchGraphicDesignJobs, scoreJob, extractDomain } from "@/lib/job-fetcher";
import { lookupHiringManager, getCompanyProfile } from "@/lib/hiring-manager";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch for specific client or all clients
  const clients = clientId
    ? await prisma.client.findMany({ where: { id: clientId }, include: { criteria: true } })
    : await prisma.client.findMany({ include: { criteria: true } });

  if (!clients.length) {
    return NextResponse.json({ error: "No clients found" }, { status: 404 });
  }

  const results: Record<string, { added: number; skipped: number }> = {};

  for (const client of clients) {
    const criteria = client.criteria;
    const titles = criteria?.titles?.split(",").map(t => t.trim()) ?? ["Graphic Designer"];
    const locations = criteria?.locations?.split(",").map(l => l.trim()) ?? ["Denver, CO"];
    const salaryMin = criteria?.salaryMin ?? 50000;

    const rawJobs = await fetchGraphicDesignJobs(titles, locations, salaryMin);
    let added = 0;
    let skipped = 0;

    for (const raw of rawJobs) {
      const existing = await prisma.jobLead.findFirst({
        where: { jobUrl: raw.jobUrl, clientId: client.id },
      });
      if (existing) { skipped++; continue; }

      const { priority } = scoreJob(raw, criteria);
      const domain = raw.companyDomain || extractDomain(raw.companyWebsite);
      const [managerInfo, companyProfile] = await Promise.all([
        lookupHiringManager(raw.company, domain),
        Promise.resolve(getCompanyProfile(domain, raw.company)),
      ]);

      await prisma.jobLead.create({
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
      added++;
    }
    results[client.id] = { added, skipped };
  }

  return NextResponse.json({ success: true, results, fetchedAt: new Date().toISOString() });
}
