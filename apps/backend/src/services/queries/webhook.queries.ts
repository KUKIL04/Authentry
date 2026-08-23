import { pool } from '../../db/index.js';

// Replace createModuleWebhook
export const createAppWebhook = async (appId: string, url: string, signingSecret: string, events?: string[]) => {
  const query = `
    INSERT INTO webhook_endpoints (app_id, url, signing_secret, subscribed_events) 
    VALUES ($1, $2, $3, $4) 
    RETURNING id, signing_secret, created_at;
  `;
  const res = await pool.query(query, [appId, url, signingSecret, JSON.stringify(events || ['*'])]);
  return res.rows[0];
};

// Replace getActiveWebhooksForTenantEvent
export const getActiveWebhooksForTenantEvent = async (tenantId: string, event: string) => {
  const query = `
    SELECT we.id, we.url, we.signing_secret 
    FROM webhook_endpoints we
    JOIN tenant_app_allocations taa ON we.app_id = taa.app_id
    WHERE taa.tenant_id = $1 
      AND we.is_active = TRUE 
      AND (we.subscribed_events @> $2::jsonb OR we.subscribed_events @> '["*"]'::jsonb);
  `;
  const res = await pool.query(query, [tenantId, JSON.stringify([event])]);
  return res.rows;
};

export const createDeliveryLog = async (endpointId: string, eventType: string, payload: any) => {
  const query = `
    INSERT INTO webhook_delivery_logs (endpoint_id, event_type, payload) 
    VALUES ($1, $2, $3) RETURNING id
  `;
  const res = await pool.query(query, [endpointId, eventType, JSON.stringify(payload)]);
  return res.rows[0].id;
};

export const getWebhookEndpointCredentials = async (endpointId: string) => {
  const query = `SELECT url, signing_secret FROM webhook_endpoints WHERE id = $1 AND is_active = TRUE`;
  const res = await pool.query(query, [endpointId]);
  return res.rows[0];
};

export const updateDeliveryLogSuccess = async (logId: string, statusCode: number) => {
  const query = `
    UPDATE webhook_delivery_logs 
    SET status = 'SUCCESS', http_status_code = $1, attempts = attempts + 1 
    WHERE id = $2
  `;
  await pool.query(query, [statusCode, logId]);
};

export const updateDeliveryLogFailure = async (logId: string, statusCode: number, isDeadLetter: boolean) => {
  const status = isDeadLetter ? 'FAILED' : 'PENDING';
  const query = `
    UPDATE webhook_delivery_logs 
    SET attempts = attempts + 1, http_status_code = $1, status = $2 
    WHERE id = $3 RETURNING attempts
  `;
  const res = await pool.query(query, [statusCode, status, logId]);
  return res.rows[0].attempts;
};

// Replace getWebhooksByApp
export const getWebhooksByApp = async (appId: string) => {
  const query = `
    SELECT id, url, subscribed_events, is_active, created_at 
    FROM webhook_endpoints 
    WHERE app_id = $1 
    ORDER BY created_at DESC
  `;
  const res = await pool.query(query, [appId]);
  return res.rows;
};

export const deleteWebhookEndpoint = async (id: string) => {
  const query = `
    DELETE FROM webhook_endpoints 
    WHERE id = $1 
    RETURNING id
  `;
  const res = await pool.query(query, [id]);
  return res.rows[0];
};

export const getGlobalWebhookFailures = async (): Promise<boolean> => {
  const query = `
    SELECT COUNT(*) as failure_count
    FROM webhook_delivery_logs dl
    WHERE (dl.status = 'FAILED' OR (dl.status = 'PENDING' AND dl.attempts > 0))
      AND dl.created_at > COALESCE((
        SELECT MAX(created_at) 
        FROM webhook_delivery_logs success_logs
        WHERE success_logs.endpoint_id = dl.endpoint_id 
          AND success_logs.status = 'SUCCESS'
      ), NOW() - INTERVAL '30 minutes')
  `;
  const res = await pool.query(query);
  const count = parseInt(res.rows[0]?.failure_count || '0', 10);
  return count > 0;
};

