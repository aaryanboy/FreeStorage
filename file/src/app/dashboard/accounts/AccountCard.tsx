"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function formatBytes(bytes: string | number | null) {
  const value = Number(bytes ?? 0);
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(value) / Math.log(1024));
  return `${(value / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

type AccountCardProps = {
  account: {
    id: string;
    email: string;
    name: string | null;
    picture: string | null;
    usedStorage: string | null;
    totalStorage: string | null;
  };
  isOnlyAccount: boolean;
};

export default function AccountCard({ account, isOnlyAccount }: AccountCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const used = Number(account.usedStorage ?? 0);
  const total = Number(account.totalStorage ?? 15 * 1024 * 1024 * 1024);
  const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0;

  async function handleDisconnect() {
    if (isOnlyAccount) return;
    if (!confirm(`Are you sure you want to disconnect ${account.email}?`)) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to disconnect account");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error disconnecting account");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Profile info */}
        <div className="flex items-center gap-3.5">
          {account.picture ? (
            <img
              src={account.picture}
              alt={account.name || account.email}
              className="h-11 w-11 rounded-full object-cover ring-1 ring-gray-200"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
              {(account.name || account.email)[0].toUpperCase()}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">
                {account.name || account.email.split("@")[0]}
              </h4>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                Connected
              </span>
            </div>
            <p className="text-xs text-gray-500">{account.email}</p>
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDisconnect}
            disabled={isOnlyAccount || loading}
            title={isOnlyAccount ? "You cannot disconnect your primary account" : "Disconnect account"}
            className="rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-600 transition-colors"
          >
            {loading ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {/* Storage usage bar */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>Google Drive Usage</span>
          <span className="font-medium text-gray-700">
            {formatBytes(used)} / {formatBytes(total)} ({percent.toFixed(1)}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-black transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
