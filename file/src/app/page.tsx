import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBytes, getFileIcon } from "@/lib/utils";

export default async function HomePage() {
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

  const totalFiles = user.files.length;
  const appFilesUsed = user.files.reduce((total, file) => total + Number(file.size), 0);

  const googleAccount = user.googleAccounts[0];

  const googleTotalUsed = googleAccount?.usedStorage
    ? Number(googleAccount.usedStorage)
    : appFilesUsed;

  const googleTotalCapacity = googleAccount?.totalStorage
    ? Number(googleAccount.totalStorage)
    : 15 * 1024 * 1024 * 1024;

  const preExistingUsed = Math.max(0, googleTotalUsed - appFilesUsed);

  const appPercent = googleTotalCapacity > 0 ? (appFilesUsed / googleTotalCapacity) * 100 : 0;
  const preExistingPercent = googleTotalCapacity > 0 ? (preExistingUsed / googleTotalCapacity) * 100 : 0;
  const totalUsedPercent = Math.min(appPercent + preExistingPercent, 100);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">FreeStorage</h1>
            <p className="mt-1 text-sm text-gray-600">
              Welcome back, {user.name || "User"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Go to Dashboard
            </a>

            <a
              href="/test-upload"
              className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Upload
            </a>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* User */}
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Your Account</h2>
          <p className="mt-2 text-sm text-gray-600">{user.email}</p>

          {googleAccount && (
            <p className="mt-1 text-sm text-green-600">
              ✓ Google Drive connected ({googleAccount.email})
            </p>
          )}
        </section>

        {/* Storage */}
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Google Drive Storage Breakdown
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Including pre-existing files on your Google account
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-sm font-medium text-gray-900">
                {formatBytes(googleTotalUsed)} used
              </p>
              <p className="text-sm text-gray-500">
                {formatBytes(googleTotalCapacity)} total ({totalUsedPercent.toFixed(1)}%)
              </p>
            </div>
          </div>

          {/* Stacked Progress Bar */}
          <div className="mt-5 flex h-3.5 w-full overflow-hidden rounded-full bg-gray-100 p-0.5 ring-1 ring-gray-200/50">
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
                <p className="font-medium text-gray-700">Free Space</p>
                <p className="text-gray-500">
                  {formatBytes(Math.max(0, googleTotalCapacity - googleTotalUsed))}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Files */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">My Files</h2>
              <p className="mt-1 text-sm text-gray-500">
                {totalFiles === 0
                  ? "No files uploaded yet"
                  : `${totalFiles} file${totalFiles === 1 ? "" : "s"}`}
              </p>
            </div>

            <a
              href="/test-upload"
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Upload File
            </a>
          </div>

          {user.files.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="text-5xl">📁</div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                No files yet
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Upload your first photo, video, or document.
              </p>
              <a
                href="/test-upload"
                className="mt-5 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Upload File
              </a>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {user.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between px-6 py-5 hover:bg-gray-50"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {file.mimeType.startsWith("image/") ? (
                        <img
                          src={`/api/files/${file.id}/preview`}
                          alt={file.originalName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl">
                          {getFileIcon(file.mimeType)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">
                        {file.originalName}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {file.mimeType} · {formatBytes(file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="ml-4 shrink-0">
                    <span className="text-sm font-medium text-green-600">
                      ✓ Stored
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}