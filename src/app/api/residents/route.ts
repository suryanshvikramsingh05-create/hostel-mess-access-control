import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool, withTransaction } from "@/lib/db";
import { requireRole, authErrorResponse, getWardenHostelId, AuthError } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { generateResidentCode, generateTempPassword, generateToken } from "@/lib/ids";
import { recordAudit } from "@/lib/audit";

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
          `SELECT u.id, u.email, u.name, u.is_active, r.resident_code, r.room_number, r.hostel_id, h.name AS hostel_name
           FROM residents r
           JOIN users u ON u.id = r.user_id
           JOIN hostels h ON h.id = r.hostel_id
           WHERE r.hostel_id = $1
           ORDER BY r.room_number, u.name`,
          [hostelId]
        )
      : await pool.query(
          `SELECT u.id, u.email, u.name, u.is_active, r.resident_code, r.room_number, r.hostel_id, h.name AS hostel_name
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

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const residentCode = generateResidentCode(hostelId);
    const qrToken = generateToken(24);

    const created = await withTransaction(async (client) => {
      const userResult = await client.query<{ id: number }>(
        `INSERT INTO users (email, name, role, password_hash, must_change_password)
         VALUES ($1, $2, 'resident', $3, TRUE)
         RETURNING id`,
        [email, name, passwordHash]
      );
      const userId = userResult.rows[0].id;

      await client.query(
        `INSERT INTO residents (user_id, resident_code, hostel_id, room_number, qr_token)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, residentCode, hostelId, roomNumber, qrToken]
      );

      return userId;
    });

    await recordAudit({
      actorUserId: user.id,
      action: "resident_created",
      targetType: "resident",
      targetId: created,
      details: { email, roomNumber, hostelId },
    });

    return NextResponse.json(
      {
        resident: {
          id: created,
          name,
          email,
          roomNumber,
          hostelId,
          residentCode,
        },
        tempPassword,
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
