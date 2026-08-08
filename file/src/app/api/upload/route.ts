import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { getGoogleDriveClient, syncGoogleAccountStorage } from "@/lib/googleDrive";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const { drive, account } = await getGoogleDriveClient();

    const user = await prisma.user.findUnique({
      where: {
        id: account.userId,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    const uploadedFile = await drive.files.create({
      requestBody: {
        name: file.name,
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
        name: driveFile.name || file.name,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: BigInt(file.size),
        driveFileId: driveFile.id,
        userId: user.id,
        googleAccountId: account.id,
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
