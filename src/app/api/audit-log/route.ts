import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole, authErrorResponse } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireRole("admin");
    const params = req.nextUrl.searchParams;
    const limit = Math.min(Number(params.get("limit") ?? 50), 200);
    const offset = Math.max(Number(params.get("offset") ?? 0), 0);
    const action = params.get("action");

    const conditions: string[] = [];
    const values: unknown[] = [];
    if (action) {
      values.push(action);
      conditions.push(`al.action = $${values.length}`);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    values.push(limit);
    values.push(offset);

    const result = await pool.query(
      `SELECT al.id, al.actor_user_id, u.name AS actor_name, u.role AS actor_role,
              al.action, al.target_type, al.target_id, al.details, al.ip_address, al.created_at
       FROM audit_log al
       LEFT JOIN users u ON u.id = al.actor_user_id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return NextResponse.json({ entries: result.rows });
  } catch (err) {
    return authErrorResponse(err);
  }
}
