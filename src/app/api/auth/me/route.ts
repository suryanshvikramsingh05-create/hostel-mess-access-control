import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getResidentProfile, getWardenHostelId } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });

  let extra: Record<string, unknown> = {};
  if (user.role === "resident") {
    const profile = await getResidentProfile(user.id);
    extra = { residentProfile: profile };
  } else if (user.role === "warden") {
    const hostelId = await getWardenHostelId(user.id);
    extra = { hostelId };
  }

  return NextResponse.json({ user: { ...user, ...extra } });
}
