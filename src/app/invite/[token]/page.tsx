"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { use as usePromise } from "react";
import AuthShell from "@/components/ui/AuthShell";
import { Field, Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { LoaderIcon, AlertTriangleIcon, UsersIcon } from "@/components/ui/icons";

interface InviteInfo {
  email: string;
  role: "warden" | "resident";
  hostelName: string;
  roomNumber: string | null;
}

export default function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = usePromise(params);
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setLoadError(data.error);
          return;
        }
        setInvite(data.invite);
        setName(data.invite.name ?? "");
      })
      .catch(() => setLoadError("Could not load invite"));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loadError) {
    return (
      <AuthShell eyebrow="Invite" title="This invite isn't available">
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      </AuthShell>
    );
  }

  if (!invite) {
    return (
      <AuthShell eyebrow="Invite" title="Loading invite...">
        <div className="flex justify-center py-4 text-slate-400">
          <LoaderIcon className="h-6 w-6" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Invite" title="Complete your registration">
      <div className="mb-5 flex items-center gap-3 rounded-lg bg-indigo-50 px-3.5 py-3 text-sm text-indigo-900">
        <UsersIcon className="h-5 w-5 shrink-0 text-indigo-500" />
        <div>
          <p>
            Joining <span className="font-semibold">{invite.hostelName}</span> as a{" "}
            <Badge tone="indigo" className="align-middle capitalize">
              {invite.role}
            </Badge>
          </p>
          {invite.roomNumber && <p className="mt-0.5 text-xs text-indigo-600">Room {invite.roomNumber}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email">
          <Input id="email" disabled value={invite.email} className="bg-slate-50 text-slate-500" />
        </Field>
        <Field label="Full name" htmlFor="name">
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword">
          <Input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full">
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
