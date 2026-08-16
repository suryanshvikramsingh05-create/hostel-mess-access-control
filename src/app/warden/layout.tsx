import { requirePageRole } from "@/lib/page-auth";

export default async function WardenLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole("warden");
  return <div className="flex min-h-full flex-1 flex-col bg-slate-50">{children}</div>;
}
