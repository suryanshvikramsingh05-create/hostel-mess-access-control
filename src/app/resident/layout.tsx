import { requirePageRole } from "@/lib/page-auth";
import TopBar from "@/components/ui/TopBar";

export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("resident");
  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50">
      <TopBar title="Resident Dashboard" roleLabel="Resident" userName={user.name} />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
