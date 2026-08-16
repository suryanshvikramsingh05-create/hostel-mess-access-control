import MessStatusCard from "@/components/resident/MessStatusCard";
import PinSetupCard from "@/components/resident/PinSetupCard";
import EntryHistoryPanel from "@/components/EntryHistoryPanel";
import { HistoryIcon } from "@/components/ui/icons";
import { requirePageRole } from "@/lib/page-auth";
import { getResidentProfile } from "@/lib/auth";

export default async function ResidentPage() {
  const user = await requirePageRole("resident");
  const profile = await getResidentProfile(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">Welcome, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-slate-500">Your mess entry status, PIN, and history.</p>
      </div>

      {profile && (
        <MessStatusCard
          residentName={user.name}
          roomNumber={profile.room_number}
          hostelName={profile.hostel_name}
          residentCode={profile.resident_code}
        />
      )}

      <div className="mx-auto w-full max-w-md">
        <PinSetupCard hasPin={profile?.has_pin ?? false} />
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <HistoryIcon className="h-4 w-4 text-slate-400" />
          Your entry history
        </h2>
        <EntryHistoryPanel residentView />
      </div>
    </div>
  );
}
