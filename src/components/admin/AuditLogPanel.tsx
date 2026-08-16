"use client";

import { useEffect, useState } from "react";
import type { AuditEntry } from "@/lib/api-types";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { TableContainer, Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ClipboardListIcon } from "@/components/ui/icons";

const ACTION_TONE: Record<string, "green" | "red" | "amber" | "indigo" | "slate"> = {
  login_success: "green",
  login_failed: "red",
  login_rejected_inactive: "red",
  logout: "slate",
  mess_entry_approved: "green",
  mess_entry_rejected: "red",
  password_changed: "indigo",
  residents_bulk_imported: "indigo",
};

function toneFor(action: string) {
  return ACTION_TONE[action] ?? (action.includes("reject") || action.includes("fail") ? "red" : "slate");
}

export function RecentActivity({ limit = 8 }: { limit?: number }) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    fetch(`/api/audit-log?limit=${limit}`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []));
  }, [limit]);

  if (entries === null) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return <EmptyState icon={<ClipboardListIcon className="h-6 w-6" />} title="No recent activity" />;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-3 py-2.5">
          <Badge tone={toneFor(e.action)} className="shrink-0 font-mono normal-case" dot>
            {e.action.replace(/_/g, " ")}
          </Badge>
          <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
            {e.actor_name ? (
              <>
                <span className="font-medium text-slate-900">{e.actor_name}</span>{" "}
                <span className="text-xs capitalize text-slate-400">({e.actor_role})</span>
              </>
            ) : (
              <span className="text-slate-400">system</span>
            )}
          </span>
          <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">
            {new Date(e.created_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function AuditLogPanel() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/audit-log?limit=100")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []));
  }, []);

  if (entries === null) return <TableSkeleton rows={8} cols={5} />;

  if (entries.length === 0) {
    return <EmptyState icon={<ClipboardListIcon className="h-6 w-6" />} title="No audit events yet" />;
  }

  return (
    <TableContainer>
      <Table>
        <THead>
          <Th>Time</Th>
          <Th>Actor</Th>
          <Th>Action</Th>
          <Th>Target</Th>
          <Th>Details</Th>
        </THead>
        <TBody>
          {entries.map((e) => (
            <Tr key={e.id}>
              <Td className="whitespace-nowrap text-slate-500">{new Date(e.created_at).toLocaleString()}</Td>
              <Td>
                {e.actor_name ? (
                  <span className="text-slate-900">
                    {e.actor_name} <span className="text-xs capitalize text-slate-400">({e.actor_role})</span>
                  </span>
                ) : (
                  <span className="text-slate-400">system</span>
                )}
              </Td>
              <Td>
                <Badge tone={toneFor(e.action)} className="font-mono normal-case">
                  {e.action}
                </Badge>
              </Td>
              <Td className="text-slate-500">{e.target_type ? `${e.target_type}#${e.target_id}` : "—"}</Td>
              <Td className="max-w-xs truncate text-slate-400" title={e.details ? JSON.stringify(e.details) : ""}>
                {e.details ? JSON.stringify(e.details) : ""}
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </TableContainer>
  );
}
