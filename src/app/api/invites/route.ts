import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireRole, authErrorResponse, getWardenHostelId, AuthError } from "@/lib/auth";
import { generateToken } from "@/lib/ids";
import { recordAudit } from "@/lib/audit";
import { sendMail, inviteEmail } from "@/lib/mail";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(["warden", "resident"]),
  hostelId: z.number().int().positive(),
  roomNumber: z.string().optional(),
  name: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requireRole("admin", "warden");
    let hostelFilter: number | null = null;
    if (user.role === "warden") {
      hostelFilter = await getWardenHostelId(user.id);
    }

    const result = hostelFilter
      ? await pool.query(
          `SELECT id, email, role, hostel_id, room_number, name, expires_at, used_at, created_at
           FROM invites WHERE hostel_id = $1 ORDER BY created_at DESC`,
          [hostelFilter]
        )
      : await pool.query(
          `SELECT id, email, role, hostel_id, room_number, name, expires_at, used_at, created_at
           FROM invites ORDER BY created_at DESC`
        );

    return NextResponse.json({ invites: result.rows });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("admin", "warden");
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { email, role, hostelId, roomNumber, name } = parsed.data;

    if (user.role === "warden") {
      if (role !== "resident") {
        throw new AuthError("Wardens may only invite residents", 403);
      }
      const wardenHostelId = await getWardenHostelId(user.id);
      if (wardenHostelId !== hostelId) {
        throw new AuthError("You may only invite residents to your assigned hostel", 403);
      }
    }

    if (role === "resident" && !roomNumber) {
      return NextResponse.json({ error: "roomNumber is required for resident invites" }, { status: 400 });
    }

    const rawToken = generateToken(24);
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const result = await pool.query(
      `INSERT INTO invites (email, role, hostel_id, room_number, name, token_hash, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, role, hostel_id, room_number, name, expires_at, created_at`,
      [email, role, hostelId, roomNumber ?? null, name ?? null, tokenHash, user.id, expiresAt]
    );

    await recordAudit({
      actorUserId: user.id,
      action: "invite_created",
      targetType: "invite",
      targetId: result.rows[0].id,
      details: { email, role, hostelId },
    });

    const hostelResult = await pool.query<{ name: string }>(`SELECT name FROM hostels WHERE id = $1`, [hostelId]);
    const hostelName = hostelResult.rows[0]?.name ?? "your hostel";
    const inviteLink = `${req.nextUrl.origin}/invite/${rawToken}`;

    let emailSent = false;
    let emailError: string | null = null;
    try {
      const { subject, html, text } = inviteEmail({ role, hostelName, roomNumber, inviteLink, expiresAt });
      await sendMail({ to: email, subject, html, text });
      emailSent = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : "Unknown error sending email";
      console.error("[invites] failed to send invite email:", emailError);
    }

    return NextResponse.json(
      { invite: result.rows[0], token: rawToken, emailSent, emailError },
      { status: 201 }
    );
  } catch (err) {
    return authErrorResponse(err);
  }
}
