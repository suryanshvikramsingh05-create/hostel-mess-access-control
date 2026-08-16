"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Hostel } from "@/lib/api-types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Badge, { statusTone } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { TableContainer, Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { AlertTriangleIcon, BuildingIcon, PlusIcon } from "@/components/ui/icons";

export default function HostelsPanel({ onChange }: { onChange?: (hostels: Hostel[]) => void }) {
  const toast = useToast();
  const [hostels, setHostels] = useState<Hostel[] | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/hostels");
    const data = await res.json();
    if (res.ok) {
      setHostels(data.hostels);
      onChange?.(data.hostels);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/hostels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address: address || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      toast.success(`Hostel "${data.hostel.name}" created`);
      setName("");
      setAddress("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(hostel: Hostel) {
    setTogglingId(hostel.id);
    try {
      await fetch(`/api/hostels/${hostel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !hostel.is_active }),
      });
      toast.success(`${hostel.name} ${hostel.is_active ? "deactivated" : "activated"}`);
      await load();
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          icon={<BuildingIcon className="h-4 w-4" />}
          title="Add a hostel"
          description="Create a new hostel that messes and residents can belong to."
        />
        <CardBody>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
            <Field label="Hostel name" htmlFor="hostel-name" className="min-w-[12rem] flex-1">
              <Input id="hostel-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Address (optional)" htmlFor="hostel-address" className="min-w-[14rem] flex-1">
              <Input id="hostel-address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <Button type="submit" loading={loading}>
              <PlusIcon className="h-4 w-4" />
              Add hostel
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

      {hostels === null ? (
        <TableSkeleton rows={3} cols={4} />
      ) : hostels.length === 0 ? (
        <EmptyState
          icon={<BuildingIcon className="h-6 w-6" />}
          title="No hostels yet"
          description="Add your first hostel using the form above to get started."
        />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <Th>Name</Th>
              <Th>Address</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </THead>
            <TBody>
              {hostels.map((h) => (
                <Tr key={h.id}>
                  <Td className="font-medium text-slate-900">{h.name}</Td>
                  <Td className="text-slate-500">{h.address ?? "—"}</Td>
                  <Td>
                    <Badge tone={statusTone(h.is_active ? "active" : "inactive")}>
                      {h.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={togglingId === h.id}
                      onClick={() => toggleActive(h)}
                    >
                      {h.is_active ? "Deactivate" : "Activate"}
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
