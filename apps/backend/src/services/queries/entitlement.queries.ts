import { pool } from '../../db/index.js';

export const checkTenantEntitlement = async (tenantId: string, featureKey: string) => {
  const query = `
    WITH TenantPlan AS (
      SELECT pd.tier_rank, pd.name as plan_name 
      FROM tenant_subscriptions ts
      JOIN plan_definitions pd ON ts.plan_code = pd.code
      WHERE ts.tenant_id = $1
    ),
    FeatureReq AS (
      SELECT pd.tier_rank as req_rank, pd.name as req_plan_name, ff.is_globally_enabled
      FROM feature_flags ff
      JOIN plan_definitions pd ON ff.min_plan_code = pd.code
      WHERE ff.feature_key = $2
    )
    SELECT 
      (SELECT tier_rank FROM TenantPlan) as tenant_rank,
      (SELECT req_rank FROM FeatureReq) as required_rank,
      (SELECT req_plan_name FROM FeatureReq) as required_plan_name,
      (SELECT is_globally_enabled FROM FeatureReq) as is_globally_enabled
  `;

  const res = await pool.query(query, [tenantId, featureKey]);
  const data = res.rows[0];

  if (!data || data.required_rank === null) {
    return { isAllowed: false, reason: 'FEATURE_NOT_FOUND' };
  }

  if (!data.is_globally_enabled) {
    return { isAllowed: false, reason: 'FEATURE_DISABLED_GLOBALLY' };
  }

  const isAllowed = (data.tenant_rank || 0) >= data.required_rank;

  return {
    isAllowed,
    reason: isAllowed ? 'ACCESS_GRANTED' : 'UPGRADE_REQUIRED',
    requiredPlan: data.required_plan_name
  };
};

export const getTenantMauQuota = async (tenantId: string) => {
  const query = `
    SELECT 
      (SELECT COUNT(*)::int FROM workspace_memberships WHERE tenant_id = $1 AND status IN ('ACTIVE', 'PENDING')) as current_usage,
      pd.max_mau as max_allowed
    FROM tenant_subscriptions ts
    JOIN plan_definitions pd ON ts.plan_code = pd.code
    WHERE ts.tenant_id = $1;
  `;
  const res = await pool.query(query, [tenantId]);
  return res.rows[0];
};

export const getTenantApiQuota = async (tenantId: string) => {
  const query = `
    SELECT pd.max_api_requests as max_allowed
    FROM tenant_subscriptions ts
    JOIN plan_definitions pd ON ts.plan_code = pd.code
    WHERE ts.tenant_id = $1;
  `;
  const res = await pool.query(query, [tenantId]);
  return res.rows[0];
};