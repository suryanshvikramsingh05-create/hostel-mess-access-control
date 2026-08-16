import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { pool } from "@/lib/db";
import { requireRole, authErrorResponse } from "@/lib/auth";
import { generateToken } from "@/lib/ids";
import { recordAudit } from "@/lib/audit";

/**
 * Admin-only "View/Generate Mess QR". One QR per mess — every resident
 * assigned to that mess shares it. Lazily generates the token on first
 * view if the mess predates this feature (or was created before a token
 * existed), otherwise just renders the existing one.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("admin");
    const { id } = await params;
    const messId = Number(id);

    const result = await pool.query<{
      id: number;
      name: string;
      hostel_id: number;
      hostel_name: string;
      qr_token: string | null;
    }>(
      `SELECT mz.id, mz.name, mz.hostel_id, h.name AS hostel_name, mz.qr_token
       FROM messes mz JOIN hostels h ON h.id = mz.hostel_id
       WHERE mz.id = $1`,
      [messId]
    );
    const mess = result.rows[0];
    if (!mess) {
      return NextResponse.json({ error: "Mess not found" }, { status: 404 });
    }

    let qrToken = mess.qr_token;
    if (!qrToken) {
      qrToken = generateToken(24);
      await pool.query(`UPDATE messes SET qr_token = $1, updated_at = now() WHERE id = $2`, [
        qrToken,
        messId,
      ]);
      await recordAudit({
        actorUserId: user.id,
        action: "mess_qr_generated",
        targetType: "mess",
        targetId: messId,
        details: { messName: mess.name },
      });
    }

    const dataUrl = await QRCode.toDataURL(qrToken, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
    });

    return NextResponse.json({
      qrDataUrl: dataUrl,
      mess: { id: mess.id, name: mess.name, hostelId: mess.hostel_id, hostelName: mess.hostel_name },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
