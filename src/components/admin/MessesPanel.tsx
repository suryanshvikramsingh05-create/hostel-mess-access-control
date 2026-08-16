"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Hostel, Mess } from "@/lib/api-types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Badge, { statusTone } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { TableContainer, Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { AlertTriangleIcon, PlusIcon, UtensilsIcon } from "@/components/ui/icons";

export default function MessesPanel({ hostels }: { hostels: Hostel[] }) {
  const toast = useToast();
  const [messes, setMesses] = useState<Mess[] | null>(null);
  const [name, setName] = useState("");
  const [hostelId, setHostelId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/messes");
    const data = await res.json();
    if (res.ok) setMesses(data.messes);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!hostelId && hostels.length > 0) setHostelId(String(hostels[0].id));
  }, [hostels, hostelId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/messes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, hostelId: Number(hostelId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      toast.success(`Mess "${data.mess.name}" created`);
      setName("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(mess: Mess) {
    setTogglingId(mess.id);
    try {
      await fetch(`/api/messes/${mess.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !mess.is_active }),
      });
      toast.success(`${mess.name} ${mess.is_active ? "deactivated" : "activated"}`);
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
          icon={<UtensilsIcon className="h-4 w-4" />}
          title="Add a mess"
          description="Create a mess hall under one of your hostels."
        />
        <CardBody>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
            <Field label="Hostel" htmlFor="mess-hostel" className="min-w-[10rem]">
              <Select id="mess-hostel" value={hostelId} onChange={(e) => setHostelId(e.target.value)}>
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mess name" htmlFor="mess-name" className="min-w-[12rem] flex-1">
              <Input id="mess-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Button type="submit" loading={loading} disabled={!hostelId}>
              <PlusIcon className="h-4 w-4" />
              Add mess
            </Button>
          </form>
          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-red-600">
              <AlertTriangleIcon className="h-4 w-4" />
              {error}
            </p>
          )}
          {hostels.length === 0 && (
            <p className="mt-3 text-sm text-amber-600">Create a hostel first before adding a mess.</p>
          )}
        </CardBody>
      </Card>

      {messes === null ? (
        <TableSkeleton rows={3} cols={4} />
      ) : messes.length === 0 ? (
        <EmptyState
          icon={<UtensilsIcon className="h-6 w-6" />}
          title="No messes yet"
          description="Add your first mess using the form above."
        />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <Th>Name</Th>
              <Th>Hostel</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </THead>
            <TBody>
              {messes.map((m) => (
                <Tr key={m.id}>
                  <Td className="font-medium text-slate-900">{m.name}</Td>
                  <Td className="text-slate-500">{hostelName(m.hostel_id)}</Td>
                  <Td>
                    <Badge tone={statusTone(m.is_active ? "active" : "inactive")}>
                      {m.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={togglingId === m.id}
                      onClick={() => toggleActive(m)}
                    >
                      {m.is_active ? "Deactivate" : "Activate"}
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
