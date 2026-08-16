import type { ReactNode } from "react";

type Tone = "green" | "red" | "amber" | "slate" | "indigo" | "blue";

const tones: Record<Tone, string> = {
  green: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
  red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  slate: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/15",
  indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20",
  blue: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
};

export default function Badge({
  tone = "slate",
  children,
  className = "",
  dot = false,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "approved":
    case "active":
    case "Active":
      return "green";
    case "rejected":
    case "inactive":
    case "Inactive":
      return "red";
    case "pending":
    case "Pending":
      return "amber";
    case "used":
    case "Used":
      return "slate";
    case "expired":
    case "Expired":
      return "red";
    default:
      return "slate";
  }
}
