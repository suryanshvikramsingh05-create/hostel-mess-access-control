import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireRole, authErrorResponse } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("admin");
    const { id } = await params;
    const parsed = updateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { name, address, isActive } = parsed.data;

    const result = await pool.query(
      `UPDATE hostels SET
         name = COALESCE($1, name),
         address = COALESCE($2, address),
         is_active = COALESCE($3, is_active),
         updated_at = now()
       WHERE id = $4
       RETURNING id, name, address, is_active, created_at`,
      [name ?? null, address ?? null, isActive ?? null, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    await recordAudit({
      actorUserId: user.id,
      action: "hostel_updated",
      targetType: "hostel",
      targetId: id,
      details: parsed.data,
    });

    return NextResponse.json({ hostel: result.rows[0] });
  } catch (err) {
    return authErrorResponse(err);
  }
}
