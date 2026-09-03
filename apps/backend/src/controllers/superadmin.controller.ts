import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { QueryService } from '../services/query.service.js';
import { EmailService } from '../services/email.service.js';
import { EventDispatcherService } from '../services/event-dispatcher.service.js';
import { CryptoService } from '../services/crypto.service.js';
import { redisClient } from '../db/redis.js';

export class SuperAdminController {

  // ==========================================
  // 1. GLOBAL MODULE REGISTRY (SOFTWARE SUITES)
  // ==========================================

  // REPLACES: registerGlobalModule
  static async registerApp(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, productionUrl } = req.body;
      if (!name || !productionUrl) return res.status(400).json({ error: 'App Name and Production URL are required.' });

      const clientId = CryptoService.generateClientId();
      const { rawKey: clientSecret, keyHash: clientSecretHash } = CryptoService.generateApiKey();

      try {
        const app = await QueryService.createApp(name, description, productionUrl, clientId, clientSecretHash);

        await QueryService.logSuperAdminEvent(req.user?.userId!, 'GLOBAL_APP_REGISTERED', req.ip || '127.0.0.1');

        return res.status(201).json({ 
          success: true, 
          message: 'Enterprise Suite Registered.',
          app,
          clientSecret // Shown ONLY once!
        });
      } catch (e: any) {
        if (e.code === '23505' && e.constraint === 'apps_name_key') {
          return res.status(409).json({ error: `A Software Suite named "${name}" already exists.` });
        }
        throw e; // Rethrow unexpected database errors
      }
    } catch (err) { next(err); }
  }

  // REPLACES: listGlobalModules
  static async listApps(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const apps = await QueryService.getAllApps();
      return res.json(apps);
    } catch (err) { next(err); }
  }

  // ==========================================
  // 2. APP MODULES (The Sub-Features like Payroll, Inventory)
  // ==========================================
  
  // Defining granular features inside a software suite
  static async createAppModule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const appId = req.params.appId as string;
      const { name, description } = req.body;
      
      if (!name) return res.status(400).json({ error: 'Module name is required.' });

      const module = await QueryService.createAppModule(appId, name, description);
      
      await QueryService.logSuperAdminEvent(req.user?.userId!, 'APP_MODULE_CREATED', req.ip || '127.0.0.1');
      return res.status(201).json(module);
    } catch (err) { next(err); }
  }

  // NEW ADDITION: Fetching features for a specific app
  static async listAppModules(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const appId = req.params.appId as string;
      const modules = await QueryService.getModulesByApp(appId);
      return res.json(modules);
    } catch (err) { next(err); }
  }

  // ==========================================
  // 3. THE LICENSING MATRIX (Tenant Allocations)
  // ==========================================

  // REPLACES: allocateModuleToTenant
  static async allocateAppToTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { tenantId, appId } = req.body;
      const superAdminId = req.user?.userId!;

      if (!tenantId || !appId) return res.status(400).json({ error: 'Tenant ID and App ID required.' });

      const modules = await QueryService.getModulesByApp(appId);
      if (!modules || modules.length === 0) {
        return res.status(400).json({ error: 'Cannot allocate an app with no modules. Please create at least one sub-feature module first.' });
      }
      
      await QueryService.allocateAppToTenant(tenantId, appId, superAdminId);

      await EventDispatcherService.dispatch(tenantId, 'tenant.app.allocated', {
        appId,
        reason: 'superadmin_license_granted'
      }, 1);
      
      await QueryService.logSuperAdminEvent(superAdminId, 'TENANT_ALLOCATION_GRANTED', req.ip || '127.0.0.1');

      return res.json({ success: true, message: 'Software suite successfully licensed to Tenant.' });
    } catch (err) { next(err); }
  }

  // REPLACES: revokeModuleFromTenant
  static async revokeAppFromTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.params.tenantId as string;
      const appId = req.params.appId as string;

      // We must fire this while the database allocation still exists, 
      // otherwise the Dispatcher's security JOIN will drop the event.
      await EventDispatcherService.dispatch(tenantId, 'tenant.app.revoked', {
        appId,
        reason: 'superadmin_license_revocation'
      }, 1);

      // Delete the Tenant Roles, Overrides, and Allocations from the database
      await QueryService.revokeAppFromTenant(tenantId, appId);

      await QueryService.logSuperAdminEvent(req.user?.userId!, 'TENANT_ALLOCATION_REVOKED', req.ip || '127.0.0.1');

      return res.json({ success: true, message: 'Software suite license revoked. End-user access purged.' });
    } catch (err) { next(err); }
  }


  // ==========================================
  // 4. GLOBAL EVENT WEBHOOKS (Tied to Apps)
  // ==========================================

  // REPLACES: registerModuleWebhook
  static async registerAppWebhook(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { appId, url, events } = req.body;
      if (!appId || !url) return res.status(400).json({ error: 'App ID and URL are required.' });

      const signingSecret = CryptoService.generateWebhookSecret();
      
      // Changed from createModuleWebhook to createAppWebhook
      const endpoint = await QueryService.createAppWebhook(appId, url, signingSecret, events);

      await QueryService.logSuperAdminEvent(req.user?.userId!, 'APP_WEBHOOK_REGISTERED', req.ip || '127.0.0.1');

      return res.status(201).json({
        success: true,
        endpointId: endpoint.id,
        signingSecret: endpoint.signing_secret,
        message: 'System webhook attached to Software Suite.'
      });
    } catch (err) { next(err); }
  }

  static async getAppWebhooks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const appId = req.params.appId as string;
      const webhooks = await QueryService.getWebhooksByApp(appId);
      return res.json(webhooks);
    } catch (err) { next(err); }
  }

  static async deleteAppWebhook(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const webhookId = req.params.webhookId as string;
      await QueryService.deleteWebhookEndpoint(webhookId);
      return res.json({ success: true, message: 'Webhook deleted' });
    } catch (err) { next(err); }
  }


  // ==========================================
  // 5. GLOBAL SGC SYNC & DEAD-LETTER ENGINE
  // ==========================================

  static async getGlobalSyncStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Queries the entire infrastructure for failures
      const isSystemFailing = await QueryService.getGlobalWebhookFailures();
      const unsyncedUsers = await QueryService.getGlobalUnsyncedUsers();
      const failedDeliveries = await QueryService.getGlobalFailedWebhookDeliveries();

      return res.json({
        success: true,
        count: unsyncedUsers.length + failedDeliveries.length,
        details: {
          identities: unsyncedUsers.length,
          deadLetters: failedDeliveries.length
        },
        infrastructureWarning: isSystemFailing,
        failedDeliveries,
        unsyncedUsers
      });
    } catch (err) { next(err); }
  }
  
  static async triggerGlobalSGC(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // GLOBAL DDOS LOCK
      const lockKey = `lock:global_sgc_sync`;
      const acquiredLock = await redisClient.set(lockKey, 'locked', { EX: 60, NX: true });

      if (!acquiredLock) {
        return res.status(429).json({ error: 'A Global SGC Sync is already in progress. Please wait.' });
      }

      let dispatchedCount = 0;

      const memberships = await QueryService.getAllActiveWorkspaceMemberships();
      
      for (const row of memberships) {
        // We must pass BOTH userId and tenantId to get their specific enterprise context
        const accessContext = await QueryService.getUserAccessContext(row.user_id, row.tenant_id);
        
        const syncPayload = {
          user_id: row.user_id,
          id: row.user_id,
          email: row.email,
          first_name: row.first_name,
          lastName: row.last_name,
          status: row.workspace_status,
          roles: accessContext.roles || [],
          entitlements: accessContext.entitlements || {},
          isAdmin: row.is_tenant_admin,
          is_tenant_admin: row.is_tenant_admin
        };

        // Broadcast to any Client App licensed to this tenant
        await EventDispatcherService.dispatch(row.tenant_id, 'identity.sync.forced', syncPayload, 2);
        dispatchedCount++;
      }

      // VAPORIZE THE GRAVEYARD
      // Because we just dispatched the absolute latest state for everyone,
      // all previous failed identity webhooks are now useless. We wipe them out safely!
      const purgedCount = await QueryService.flushDeadLetterQueue();

      // CLEANUP & LOGGING
      if (dispatchedCount === 0) {
        await redisClient.del(lockKey); 
        return res.json({ success: true, count: 0, details: 'Infrastructure is fully synchronized.' });
      }

      await QueryService.logSuperAdminEvent(req.user?.userId!, 'GLOBAL_SGC_TRIGGERED', req.ip || '127.0.0.1');

      return res.json({ 
        success: true, 
        count: dispatchedCount,
        message: `Mass broadcast initiated. ${dispatchedCount} payloads pushed to global event stream and ${purgedCount} obsolete dead-letters automatically purged.` 
      });
    } catch (err) {
      await redisClient.del(`lock:global_sgc_sync`);
      next(err);
    }
  }

  // ==========================================
  // SYSTEM ROLE TEMPLATES
  // ==========================================
  static async createSystemRoleTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, bundles } = req.body; 
      if (!name) return res.status(400).json({ error: 'Template name is required' });

      // Create a global template (tenantId = null, is_system_template = TRUE)
      const newRole = await QueryService.createRole(null, name, description || '', true);

      if (Array.isArray(bundles)) {
        for (const bundle of bundles) {
          if (bundle.moduleId && bundle.accessLevel) {
            await QueryService.bundleRoleModule(newRole.id, bundle.moduleId, bundle.accessLevel);
          }
        }
      }

      await QueryService.logSuperAdminEvent(req.user?.userId!, 'SYSTEM_ROLE_TEMPLATE_CREATED', req.ip || '127.0.0.1', { roleName: name });
      return res.status(201).json({ success: true, role: newRole, message: 'System Role Template published.' });
    } catch (err) { next(err); }
  }

  static async getSystemRoleTemplates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const templates = await QueryService.getSystemRoleTemplates();
      return res.json(templates);
    } catch (err) { next(err); }
  }

  static async updateSystemRoleTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, bundles } = req.body;
      const roleId = req.params.roleId as string;

      if (!name) return res.status(400).json({ error: 'Template name is required' });

      const updatedRole = await QueryService.updateSystemRoleTemplate(roleId, name, description || '');
      if (!updatedRole) return res.status(404).json({ error: 'Template not found.' });

      // Clear old bundles safely
      await QueryService.clearRoleBundles(roleId);

      // Re-map the new ones
      if (Array.isArray(bundles)) {
        for (const bundle of bundles) {
          if (bundle.moduleId && bundle.accessLevel) {
            await QueryService.bundleRoleModule(roleId, bundle.moduleId, bundle.accessLevel);
          }
        }
      }

      await QueryService.logSuperAdminEvent(req.user?.userId!, 'SYSTEM_ROLE_TEMPLATE_UPDATED', req.ip || '127.0.0.1', { roleId, roleName: name });
      return res.json({ success: true, role: updatedRole, message: 'Template updated successfully.' });
    } catch (err) { next(err); }
  }

  static async deleteSystemRoleTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const roleId = req.params.roleId as string;
      
      const deleted = await QueryService.deleteSystemRoleTemplate(roleId);
      if (!deleted) return res.status(404).json({ error: 'Template not found.' });

      await QueryService.logSuperAdminEvent(req.user?.userId!, 'SYSTEM_ROLE_TEMPLATE_DELETED', req.ip || '127.0.0.1', { roleId });
      return res.json({ success: true, message: 'Template permanently deleted.' });
    } catch (err) { next(err); }
  }
  
  // Get Platform Metrics (MAU, Active Tenants, Total API Calls)
  static async getPlatformStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const stats = await QueryService.getPlatformStats();

      const [
        globalCalls, globalErrors, cryptoLatency, emailErrors,
        dbQueryCount, dbLastLatency, dbSlowQueryCount
      ] = await Promise.all([
        redisClient.get('telemetry:global:api_calls'),
        redisClient.get('telemetry:global:errors'),
        redisClient.get('telemetry:latency:crypto:verify_password'),
        redisClient.get('telemetry:errors:email:send_otp'),
        redisClient.get('telemetry:db:query_count'),
        redisClient.get('telemetry:db:last_query_latency_ms'),
        redisClient.get('telemetry:db:slow_query_count')
      ]);
      
      return res.json({
        ...stats,
        total_api_requests: parseInt(globalCalls || '0', 10),
        telemetry: {
          live_api_calls: parseInt(globalCalls || '0', 10),
          live_errors: parseInt(globalErrors || '0', 10),
          auth_latency_ms: parseFloat(cryptoLatency || '0'),
          email_provider_errors: parseInt(emailErrors || '0', 10),
          db_query_count: parseInt(dbQueryCount || '0', 10),
          db_last_latency_ms: parseFloat(dbLastLatency || '0'),
          db_slow_query_count: parseInt(dbSlowQueryCount || '0', 10)          
        }
      });
    } catch (err) { next(err); }
  }

  static async listTenants(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenants = await QueryService.listTenantsDetailed();
      if (!tenants || tenants.length === 0) return res.json([]);

      // Fetch LIVE Current Cycle Calls from Redis for ALL tenants instantly!
      const currentMonth = new Date().toISOString().slice(0, 7);
      const pipeline = redisClient.multi();
      
      tenants.forEach(t => pipeline.get(`quota:api_usage:${t.id}:${currentMonth}`));
      const liveUsages = await pipeline.exec();

      const enrichedTenants = tenants.map((tenant, i) => {
        const liveUsage = liveUsages[i];

        return {
          ...tenant,
          current_cycle_api_calls: liveUsage 
              ? parseInt(String(liveUsage), 10) 
              : (tenant.current_cycle_api_calls || 0)
        };    
      });

      return res.json(enrichedTenants);
    } catch (err) { next(err); }
  }

  static async getTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.params.tenantId as string;
      const tenant = await QueryService.getTenantByIdDetailed(tenantId);
      
      if (!tenant) return res.status(404).json({ error: 'Workspace not found.' });
      
      const currentMonth = new Date().toISOString().slice(0, 7);
      const liveUsage = await redisClient.get(`quota:api_usage:${tenantId}:${currentMonth}`);
      
      tenant.current_cycle_api_calls = liveUsage ? parseInt(liveUsage, 10) : (tenant.current_cycle_api_calls || 0);

      return res.json(tenant);
    } catch (err) { next(err); }
  }

  static async updateTenantStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.params.tenantId as string;
      const { status } = req.body; 

      if (!['ACTIVE', 'FROZEN'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status provided.' });
      }

      const tenant = await QueryService.updateTenantStatusOnly(tenantId, status);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found.' });

      const redisKey = `tenant:frozen:${tenantId}`;
      if (status === 'FROZEN') {
        await redisClient.set(redisKey, 'true');
        await QueryService.revokeAllTenantTokens(tenantId);
      } else {
        await redisClient.del(redisKey);
      }

      await QueryService.logSuperAdminEvent(req.user?.userId!, `TENANT_${status}`, req.ip || '127.0.0.1', { target_tenant_id: tenantId });

      try {
        const admins = await QueryService.getTenantAdmins(tenantId);
        for (const admin of admins) {
          await EmailService.sendTenantStatusNotification(admin.email, tenant.company_name, status);
        }
      } catch (emailErr) {
        console.error('Non-fatal: Failed to notify admins of workspace freeze', emailErr);
      }

      return res.json({ 
        success: true, 
        message: `Tenant ${tenant.company_name} is now ${status}.`,
        tenant
      });
    } catch (err) { next(err); }
  }

  static async listGlobalUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const users = await QueryService.listGlobalUsers();

      const userIds = users.map(u => `bl:user:${u.id}`);
      let blacklistStatuses: (string | null)[] = [];
      
      if (userIds.length > 0) {
        blacklistStatuses = await redisClient.mGet(userIds);
      }
      
      const apiCallStrings = await redisClient.hmGet('telemetry:user_api_total', users.map(u => u.id));
      
      const enrichedUsers = users.map((user, index) => ({
        ...user,
        is_blacklisted: !!blacklistStatuses[index],
        total_api_calls: apiCallStrings[index] ? parseInt(apiCallStrings[index] as string, 10) : 0
      }));

      return res.json(enrichedUsers);
    } catch (err) { next(err); }
  }

  static async blacklistUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId as string;
      const { isBlacklisted } = req.body; 

      if (typeof isBlacklisted !== 'boolean') {
        return res.status(400).json({ error: 'isBlacklisted boolean flag is required' });
      }

      const redisKey = `bl:user:${userId}`;
      const workspaces = await QueryService.getTenantsByUserId(userId);

      if (isBlacklisted) {
        await redisClient.set(redisKey, 'blacklisted_by_superadmin');
        await QueryService.revokeAllUserTokensGlobally(userId);

        // ==========================================
        // THE GLOBAL KILL-SWITCH BROADCAST
        // ==========================================
        for (const workspace of workspaces) {
          // 1. Kill the active session in RAM instantly
          await EventDispatcherService.dispatch(workspace.tenant_id, 'user.session.revoked', {
            userId,
            reason: 'global_security_blacklist'
          }, 1); 

          // 2. Update the Client Software's UI Directory to show them as SUSPENDED
          await EventDispatcherService.dispatch(workspace.tenant_id, 'user.status.updated', {
            userId,
            status: 'SUSPENDED'
          }, 1);
        }
      } else {
        await redisClient.del(redisKey);
        
        // RESTORE IN DIRECTORY UI
        for (const workspace of workspaces) {
          await EventDispatcherService.dispatch(workspace.tenant_id, 'user.status.updated', {
            userId,
            status: 'ACTIVE'
          }, 2);
        }
      }

      await QueryService.logSuperAdminEvent(
        req.user?.userId!, 
        isBlacklisted ? 'GLOBAL_BLACKLIST_APPLIED' : 'GLOBAL_BLACKLIST_LIFTED', 
        req.ip || '127.0.0.1', 
        { target_user_id: userId }
      );

      try {
        const targetEmail = await QueryService.getUserEmailById(userId);
        if (targetEmail) {
          await EmailService.sendGlobalBlacklistNotification(targetEmail, isBlacklisted);
        }
      } catch (emailErr) {
        console.error('Non-fatal: Failed to send global blacklist notification', emailErr);
      }

      return res.json({ 
        success: true, 
        message: isBlacklisted ? 'Target neutralized globally.' : 'Access restored.',
        isBlacklisted 
      });
    } catch (err) { next(err); }
  } 

  static async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const logs = await QueryService.getSuperAdminAuditLogs();
      return res.json(logs);
    } catch (err) { next(err); }
  }

  // Get Deep Telemetry (Slow Queries, etc.)
  static async getSystemTelemetry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Fetches the entire slow query buffer from Redis (capped at 50 in our interceptor)
      const slowQueriesRaw = await redisClient.lRange('telemetry:db:slow_queries', 0, -1);
      
      const slowQueries = slowQueriesRaw.map(q => {
        try { return JSON.parse(q); } 
        catch (e) { return null; }
      }).filter(Boolean);

      return res.json({ slowQueries });
    } catch (err) {
      next(err);
    }
  }

  // Flush Telemetry Caches
 static async flushTelemetry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await redisClient.del('telemetry:db:slow_queries');
      await redisClient.set('telemetry:db:slow_query_count', '0');

      const purgedCount = await QueryService.flushDeadLetterQueue();

      await QueryService.logSuperAdminEvent(req.user?.userId!, 'TELEMETRY_FLUSHED', req.ip || '127.0.0.1', { purgedGhostWebhooks: purgedCount });

      return res.json({ 
        success: true, 
        message: `Telemetry buffer flushed successfully and ${purgedCount} dead-letter events purged from the ledger.` 
      });
    } catch (err) { 
        next(err); 
    }
  }
}