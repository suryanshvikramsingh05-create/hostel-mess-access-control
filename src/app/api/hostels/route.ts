import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireRole, authErrorResponse } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireRole("admin", "warden");
    const result = await pool.query(
      `SELECT id, name, address, is_active, created_at FROM hostels ORDER BY name`
    );
    return NextResponse.json({ hostels: result.rows });
  } catch (err) {
    return authErrorResponse(err);
  }
}

const createSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("admin");
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { name, address } = parsed.data;

    const result = await pool.query(
      `INSERT INTO hostels (name, address) VALUES ($1, $2) RETURNING id, name, address, is_active, created_at`,
      [name, address ?? null]
    );
    const hostel = result.rows[0];

    await recordAudit({
      actorUserId: user.id,
      action: "hostel_created",
      targetType: "hostel",
      targetId: hostel.id,
      details: { name },
    });

    return NextResponse.json({ hostel }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return NextResponse.json({ error: "A hostel with this name already exists" }, { status: 409 });
    }
    return authErrorResponse(err);
  }
}
