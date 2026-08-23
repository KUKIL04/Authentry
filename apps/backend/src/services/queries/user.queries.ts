import { pool } from '../../db/index.js';

export const createUser = async (userData: {
  tenantId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  mobileNo: string;
  countryCode?: string;
  isTenantAdmin: boolean;
  status: 'PENDING' | 'ACTIVE' | 'UNVERIFIED';
  customProfileData: any;
  employeeId?: string;
}) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const userQuery = `
      INSERT INTO users (
        email, password_hash, first_name, middle_name, last_name, mobile_no, country_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, first_name, last_name;
    `;
    const userValues = [
      userData.email, 
      userData.passwordHash, 
      userData.firstName, 
      userData.middleName || null, 
      userData.lastName,
      userData.mobileNo,
      userData.countryCode || '91'
    ];
    
    const userRes = await client.query(userQuery, userValues);
    const newUser = userRes.rows[0];

    const wmQuery = `
      INSERT INTO workspace_memberships (user_id, tenant_id, status, is_tenant_admin, custom_profile_data, employee_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING status, is_tenant_admin;
    `;
    const wmRes = await client.query(wmQuery, [newUser.id, userData.tenantId, userData.status, userData.isTenantAdmin, JSON.stringify(userData.customProfileData || {}), userData.employeeId || null]);
    const newWm = wmRes.rows[0];

    await client.query('COMMIT');

    return {
      id: newUser.id,
      tenant_id: userData.tenantId,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      status: newWm.status,
      is_tenant_admin: newWm.is_tenant_admin
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const getUserProfileData = async (userId: string, tenantId: string) => {
  const res = await pool.query(
    'SELECT custom_profile_data FROM workspace_memberships WHERE user_id = $1 AND tenant_id = $2',
    [userId, tenantId]
  );
  let rawData = res.rows[0]?.custom_profile_data || {};
  if (typeof rawData === 'string') {
    try { rawData = JSON.parse(rawData); } catch(e) { rawData = {}; }
  }
  return rawData;
};

export const updateUserProfileData = async (userId: string, tenantId: string, data: any) => {
  await pool.query(
    'UPDATE workspace_memberships SET custom_profile_data = $1 WHERE user_id = $2 AND tenant_id = $3',
    [JSON.stringify(data), userId, tenantId]
  );
};

export const updateUserPlatformDetails = async (userId: string, data: { firstName: string; middleName?: string; lastName: string; mobileNo?: string }) => {
  const query = `
    UPDATE users 
    SET first_name = $1, middle_name = $2, last_name = $3, mobile_no = COALESCE($4, mobile_no), updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING id, email, first_name, middle_name, last_name, mobile_no;
  `;
  const res = await pool.query(query, [data.firstName, data.middleName || null, data.lastName, data.mobileNo || null, userId]);
  return res.rows[0];
};

export const getUsersByTenant = async (tenantId: string) => {
  const query = `
    SELECT u.id, u.email, u.first_name, u.middle_name, u.last_name, u.mobile_no, wm.status, wm.is_tenant_admin, wm.joined_at as created_at, wm.custom_profile_data, wm.employee_id
    FROM users u
    JOIN workspace_memberships wm ON u.id = wm.user_id
    WHERE wm.tenant_id = $1
    ORDER BY wm.joined_at DESC;
  `;
  const res = await pool.query(query, [tenantId]);
  
  return res.rows.map(row => {
    let customData = row.custom_profile_data || {};
    if (typeof customData === 'string') {
      try { customData = JSON.parse(customData); } catch (e) { customData = {}; }
    }
    return { ...row, custom_profile_data: customData };
  });
};

export const getUserByEmailAndTenant = async (email: string, tenantId: string) => {
  const query = `
    SELECT u.*, wm.status, wm.is_tenant_admin, wm.tenant_id, t.company_name 
    FROM users u
    JOIN workspace_memberships wm ON u.id = wm.user_id
    JOIN tenants t ON wm.tenant_id = t.id
    WHERE u.email = $1 AND wm.tenant_id = $2;
  `;
  const res = await pool.query(query, [email, tenantId]);
  return res.rows[0];
};

export const getUserByIdAndTenant = async (userId: string, tenantId: string) => {
  const query = `
    SELECT u.id, wm.tenant_id, u.email, u.first_name, u.last_name, u.mobile_no, 
           wm.status, wm.is_tenant_admin, wm.custom_profile_data, wm.employee_id,
           t.company_name 
    FROM users u 
    JOIN workspace_memberships wm ON u.id = wm.user_id 
    JOIN tenants t ON wm.tenant_id = t.id
    WHERE u.id = $1 AND wm.tenant_id = $2;
  `;
  const res = await pool.query(query, [userId, tenantId]);
  return res.rows[0];
};

export const updateUserStatus = async (userId: string, tenantId: string, status: 'PENDING' | 'ACTIVE' | 'SUSPENDED') => {
  const query = `
    UPDATE workspace_memberships 
    SET status = $3 
    WHERE user_id = $1 AND tenant_id = $2
    RETURNING user_id as id, status;
  `;
  const res = await pool.query(query, [userId, tenantId, status]);
  return res.rows[0];
};

export const getGlobalUserByEmail = async (email: string) => {
  const res = await pool.query('SELECT id, first_name FROM users WHERE email = $1', [email]);
  return res.rows[0];
};

export const getWorkspaceMembership = async (userId: string, tenantId: string) => {
  const res = await pool.query(
    'SELECT status FROM workspace_memberships WHERE user_id = $1 AND tenant_id = $2',
    [userId, tenantId]
  );
  return res.rows[0];
};

export const addWorkspaceMembership = async (userId: string, tenantId: string, status: 'PENDING' | 'ACTIVE' | 'SUSPENDED', customProfileData?: any, employeeId?: string) => {
  const query = `
    INSERT INTO workspace_memberships (user_id, tenant_id, status, custom_profile_data, employee_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const res = await pool.query(query, [userId, tenantId, status, JSON.stringify(customProfileData || {}), employeeId || null]);
  return res.rows[0];
};

export const updateEmployeeId = async (userId: string, tenantId: string, employeeId: string) => {
  const query = `
    UPDATE workspace_memberships 
    SET employee_id = $1 
    WHERE user_id = $2 AND tenant_id = $3
    RETURNING employee_id;
  `;
  const res = await pool.query(query, [employeeId || null, userId, tenantId]);
  return res.rows[0];
};

export const listGlobalUsers = async () => {
  const query = `
    SELECT u.id, u.email, u.first_name, u.last_name, u.created_at,
           COUNT(wm.tenant_id) as workspace_count
    FROM users u
    LEFT JOIN workspace_memberships wm ON u.id = wm.user_id
    WHERE u.is_superadmin = FALSE
    GROUP BY u.id
    ORDER BY u.created_at DESC;
  `;
  const res = await pool.query(query);
  return res.rows;
};

export const getUserEmailById = async (userId: string) => {
  const res = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
  return res.rows[0]?.email;
};