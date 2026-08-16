"use client";

import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import OverviewPanel from "@/components/OverviewPanel";
import HostelsPanel from "@/components/admin/HostelsPanel";
import MessesPanel from "@/components/admin/MessesPanel";
import ResidentsPanel from "@/components/ResidentsPanel";
import InvitesPanel from "@/components/InvitesPanel";
import ReportsPanel from "@/components/ReportsPanel";
import EntryHistoryPanel from "@/components/EntryHistoryPanel";
import AuditLogPanel from "@/components/admin/AuditLogPanel";
import {
  BarChartIcon,
  BuildingIcon,
  ClipboardListIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  MailPlusIcon,
  UsersIcon,
  UtensilsIcon,
} from "@/components/ui/icons";
import type { Hostel } from "@/lib/api-types";

export default function AdminDashboardClient({ userName }: { userName: string }) {
  const [hostels, setHostels] = useState<Hostel[]>([]);

  return (
    <DashboardShell
      roleLabel="Administrator"
      userName={userName}
      sections={[
        {
          key: "overview",
          label: "Overview",
          icon: <LayoutDashboardIcon className="h-[18px] w-[18px]" />,
          content: <OverviewPanel scope="admin" />,
        },
        {
          key: "hostels",
          label: "Hostels",
          icon: <BuildingIcon className="h-[18px] w-[18px]" />,
          content: <HostelsPanel onChange={setHostels} />,
        },
        {
          key: "messes",
          label: "Messes",
          icon: <UtensilsIcon className="h-[18px] w-[18px]" />,
          content: <MessesPanel hostels={hostels} />,
        },
        {
          key: "residents",
          label: "Residents",
          icon: <UsersIcon className="h-[18px] w-[18px]" />,
          content: <ResidentsPanel hostels={hostels} />,
        },
        {
          key: "invites",
          label: "Invites",
          icon: <MailPlusIcon className="h-[18px] w-[18px]" />,
          content: <InvitesPanel hostels={hostels} allowWardenInvites />,
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
        {
          key: "audit",
          label: "Audit log",
          icon: <ClipboardListIcon className="h-[18px] w-[18px]" />,
          content: <AuditLogPanel />,
        },
      ]}
    />
  );
}
