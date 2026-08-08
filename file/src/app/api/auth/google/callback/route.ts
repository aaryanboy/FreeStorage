import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, getSessionUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Missing code" },
        { status: 400 }
      );
    }

    const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const redirectUri = `${origin}/api/auth/google/callback`;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
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

    // Check if user is currently logged in via session
    const currentUserId = await getSessionUserId();

    let user = null;
    if (currentUserId) {
      user = await prisma.user.findUnique({
        where: { id: currentUserId },
      });
    }

    // If not logged in, check if this Google account is already linked to an existing user
    if (!user) {
      const existingGoogleAccount = await prisma.googleAccount.findUnique({
        where: { email: data.email },
        include: { user: true },
      });

      if (existingGoogleAccount) {
        user = existingGoogleAccount.user;
      }
    }

    // If still no user, find or create application user by email
    if (!user) {
      user = await prisma.user.upsert({
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
    }

    // Find or create the Google account linked to this user
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

    // Fetch storage quota from Google Drive
    try {
      const drive = google.drive({ version: "v3", auth: oauth2Client });
      const about = await drive.about.get({ fields: "storageQuota" });
      const quota = about.data.storageQuota;
      if (quota) {
        await prisma.googleAccount.update({
          where: { id: account.id },
          data: {
            totalStorage: quota.limit ? BigInt(quota.limit) : null,
            usedStorage: quota.usage ? BigInt(quota.usage) : null,
          },
        });
      }
    } catch (quotaErr) {
      console.error("Failed to fetch storage quota during login:", quotaErr);
    }

    await createSession(user.id);

    console.log("LOGIN SUCCESS:", {
      userId: user.id,
      googleAccountId: account.id,
    });

    // Successful login → go to homepage
    return NextResponse.redirect(new URL("/", req.url));
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