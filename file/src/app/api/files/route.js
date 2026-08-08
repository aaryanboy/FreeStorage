import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const files = await prisma.file.findMany({
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