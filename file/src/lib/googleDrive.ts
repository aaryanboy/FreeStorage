import { google, drive_v3 } from "googleapis";
import { prisma } from "@/lib/prisma";

export async function syncGoogleAccountStorage(
  accountId: string,
  drive: drive_v3.Drive
) {
  try {
    const about = await drive.about.get({
      fields: "storageQuota",
    });

    const quota = about.data.storageQuota;

    if (quota) {
      const updatedAccount = await prisma.googleAccount.update({
        where: { id: accountId },
        data: {
          totalStorage: quota.limit ? BigInt(quota.limit) : null,
          usedStorage: quota.usage ? BigInt(quota.usage) : null,
        },
      });
      return updatedAccount;
    }
  } catch (error) {
    console.error("Error syncing Google Drive storage quota:", error);
  }
  return null;
}

export async function getGoogleDriveClient(options?: {
  userId?: string;
  accountId?: string;
}) {
  let account = null;

  if (options?.accountId) {
    account = await prisma.googleAccount.findFirst({
      where: {
        id: options.accountId,
        isActive: true,
      },
    });
  } else if (options?.userId) {
    const accounts = await prisma.googleAccount.findMany({
      where: {
        userId: options.userId,
        isActive: true,
      },
      orderBy: {
        priority: "asc",
      },
    });

    if (accounts.length > 0) {
      // Pick the account with the most available free space
      account = accounts.reduce((best, curr) => {
        const currTotal = Number(curr.totalStorage ?? 15 * 1024 * 1024 * 1024);
        const currUsed = Number(curr.usedStorage ?? 0);
        const currFree = currTotal - currUsed;

        const bestTotal = Number(best.totalStorage ?? 15 * 1024 * 1024 * 1024);
        const bestUsed = Number(best.usedStorage ?? 0);
        const bestFree = bestTotal - bestUsed;

        return currFree > bestFree ? curr : best;
      }, accounts[0]);
    }
  }

  if (!account) {
    account = await prisma.googleAccount.findFirst({
      where: {
        isActive: true,
      },
    });
  }

  if (!account) {
    throw new Error("No active Google account found");
  }

  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectUri = `${origin}/api/auth/google/callback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
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