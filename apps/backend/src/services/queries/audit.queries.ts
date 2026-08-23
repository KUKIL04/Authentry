import { pool } from '../../db/index.js';

export const logEvent = async (tenantId: string | null, actorId: string | null, eventType: string, ip: string, userAgent: string, metadata: object) => {
  const query = `
    INSERT INTO audit_logs (tenant_id, actor_id, event_type, ip_address, user_agent, metadata)
    VALUES ($1, $2, $3, $4, $5, $6);
  `;
  await pool.query(query, [tenantId, actorId, eventType, ip, userAgent, JSON.stringify(metadata)]);
};

export const getAuditLogs = async (tenantId: string, limit: number = 50) => {
  const res = await pool.query(
    `SELECT a.id, a.event_type, a.ip_address, a.user_agent, a.created_at, a.metadata, u.email as actor_email 
     FROM audit_logs a
     LEFT JOIN users u ON a.actor_id = u.id
     WHERE a.tenant_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2`,
    [tenantId, limit]
  );
  return res.rows;
};

export const getAuditLogsSince = async (tenantId: string, since: Date, limit: number = 500) => {
  const query = `
    SELECT id, event_type, actor_id, ip_address, user_agent, created_at, metadata 
    FROM audit_logs 
    WHERE tenant_id = $1 AND created_at > $2 
    ORDER BY created_at ASC 
    LIMIT $3
  `;
  const res = await pool.query(query, [tenantId, since, limit]);
  return res.rows;
};