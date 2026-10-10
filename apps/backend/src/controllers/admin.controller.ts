import { Response, NextFunction } from 'express';
import { QueryService } from '../services/query.service.js';
import { CryptoService } from '../services/crypto.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { redisClient } from '../db/redis.js';
import { AuthController } from './auth.controller.js';
import { EmailService } from '../services/email.service.js';
import { PushService } from '../services/push.service.js';
import { EventDispatcherService } from '../services/event-dispatcher.service.js';
import { RequestUtil } from '../utils/request.util.js';
import { deleteCloudinaryAsset } from '../utils/upload.util.js';
import fs from 'fs';
import path from 'path';
import { pool } from '../db/index.js';

export class AdminController {
  // Generates Invite Links & Handle Global Identity Routing
  static async inviteUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const invitedBy = req.user?.userId;
      const { email, expireHours, employeeId } = req.body;

      if (!tenantId || !invitedBy) return res.status(400).json({ error: 'User context invalid' });
      if (!email) return res.status(400).json({ error: 'Recipient email is required' });

      try {
        // Checks if this human already exist in the global matrix
        const existingUser = await QueryService.getGlobalUserByEmail(email);
        if (existingUser) {
          const userId = existingUser.id;

          // Checks if they are already in THIS specific workspace
          const membershipCheck = await QueryService.getWorkspaceMembership(userId, tenantId);

          if (membershipCheck) {
            return res.status(400).json({ 
              error: `User is already associated with this workspace (Status: ${membershipCheck.status}).` 
            });
          }

          // Instantly maps them to this workspace as PENDING (Waiting Room)
          await QueryService.addWorkspaceMembership(userId, tenantId, 'PENDING', {}, employeeId);

          // Fetches tenant branding for the email
          const tenantRecord = await QueryService.getTenantSettings(tenantId);

          // SENDS WORKSPACE ADDED EMAIL
          if (EmailService.sendWorkspaceAddedNotification) {
              await EmailService.sendWorkspaceAddedNotification(email, tenantRecord?.name || 'A new workspace');
          }

          await QueryService.logEvent(tenantId, invitedBy, 'USER_ADDED_TO_WAITING_ROOM', RequestUtil.getIp(req), RequestUtil.getAgent(req), { targetUserId: userId });

          return res.json({ 
            existingUser: true, 
            message: 'User recognized globally! They have been securely added to your Waiting Room.' 
          });
        }

        // NEW USER: Proceed with standard token generation
        const rawToken = CryptoService.generateRandomToken();
        const tokenHash = CryptoService.hashToken(rawToken);

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (expireHours ? parseInt(expireHours) : 24));

        await QueryService.createInvitation(tenantId, email, tokenHash, invitedBy, expiresAt, undefined, undefined, {}, employeeId);

