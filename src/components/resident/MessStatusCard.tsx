"use client";

import { useEffect, useState } from "react";
import type { MessEntry } from "@/lib/api-types";
import { Skeleton } from "@/components/ui/Skeleton";
import { BuildingIcon, IdCardIcon } from "@/components/ui/icons";

const DAILY_LIMIT = 4;

/**
 * Residents no longer carry a personal QR code — the QR belongs to the
 * mess (one shared code, printed at the counter). At the counter, tell
 * the staff your name/resident ID and enter your PIN; this card just
 * shows your identity details and today's usage.
 */
export default function MessStatusCard({
  residentName,
  roomNumber,
  hostelName,
  residentCode,
}: {
  residentName: string;
  roomNumber: string;
  hostelName: string;
  residentCode: string;
}) {
  const [usedToday, setUsedToday] = useState<number | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch("/api/mess-entries/history?limit=50")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) return;
        const entries: MessEntry[] = data.entries ?? [];
        const count = entries.filter((e) => e.entry_date === today && e.status === "approved").length;
        setUsedToday(count);
      })
      .catch(() => setUsedToday(0));
  }, []);

  const remaining = usedToday === null ? null : Math.max(0, DAILY_LIMIT - usedToday);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative bg-indigo-600 px-6 py-5 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.15),transparent_60%)]"
        />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200">Mess entry</p>
        <h2 className="mt-0.5 truncate text-xl font-semibold tracking-tight">{residentName}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-indigo-100">
          <span className="flex items-center gap-1.5">
            <BuildingIcon className="h-3.5 w-3.5" />
            {hostelName} · Room {roomNumber}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-xs">
            <IdCardIcon className="h-3.5 w-3.5" />
            {residentCode}
          </span>
        </div>
      </div>

      <div className="px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Today&apos;s entries</p>
        {usedToday === null ? (
          <Skeleton className="mt-2 h-6 w-32" />
        ) : (
          <>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {usedToday} of {DAILY_LIMIT} used
              {remaining === 0 && <span className="ml-1.5 text-amber-600">· limit reached</span>}
            </p>
            <div className="mt-2 flex max-w-xs gap-1.5">
              {Array.from({ length: DAILY_LIMIT }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2.5 flex-1 rounded-full ${i < usedToday ? "bg-indigo-600" : "bg-slate-100"}`}
                  aria-hidden
                />
              ))}
            </div>
            <p className="mt-3 max-w-sm text-xs text-slate-400">
              At the mess counter, tell the staff your name or resident ID ({residentCode}) and enter your PIN
              to check in — no QR code needed on your end.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
