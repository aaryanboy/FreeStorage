import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/folders -> List all folders for the current user
export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folders = await prisma.folder.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, folders });
  } catch (error) {
    console.error("LIST FOLDERS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to list folders" },
      { status: 500 }
    );
  }
}

// POST /api/folders -> Create a new folder
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check if folder already exists for this user
    const existing = await prisma.folder.findUnique({
      where: {
        userId_name: {
          userId,
          name: trimmedName,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A folder with this name already exists" },
        { status: 409 }
      );
    }

    const folder = await prisma.folder.create({
      data: {
        name: trimmedName,
        userId,
      },
    });

    return NextResponse.json({ success: true, folder });
  } catch (error) {
    console.error("CREATE FOLDER ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
