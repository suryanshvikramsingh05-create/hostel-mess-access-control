import { Pool, type PoolClient, type QueryResultRow } from "pg";

declare global {
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  // Intentionally does not read/validate DATABASE_URL eagerly: pg.Pool
  // connects lazily on first use, and Next.js imports route modules at
  // build time (to collect route metadata) in environments where env
  // vars like a Render-provisioned DATABASE_URL are not yet available.
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "disable" ? undefined : { rejectUnauthorized: false },
    max: 10,
  });
}

/** Returns the shared connection pool, creating it on first use. */
export function getPool(): Pool {
  if (!globalThis.__pgPool) {
    globalThis.__pgPool = createPool();
  }
  return globalThis.__pgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return getPool().query<T>(text, params);
}

/**
 * Runs `fn` inside a single client checked out from the pool with an open
 * transaction. Commits on success, rolls back on any thrown error. Use for
 * any operation that must be atomic (e.g. daily mess-entry limit checks).
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Proxy object exposing the same shape as a `pg.Pool` while deferring pool
 * creation until first property access. Prefer this for call sites that
 * used to do `pool.query(...)` directly; the pool itself will only be
 * constructed the first time a query actually runs.
 */
export const pool = {
  query: <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) =>
    getPool().query<T>(text, params),
  connect: () => getPool().connect(),
};
