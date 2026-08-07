import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing code" },
      { status: 400 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000/api/auth/google/callback"
  );

  const { tokens } = await oauth2Client.getToken(code);

  console.log("ACCESS TOKEN EXISTS:", !!tokens.access_token);

  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  const oauth2 = google.oauth2({
    auth: oauth2Client,
    version: "v2",
  });

  const { data } = await oauth2.userinfo.get();

  console.log(data);

  const account = await prisma.googleAccount.upsert({
    where: {
      email: data.email!,
    },
    update: {
      accessToken: tokens.access_token,
      ...(tokens.refresh_token && {
        refreshToken: tokens.refresh_token,
      }),
      name: data.name,
      picture: data.picture,
    },
    create: {
      googleId: data.id!,
      email: data.email!,
      name: data.name,
      picture: data.picture,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
    },
  });

  return NextResponse.json({
    success: true,
    account,
  });
}