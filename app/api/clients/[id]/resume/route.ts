import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const resume = await prisma.resume.upsert({
    where: { clientId: id },
    update: { content: body.content, fileName: body.fileName },
    create: { clientId: id, content: body.content, fileName: body.fileName },
  });
  return NextResponse.json(resume);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resume = await prisma.resume.findUnique({ where: { clientId: id } });
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(resume);
}
