import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { hashPassword, isPasswordStrongEnough } from "@/lib/password";
import { generateResidentCode, generateToken } from "@/lib/ids";
import { createSession, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/http";

class InviteError extends Error {
  constructor(public reason: "not_found" | "used" | "expired") {
    super(reason);
  }
}

const bodySchema = z.object({
  token: z.string().min(10),
  name: z.string().min(2),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { token, name, password } = parsed.data;

  if (!isPasswordStrongEnough(password)) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    const result = await withTransaction(async (client) => {
      const inviteResult = await client.query<{
        id: number;
        email: string;
        role: "warden" | "resident";
        hostel_id: number;
        room_number: string | null;
        expires_at: string;
        used_at: string | null;
      }>(
        `SELECT id, email, role, hostel_id, room_number, expires_at, used_at
         FROM invites WHERE token_hash = $1 FOR UPDATE`,
        [tokenHash]
      );

      const invite = inviteResult.rows[0];
      if (!invite) throw new InviteError("not_found");
      if (invite.used_at) throw new InviteError("used");
      if (new Date(invite.expires_at) < new Date()) throw new InviteError("expired");

      const passwordHash = await hashPassword(password);
      const userResult = await client.query<{ id: number }>(
        `INSERT INTO users (email, name, role, password_hash)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [invite.email, name, invite.role, passwordHash]
      );
      const userId = userResult.rows[0].id;

      if (invite.role === "resident") {
        const residentCode = generateResidentCode(invite.hostel_id);
        const qrToken = generateToken(24);
        await client.query(
          `INSERT INTO residents (user_id, resident_code, hostel_id, room_number, qr_token)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, residentCode, invite.hostel_id, invite.room_number ?? "N/A", qrToken]
        );
      } else {
        await client.query(`INSERT INTO wardens (user_id, hostel_id) VALUES ($1, $2)`, [
          userId,
          invite.hostel_id,
        ]);
      }

      await client.query(`UPDATE invites SET used_at = now() WHERE id = $1`, [invite.id]);

      await recordAudit(
        {
          actorUserId: userId,
          action: "invite_accepted",
          targetType: "invite",
          targetId: invite.id,
          details: { role: invite.role, email: invite.email },
          ipAddress: ip,
        },
        client
      );

      return { userId };
    });

    const { token: sessionToken, expiresAt } = await createSession(result.userId, {
      userAgent: req.headers.get("user-agent"),
      ipAddress: ip,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions(expiresAt));
    return response;
  } catch (err) {
    if (err instanceof InviteError) {
      const message =
        err.reason === "used"
          ? "Invite has already been used"
          : err.reason === "expired"
          ? "Invite has expired"
          : "Invite not found";
      return NextResponse.json({ error: message }, { status: 410 });
    }
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
