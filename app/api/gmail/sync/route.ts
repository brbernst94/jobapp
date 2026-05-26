import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectStatusFromEmail, extractDomainFromEmail } from "@/lib/gmail-tracker";

async function getAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GMAIL_CLIENT_ID || "",
      client_secret: process.env.GMAIL_CLIENT_SECRET || "",
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

async function fetchGmailMessages(accessToken: string): Promise<
  { threadId: string; messageId: string; subject: string; from: string; snippet: string; receivedAt: string }[]
> {
  // Fetch emails from the last 14 days
  const q = encodeURIComponent("in:inbox newer_than:14d");
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) return [];
  const listData = await listRes.json();
  const messages: { id: string; threadId: string }[] = listData.messages || [];

  const results = [];
  for (const msg of messages.slice(0, 30)) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!msgRes.ok) continue;
    const msgData = await msgRes.json();
    const headers: { name: string; value: string }[] = msgData.payload?.headers || [];
    const get = (name: string) => headers.find(h => h.name === name)?.value || "";
    results.push({
      threadId: msg.threadId,
      messageId: msg.id,
      subject: get("Subject"),
      from: get("From"),
      snippet: msgData.snippet || "",
      receivedAt: new Date(parseInt(msgData.internalDate)).toISOString(),
    });
  }
  return results;
}

// GET — syncs Gmail for a specific client using their stored refresh token
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client?.gmailRefreshToken) {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
  }

  const accessToken = await getAccessToken(client.gmailRefreshToken);
  if (!accessToken) {
    await prisma.client.update({ where: { id: clientId }, data: { gmailConnected: false } });
    return NextResponse.json({ error: "Failed to refresh Gmail token — please reconnect" }, { status: 401 });
  }

  const emails = await fetchGmailMessages(accessToken);
  let matched = 0;
  const updates: { applicationId: string; status: string }[] = [];

  for (const email of emails) {
    const fromDomain = extractDomainFromEmail(email.from);
    if (!fromDomain) continue;

    const application = await prisma.application.findFirst({
      where: { clientId, jobLead: { companyDomain: fromDomain } },
      include: { jobLead: true },
    });
    if (!application) continue;

    const statusChange = detectStatusFromEmail(email.subject, email.snippet);

    const existingEvent = await prisma.emailEvent.findFirst({
      where: { applicationId: application.id, messageId: email.messageId },
    });
    if (!existingEvent) {
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
    }

    if (statusChange && statusChange !== application.status) {
      await prisma.application.update({
        where: { id: application.id },
        data: { status: statusChange, lastEmailAt: new Date(email.receivedAt), lastEmailSubject: email.subject, updatedAt: new Date() },
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

  await prisma.client.update({ where: { id: clientId }, data: { gmailSyncedAt: new Date() } });

  return NextResponse.json({ matched, statusUpdates: updates, emailsScanned: emails.length });
}

// POST — kept for Chrome extension / manual posting
export async function POST(req: Request) {
  const body = await req.json();
  const { emails, clientId } = body as {
    clientId?: string;
    emails: { threadId: string; messageId: string; subject: string; from: string; snippet: string; receivedAt: string }[];
  };

  if (!emails?.length) return NextResponse.json({ matched: 0 });

  let matched = 0;
  const updates: { applicationId: string; status: string }[] = [];

  for (const email of emails) {
    const fromDomain = extractDomainFromEmail(email.from);
    if (!fromDomain) continue;

    const application = await prisma.application.findFirst({
      where: { ...(clientId ? { clientId } : {}), jobLead: { companyDomain: fromDomain } },
      include: { jobLead: true },
    });
    if (!application) continue;

    const statusChange = detectStatusFromEmail(email.subject, email.snippet);
    await prisma.emailEvent.create({
      data: { applicationId: application.id, threadId: email.threadId, messageId: email.messageId, subject: email.subject, from: email.from, fromDomain, receivedAt: new Date(email.receivedAt), snippet: email.snippet, statusChange },
    });

    if (statusChange && statusChange !== application.status) {
      await prisma.application.update({
        where: { id: application.id },
        data: { status: statusChange, lastEmailAt: new Date(email.receivedAt), lastEmailSubject: email.subject, updatedAt: new Date() },
      });
      updates.push({ applicationId: application.id, status: statusChange });
    }
    matched++;
  }

  return NextResponse.json({ matched, statusUpdates: updates });
}
