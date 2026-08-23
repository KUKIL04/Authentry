// apps/backend/src/routes/superadmin.ts
import { Router } from 'express';
import { SuperAdminController } from '../controllers/superadmin.controller.js';
import { ApiKeyController } from '../controllers/apikey.controller.js';
import { PlatformController } from '../controllers/platform.controller.js';
import { requireAuth, requireSuperAdmin } from '../middlewares/auth.js';

const router: Router = Router();

router.use(requireAuth);
router.use(requireSuperAdmin);

// Analytics & Telemetry
router.get('/stats', PlatformController.getPlatformStats);
router.get('/telemetry', PlatformController.getSystemTelemetry);
router.post('/telemetry/flush', PlatformController.flushTelemetry);

// Entitlement Management
router.get('/features', PlatformController.getFeatureMatrix);
router.put('/features/:featureKey', PlatformController.updateFeatureFlag);
router.post('/plans', PlatformController.createPlan);
router.put('/plans/:planCode', PlatformController.updatePlan);

// --- 1. Global Software Suites (Apps) & M2M Credentials ---
router.get('/apps', SuperAdminController.listApps);
router.post('/apps', SuperAdminController.registerApp);
router.get('/apps/:appId/credentials', ApiKeyController.getAppCredentials);
router.post('/apps/:appId/credentials/rotate', ApiKeyController.rotateAppCredentials);

router.post('/apps/webhooks', SuperAdminController.registerAppWebhook);
router.get('/apps/:appId/webhooks', SuperAdminController.getAppWebhooks);
router.delete('/apps/webhooks/:webhookId', SuperAdminController.deleteAppWebhook);

// --- 2. App Features (Modules) ---
router.get('/apps/:appId/modules', SuperAdminController.listAppModules);
router.post('/apps/:appId/modules', SuperAdminController.createAppModule);

// --- 3. The Entitlement Matrix (Tenant Allocations) ---
router.post('/allocations', SuperAdminController.allocateAppToTenant);
router.delete('/tenants/:tenantId/allocations/:appId', SuperAdminController.revokeAppFromTenant);

// --- System Role Templates ---
router.get('/role-templates', SuperAdminController.getSystemRoleTemplates);
router.post('/role-templates', SuperAdminController.createSystemRoleTemplate);
router.put('/role-templates/:roleId', SuperAdminController.updateSystemRoleTemplate);
router.delete('/role-templates/:roleId', SuperAdminController.deleteSystemRoleTemplate);

// --- Global SGC Sync & Infrastructure Health ---
router.get('/sync/status', SuperAdminController.getGlobalSyncStatus);
router.post('/sync/trigger', SuperAdminController.triggerGlobalSGC);

// Audits
router.get('/audits', SuperAdminController.getAuditLogs);

// Tenant Management
router.get('/tenants', SuperAdminController.listTenants);
router.get('/tenants/:tenantId', SuperAdminController.getTenant);
router.put('/tenants/:tenantId/status', SuperAdminController.updateTenantStatus);

// User Management
router.get('/users', SuperAdminController.listGlobalUsers);
router.put('/users/:userId/blacklist', SuperAdminController.blacklistUser);

export default router;