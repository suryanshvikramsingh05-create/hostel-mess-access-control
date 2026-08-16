"use client";

import { useState, type FormEvent } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { AlertTriangleIcon, KeyRoundIcon } from "@/components/ui/icons";

export default function PinSetupCard() {
  const toast = useToast();
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        icon={<KeyRoundIcon className="h-4 w-4" />}
        title="Mess entry PIN"
        description="Required at the mess counter along with your QR code."
      />
      <CardBody>
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
          <Button type="submit" loading={loading} className="w-full">
            Save PIN
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
