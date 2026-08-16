#!/usr/bin/env node
// Applies pending SQL migrations from /migrations in filename order,
// tracking applied migrations in a schema_migrations table. Safe to
// run repeatedly (idempotent) against any standard PostgreSQL database,
// including Render PostgreSQL.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "migrations");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

const ssl = process.env.PGSSL === "disable" ? undefined : { rejectUnauthorized: false };
const client = new pg.Client({ connectionString, ssl });

async function main() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const applied = new Set(
    (await client.query("SELECT filename FROM schema_migrations")).rows.map(
      (r) => r.filename
    )
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let appliedCount = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`Applying migration: ${file}`);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      appliedCount++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`Migration failed: ${file}`);
      throw err;
    }
  }

  if (appliedCount === 0) {
    console.log("No pending migrations. Database is up to date.");
  } else {
    console.log(`Applied ${appliedCount} migration(s) successfully.`);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
