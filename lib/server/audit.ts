import { query } from './db';

export interface AuditEntry {
  userId?: string | null;
  sessionId?: string | null;
  endpoint: string;
  ipAddress?: string | null;
  statusCode: number;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  await query(
    `INSERT INTO audit_log (user_id, session_id, endpoint, ip_address, status_code)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      entry.userId ?? null,
      entry.sessionId ?? null,
      entry.endpoint,
      entry.ipAddress ?? null,
      entry.statusCode,
    ],
  );
}
