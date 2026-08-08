"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { formatBytes } from "@/lib/utils";

type SidebarProps = {
  user: {
    email: string;
    name: string | null;
  };
  googleAccountsCount: number;
  appFilesUsed: number;
  googleTotalUsed: number;
  googleTotalCapacity: number;
  appPercent: number;
  preExistingPercent: number;
  totalUsedPercent: number;
  preExistingUsed: number;
  counts: {
    all: number;
    images: number;
    videos: number;
    documents: number;
    audio: number;
  };
};

export default function DashboardSidebar({
  user,
  googleAccountsCount,
  appFilesUsed,
  googleTotalUsed,
  googleTotalCapacity,
  appPercent,
  preExistingPercent,
  totalUsedPercent,
  preExistingUsed,
  counts,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeType = searchParams.get("type") || "all";

  const navItems = [
    { label: "All Files", key: "all", emoji: "🗂️", href: "/dashboard" },
    { label: "Images", key: "images", emoji: "🖼️", href: "/dashboard?type=images" },
    { label: "Videos", key: "videos", emoji: "🎬", href: "/dashboard?type=videos" },
    { label: "Documents", key: "documents", emoji: "📄", href: "/dashboard?type=documents" },
    { label: "Audio", key: "audio", emoji: "🎵", href: "/dashboard?type=audio" },
  ];

  const isAccountsActive = pathname === "/dashboard/accounts";

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-gray-200 bg-white md:flex z-20">
      {/* Logo */}
      <div className="border-b border-gray-100 px-6 py-5">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          FreeStorage
        </h1>
        <p className="mt-0.5 truncate text-xs text-gray-400">
          {googleAccountsCount} Connected Account{googleAccountsCount === 1 ? "" : "s"}
        </p>
      </div>

      {/* Nav */}
      <nav className="mt-4 flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive = pathname === "/dashboard" && activeType === item.key;
          const count = counts[item.key as keyof typeof counts];
          return (
            <a
              key={item.key}
              href={item.href}
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
          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mt-2 border-t border-gray-100 pt-3 ${
            isAccountsActive
              ? "bg-gray-100 text-gray-900"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <span>🔐</span> Google Accounts
          </span>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
            {googleAccountsCount}
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
  );
}
