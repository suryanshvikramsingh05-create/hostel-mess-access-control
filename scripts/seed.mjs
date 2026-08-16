#!/usr/bin/env node
// Creates (or updates) the first admin account from env vars. Safe to run
// repeatedly. Run with `npm run seed` after `npm run migrate`.
import bcrypt from "bcryptjs";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const name = process.env.SEED_ADMIN_NAME || "System Admin";

if (!email || !password) {
  console.error("ERROR: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("ERROR: SEED_ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const ssl = process.env.PGSSL === "disable" ? undefined : { rejectUnauthorized: false };
const client = new pg.Client({ connectionString, ssl });

async function main() {
  await client.connect();
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);

  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE users SET password_hash = $1, role = 'admin', is_active = TRUE, name = $2, updated_at = now() WHERE email = $3`,
      [passwordHash, name, email]
    );
    console.log(`Updated existing admin account: ${email}`);
  } else {
    await client.query(
      `INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, 'admin', $3)`,
      [email, name, passwordHash]
    );
    console.log(`Created admin account: ${email}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
