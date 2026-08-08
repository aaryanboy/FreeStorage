import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AccountCard from "./AccountCard";
import { formatBytes } from "@/lib/utils";

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
    <>
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
    </>
  );
}
