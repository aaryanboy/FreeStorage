import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GalleryView from "./GalleryView";
import { formatBytes, getFileCategory } from "@/lib/utils";

type SearchParams = Promise<{ type?: string; folder?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { type, folder } = await searchParams;

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

  // Fetch user folders
  const userFolders = await prisma.folder.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const allFiles = user.files;

  const filteredFiles =
    !type || type === "all"
      ? allFiles
      : allFiles.filter((f) => getFileCategory(f.mimeType) === type);

  // Combined Storage breakdown calculations across all connected Google Accounts
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

  const activeType = type || "all";

  const navItems = [
    { label: "All Files", key: "all", emoji: "🗂️" },
    { label: "Images", key: "images", emoji: "🖼️" },
    { label: "Videos", key: "videos", emoji: "🎬" },
    { label: "Documents", key: "documents", emoji: "📄" },
    { label: "Audio", key: "audio", emoji: "🎵" },
  ];

  // Map files for GalleryView
  const initialFilesForGallery = filteredFiles.map((f) => ({
    id: f.id,
    name: f.name,
    originalName: f.originalName,
    mimeType: f.mimeType,
    size: f.size.toString(),
    folder: f.folder,
    createdAt: f.createdAt.toISOString(),
    googleAccount: f.googleAccount ? { email: f.googleAccount.email } : undefined,
    driveFileId: f.driveFileId,
  }));

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/90 px-6 py-4 backdrop-blur">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {navItems.find((n) => n.key === activeType)?.label ?? "All Files"}
          </h2>
          <p className="text-sm text-gray-400">
            {filteredFiles.length === 0
              ? "No files"
              : `${filteredFiles.length} file${filteredFiles.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/dashboard/accounts"
            className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            🔐 Manage Accounts ({googleAccounts.length})
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        {/* Combined Detailed Storage Card */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-base font-semibold text-gray-900">
                Combined Storage Stack ({googleAccounts.length} Account{googleAccounts.length === 1 ? "" : "s"})
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {googleAccounts.map((a) => a.email).join(", ")}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-base font-bold text-gray-900">
                {formatBytes(googleTotalUsed)}
              </span>
              <span className="text-xs text-gray-500">
                {" "}of {formatBytes(googleTotalCapacity)} used ({totalUsedPercent.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Multi-segment Stacked Progress Bar */}
          <div className="mt-4 flex h-3.5 w-full overflow-hidden rounded-full bg-gray-100 p-0.5 ring-1 ring-gray-200/50">
            <div
              className="h-full rounded-l-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${appPercent}%` }}
            />
            <div
              className={`h-full bg-amber-500 transition-all duration-500 ${
                appPercent === 0 ? "rounded-l-full" : ""
              } ${totalUsedPercent >= 99 ? "rounded-r-full" : ""}`}
              style={{ width: `${preExistingPercent}%` }}
            />
          </div>

          {/* Storage Legend */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-indigo-600 shrink-0" />
              <div>
                <p className="font-medium text-gray-700">App Uploads</p>
                <p className="text-gray-500">{formatBytes(appFilesUsed)} ({appPercent.toFixed(1)}%)</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Pre-existing Storage</p>
                <p className="text-gray-500">{formatBytes(preExistingUsed)} ({preExistingPercent.toFixed(1)}%)</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-gray-200 shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Available Storage</p>
                <p className="text-gray-500">
                  {formatBytes(Math.max(0, googleTotalCapacity - googleTotalUsed))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Media Gallery & Folder View */}
        <GalleryView
          initialFiles={initialFilesForGallery}
          initialFolders={userFolders.map((f) => ({ id: f.id, name: f.name }))}
          currentFolder={folder}
        />
      </div>
    </>
  );
}