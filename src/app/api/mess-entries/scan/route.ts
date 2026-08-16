import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireRole, authErrorResponse, getWardenHostelId } from "@/lib/auth";

const bodySchema = z.object({
  qrToken: z.string().min(10),
});

/**
 * Looks up a MESS by its scanned QR token (one QR per mess, shared by all
 * its residents). Read-only — does not record an entry. The warden/admin
 * uses this to confirm which mess they're at, then separately identifies
 * the resident (by search) and collects their PIN via
 * /api/mess-entries/verify.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("admin", "warden");
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid QR code" }, { status: 400 });
    }

    const result = await pool.query<{
      id: number;
      name: string;
      hostel_id: number;
      hostel_name: string;
      is_active: boolean;
    }>(
      `SELECT mz.id, mz.name, mz.hostel_id, h.name AS hostel_name, mz.is_active
       FROM messes mz
       JOIN hostels h ON h.id = mz.hostel_id
       WHERE mz.qr_token = $1`,
      [parsed.data.qrToken]
    );

    const mess = result.rows[0];
    if (!mess) {
      return NextResponse.json({ error: "Mess QR code not recognized" }, { status: 404 });
    }

    if (!mess.is_active) {
      return NextResponse.json({ error: "This mess is inactive" }, { status: 403 });
    }

    if (user.role === "warden") {
      const wardenHostelId = await getWardenHostelId(user.id);
      if (wardenHostelId !== mess.hostel_id) {
        return NextResponse.json(
          { error: "This mess belongs to a different hostel" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      mess: {
        id: mess.id,
        name: mess.name,
        hostelId: mess.hostel_id,
        hostelName: mess.hostel_name,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
