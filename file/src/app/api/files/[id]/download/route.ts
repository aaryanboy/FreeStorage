import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGoogleDriveClient } from "@/lib/googleDrive";
import { getSessionUserId } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const file = await prisma.file.findUnique({
      where: {
        id,
      },
    });

    if (!file) {
      return new Response("File not found", { status: 404 });
    }

    if (file.userId !== userId) {
      return new Response("Forbidden", { status: 403 });
    }

    const { drive } = await getGoogleDriveClient({
      accountId: file.googleAccountId,
    });

    const response = await drive.files.get(
      {
        fileId: file.driveFileId,
        alt: "media",
      },
      {
        responseType: "arraybuffer",
      }
    );

    return new Response(response.data as ArrayBuffer, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": file.size.toString(),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          file.originalName
        )}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("FILE DOWNLOAD ERROR:", error);
    return new Response("Failed to download file", { status: 500 });
  }
}
