import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const criteria = await prisma.jobCriteria.findUnique({ where: { clientId: id } });
  if (!criteria) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(criteria);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const criteria = await prisma.jobCriteria.upsert({
    where: { clientId: id },
    update: {
      salaryMin: body.salaryMin,
      salaryMax: body.salaryMax,
      locations: body.locations,
      remoteOk: body.remoteOk,
      expMin: body.expMin,
      expMax: body.expMax,
      titles: body.titles,
      industry: body.industry,
    },
    create: {
      clientId: id,
      salaryMin: body.salaryMin ?? 50000,
      salaryMax: body.salaryMax,
      locations: body.locations ?? "Denver, CO",
      remoteOk: body.remoteOk ?? true,
      expMin: body.expMin ?? 1,
      expMax: body.expMax ?? 3,
      titles: body.titles ?? "Graphic Designer,Brand Designer,Visual Designer",
      industry: body.industry,
    },
  });
  return NextResponse.json(criteria);
}
