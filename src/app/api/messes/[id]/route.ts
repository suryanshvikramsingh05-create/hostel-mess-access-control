import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireRole, authErrorResponse } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
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
    const { name, isActive } = parsed.data;

    const result = await pool.query(
      `UPDATE messes SET
         name = COALESCE($1, name),
         is_active = COALESCE($2, is_active),
         updated_at = now()
       WHERE id = $3
       RETURNING id, hostel_id, name, is_active, created_at`,
      [name ?? null, isActive ?? null, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Mess not found" }, { status: 404 });
    }

    await recordAudit({
      actorUserId: user.id,
      action: "mess_updated",
      targetType: "mess",
      targetId: id,
      details: parsed.data,
    });

    return NextResponse.json({ mess: result.rows[0] });
  } catch (err) {
    return authErrorResponse(err);
  }
}
