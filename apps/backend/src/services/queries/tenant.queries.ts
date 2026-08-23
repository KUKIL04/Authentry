import { pool } from '../../db/index.js';

export const createTenant = async (data: {
  companyName: string; logoUrl?: string; themeColor?: string;
  legalName?: string; taxId?: string; registrationNumber?: string;
  industry?: string; orgSize?: string;
  addressStreet?: string; addressCity?: string; addressState?: string; addressPincode?: string;
}) => {
  const query = `
    INSERT INTO tenants (
      company_name, logo_url, theme_color,
      legal_name, tax_id, registration_number, industry, org_size,
      address_street, address_city, address_state, address_pincode
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `;
  const values = [
    data.companyName, data.logoUrl || null, data.themeColor || '#000000',
    data.legalName || null, data.taxId || null, data.registrationNumber || null,
    data.industry || null, data.orgSize || null,
    data.addressStreet || null, data.addressCity || null, data.addressState || null, data.addressPincode || null
  ];
  const res = await pool.query(query, values);
  const newTenant = res.rows[0];

  await pool.query(`
    INSERT INTO tenant_subscriptions (tenant_id, plan_code, subscription_status)
    VALUES ($1, 'FREE_TIER', 'ACTIVE')
  `, [newTenant.id]);

  return newTenant;
};

export const getTenantById = async (tenantId: string) => {
  const res = await pool.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  return res.rows[0];
};

export const getTenantsByEmail = async (email: string) => {
  const query = `
    SELECT u.id as user_id, u.password_hash, wm.status, wm.is_tenant_admin, u.first_name, u.last_name, u.email,
           t.id as tenant_id, t.company_name, t.logo_url, t.status as tenant_status
    FROM users u
    JOIN workspace_memberships wm ON u.id = wm.user_id
    JOIN tenants t ON wm.tenant_id = t.id
    WHERE u.email = $1;
  `;
  const res = await pool.query(query, [email]);
  return res.rows;
};

export const getTenantsByUserId = async (userId: string) => {
  const query = `
    SELECT t.id as tenant_id, t.company_name, t.logo_url, wm.status, t.status as tenant_status
    FROM workspace_memberships wm
    JOIN tenants t ON wm.tenant_id = t.id
    WHERE wm.user_id = $1;
  `;
  const res = await pool.query(query, [userId]);
  return res.rows;
};

export const getTenantAdmins = async (tenantId: string) => {
  const query = `
    SELECT u.email, u.first_name, u.last_name
    FROM users u
    JOIN workspace_memberships wm ON u.id = wm.user_id
    WHERE wm.tenant_id = $1 AND wm.is_tenant_admin = true;
  `;
  const res = await pool.query(query, [tenantId]);
  return res.rows;
};

export const getTenantAppsWithModules = async (tenantId: string) => {
  const query = `
    SELECT 
      a.id as app_id, 
      a.name as app_name, 
      a.description as app_description, 
      a.production_url,
      COALESCE(
        json_agg(
          json_build_object(
            'id', m.id, 
            'name', m.name, 
            'description', m.description
          )
        ) FILTER (WHERE m.id IS NOT NULL), '[]'::json
      ) as modules
    FROM apps a
    JOIN tenant_app_allocations taa ON a.id = taa.app_id
    LEFT JOIN modules m ON a.id = m.app_id
    WHERE taa.tenant_id = $1
    GROUP BY a.id, a.name, a.description, a.production_url
    ORDER BY a.name ASC;
  `;
  const res = await pool.query(query, [tenantId]);
  return res.rows;
};

export const updateTenantBranding = async (tenantId: string, companyName: string, logoUrl: string | null, themeColor: string) => {
  const query = `
    UPDATE tenants 
    SET company_name = $2, logo_url = $3, theme_color = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *;
  `;
  const res = await pool.query(query, [tenantId, companyName, logoUrl, themeColor]);
  return res.rows[0];
};

export const getTenantOnboardingContext = async (tenantId: string) => {
  const res = await pool.query(
    'SELECT onboarding_schema, enforce_profile_completion FROM tenants WHERE id = $1',
    [tenantId]
  );
  return res.rows[0];
};

export const updateTenantOnboardingSchema = async (tenantId: string, schema: any[], enforce: boolean) => {
  const res = await pool.query(
    `UPDATE tenants SET onboarding_schema = $1, enforce_profile_completion = $2 WHERE id = $3 RETURNING *`,
    [JSON.stringify(schema), enforce, tenantId]
  );
  return res.rows[0];
};

export const getTenantSettings = async (tenantId: string) => {
  const res = await pool.query(
    `SELECT id, company_name AS name, logo_url, theme_color, created_at 
     FROM tenants 
     WHERE id = $1`,
    [tenantId]
  );
  return res.rows[0];
};

export const updateTenantSettings = async (tenantId: string, data: { name: string; logoUrl?: string; themeColor?: string }) => {
  const res = await pool.query(
    `UPDATE tenants 
     SET company_name = $1,
         logo_url = $2, 
         theme_color = $3 
     WHERE id = $4 
     RETURNING id, company_name AS name, logo_url, theme_color`,
    [data.name, data.logoUrl || null, data.themeColor || '#C7923E', tenantId]
  );
  return res.rows[0];
};

export const listTenantsDetailed = async () => {
  const query = `
    SELECT t.id, t.company_name, t.status, t.created_at,
           COALESCE(pd.name, 'Free Workspace') as plan_tier,
           (SELECT COUNT(*) FROM workspace_memberships wm WHERE wm.tenant_id = t.id AND wm.status = 'ACTIVE')::int as mau_count,
           COALESCE(ts.api_request_count, 0) as current_cycle_api_calls,
           COALESCE(ts.lifetime_api_calls, 0) as lifetime_api_calls
    FROM tenants t
    LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id
    LEFT JOIN plan_definitions pd ON ts.plan_code = pd.code
    ORDER BY t.created_at DESC;
  `;
  const res = await pool.query(query);
  return res.rows;
};

export const getTenantByIdDetailed = async (tenantId: string) => {
  const query = `
    SELECT t.id, t.company_name, t.status, t.created_at,
           COALESCE(pd.name, 'Free Workspace') as plan_tier,
           (SELECT COUNT(*) FROM workspace_memberships wm WHERE wm.tenant_id = t.id AND wm.status = 'ACTIVE')::int as mau_count,
           COALESCE(ts.api_request_count, 0) as current_cycle_api_calls,
           COALESCE(ts.lifetime_api_calls, 0) as lifetime_api_calls,
           COALESCE((SELECT json_agg(app_id) FROM tenant_app_allocations WHERE tenant_id = t.id), '[]'::json) as allocated_app_ids
    FROM tenants t
    LEFT JOIN tenant_subscriptions ts ON t.id = ts.tenant_id
    LEFT JOIN plan_definitions pd ON ts.plan_code = pd.code
    WHERE t.id = $1;
  `;
  const res = await pool.query(query, [tenantId]);
  return res.rows[0];
};

export const updateTenantStatusOnly = async (tenantId: string, status: string) => {
  const query = `
    UPDATE tenants 
    SET status = $1, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $2 
    RETURNING id, company_name, status;
  `;
  const res = await pool.query(query, [status, tenantId]);
  return res.rows[0];
};

export const revokeAllTenantTokens = async (tenantId: string) => {
  await pool.query('UPDATE refresh_tokens SET is_revoked = TRUE WHERE tenant_id = $1', [tenantId]);
};