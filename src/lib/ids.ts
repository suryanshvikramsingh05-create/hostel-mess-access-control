import { randomBytes, randomInt } from "node:crypto";

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[randomInt(chars.length)];
  return out;
}

export function generateResidentCode(hostelId: number): string {
  const suffix = randomInt(100000, 999999);
  return `RES-${hostelId}-${suffix}`;
}
