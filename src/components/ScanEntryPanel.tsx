"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Resident } from "@/lib/api-types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  IdCardIcon,
  KeyRoundIcon,
  QrCodeIcon,
  SearchIcon,
  UsersIcon,
  UtensilsIcon,
  XCircleIcon,
} from "@/components/ui/icons";

interface ScannedMess {
  id: number;
  name: string;
  hostelId: number;
  hostelName: string;
}

const MEAL_TYPES = ["breakfast", "lunch", "snacks", "dinner"] as const;

const REASON_LABELS: Record<string, string> = {
  daily_limit_reached: "Daily limit of 4 entries reached",
  duplicate_meal: "Already checked in for this meal today",
  invalid_pin: "Incorrect PIN",
  inactive_resident: "Resident account is deactivated",
  unauthorized_hostel: "Resident belongs to a different hostel",
  invalid_mess: "Invalid mess selected",
  pin_not_set: "Resident has not set up a PIN yet",
  resident_not_found: "Resident not found",
};

/**
 * Mess entry flow, in three steps:
 *  1. Scan the mess's QR code (one QR per mess, shared by every resident
 *     assigned to it) to identify which mess this counter is for.
 *  2. Manually identify the resident (search by name / resident ID / room)
 *     — residents no longer carry a personal QR code.
 *  3. Verify the resident's PIN and record the entry for the scanned mess.
 */
