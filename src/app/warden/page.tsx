"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import OverviewPanel from "@/components/OverviewPanel";
import ResidentsPanel from "@/components/ResidentsPanel";
import InvitesPanel from "@/components/InvitesPanel";
import ReportsPanel from "@/components/ReportsPanel";
import EntryHistoryPanel from "@/components/EntryHistoryPanel";
import ScanEntryPanel from "@/components/ScanEntryPanel";
import EmptyState from "@/components/ui/EmptyState";
import { LoaderIcon, AlertTriangleIcon, BarChartIcon, HistoryIcon, LayoutDashboardIcon, MailPlusIcon, ScanLineIcon, UsersIcon } from "@/components/ui/icons";
import type { Mess } from "@/lib/api-types";

export default function WardenPage() {
  const [hostelId, setHostelId] = useState<number | null>(null);
  const [userName, setUserName] = useState("");
  const [messes, setMesses] = useState<Mess[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      setHostelId(me.user?.hostelId ?? null);
      setUserName(me.user?.name ?? "");

      const messesRes = await fetch("/api/messes");
      const messesData = await messesRes.json();
      setMesses(messesData.messes ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoaderIcon className="h-6 w-6 text-slate-400" />
      </div>
    );
  }

  if (!hostelId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          icon={<AlertTriangleIcon className="h-6 w-6" />}
          title="No hostel assigned"
          description="You are not yet assigned to a hostel. Contact an administrator to get set up."
        />
      </div>
    );
  }

  return (
    <DashboardShell
      roleLabel="Warden"
      userName={userName}
      sections={[
        {
          key: "overview",
          label: "Overview",
          icon: <LayoutDashboardIcon className="h-[18px] w-[18px]" />,
          content: <OverviewPanel scope="warden" />,
        },
        {
          key: "scan",
          label: "Mess entry",
          icon: <ScanLineIcon className="h-[18px] w-[18px]" />,
          content: <ScanEntryPanel messes={messes} />,
        },
        {
          key: "residents",
          label: "Residents",
          icon: <UsersIcon className="h-[18px] w-[18px]" />,
          content: <ResidentsPanel hostels={[]} fixedHostelId={hostelId} />,
        },
        {
          key: "invites",
          label: "Invite resident",
          icon: <MailPlusIcon className="h-[18px] w-[18px]" />,
          content: <InvitesPanel hostels={[]} fixedHostelId={hostelId} allowWardenInvites={false} />,
        },
        {
          key: "entries",
          label: "Entry history",
          icon: <HistoryIcon className="h-[18px] w-[18px]" />,
          content: <EntryHistoryPanel />,
        },
        {
          key: "reports",
          label: "Reports",
          icon: <BarChartIcon className="h-[18px] w-[18px]" />,
          content: <ReportsPanel />,
        },
      ]}
    />
  );
}
