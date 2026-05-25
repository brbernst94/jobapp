import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateFollowUpSchedule } from "@/lib/gmail-tracker";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  const applications = await prisma.application.findMany({
    where: clientId ? { clientId } : undefined,
    include: {
      jobLead: true,
      followUps: { orderBy: { scheduledFor: "asc" } },
      emailEvents: { orderBy: { receivedAt: "desc" }, take: 5 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(applications);
}

export async function POST(req: Request) {
  const body = await req.json();
  const appliedAt = body.appliedAt ? new Date(body.appliedAt) : new Date();

  const application = await prisma.application.create({
    data: {
      clientId: body.clientId,
      jobLeadId: body.jobLeadId,
      status: body.status || "applied",
      appliedAt,
      notes: body.notes,
    },
  });

  // Update job lead status
  await prisma.jobLead.update({
    where: { id: body.jobLeadId },
    data: { status: "applied" },
  });

  // Auto-generate follow-up schedule
  const followUps = generateFollowUpSchedule(appliedAt);
  await prisma.followUp.createMany({
    data: followUps.map((f) => ({
      applicationId: application.id,
      scheduledFor: f.scheduledFor,
      message: f.message,
      type: f.type,
    })),
  });

  return NextResponse.json(application, { status: 201 });
}
