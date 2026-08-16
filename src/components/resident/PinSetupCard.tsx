"use client";

import { useState, type FormEvent } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { AlertTriangleIcon, KeyRoundIcon } from "@/components/ui/icons";

export default function PinSetupCard({ hasPin: initialHasPin }: { hasPin: boolean }) {
  const toast = useToast();
  const [hasPin, setHasPin] = useState(initialHasPin);
  const [editing, setEditing] = useState(!initialHasPin);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }
    if (!/^[0-9]{4,6}$/.test(pin)) {
      setError("PIN must be 4-6 digits");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/residents/me/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      toast.success("Mess entry PIN updated");
      setPin("");
      setConfirmPin("");
      setHasPin(true);
      setEditing(false);
    } finally {
      setLoading(false);
    }
  }

  function cancelEdit() {
    setEditing(false);
    setPin("");
    setConfirmPin("");
    setError(null);
  }

  return (
    <Card>
      <CardHeader
        icon={<KeyRoundIcon className="h-4 w-4" />}
        title="Mess Entry PIN"
        description={editing ? "Verifies your identity at the mess counter." : undefined}
      />
      <CardBody>
        {!editing ? (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <Badge tone="green" dot>
                PIN set
              </Badge>
              <p className="text-sm text-slate-600">Your PIN is set. You can change it if needed.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Change PIN
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="New PIN" htmlFor="new-pin">
                <Input
                  id="new-pin"
                  type="password"
                  inputMode="numeric"
                  minLength={4}
                  maxLength={6}
                  required
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="tracking-[0.3em]"
                />
              </Field>
              <Field label="Confirm PIN" htmlFor="confirm-pin">
                <Input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  minLength={4}
                  maxLength={6}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="tracking-[0.3em]"
                />
              </Field>
            </div>
            {error && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertTriangleIcon className="h-4 w-4" />
                {error}
              </p>
            )}
            <div className="flex gap-2">
              {hasPin && (
                <Button type="button" variant="ghost" className="flex-1" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
              <Button type="submit" loading={loading} className="flex-1">
                Save PIN
              </Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
