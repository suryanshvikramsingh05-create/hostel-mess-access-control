import type { PoolClient } from "pg";
import { hashPassword } from "./password";
import { generateResidentCode, generateTempPassword, generateToken } from "./ids";

export interface NewResidentInput {
  name: string;
  email: string;
  roomNumber: string;
  hostelId: number;
}

export interface CreatedResident {
  userId: number;
  residentCode: string;
  tempPassword: string;
}

/**
 * Shared resident-creation routine used by both the single "Add a resident"
 * flow and CSV bulk import, so every resident is created with the exact same
 * login/temp-password/QR-token generation regardless of entry point. Must
 * run inside an open transaction (see withTransaction in ./db).
 */
export async function createResidentRecord(
  client: PoolClient,
  { name, email, roomNumber, hostelId }: NewResidentInput
): Promise<CreatedResident> {
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const residentCode = generateResidentCode(hostelId);
  const qrToken = generateToken(24);

  const userResult = await client.query<{ id: number }>(
    `INSERT INTO users (email, name, role, password_hash, must_change_password)
     VALUES ($1, $2, 'resident', $3, TRUE)
     RETURNING id`,
    [email, name, passwordHash]
  );
  const userId = userResult.rows[0].id;

  await client.query(
    `INSERT INTO residents (user_id, resident_code, hostel_id, room_number, qr_token)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, residentCode, hostelId, roomNumber, qrToken]
  );

  return { userId, residentCode, tempPassword };
}
