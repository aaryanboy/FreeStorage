import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleDriveClient, syncGoogleAccountStorage } from "@/lib/googleDrive";

// DELETE /api/files/[id] -> Delete file from Google Drive and DB
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const file = await prisma.file.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Try deleting file from Google Drive
    try {
      const { drive } = await getGoogleDriveClient({
        accountId: file.googleAccountId,
      });

      await drive.files.delete({
        fileId: file.driveFileId,
      });

      // Sync storage quota after deletion
      syncGoogleAccountStorage(file.googleAccountId, drive).catch(console.error);
    } catch (driveErr) {
      console.warn("Failed to delete file from Google Drive, proceeding with DB deletion:", driveErr);
    }

    // Delete record from database
    await prisma.file.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("DELETE FILE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}

// PATCH /api/files/[id] -> Update folder / move file
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { folder } = body; // string | null

    const file = await prisma.file.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const updatedFile = await prisma.file.update({
      where: { id },
      data: {
        folder: folder !== undefined ? folder : file.folder,
      },
    });

    return NextResponse.json({
      success: true,
      file: {
        id: updatedFile.id,
        name: updatedFile.name,
        originalName: updatedFile.originalName,
        folder: updatedFile.folder,
      },
    });
  } catch (error) {
    console.error("MOVE FILE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to move file" },
      { status: 500 }
    );
  }
}
