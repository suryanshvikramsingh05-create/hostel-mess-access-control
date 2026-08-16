import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool, withTransaction } from "@/lib/db";
import { requireRole, authErrorResponse } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { createResidentRecord } from "@/lib/residents";
import { parseResidentCsvRows, validateResidentRows } from "@/lib/residentImport";

const MAX_ROWS = 2000;

const bodySchema = z.object({
  csvText: z.string().min(1),
  confirm: z.boolean().optional().default(false),
});

/**
 * Admin-only CSV bulk import for residents. Always parses + validates the
 * CSV; only actually creates residents (via the same createResidentRecord
 * routine the single "Add a resident" flow uses) when `confirm: true`, and
 * only for rows that passed validation — invalid/duplicate rows are simply
 * skipped, never partially inserted.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("admin");
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { csvText, confirm } = parsed.data;

    const parsedCsv = parseResidentCsvRows(csvText);
    if ("error" in parsedCsv) {
      return NextResponse.json({ error: parsedCsv.error }, { status: 400 });
    }
    if (parsedCsv.rows.length > MAX_ROWS) {
      return NextResponse.json({ error: `Too many rows (max ${MAX_ROWS})` }, { status: 400 });
    }

    const hostelsResult = await pool.query<{ id: number }>(`SELECT id FROM hostels`);
    const validHostelIds = new Set(hostelsResult.rows.map((h) => h.id));

    const candidateEmails = Array.from(
      new Set(parsedCsv.rows.map((r) => r.email.trim().toLowerCase()).filter(Boolean))
    );
    const existingEmailsLower = new Set<string>();
    if (candidateEmails.length > 0) {
      const existingResult = await pool.query<{ email: string }>(
        `SELECT lower(email::text) AS email FROM users WHERE lower(email::text) = ANY($1)`,
        [candidateEmails]
      );
      for (const row of existingResult.rows) existingEmailsLower.add(row.email);
    }

    const validatedRows = validateResidentRows(parsedCsv.rows, validHostelIds, existingEmailsLower);
    const summary = {
      total: validatedRows.length,
      valid: validatedRows.filter((r) => r.category === "valid").length,
      duplicate: validatedRows.filter((r) => r.category === "duplicate").length,
      invalid: validatedRows.filter((r) => r.category === "invalid").length,
    };

    if (!confirm) {
      return NextResponse.json({ preview: true, rows: validatedRows, summary });
    }

    const imported: {
      name: string;
      email: string;
      roomNumber: string;
      hostelId: number;
      residentCode: string;
      tempPassword: string;
    }[] = [];
    const failed: { rowNumber: number; email: string; error: string }[] = [];

    for (const row of validatedRows) {
      if (row.category !== "valid" || row.hostelId === null) continue;
      try {
        const created = await withTransaction((client) =>
          createResidentRecord(client, {
            name: row.name,
            email: row.email,
            roomNumber: row.roomNumber,
            hostelId: row.hostelId as number,
          })
        );
        imported.push({
          name: row.name,
          email: row.email,
          roomNumber: row.roomNumber,
          hostelId: row.hostelId,
          residentCode: created.residentCode,
          tempPassword: created.tempPassword,
        });
      } catch (err: unknown) {
        const isUniqueViolation = err && typeof err === "object" && "code" in err && err.code === "23505";
        failed.push({
          rowNumber: row.rowNumber,
          email: row.email,
          error: isUniqueViolation ? "Email already exists" : "Could not create resident",
        });
      }
    }

    await recordAudit({
      actorUserId: user.id,
      action: "residents_bulk_imported",
      details: {
        totalRows: summary.total,
        imported: imported.length,
        failed: failed.length,
        skippedDuplicate: summary.duplicate,
        skippedInvalid: summary.invalid,
      },
    });

    return NextResponse.json({
      preview: false,
      imported,
      failed,
      summary: {
        ...summary,
        importedCount: imported.length,
        failedCount: failed.length,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
