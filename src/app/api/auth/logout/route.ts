import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeSessionByToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { getCurrentUser } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await getCurrentUser();

  if (token) {
    await revokeSessionByToken(token);
  }
  if (user) {
    await recordAudit({ actorUserId: user.id, action: "logout", targetType: "user", targetId: user.id });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
