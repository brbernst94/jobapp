import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchGraphicDesignJobs, scoreJob, extractDomain } from "@/lib/job-fetcher";
import { lookupHiringManager, getCompanyProfile } from "@/lib/hiring-manager";

// Triggered daily via cron (e.g. Vercel Cron, GitHub Actions, or external scheduler)
// Secure with CRON_SECRET header in production
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the primary client (Patrick Selner)
  const client = await prisma.client.findFirst({ orderBy: { createdAt: "asc" } });
  if (!client) {
    return NextResponse.json({ error: "No client found — seed the database first" }, { status: 404 });
  }

  const rawJobs = await fetchGraphicDesignJobs();
  let added = 0;
  let skipped = 0;

  for (const raw of rawJobs) {
    // Skip if already in database
    const existing = await prisma.jobLead.findFirst({
      where: { jobUrl: raw.jobUrl, clientId: client.id },
    });
    if (existing) { skipped++; continue; }

    const { priority } = scoreJob(raw);
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

  return NextResponse.json({
    success: true,
    added,
    skipped,
    total: rawJobs.length,
    fetchedAt: new Date().toISOString(),
  });
}
