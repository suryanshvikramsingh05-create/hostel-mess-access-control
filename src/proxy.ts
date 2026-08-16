import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "hmac_session";

const PROTECTED_PREFIXES = ["/admin", "/warden", "/resident"];

/**
 * Coarse redirect gate: unauthenticated visitors are bounced to /login.
 * This is a UX convenience only — every API route independently verifies
 * the session against the database and enforces role checks, since a
 * cookie's mere presence here cannot be trusted as proof of role.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/warden/:path*", "/resident/:path*"],
};
