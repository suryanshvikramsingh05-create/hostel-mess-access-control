import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireRole, authErrorResponse } from "@/lib/auth";
import { hashPin, isPinValid } from "@/lib/password";
import { recordAudit } from "@/lib/audit";

const bodySchema = z.object({
  pin: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("resident");
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success || !isPinValid(parsed.data.pin)) {
      return NextResponse.json(
        { error: "PIN must be 4-6 digits" },
        { status: 400 }
      );
    }

    const pinHash = await hashPin(parsed.data.pin);
    const result = await pool.query(
      `UPDATE residents SET pin_hash = $1, updated_at = now() WHERE user_id = $2`,
      [pinHash, user.id]
    );

    // requireRole("resident") guarantees a resident session, but every
    // resident row must exist 1:1 with its user row (created together at
    // registration) — if the UPDATE ever somehow matched zero rows, do not
    // report success for a PIN that was never actually persisted.
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Resident profile not found" }, { status: 404 });
    }

    await recordAudit({
      actorUserId: user.id,
      action: "resident_pin_set",
      targetType: "resident",
      targetId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
