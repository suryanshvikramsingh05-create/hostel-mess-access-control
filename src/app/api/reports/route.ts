import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole, authErrorResponse, getWardenHostelId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("admin", "warden");
    const params = req.nextUrl.searchParams;
    const from = params.get("from") ?? new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const to = params.get("to") ?? new Date().toISOString().slice(0, 10);

    let hostelId: number | null = null;
    if (user.role === "warden") {
      hostelId = await getWardenHostelId(user.id);
      if (!hostelId) {
        return NextResponse.json({ daily: [], byMeal: [], byMess: [], totals: { approved: 0, rejected: 0 } });
      }
    } else {
      const q = params.get("hostelId");
      if (q) hostelId = Number(q);
    }

    const hostelFilter = hostelId ? "AND r.hostel_id = $3" : "";
    const values: unknown[] = [from, to];
    if (hostelId) values.push(hostelId);

    const dailyResult = await pool.query(
      `SELECT me.entry_date, me.status, COUNT(*)::int AS count
       FROM mess_entries me
       JOIN residents r ON r.user_id = me.resident_id
       WHERE me.entry_date BETWEEN $1 AND $2 ${hostelFilter}
       GROUP BY me.entry_date, me.status
       ORDER BY me.entry_date`,
      values
    );

    const byMealResult = await pool.query(
      `SELECT me.meal_type, me.status, COUNT(*)::int AS count
       FROM mess_entries me
       JOIN residents r ON r.user_id = me.resident_id
       WHERE me.entry_date BETWEEN $1 AND $2 ${hostelFilter}
       GROUP BY me.meal_type, me.status
       ORDER BY me.meal_type`,
      values
    );

    const byMessResult = await pool.query(
      `SELECT mz.id AS mess_id, mz.name AS mess_name, me.status, COUNT(*)::int AS count
       FROM mess_entries me
       JOIN residents r ON r.user_id = me.resident_id
       JOIN messes mz ON mz.id = me.mess_id
       WHERE me.entry_date BETWEEN $1 AND $2 ${hostelFilter}
       GROUP BY mz.id, mz.name, me.status
       ORDER BY mz.name`,
      values
    );

    const totalsResult = await pool.query(
      `SELECT me.status, COUNT(*)::int AS count
       FROM mess_entries me
       JOIN residents r ON r.user_id = me.resident_id
       WHERE me.entry_date BETWEEN $1 AND $2 ${hostelFilter}
       GROUP BY me.status`,
      values
    );

    const totals = { approved: 0, rejected: 0 };
    for (const row of totalsResult.rows as { status: "approved" | "rejected"; count: number }[]) {
      totals[row.status] = row.count;
    }

    return NextResponse.json({
      daily: dailyResult.rows,
      byMeal: byMealResult.rows,
      byMess: byMessResult.rows,
      totals,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
