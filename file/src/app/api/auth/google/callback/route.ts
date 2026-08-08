import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
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

    console.log(
      "ACCESS TOKEN EXISTS:",
      !!tokens.access_token
    );

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });

    const { data } = await oauth2.userinfo.get();

    console.log("GOOGLE USER:", data);

    if (!data.email || !data.id) {
      return NextResponse.json(
        { error: "Google account information is missing" },
        { status: 400 }
      );
    }

    // Find or create our application user
    const user = await prisma.user.upsert({
      where: {
        email: data.email,
      },
      update: {
        name: data.name,
      },
      create: {
        email: data.email,
        name: data.name,
      },
    });

    // Find or create the Google account
    const account = await prisma.googleAccount.upsert({
      where: {
        email: data.email,
      },

      update: {
        googleId: data.id,
        name: data.name,
        picture: data.picture,
        accessToken: tokens.access_token,
        userId: user.id,

        ...(tokens.refresh_token && {
          refreshToken: tokens.refresh_token,
        }),
      },

      create: {
        googleId: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token!,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,

      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },

      googleAccount: {
        id: account.id,
        email: account.email,
      },
    });
  } catch (error) {
    console.error("GOOGLE CALLBACK ERROR:", error);

    return NextResponse.json(
      {
        error: "Google authentication failed",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}