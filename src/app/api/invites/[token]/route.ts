import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { pool } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const result = await pool.query<{
    id: number;
    email: string;
    role: "warden" | "resident";
    hostel_id: number;
    hostel_name: string;
    room_number: string | null;
    name: string | null;
    expires_at: string;
    used_at: string | null;
  }>(
    `SELECT i.id, i.email, i.role, i.hostel_id, h.name AS hostel_name, i.room_number, i.name, i.expires_at, i.used_at
     FROM invites i JOIN hostels h ON h.id = i.hostel_id
     WHERE i.token_hash = $1`,
    [tokenHash]
  );

  const invite = result.rows[0];
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.used_at) {
    return NextResponse.json({ error: "Invite has already been used" }, { status: 410 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  return NextResponse.json({
    invite: {
      email: invite.email,
      role: invite.role,
      hostelId: invite.hostel_id,
      hostelName: invite.hostel_name,
      roomNumber: invite.room_number,
      name: invite.name,
    },
  });
}
