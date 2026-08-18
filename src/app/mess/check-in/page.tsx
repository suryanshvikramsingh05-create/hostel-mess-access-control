import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getResidentProfile } from "@/lib/auth";
import TopBar from "@/components/ui/TopBar";
import StudentScanPanel from "@/components/StudentScanPanel";

/**
 * Dedicated deep-link target for the mess QR code — deliberately NOT the
 * resident dashboard (/resident). The physical QR at the mess entrance
 * encodes `${origin}/mess/check-in?mess=<token>` (see
 * /api/messes/[id]/qr). Scanning it always lands here, never on /resident.
 *
 * Auth: an unauthenticated scan is bounced to /login with
 * `next=/mess/check-in?mess=<token>` and returns here (not to the
 * dashboard) after signing in. The resident's identity comes entirely from
 * their session — never from anything encoded in the QR or typed by the
 * user — so there is no way to check in as someone else. The mess token
 * itself carries no trust either; it's re-validated server-side via
 * /api/mess-entries/scan before any mess-specific data is shown.
 *
 * Admin/warden staff have a separate manual-override tool at /scan (same
 * QR, different destination for their role) — if staff scan the resident
 * QR by mistake, they're forwarded there instead of seeing this page.
 */
export default async function MessCheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ mess?: string }>;
}) {
  const { mess } = await searchParams;
  const query = mess ? `?mess=${encodeURIComponent(mess)}` : "";
  const next = `/mess/check-in${query}`;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);

  if (user.role !== "resident") {
    redirect(`/scan${query}`);
  }

  const profile = await getResidentProfile(user.id);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50">
      <TopBar title="Mess check-in" roleLabel="Resident" userName={user.name} />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-xl animate-fade-in">
          <StudentScanPanel
            initialMessQrToken={mess}
            residentName={user.name}
            residentCode={profile?.resident_code ?? ""}
            hostelName={profile?.hostel_name ?? ""}
            roomNumber={profile?.room_number ?? ""}
            hasPin={profile?.has_pin ?? false}
          />
        </div>
      </main>
    </div>
  );
}
