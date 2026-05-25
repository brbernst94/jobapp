import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");

  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;
  if (status) where.status = status;
  if (priority) where.priority = priority;

  const jobs = await prisma.jobLead.findMany({
    where,
    include: { application: true },
    orderBy: [{ priority: "asc" }, { salaryMax: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(jobs);
}
