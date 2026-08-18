import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import TopBar from "@/components/ui/TopBar";
import ScanEntryPanel from "@/components/ScanEntryPanel";

/**
 * Staff-only manual mess-entry override (admin/warden), for the case where
 * a resident doesn't have their phone on hand. Requires an authenticated
 * admin/warden session — the mess QR token itself is never trusted here;
 * ScanEntryPanel re-validates it server-side via /api/mess-entries/scan
 * before showing anything mess-specific.
 *
 * Residents land here if they follow a stale link to /scan (the resident
 * self-service check-in used to live at this URL) — they're forwarded to
 * the dedicated /mess/check-in page instead of the resident dashboard.
 */
export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ mess?: string }>;
}) {
  const { mess } = await searchParams;
  const query = mess ? `?mess=${encodeURIComponent(mess)}` : "";
  const next = `/scan${query}`;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);

  if (user.role === "resident") {
    redirect(`/mess/check-in${query}`);
  }

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
