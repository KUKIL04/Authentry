import { pool } from '../config/db.js';
import { authentry } from '../services/authentry.service.js';

export class WebhookController {
  
  static async upsertEmployeeProfile(data) {
    const userId = data.userId || data.user_id || data.id;
    const tenantId = data.tenantId || data.tenant_id;

    if (!data.tenantId || !data.userId) {
      console.warn("⚠️ [Sandbox DB] Aborting upsert: Missing tenantId or userId. Received keys:", Object.keys(data));       
      return;
    }

    const email = data.email || '';
    const firstName = data.firstName || data.first_name || '';
    const lastName = data.lastName || data.last_name || '';
    const status = data.status || 'ACTIVE';
    const roles = data.roles || [];
    const entitlements = data.entitlements || data.modules || {};
    
    // Fallback logic for admin flags across different payload versions
    const isAdmin = data.isAdmin !== undefined 
      ? data.isAdmin 
      : (data.is_admin !== undefined ? data.is_admin : (data.is_tenant_admin || false));

    const query = `
      INSERT INTO local_employees (
        id, tenant_id, email, first_name, last_name, status, roles, entitlements, is_tenant_admin, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      
      ON CONFLICT (id, tenant_id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        status = EXCLUDED.status,
        roles = EXCLUDED.roles,
        entitlements = EXCLUDED.entitlements,
        is_tenant_admin = EXCLUDED.is_tenant_admin,
        updated_at = CURRENT_TIMESTAMP;
    `;
    
    const values = [
      userId, 
      tenantId, 
      email, 
      firstName, 
      lastName,
      status, 
      JSON.stringify(roles), 
      JSON.stringify(entitlements), 
      isAdmin
    ];
    
    try {
      await pool.query(query, values);
      console.log(`🎉 [SCM Workspace] Successfully synced identity state for ${email} in Workspace ${tenantId.substring(0,8)}`);
    } catch (dbError) {
      console.error(`❌ [Sandbox DB Error] Failed to insert ${email}:`, dbError.message);
      throw dbError;
    }
  }

  static async updateEmployeeStatus(userIdArg, tenantIdArg, statusArg) {
    const userId = userIdArg || data?.userId || data?.user_id || data?.id;
    const tenantId = tenantIdArg || data?.tenantId || data?.tenant_id;
    const status = statusArg || data?.status;

    if (!userId || !tenantId) return;
    
    await pool.query(
      'UPDATE local_employees SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND tenant_id = $3', 
      [status, userId, tenantId]
    );
  }

  static async insertAuditLogBatch(tenantId, logs) {
    if (!tenantId || !logs || logs.length === 0) return;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const query = `
        INSERT INTO client_audit_logs (tenant_id, actor_id, actor_email, event_type, ip_address, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      for (const log of logs) {
        await client.query(query, [
          tenantId, log.actor_id || null, log.actor_email || 'SYSTEM', log.event_type, 
          log.ip_address || '0.0.0.0', JSON.stringify(log.metadata || {}), log.created_at
        ]);
      }
      await client.query('COMMIT');
      console.log(`✅ [SCM Workspace] Persisted ${logs.length} audit logs for Workspace ${tenantId.substring(0,8)}.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ [Nexus SCM] Batch insert failed:', err);
    } finally {
      client.release();
    }
  }

  // ==========================================
  // THE MULTI-TENANT ROUTER
  // ==========================================
  static handleEvent = async (event, data) => {
    console.log(`🚀 [Sandbox Router] Routing event: ${event}`);
    console.log(`📥 [Sandbox Router] Raw payload received:`, JSON.stringify(data, null, 2));
    
    const userId = data?.userId || data?.user_id || data?.id || data?.user?.id;
    const tenantId = data?.tenantId || data?.tenant_id;
    
    if (!tenantId) {
      console.warn(`[SECURITY WARNING] Webhook event ${event} dropped: Missing tenantId routing key.`);
      return;
    }

    console.log(`🎯 [Sandbox Router] Resolved Target -> User: ${userId || 'N/A'} | Tenant: ${tenantId}`);

    switch (event) {
      case 'tenant.app.revoked':
        console.log(`🔥 [Sandbox Router] Executing Tenant Kill-Switch for ${tenantId}`);
        authentry.auth.blockTenantLocally(tenantId);
        break;

      case 'tenant.app.allocated':
        console.log(`🔓 [Sandbox Router] Lifting Tenant Kill-Switch for ${tenantId}`);
        authentry.auth.unblockTenantLocally(tenantId);
        break;

      case 'user.session.revoked':
      case 'user.password_reset.forced':
        if (userId) authentry.auth.blockUserLocally(userId);
        break;

      case 'user.status.updated':
        if (userId) {
          const status = data.status || data.new_status;
          if (status === 'SUSPENDED') authentry.auth.blockUserLocally(userId);
          else if (status === 'ACTIVE') authentry.auth.unblockUserLocally(userId);
          await WebhookController.updateEmployeeStatus(userId, tenantId, status);
        }
        break;

      case 'identity.sync.forced':
      case 'user.access.granted':
      case 'user.profile.updated':
        console.log(`⬇️ [Sandbox Router] Triggering database insert for user: ${userId}`);
        if (userId) {
          console.log(`⬇️ [Sandbox Router] Triggering database insert for user: ${userId}`);
          // Pass the normalized userId into data so upsertEmployeeProfile picks it up easily
          await WebhookController.upsertEmployeeProfile({ ...data, userId });
        } else {
          console.error(`❌ [Sandbox Router] Could not upsert employee profile: Missing user identifier in payload.`);
        }
        break;

      case 'user.role.granted':
      case 'user.role.revoked':
      case 'user.module.granted':
      case 'user.module.revoked':
      case 'user.entitlements.updated':
        const targets = data?.userIds || (data?.userId ? [data.userId] : []);
        targets.forEach(id => authentry.auth.markSessionStale(id)); // Triggers silent refresh to fetch new Fat JWT
        break;
    }
  };
}