import { pool } from '../../db/index.js';

// ==========================================
// APPS (The Physical Software Suites)
// ==========================================
export const createApp = async (name: string, description: string, productionUrl: string, clientId: string, clientSecretHash: string) => {
  const query = `
    INSERT INTO apps (name, description, production_url, client_id, client_secret_hash)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, client_id;
  `;
  const res = await pool.query(query, [name, description || null, productionUrl, clientId, clientSecretHash]);
  return res.rows[0];
};

export const getAllApps = async () => {
  const res = await pool.query('SELECT id, name, description, production_url, client_id, created_at FROM apps ORDER BY created_at DESC');
  return res.rows;
};

export const getAppByName = async (appName: string) => {
  const query = `SELECT id, production_url FROM apps WHERE LOWER(name) = LOWER($1)`;
  const res = await pool.query(query, [appName]);
  return res.rows[0];
};

// ==========================================
// MODULES (The Granular Sub-Features)
// ==========================================
export const createAppModule = async (appId: string, name: string, description: string) => {
  const query = `
    INSERT INTO modules (app_id, name, description)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const res = await pool.query(query, [appId, name, description]);
  return res.rows[0];
};

export const getModulesByApp = async (appId: string) => {
  const res = await pool.query('SELECT * FROM modules WHERE app_id = $1 ORDER BY name ASC', [appId]);
  return res.rows;
};

// ==========================================
// THE ENTITLEMENT MATRIX (Allocations)
// ==========================================
export const allocateAppToTenant = async (tenantId: string, appId: string, superAdminId: string) => {
  const query = `
    INSERT INTO tenant_app_allocations (tenant_id, app_id, allocated_by)
    VALUES ($1, $2, $3)
    ON CONFLICT (tenant_id, app_id) DO NOTHING
    RETURNING *;
  `;
  const res = await pool.query(query, [tenantId, appId, superAdminId]);
  return res.rows[0];
};

export const verifyAppAllocation = async (appId: string, tenantId: string): Promise<boolean> => {
  const query = `SELECT 1 FROM tenant_app_allocations WHERE app_id = $1 AND tenant_id = $2`;
  const res = await pool.query(query, [appId, tenantId]);
  return res.rows.length > 0;
};

export const revokeAppFromTenant = async (tenantId: string, appId: string) => {
  // Our PostgreSQL trigger 'trigger_cleanup_revoked_app' automatically cascades 
  // and scrubs all role bundles and overrides tied to this app for this tenant!
  await pool.query('DELETE FROM tenant_app_allocations WHERE tenant_id = $1 AND app_id = $2', [tenantId, appId]);
};

export const getAppsByTenant = async (tenantId: string) => {
  const query = `
    SELECT a.id, a.name, a.description, a.production_url, taa.allocated_at
    FROM apps a
    JOIN tenant_app_allocations taa ON a.id = taa.app_id
    WHERE taa.tenant_id = $1
    ORDER BY a.name ASC;
  `;
  const res = await pool.query(query, [tenantId]);
  return res.rows;
};

// Fetch all tenant IDs that are licensed to use a specific Client Application
export const getAllocatedTenantsForClient = async (clientId: string): Promise<string[]> => {
  const query = `
    SELECT taa.tenant_id 
    FROM tenant_app_allocations taa
    JOIN apps a ON taa.app_id = a.id
    WHERE a.client_id = $1
  `;
  const res = await pool.query(query, [clientId]);
  // Map it directly to a clean array of UUID strings
  return res.rows.map(r => r.tenant_id);
};

// REPLACES: assignUserModule
export const assignUserModuleOverride = async (userId: string, tenantId: string, moduleId: string, accessLevel: 'READ'|'WRITE'|'NONE', assignedBy: string) => {
  const query = `
    INSERT INTO user_module_overrides (user_id, tenant_id, module_id, access_level, assigned_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, tenant_id, module_id) 
    DO UPDATE SET access_level = EXCLUDED.access_level, assigned_by = EXCLUDED.assigned_by;
  `;
  await pool.query(query, [userId, tenantId, moduleId, accessLevel, assignedBy]);
};

// REPLACES: getUserAccessibleModules (For the Tenant Admin UI)
export const getUserModuleOverrides = async (userId: string, tenantId: string) => {
  const query = `
    SELECT 
      a.name AS app_name, 
      m.id AS module_id, 
      m.name AS module_name, 
      umo.access_level 
    FROM user_module_overrides umo
    JOIN modules m ON umo.module_id = m.id
    JOIN apps a ON m.app_id = a.id
    WHERE umo.user_id = $1 AND umo.tenant_id = $2;
  `;
  const res = await pool.query(query, [userId, tenantId]);
  return res.rows;
};

// REPLACES: getModuleUsers
export const getModuleUsers = async (tenantId: string, moduleId: string) => {
  const query = `
    SELECT DISTINCT 
      u.id, 
      u.email, 
      u.first_name, 
      u.last_name, 
      wm.status,
      COALESCE(umo.access_level, rm.access_level) AS final_access_level,
      CASE 
        WHEN umo.access_level IS NOT NULL THEN 'OVERRIDE' 
        ELSE 'ROLE_BUNDLE' 
      END AS grant_source
    FROM users u
    JOIN workspace_memberships wm ON u.id = wm.user_id
    
    -- 1. Check if they have it via a Role Bundle
    LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.tenant_id = wm.tenant_id
    LEFT JOIN role_modules rm ON ur.role_id = rm.role_id AND rm.module_id = $1
    
    -- 2. Check if they have an explicit Override
    LEFT JOIN user_module_overrides umo ON u.id = umo.user_id AND umo.tenant_id = wm.tenant_id AND umo.module_id = $1
    
    -- Filter: They must belong to the tenant, and they must have access via one of the two paths (and not be explicitly blocked)
    WHERE wm.tenant_id = $2
      AND (rm.module_id IS NOT NULL OR umo.module_id IS NOT NULL)
      AND COALESCE(umo.access_level, rm.access_level) != 'NONE'
    ORDER BY u.first_name ASC;
  `;
  const res = await pool.query(query, [moduleId, tenantId]);
  return res.rows;
};

// REPLACES: revokeModuleAccess
export const removeUserModuleOverride = async (userId: string, tenantId: string, moduleId: string) => {
  const query = `
    DELETE FROM user_module_overrides 
    WHERE user_id = $1 AND tenant_id = $2 AND module_id = $3
    RETURNING *;
  `;
  const res = await pool.query(query, [userId, tenantId, moduleId]);
  return res.rows[0];
};

// ==========================================
// M2M CREDENTIALS
// ==========================================
export const rotateAppCredentials = async (appId: string, clientId: string, clientSecretHash: string) => {
  const query = `
    UPDATE apps 
    SET client_id = $1, client_secret_hash = $2 
    WHERE id = $3 
    RETURNING id, name, client_id;
  `;
  const res = await pool.query(query, [clientId, clientSecretHash, appId]);
  return res.rows[0];
};

export const getAppCredentials = async (appId: string) => {
  const query = `SELECT id, name, client_id FROM apps WHERE id = $1`;
  const res = await pool.query(query, [appId]);
  return res.rows[0];
};