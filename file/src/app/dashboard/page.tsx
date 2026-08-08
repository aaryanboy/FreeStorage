import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GalleryView from "./GalleryView";

function formatBytes(bytes: bigint | number) {
  const value = Number(bytes);
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(value) / Math.log(1024));
  return `${(value / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function getFileCategory(mimeType: string) {
  if (mimeType.startsWith("image/")) return "images";
  if (mimeType.startsWith("video/")) return "videos";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("sheet") ||
    mimeType.includes("text")
  )
    return "documents";
  return "other";
}

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

  // Counts per category
  const counts = {
    all: allFiles.length,
    images: allFiles.filter((f) => getFileCategory(f.mimeType) === "images").length,
    videos: allFiles.filter((f) => getFileCategory(f.mimeType) === "videos").length,
    documents: allFiles.filter((f) => getFileCategory(f.mimeType) === "documents").length,
    audio: allFiles.filter((f) => getFileCategory(f.mimeType) === "audio").length,
    other: allFiles.filter((f) => getFileCategory(f.mimeType) === "other").length,
  };

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
  }));

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-gray-200 bg-white md:flex z-20">
        {/* Logo */}
        <div className="border-b border-gray-100 px-6 py-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            FreeStorage
          </h1>
          <p className="mt-0.5 truncate text-xs text-gray-400">
            {googleAccounts.length} Connected Account{googleAccounts.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Upload button */}
        <div className="px-4 pt-5">
          <a
            href="/test-upload"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            <span>+</span> Upload File
          </a>
        </div>

        {/* Nav */}
        <nav className="mt-4 flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = activeType === item.key;
            const count = counts[item.key as keyof typeof counts];
            return (
              <a
                key={item.key}
                href={
                  item.key === "all"
                    ? "/dashboard"
                    : `/dashboard?type=${item.key}`
                }
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span>{item.emoji}</span>
                  {item.label}
                </span>
                {count > 0 && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                    {count}
                  </span>
                )}
              </a>
            );
          })}

          <a
            href="/dashboard/accounts"
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors mt-2 border-t border-gray-100 pt-3"
          >
            <span className="flex items-center gap-2.5">
              <span>🔐</span> Google Accounts
            </span>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
              {googleAccounts.length}
            </span>
          </a>
        </nav>

        {/* Sidebar Mini Storage Bar */}
        <div className="border-t border-gray-100 px-5 py-5">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Combined Storage</span>
            <span>{totalUsedPercent.toFixed(1)}% used</span>
          </div>

          {/* Stacked Bar */}
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="bg-indigo-600 transition-all duration-300"
              style={{ width: `${appPercent}%` }}
              title={`App files: ${formatBytes(appFilesUsed)}`}
            />
            <div
              className="bg-amber-500 transition-all duration-300"
              style={{ width: `${preExistingPercent}%` }}
              title={`Pre-existing Drive files: ${formatBytes(preExistingUsed)}`}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400">
            <span>{formatBytes(googleTotalUsed)} used</span>
            <span>{formatBytes(googleTotalCapacity)}</span>
          </div>
        </div>

        {/* User + Logout */}
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="truncate text-sm font-medium text-gray-700">
            {user.name || "User"}
          </p>
          <p className="truncate text-xs text-gray-400">{user.email}</p>
          <form action="/api/auth/logout" method="POST" className="mt-3">
            <button
              type="submit"
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <section className="min-h-screen md:ml-64">

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
            <a
              href="/test-upload"
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              Upload
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
      </section>
    </main>
  );
}