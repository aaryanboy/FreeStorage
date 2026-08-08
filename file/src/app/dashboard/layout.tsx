import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFileCategory } from "@/lib/utils";
import DashboardSidebar from "./DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      googleAccounts: true,
      files: {
        orderBy: { createdAt: "desc" },
        include: { googleAccount: true },
      },
    },
  });

  if (!user) redirect("/login");

  const allFiles = user.files;

  // Counts per category
  const counts = {
    all: allFiles.length,
    images: allFiles.filter((f) => getFileCategory(f.mimeType) === "images").length,
    videos: allFiles.filter((f) => getFileCategory(f.mimeType) === "videos").length,
    documents: allFiles.filter((f) => getFileCategory(f.mimeType) === "documents").length,
    audio: allFiles.filter((f) => getFileCategory(f.mimeType) === "audio").length,
  };

  const googleAccounts = user.googleAccounts;
  const appFilesUsed = allFiles.reduce((sum, f) => sum + Number(f.size), 0);

  const googleTotalCapacity = googleAccounts.reduce(
    (sum, acc) => sum + Number(acc.totalStorage ?? 15 * 1024 * 1024 * 1024),
    0
  );

  const googleTotalUsed = googleAccounts.reduce(
    (sum, acc) => sum + Number(acc.usedStorage ?? 0),
    0
  );

  const preExistingUsed = Math.max(0, googleTotalUsed - appFilesUsed);

  const appPercent = googleTotalCapacity > 0 ? (appFilesUsed / googleTotalCapacity) * 100 : 0;
  const preExistingPercent = googleTotalCapacity > 0 ? (preExistingUsed / googleTotalCapacity) * 100 : 0;
  const totalUsedPercent = Math.min(appPercent + preExistingPercent, 100);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <DashboardSidebar
        user={{
          email: user.email,
          name: user.name,
        }}
        googleAccountsCount={googleAccounts.length}
        appFilesUsed={appFilesUsed}
        googleTotalUsed={googleTotalUsed}
        googleTotalCapacity={googleTotalCapacity}
        appPercent={appPercent}
        preExistingPercent={preExistingPercent}
        totalUsedPercent={totalUsedPercent}
        preExistingUsed={preExistingUsed}
        counts={counts}
      />
      <div className="md:ml-64 min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
