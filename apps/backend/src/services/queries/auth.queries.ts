import { pool } from '../../db/index.js';

export const getUserPasswordHashById = async (userId: string) => {
  const res = await pool.query('SELECT email, password_hash FROM users WHERE id = $1', [userId]);
  return res.rows[0];
};

export const saveRefreshToken = async (userId: string, tenantId: string, tokenHash: string, expiresAt: Date, ipAddress: string, userAgent: string) => {
  const dbTenantId = tenantId === 'SYSTEM' ? null : tenantId;
  const query = `
    INSERT INTO refresh_tokens (user_id, tenant_id, token_hash, expires_at, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6);
  `;
  await pool.query(query, [userId, dbTenantId, tokenHash, expiresAt, ipAddress, userAgent]);
};

export const getRefreshToken = async (tokenHash: string) => {
  const res = await pool.query('SELECT * FROM refresh_tokens WHERE token_hash = $1 AND is_revoked = FALSE', [tokenHash]);
  return res.rows[0];
};

export const getRefreshTokenAbsolute = async (tokenHash: string) => {
  const res = await pool.query('SELECT * FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
  return res.rows[0];
};

export const revokeRefreshToken = async (tokenHash: string) => {
  await pool.query('UPDATE refresh_tokens SET is_revoked = TRUE WHERE token_hash = $1', [tokenHash]);
};

export const cleanupExpiredTokens = async () => {
  const tokenQuery = `
    DELETE FROM refresh_tokens 
    WHERE is_revoked = TRUE OR expires_at < CURRENT_TIMESTAMP;
  `;
  const inviteQuery = `
    DELETE FROM invitations 
    WHERE status IN ('EXPIRED', 'ACCEPTED') OR expires_at < CURRENT_TIMESTAMP;
  `;
  
  const tokenRes = await pool.query(tokenQuery);
  const inviteRes = await pool.query(inviteQuery);
  
  return {
    tokensDeleted: tokenRes.rowCount,
    invitesDeleted: inviteRes.rowCount
  };
};

export const createInvitation = async (tenantId: string, email: string, tokenHash: string, invitedBy: string | null, expiresAt: Date, firstName?: string, lastName?: string, customProfileData?: any, employeeId?: string) => {
  const query = `
    INSERT INTO invitations (tenant_id, email, token_hash, invited_by, expires_at, first_name, last_name, custom_profile_data, employee_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, token_hash;
  `;
  const res = await pool.query(query, [
    tenantId, email, tokenHash, invitedBy, expiresAt, 
    firstName || null, lastName || null, JSON.stringify(customProfileData || {}), employeeId || null
  ]);
  return res.rows[0];
};

export const getInvitationByHash = async (tokenHash: string) => {
  const query = `
    SELECT * FROM invitations 
    WHERE token_hash = $1 AND status = 'PENDING' AND expires_at > CURRENT_TIMESTAMP;
  `;
  const res = await pool.query(query, [tokenHash]);
  return res.rows[0];
};

export const getPendingInvitationsByTenant = async (tenantId: string) => {
  const query = `
    SELECT id, email, expires_at, created_at 
    FROM invitations 
    WHERE tenant_id = $1 AND status = 'PENDING' AND expires_at > CURRENT_TIMESTAMP
    ORDER BY created_at DESC;
  `;
  const res = await pool.query(query, [tenantId]);
  return res.rows;
};

export const updateInvitationStatus = async (id: string, status: 'ACCEPTED' | 'EXPIRED') => {
  await pool.query('UPDATE invitations SET status = $2 WHERE id = $1', [id, status]);
};

export const deleteInvitation = async (inviteId: string, tenantId: string) => {
  const query = `
    DELETE FROM invitations 
    WHERE id = $1 AND tenant_id = $2 
    RETURNING id;
  `;
  const res = await pool.query(query, [inviteId, tenantId]);
  return res.rows[0];
};

export const revokeAllUserTokensInWorkspace = async (userId: string, tenantId: string) => {
  const query = `
    UPDATE refresh_tokens 
    SET is_revoked = TRUE 
    WHERE user_id = $1 AND tenant_id = $2;
  `;
  await pool.query(query, [userId, tenantId]);
};

export const getActiveSessions = async (tenantId: string) => {
  const res = await pool.query(
    `SELECT r.id, r.created_at, r.expires_at, r.ip_address, r.user_agent, u.email, u.first_name, u.last_name
     FROM refresh_tokens r
     JOIN users u ON r.user_id = u.id
     WHERE r.tenant_id = $1 AND r.is_revoked = FALSE AND r.expires_at > NOW()
     ORDER BY r.created_at DESC`,
    [tenantId]
  );
  return res.rows;
};

export const revokeSession = async (tenantId: string, tokenId: string) => {
  const res = await pool.query(
    `UPDATE refresh_tokens 
     SET is_revoked = TRUE 
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [tokenId, tenantId]
  );
  return res.rows[0];
};

export const updateUserPassword = async (email: string, passwordHash: string) => {
  const query = `
    UPDATE users SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
    WHERE email = $1
    RETURNING id;
  `;
  const res = await pool.query(query, [email, passwordHash]);
  return res.rows[0];
};

export const revokeAllUserTokensGlobally = async (userId: string) => {
  await pool.query('UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1', [userId]);
};

export const getGlobalUserById = async (userId: string) => {
  const res = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  return res.rows[0];
};

export const getUserByEmailForAuth = async (email: string) => {
  const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return res.rows[0];
};