        const mockInviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?token=${rawToken}`;

        // SENDS THE INVITE EMAIL
        await EmailService.sendInviteEmail(email, mockInviteLink);

        await QueryService.logEvent(tenantId, invitedBy, 'USER_INVITED', RequestUtil.getIp(req), RequestUtil.getAgent(req), { email, expiresAt });

        return res.status(201).json({
          success: true,
          existingUser: false,
          inviteLink: mockInviteLink,
          message: 'Invitation link generated and dispatched.'
        });
      } catch (e: any) {
        // CATCHES THE COMPOSITE UNIQUE CONSTRAINT
        if (e.code === '23505' && e.constraint === 'unique_tenant_employee_id') {
          return res.status(400).json({ error: 'This Employee ID is already assigned to someone else in your workspace.' });
        }
        throw e; // Rethrow other unexpected errors
      }
    } catch (err) {
      next(err);
    }
  }

  // Fetches all pending outbound invitations
  static async getPendingInvitations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });

      const invitations = await QueryService.getPendingInvitationsByTenant(tenantId);
      return res.json(invitations);
    } catch (err) {
      next(err);
    }
  }

  // Revokes an outbound invitation manually
  static async revokeInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const inviteId = req.params.inviteId as string;

      if (!tenantId) return res.status(400).json({ error: 'Context invalid' });

      // Using the scoped delete ensures an admin can only kill invites from their own workspace
      const deleted = await QueryService.deleteInvitation(inviteId, tenantId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Invitation not found or already processed' });
      }

      // Logs the revocation for audit purposes
      await QueryService.logEvent(
        tenantId,
        req.user?.userId || null,
        'INVITATION_REVOKED',
        RequestUtil.getIp(req),
        RequestUtil.getAgent(req),
        { targetInviteId: inviteId }
      );

      return res.json({ success: true, message: 'Invitation link permanently revoked.' });
    } catch (err) {
      next(err);
    }
  }

  // --- DYNAMIC ONBOARDING SCHEMA (HR CONTROLS) ---
  static async getOnboardingSchema(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: 'Context lost' });
      
      const context = await QueryService.getTenantOnboardingContext(tenantId);
      return res.json({ 
        schema: context?.onboarding_schema || [], 
        enforce: context?.enforce_profile_completion || false 
      });
    } catch (err) { next(err); }
  }

  static async updateOnboardingSchema(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const { schema, enforce } = req.body;
      if (!tenantId || !userId) return res.status(400).json({ error: 'Context lost' });
      
      const updated = await QueryService.updateTenantOnboardingSchema(tenantId, schema, enforce);
      
      // Instantly re-evaluates the Admin's profile against the new schema!
      const profileData = await QueryService.getUserProfileData(userId, tenantId);
      const isProfileIncomplete = AuthController.isProfileMissingRequiredFields(schema, profileData);

      await QueryService.logEvent(tenantId, req.user?.userId || null, 'ONBOARDING_SCHEMA_UPDATED', RequestUtil.getIp(req), RequestUtil.getAgent(req), { enforce });
      
      return res.json({ 
        success: true, 
        schema: updated.onboarding_schema, 
        enforce: updated.enforce_profile_completion,
        isProfileIncomplete 
      });
    } catch (err) { next(err); }
  }

  // Fetches the physical software suites licensed to this tenant
  static async getAllocatedApps(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });
      
      const apps = await QueryService.getTenantAppsWithModules(tenantId);
      return res.json(apps);
    } catch (err) {
      next(err);
    }
  }

  // Fetches all users belonging to the tenant directory
  static async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });
      
      const users = await QueryService.getUsersByTenant(tenantId);
      return res.json(users);
    } catch (err) {
      next(err);
    }
  }

  // Suspends or Restores user access
  static async updateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const adminId = req.user?.userId;
      const id = req.params.id as string;
      const { status } = req.body;

      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });

      if (id === adminId) {
        return res.status(400).json({ error: 'Operation denied: You cannot alter your own access status.' });
      }

      if (!['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status provided' });
      }

      const updatedUser = await QueryService.updateUserStatus(id, tenantId, status as any);
      
      // Fetches user email to send notification
      const userRecord = await QueryService.getUserByIdAndTenant(id, tenantId);
      if (userRecord && userRecord.email) {
        // SENDS STATUS CHANGE EMAIL
        await EmailService.sendStatusChangeEmail(userRecord.email, status);
      }

      if (status === 'SUSPENDED') {
        // 15-minute ban to instantly kill live Access Tokens at the API edge
        await redisClient.setEx(`bl:tenant:${tenantId}:${id}`, 900, 'revoked');
        // We intentionally do NOT revoke refresh tokens in the DB here! 
        // This allows for seamless account restoration.

        // Sends a push notification to the user
        await PushService.sendToUser(id, {
          title: 'Workspace Access Revoked 🛑',
          body: 'Your privileges for this environment have been temporarily suspended. Please contact HR.',
          tag: 'workspace-status',
          vibrate: [300, 100, 300],
          url: '/login'
        });
      } else if (status === 'ACTIVE') {
        // If restored, we lift the Redis block instantly
        await redisClient.del(`bl:tenant:${tenantId}:${id}`);
        
        // Sends a push notification to the user
        await PushService.sendToUser(id, {
          title: 'Access Restored 🔓',
          body: 'Your workspace privileges have been reinstated.',
          tag: 'workspace-status',
          vibrate: [200, 100, 200],
          url: '/app'
        });
      }
      
      await QueryService.logEvent(
        tenantId,
        req.user?.userId || null,
        'USER_STATUS_CHANGED',
        RequestUtil.getIp(req),
        RequestUtil.getAgent(req),
        { targetUserId: id, newStatus: status }
      );

      // ---DISPATCH EVENT
      // Priority 1 if SUSPENDED (Critical), Priority 2 if ACTIVE (Standard)
      const priority = status === 'SUSPENDED' ? 1 : 2;
      await EventDispatcherService.dispatch(tenantId, 'user.status.updated', {
        userId: id,
        status
      }, priority);

      return res.json({ success: true, user: updatedUser });
    } catch (err) {
      next(err);
    }
  }

  // Manages access for users inside the waiting room
  static async grantUserAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const adminId = req.user?.userId;
      
      // We extract roleIds here as well
      const { targetUserId, moduleIds, roleIds } = req.body; 

      if (!tenantId || !adminId) return res.status(400).json({ error: 'Context invalid' });
      if (!targetUserId) {
        return res.status(400).json({ error: 'Target user ID is required' });
      }

      // Assigns Modules
      if (Array.isArray(moduleIds)) {
        for (const moduleId of moduleIds) {
          try {
            await QueryService.assignUserModuleOverride(targetUserId, tenantId, moduleId, 'READ', adminId);
          } catch (e: any) {
            console.warn(`[WARNING] Skipped invalid module ${moduleId} for user ${targetUserId}`);
          }
        }
      }

      // Assigns Roles
      if (Array.isArray(roleIds)) {
        for (const roleId of roleIds) {
          try {
            await QueryService.assignUserRole(targetUserId, tenantId, roleId, adminId);
          } catch (e: any) {
            console.warn(`[WARNING] Skipped invalid role ${roleId} for user ${targetUserId}`);
          }
        }
      }

      // Sets user as Active!
      await QueryService.updateUserStatus(targetUserId, tenantId, 'ACTIVE');

      // Send Push Notification to the user
      await PushService.sendToUser(targetUserId, {
        title: 'Access Granted ✅',
        body: 'Your workspace access has been approved by your administrator. You can now launch your applications.',
        tag: 'workspace-status',
        vibrate: [200, 100, 200], // Happy double-tap
        url: '/app',
        actions: [{ action: 'launch', title: 'Launch Workspace' }],
        actionUrls: { 'launch': '/app' }
      });

      // Fetch full user details and context for Webhook Delivery
      const userRecord = await QueryService.getUserByIdAndTenant(targetUserId, tenantId);
      const accessContext = await QueryService.getUserAccessContext(targetUserId, tenantId);

      await QueryService.logEvent(
        tenantId,
        adminId,
        'ACCESS_GRANTED',
        RequestUtil.getIp(req),
        RequestUtil.getAgent(req),
        { targetUserId, moduleIds, roleIds }
      );

      // DISPATCH CRITICAL IDENTITY EVENT TO WEBHOOK SUBSCRIBERS
      await EventDispatcherService.dispatch(tenantId, 'user.access.granted', {
        userId: targetUserId,
        email: userRecord?.email,
        firstName: userRecord?.first_name,
        lastName: userRecord?.last_name,
        status: 'ACTIVE',
        roles: accessContext.roles,
        entitlements: accessContext.entitlements,
        isAdmin: userRecord?.is_tenant_admin || false
      }, 1);

      return res.json({ success: true, message: 'Access granted. User is now ACTIVE.' });
    } catch (err) {
      next(err);
    }
  }

  // UPDATE EMPLOYEE ID (Inline Editing)

  static async updateEmployeeId(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.params.userId as string;
      const { employeeId } = req.body;

      if (!tenantId) return res.status(400).json({ error: 'Context invalid' });
      
      try {
        await QueryService.updateEmployeeId(userId, tenantId, employeeId);
        
        await QueryService.logEvent(tenantId, req.user?.userId!, 'EMPLOYEE_ID_UPDATED', RequestUtil.getIp(req), RequestUtil.getAgent(req), { targetUserId: userId, newEmployeeId: employeeId });
        
        return res.json({ success: true, message: 'Employee ID updated successfully.' });
      } catch (e: any) {
        // 🚨 ELEGANTLY CATCH DUPLICATES
        if (e.code === '23505' && e.constraint === 'unique_tenant_employee_id') {
          return res.status(400).json({ error: 'This Employee ID is already assigned to someone else in this workspace.' });
        }
        throw e;
      }
    } catch (err) {
      next(err);
    }
  }

  // Fetches system audit logs
  static async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });

      const logs = await QueryService.getAuditLogs(tenantId);
      return res.json(logs);
    } catch (err) {
      next(err);
    }
  }

  // --- RBAC ENDPOINTS ---

  // Tenant Admin Creates a Job Title & Bundles Module Access
  static async createCustomRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const { name, description, bundles } = req.body; // bundles: [{ moduleId, accessLevel }]
      
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });
      if (!name) return res.status(400).json({ error: 'Role name is required' });

      // 1. Create the Custom Role
      const newRole = await QueryService.createRole(tenantId, name, description || '', false);

      // 2. Map the read/write module bundles to this new role
      if (Array.isArray(bundles)) {
        for (const bundle of bundles) {
          if (bundle.moduleId && bundle.accessLevel) {
            await QueryService.bundleRoleModule(newRole.id, bundle.moduleId, bundle.accessLevel);
          }
        }
      }

      await QueryService.logEvent(tenantId, req.user?.userId || null, 'CUSTOM_ROLE_CREATED', RequestUtil.getIp(req), RequestUtil.getAgent(req), { roleName: name });

      return res.status(201).json({ success: true, role: newRole, message: 'Custom role compiled and ready for assignment.' });
    } catch (err) {
      next(err);
    }
  }

  // Updates a Custom Role & Re-maps its Bundles
  static async updateCustomRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const roleId = req.params.roleId as string;
      const { name, description, bundles } = req.body;

      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });
      
      // 1. Update core role details
      const updatedRole = await QueryService.updateRole(roleId, tenantId, name, description);
      if (!updatedRole) return res.status(404).json({ error: 'Role not found or is a protected system template.' });

      // 2. Clear existing bundles
      await QueryService.clearRoleBundles(roleId);

      // 3. Re-map new bundles
      if (Array.isArray(bundles)) {
        for (const bundle of bundles) {
          if (bundle.moduleId && bundle.accessLevel) {
            await QueryService.bundleRoleModule(roleId, bundle.moduleId, bundle.accessLevel);
          }
        }
      }

      await QueryService.logEvent(tenantId, req.user?.userId || null, 'CUSTOM_ROLE_UPDATED', RequestUtil.getIp(req), RequestUtil.getAgent(req), { roleId, roleName: name });

      return res.json({ success: true, role: updatedRole, message: 'Custom role updated successfully.' });
    } catch (err) {
      next(err);
    }
  }

  // Permanently Deletes a Custom Role
  static async deleteCustomRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const roleId = req.params.roleId as string;

      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });

      // Because of ON DELETE CASCADE in Postgres, this automatically wipes out 
      // all role_modules bundles and user_roles assignments!
      const deletedRole = await QueryService.deleteRole(roleId, tenantId);
      
      if (!deletedRole) {
        return res.status(404).json({ error: 'Role not found or is a protected system template.' });
      }

      await QueryService.logEvent(tenantId, req.user?.userId || null, 'CUSTOM_ROLE_DELETED', RequestUtil.getIp(req), RequestUtil.getAgent(req), { roleId });

      return res.json({ success: true, message: 'Role permanently deleted.' });
    } catch (err) {
      next(err);
    }
  }

  // Fetches System Templates + Tenant's Custom Roles
  static async getRoles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });
      
      const roles = await QueryService.getRolesByTenant(tenantId);
      return res.json(roles);
    } catch (err) {
      next(err);
    }
  }

  static async getRoleUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const roleId = req.params.roleId as string;
      
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });

      const users = await QueryService.getRoleUsers(tenantId, roleId);
      return res.json(users);
    } catch (err) {
      next(err);
    }
  }

  // Bulk grant a role to multiple users
  static async grantBulkRoleAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const adminId = req.user?.userId;
      const tenantId = req.user?.tenantId;
      const { roleId, userIds } = req.body;

      if (!adminId || !tenantId) return res.status(400).json({ error: 'Context invalid' });
      if (!roleId || !Array.isArray(userIds)) {
        return res.status(400).json({ error: 'Role ID and array of User IDs are required' });
      }

      for (const userId of userIds) {
        await QueryService.assignUserRole(userId, tenantId, roleId, adminId);
      }
      await EventDispatcherService.dispatch(tenantId, 'user.role.granted', { userIds, roleId }, 2);

      return res.json({ success: true, message: `Role granted to ${userIds.length} personnel.` });
    } catch (err) {
      next(err);
    }
  }

  // Revokes a role from a single user
  static async revokeRoleAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.params.userId as string;
      const roleId = req.params.roleId as string;

      if (!tenantId) return res.status(400).json({ error: 'Context invalid' });

      await QueryService.revokeUserRole(userId, tenantId, roleId);
      await EventDispatcherService.dispatch(tenantId, 'user.role.revoked', { userId, roleId }, 1);
      return res.json({ success: true, message: 'Role revoked successfully' });
    } catch (err) {
      next(err);
    }
  }

  // --- MODULE ACCESS MAP ENDPOINTS ---

  static async getModuleUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const { moduleId } = req.params;
      
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });

      const users = await QueryService.getModuleUsers(tenantId, moduleId as string);
      return res.json(users);
    } catch (err) {
      next(err);
    }
  }

  static async revokeModuleAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const { userId, moduleId } = req.params;
      
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });

      await QueryService.removeUserModuleOverride(userId as string, tenantId, moduleId as string);
      
      await EventDispatcherService.dispatch(tenantId, 'user.module.revoked', { userId, moduleId }, 1);
      return res.json({ success: true, message: 'Access revoked successfully' });
    } catch (err) {
      next(err);
    }
  }

  // Bulk grant module access to multiple users via the Modal
  static async grantBulkModuleAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const adminId = req.user?.userId;
      const tenantId = req.user?.tenantId;
      const { moduleId, userIds, accessLevel = 'READ' } = req.body;

      if (!adminId || !tenantId) return res.status(400).json({ error: 'Context invalid' });
      if (!moduleId || !Array.isArray(userIds)) {
        return res.status(400).json({ error: 'Module ID and array of User IDs are required' });
      }

      for (const userId of userIds) {
        try {
          await QueryService.assignUserModuleOverride(userId, tenantId, moduleId, accessLevel, adminId);
        } catch (dbErr: any) {
          console.error(`❌ DB Error granting module ${moduleId} to user ${userId}:`, dbErr.message);
          throw dbErr; // Rethrow so it surfaces cleanly
        }
      }
      await EventDispatcherService.dispatch(tenantId, 'user.module.granted', { userIds, moduleId }, 2);

      return res.json({ success: true, message: `Explicit access granted to ${userIds.length} personnel.` });
    } catch (err) {
      next(err);
    }
  }

  // Updates a single user's Read/Write access level from the table dropdown
  static async updateModuleAccessLevel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const adminId = req.user?.userId;
      const tenantId = req.user?.tenantId as string;
      const moduleId = req.params.moduleId as string;
      const userId = req.params.userId as string;
      const { accessLevel } = req.body;

      if (!adminId) return res.status(400).json({ error: 'Context invalid' });
      if (!['READ', 'WRITE'].includes(accessLevel)) {
        return res.status(400).json({ error: 'Invalid access level' });
      }

      await QueryService.assignUserModuleOverride(userId, tenantId, moduleId, accessLevel, adminId);

      await EventDispatcherService.dispatch(tenantId, 'user.entitlements.updated', { 
        userIds: [userId] 
      }, 1);
      
      return res.json({ success: true, message: 'Access level updated' });
    } catch (err) {
      next(err);
    }
  }

  // --- SECURITY ENDPOINTS ---

  static async getActiveSessions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });
      
      const sessions = await QueryService.getActiveSessions(tenantId);
      return res.json(sessions);
    } catch (err) {
      next(err);
    }
  }

  static async revokeSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const adminId = req.user?.userId;
      const { tokenId } = req.params;
      const userId = req.params.userId as string;
      
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });

      if (userId === adminId) {
        return res.status(400).json({ error: 'Operation denied: You cannot force reset your own master password.' });
      }

      // Revokes the long-lived refresh token in PostgreSQL
      const revokedSession = await QueryService.revokeSession(tenantId, tokenId as string);

      // Blacklists the user in Redis to instantly kill any active Access Tokens
      if (revokedSession && revokedSession.user_id) {
        // Set expiry to 15 minutes (900 seconds) so Redis cleans up automatically
        await redisClient.setEx(`bl:tenant:${tenantId}:${revokedSession.user_id}`, 900, 'revoked');
      }

      // --- DISPATCH EVENT (Priority 1 - Critical Security)
      await EventDispatcherService.dispatch(tenantId, 'user.session.revoked', {
        userId: revokedSession?.user_id,
        tokenId,
        reason: 'admin_revoked'
      }, 1);

      return res.json({ success: true, message: 'Session terminated successfully' });
    } catch (err) {
      next(err);
    }
  }

  // --- CREDENTIAL CONTROLS ---

  static async triggerPasswordReset(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const adminId = req.user?.userId;
      const userId = req.params.userId as string;
      
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });

      if (userId === adminId) {
        return res.status(400).json({ error: 'Operation denied: You cannot force reset your own master password.' });
      }

      // Fetches the target user's email
      const userRecord = await QueryService.getUserByIdAndTenant(userId, tenantId);
      if (!userRecord || !userRecord.email) {
        return res.status(404).json({ error: 'User not found in directory' });
      }

      // Scrambles the password
      const randomScramble = await CryptoService.hashPassword(CryptoService.generateRandomToken());
      await QueryService.updateUserPassword(userRecord.email, randomScramble);

      // Sends a push notification to the user to alert them of the forced reset
      await PushService.sendToUser(userId, {
        title: 'Mandatory Password Reset ⚠️',
        body: 'Your administrator has invalidated your current password for security reasons.',
        tag: 'security-alert',
        vibrate: [400, 100, 400],
        url: '/login',
        actions: [{ action: 'recover', title: 'Setup New Password' }],
        actionUrls: { 'recover': '/forgot-password' }
      });

      // Nukes all database sessions for this user
      await QueryService.revokeAllUserTokensInWorkspace(userId, tenantId);
      
      // Blacklists the user in Redis to instantly kill live Access Tokens
      await redisClient.setEx(`bl:tenant:${tenantId}:${userId}`, 900, 'revoked');

      // Sends the notification email (NOT an OTP)
      await EmailService.sendForceResetNotification(userRecord.email);

      // Logs the severe security action
      await QueryService.logEvent(
        tenantId,
        adminId || null,
        'ADMIN_FORCED_PASSWORD_RESET',
        RequestUtil.getIp(req),
        RequestUtil.getAgent(req),
        { targetUserId: userId }
      );

      // --- DISPATCH EVENT (Priority 1 - Critical Security)
      await EventDispatcherService.dispatch(tenantId, 'user.password_reset.forced', {
        userId,
        reason: 'admin_security_action'
      }, 1);
      
      return res.json({ success: true, message: 'Credentials invalidated, sessions killed, and user notified.' });
    } catch (err) {
      next(err);
    }
  }

  static async clearSecurityLockout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const adminId = req.user?.userId;
      const userId = req.params.userId as string;
      
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });

      // Deletes the user's blacklist/lockout record from Redis
      const redisKey = `bl:tenant:${tenantId}:${userId}`;
      await redisClient.del(redisKey);

      // Fetches the user's email to notify them
      const userRecord = await QueryService.getUserByIdAndTenant(userId, tenantId);
      if (userRecord && userRecord.email) {
        await EmailService.sendLockoutClearedEmail(userRecord.email);
      }

      // Logs the security action
      await QueryService.logEvent(
        tenantId,
        adminId || null,
        'SECURITY_LOCKOUT_CLEARED',
        RequestUtil.getIp(req),
        RequestUtil.getAgent(req),
        { targetUserId: userId }
      );
      
      return res.json({ success: true, message: 'Account lockout cleared and user notified.' });
    } catch (err) {
      next(err);
    }
  }

  // --- TENANT SETTINGS ENDPOINTS ---

  static async getTenantSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });

      const settings = await QueryService.getTenantSettings(tenantId);
      
      const themeEntitlement = await QueryService.checkTenantEntitlement(tenantId, 'customTheme');

      return res.json({
        id: settings.id,
        name: settings.name,
        logoUrl: themeEntitlement.isAllowed ? settings.logo_url : '',
        themeColor: themeEntitlement.isAllowed ? settings.theme_color : '#c87c0a',
        locks: {
          customTheme: !themeEntitlement.isAllowed
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // STAGING PHASE: Just saves the file to disk and return the URL
  static async uploadWorkspaceLogo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Generates the public URL path that React will use for the live preview
      const logoUrl = (req.file as any).path;

      // We are NOT touching the database here
      return res.json({ 
        success: true, 
        message: 'Logo staged for preview',
        logoUrl 
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Logo upload failed' });
    }
  }

  // 2. COMMIT PHASE: Save all settings and clean up old files
  static async updateTenantSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });
      
      const { name, logoUrl, themeColor } = req.body;
      if (!name) return res.status(400).json({ error: 'Company Name is required' });

      // Fetches current settings to check if the logo was actually replaced
      const currentTenant = await QueryService.getTenantSettings(tenantId);

      // Checks Entitlements to see what they are actually allowed to save
      const themeEntitlement = await QueryService.checkTenantEntitlement(tenantId, 'customTheme');

      // Only accepts incoming premium values if they have the tier
      // Otherwise, securely reverts to the previous values from the database
      const finalLogoUrl = themeEntitlement.isAllowed ? logoUrl : currentTenant.logo_url;
      const finalThemeColor = themeEntitlement.isAllowed ? themeColor : currentTenant.theme_color;

      // Obliterates the old image from the hard drive ONLY if it was legally replaced
      if (currentTenant && currentTenant.logo_url && currentTenant.logo_url !== finalLogoUrl) {
        if (currentTenant.logo_url.startsWith('/uploads/')) {
          const oldFilePath = path.join(process.cwd(), 'public', currentTenant.logo_url);
          if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
        } else if (currentTenant.logo_url.includes('cloudinary.com')) {
          await deleteCloudinaryAsset(currentTenant.logo_url);
        }
      }

      // Commits the final state to PostgreSQL
      const updatedSettings = await QueryService.updateTenantSettings(tenantId, {
        name,
        logoUrl: finalLogoUrl,
        themeColor: finalThemeColor
      });

      return res.json({ success: true, message: 'Workspace settings committed', settings: updatedSettings });
    } catch (err) {
      next(err);
    }
  }

  // --- BILLING & SUBSCRIPTIONS ---

  static async getBillingStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });

      // Fetch Subscriptiones Data
      const subQuery = `
        SELECT ts.plan_code, ts.subscription_status, pd.name as plan_name, pd.monthly_price_usd, pd.tier_rank
        FROM tenant_subscriptions ts
        JOIN plan_definitions pd ON ts.plan_code = pd.code
        WHERE ts.tenant_id = $1
      `;
      const subRes = await pool.query(subQuery, [tenantId]);

      // Fallbacks in case the tenant lacks a subscription row entirely
      const subscriptionData = subRes.rows.length > 0 ? subRes.rows[0] : {
         plan_code: 'FREE_TIER',
         subscription_status: 'ACTIVE',
         plan_name: 'Free Tier',
         monthly_price_usd: 0,
         tier_rank: 0
      };

      // Fetches MAU Limits
      const mauQuota = await QueryService.getTenantMauQuota(tenantId);
      
      // Fetches API Limits
      const apiQuota = await QueryService.getTenantApiQuota(tenantId);
      
      // Fetches LIVE API usage directly from Redis
      const currentMonth = new Date().toISOString().slice(0, 7); 
      const apiUsageKey = `quota:api_usage:${tenantId}:${currentMonth}`;
      const currentApiUsageStr = await redisClient.get(apiUsageKey);

      return res.json({
        subscription: subRes.rows[0],
        usage: {
          mau: { 
            // Safely checks if mauQuota exists before reading current_usage
            current: mauQuota?.current_usage ? parseInt(mauQuota.current_usage.toString(), 10) : 0,
            max: mauQuota?.max_allowed ?? null 
          },
          api: { 
            current: parseInt(currentApiUsageStr || '0', 10), 
            max: apiQuota?.max_allowed ?? null
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAvailablePlans(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = `
        SELECT code, name, monthly_price_usd, max_mau, max_api_requests, tier_rank 
        FROM plan_definitions 
        WHERE is_active = TRUE 
        ORDER BY tier_rank ASC
      `;
      const result = await pool.query(query);
      return res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }

  static async upgradePlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const { planCode } = req.body;
      
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });
      if (!planCode) return res.status(400).json({ error: 'Target plan code required' });

      // Fetches the new plan details to get the name and limits for the email
      const planQuery = 'SELECT name, max_mau, max_api_requests FROM plan_definitions WHERE code = $1';
      const planRes = await pool.query(planQuery, [planCode]);
      
      if (planRes.rows.length === 0) {
        return res.status(404).json({ error: 'Invalid plan code selected.' });
      }
      const newPlan = planRes.rows[0];

      // Mock Checkout: Directly updates the tenant's plan
      await pool.query(
        'UPDATE tenant_subscriptions SET plan_code = $1 WHERE tenant_id = $2',
        [planCode, tenantId]
      );

      // Audit Log
      await QueryService.logEvent(
        tenantId, req.user?.userId || null, 'SUBSCRIPTION_UPGRADED', RequestUtil.getIp(req), RequestUtil.getAgent(req), { newPlan: planCode }
      );

      // We flush the Redis cache so the Quota Engine instantly recognizes the new limits
      await redisClient.del(`quota:api_limit:${tenantId}`);
      await redisClient.del(`entitlement:${tenantId}:*`);

      // Dispatches Upgrade Emails to Workspace Admins
      try {
        const admins = await QueryService.getTenantAdmins(tenantId);
        for (const admin of admins) {
          await EmailService.sendPlanUpgradeEmail(
            admin.email, 
            newPlan.name, 
            newPlan.max_mau, 
            newPlan.max_api_requests
          );
        }
      } catch (emailErr) {
        console.error('Non-fatal: Failed to notify admins of plan upgrade', emailErr);
      }

      return res.json({ success: true, message: 'Plan upgraded successfully!' });
    } catch (err) {
      next(err);
    }
  } 

  // ==========================================
  // BULK DIRECTORY IMPORT (CSV/EXCEL WIZARD)
  // ==========================================
  static async bulkImportUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const adminId = req.user?.userId;
      // Extract the new security flag (defaults to true for backwards compatibility)
      const { users, bypassWaitingRoom = true } = req.body; // Array of mapped { email } objects

      if (!tenantId || !adminId) return res.status(400).json({ error: 'Context invalid' });
      if (!Array.isArray(users) || users.length === 0) return res.status(400).json({ error: 'No user data provided for import.' });

      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      const tenantRecord = await QueryService.getTenantSettings(tenantId);

      // Process sequentially to safely catch individual row failures without crashing the batch
      for (const row of users) {
        if (!row.email) {
          failureCount++;
          errors.push('A row was skipped because it lacked an email address.');
          continue;
        }

        const email = row.email.toLowerCase().trim();
        const roleIds = row.roleIds || [];

        try {
          // 1. Check if they already exist globally
          const existingUser = await QueryService.getGlobalUserByEmail(email);
          
          if (existingUser) {
            // Check if they are already in this workspace
            const membershipCheck = await QueryService.getWorkspaceMembership(existingUser.id, tenantId);
            if (!membershipCheck) {

              // ROUTING FIX: Assign 'PENDING' if we are not bypassing the waiting room
              const targetStatus = bypassWaitingRoom ? 'ACTIVE' : 'PENDING';

              await QueryService.addWorkspaceMembership(existingUser.id, tenantId, targetStatus, row.customProfileData, row.employeeId);
              
              if (bypassWaitingRoom && roleIds.length > 0) {
                 await QueryService.assignBulkUserRoles([existingUser.id], tenantId, roleIds, adminId);
              }

              if (EmailService.sendWorkspaceAddedNotification) {
                await EmailService.sendWorkspaceAddedNotification(email, tenantRecord?.name || 'A new workspace');
              }
              successCount++;
            } else {
              failureCount++;
              errors.push(`${email}: Already exists in this workspace.`);
            }
            continue; // Move to next row
          }

          // 2. Brand New User -> Generate Invite Link
          const rawToken = CryptoService.generateRandomToken();
          const tokenHash = CryptoService.hashToken(rawToken);
          
          // Bulk invites get 3 days to accommodate weekend imports
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 72); 

          const payloadData: any = {
            ...(row.customProfileData || {})
          };

          if (bypassWaitingRoom) {
            payloadData._auto_active = true;
            payloadData._pre_assigned_roles = roleIds;
          }

          await QueryService.createInvitation(
            tenantId, 
            email, 
            tokenHash, 
            adminId, 
            expiresAt,
            row.firstName,
            row.lastName,
            payloadData,
            row.employeeId
          );

          const mockInviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?token=${rawToken}`;
          await EmailService.sendInviteEmail(email, mockInviteLink);

