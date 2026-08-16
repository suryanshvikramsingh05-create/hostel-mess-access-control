import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireUser, authErrorResponse } from "@/lib/auth";
import { hashPassword, verifyPassword, isPasswordStrongEnough } from "@/lib/password";
import { recordAudit } from "@/lib/audit";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { currentPassword, newPassword } = parsed.data;

    if (!isPasswordStrongEnough(newPassword)) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const result = await pool.query<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = $1`,
      [user.id]
    );
    const row = result.rows[0];
    if (!row || !(await verifyPassword(currentPassword, row.password_hash))) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await pool.query(
      `UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = now() WHERE id = $2`,
      [newHash, user.id]
    );

    await recordAudit({
      actorUserId: user.id,
      action: "password_changed",
      targetType: "user",
      targetId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
