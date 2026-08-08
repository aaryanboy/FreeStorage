import { NextResponse } from "next/server";
import { getGoogleDriveClient } from "@/lib/googleDrive";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { drive } = await getGoogleDriveClient({ userId });

    const response = await drive.about.get({
      fields: "storageQuota",
    });

    const quota = response.data.storageQuota;

    const limit = Number(quota?.limit ?? 0);
    const usage = Number(quota?.usage ?? 0);

    const percentage =
      limit > 0 ? (usage / limit) * 100 : 0;

    return NextResponse.json({
      success: true,
      storage: {
        used: usage,
        total: limit,
        percentage,
      },
    });
  } catch (error) {
    console.error("STORAGE ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to get storage information",
      },
      { status: 500 }
    );
  }
}