export default function ScanEntryPanel({ initialMessQrToken }: { initialMessQrToken?: string }) {
  const [mess, setMess] = useState<ScannedMess | null>(null);
  const [messQrToken, setMessQrToken] = useState("");
  const [messError, setMessError] = useState<string | null>(null);
  const [messLoading, setMessLoading] = useState(false);
  const messInputRef = useRef<HTMLInputElement>(null);

  const [residents, setResidents] = useState<Resident[] | null>(null);
  const [search, setSearch] = useState("");
  const [resident, setResident] = useState<Resident | null>(null);

  const [pin, setPin] = useState("");
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>("breakfast");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ approved: boolean; reason?: string } | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    messInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!mess) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResidents(null);
    fetch(`/api/residents?hostelId=${mess.hostelId}`)
      .then((res) => res.json())
      .then((data) => setResidents(data.residents ?? []))
      .catch(() => setResidents([]));
  }, [mess]);

  async function scanMess(token: string) {
    setMessError(null);
    if (!token.trim()) return;
    setMessLoading(true);
    try {
      const res = await fetch("/api/mess-entries/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessError(data.error);
        return;
      }
      setMess(data.mess);
    } finally {
      setMessLoading(false);
    }
  }

  // Arrived here via a phone-camera scan of a mess QR (/scan?mess=<token>
  // -> this component receives the token as a prop): identify the mess
  // automatically instead of requiring the token to be typed/pasted again.
  // The token is never trusted client-side — scanMess() always re-validates
  // it against the database via /api/mess-entries/scan.
  useEffect(() => {
    if (!initialMessQrToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessQrToken(initialMessQrToken);
    void scanMess(initialMessQrToken);
  }, [initialMessQrToken]);

  async function handleScanMess(e: FormEvent) {
    e.preventDefault();
    await scanMess(messQrToken);
  }

  function scanDifferentMess() {
    setMess(null);
    setMessQrToken("");
    setMessError(null);
    setResidents(null);
    setSearch("");
    setResident(null);
    setResult(null);
    setError(null);
    setTimeout(() => messInputRef.current?.focus(), 50);
  }

  function chooseAnotherResident() {
    setResident(null);
    setPin("");
    setResult(null);
    setError(null);
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!mess || !resident) return;
    setError(null);
    setVerifyLoading(true);
    try {
      const res = await fetch("/api/mess-entries/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ residentId: resident.id, pin, mealType, messId: mess.id }),
      });
      const data = await res.json();
      if (!res.ok && !("approved" in data)) {
        setError(data.error ?? "Verification failed");
        return;
      }
      setResult(data);
      setPin("");
      if (data.approved) {
        setTimeout(() => chooseAnotherResident(), 1200);
      }
    } finally {
      setVerifyLoading(false);
    }
  }

  const filteredResidents = useMemo(() => {
    if (!residents) return [];
    const q = search.trim().toLowerCase();
    if (!q) return residents;
    return residents.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.resident_code.toLowerCase().includes(q) ||
        r.room_number.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
    );
  }, [residents, search]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {!mess && (
        <Card>
          <CardHeader
            icon={<QrCodeIcon className="h-4 w-4" />}
            title="Scan mess QR"
            description="Scan the mess's QR code (posted at the counter), or paste it, to begin."
          />
          <CardBody>
            <form onSubmit={handleScanMess} className="flex gap-2">
              <div className="relative flex-1">
                <QrCodeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  ref={messInputRef}
                  autoFocus
                  value={messQrToken}
                  onChange={(e) => setMessQrToken(e.target.value)}
                  className="pl-9 font-mono"
                  placeholder="Waiting for scan..."
                />
              </div>
              <Button type="submit" loading={messLoading}>
                Look up
              </Button>
            </form>
            {messError && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-red-600">
                <AlertTriangleIcon className="h-4 w-4" />
                {messError}
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {mess && !resident && (
        <Card className="animate-fade-in">
          <CardHeader
            icon={<UtensilsIcon className="h-4 w-4" />}
            title={mess.name}
            description={`${mess.hostelName} — find the resident to check in`}
            action={
              <Button variant="ghost" size="sm" onClick={scanDifferentMess}>
                Scan a different mess
              </Button>
            }
          />
          <CardBody className="space-y-4">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                placeholder="Search by name, resident ID, or room number..."
              />
            </div>

            {residents === null ? (
              <p className="py-6 text-center text-sm text-slate-400">Loading residents...</p>
            ) : filteredResidents.length === 0 ? (
              <EmptyState
                icon={<UsersIcon className="h-6 w-6" />}
                title="No matching residents"
                description="Try a different name, resident ID, or room number."
              />
            ) : (
              <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                {filteredResidents.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setResident(r)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{r.name}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <IdCardIcon className="h-3.5 w-3.5" />
                        {r.resident_code} · Room {r.room_number}
                      </p>
                    </div>
                    <Badge tone={r.is_active ? "green" : "slate"}>{r.is_active ? "Active" : "Inactive"}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {mess && resident && (
        <Card className="animate-fade-in">
          <CardBody>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                  {resident.name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{resident.name}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <IdCardIcon className="h-3.5 w-3.5" />
                    {resident.resident_code} · Room {resident.room_number} · {mess.name}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={chooseAnotherResident}>
                Choose another
              </Button>
            </div>

            {!resident.is_active && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <XCircleIcon className="h-4 w-4 shrink-0" />
                This resident account is deactivated.
              </div>
            )}
            {resident.is_active && !resident.has_pin && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                <AlertTriangleIcon className="h-4 w-4 shrink-0" />
                This resident has not set up a security PIN yet and cannot be checked in.
              </div>
            )}

            {resident.is_active && resident.has_pin && (
              <form onSubmit={handleVerify} className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                <Field label="Meal" htmlFor="entry-meal">
                  <Select
                    id="entry-meal"
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as typeof mealType)}
                    className="capitalize"
                  >
                    {MEAL_TYPES.map((m) => (
                      <option key={m} value={m} className="capitalize">
                        {m}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Resident PIN" htmlFor="entry-pin">
                  <div className="relative">
                    <KeyRoundIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="entry-pin"
                      type="password"
                      inputMode="numeric"
                      required
                      minLength={4}
                      maxLength={6}
                      autoFocus
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="pl-9 tracking-[0.3em]"
                    />
                  </div>
                </Field>
                <Button type="submit" loading={verifyLoading} className="w-full">
                  Verify &amp; record entry
                </Button>
                {error && (
                  <p className="flex items-center gap-1.5 text-sm text-red-600">
                    <AlertTriangleIcon className="h-4 w-4" />
                    {error}
                  </p>
                )}
              </form>
            )}
          </CardBody>
        </Card>
      )}

      {result && (
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 text-sm shadow-sm animate-fade-in ${
            result.approved ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {result.approved ? (
            <CheckCircleIcon className="h-5 w-5 shrink-0" />
          ) : (
            <XCircleIcon className="h-5 w-5 shrink-0" />
          )}
          <div>
            {result.approved ? (
              <p className="font-medium">Entry approved and recorded.</p>
            ) : (
              <>
                <p className="font-medium">Entry rejected</p>
                <p className="text-xs opacity-80">{REASON_LABELS[result.reason ?? ""] ?? result.reason}</p>
              </>
            )}
          </div>
          {!result.approved && (
            <Badge tone="red" className="ml-auto">
              {result.reason}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
