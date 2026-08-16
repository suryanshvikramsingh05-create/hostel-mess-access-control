"use client";

import { useEffect, useState } from "react";
import type { MessEntry } from "@/lib/api-types";
import { Skeleton } from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { AlertTriangleIcon, BuildingIcon, IdCardIcon, QrCodeIcon } from "@/components/ui/icons";

const DAILY_LIMIT = 4;

export default function QrCard({
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
  const toast = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedToday, setUsedToday] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/residents/me/qr")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error);
          return;
        }
        setQrDataUrl(data.qrDataUrl);
      })
      .catch(() => setError("Could not load QR code"));

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

  function handleDownload() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "my-mess-qr.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR code downloaded");
  }

  const remaining = usedToday === null ? null : Math.max(0, DAILY_LIMIT - usedToday);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header band */}
      <div className="relative bg-indigo-600 px-6 py-5 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.15),transparent_60%)]"
        />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200">Mess pass</p>
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

      <div className="flex flex-col items-center gap-5 px-6 py-6 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
        <div className="flex flex-col items-center">
          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertTriangleIcon className="h-4 w-4" />
              {error}
            </p>
          )}
          {!qrDataUrl && !error && <Skeleton className="h-56 w-56 sm:h-64 sm:w-64" />}
          {qrDataUrl && (
            <div className="rounded-xl border border-slate-200 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Resident QR code" className="h-56 w-56 sm:h-64 sm:w-64" />
            </div>
          )}
          <Button variant="outline" className="mt-4 w-full max-w-xs" onClick={handleDownload} disabled={!qrDataUrl}>
            <QrCodeIcon className="h-4 w-4" />
            Download QR code
          </Button>
        </div>

        <div className="w-full max-w-xs shrink-0 sm:w-56">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Today&apos;s entries</p>
          {usedToday === null ? (
            <Skeleton className="mt-2 h-6 w-32" />
          ) : (
            <>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {usedToday} of {DAILY_LIMIT} used
                {remaining === 0 && <span className="ml-1.5 text-amber-600">· limit reached</span>}
              </p>
              <div className="mt-2 flex gap-1.5">
                {Array.from({ length: DAILY_LIMIT }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 flex-1 rounded-full ${i < usedToday ? "bg-indigo-600" : "bg-slate-100"}`}
                    aria-hidden
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Present this QR code and your PIN at the mess counter for each meal.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
