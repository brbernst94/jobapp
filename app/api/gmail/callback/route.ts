import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const clientId = searchParams.get("state");
  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!code || !clientId) {
    return NextResponse.redirect(`${appUrl}?gmailError=missing_params`);
  }

  const googleClientId = process.env.GMAIL_CLIENT_ID;
  const googleClientSecret = process.env.GMAIL_CLIENT_SECRET;
  if (!googleClientId || !googleClientSecret) {
    return NextResponse.redirect(`${appUrl}?gmailError=not_configured`);
  }

  const redirectUri = `${appUrl}/api/gmail/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}?gmailError=token_exchange_failed`);
  }

  const tokens = await tokenRes.json();

  await prisma.client.update({
    where: { id: clientId },
    data: {
      gmailRefreshToken: tokens.refresh_token,
      gmailConnected: true,
    },
  });

  return NextResponse.redirect(`${appUrl}?gmailConnected=1&clientId=${clientId}`);
}
