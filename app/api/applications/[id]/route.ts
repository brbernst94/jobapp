import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const application = await prisma.application.update({
    where: { id },
    data: { ...body, updatedAt: new Date() },
    include: { jobLead: true, followUps: true, emailEvents: true },
  });
  return NextResponse.json(application);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      jobLead: true,
      followUps: { orderBy: { scheduledFor: "asc" } },
      emailEvents: { orderBy: { receivedAt: "desc" } },
    },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(application);
}
