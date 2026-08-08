import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const userAccounts = await prisma.googleAccount.findMany({
      where: { userId },
    });

    if (userAccounts.length <= 1) {
      return NextResponse.json(
        { error: "Cannot delete your only connected Google account" },
        { status: 400 }
      );
    }

    const targetAccount = userAccounts.find((acc) => acc.id === id);
    if (!targetAccount) {
      return NextResponse.json(
        { error: "Google account not found" },
        { status: 404 }
      );
    }

    // Delete account (or set inactive)
    await prisma.googleAccount.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Account disconnected successfully",
    });
  } catch (error) {
    console.error("DELETE ACCOUNT ERROR:", error);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 }
    );
  }
}
