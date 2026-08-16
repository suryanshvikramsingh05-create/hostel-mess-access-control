import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireRole, authErrorResponse, getWardenHostelId } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { generateToken } from "@/lib/ids";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("admin", "warden");
    const hostelIdParam = req.nextUrl.searchParams.get("hostelId");

    let hostelFilter: number | null = null;
    if (user.role === "warden") {
      hostelFilter = await getWardenHostelId(user.id);
    } else if (hostelIdParam) {
      hostelFilter = Number(hostelIdParam);
    }

    const result = hostelFilter
      ? await pool.query(
          `SELECT id, hostel_id, name, is_active, created_at FROM messes WHERE hostel_id = $1 ORDER BY name`,
          [hostelFilter]
        )
      : await pool.query(
          `SELECT id, hostel_id, name, is_active, created_at FROM messes ORDER BY name`
        );

    return NextResponse.json({ messes: result.rows });
  } catch (err) {
    return authErrorResponse(err);
  }
}

const createSchema = z.object({
  hostelId: z.number().int().positive(),
  name: z.string().min(2),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("admin");
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { hostelId, name } = parsed.data;

    const result = await pool.query(
      `INSERT INTO messes (hostel_id, name, qr_token) VALUES ($1, $2, $3)
       RETURNING id, hostel_id, name, is_active, created_at`,
      [hostelId, name, generateToken(24)]
    );
    const mess = result.rows[0];

    await recordAudit({
      actorUserId: user.id,
      action: "mess_created",
      targetType: "mess",
      targetId: mess.id,
      details: { hostelId, name },
    });

    return NextResponse.json({ mess }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return NextResponse.json({ error: "A mess with this name already exists for this hostel" }, { status: 409 });
    }
    return authErrorResponse(err);
  }
}
