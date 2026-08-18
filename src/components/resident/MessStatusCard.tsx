"use client";

import { useEffect, useState } from "react";
import type { MessEntry } from "@/lib/api-types";
import { Skeleton } from "@/components/ui/Skeleton";
import { BuildingIcon, CheckCircleIcon, IdCardIcon, InfoIcon, XCircleIcon } from "@/components/ui/icons";
import { buildMealStatuses, type MealStatus, type MealType } from "@/lib/mealWindows";

const STATUS_STYLES: Record<MealStatus, { badge: string; label: string; icon: typeof CheckCircleIcon }> = {
  used: { badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Used", icon: CheckCircleIcon },
  available: { badge: "bg-green-50 text-green-700 border-green-200", label: "Available", icon: CheckCircleIcon },
  expired: { badge: "bg-slate-50 text-slate-400 border-slate-200", label: "Expired", icon: XCircleIcon },
  upcoming: { badge: "bg-amber-50 text-amber-600 border-amber-200", label: "Upcoming", icon: InfoIcon },
};

/**
 * Residents have no personal QR code — the QR belongs to the mess (one
 * shared code, permanently displayed at the entrance). This card shows
 * identity details and today's usage; the actual check-in happens at
 * /scan after scanning that QR with the resident's own phone.
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
  const [usedMealTypes, setUsedMealTypes] = useState<MealType[] | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch("/api/mess-entries/history?limit=50")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) return;
        const entries: MessEntry[] = data.entries ?? [];
        const used = entries
          .filter((e) => e.entry_date === today && e.status === "approved")
          .map((e) => e.meal_type as MealType);
        setUsedMealTypes(used);
      })
      .catch(() => setUsedMealTypes([]));
  }, []);

  // Meal windows open/close over the course of the day, so a status computed
  // once at mount would go stale if this card is left open — recompute it
  // periodically against the actual current time.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const mealStatuses = usedMealTypes === null ? null : buildMealStatuses(usedMealTypes, new Date(now));
  const usedCount = usedMealTypes?.length ?? 0;

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
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Today&apos;s meals ({usedCount} of {mealStatuses?.length ?? 4} used)
        </p>
        {mealStatuses === null ? (
          <Skeleton className="mt-2 h-24 w-full" />
        ) : (
          <>
            <div className="mt-2 divide-y divide-slate-100">
              {mealStatuses.map((m) => {
                const style = STATUS_STYLES[m.status];
                const Icon = style.icon;
                return (
                  <div key={m.mealType} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{m.label}</p>
                      <p className="text-xs text-slate-400">{m.window} (IST)</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${style.badge}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {style.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 max-w-sm text-xs text-slate-400">
              Scan the QR code displayed at your mess entrance, enter your mess PIN, and show the
              verification screen to the staff.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
