"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardBody, StatCard } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { BarList } from "@/components/ui/charts";
import EntryHistoryPanel from "@/components/EntryHistoryPanel";
import { RecentActivity } from "@/components/admin/AuditLogPanel";
import {
  BuildingIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  HistoryIcon,
  UsersIcon,
  UtensilsIcon,
  XCircleIcon,
} from "@/components/ui/icons";

interface Stats {
  hostels: number | null;
  messes: number;
  residents: number;
  approvedToday: number;
  rejectedToday: number;
}

export default function OverviewPanel({ scope }: { scope: "admin" | "warden" }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [hostelsRes, messesRes, residentsRes, reportsRes] = await Promise.all([
        scope === "admin" ? fetch("/api/hostels") : Promise.resolve(null),
        fetch("/api/messes"),
        fetch("/api/residents"),
        fetch(`/api/reports?from=${today}&to=${today}`),
      ]);

      const hostels = hostelsRes ? await hostelsRes.json() : null;
      const messes = await messesRes.json();
      const residents = await residentsRes.json();
      const reports = await reportsRes.json();

      setStats({
        hostels: hostels ? hostels.hostels.length : null,
        messes: messes.messes?.length ?? 0,
        residents: residents.residents?.length ?? 0,
        approvedToday: reports.totals?.approved ?? 0,
        rejectedToday: reports.totals?.rejected ?? 0,
      });
    })();
  }, [scope]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          {scope === "admin" ? "Overview" : "Today at a glance"}
        </h2>
        <p className="text-sm text-slate-500">
          {scope === "admin"
            ? "A snapshot of hostels, messes, residents and today's mess entries."
            : "A snapshot of your hostel's residents and today's mess entries."}
        </p>
      </div>

      {!stats ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: scope === "admin" ? 4 : 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {scope === "admin" && (
            <StatCard label="Hostels" value={stats.hostels ?? 0} icon={<BuildingIcon className="h-4 w-4" />} tone="indigo" />
          )}
          <StatCard label="Messes" value={stats.messes} icon={<UtensilsIcon className="h-4 w-4" />} tone="indigo" />
          <StatCard label="Residents" value={stats.residents} icon={<UsersIcon className="h-4 w-4" />} tone="slate" />
          <StatCard
            label="Approved today"
            value={stats.approvedToday}
            icon={<CheckCircleIcon className="h-4 w-4" />}
            tone="green"
          />
          <StatCard
            label="Rejected today"
            value={stats.rejectedToday}
            icon={<XCircleIcon className="h-4 w-4" />}
            tone="red"
          />
        </div>
      )}

      {stats && (stats.approvedToday > 0 || stats.rejectedToday > 0) && (
        <Card>
          <CardHeader title="Today's entries at a glance" description="Approved vs. rejected mess entries so far today." />
          <CardBody>
            <BarList
              data={[
                { label: "Approved", value: stats.approvedToday },
                { label: "Rejected", value: stats.rejectedToday },
              ]}
            />
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <HistoryIcon className="h-4 w-4 text-slate-400" />
            Recent mess entries
          </h3>
          <EntryHistoryPanel limit={8} hideFilter />
        </div>
        {scope === "admin" && (
          <div className="lg:col-span-2">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <ClipboardListIcon className="h-4 w-4 text-slate-400" />
              Recent activity
            </h3>
            <Card>
              <CardBody>
                <RecentActivity limit={8} />
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
