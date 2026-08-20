"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Hostel, Invite } from "@/lib/api-types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Badge, { statusTone } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { TableContainer, Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { AlertTriangleIcon, CheckCircleIcon, MailPlusIcon, PlusIcon } from "@/components/ui/icons";

export default function InvitesPanel({
  hostels,
  fixedHostelId,
  allowWardenInvites,
}: {
  hostels: Hostel[];
  fixedHostelId?: number;
  allowWardenInvites: boolean;
}) {
  const toast = useToast();
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"warden" | "resident">(allowWardenInvites ? "warden" : "resident");
  const [roomNumber, setRoomNumber] = useState("");
  const [hostelId, setHostelId] = useState<string>(fixedHostelId ? String(fixedHostelId) : "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    const res = await fetch("/api/invites");
    const data = await res.json();
    if (res.ok) setInvites(data.invites);
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
    setLink(null);
    setCopied(false);
    setLoading(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          hostelId: Number(fixedHostelId ?? hostelId),
          roomNumber: role === "resident" ? roomNumber : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setLink(`${window.location.origin}/invite/${data.token}`);
      if (data.emailSent) {
        toast.success(`Invite emailed to ${email}`);
      } else {
        toast.error(`Invite created, but the email could not be sent: ${data.emailError ?? "unknown error"}`);
      }
      setEmail("");
      setRoomNumber("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Invite link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link — copy it manually");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          icon={<MailPlusIcon className="h-4 w-4" />}
          title="Send an invite"
          description="Generates a self-registration link valid for 7 days."
        />
        <CardBody>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
            {allowWardenInvites && (
              <Field label="Role" htmlFor="invite-role" className="min-w-[8rem]">
                <Select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "warden" | "resident")}
                >
                  <option value="warden">Warden</option>
                  <option value="resident">Resident</option>
                </Select>
              </Field>
            )}
            {!fixedHostelId && (
              <Field label="Hostel" htmlFor="invite-hostel" className="min-w-[10rem]">
                <Select id="invite-hostel" value={hostelId} onChange={(e) => setHostelId(e.target.value)}>
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Email" htmlFor="invite-email" className="min-w-[14rem] flex-1">
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            {role === "resident" && (
              <Field label="Room number" htmlFor="invite-room" className="min-w-[8rem]">
                <Input
                  id="invite-room"
                  required
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </Field>
            )}
            <Button type="submit" loading={loading}>
              <PlusIcon className="h-4 w-4" />
              Create invite
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

      {link && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <CheckCircleIcon className="h-5 w-5 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Invite created — share this link (valid 7 days)</p>
            <p className="mt-1 break-all rounded-lg bg-white/70 px-3 py-2 font-mono text-xs">{link}</p>
          </div>
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      )}

      {invites === null ? (
        <TableSkeleton rows={3} cols={4} />
      ) : invites.length === 0 ? (
        <EmptyState
          icon={<MailPlusIcon className="h-6 w-6" />}
          title="No invites yet"
          description="Invites you create will show up here along with their status."
        />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Expires</Th>
              <Th>Status</Th>
            </THead>
            <TBody>
              {invites.map((inv) => (
                <Tr key={inv.id}>
                  <Td className="font-medium text-slate-900">{inv.email}</Td>
                  <Td className="capitalize text-slate-500">{inv.role}</Td>
                  <Td className="text-slate-500">{new Date(inv.expires_at).toLocaleDateString()}</Td>
                  <Td>
                    {(() => {
                      const label = inv.used_at ? "Used" : new Date(inv.expires_at) < new Date() ? "Expired" : "Pending";
                      return <Badge tone={statusTone(label)}>{label}</Badge>;
                    })()}
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
