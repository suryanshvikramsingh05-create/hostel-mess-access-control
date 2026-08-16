"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Mess } from "@/lib/api-types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  IdCardIcon,
  KeyRoundIcon,
  QrCodeIcon,
  ScanLineIcon,
  XCircleIcon,
} from "@/components/ui/icons";

interface ScannedResident {
  id: number;
  name: string;
  isActive: boolean;
  residentCode: string;
  roomNumber: string;
  hostelId: number;
  hostelName: string;
  hasPin: boolean;
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
  unknown_qr_token: "QR code not recognized",
};

export default function ScanEntryPanel({ messes }: { messes: Mess[] }) {
  const [qrToken, setQrToken] = useState("");
  const [resident, setResident] = useState<ScannedResident | null>(null);
  const [pin, setPin] = useState("");
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>("breakfast");
  const [messId, setMessId] = useState<string>(messes[0] ? String(messes[0].id) : "");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ approved: boolean; reason?: string } | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    qrInputRef.current?.focus();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!messId && messes[0]) setMessId(String(messes[0].id));
  }, [messes, messId]);

  async function handleScan(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!qrToken.trim()) return;
    setScanLoading(true);
    try {
      const res = await fetch("/api/mess-entries/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: qrToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setResident(null);
        return;
      }
      setResident(data.resident);
    } finally {
      setScanLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setVerifyLoading(true);
    try {
      const res = await fetch("/api/mess-entries/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: qrToken.trim(), pin, mealType, messId: Number(messId) }),
      });
      const data = await res.json();
      if (!res.ok && !("approved" in data)) {
        setError(data.error ?? "Verification failed");
        return;
      }
      setResult(data);
      setPin("");
      if (data.approved) {
        setResident(null);
        setQrToken("");
        setTimeout(() => qrInputRef.current?.focus(), 100);
      }
    } finally {
      setVerifyLoading(false);
    }
  }

  function resetScan() {
    setResident(null);
    setQrToken("");
    setResult(null);
    setError(null);
    setTimeout(() => qrInputRef.current?.focus(), 50);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {!resident && (
        <Card>
          <CardHeader
            icon={<ScanLineIcon className="h-4 w-4" />}
            title="Scan resident"
            description="Focus the field and scan with a USB/camera QR scanner, or paste the code."
          />
          <CardBody>
            <form onSubmit={handleScan} className="flex gap-2">
              <div className="relative flex-1">
                <QrCodeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  ref={qrInputRef}
                  autoFocus
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  className="pl-9 font-mono"
                  placeholder="Waiting for scan..."
                />
              </div>
              <Button type="submit" loading={scanLoading}>
                Look up
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
      )}

      {resident && (
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
                    {resident.residentCode} · Room {resident.roomNumber} · {resident.hostelName}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={resetScan}>
                Scan another
              </Button>
            </div>

            {!resident.isActive && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <XCircleIcon className="h-4 w-4 shrink-0" />
                This resident account is deactivated.
              </div>
            )}
            {resident.isActive && !resident.hasPin && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                <AlertTriangleIcon className="h-4 w-4 shrink-0" />
                This resident has not set up a security PIN yet and cannot be checked in.
              </div>
            )}

            {resident.isActive && resident.hasPin && (
              <form onSubmit={handleVerify} className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mess" htmlFor="entry-mess">
                    <Select id="entry-mess" value={messId} onChange={(e) => setMessId(e.target.value)}>
                      {messes.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
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
                </div>
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
                <Button type="submit" loading={verifyLoading} disabled={!messId} className="w-full">
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
