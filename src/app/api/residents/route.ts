import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool, withTransaction } from "@/lib/db";
import { requireRole, authErrorResponse, getWardenHostelId, AuthError } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { createResidentRecord } from "@/lib/residents";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("admin", "warden");
    let hostelId: number | null = null;

    if (user.role === "warden") {
      hostelId = await getWardenHostelId(user.id);
      if (!hostelId) return NextResponse.json({ residents: [] });
    } else {
      const q = req.nextUrl.searchParams.get("hostelId");
      if (q) hostelId = Number(q);
    }

    const result = hostelId
      ? await pool.query(
          `SELECT u.id, u.email, u.name, u.is_active, r.resident_code, r.room_number, r.hostel_id, h.name AS hostel_name,
                  (r.pin_hash IS NOT NULL) AS has_pin
           FROM residents r
           JOIN users u ON u.id = r.user_id
           JOIN hostels h ON h.id = r.hostel_id
           WHERE r.hostel_id = $1
           ORDER BY r.room_number, u.name`,
          [hostelId]
        )
      : await pool.query(
          `SELECT u.id, u.email, u.name, u.is_active, r.resident_code, r.room_number, r.hostel_id, h.name AS hostel_name,
                  (r.pin_hash IS NOT NULL) AS has_pin
           FROM residents r
           JOIN users u ON u.id = r.user_id
           JOIN hostels h ON h.id = r.hostel_id
           ORDER BY h.name, r.room_number, u.name`
        );

    return NextResponse.json({ residents: result.rows });
  } catch (err) {
    return authErrorResponse(err);
  }
}

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  roomNumber: z.string().min(1),
  hostelId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("admin", "warden");
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { name, email, roomNumber, hostelId } = parsed.data;

    if (user.role === "warden") {
      const wardenHostelId = await getWardenHostelId(user.id);
      if (wardenHostelId !== hostelId) {
        throw new AuthError("You may only manage residents in your assigned hostel", 403);
      }
    }

    const created = await withTransaction((client) =>
      createResidentRecord(client, { name, email, roomNumber, hostelId })
    );

    await recordAudit({
      actorUserId: user.id,
      action: "resident_created",
      targetType: "resident",
      targetId: created.userId,
      details: { email, roomNumber, hostelId },
    });

    return NextResponse.json(
      {
        resident: {
          id: created.userId,
          name,
          email,
          roomNumber,
          hostelId,
          residentCode: created.residentCode,
        },
        tempPassword: created.tempPassword,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }
    return authErrorResponse(err);
  }
}
