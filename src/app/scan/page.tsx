import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import TopBar from "@/components/ui/TopBar";
import ScanEntryPanel from "@/components/ScanEntryPanel";

/**
 * Deep-link target for a mess QR code scanned with a normal phone camera
 * (QR payload is `${origin}/scan?mess=<token>`). Requires an authenticated
 * admin/warden session to continue — the token itself is never trusted
 * here; ScanEntryPanel re-validates it server-side via
 * /api/mess-entries/scan before showing anything mess-specific. No
 * resident data is exposed on this page before that server-side check.
 */
export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ mess?: string }>;
}) {
  const { mess } = await searchParams;
  const next = `/scan${mess ? `?mess=${encodeURIComponent(mess)}` : ""}`;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (user.role === "resident") redirect("/resident");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50">
      <TopBar
        title="Mess entry"
        roleLabel={user.role === "admin" ? "Administrator" : "Warden"}
        userName={user.name}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-xl animate-fade-in">
          <ScanEntryPanel initialMessQrToken={mess} />
        </div>
      </main>
    </div>
  );
}
