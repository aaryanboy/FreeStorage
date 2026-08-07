import { NextResponse } from "next/server";
import { getGoogleDriveClient } from "@/lib/googleDrive";

export async function GET() {
  const { drive } = await getGoogleDriveClient();

  const result = await drive.files.list({
    pageSize: 10,
    fields: "files(id,name)",
  });

  return NextResponse.json(result.data);
}