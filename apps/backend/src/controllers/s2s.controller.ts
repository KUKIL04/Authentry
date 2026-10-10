import { Response, NextFunction } from 'express';
import { AppRequest } from '../middlewares/api-key.js';
import { QueryService } from '../services/query.service.js';
import { CryptoService } from '../services/crypto.service.js';
import { EventDispatcherService } from '../services/event-dispatcher.service.js';
import { RequestUtil } from '../utils/request.util.js';

export class S2SController {
  
  // ==========================================
  // SECURITY: THE ENTITLEMENT GATEKEEPER
  // ==========================================
  private static async verifyModuleAllocation(appId: string, tenantId: string): Promise<boolean> {
    const isAllocated = await QueryService.verifyAppAllocation(appId, tenantId);
    return isAllocated;
  }

  // ==========================================
  // DIRECTORY FETCHING
  // ==========================================
  static async getUserDetails(req: AppRequest, res: Response, next: NextFunction) {
    try {
      const appId = req.appId as string;
      const userId = req.params.userId as string;
      const targetTenantId = req.query.tenantId as string; // Modules must declare WHO they are asking about

      if (!targetTenantId || !userId) return res.status(400).json({ error: 'Tenant ID and User ID are required.' });

      // SECURITY: Ensure this software suite is licensed to this company!
      const hasAccess = await S2SController.verifyModuleAllocation(appId, targetTenantId);
      if (!hasAccess) return res.status(403).json({ error: 'Cross-Tenant Violation: Module is not allocated to this workspace.' });

      const userRecord = await QueryService.getUserByIdAndTenant(userId, targetTenantId);
      if (!userRecord) return res.status(404).json({ error: 'User not found in this workspace directory.' });

      const accessContext = await QueryService.getUserAccessContext(userId, targetTenantId);

      return res.json({
        success: true,
        user: {
          id: userRecord.id,
          email: userRecord.email,
          firstName: userRecord.first_name,
          lastName: userRecord.last_name,
          status: userRecord.status,
          isAdmin: userRecord.is_tenant_admin,
          roles: accessContext.roles,
          entitlements: accessContext.entitlements
        }
      });
    } catch (err) { next(err); }
  }

  // ==========================================
  // ACTION: SUSPEND USER 
  // ==========================================
  static async suspendUser(req: AppRequest, res: Response, next: NextFunction) {
    try {
      const appId = req.appId as string;
      const userId = req.params.userId as string;
      const { tenantId } = req.body; // Passed in the body for POST/PUT requests

      if (!tenantId) return res.status(400).json({ error: 'Target tenantId is required in request body.' });

      // SECURITY: Matrix Gatekeeper
      const hasAccess = await S2SController.verifyModuleAllocation(appId, tenantId);
      if (!hasAccess) return res.status(403).json({ error: 'Cross-Tenant Violation: Module is not allocated to this workspace.' });

      const updated = await QueryService.updateUserStatus(userId, tenantId, 'SUSPENDED');
      if (!updated) return res.status(404).json({ error: 'User not found in this workspace.' });

      // Kill sessions and dispatch local SGC event so OTHER modules know they are suspended
      await QueryService.revokeAllUserTokensInWorkspace(userId, tenantId);      
      
      await EventDispatcherService.dispatch(tenantId, 'user.status.updated', { userId, status: 'SUSPENDED' }, 1);
      await QueryService.logEvent(tenantId, null, 'API_USER_SUSPENDED', RequestUtil.getIp(req), 'M2M Module SDK', { targetUserId: userId });

      return res.json({ success: true, message: 'User suspended via M2M interaction.' });
    } catch (err) { next(err); }
  }

  // ==========================================
  // ACTION: EMERGENCY SGC SYNC 
  // ==========================================
  static async syncUser(req: AppRequest, res: Response, next: NextFunction) {
    try {
      const appId = req.appId as string;
      const userId = req.params.userId as string;
      const { tenantId } = req.body;

      if (!tenantId) return res.status(400).json({ error: 'Target tenantId is required in request body.' });

      // SECURITY: Matrix Gatekeeper
      const hasAccess = await S2SController.verifyModuleAllocation(appId, tenantId);
      if (!hasAccess) return res.status(403).json({ error: 'Cross-Tenant Violation: Module is not allocated to this workspace.' });

      const userRecord = await QueryService.getUserByIdAndTenant(userId, tenantId);
      if (!userRecord) return res.status(404).json({ error: 'User not found in this workspace.' });

      const accessContext = await QueryService.getUserAccessContext(userId, tenantId);

      const syncPayload = {
        userId: userRecord.id,
        email: userRecord.email,
        firstName: userRecord.first_name,
        lastName: userRecord.last_name,
        status: userRecord.status,
        roles: accessContext.roles,
        entitlements: accessContext.entitlements,
        isAdmin: userRecord.is_tenant_admin
      };

      await EventDispatcherService.dispatch(tenantId, 'identity.sync.forced', syncPayload);
      await QueryService.logEvent(tenantId, null, 'API_SGC_SYNC_TRIGGERED', RequestUtil.getIp(req), 'M2M Module SDK', { targetUserId: userId });

      return res.json({ success: true, message: 'State Generation & Consolidation (SGC) re-broadcasted.' });
    } catch (err) { next(err); }
  }
}