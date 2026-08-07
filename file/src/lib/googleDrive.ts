import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export async function getGoogleDriveClient() {
  // Get an active Google account
  const account = await prisma.googleAccount.findFirst({
    where: {
      isActive: true,
    },
  });

  if (!account) {
    throw new Error("No active Google account found");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000/api/auth/google/callback"
  );

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  });

  // Automatically refresh access token when expired
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.googleAccount.update({
        where: {
          id: account.id,
        },
        data: {
          accessToken: tokens.access_token,
        },
      });
    }
  });

  const drive = google.drive({
    version: "v3",
    auth: oauth2Client,
  });

  return {
    drive,
    account,
  };
}