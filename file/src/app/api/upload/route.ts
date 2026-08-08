import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { getGoogleDriveClient, syncGoogleAccountStorage } from "@/lib/googleDrive";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const folder = formData.get("folder") as string | null;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const { drive, account } = await getGoogleDriveClient({ userId });

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Resolve unique file name
    let finalFileName = file.name;
    let nameExists = true;
    let counter = 1;

    const dotIndex = file.name.lastIndexOf(".");
    const baseName = dotIndex === -1 ? file.name : file.name.substring(0, dotIndex);
    const ext = dotIndex === -1 ? "" : file.name.substring(dotIndex);

    while (nameExists) {
      const existing = await prisma.file.findFirst({
        where: {
          userId: user.id,
          name: finalFileName,
          folder: folder || null,
        },
      });

      if (!existing) {
        nameExists = false;
      } else {
        finalFileName = `${baseName} (${counter})${ext}`;
        counter++;
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    const uploadedFile = await drive.files.create({
      requestBody: {
        name: finalFileName,
      },
      media: {
        mimeType: file.type || "application/octet-stream",
        body: stream,
      },
      fields: "id,name,mimeType,size",
    });

    const driveFile = uploadedFile.data;

    if (!driveFile.id) {
      throw new Error("Google Drive did not return a file ID");
    }

    const savedFile = await prisma.file.create({
      data: {
        name: finalFileName,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: BigInt(file.size),
        driveFileId: driveFile.id,
        userId: user.id,
        googleAccountId: account.id,
        folder: folder || null,
      },
    });

    // Refresh Google Drive quota in background
    syncGoogleAccountStorage(account.id, drive).catch(console.error);

    return NextResponse.json({
      success: true,
      file: {
        id: savedFile.id,
        name: savedFile.name,
        originalName: savedFile.originalName,
        mimeType: savedFile.mimeType,
        size: savedFile.size.toString(),
        driveFileId: savedFile.driveFileId,
        folder: savedFile.folder,
      },
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        error: "Upload failed",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
