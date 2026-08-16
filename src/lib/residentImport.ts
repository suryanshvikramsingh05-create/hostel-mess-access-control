import { parseCsv } from "./csv";

const REQUIRED_HEADERS = ["hostel", "name", "email", "room_number"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RawResidentRow {
  hostel: string;
  name: string;
  email: string;
  roomNumber: string;
}

export type ParseResult = { error: string } | { rows: RawResidentRow[] };

/** Parses raw CSV text into resident rows, requiring the hostel/name/email/room_number columns. */
export function parseResidentCsvRows(csvText: string): ParseResult {
  const table = parseCsv(csvText);
  if (table.length === 0) {
    return { error: "CSV file is empty" };
  }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    return { error: `Missing required column(s): ${missing.join(", ")}` };
  }

  const colIndex = {
    hostel: header.indexOf("hostel"),
    name: header.indexOf("name"),
    email: header.indexOf("email"),
    roomNumber: header.indexOf("room_number"),
  };

  const dataRows = table.slice(1).filter((r) => r.some((cell) => cell.trim() !== ""));
  if (dataRows.length === 0) {
    return { error: "CSV file has no data rows" };
  }

  const rows: RawResidentRow[] = dataRows.map((r) => ({
    hostel: (r[colIndex.hostel] ?? "").trim(),
    name: (r[colIndex.name] ?? "").trim(),
    email: (r[colIndex.email] ?? "").trim(),
    roomNumber: (r[colIndex.roomNumber] ?? "").trim(),
  }));

  return { rows };
}

export type RowCategory = "valid" | "invalid" | "duplicate";

export interface ValidatedResidentRow {
  rowNumber: number;
  hostelRaw: string;
  hostelId: number | null;
  name: string;
  email: string;
  roomNumber: string;
  errors: string[];
  category: RowCategory;
}

/**
 * Validates parsed rows against known hostel ids and already-registered
 * emails, and flags duplicate emails appearing more than once in the file.
 * Pure function — no I/O — so it can be unit-tested without a database.
 */
export function validateResidentRows(
  rows: RawResidentRow[],
  validHostelIds: Set<number>,
  existingEmailsLower: Set<string>
): ValidatedResidentRow[] {
  const emailCounts = new Map<string, number>();
  for (const r of rows) {
    const key = r.email.toLowerCase();
    if (key) emailCounts.set(key, (emailCounts.get(key) ?? 0) + 1);
  }

  return rows.map((r, i) => {
    const errors: string[] = [];
    const hostelId = /^\d+$/.test(r.hostel) ? Number(r.hostel) : null;

    if (!r.hostel) {
      errors.push("Hostel is required");
    } else if (hostelId === null || !validHostelIds.has(hostelId)) {
      errors.push(`Hostel "${r.hostel}" does not exist`);
    }

    if (!r.name) errors.push("Name is required");

    if (!r.email) {
      errors.push("Email is required");
    } else if (!EMAIL_RE.test(r.email)) {
      errors.push("Invalid email format");
    }

    if (!r.roomNumber) errors.push("Room number is required");

    let category: RowCategory = errors.length > 0 ? "invalid" : "valid";

    if (r.email && EMAIL_RE.test(r.email)) {
      const key = r.email.toLowerCase();
      const isDupInFile = (emailCounts.get(key) ?? 0) > 1;
      const isDupInDb = existingEmailsLower.has(key);
      if (isDupInFile || isDupInDb) {
        if (category === "valid") category = "duplicate";
        errors.push(isDupInDb ? "Email already exists" : "Duplicate email in file");
      }
    }

    return {
      rowNumber: i + 1,
      hostelRaw: r.hostel,
      hostelId,
      name: r.name,
      email: r.email,
      roomNumber: r.roomNumber,
      errors,
      category,
    };
  });
}
