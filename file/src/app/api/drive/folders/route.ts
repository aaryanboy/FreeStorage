import { NextRequest, NextResponse } from "next/server";
import { getGoogleDriveClient } from "@/lib/googleDrive";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.googleAccount.findMany({
      where: { userId, isActive: true },
    });

    if (accounts.length === 0) {
      return NextResponse.json({ success: true, folders: [] });
    }

    const allDriveFolders: any[] = [];

    for (const account of accounts) {
      try {
        const { drive } = await getGoogleDriveClient({ accountId: account.id });
        const response = await drive.files.list({
          q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
          fields: "files(id, name, createdTime)",
          pageSize: 100,
        });

        const folders = response.data.files || [];
        for (const folder of folders) {
          allDriveFolders.push({
            id: `drive-${folder.id}`,
            name: folder.name || "Untitled Folder",
            createdAt: folder.createdTime,
            googleAccount: { email: account.email },
            isDriveFolder: true,
            driveFolderId: folder.id,
          });
        }
      } catch (err) {
        console.error(`Error listing folders for account ${account.email}:`, err);
      }
    }

    return NextResponse.json({ success: true, folders: allDriveFolders });
  } catch (error) {
    console.error("LIST DRIVE FOLDERS ERROR:", error);
    return NextResponse.json({ error: "Failed to list Drive folders" }, { status: 500 });
  }
}
