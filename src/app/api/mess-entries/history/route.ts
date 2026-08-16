import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole, authErrorResponse, getWardenHostelId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("admin", "warden", "resident");
    const params = req.nextUrl.searchParams;
    const limit = Math.min(Number(params.get("limit") ?? 50), 200);
    const offset = Math.max(Number(params.get("offset") ?? 0), 0);

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (user.role === "resident") {
      values.push(user.id);
      conditions.push(`me.resident_id = $${values.length}`);
    } else if (user.role === "warden") {
      const hostelId = await getWardenHostelId(user.id);
      if (!hostelId) return NextResponse.json({ entries: [] });
      values.push(hostelId);
      conditions.push(`r.hostel_id = $${values.length}`);
    } else {
      const residentIdParam = params.get("residentId");
      const hostelIdParam = params.get("hostelId");
      if (residentIdParam) {
        values.push(Number(residentIdParam));
        conditions.push(`me.resident_id = $${values.length}`);
      }
      if (hostelIdParam) {
        values.push(Number(hostelIdParam));
        conditions.push(`r.hostel_id = $${values.length}`);
      }
    }

    const statusParam = params.get("status");
    if (statusParam === "approved" || statusParam === "rejected") {
      values.push(statusParam);
      conditions.push(`me.status = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    values.push(limit);
    values.push(offset);

    const result = await pool.query(
      `SELECT me.id, me.resident_id, u.name AS resident_name, r.resident_code, r.room_number,
              me.mess_id, mz.name AS mess_name, me.meal_type, me.entry_date, me.entry_time,
              me.status, me.rejection_reason, me.verified_by, vb.name AS verified_by_name
       FROM mess_entries me
       JOIN residents r ON r.user_id = me.resident_id
       JOIN users u ON u.id = me.resident_id
       JOIN messes mz ON mz.id = me.mess_id
       LEFT JOIN users vb ON vb.id = me.verified_by
       ${whereClause}
       ORDER BY me.entry_time DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return NextResponse.json({ entries: result.rows });
  } catch (err) {
    return authErrorResponse(err);
  }
}
