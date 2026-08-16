"use client";

import { useRouter } from "next/navigation";
import { KeyRoundIcon, LogOutIcon } from "./icons";

export default function TopBar({
  title,
  userName,
  roleLabel,
  onMenuClick,
  leftSlot,
}: {
  title: string;
  userName: string;
  roleLabel?: string;
  onMenuClick?: () => void;
  leftSlot?: React.ReactNode;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Toggle navigation"
            >
              {leftSlot}
            </button>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
            {roleLabel && <p className="text-xs text-slate-400">{roleLabel}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/change-password"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 sm:inline-flex"
          >
            <KeyRoundIcon className="h-4 w-4" />
            Change password
          </a>
          <div className="hidden h-6 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
              {initials || "?"}
            </div>
            <span className="hidden max-w-[10rem] truncate text-sm font-medium text-slate-700 md:inline">
              {userName}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOutIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
