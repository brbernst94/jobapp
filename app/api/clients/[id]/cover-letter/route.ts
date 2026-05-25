import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const coverLetter = await prisma.coverLetter.upsert({
    where: { clientId: id },
    update: { content: body.content },
    create: { clientId: id, content: body.content },
  });
  return NextResponse.json(coverLetter);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coverLetter = await prisma.coverLetter.findUnique({ where: { clientId: id } });
  if (!coverLetter) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(coverLetter);
}
