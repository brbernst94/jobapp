import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clients = await prisma.client.findMany({
    include: { resume: true, coverLetter: true, criteria: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  const body = await req.json();
  const client = await prisma.client.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone,
      location: body.location,
      portfolioUrl: body.portfolioUrl,
      linkedinUrl: body.linkedinUrl,
      bio: body.bio,
      criteria: body.criteria ? {
        create: {
          salaryMin: body.criteria.salaryMin ?? 50000,
          locations: body.criteria.locations ?? "Denver, CO",
          remoteOk: body.criteria.remoteOk ?? true,
          expMin: body.criteria.expMin ?? 1,
          expMax: body.criteria.expMax ?? 3,
          titles: body.criteria.titles ?? "Graphic Designer,Brand Designer,Visual Designer",
          industry: body.criteria.industry,
        }
      } : undefined,
    },
    include: { criteria: true },
  });
  return NextResponse.json(client, { status: 201 });
}
