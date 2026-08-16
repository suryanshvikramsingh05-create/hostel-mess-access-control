"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Hostel, Resident } from "@/lib/api-types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Badge, { statusTone } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { TableContainer, Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { AlertTriangleIcon, CheckCircleIcon, DownloadIcon, PlusIcon, UsersIcon } from "@/components/ui/icons";
import BulkImportResidentsModal from "@/components/admin/BulkImportResidentsModal";

const CSV_TEMPLATE = "hostel,name,email,room_number\n1,Rahul Sharma,rahul@example.com,B-204\n1,Priya Verma,priya@example.com,A-1\n";

function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "resident-import-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ResidentsPanel({
  hostels,
  fixedHostelId,
}: {
  hostels: Hostel[];
  fixedHostelId?: number;
}) {
  const toast = useToast();
  const [residents, setResidents] = useState<Resident[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [hostelId, setHostelId] = useState<string>(fixedHostelId ? String(fixedHostelId) : "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);

  async function load() {
    const res = await fetch("/api/residents");
    const data = await res.json();
    if (res.ok) setResidents(data.residents);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!fixedHostelId && !hostelId && hostels.length > 0) setHostelId(String(hostels[0].id));
  }, [hostels, hostelId, fixedHostelId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCredentials(null);
    setLoading(true);
    try {
      const res = await fetch("/api/residents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          roomNumber,
          hostelId: Number(fixedHostelId ?? hostelId),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setCredentials({ email, tempPassword: data.tempPassword });
      toast.success(`Resident "${data.resident.name}" created`);
      setName("");
      setEmail("");
      setRoomNumber("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(resident: Resident) {
    setTogglingId(resident.id);
    try {
      await fetch(`/api/residents/${resident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !resident.is_active }),
      });
      toast.success(`${resident.name} ${resident.is_active ? "deactivated" : "activated"}`);
      await load();
    } finally {
      setTogglingId(null);
    }
  }

  function hostelName(id: number) {
    return hostels.find((h) => h.id === id)?.name ?? `#${id}`;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          icon={<UsersIcon className="h-4 w-4" />}
          title="Add a resident"
          description="Creates a login with a one-time temporary password."
          action={
            !fixedHostelId ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={downloadCsvTemplate}>
                  <DownloadIcon className="h-4 w-4" />
                  Download CSV template
                </Button>
                <BulkImportResidentsModal onImported={load} />
              </div>
            ) : undefined
          }
        />
        <CardBody>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
            {!fixedHostelId && (
              <Field label="Hostel" htmlFor="resident-hostel" className="min-w-[10rem]">
                <Select id="resident-hostel" value={hostelId} onChange={(e) => setHostelId(e.target.value)}>
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Full name" htmlFor="resident-name" className="min-w-[10rem] flex-1">
              <Input id="resident-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="resident-email" className="min-w-[12rem] flex-1">
              <Input
                id="resident-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Room number" htmlFor="resident-room" className="min-w-[8rem]">
              <Input
                id="resident-room"
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
              />
            </Field>
            <Button type="submit" loading={loading}>
              <PlusIcon className="h-4 w-4" />
              Add resident
            </Button>
          </form>
          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-red-600">
              <AlertTriangleIcon className="h-4 w-4" />
              {error}
            </p>
          )}
        </CardBody>
      </Card>

      {credentials && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium">Resident created — share these credentials securely</p>
            <p className="mt-1 text-xs text-amber-700">They will not be shown again.</p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-white/70 px-3 py-2 font-mono text-xs">
              <span>
                <span className="text-amber-600">Email:</span> {credentials.email}
              </span>
              <span>
                <span className="text-amber-600">Temp password:</span> {credentials.tempPassword}
              </span>
            </div>
          </div>
        </div>
      )}

      {residents === null ? (
        <TableSkeleton rows={4} cols={fixedHostelId ? 5 : 6} />
      ) : residents.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="h-6 w-6" />}
          title="No residents yet"
          description="Add your first resident using the form above, or send an invite link."
        />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <Th>Name</Th>
              <Th>Resident ID</Th>
              <Th>Room</Th>
              {!fixedHostelId && <Th>Hostel</Th>}
              <Th>Email</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </THead>
            <TBody>
              {residents.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-medium text-slate-900">{r.name}</Td>
                  <Td className="font-mono text-xs text-slate-500">{r.resident_code}</Td>
                  <Td>{r.room_number}</Td>
                  {!fixedHostelId && <Td className="text-slate-500">{hostelName(r.hostel_id)}</Td>}
                  <Td className="text-slate-500">{r.email}</Td>
                  <Td>
                    <Badge tone={statusTone(r.is_active ? "active" : "inactive")}>
                      {r.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={togglingId === r.id}
                      onClick={() => toggleActive(r)}
                    >
                      {r.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
