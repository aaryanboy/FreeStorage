import { NextResponse } from "next/server";
import { getGoogleDriveClient } from "@/lib/googleDrive";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type DriveFileItem = {
  id: string;
  name: string | null | undefined;
  originalName: string;
  mimeType: string;
  size: string;
  createdAt: string | null | undefined;
  googleAccount: { email: string };
  driveFileId: string | null | undefined;
  webViewLink: string | null | undefined;
  isExistingDriveFile: true;
};

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.googleAccount.findMany({
      where: { userId, isActive: true },
    });

    if (accounts.length === 0) {
      return NextResponse.json({ success: true, files: [] });
    }

    const allDriveFiles: DriveFileItem[] = [];

    for (const account of accounts) {
      try {
        const { drive } = await getGoogleDriveClient({ accountId: account.id });
        const response = await drive.files.list({
          q: "mimeType != 'application/vnd.google-apps.folder' and trashed = false",
          fields: "files(id, name, mimeType, size, createdTime, webViewLink)",
          pageSize: 100,
        });

        const files = response.data.files || [];
        for (const file of files) {
          allDriveFiles.push({
            id: `drive-${account.id}-${file.id}`, // unique per (account, file) pair
            name: file.name,
            originalName: file.name || "Untitled File",
            mimeType: file.mimeType || "application/octet-stream",
            size: file.size || "0",
            createdAt: file.createdTime,
            googleAccount: { email: account.email },
            driveFileId: file.id,
            webViewLink: file.webViewLink,
            isExistingDriveFile: true,
          });
        }
      } catch (err) {
        console.error(`Error listing files for account ${account.email}:`, err);
      }
    }

    return NextResponse.json({ success: true, files: allDriveFiles });
  } catch (error) {
    console.error("LIST DRIVE FILES ERROR:", error);
    return NextResponse.json({ error: "Failed to list Drive files" }, { status: 500 });
  }
}