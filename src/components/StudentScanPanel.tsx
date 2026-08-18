"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import PinSetupCard from "@/components/resident/PinSetupCard";
import type { MessEntry } from "@/lib/api-types";
import {
  MEAL_WINDOWS,
  buildMealStatuses,
  getMealAvailability,
  mealWindowLabel,
  type MealStatus,
  type MealType,
} from "@/lib/mealWindows";
import {
  AlertTriangleIcon,
  BuildingIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  IdCardIcon,
  KeyRoundIcon,
  QrCodeIcon,
  UtensilsIcon,
  XCircleIcon,
} from "@/components/ui/icons";

interface ScannedMess {
  id: number;
  name: string;
  hostelId: number;
  hostelName: string;
}

const MEAL_OPTIONS: { value: MealType; label: string; emoji: string }[] = [
  { value: "breakfast", label: "Breakfast", emoji: "🍳" },
  { value: "lunch", label: "Lunch", emoji: "🍛" },
  { value: "snacks", label: "Snacks", emoji: "🍽️" },
  { value: "dinner", label: "Dinner", emoji: "🌙" },
];

const REASON_LABELS: Record<string, string> = {
  daily_limit_reached: "Daily meal limit (4/day) reached",
  invalid_pin: "Incorrect PIN",
  inactive_resident: "Your account is deactivated",
  invalid_mess: "You are not assigned to this mess",
  pin_not_set: "Set your mess PIN first",
  resident_not_found: "Resident not found",
};

// An approval screen is only trustworthy for a short window after it's
// issued — after that a guard should ask the student to re-scan rather
// than accept a screenshot or a stale tab from earlier in the day.
const APPROVAL_VALID_MS = 90_000;

type VerifyResult =
  | { approved: true; entryId: number; enteredAt: string; entryNumberToday: number; meal: string }
  | { approved: false; reason?: string; usedAt?: string | null };

const STATUS_LABELS: Record<MealStatus, string> = {
  used: "Used",
  available: "Available",
  expired: "Expired",
  upcoming: "Not open yet",
};

function mealLabelFor(mealType: string) {
  return MEAL_OPTIONS.find((m) => m.value === mealType)?.label ?? mealType;
}

function mealEmojiFor(mealType: string) {
  return MEAL_OPTIONS.find((m) => m.value === mealType)?.emoji ?? "";
}

