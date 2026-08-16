import type { PoolClient } from "pg";
import { getPool } from "./db";

interface AuditEntry {
  actorUserId: number | null;
  action: string;
  targetType?: string;
  targetId?: string | number;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

/** Records an audit trail row. Pass `client` to include it inside an existing transaction. */
export async function recordAudit(entry: AuditEntry, client?: PoolClient): Promise<void> {
  const runner = client ?? getPool();
  await runner.query(
    `INSERT INTO audit_log (actor_user_id, action, target_type, target_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      entry.actorUserId,
      entry.action,
      entry.targetType ?? null,
      entry.targetId != null ? String(entry.targetId) : null,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ipAddress ?? null,
    ]
  );
}
