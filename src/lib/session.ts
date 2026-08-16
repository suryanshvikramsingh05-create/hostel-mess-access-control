import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { pool } from "./db";

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "hmac_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export type Role = "admin" | "warden" | "resident";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a new server-side session row and returns the raw token to set in a cookie. */
export async function createSession(
  userId: number,
  meta: { userAgent?: string | null; ipAddress?: string | null } = {}
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, meta.userAgent ?? null, meta.ipAddress ?? null, expiresAt]
  );

  return { token, expiresAt };
}

export async function revokeSessionByToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await pool.query(
    `UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );
}

export async function revokeAllSessionsForUser(userId: number): Promise<void> {
  await pool.query(
    `UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

/** Looks up the active session + user for a raw token. Returns null if invalid/expired/inactive. */
export async function getUserByToken(token: string): Promise<SessionUser | null> {
  const tokenHash = hashToken(token);
  const result = await pool.query<{
    id: number;
    email: string;
    name: string;
    role: Role;
    is_active: boolean;
    must_change_password: boolean;
  }>(
    `SELECT u.id, u.email, u.name, u.role, u.is_active, u.must_change_password
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > now()`,
    [tokenHash]
  );

  const row = result.rows[0];
  if (!row || !row.is_active) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
  };
}

/** Reads the session cookie in the current request context (Server Component / Route Handler). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getUserByToken(token);
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