export default function StudentScanPanel({
  initialMessQrToken,
  residentName,
  residentCode,
  hostelName,
  roomNumber,
  hasPin,
}: {
  initialMessQrToken?: string;
  residentName: string;
  residentCode: string;
  hostelName: string;
  roomNumber: string;
  hasPin: boolean;
}) {
  const [pinIsSet, setPinIsSet] = useState(hasPin);
  const [mess, setMess] = useState<ScannedMess | null>(null);
  const [messQrToken, setMessQrToken] = useState("");
  const [messError, setMessError] = useState<string | null>(null);
  const [messLoading, setMessLoading] = useState(false);
  const tokenInputRef = useRef<HTMLInputElement>(null);

  // Today's already-approved meals, fetched from the resident's own entry
  // history — this is server-confirmed truth, never a client-side guess —
  // and combined with the meal-window clock to compute a single
  // Used / Available / Expired / Upcoming status per meal (see
  // buildMealStatuses in lib/mealWindows.ts).
  const [usedMealTypes, setUsedMealTypes] = useState<MealType[] | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch("/api/mess-entries/history?limit=50")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) return;
        const entries: MessEntry[] = data.entries ?? [];
        const used = entries
          .filter((e) => e.entry_date === today && e.status === "approved")
          .map((e) => e.meal_type as MealType);
        setUsedMealTypes(used);
      })
      .catch(() => setUsedMealTypes([]));
  }, []);

  const [mealType, setMealType] = useState<MealType>(
    () => MEAL_OPTIONS.find((m) => getMealAvailability(m.value) === "open")?.value ?? "breakfast"
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!result?.approved) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [result]);

  // Forces a periodic re-render so the meal picker's greyed-out state stays
  // accurate even if a student leaves the page open across a meal window's
  // open/close boundary. getMealAvailability() is called fresh on every
  // render — no need to cache it.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const mealStatuses = usedMealTypes === null ? null : buildMealStatuses(usedMealTypes, new Date());

  // Once meal statuses are known, steer the picker away from a meal that's
  // already used or unavailable and onto the next one that's actually
  // available, so the resident isn't defaulted onto a dead option.
  useEffect(() => {
    if (!mealStatuses) return;
    const current = mealStatuses.find((m) => m.mealType === mealType);
    if (current && current.status !== "available") {
      const nextAvailable = mealStatuses.find((m) => m.status === "available");
      if (nextAvailable) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMealType(nextAvailable.mealType);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usedMealTypes]);

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

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    // Belt-and-suspenders against double-submission (double-click, double
    // Enter): the Button component already disables itself while
    // verifyLoading is true, and the server independently makes token
    // consumption atomic (unique constraint + a guarded UPDATE on the daily
    // counter — see /api/mess-entries/verify), but this guard stops a
    // second request from ever leaving the client in the first place.
    if (!mess || verifyLoading) return;
    setError(null);
    const availability = getMealAvailability(mealType);
    if (availability !== "open") {
      setResult({ approved: false, reason: availability === "expired" ? "meal_expired" : "meal_upcoming" });
      return;
    }
    setVerifyLoading(true);
    try {
      const res = await fetch("/api/mess-entries/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, mealType, messId: mess.id }),
      });
      const data = await res.json();
      if (!res.ok && !("approved" in data)) {
        setError(data.error ?? "Verification failed");
        return;
      }
      setPin("");
      if (data.approved) {
        setResult({ ...data, meal: mealType });
        setUsedMealTypes((prev) => [...(prev ?? []), mealType]);
        setNow(Date.now());
      } else {
        setResult({ ...data, reason: data.reason ?? "unknown" });
      }
    } finally {
      setVerifyLoading(false);
    }
  }

  function scanAgain() {
    setResult(null);
    setError(null);
    setMess(null);
    setMessQrToken("");
    setMessError(null);
    setTimeout(() => tokenInputRef.current?.focus(), 50);
  }

  function tryAgain() {
    setResult(null);
    setError(null);
  }

  // ---- Approved screen — this is the screen shown to the mess guard ----
  if (result?.approved) {
    const enteredAtMs = new Date(result.enteredAt).getTime();
    const elapsed = now - enteredAtMs;
    const expired = elapsed > APPROVAL_VALID_MS;
    const mealLabel = mealLabelFor(result.meal);
    const mealEmoji = mealEmojiFor(result.meal);

    return (
      <div className="animate-fade-in overflow-hidden rounded-3xl border-4 border-green-500 bg-white shadow-xl">
        <div className="bg-green-600 px-6 py-6 text-center text-white">
          <CheckCircleIcon className="mx-auto h-14 w-14" />
          <p className="mt-2 text-2xl font-bold tracking-tight">ENTRY APPROVED</p>
          <p className="mt-0.5 text-sm font-medium text-green-100">Show this screen to the mess guard</p>
        </div>
        <div className="space-y-4 px-6 py-6 text-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Resident</p>
            <p className="text-xl font-semibold text-slate-900">{residentName}</p>
            <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-slate-500">
              <IdCardIcon className="h-3.5 w-3.5" />
              Resident ID: {residentCode}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {hostelName} · Room {roomNumber}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Meal</p>
            <p className="text-3xl font-bold tracking-tight text-slate-900">
              {mealEmoji} {mealLabel.toUpperCase()}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Time: {new Date(result.enteredAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>

          <p className="text-sm font-medium text-slate-600">
            Today&apos;s meals used: {result.entryNumberToday} / 4
          </p>

          {expired ? (
            <div className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700">
              <AlertTriangleIcon className="h-4 w-4" />
              EXPIRED — please re-scan the mess QR
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm font-bold text-green-700">
              <CheckCircleIcon className="h-4 w-4" />
              STATUS: APPROVED / USED
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={scanAgain} className="w-full">
            Done
          </Button>
        </div>
      </div>
    );
  }

  // ---- Rejected screens — a distinct, unmistakable screen per reason ----
  if (result && !result.approved) {
    const reason = result.reason;

    if (reason === "duplicate_meal") {
      return (
        <div className="animate-fade-in overflow-hidden rounded-3xl border-4 border-indigo-400 bg-white shadow-xl">
          <div className="bg-indigo-600 px-6 py-6 text-center text-white">
            <ClipboardListIcon className="mx-auto h-14 w-14" />
            <p className="mt-2 text-2xl font-bold tracking-tight">TOKEN ALREADY USED</p>
          </div>
          <div className="space-y-3 px-6 py-6 text-center">
            <p className="text-lg font-semibold text-slate-900">Meal: {mealLabelFor(mealType)}</p>
            {result.usedAt && (
              <p className="text-sm text-slate-500">
                Used at:{" "}
                {new Date(result.usedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </p>
            )}
            <p className="text-sm text-slate-500">
              You&apos;ve already checked in for this meal today. It cannot be used again.
            </p>
            <Button onClick={scanAgain} className="w-full">
              Done
            </Button>
          </div>
        </div>
      );
    }

    if (reason === "meal_expired") {
      return (
        <div className="animate-fade-in overflow-hidden rounded-3xl border-4 border-amber-400 bg-white shadow-xl">
          <div className="bg-amber-500 px-6 py-6 text-center text-white">
            <AlertTriangleIcon className="mx-auto h-14 w-14" />
            <p className="mt-2 text-2xl font-bold tracking-tight">MEAL EXPIRED</p>
          </div>
          <div className="space-y-3 px-6 py-6 text-center">
            <p className="text-lg font-semibold text-slate-900">{mealLabelFor(mealType)}</p>
            <p className="text-sm text-slate-500">
              This meal was only served {mealWindowLabel(mealType)} (IST) and that window has closed. No
              token was consumed.
            </p>
            <Button onClick={scanAgain} className="w-full">
              Done
            </Button>
          </div>
        </div>
      );
    }

    if (reason === "meal_upcoming") {
      return (
        <div className="animate-fade-in overflow-hidden rounded-3xl border-4 border-amber-400 bg-white shadow-xl">
          <div className="bg-amber-500 px-6 py-6 text-center text-white">
            <AlertTriangleIcon className="mx-auto h-14 w-14" />
            <p className="mt-2 text-2xl font-bold tracking-tight">MEAL NOT YET OPEN</p>
          </div>
          <div className="space-y-3 px-6 py-6 text-center">
            <p className="text-lg font-semibold text-slate-900">{mealLabelFor(mealType)}</p>
            <p className="text-sm text-slate-500">
              This meal opens at {mealWindowLabel(mealType)} (IST). No token was consumed.
            </p>
            <Button onClick={scanAgain} className="w-full">
              Done
            </Button>
          </div>
        </div>
      );
    }

    if (reason === "invalid_pin") {
      return (
        <div className="animate-fade-in overflow-hidden rounded-3xl border-4 border-red-500 bg-white shadow-xl">
          <div className="bg-red-600 px-6 py-6 text-center text-white">
            <XCircleIcon className="mx-auto h-14 w-14" />
            <p className="mt-2 text-2xl font-bold tracking-tight">INCORRECT PIN</p>
          </div>
          <div className="space-y-3 px-6 py-6 text-center">
            <p className="text-sm text-slate-600">The PIN you entered is incorrect. Your token was not used.</p>
            <Button onClick={tryAgain} className="w-full">
              Try again
            </Button>
          </div>
        </div>
      );
    }

    // Generic fallback (daily_limit_reached, inactive_resident, invalid_mess,
    // pin_not_set, resident_not_found, or anything unexpected).
    return (
      <div className="animate-fade-in overflow-hidden rounded-3xl border-4 border-red-500 bg-white shadow-xl">
        <div className="bg-red-600 px-6 py-6 text-center text-white">
          <XCircleIcon className="mx-auto h-14 w-14" />
          <p className="mt-2 text-2xl font-bold tracking-tight">ENTRY REJECTED</p>
        </div>
        <div className="space-y-4 px-6 py-6 text-center">
          <p className="text-base font-medium text-slate-700">
            {REASON_LABELS[reason ?? ""] ?? reason ?? "Verification failed"}
          </p>
          <Button onClick={tryAgain} className="w-full">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // ---- Step 1: identify the mess ----
  if (!mess) {
    return (
      <Card>
        <CardHeader
          icon={<QrCodeIcon className="h-4 w-4" />}
          title="Scan the mess QR"
          description="Scan the QR code displayed at your mess entrance."
        />
        <CardBody>
          <form onSubmit={handleScanMess} className="flex gap-2">
            <div className="relative flex-1">
              <QrCodeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                ref={tokenInputRef}
                autoFocus
                value={messQrToken}
                onChange={(e) => setMessQrToken(e.target.value)}
                className="pl-9 font-mono"
                placeholder="Waiting for scan..."
              />
            </div>
            <Button type="submit" loading={messLoading}>
              Continue
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
    );
  }

  // ---- Step 2: no PIN set yet ----
  if (!pinIsSet) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
          <AlertTriangleIcon className="h-4 w-4 shrink-0" />
          Set your mess entry PIN before using the mess.
        </div>
        <PinSetupCard hasPin={false} onSaved={() => setPinIsSet(true)} />
      </div>
    );
  }

  // ---- Step 3: the dedicated mess check-in screen — identity, today's
  // status, current meal, and the PIN input. This is NOT the resident
  // dashboard: it only ever renders after a mess QR has been scanned and
  // resolved via /api/mess-entries/scan. ----
  const selectedStatus = mealStatuses?.find((m) => m.mealType === mealType)?.status;
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Mess Entry</p>
      </div>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{residentName}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <IdCardIcon className="h-3.5 w-3.5" />
                  {residentCode}
                </span>
                <span className="flex items-center gap-1">
                  <BuildingIcon className="h-3.5 w-3.5" />
                  {hostelName} · Room {roomNumber}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1 text-sm font-medium text-slate-700">
                <UtensilsIcon className="h-3.5 w-3.5" />
                {mess.name}
              </p>
              <p className="text-xs text-slate-400">{mess.hostelName}</p>
            </div>
          </div>

          {mealStatuses && (
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
              {mealStatuses.map((m) => (
                <span
                  key={m.mealType}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    m.status === "used"
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : m.status === "available"
                        ? "border-green-200 bg-green-50 text-green-700"
                        : m.status === "expired"
                          ? "border-slate-200 bg-slate-50 text-slate-400"
                          : "border-amber-200 bg-amber-50 text-amber-600"
                  }`}
                >
                  {m.label} — {STATUS_LABELS[m.status]}
                </span>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="animate-fade-in">
        <CardHeader
          icon={<KeyRoundIcon className="h-4 w-4" />}
          title={`Current meal: ${mealLabelFor(mealType)}`}
          description="Enter your Mess PIN to check in."
        />
        <CardBody>
          <form onSubmit={handleVerify} className="space-y-4">
            <Field label="Meal" htmlFor="meal-select">
              <Select
                id="meal-select"
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType)}
              >
                {MEAL_OPTIONS.map((m) => {
                  const status = mealStatuses?.find((s) => s.mealType === m.value)?.status;
                  const available = status === "available" || status === undefined;
                  return (
                    <option key={m.value} value={m.value} disabled={!available}>
                      {m.emoji} {m.label} — {MEAL_WINDOWS[m.value].label}
                      {status && status !== "available" ? ` (${STATUS_LABELS[status]})` : ""}
                    </option>
                  );
                })}
              </Select>
              {selectedStatus === "used" && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-indigo-600">
                  <AlertTriangleIcon className="h-3.5 w-3.5" />
                  You&apos;ve already used your {mealLabelFor(mealType)} token today.
                </p>
              )}
              {selectedStatus === "expired" && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertTriangleIcon className="h-3.5 w-3.5" />
                  {mealLabelFor(mealType)} was only served {mealWindowLabel(mealType)} (IST) and has expired.
                </p>
              )}
              {selectedStatus === "upcoming" && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertTriangleIcon className="h-3.5 w-3.5" />
                  {mealLabelFor(mealType)} opens at {mealWindowLabel(mealType)} (IST).
                </p>
              )}
            </Field>
            <Field label="Enter your Mess PIN" htmlFor="student-pin">
              <div className="relative">
                <KeyRoundIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="student-pin"
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
            <Button
              type="submit"
              loading={verifyLoading}
              disabled={selectedStatus !== undefined && selectedStatus !== "available"}
              className="w-full"
            >
              Verify &amp; check in
            </Button>
            {error && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertTriangleIcon className="h-4 w-4" />
                {error}
              </p>
            )}
          </form>
        </CardBody>
      </Card>

      <p className="text-center text-xs text-slate-400">
        Not you?{" "}
        <a href="/login?next=%2Fmess%2Fcheck-in" className="font-medium text-indigo-600 hover:underline">
          Sign in with a different account
        </a>
      </p>
    </div>
  );
}
