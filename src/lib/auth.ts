import { NextResponse } from "next/server";
import { pool } from "./db";
import { getCurrentUser, type Role, type SessionUser } from "./session";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Loads the current session user, throwing an AuthError (401) if unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Authentication required", 401);
  return user;
}

/** Loads the current session user and enforces role membership (403 if wrong role). */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new AuthError("You are not authorized to perform this action", 403);
  }
  return user;
}

export function authErrorResponse(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/** Returns the hostel_id a warden is assigned to manage. */
export async function getWardenHostelId(userId: number): Promise<number | null> {
  const result = await pool.query<{ hostel_id: number }>(
    `SELECT hostel_id FROM wardens WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0]?.hostel_id ?? null;
}

/** Returns resident profile details (hostel scoping, resident_code, etc.) for a resident user. */
export async function getResidentProfile(userId: number) {
  const result = await pool.query<{
    user_id: number;
    resident_code: string;
    hostel_id: number;
    hostel_name: string;
    room_number: string;
    qr_token: string;
    has_pin: boolean;
  }>(
    `SELECT r.user_id, r.resident_code, r.hostel_id, h.name AS hostel_name, r.room_number, r.qr_token,
            (r.pin_hash IS NOT NULL) AS has_pin
     FROM residents r JOIN hostels h ON h.id = r.hostel_id
     WHERE r.user_id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

/**
 * Ensures a warden may only act on residents within their own assigned
 * hostel. Admins are unrestricted. Throws a 403 AuthError otherwise.
 */
export async function assertResidentScopedAccess(
  actorRole: "admin" | "warden",
  actorId: number,
  residentUserId: number
): Promise<void> {
  if (actorRole !== "warden") return;
  const wardenHostelId = await getWardenHostelId(actorId);
  const residentHostel = await pool.query<{ hostel_id: number }>(
    `SELECT hostel_id FROM residents WHERE user_id = $1`,
    [residentUserId]
  );
  if (!residentHostel.rows[0] || residentHostel.rows[0].hostel_id !== wardenHostelId) {
    throw new AuthError("You may only manage residents in your assigned hostel", 403);
  }
}
