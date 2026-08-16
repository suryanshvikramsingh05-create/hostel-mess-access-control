import type { ReactNode } from "react";
import Logo from "./Logo";

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-20%,#eef2ff,transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-indigo-200/30 blur-3xl"
      />

      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size="lg" withText={false} className="mb-4" />
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">{eyebrow}</p>
          )}
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-slate-500">{description}</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-7 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
          {children}
        </div>

        {footer && <div className="mt-5 text-center text-xs text-slate-400">{footer}</div>}
      </div>
    </div>
  );
}
