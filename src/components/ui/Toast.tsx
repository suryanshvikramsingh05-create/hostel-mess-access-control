"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon, XCircleIcon, XIcon } from "./icons";

type ToastKind = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  show: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const kindStyles: Record<ToastKind, { icon: (p: { className?: string }) => ReactNode; classes: string }> = {
  success: {
    icon: (p) => <CheckCircleIcon className={p.className} />,
    classes: "border-green-200 bg-white text-slate-800 [&_svg]:text-green-600",
  },
  error: {
    icon: (p) => <XCircleIcon className={p.className} />,
    classes: "border-red-200 bg-white text-slate-800 [&_svg]:text-red-600",
  },
  info: {
    icon: (p) => <InfoIcon className={p.className} />,
    classes: "border-blue-200 bg-white text-slate-800 [&_svg]:text-blue-600",
  },
  warning: {
    icon: (p) => <AlertTriangleIcon className={p.className} />,
    classes: "border-amber-200 bg-white text-slate-800 [&_svg]:text-amber-600",
  },
};

let idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  const value: ToastContextValue = {
    show,
    success: (m) => show("success", m),
    error: (m) => show("error", m),
    info: (m) => show("info", m),
    warning: (m) => show("warning", m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        {toasts.map((t) => {
          const style = kindStyles[t.kind];
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border px-4 py-3 shadow-lg ring-1 ring-black/5 ${style.classes} animate-[toast-in_0.2s_ease-out]`}
            >
              {style.icon({ className: "h-5 w-5 shrink-0 mt-0.5" })}
              <p className="flex-1 text-sm font-medium leading-5">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
