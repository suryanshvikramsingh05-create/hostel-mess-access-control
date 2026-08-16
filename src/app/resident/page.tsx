import QrCard from "@/components/resident/QrCard";
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
        <p className="text-sm text-slate-500">Your mess pass, PIN, and entry history.</p>
      </div>

      {profile && (
        <QrCard
          residentName={user.name}
          roomNumber={profile.room_number}
          hostelName={profile.hostel_name}
          residentCode={profile.resident_code}
        />
      )}

      <div className="mx-auto w-full max-w-md">
        <PinSetupCard />
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