export const getGlobalUnsyncedUsers = async () => {
  const query = `
    WITH LastHealingSync AS (
      SELECT 
        dl.payload->>'userId' AS sync_user_id,
        MAX(dl.created_at) AS healed_at
      FROM webhook_delivery_logs dl
      WHERE dl.event_type = 'identity.sync.forced' 
        AND (dl.status = 'SUCCESS' OR (dl.status = 'PENDING' AND dl.attempts = 0))
      GROUP BY dl.payload->>'userId'
    )
    SELECT DISTINCT u.*, wm.status as workspace_status, wm.is_tenant_admin, wm.tenant_id
    FROM users u
    JOIN workspace_memberships wm ON u.id = wm.user_id
    JOIN webhook_delivery_logs dl ON TRUE
    LEFT JOIN LastHealingSync lhs ON u.id::text = lhs.sync_user_id
    WHERE (dl.status = 'FAILED' OR (dl.status = 'PENDING' AND dl.attempts > 0))
      AND (
        dl.payload->>'userId' = u.id::text 
        OR (
          dl.payload->'userIds' IS NOT NULL 
          AND dl.payload->'userIds' @> jsonb_build_array(u.id::text)
        )
      )
      AND dl.created_at > COALESCE(lhs.healed_at, '1970-01-01'::timestamptz)
  `;
  const res = await pool.query(query);
  return res.rows;
};

export const getAllActiveWorkspaceMemberships = async () => {
  const query = `
    SELECT 
      u.id AS user_id, 
      u.email, 
      u.first_name, 
      u.last_name, 
      wm.status AS workspace_status, 
      wm.is_tenant_admin, 
      wm.tenant_id
    FROM workspace_memberships wm
    JOIN users u ON wm.user_id = u.id
    WHERE status IN ('ACTIVE', 'SUSPENDED')
  `;
  const res = await pool.query(query);
  return res.rows;
};

export const getGlobalFailedWebhookDeliveries = async () => {
  const query = `
    SELECT 
      wdl.id, wdl.event_type, wdl.status, wdl.attempts, wdl.created_at,
      we.url as endpoint_url, 
      a.name as app_name, a.id as app_id
    FROM webhook_delivery_logs wdl
    JOIN webhook_endpoints we ON wdl.endpoint_id = we.id
    JOIN apps a ON we.app_id = a.id
    WHERE wdl.status = 'FAILED' OR (wdl.status = 'PENDING' AND wdl.attempts > 0)
    ORDER BY wdl.created_at DESC
  `;
  const res = await pool.query(query);
  return res.rows;
};
export const resetDeliveryLog = async (logId: string) => {
  const query = `
    UPDATE webhook_delivery_logs
    SET status = 'PENDING', attempts = 0, next_retry_at = NULL
    WHERE id = $1
  `;
  await pool.query(query, [logId]);
};

export const flushDeadLetterQueue = async () => {
  const query = `DELETE FROM webhook_delivery_logs WHERE status IN ('FAILED', 'PENDING')`;
  const res = await pool.query(query);
  return res.rowCount || 0;
};

export const pruneWebhookLedger = async () => {
  await pool.query(`
    DELETE FROM webhook_delivery_logs 
    WHERE event_type != 'identity.sync.forced' 
    AND created_at < NOW() - INTERVAL '30 days'
  `);

  const pruneQuery = `
    WITH RankedLogs AS (
      SELECT id,
             ROW_NUMBER() OVER(
               PARTITION BY endpoint_id, payload->>'userId' 
               ORDER BY created_at DESC
             ) as rank
      FROM webhook_delivery_logs
      WHERE event_type = 'identity.sync.forced' AND status = 'SUCCESS'
    )
    DELETE FROM webhook_delivery_logs
    WHERE id IN (SELECT id FROM RankedLogs WHERE rank > 1)
  `;
  
  const res = await pool.query(pruneQuery);
  return res.rowCount || 0;
};

// Replace getEndpointsBySubscription
export const getEndpointsBySubscription = async (event: string) => {
  const query = `
    SELECT we.id AS endpoint_id, we.app_id, taa.tenant_id 
    FROM webhook_endpoints we
    JOIN tenant_app_allocations taa ON we.app_id = taa.app_id
    WHERE we.is_active = TRUE AND we.subscribed_events @> $1::jsonb
  `;
  const res = await pool.query(query, [JSON.stringify([event])]);
  return res.rows;
};