"use client";

import { useEffect, useState } from "react";
import type { MessEntry } from "@/lib/api-types";
import { Select } from "@/components/ui/Field";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { TableContainer, Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { HistoryIcon } from "@/components/ui/icons";

export default function EntryHistoryPanel({
  residentView = false,
  limit = 100,
  hideFilter = false,
}: {
  residentView?: boolean;
  limit?: number;
  hideFilter?: boolean;
}) {
  const [entries, setEntries] = useState<MessEntry[] | null>(null);
  const [status, setStatus] = useState<string>("");

  async function load() {
    const params = new URLSearchParams({ limit: String(limit) });
    if (status) params.set("status", status);
    const res = await fetch(`/api/mess-entries/history?${params}`);
    const data = await res.json();
    if (res.ok) setEntries(data.entries);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const colCount = residentView ? 5 : 6;

  return (
    <div className="space-y-4">
      {!hideFilter && (
        <div className="flex items-center gap-3">
          <label htmlFor="entry-status" className="text-xs font-medium text-slate-600">
            Status
          </label>
          <Select
            id="entry-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-40"
          >
            <option value="">All</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
      )}

      {entries === null ? (
        <TableSkeleton rows={5} cols={colCount} />
      ) : entries.length === 0 ? (
        <EmptyState icon={<HistoryIcon className="h-6 w-6" />} title="No entries yet" />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <Th>Time</Th>
              {!residentView && <Th>Resident</Th>}
              <Th>Mess</Th>
              <Th>Meal</Th>
              <Th>Status</Th>
              <Th>Reason</Th>
            </THead>
            <TBody>
              {entries.map((e) => (
                <Tr key={e.id}>
                  <Td className="whitespace-nowrap text-slate-500">
                    {new Date(e.entry_time).toLocaleString()}
                  </Td>
                  {!residentView && (
                    <Td className="font-medium text-slate-900">
                      {e.resident_name}{" "}
                      <span className="font-normal text-slate-400">({e.room_number})</span>
                    </Td>
                  )}
                  <Td>{e.mess_name}</Td>
                  <Td className="capitalize">{e.meal_type}</Td>
                  <Td>
                    <Badge tone={e.status === "approved" ? "green" : "red"}>{e.status}</Badge>
                  </Td>
                  <Td className="text-slate-500">{e.rejection_reason ?? "—"}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
