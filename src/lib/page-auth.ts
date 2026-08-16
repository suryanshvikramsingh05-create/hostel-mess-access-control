import { redirect } from "next/navigation";
import { getCurrentUser, type Role, type SessionUser } from "./session";

/** Server-component guard: redirects to /login or the user's own dashboard on mismatch. */
export async function requirePageRole(role: Role): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(`/${user.role}`);
  return user;
}
