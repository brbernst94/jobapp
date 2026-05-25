import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Deletes unsaved job leads (status "new") so a fresh fetch can replace them
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const deleted = await prisma.jobLead.deleteMany({
    where: {
      clientId,
      status: "new",
      application: null, // never delete applied jobs
    },
  });

  return NextResponse.json({ deleted: deleted.count });
}
