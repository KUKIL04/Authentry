// apps/backend/src/services/platform.service.ts
import { pool } from '../db/index.js';
import { redisClient } from '../db/redis.js';

export class PlatformService {
  
  static async getGlobalStats() {
    // Executes Raw SQL for persistent metrics
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM tenants WHERE status = 'ACTIVE') as active_tenants,
        (SELECT COUNT(*) FROM users) as total_global_users,
        (SELECT COALESCE(SUM(lifetime_api_calls), 0) FROM tenant_subscriptions) as total_api_requests
    `;
    const stats = await pool.query(statsQuery);

    // Fetches live telemetry from Redis
    const [
      globalCalls, 
      globalErrors,
      cryptoLatency,
      emailErrors,
      dbQueryCount,
      dbLastLatency,
      dbSlowQueryCount
    ] = await Promise.all([
      redisClient.get('telemetry:global:api_calls'),
      redisClient.get('telemetry:global:errors'),
      redisClient.get('telemetry:latency:crypto:verify_password'),
      redisClient.get('telemetry:errors:email:send_otp'),
      redisClient.get('telemetry:db:query_count'),
      redisClient.get('telemetry:db:last_query_latency_ms'),
      redisClient.get('telemetry:db:slow_query_count')
    ]);

    return {
      ...stats.rows[0],
      telemetry: {
        live_api_calls: parseInt(globalCalls || '0', 10),
        live_errors: parseInt(globalErrors || '0', 10),
        auth_latency_ms: parseFloat(cryptoLatency || '0'),
        email_provider_errors: parseInt(emailErrors || '0', 10),
        db_query_count: parseInt(dbQueryCount || '0', 10),
        db_last_latency_ms: parseFloat(dbLastLatency || '0'),
        db_slow_query_count: parseInt(dbSlowQueryCount || '0', 10)          
      }
    };
  }

  static async getSystemTelemetryLogs() {
    const slowQueriesRaw = await redisClient.lRange('telemetry:db:slow_queries', 0, -1);
    return slowQueriesRaw.map(q => {
      try { return JSON.parse(q); } 
      catch (e) { return null; }
    }).filter(Boolean);
  }

  static async flushTelemetry(actorId: string, ipAddress: string) {
    await redisClient.del('telemetry:db:slow_queries');
    await redisClient.set('telemetry:db:slow_query_count', '0');

    await pool.query(`
      INSERT INTO superadmin_audit_logs (actor_id, action, ip_address)
      VALUES ($1, $2, $3)
    `, [actorId, 'TELEMETRY_FLUSHED', ipAddress]);
  }

  // --- ENTITLEMENT & FEATURE FLAG MANAGEMENT ---

  static async getFeatureFlags() {
    const query = `
      SELECT 
        ff.feature_key, 
        ff.description, 
        ff.min_plan_code, 
        ff.is_globally_enabled, 
        COALESCE(pd.tier_rank, 0) as tier_rank 
      FROM feature_flags ff
      LEFT JOIN plan_definitions pd ON ff.min_plan_code = pd.code
      ORDER BY tier_rank ASC, ff.feature_key ASC;
    `;
    const res = await pool.query(query);
    return res.rows;
  }

  static async createPlanDefinition(
    code: string, name: string, price: number, maxMau: number | null, maxApi: number | null, tierRank: number, actorId: string, ipAddress: string
  ) {
    const query = `
      INSERT INTO plan_definitions (code, name, monthly_price_usd, max_mau, max_api_requests, tier_rank)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const res = await pool.query(query, [code, name, price, maxMau, maxApi, tierRank]);

    await pool.query(`
      INSERT INTO superadmin_audit_logs (actor_id, action, metadata, ip_address)
      VALUES ($1, $2, $3, $4)
    `, [actorId, 'PLAN_DEFINITION_CREATED', JSON.stringify({ code, name }), ipAddress]);

    return res.rows[0];
  }

  static async getPlanDefinitions() {
    const query = `
      SELECT code, name, monthly_price_usd, max_mau, max_api_requests, tier_rank 
      FROM plan_definitions 
      ORDER BY tier_rank ASC
    `;
    const res = await pool.query(query);
    return res.rows;
  }

  static async updatePlanDefinition(code: string, price: number, maxMau: number | null, maxApi: number | null, actorId: string, ipAddress: string) {
    const query = `
      UPDATE plan_definitions 
      SET monthly_price_usd = $1, max_mau = $2, max_api_requests = $3, updated_at = CURRENT_TIMESTAMP
      WHERE code = $4
      RETURNING *;
    `;
    const res = await pool.query(query, [price, maxMau, maxApi, code]);

    if (res.rows.length > 0) {
      await pool.query(`
        INSERT INTO superadmin_audit_logs (actor_id, action, metadata, ip_address)
        VALUES ($1, $2, $3, $4)
      `, [actorId, 'PLAN_DEFINITION_UPDATED', JSON.stringify({ code, price, maxMau, maxApi }), ipAddress]);
    }

    return res.rows[0];
  }

  static async updateFeatureTier(featureKey: string, minPlanCode: string, actorId: string, ipAddress: string) {
    const query = `
      UPDATE feature_flags 
      SET min_plan_code = $1, updated_at = CURRENT_TIMESTAMP
      WHERE feature_key = $2
      RETURNING *;
    `;
    const res = await pool.query(query, [minPlanCode, featureKey]);

    if (res.rows.length > 0) {
      await pool.query(`
        INSERT INTO superadmin_audit_logs (actor_id, action, metadata, ip_address)
        VALUES ($1, $2, $3, $4)
      `, [actorId, 'FEATURE_TIER_UPDATED', JSON.stringify({ featureKey, minPlanCode }), ipAddress]);
    }

    return res.rows[0];
  }
}