          successCount++;
        } catch (e: any) {
          failureCount++;
          if (e.code === '23505' && e.constraint === 'unique_tenant_employee_id') {
            errors.push(`${email}: Employee ID '${row.employeeId}' is already assigned to someone else.`);
          } else {
            errors.push(`${email}: ${e.message}`);
          }
        }
      }

      await QueryService.logEvent(tenantId, adminId, 'BULK_IMPORT_PROCESSED', RequestUtil.getIp(req), RequestUtil.getAgent(req), { successCount, failureCount });

      return res.json({ 
        success: true, 
        message: `Import complete. ${successCount} users successfully invited. ${failureCount} failed.`,
        successCount, 
        failureCount, 
        errors 
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // TENANT-DRIVEN STATE SYNCHRONIZATION (SGC)
  // ==========================================

  static async syncUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.params.userId as string;
      
      if (!tenantId || !userId) return res.status(400).json({ error: 'Context invalid' });

      // ANTI-SPAM LOCK: 5 Minute Cooldown per user
      const lockKey = `lock:sync:user:${tenantId}:${userId}`;
      const acquiredLock = await redisClient.set(lockKey, 'locked', { EX: 300, NX: true });

      if (!acquiredLock) {
        return res.status(429).json({ 
          error: 'Identity is already up-to-date or currently synchronizing. Please wait 5 minutes.'
        });
      }

      const userRecord = await QueryService.getUserByIdAndTenant(userId, tenantId);
      if (!userRecord) return res.status(404).json({ error: 'User not found in directory.' });

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

      // Dispatches with Priority 2 (Standard Tenant Action)
      await EventDispatcherService.dispatch(tenantId, 'identity.sync.forced', syncPayload, 2);

      return res.json({ success: true, message: 'Identity sync payload dispatched to allocated suites.' });
    } catch (err) {
      next(err);
    }
  }

  static async syncWorkspace(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: 'Context invalid' });

      // ANTI-SPAM LOCK: 30 Minute Cooldown for Bulk Syncs
      const lockKey = `lock:sync:workspace:${tenantId}`;
      const acquiredLock = await redisClient.set(lockKey, 'locked', { EX: 1800, NX: true });

      if (!acquiredLock) {
        return res.status(429).json({ 
          error: 'Workspace has been synchronized recently. Please wait 30 minutes before triggering another bulk sync.'
        });
      }

      // Fetch all users in this tenant
      const users = await QueryService.getUsersByTenant(tenantId);
      const activeUsers = users.filter(u => u.status !== 'PENDING');

      let dispatchedCount = 0;

      for (const userRecord of activeUsers) {
        const accessContext = await QueryService.getUserAccessContext(userRecord.id, tenantId);
        
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

        // Dispatches with Priority 3 (Bulk/Background Action) to avoid clogging the queue
        await EventDispatcherService.dispatch(tenantId, 'identity.sync.forced', syncPayload, 3);
        dispatchedCount++;
      }

      await QueryService.logEvent(tenantId, req.user?.userId!, 'WORKSPACE_BULK_SYNC_TRIGGERED', RequestUtil.getIp(req), RequestUtil.getAgent(req), { dispatchedCount });

      return res.json({ 
        success: true, 
        message: `Bulk sync initiated. ${dispatchedCount} identities queued for dispatch.` 
      });
    } catch (err) {
      await redisClient.del(`lock:sync:workspace:${req.user?.tenantId}`); // Release lock on catastrophic failure
      next(err);
    }
  }
}