import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectStatusFromEmail, extractDomainFromEmail } from "@/lib/gmail-tracker";

// Called by the Gmail Chrome Extension via message passing, or directly via OAuth token
// Matches incoming emails to applications by company domain

export async function POST(req: Request) {
  const body = await req.json();
  const { emails } = body as {
    emails: {
      threadId: string;
      messageId: string;
      subject: string;
      from: string;
      snippet: string;
      receivedAt: string;
    }[];
  };

  if (!emails?.length) {
    return NextResponse.json({ matched: 0 });
  }

  let matched = 0;
  const updates: { applicationId: string; status: string }[] = [];

  for (const email of emails) {
    const fromDomain = extractDomainFromEmail(email.from);
    if (!fromDomain) continue;

    // Find application matching this company domain
    const application = await prisma.application.findFirst({
      where: { jobLead: { companyDomain: fromDomain } },
      include: { jobLead: true },
    });
    if (!application) continue;

    // Record the email event
    const statusChange = detectStatusFromEmail(email.subject, email.snippet);
    await prisma.emailEvent.create({
      data: {
        applicationId: application.id,
        threadId: email.threadId,
        messageId: email.messageId,
        subject: email.subject,
        from: email.from,
        fromDomain,
        receivedAt: new Date(email.receivedAt),
        snippet: email.snippet,
        statusChange,
      },
    });

    // Update application status if we detected a change
    if (statusChange && statusChange !== application.status) {
      await prisma.application.update({
        where: { id: application.id },
        data: {
          status: statusChange,
          lastEmailAt: new Date(email.receivedAt),
          lastEmailSubject: email.subject,
          emailThreadId: email.threadId,
          updatedAt: new Date(),
        },
      });
      updates.push({ applicationId: application.id, status: statusChange });
    } else {
      await prisma.application.update({
        where: { id: application.id },
        data: { lastEmailAt: new Date(email.receivedAt), lastEmailSubject: email.subject },
      });
    }

    matched++;
  }

  return NextResponse.json({ matched, statusUpdates: updates });
}
