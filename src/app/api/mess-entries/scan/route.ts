import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireRole, authErrorResponse, getWardenHostelId } from "@/lib/auth";

const bodySchema = z.object({
  qrToken: z.string().min(10),
});

/**
 * Looks up a resident by their scanned QR token. Read-only — does not
 * record an entry. The warden/admin uses this to confirm identity before
 * collecting the resident's PIN and calling /api/mess-entries/verify.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("admin", "warden");
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid QR code" }, { status: 400 });
    }

    const result = await pool.query<{
      user_id: number;
      name: string;
      is_active: boolean;
      resident_code: string;
      room_number: string;
      hostel_id: number;
      hostel_name: string;
      has_pin: boolean;
    }>(
      `SELECT r.user_id, u.name, u.is_active, r.resident_code, r.room_number, r.hostel_id,
              h.name AS hostel_name, (r.pin_hash IS NOT NULL) AS has_pin
       FROM residents r
       JOIN users u ON u.id = r.user_id
       JOIN hostels h ON h.id = r.hostel_id
       WHERE r.qr_token = $1`,
      [parsed.data.qrToken]
    );

    const resident = result.rows[0];
    if (!resident) {
      return NextResponse.json({ error: "QR code not recognized" }, { status: 404 });
    }

    if (user.role === "warden") {
      const wardenHostelId = await getWardenHostelId(user.id);
      if (wardenHostelId !== resident.hostel_id) {
        return NextResponse.json(
          { error: "This resident belongs to a different hostel" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      resident: {
        id: resident.user_id,
        name: resident.name,
        isActive: resident.is_active,
        residentCode: resident.resident_code,
        roomNumber: resident.room_number,
        hostelId: resident.hostel_id,
        hostelName: resident.hostel_name,
        hasPin: resident.has_pin,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
