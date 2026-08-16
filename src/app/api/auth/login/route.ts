import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/http";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const result = await pool.query<{
    id: number;
    email: string;
    name: string;
    role: "admin" | "warden" | "resident";
    password_hash: string;
    is_active: boolean;
    must_change_password: boolean;
  }>(
    `SELECT id, email, name, role, password_hash, is_active, must_change_password
     FROM users WHERE email = $1`,
    [email]
  );

  const user = result.rows[0];

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    await recordAudit({
      actorUserId: user?.id ?? null,
      action: "login_failed",
      targetType: "user",
      targetId: user?.id,
      details: { email },
      ipAddress: ip,
    });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (!user.is_active) {
    await recordAudit({
      actorUserId: user.id,
      action: "login_rejected_inactive",
      targetType: "user",
      targetId: user.id,
      ipAddress: ip,
    });
    return NextResponse.json({ error: "This account has been deactivated" }, { status: 403 });
  }

  const { token, expiresAt } = await createSession(user.id, {
    userAgent: req.headers.get("user-agent"),
    ipAddress: ip,
  });

  await recordAudit({
    actorUserId: user.id,
    action: "login_success",
    targetType: "user",
    targetId: user.id,
    ipAddress: ip,
  });

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.must_change_password,
    },
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
  return response;
}
