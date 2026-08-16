import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { pool } from "@/lib/db";
import { requireRole, authErrorResponse, assertResidentScopedAccess } from "@/lib/auth";

/**
 * Lets an admin/warden view a specific resident's mess-entry QR code —
 * the same QR token already generated at resident creation time and used
 * by /api/mess-entries/scan. No new token generation or security logic;
 * this only exposes the existing image to authorized staff.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("admin", "warden");
    const { id } = await params;
    const residentUserId = Number(id);
    await assertResidentScopedAccess(user.role as "admin" | "warden", user.id, residentUserId);

    const result = await pool.query<{ qr_token: string; name: string; resident_code: string }>(
      `SELECT r.qr_token, u.name, r.resident_code
       FROM residents r JOIN users u ON u.id = r.user_id
       WHERE r.user_id = $1`,
      [residentUserId]
    );
    const resident = result.rows[0];
    if (!resident) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    const dataUrl = await QRCode.toDataURL(resident.qr_token, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
    });

    return NextResponse.json({
      qrDataUrl: dataUrl,
      name: resident.name,
      residentCode: resident.resident_code,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
