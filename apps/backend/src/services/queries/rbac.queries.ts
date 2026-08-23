import { pool } from '../../db/index.js';

// ==========================================
// TENANT-DEFINED ROLES
// ==========================================
export const createRole = async (tenantId: string | null, name: string, description: string, isSystemTemplate: boolean = false) => {
  const query = `
    INSERT INTO roles (tenant_id, name, description, is_system_template) 
    VALUES ($1, $2, $3, $4) 
    RETURNING *;
  `;
  const res = await pool.query(query, [tenantId, name, description, isSystemTemplate]);
  return res.rows[0];
};

export const getRolesByTenant = async (tenantId: string) => {
  const res = await pool.query(
    `SELECT r.id, r.name, r.description, r.is_system_template, r.created_at,
       COALESCE(
         json_agg(
           json_build_object('moduleId', rm.module_id, 'accessLevel', rm.access_level)
         ) FILTER (WHERE rm.module_id IS NOT NULL), '[]'::json
       ) as bundles
     FROM roles r
     LEFT JOIN role_modules rm ON r.id = rm.role_id
     WHERE r.tenant_id = $1 OR r.is_system_template = TRUE
     GROUP BY r.id
     ORDER BY r.is_system_template DESC, r.created_at DESC`,
    [tenantId]
  );
  return res.rows;
};

export const getRoleUsers = async (tenantId: string, roleId: string) => {
  const res = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, wm.status 
     FROM users u
     JOIN user_roles ur ON u.id = ur.user_id
     JOIN workspace_memberships wm ON u.id = wm.user_id
     WHERE ur.role_id = $1 AND wm.tenant_id = $2
     ORDER BY u.first_name ASC`,
    [roleId, tenantId]
  );
  return res.rows;
};

export const updateRole = async (roleId: string, tenantId: string, name: string, description: string) => {
  const query = `
    UPDATE roles 
    SET name = $1, description = $2
    WHERE id = $3 AND tenant_id = $4 AND is_system_template = FALSE
    RETURNING *;
  `;
  const res = await pool.query(query, [name, description, roleId, tenantId]);
  return res.rows[0];
};

export const clearRoleBundles = async (roleId: string) => {
  await pool.query('DELETE FROM role_modules WHERE role_id = $1', [roleId]);
};

export const deleteRole = async (roleId: string, tenantId: string) => {
  const query = `
    DELETE FROM roles 
    WHERE id = $1 AND tenant_id = $2 AND is_system_template = FALSE
    RETURNING id;
  `;
  const res = await pool.query(query, [roleId, tenantId]);
  return res.rows[0];
};

// Resolves the "Blank Slate" problem instantly for new companies
export const cloneSystemRolesToTenant = async (tenantId: string) => {
  const query = `
    INSERT INTO roles (tenant_id, name, description, is_system_template)
    SELECT $1, name, description, FALSE
    FROM roles WHERE is_system_template = TRUE
    ON CONFLICT DO NOTHING;
  `;
  await pool.query(query, [tenantId]);
};

// ==========================================
// SYSTEM ROLE TEMPLATES (SUPERADMIN ONLY)
// ==========================================
export const getSystemRoleTemplates = async () => {
  const res = await pool.query(`
    SELECT r.id, r.name, r.description, r.is_system_template, r.created_at,
       COALESCE(
         json_agg(
           json_build_object('moduleId', rm.module_id, 'accessLevel', rm.access_level)
         ) FILTER (WHERE rm.module_id IS NOT NULL), '[]'::json
       ) as bundles
     FROM roles r
     LEFT JOIN role_modules rm ON r.id = rm.role_id
     WHERE r.is_system_template = TRUE
     GROUP BY r.id
     ORDER BY r.created_at DESC
  `);
  return res.rows;
};

export const updateSystemRoleTemplate = async (roleId: string, name: string, description: string) => {
  const query = `
    UPDATE roles 
    SET name = $1, description = $2
    WHERE id = $3 AND is_system_template = TRUE
    RETURNING *;
  `;
  const res = await pool.query(query, [name, description, roleId]);
  return res.rows[0];
};

export const deleteSystemRoleTemplate = async (roleId: string) => {
  const query = `
    DELETE FROM roles 
    WHERE id = $1 AND is_system_template = TRUE
    RETURNING id;
  `;
  const res = await pool.query(query, [roleId]);
  return res.rows[0];
};

// ==========================================
// ROLE BUNDLING & USER ASSIGNMENT
// ==========================================
export const bundleRoleModule = async (roleId: string, moduleId: string, accessLevel: 'READ' | 'WRITE') => {
  const query = `
    INSERT INTO role_modules (role_id, module_id, access_level)
    VALUES ($1, $2, $3)
    ON CONFLICT (role_id, module_id) DO UPDATE SET access_level = EXCLUDED.access_level;
  `;
  await pool.query(query, [roleId, moduleId, accessLevel]);
};

export const assignUserRole = async (userId: string, tenantId: string, roleId: string, assignedBy: string) => {
  const query = `
    INSERT INTO user_roles (user_id, tenant_id, role_id, assigned_by)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, tenant_id, role_id) DO NOTHING;
  `;
  await pool.query(query, [userId, tenantId, roleId, assignedBy]);
};

export const revokeUserRole = async (userId: string, tenantId: string, roleId: string) => {
  const query = `DELETE FROM user_roles WHERE user_id = $1 AND tenant_id = $2 AND role_id = $3`;
  await pool.query(query, [userId, tenantId, roleId]);
};

// ==========================================
// THE FAT JWT AGGREGATOR
// ==========================================
export const getUserAccessContext = async (userId: string, tenantId: string) => {
  const rolesRes = await pool.query(`
    SELECT r.name 
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = $1 AND ur.tenant_id = $2
  `, [userId, tenantId]);
  
  const roles = rolesRes.rows.map(r => r.name);

  const accessRes = await pool.query(`
    SELECT 
      a.name AS app_name, 
      m.name AS module_name, 
      COALESCE(umo.access_level, rm.access_level) AS final_access
    FROM apps a
    JOIN tenant_app_allocations taa ON a.id = taa.app_id
    JOIN modules m ON a.id = m.app_id
    LEFT JOIN (
      SELECT rm.module_id, rm.access_level
      FROM user_roles ur
      JOIN role_modules rm ON ur.role_id = rm.role_id
      WHERE ur.user_id = $1 AND ur.tenant_id = $2
    ) rm ON m.id = rm.module_id
    LEFT JOIN user_module_overrides umo 
      ON m.id = umo.module_id AND umo.user_id = $1 AND umo.tenant_id = $2
    WHERE taa.tenant_id = $2
      AND (rm.access_level IS NOT NULL OR umo.access_level IS NOT NULL)
  `, [userId, tenantId]);

  const entitlements: Record<string, Record<string, string>> = {};
  
  for (const row of accessRes.rows) {
    if (row.final_access === 'NONE') continue; // Block overrides are excluded from the JWT

    const appName = row.app_name.toLowerCase();
    const moduleName = row.module_name.toLowerCase();

    if (!entitlements[appName]) entitlements[appName] = {};
    if (entitlements[appName][moduleName] === 'WRITE') continue; 
    
    entitlements[appName][moduleName] = row.final_access;
  }

  return { roles, entitlements };
};