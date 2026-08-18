"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { AlertTriangleIcon, QrCodeIcon } from "@/components/ui/icons";

/**
 * One QR per mess, shared by every resident assigned to it. Lazily
 * generated server-side on first view if the mess predates this feature.
 */
export default function MessQrModal({
  messId,
  messName,
  onClose,
}: {
  messId: number;
  messName: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [scanUrl, setScanUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQrDataUrl(null);
    setScanUrl(null);
    setError(null);
    fetch(`/api/messes/${messId}/qr`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Could not load QR code");
          return;
        }
        setQrDataUrl(data.qrDataUrl);
        setScanUrl(data.scanUrl ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load QR code");
      });
    return () => {
      cancelled = true;
    };
  }, [messId]);

  function handleDownload() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${messName.replace(/\s+/g, "-").toLowerCase()}-mess-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR code downloaded");
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${messName} QR code`}
      description="ONE QR CODE FOR THIS MESS"
    >
      <div className="flex flex-col items-center">
        <p className="mb-4 max-w-xs text-center text-sm text-slate-500">
          Display this QR at the mess entrance. Residents assigned to this mess use the same QR.
        </p>
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertTriangleIcon className="h-4 w-4" />
            {error}
          </p>
        )}
        {!qrDataUrl && !error && <Skeleton className="h-56 w-56" />}
        {qrDataUrl && (
          <div className="rounded-xl border border-slate-200 bg-indigo-50/40 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`${messName} QR code`} className="h-52 w-52" />
          </div>
        )}
        {scanUrl && (
          <p className="mt-3 max-w-xs break-all text-center text-xs text-slate-400">
            Scanning opens: <span className="font-mono text-slate-500">{scanUrl}</span>
          </p>
        )}

        <Button className="mt-4 w-full" onClick={handleDownload} disabled={!qrDataUrl}>
          <QrCodeIcon className="h-4 w-4" />
          Download QR code
        </Button>
      </div>
    </Modal>
  );
}
