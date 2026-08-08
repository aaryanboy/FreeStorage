import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGoogleDriveClient } from "@/lib/googleDrive";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const file = await prisma.file.findUnique({
      where: {
        id,
      },
    });

    if (!file) {
      return new Response("File not found", {
        status: 404,
      });
    }

    const { drive } = await getGoogleDriveClient();

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
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("FILE PREVIEW ERROR:", error);

    return new Response("Failed to load file", {
      status: 500,
    });
  }
}