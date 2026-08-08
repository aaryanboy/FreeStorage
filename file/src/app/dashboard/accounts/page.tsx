import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AccountCard from "./AccountCard";

function formatBytes(bytes: bigint | number | null) {
  const value = Number(bytes ?? 0);
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(value) / Math.log(1024));
  return `${(value / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default async function AccountsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      googleAccounts: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) redirect("/login");

  const googleAccounts = user.googleAccounts;

  const totalCapacity = googleAccounts.reduce(
    (sum, acc) => sum + Number(acc.totalStorage ?? 15 * 1024 * 1024 * 1024),
    0
  );

  const totalUsed = googleAccounts.reduce(
    (sum, acc) => sum + Number(acc.usedStorage ?? 0),
    0
  );

  const totalPercent = totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="border-b border-gray-100 px-6 py-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            FreeStorage
          </h1>
          <p className="mt-0.5 truncate text-xs text-gray-400">{user.email}</p>
        </div>

        <div className="px-4 pt-5">
          <a
            href="/api/auth/google"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            <span>+</span> Add Account
          </a>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          <a
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <span>🗂️</span> All Files
          </a>
          <a
            href="/dashboard/accounts"
            className="flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2.5 text-sm font-medium text-gray-900 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <span>🔐</span> Google Accounts
            </span>
            <span className="rounded-full bg-black px-2 py-0.5 text-xs text-white">
              {googleAccounts.length}
            </span>
          </a>
        </nav>

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

      {/* Main Content */}
      <section className="min-h-screen md:ml-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/90 px-6 py-4 backdrop-blur">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Connected Google Accounts
            </h2>
            <p className="text-xs text-gray-400">
              Stack multiple Gmail accounts to get unlimited cloud storage
            </p>
          </div>

          <a
            href="/api/auth/google"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            + Add Google Account
          </a>
        </header>

        <div className="p-6">
          {/* Total Stacked Capacity Summary */}
          <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-gray-900">
                  Total Stacked Storage
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Across {googleAccounts.length} connected Google account{googleAccounts.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xl font-bold text-gray-900">
                  {formatBytes(totalCapacity)}
                </span>
                <p className="text-xs text-gray-500">
                  {formatBytes(totalUsed)} used ({totalPercent.toFixed(1)}%)
                </p>
              </div>
            </div>

            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-black transition-all duration-500"
                style={{ width: `${totalPercent}%` }}
              />
            </div>
          </div>

          {/* Account List */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Your Google Accounts ({googleAccounts.length})
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {googleAccounts.map((acc) => (
                <AccountCard
                  key={acc.id}
                  account={{
                    id: acc.id,
                    email: acc.email,
                    name: acc.name,
                    picture: acc.picture,
                    usedStorage: acc.usedStorage ? acc.usedStorage.toString() : null,
                    totalStorage: acc.totalStorage ? acc.totalStorage.toString() : null,
                  }}
                  isOnlyAccount={googleAccounts.length <= 1}
                />
              ))}

              {/* Add Account Card */}
              <a
                href="/api/auth/google"
                className="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center hover:border-gray-400 hover:bg-gray-50 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-600 group-hover:bg-black group-hover:text-white transition-colors">
                  +
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">
                    Connect another Gmail Account
                  </p>
                  <p className="text-xs text-gray-400">
                    Add 15 GB more storage to your FreeStorage quota
                  </p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
