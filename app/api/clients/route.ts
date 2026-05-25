import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clients = await prisma.client.findMany({
    include: { resume: true, coverLetter: true },
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
    },
  });
  return NextResponse.json(client, { status: 201 });
}
