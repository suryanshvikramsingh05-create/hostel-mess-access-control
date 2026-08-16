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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQrDataUrl(null);
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
      description="Print and display this at the mess counter. Every resident assigned to this mess shares the same QR code."
    >
      <div className="flex flex-col items-center">
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

        <Button className="mt-4 w-full" onClick={handleDownload} disabled={!qrDataUrl}>
          <QrCodeIcon className="h-4 w-4" />
          Download QR code
        </Button>
      </div>
    </Modal>
  );
}
