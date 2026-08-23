import { pool } from '../../db/index.js';

export const getPlatformStats = async () => {
  const res = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM tenants WHERE status = 'ACTIVE') as active_tenants,
      (SELECT COUNT(*) FROM users) as total_global_users,
      (SELECT COALESCE(SUM(lifetime_api_calls), 0) FROM tenant_subscriptions) as total_api_requests
  `);
  return res.rows[0];
};

export const getSuperAdminAuditLogs = async () => {
  const query = `
    SELECT sal.id, sal.action, sal.ip_address, sal.created_at, sal.target_tenant_id,
           u.email as actor_email, u.first_name, u.last_name
    FROM superadmin_audit_logs sal
    LEFT JOIN users u ON sal.actor_id = u.id
    ORDER BY sal.created_at DESC
    LIMIT 100;
  `;
  const res = await pool.query(query);
  return res.rows;
};

export const logSuperAdminEvent = async (actorId: string, action: string, ipAddress: string, metadata: object = {}) => {
  const query = `
    INSERT INTO superadmin_audit_logs (actor_id, action, ip_address, metadata) 
    VALUES ($1, $2, $3, $4)
  `;
  await pool.query(query, [actorId, action, ipAddress, JSON.stringify(metadata)]);
};