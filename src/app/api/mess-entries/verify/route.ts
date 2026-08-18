import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool, withTransaction } from "@/lib/db";
import { requireRole, authErrorResponse, getWardenHostelId } from "@/lib/auth";
import { verifyPin } from "@/lib/password";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/http";
import { getMealAvailability } from "@/lib/mealWindows";

const bodySchema = z.object({
  residentId: z.number().int().positive().optional(),
  pin: z.string().min(4).max(6),
  mealType: z.enum(["breakfast", "lunch", "snacks", "dinner"]),
  messId: z.number().int().positive(),
});

interface ResidentRow {
  user_id: number;
  pin_hash: string | null;
  hostel_id: number;
  is_active: boolean;
}

async function insertRejectedEntry(
  residentId: number,
  messId: number,
  mealType: string,
  reason: string,
  verifiedBy: number
) {
  await pool.query(
    `INSERT INTO mess_entries (resident_id, mess_id, meal_type, status, rejection_reason, verified_by)
     VALUES ($1, $2, $3, 'rejected', $4, $5)`,
    [residentId, messId, mealType, reason, verifiedBy]
  );
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("admin", "warden", "resident");
    const ip = clientIp(req);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { pin, mealType, messId } = parsed.data;

    // A resident can only ever verify themselves — their identity comes
    // from the authenticated session, never from client-supplied JSON, so
    // there is no way to pass someone else's residentId and impersonate
    // them. Only admin/warden (the manual staff-override panel) may name
    // an arbitrary residentId.
    const residentId = user.role === "resident" ? user.id : parsed.data.residentId;
    if (!residentId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const residentResult = await pool.query<ResidentRow>(
      `SELECT user_id, pin_hash, hostel_id, is_active
       FROM residents r JOIN users u ON u.id = r.user_id
       WHERE r.user_id = $1`,
      [residentId]
    );
    const resident = residentResult.rows[0];

    if (!resident) {
      await recordAudit({
        actorUserId: user.id,
        action: "mess_entry_rejected",
        details: { reason: "resident_not_found" },
        ipAddress: ip,
      });
      return NextResponse.json({ approved: false, reason: "resident_not_found" }, { status: 404 });
    }

    if (user.role === "warden") {
      const wardenHostelId = await getWardenHostelId(user.id);
      if (wardenHostelId !== resident.hostel_id) {
        await insertRejectedEntry(resident.user_id, messId, mealType, "unauthorized_hostel", user.id);
        await recordAudit({
          actorUserId: user.id,
          action: "mess_entry_rejected",
          targetType: "resident",
          targetId: resident.user_id,
          details: { reason: "unauthorized_hostel" },
          ipAddress: ip,
        });
        return NextResponse.json({ approved: false, reason: "unauthorized_hostel" }, { status: 403 });
      }
    }

    const messResult = await pool.query<{ hostel_id: number; is_active: boolean }>(
      `SELECT hostel_id, is_active FROM messes WHERE id = $1`,
      [messId]
    );
    const mess = messResult.rows[0];
    if (!mess || !mess.is_active || mess.hostel_id !== resident.hostel_id) {
      await insertRejectedEntry(resident.user_id, messId, mealType, "invalid_mess", user.id);
      return NextResponse.json({ approved: false, reason: "invalid_mess" }, { status: 400 });
    }

    if (!resident.is_active) {
      await insertRejectedEntry(resident.user_id, messId, mealType, "inactive_resident", user.id);
      await recordAudit({
        actorUserId: user.id,
        action: "mess_entry_rejected",
        targetType: "resident",
        targetId: resident.user_id,
        details: { reason: "inactive_resident" },
        ipAddress: ip,
      });
      return NextResponse.json({ approved: false, reason: "inactive_resident" }, { status: 403 });
    }

    // Server is the sole source of truth for meal timing — the client's
    // clock/label is never trusted. "expired" and "upcoming" are reported
    // as distinct reasons (rather than one generic "closed") so the UI can
    // show the resident an accurate MEAL EXPIRED vs. not-yet-open message.
    const availability = getMealAvailability(mealType);
    if (availability !== "open") {
      const reason = availability === "expired" ? "meal_expired" : "meal_upcoming";
      await insertRejectedEntry(resident.user_id, messId, mealType, reason, user.id);
      await recordAudit({
        actorUserId: user.id,
        action: "mess_entry_rejected",
        targetType: "resident",
        targetId: resident.user_id,
        details: { mealType, messId, reason },
        ipAddress: ip,
      });
      return NextResponse.json({ approved: false, reason }, { status: 403 });
    }

    if (!resident.pin_hash) {
      return NextResponse.json({ approved: false, reason: "pin_not_set" }, { status: 400 });
    }

    const pinOk = await verifyPin(pin, resident.pin_hash);
    if (!pinOk) {
      await insertRejectedEntry(resident.user_id, messId, mealType, "invalid_pin", user.id);
      await recordAudit({
        actorUserId: user.id,
        action: "mess_entry_rejected",
        targetType: "resident",
        targetId: resident.user_id,
        details: { reason: "invalid_pin" },
        ipAddress: ip,
      });
      return NextResponse.json({ approved: false, reason: "invalid_pin" }, { status: 401 });
    }

    // Atomically enforce the 4-entries-per-day cap: the UPDATE ... WHERE
    // clause only fires (and only then does RETURNING produce a row) if the
    // count is still below the cap, so concurrent scans cannot race past it.
    try {
      const outcome = await withTransaction(async (client) => {
        const counterResult = await client.query<{ approved_count: number }>(
          `INSERT INTO resident_daily_counters (resident_id, entry_date, approved_count)
           VALUES ($1, CURRENT_DATE, 1)
           ON CONFLICT (resident_id, entry_date)
           DO UPDATE SET approved_count = resident_daily_counters.approved_count + 1
           WHERE resident_daily_counters.approved_count < 4
           RETURNING approved_count`,
          [resident.user_id]
        );

        if (counterResult.rows.length === 0) {
          await client.query(
            `INSERT INTO mess_entries (resident_id, mess_id, meal_type, status, rejection_reason, verified_by)
             VALUES ($1, $2, $3, 'rejected', 'daily_limit_reached', $4)`,
            [resident.user_id, messId, mealType, user.id]
          );
          return { approved: false as const, reason: "daily_limit_reached" };
        }

        const entryResult = await client.query<{ id: number; entry_time: string }>(
          `INSERT INTO mess_entries (resident_id, mess_id, meal_type, status, verified_by)
           VALUES ($1, $2, $3, 'approved', $4)
           RETURNING id, entry_time`,
          [resident.user_id, messId, mealType, user.id]
        );

        return {
          approved: true as const,
          entryNumberToday: counterResult.rows[0].approved_count,
          entryId: entryResult.rows[0].id,
          enteredAt: entryResult.rows[0].entry_time,
        };
      });

      await recordAudit({
        actorUserId: user.id,
        action: outcome.approved ? "mess_entry_approved" : "mess_entry_rejected",
        targetType: "resident",
        targetId: resident.user_id,
        details: outcome.approved
          ? { mealType, messId, entryNumberToday: outcome.entryNumberToday }
          : { mealType, messId, reason: outcome.reason },
        ipAddress: ip,
      });

      return NextResponse.json(outcome, { status: outcome.approved ? 200 : 200 });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "23505") {
        await insertRejectedEntry(resident.user_id, messId, mealType, "duplicate_meal", user.id);
        await recordAudit({
          actorUserId: user.id,
          action: "mess_entry_rejected",
          targetType: "resident",
          targetId: resident.user_id,
          details: { mealType, messId, reason: "duplicate_meal" },
          ipAddress: ip,
        });
        // Look up when the existing approved entry was recorded so the UI
        // can show "Used at: <time>" instead of a bare rejection.
        const existing = await pool.query<{ entry_time: string }>(
          `SELECT entry_time FROM mess_entries
           WHERE resident_id = $1 AND meal_type = $2 AND status = 'approved' AND entry_date = CURRENT_DATE
           ORDER BY entry_time DESC LIMIT 1`,
          [resident.user_id, mealType]
        );
        return NextResponse.json(
          { approved: false, reason: "duplicate_meal", usedAt: existing.rows[0]?.entry_time ?? null },
          { status: 200 }
        );
      }
      throw err;
    }
  } catch (err) {
    return authErrorResponse(err);
  }
}
