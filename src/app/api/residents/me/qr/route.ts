import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireRole, authErrorResponse, getResidentProfile } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireRole("resident");
    const profile = await getResidentProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: "Resident profile not found" }, { status: 404 });
    }

    const dataUrl = await QRCode.toDataURL(profile.qr_token, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
    });

    return NextResponse.json({ qrDataUrl: dataUrl });
  } catch (err) {
    return authErrorResponse(err);
  }
}
