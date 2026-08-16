import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireRole, authErrorResponse, assertResidentScopedAccess } from "@/lib/auth";
import { revokeAllSessionsForUser } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  roomNumber: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("admin", "warden");
    const { id } = await params;
    const residentUserId = Number(id);
    await assertResidentScopedAccess(user.role as "admin" | "warden", user.id, residentUserId);

    const parsed = updateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { name, roomNumber, isActive } = parsed.data;

    if (name !== undefined) {
      await pool.query(`UPDATE users SET name = $1, updated_at = now() WHERE id = $2`, [
        name,
        residentUserId,
      ]);
    }
    if (isActive !== undefined) {
      await pool.query(`UPDATE users SET is_active = $1, updated_at = now() WHERE id = $2`, [
        isActive,
        residentUserId,
      ]);
      if (!isActive) {
        await revokeAllSessionsForUser(residentUserId);
      }
    }
    if (roomNumber !== undefined) {
      await pool.query(
        `UPDATE residents SET room_number = $1, updated_at = now() WHERE user_id = $2`,
        [roomNumber, residentUserId]
      );
    }

    await recordAudit({
      actorUserId: user.id,
      action: isActive === false ? "resident_deactivated" : "resident_updated",
      targetType: "resident",
      targetId: residentUserId,
      details: parsed.data,
    });

    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.is_active, r.resident_code, r.room_number, r.hostel_id
       FROM residents r JOIN users u ON u.id = r.user_id WHERE u.id = $1`,
      [residentUserId]
    );

    return NextResponse.json({ resident: result.rows[0] });
  } catch (err) {
    return authErrorResponse(err);
  }
}
