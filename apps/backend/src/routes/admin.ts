import { Router, RequestHandler } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { uploadLogo } from '../middlewares/upload.js';
import { requireQuota } from '../middlewares/quota.js';
import { requireFeature } from '../middlewares/entitlement.js';

const router: Router = Router();

// ==========================================
// THE GATEKEEPERS
// Every route below this line requires a valid JWT AND costs an API call
// ==========================================
router.use(requireAuth as RequestHandler);
router.use(requireQuota('API_CALLS') as RequestHandler);

// -- Invitations & Access --
router.post('/invite', requireAdmin as RequestHandler, requireQuota('MAU') as RequestHandler, AdminController.inviteUser as RequestHandler);
router.get('/invitations', requireAdmin as RequestHandler, AdminController.getPendingInvitations as RequestHandler);
router.delete('/invitations/:inviteId', requireAdmin as RequestHandler, AdminController.revokeInvitation as RequestHandler);
router.post('/grant-access', requireAdmin as RequestHandler, AdminController.grantUserAccess as RequestHandler);

// -- Core Directory --
router.get('/apps', requireAdmin as RequestHandler, AdminController.getAllocatedApps as RequestHandler);
router.get('/users', requireAdmin as RequestHandler, AdminController.getUsers as RequestHandler);
router.get('/audits', AdminController.getAuditLogs as RequestHandler);
router.put('/users/:id/status', requireAdmin as RequestHandler, AdminController.updateUserStatus as RequestHandler);
router.put('/users/:userId/employee-id', requireAdmin as RequestHandler, AdminController.updateEmployeeId as RequestHandler);

// -- RBAC Routes --
router.get('/roles', AdminController.getRoles as RequestHandler);
router.post('/roles', requireAdmin as RequestHandler, requireFeature('advancedRbac') as RequestHandler, AdminController.createCustomRole as RequestHandler);
router.put('/roles/:roleId', requireAdmin as RequestHandler, requireFeature('advancedRbac') as RequestHandler, AdminController.updateCustomRole as RequestHandler);
router.delete('/roles/:roleId', requireAdmin as RequestHandler, requireFeature('advancedRbac') as RequestHandler, AdminController.deleteCustomRole as RequestHandler);
router.get('/roles/:roleId/users', AdminController.getRoleUsers as RequestHandler);
router.post('/roles/bulk-grant', requireAdmin as RequestHandler, requireFeature('advancedRbac') as RequestHandler, AdminController.grantBulkRoleAccess as RequestHandler);
router.delete('/users/:userId/roles/:roleId', requireAdmin as RequestHandler, requireFeature('advancedRbac') as RequestHandler, AdminController.revokeRoleAccess as RequestHandler);

// -- Module Access Map Routes --
router.get('/modules/:moduleId/users', AdminController.getModuleUsers as RequestHandler);
router.delete('/users/:userId/modules/:moduleId', AdminController.revokeModuleAccess as RequestHandler);
router.post('/modules/bulk-grant', requireAdmin as RequestHandler, AdminController.grantBulkModuleAccess as RequestHandler);
router.put('/modules/:moduleId/users/:userId/access', requireAdmin as RequestHandler, AdminController.updateModuleAccessLevel as RequestHandler);

// -- Security & Session Routes --
router.get('/sessions', AdminController.getActiveSessions as RequestHandler);
router.delete('/sessions/:tokenId', AdminController.revokeSession as RequestHandler);

// -- Credential Control Routes --
router.post('/users/:userId/reset-password', AdminController.triggerPasswordReset as RequestHandler);
router.post('/users/:userId/clear-lockout', AdminController.clearSecurityLockout as RequestHandler);

// -- Workspace Settings Routes --
router.get('/settings', AdminController.getTenantSettings as RequestHandler);
router.put('/settings', AdminController.updateTenantSettings as RequestHandler);
router.get('/settings/onboarding', requireAdmin as RequestHandler, AdminController.getOnboardingSchema as RequestHandler);
router.put('/settings/onboarding', requireAdmin as RequestHandler, AdminController.updateOnboardingSchema as RequestHandler);

// Note: Multer middleware does not need casting
router.post('/settings/logo', requireFeature('customTheme') as RequestHandler, uploadLogo.single('logo'), AdminController.uploadWorkspaceLogo as RequestHandler);

// -- Billing & Subscriptions --
router.get('/billing/status', requireAdmin as RequestHandler, AdminController.getBillingStatus as RequestHandler);
router.get('/billing/plans', requireAdmin as RequestHandler, AdminController.getAvailablePlans as RequestHandler);
router.post('/billing/upgrade', requireAdmin as RequestHandler, AdminController.upgradePlan as RequestHandler);

router.post('/users/bulk-import', requireAdmin as RequestHandler, requireQuota('MAU') as RequestHandler, AdminController.bulkImportUsers as RequestHandler);

// Add these down with your other User/Directory routes
router.post('/users/:userId/sync', requireAdmin as RequestHandler, AdminController.syncUser as RequestHandler);
router.post('/sync-workspace', requireAdmin as RequestHandler, AdminController.syncWorkspace as RequestHandler);

export default router;