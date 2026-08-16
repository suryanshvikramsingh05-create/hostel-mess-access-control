import { requirePageRole } from "@/lib/page-auth";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminPage() {
  const user = await requirePageRole("admin");
  return <AdminDashboardClient userName={user.name} />;
}
