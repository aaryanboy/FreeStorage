import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const files = await prisma.file.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        googleAccount: true,
      },
    });

    return NextResponse.json({
      success: true,
      files: files.map((file) => ({
        ...file,
        size: file.size.toString(),
      })),
    });
  } catch (error) {
    console.error("GET FILES ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to get files",
      },
      { status: 500 }
    );
  }
}
