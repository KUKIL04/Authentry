import { Request, Response, NextFunction } from 'express';
import { QueryService } from '../services/query.service.js';
import { CryptoService } from '../services/crypto.service.js';
import { EventDispatcherService } from '../services/event-dispatcher.service.js';
import { redisClient } from '../db/redis.js';
import { OtpService } from '../services/otp.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { AppRequest } from '../middlewares/api-key.js';
import crypto from 'crypto';

export class AuthController {
  // --- DEDICATED SUPERADMIN LOGIN ---
  static async superAdminLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and Password are required' });
      }

      // Queries the global identity matrix directly, bypassing workspace memberships
      const user = await QueryService.getUserByEmailForAuth(email);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Instant denial if they lack the superadmin flag
      if (!user.is_superadmin) {
        return res.status(403).json({ error: 'Terminal Access Denied: SuperAdmin clearance required.' });
      }

      const match = await CryptoService.verifyPassword(password, user.password_hash);
      
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generates the token. We pass 'SYSTEM' as the tenant ID since they sit above all tenants.
      const accessToken = CryptoService.generateAccessToken({
        userId: user.id,
        tenantId: 'SYSTEM',
        isAdmin: true,
      });

      // Generates and stores the SuperAdmin Refresh Token
      const rawRefreshToken = CryptoService.generateRandomToken();
      const hashedRefresh = CryptoService.hashToken(rawRefreshToken);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);

      await QueryService.saveRefreshToken(user.id, 'SYSTEM', hashedRefresh, expiry, req.ip || '127.0.0.1', req.headers['user-agent'] as string || 'unknown');

      // Logs the login event directly to the highly secure superadmin_audit_logs
      await QueryService.logSuperAdminEvent(user.id, 'SUPERADMIN_LOGIN', req.ip || '127.0.0.1');

      return res.json({
        accessToken,
        refreshToken: rawRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          isSuperAdmin: true,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // Helper to dynamically check if the user is missing required fields
  static isProfileMissingRequiredFields(schema: any[], data: any): boolean {
    if (!schema || !Array.isArray(schema)) return false;
    
    const requiredFieldIds = schema.filter(f => f.required).map(f => f.id);
    if (requiredFieldIds.length === 0) return false;
    if (!data) return true; 
    
    for (const fieldId of requiredFieldIds) {
      if (data[fieldId] === undefined || data[fieldId] === null || data[fieldId] === '') {
        return true;
      }
    }
    return false;
  }
  
  // --- THE LOGIN METHOD ---
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, redirectUri, targetTenantId, clientId, oldRefreshToken } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and Password are required' });
      }

      // ==========================================
      // 1. GLOBAL IDENTITY & BRUTE FORCE CHECK
      // ==========================================
      const globalUser = await QueryService.getUserByEmailForAuth(email);
      
      if (!globalUser) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const lockoutKey = `lockout:user:${globalUser.id}`;
      const isLocked = await redisClient.get(lockoutKey);
      
      if (isLocked) {
        return res.status(403).json({ error: 'Account locked due to too many failed attempts. Please wait 15 minutes.' });
      }

      const match = await CryptoService.verifyPassword(password, globalUser.password_hash);
      
      if (!match) {
        const attemptsKey = `login_attempts:${globalUser.id}`;
        const attempts = await redisClient.incr(attemptsKey);
        if (attempts === 1) await redisClient.expire(attemptsKey, 900);

        if (attempts >= 3) {
          await redisClient.setEx(lockoutKey, 900, 'locked'); 
          await redisClient.del(attemptsKey);
          return res.status(403).json({ error: 'Maximum attempts reached. Account locked for 15 minutes.' });
        }
        return res.status(401).json({ error: `Invalid credentials. ${3 - attempts} attempts remaining.` });
      }

      // Clears the brute-force tracking keys upon successful login
      await redisClient.del(lockoutKey);
      await redisClient.del(`login_attempts:${globalUser.id}`);

      // Checks Global Platform Blacklist
      const blacklistKey = `bl:user:${globalUser.id}`;
      const isBlacklisted = await redisClient.get(blacklistKey);
      if (isBlacklisted) {
        return res.status(403).json({ error: 'Access Denied: Your global identity has been suspended by the platform administrator.' });
      }

      // ==========================================
      // 2. WORKSPACE AGGREGATION & FILTERING
      // ==========================================
      let workspaces = await QueryService.getTenantsByEmail(email);

      if (workspaces.length === 0) {
        return res.status(403).json({ 
          error: 'ORPHANED_USER', 
          message: 'No associated workspaces found for these credentials. Please contact your organization to provision access.' 
        });
      }

      if (clientId) {
        const allocatedTenantIds = await QueryService.getAllocatedTenantsForClient(clientId);
        workspaces = workspaces.filter(w => allocatedTenantIds.includes(w.tenant_id));

        if (workspaces.length === 0) {
          return res.status(403).json({ 
            error: 'APP_NOT_ALLOCATED',
            message: 'Access Denied: Your workspaces are not licensed for this software suite.' 
          });
        }
      }

      let contextualWorkspaces = workspaces;
      if (targetTenantId) {
        contextualWorkspaces = workspaces.filter(w => w.tenant_id === targetTenantId);
        if (contextualWorkspaces.length === 0) {
          return res.status(403).json({ 
            error: 'OAUTH_SECURITY_VIOLATION',
            message: 'The requested workspace context is invalid or you do not have permission to access it.'
          });
        }
      }

      // SUPERADMIN FREEZE CHECK
      const activeWorkspaces = contextualWorkspaces.filter(w => w.tenant_status === 'ACTIVE');
      if (activeWorkspaces.length === 0) {
        const tenantNames = contextualWorkspaces.map(w => w.company_name).join(', ');
        return res.status(403).json({ 
          error: 'WORKSPACE_FROZEN', 
          message: contextualWorkspaces.length === 1
            ? `Your workspace (${tenantNames}) has been suspended.`
            : `Your associated workspaces (${tenantNames}) have been suspended.`
        });
      }

      // HR ADMIN SUSPENSION CHECK
      const accessibleWorkspaces = activeWorkspaces.filter(w => w.status !== 'SUSPENDED');
      if (accessibleWorkspaces.length === 0) {
        return res.status(403).json({ 
          error: 'USER_SUSPENDED', 
          message: 'Your access to this workspace has been suspended by your administrator.'
        });
      }

      // Proceeds ONLY with the first ACTIVE workspace
      const targetRecord = accessibleWorkspaces[0];

      // Clears the Tenant-Specific security lockout
      await redisClient.del(`bl:tenant:${targetRecord.tenant_id}:${targetRecord.user_id}`);

      // ==========================================
      // 3. MULTI-TENANT RESOLUTION OR FINALIZATION
      // ==========================================
      if (workspaces.length > 1 && !targetTenantId) {
        const tempToken = CryptoService.generateTempToken({ userId: targetRecord.user_id });
        return res.json({
          requiresTenantSelection: true,
          tempToken,
          tenants: activeWorkspaces.map(w => ({
            tenantId: w.tenant_id,
            companyName: w.company_name,
            logoUrl: w.logo_url
          }))
        });
      }

      const accessContext = await QueryService.getUserAccessContext(targetRecord.user_id, targetRecord.tenant_id);

      if (oldRefreshToken) {
        const hashedOldRefresh = CryptoService.hashToken(oldRefreshToken);
        await QueryService.revokeRefreshToken(hashedOldRefresh);
      }

      const profileData = await QueryService.getUserProfileData(targetRecord.user_id, targetRecord.tenant_id);
      const tenantContext = await QueryService.getTenantOnboardingContext(targetRecord.tenant_id);
      
      const isProfileIncomplete = AuthController.isProfileMissingRequiredFields(tenantContext?.onboarding_schema, profileData);
      const isProfileEnforced = tenantContext?.enforce_profile_completion || false;

      const accessToken = CryptoService.generateAccessToken({
        userId: targetRecord.user_id,
        tenantId: targetRecord.tenant_id,
        tenantName: targetRecord.company_name,
        isAdmin: targetRecord.is_tenant_admin,
        email: targetRecord.email,
        firstName: targetRecord.first_name,
        lastName: targetRecord.last_name,
        status: targetRecord.status,
        roles: accessContext.roles,
        entitlements: accessContext.entitlements,
        isProfileIncomplete,
        isProfileEnforced
      });

      const rawRefreshToken = CryptoService.generateRandomToken();
      const hashedRefresh = CryptoService.hashToken(rawRefreshToken);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);

      await QueryService.saveRefreshToken(targetRecord.user_id, targetRecord.tenant_id, hashedRefresh, expiry, req.ip || '127.0.0.1', req.headers['user-agent'] as string || 'unknown');
      await QueryService.logEvent(targetRecord.tenant_id, targetRecord.user_id, 'USER_LOGIN', req.ip || '127.0.0.1', req.headers['user-agent'] || 'unknown', {});

      const userPayload = {
        id: targetRecord.user_id,
        tenantId: targetRecord.tenant_id,
        tenantName: targetRecord.company_name,
        email: targetRecord.email,
        firstName: targetRecord.first_name,
        lastName: targetRecord.last_name,
        status: targetRecord.status,
        isAdmin: targetRecord.is_tenant_admin,
        roles: accessContext.roles,
        entitlements: accessContext.entitlements,
        isProfileIncomplete,
        isProfileEnforced
      };

      if (redirectUri) {
        let isValidRedirect = false;
        try {
          const redirectHost = new URL(redirectUri).hostname;
          if (redirectHost === 'localhost' || redirectHost === '127.0.0.1') {
            isValidRedirect = true;
          } else if (clientId) {
            const apps = await QueryService.getAllApps();
            const targetApp = apps.find((a: any) => a.client_id === clientId);
            if (targetApp && targetApp.production_url) {
              const rawAppDomain = targetApp.production_url;
              const normalizedAppHost = new URL(rawAppDomain.startsWith('http') ? rawAppDomain : `https://${rawAppDomain}`).hostname;
              if (redirectHost === normalizedAppHost) isValidRedirect = true;
            }
          }
        } catch (e) {
          return res.status(400).json({ error: 'Malformed redirect URI.' });
        }

        if (!isValidRedirect) {
          return res.status(403).json({ 
            error: 'OAUTH_SECURITY_VIOLATION',
            message: 'The requested application endpoint is not registered or trusted by your workspace.' 
          });
        }

        const authCode = crypto.randomBytes(32).toString('hex');
        const codePayload = JSON.stringify({ accessToken, refreshToken: rawRefreshToken, user: userPayload, tenantId: targetRecord.tenant_id });
        await redisClient.setEx(`auth_code:${authCode}`, 60, codePayload);

        const finalUrl = new URL(redirectUri);
        finalUrl.searchParams.append('code', authCode);

        return res.json({ 
          success: true, 
          redirectUrl: finalUrl.toString(),
          accessToken, 
          refreshToken: rawRefreshToken, 
          user: userPayload 
        });
      }

      return res.json({ accessToken, refreshToken: rawRefreshToken, user: userPayload });
    } catch (err) {
      next(err);
    }
  }

  // --- THE NEW SELECT WORKSPACE METHOD ---
  static async selectWorkspace(req: Request, res: Response, next: NextFunction) {
    try {
      const { tempToken, tenantId, oldRefreshToken, redirectUri, clientId } = req.body;

      if (!tempToken || !tenantId) {
        return res.status(400).json({ error: 'Token and Workspace ID are required' });
      }

      // Verifies the Pre-Auth token
      const decoded = CryptoService.verifyTempToken(tempToken);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }

      // Double-check Global Platform Blacklist
      const blacklistKey = `bl:user:${decoded.userId}`;
      const isBlacklisted = await redisClient.get(blacklistKey);
      if (isBlacklisted) {
        return res.status(403).json({ error: 'Access Denied: Your global identity has been suspended by the platform administrator.' });
      }

      // Verifies the user actually belongs to the requested workspace
      const user = await QueryService.getUserByIdAndTenant(decoded.userId, tenantId);
      
      if (!user || user.status === 'SUSPENDED') {
        return res.status(403).json({ 
          error: 'USER_SUSPENDED', 
          message: 'Your access to this workspace has been suspended.' 
        });
      }

      // Kills the old session if they are switching workspaces ---
      if (oldRefreshToken) {
        const hashedOldRefresh = CryptoService.hashToken(oldRefreshToken);
        await QueryService.revokeRefreshToken(hashedOldRefresh);
      }

      // --- THE ENTERPRISE CONTEXT AGGREGATION ---
      const accessContext = await QueryService.getUserAccessContext(user.id, user.tenant_id);

      // --- THE PROGRESSIVE PROFILING EVALUATION ---
      const profileData = await QueryService.getUserProfileData(user.id, user.tenant_id);
      const tenantContext = await QueryService.getTenantOnboardingContext(user.tenant_id);
      
      const isProfileIncomplete = AuthController.isProfileMissingRequiredFields(tenantContext?.onboarding_schema, profileData);
      const isProfileEnforced = tenantContext?.enforce_profile_completion || false;

      // Clears the tenant-specific blacklist so the fresh tokens actually work
      await redisClient.del(`bl:tenant:${user.tenant_id}:${user.id}`);

      // Generate Final Credentials
      const accessToken = CryptoService.generateAccessToken({
        userId: user.id,
        tenantId: user.tenant_id,
        tenantName: user.company_name,
        isAdmin: user.is_tenant_admin,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        status: user.status,
        roles: accessContext.roles,
        entitlements: accessContext.entitlements,
        isProfileIncomplete,
        isProfileEnforced
      });

      const rawRefreshToken = CryptoService.generateRandomToken();
      const hashedRefresh = CryptoService.hashToken(rawRefreshToken);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);

      await QueryService.saveRefreshToken(user.id, user.tenant_id, hashedRefresh, expiry, req.ip || '127.0.0.1', req.headers['user-agent'] as string || 'unknown');
      await QueryService.logEvent(user.tenant_id, user.id, 'USER_LOGIN', req.ip || '127.0.0.1', req.headers['user-agent'] || 'unknown', {});

      const userPayload = {
        id: user.id, 
        tenantId: user.tenant_id,
        tenantName: user.company_name,
        email: user.email, 
        firstName: user.first_name, 
        lastName: user.last_name, 
        status: user.status, 
        isAdmin: user.is_tenant_admin,
        roles: accessContext.roles,
        entitlements: accessContext.entitlements,
        isProfileIncomplete,
        isProfileEnforced
      };

      // --- THE AUTHORIZATION CODE REDIRECT FLOW ---
      if (redirectUri) {
        // SECURITY PATCH: Open Redirect Prevention
        let isValidRedirect = false;

        try {
          const redirectHost = new URL(redirectUri).hostname;
          
          // Allowed localhost for development
          if (redirectHost === 'localhost' || redirectHost === '127.0.0.1') {
            isValidRedirect = true;
          } 
          // Validate against the SuperAdmin's officially registered App URL
          else if (clientId) {
            const apps = await QueryService.getAllApps();
            const targetApp = apps.find((a: any) => a.client_id === clientId);

            if (targetApp && targetApp.production_url) {
              const rawAppDomain = targetApp.production_url;
              const normalizedAppHost = new URL(
                rawAppDomain.startsWith('http') ? rawAppDomain : `https://${rawAppDomain}`
              ).hostname;

              if (redirectHost === normalizedAppHost) {
                isValidRedirect = true;
              }
            }
          }
        } catch (e) {
          return res.status(400).json({ error: 'Malformed redirect URI.' });
        }

        if (!isValidRedirect) {
          console.warn(`[SECURITY] Blocked Open Redirect attempt to: ${redirectUri}`);
          return res.status(403).json({ 
            error: 'OAUTH_SECURITY_VIOLATION',
            message: 'The requested application endpoint is not registered or trusted by your workspace. For your protection, this login attempt has been blocked.' 
          });
        }
        const authCode = crypto.randomBytes(32).toString('hex');
        const codePayload = JSON.stringify({ accessToken, refreshToken: rawRefreshToken, user: userPayload, tenantId: user.tenant_id });
        await redisClient.setEx(`auth_code:${authCode}`, 60, codePayload);

        const finalUrl = new URL(redirectUri);
        finalUrl.searchParams.append('code', authCode);

        return res.json({ 
          success: true, 
          redirectUrl: finalUrl.toString(),
          accessToken, 
          refreshToken: rawRefreshToken, 
          user: userPayload 
        });
      }

      return res.json({ accessToken, refreshToken: rawRefreshToken, user: userPayload });
    } catch (err) {
      next(err);
    }
  }

  // --- FETCHES AVAILABLE WORKSPACES (For Authenticated Users) ---
  static async getAvailableWorkspaces(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const currentTenantId = req.user?.tenantId;

      if (!userId || !currentTenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Fetches all workspaces this global user belongs to
      const workspaces = await QueryService.getTenantsByUserId(userId);

      // Filters out the current workspace AND any workspaces that are FROZEN
      const availableWorkspaces = workspaces.filter(w => 
        w.tenant_id !== currentTenantId && w.tenant_status === 'ACTIVE'
      );

      if (availableWorkspaces.length === 0) {
        return res.json({ tempToken: null, tenants: [] });
      }

      // Generates a fresh Pre-Auth token for the switch
      const tempToken = CryptoService.generateTempToken({ userId });

      // READ-MASKING: Check entitlements concurrently for all available workspaces
      const maskedTenants = await Promise.all(
        availableWorkspaces.map(async (w) => {
          const themeEntitlement = await QueryService.checkTenantEntitlement(w.tenant_id, 'customTheme');
          
          return {
            tenantId: w.tenant_id,
            companyName: w.company_name,
            // Masks the logo if they are no longer paying for the custom theme
            logoUrl: themeEntitlement.isAllowed ? w.logo_url : null 
          };
        })
      );

      return res.json({
        tempToken,
        tenants: maskedTenants
      });
    } catch (err) {
      next(err);
    }
  }

  // --- THE EXCHANGE ENDPOINT (For the SDK) ---
  static async exchangeCode(req: AppRequest, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      const appId = req.appId;

      if (!code) return res.status(400).json({ error: 'Authorization code is required' });

      // Pops the code payload from Redis
      const codeKey = `auth_code:${code}`;
      const dataStr = await redisClient.get(codeKey);

      if (!dataStr) {
        return res.status(401).json({ error: 'Invalid or expired authorization code' });
      }

      const data = JSON.parse(dataStr);
      const targetTenantId = data.tenantId;

      // ==========================================
      // CRITICAL SECURITY: THE MATRIX GATEKEEPER
      // ==========================================
      // Ensure the software suite asking for the tokens is actually licensed to this company!
      const isAllocated = await QueryService.verifyAppAllocation(appId!, targetTenantId);
      
      if (!isAllocated) {
        console.warn(`[SECURITY WARNING] App ${appId} attempted to steal auth code for Tenant ${targetTenantId}`);
        return res.status(403).json({ error: 'Unauthorized cross-tenant token exchange attempt. App not allocated.' });
      }

      // Burns the code immediately so it can never be reused (Replay Attack Prevention)
      await redisClient.del(codeKey);

      // Returns the tokens to the tenant's server!
      return res.json({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user
      });
    } catch (err) {
      next(err);
    }
  }

  // --- PRE-CHECKS GLOBAL IDENTITY ---
  static async checkIdentity(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });

      const user = await QueryService.getGlobalUserByEmail(email);
      
      if (user) {
        return res.json({ 
          exists: true, 
          firstName: user.first_name, 
          lastName: user.last_name 
        });
      }
      
      return res.json({ exists: false });
    } catch (err) {
      next(err);
    }
  }

  // --- FETCHES PUBLIC TENANT BRANDING (For Redirect UX) ---
  static async getTenantBranding(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.params.tenantId as string;
      if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

      const settings = await QueryService.getTenantSettings(tenantId);
      
      if (!settings) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Checks if the tenant is currently paying for custom branding
      const entitlement = await QueryService.checkTenantEntitlement(tenantId, 'customTheme');

      // ONLY returns the safe, public cosmetic data
      return res.json({
        name: settings.name,
        logoUrl: entitlement.isAllowed ? settings.logo_url : null,
        themeColor: entitlement.isAllowed ? settings.theme_color : '#e49b0f'
      });
    } catch (err) {
      next(err);
    }
  }

  static async registerFromInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password, firstName, middleName, lastName, countryCode, mobileNo, customProfileData } = req.body;

      if (!token || !password || !firstName || !lastName || !mobileNo ) {
        return res.status(400).json({ error: 'Missing registration details' });
      }

      // Finds the invitation
      const hashedToken = CryptoService.hashToken(token);
      const invite = await QueryService.getInvitationByHash(hashedToken);

      if (!invite) {
        return res.status(400).json({ error: 'Invalid or expired invitation token' });
      }

      const passwordHash = await CryptoService.hashPassword(password);

      // ENTERPRISE BYPASS: Extract hidden HR instructions from the JSON payload
      const inviteData = typeof invite.custom_profile_data === 'string' 
          ? JSON.parse(invite.custom_profile_data) 
          : (invite.custom_profile_data || {});
      const isAutoActive = inviteData._auto_active === true;
      const preAssignedRoles = inviteData._pre_assigned_roles || [];
      
      // Clean up the hidden fields so they don't pollute the user's permanent record
      delete inviteData._auto_active;
      delete inviteData._pre_assigned_roles;

      // Merges the user-provided data with the HR-provided data
      const mergedCustomData = { ...inviteData, ...(customProfileData || {}) };

      
      // Creates new user defaulted to 'PENDING' state (Waiting Room)
      const newUser = await QueryService.createUser({
        tenantId: invite.tenant_id,
        email: invite.email,
        passwordHash,
        firstName,
        middleName,
        lastName,
        mobileNo,
        countryCode: countryCode || '91',
        isTenantAdmin: false,
        status: 'PENDING',
        customProfileData: mergedCustomData,
        employeeId: invite.employee_id
      });

      // ATTACH ROLES & DISPATCH EVENTS (The Auto-Active Flow)
      if (isAutoActive) {
        if (Array.isArray(preAssignedRoles)) {
          for (const roleId of preAssignedRoles) {
            // We use newUser.id as the assigner since this is an automated system action
            await QueryService.assignUserRole(newUser.id, invite.tenant_id, roleId, newUser.id);
          }
        }

        // Fetch full context for Webhook Delivery
        const accessContext = await QueryService.getUserAccessContext(newUser.id, invite.tenant_id);

        // DISPATCH CRITICAL IDENTITY EVENT TO WEBHOOK SUBSCRIBERS
        await EventDispatcherService.dispatch(invite.tenant_id, 'user.access.granted', {
          userId: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          status: 'ACTIVE',
          roles: accessContext.roles,
          entitlements: accessContext.entitlements,
          isAdmin: false
        }, 1);
      }

      await QueryService.updateInvitationStatus(invite.id, 'ACCEPTED');

      await QueryService.logEvent(
        invite.tenant_id,
        newUser.id,
        'USER_SIGNUP',
        req.ip || '127.0.0.1',
        req.headers['user-agent'] || 'unknown',
        { inviteId: invite.id, bypassedWaitingRoom: isAutoActive  }
      );

      return res.status(201).json({
        message: 'Registration complete! Welcome to the Waiting Room. Please wait for HR approval.',
        user: newUser,
      });
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // SECURITY CHECK: Verifies the user exists in the database FIRST
      const existingUser = await QueryService.getGlobalUserByEmail(email);
      
      if (!existingUser) {
        // Fails fast: Prevents OTP dispatch and alerts the frontend immediately
        return res.status(404).json({ error: 'No active account found with this corporate email.' });
      }

      // FIRES THE OTP SERVICE
      await OtpService.generateAndSend(email, 'EMAIL');
      
      return res.json({ success: true, message: 'OTP dispatched securely.' });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: 'Email, OTP, and new password are required' });
      }

      // Hashes the new password using Argon2
      const passwordHash = await CryptoService.hashPassword(newPassword);

      // Updates the user's password in the database
      const updatedUser = await QueryService.updateUserPassword(email, passwordHash);

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ success: true, message: 'Password has been reset successfully.' });
    } catch (err) {
      next(err);
    }
  }

  // Verifies invite token and returns the locked email
  static async verifyInviteToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.params.token as string;
      if (!token) return res.status(400).json({ error: 'Token is required' });

      const hashedToken = CryptoService.hashToken(token);
      const invite = await QueryService.getInvitationByHash(hashedToken);

      if (!invite) {
        return res.status(404).json({ error: 'Invalid or expired invitation link' });
      }

       // FETCHES TENANT BRANDING
      const tenantSettings = await QueryService.getTenantSettings(invite.tenant_id);
      const tenantContext = await QueryService.getTenantOnboardingContext(invite.tenant_id);

      // Securely returns the email tied strictly to this database record
      return res.json({ 
        email: invite.email,
        tenantName: tenantSettings?.name,
        logoUrl: tenantSettings?.logo_url,
        themeColor: tenantSettings?.theme_color,
        onboardingSchema: tenantContext?.onboarding_schema || [],
        prefilledData: {
          firstName: invite.first_name || '',
          lastName: invite.last_name || '',
          customProfileData: invite.custom_profile_data || {}
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // Handle Token Refresh
  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token is required' });
      }

      // Hashes the incoming raw token to compares against the database record
      const hashedRefresh = CryptoService.hashToken(refreshToken);
      
      // Looks up the token ensuring it hasn't been manually revoked
      const tokenRecord = await QueryService.getRefreshTokenAbsolute(hashedRefresh);

      if (!tokenRecord) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // THE OAUTH TOKEN THEFT TRAP
     if (tokenRecord.is_revoked) {
        
        // --- PREVENT CONCURRENCY SPAM (Refresh Storm Lock) ---
        const theftLockKey = `lock:token_theft:${hashedRefresh}`;

        // 'NX' ensures it only sets the key if it DOES NOT exist. 
        // Returns 'OK' if successful, or null if another request beat it by a microsecond.
        const acquiredLock = await redisClient.set(theftLockKey, 'locked', {
          NX: true,
          EX: 60
        });

        if (acquiredLock === 'OK') {
          console.warn(`[SECURITY] Token Replay Detected! NUKING SESSIONS FOR USER: ${tokenRecord.user_id}`);
          
          // 1. Nuke ALL database sessions globally
          await QueryService.revokeAllUserTokensGlobally(tokenRecord.user_id);
          
          // 2. Audit Logging & Webhook Dispatch
          if (tokenRecord.tenant_id) {
            await QueryService.logEvent(
              tokenRecord.tenant_id, 
              tokenRecord.user_id, 
              'TOKEN_THEFT_DETECTED', 
              req.ip || '127.0.0.1', 
              req.headers['user-agent'] || 'unknown', 
              {}
            );
            
            await EventDispatcherService.dispatch(tokenRecord.tenant_id, 'user.session.revoked', {
              userId: tokenRecord.user_id,
              reason: 'token_theft_detected'
            }, 1);
          } else {
            await QueryService.logSuperAdminEvent(tokenRecord.user_id, 'TOKEN_THEFT_DETECTED', req.ip || '127.0.0.1');
          }
        }

        return res.status(401).json({ 
          error: 'Compromised session detected. All your active sessions have been terminated for your protection. Please log in again.' 
        });
      }

      // Manually verify the token hasn't expired yet
      if (new Date(tokenRecord.expires_at) < new Date()) {
        return res.status(401).json({ error: 'Refresh token has expired' });
      }

      // ==========================================
      // BRANCH 1: SUPERADMIN REFRESH FLOW
      // ==========================================
      if (!tokenRecord.tenant_id) {
        const user = await QueryService.getGlobalUserById(tokenRecord.user_id);

        // Ensures they still have SuperAdmin clearance and haven't been blacklisted
        if (!user || !user.is_superadmin || user.is_blacklisted) {
          return res.status(403).json({ error: 'SuperAdmin account invalid or blacklisted' });
        }

        // Generates a fresh Access Token using the 'SYSTEM' bypass string
        const newAccessToken = CryptoService.generateAccessToken({
          userId: user.id,
          tenantId: 'SYSTEM', 
          isAdmin: true,
        });

        return res.json({ accessToken: newAccessToken });
      }

      // ==========================================
      // BRANCH 2: STANDARD WORKSPACE REFRESH FLOW
      // ==========================================

      // Re-verifies the user's status using strict multi-tenant validation
      const user = await QueryService.getUserByIdAndTenant(tokenRecord.user_id, tokenRecord.tenant_id);
      
      if (!user || user.status === 'SUSPENDED') {
        return res.status(401).json({ error: 'User account is suspended.' });
      }

      // --- THE ENTERPRISE CONTEXT AGGREGATION ---
      const accessContext = await QueryService.getUserAccessContext(user.id, tokenRecord.tenant_id);

      // --- THE PROGRESSIVE PROFILING EVALUATION ---
      const profileData = await QueryService.getUserProfileData(user.id, user.tenant_id);
      const tenantContext = await QueryService.getTenantOnboardingContext(user.tenant_id);
      
      const isProfileIncomplete = AuthController.isProfileMissingRequiredFields(tenantContext?.onboarding_schema, profileData);
      const isProfileEnforced = tenantContext?.enforce_profile_completion || false;

      // Generates a fresh Access Token using your 15m expiration policy
      const newAccessToken = CryptoService.generateAccessToken({
        userId: user.id,
        tenantId: user.tenant_id,
        tenantName: user.company_name,
        isAdmin: user.is_tenant_admin,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        status: user.status,
        roles: accessContext.roles,
        entitlements: accessContext.entitlements,
        isProfileIncomplete,
        isProfileEnforced
      });

      const userPayload = {
        id: user.id,
        tenantId: user.tenant_id,
        tenantName: user.company_name,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        status: user.status,
        isAdmin: user.is_tenant_admin,
        roles: accessContext.roles,
        entitlements: accessContext.entitlements,
        isProfileIncomplete,
        isProfileEnforced
      };

      return res.json({ accessToken: newAccessToken, user: userPayload });
    } catch (err) {
      next(err);
    }
  }

  // --- DIRECT LAUNCH ISSUANCE (Single-Click SSO) ---
  static async issueLaunchCode(req: any, res: Response, next: NextFunction) {
    try {
      // Securely extracts identity from the authenticated session middleware
      const userId = req.user?.userId;
      const tenantId = req.user?.tenantId; 
      const { appName, currentRefreshToken } = req.body;
      
      if (!userId || !tenantId || !appName) {
        return res.status(401).json({ error: 'Unauthorized launch request: Session context missing' });
      }

      // FETCH TARGET APP DESTINATION
      const appRecord = await QueryService.getAppByName(appName);
      if (!appRecord) return res.status(404).json({ error: 'Target application not found.' });


      // Verify the Tenant actually has a license for this App!
      const isAllocated = await QueryService.verifyAppAllocation(appRecord.id, tenantId);
      if (!isAllocated) {
        return res.status(403).json({ error: 'Cross-Tenant Violation: This workspace is not licensed for this application.' });
      }

      const targetDomain = appRecord.production_url;

      // Re-verifies the user is active and not suspended
      const userRecord = await QueryService.getUserByIdAndTenant(userId, tenantId);
      if (!userRecord || userRecord.status === 'SUSPENDED') {
        return res.status(403).json({ error: 'User is suspended in this workspace' });
      }

      // Generates the FULL enterprise credentials
      const accessContext = await QueryService.getUserAccessContext(userId, tenantId);

      // --- THE PROGRESSIVE PROFILING EVALUATION ---
      const profileData = await QueryService.getUserProfileData(userRecord.id, userRecord.tenant_id);
      const tenantContext = await QueryService.getTenantOnboardingContext(userRecord.tenant_id);
      
      const isProfileIncomplete = AuthController.isProfileMissingRequiredFields(tenantContext?.onboarding_schema, profileData);
      const isProfileEnforced = tenantContext?.enforce_profile_completion || false;
      
      const accessToken = CryptoService.generateAccessToken({
        userId: userRecord.id,
        tenantId: userRecord.tenant_id,
        tenantName: userRecord.company_name,
        isAdmin: userRecord.is_tenant_admin,
        email: userRecord.email,
        firstName: userRecord.first_name,
        lastName: userRecord.last_name,
        status: userRecord.status,
        roles: accessContext.roles,
        entitlements: accessContext.entitlements,
        isProfileIncomplete,
        isProfileEnforced
      });

      let rawRefreshToken = currentRefreshToken;

      if (!rawRefreshToken) {
      rawRefreshToken = CryptoService.generateRandomToken();
        const hashedRefresh = CryptoService.hashToken(rawRefreshToken);
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7);

        await QueryService.saveRefreshToken(userRecord.id, userRecord.tenant_id, hashedRefresh, expiry, req.ip || '127.0.0.1', req.headers['user-agent'] as string || 'unknown');
      }  

      const userPayload = {
        id: userRecord.id,
        tenantId: userRecord.tenant_id,
        tenantName: userRecord.company_name,
        email: userRecord.email,
        firstName: userRecord.first_name,
        lastName: userRecord.last_name,
        status: userRecord.status,
        isAdmin: userRecord.is_tenant_admin,
        roles: accessContext.roles,
        entitlements: accessContext.entitlements,
        isProfileIncomplete,
        isProfileEnforced
      };

      // Generates a 60-second secure auth code
      const authCode = crypto.randomBytes(32).toString('hex');
      
      // VAULT THE FULL PAYLOAD: Matches exchangeCode expectations perfectly
      const codePayload = JSON.stringify({ 
        accessToken, 
        refreshToken: rawRefreshToken, 
        user: userPayload, 
        tenantId: userRecord.tenant_id 
      });
      
      await redisClient.setEx(`auth_code:${authCode}`, 60, codePayload);

      // Constructs the absolute callback URL for the client software
      const cleanDomain = targetDomain.startsWith('http') ? targetDomain : `https://${targetDomain}`;
      const normalizedDomain = cleanDomain.endsWith('/') ? cleanDomain.slice(0, -1) : cleanDomain; // Prevents double slashes
      const callbackUrl = `${normalizedDomain}/callback?code=${authCode}`;

      return res.json({ success: true, redirectUrl: callbackUrl });
    } catch (err) {
      next(err);
    }
  }

  // --- VERIFY CURRENT PASSWORD (STEP 1 OF MODAL) ---
  static async verifyCurrentPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { currentPassword } = req.body;

      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      if (!currentPassword) return res.status(400).json({ error: 'Current password is required.' });

      const userAuth = await QueryService.getUserPasswordHashById(userId);
      if (!userAuth) return res.status(404).json({ error: 'User profile not found.' });

      const match = await CryptoService.verifyPassword(currentPassword, userAuth.password_hash);
      if (!match) return res.status(400).json({ error: 'Incorrect current password.' });

      // Generates a 5-minute Proof-of-Verification (PoV) token
      const povToken = crypto.randomBytes(32).toString('hex');
      
      // Stores in Redis tightly coupled to this specific user
      await redisClient.setEx(`pov:${userId}:${povToken}`, 300, 'verified');

      return res.json({ success: true, povToken });
    } catch (err) {
      next(err);
    }
  }

  // --- CHANGE PASSWORD (LOGGED IN USER) ---
  static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const tenantId = req.user?.tenantId;
      const { povToken, newPassword } = req.body;

      if (!userId || !tenantId) return res.status(401).json({ error: 'Unauthorized' });
      if (!povToken || !newPassword) {
        return res.status(400).json({ error: 'Verification token and new password are required.' });
      }

      // Verifies the PoV token in Redis (Bypassing Argon2!)
      const povKey = `pov:${userId}:${povToken}`;
      const isVerified = await redisClient.get(povKey);
      
      if (!isVerified) {
        return res.status(401).json({ error: 'Verification expired or invalid. Please start over.' });
      }

      // Burns the token immediately so it can never be reused
      await redisClient.del(povKey);

      // Hashes the new password (The ONLY Argon2 operation in this step)
      const newHash = await CryptoService.hashPassword(newPassword);

      // Updates the DB
      const userAuth = await QueryService.getUserPasswordHashById(userId);
      await QueryService.updateUserPassword(userAuth.email, newHash);

      // SECURITY: Revokes all refresh tokens for this workspace to kick out compromised sessions.
      // Note: We don't blacklist them in Redis here, so their CURRENT 15-minute access token 
      // stays alive, allowing them to continue working seamlessly without being abruptly logged out.
      await QueryService.revokeAllUserTokensInWorkspace(userId, tenantId);

      // Logs the security action
      await QueryService.logEvent(
        tenantId, 
        userId, 
        'PASSWORD_CHANGED', 
        req.ip || '127.0.0.1', 
        req.headers['user-agent'] || 'unknown', 
        {}
      );

      return res.json({ 
        success: true, 
        message: 'Password updated securely. All other active sessions have been terminated.' 
      });
    } catch (err) {
      next(err);
    }
  }

  // Handle User Logout
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Hashes the token exactly as it is stored in the database
        const hashedRefresh = CryptoService.hashToken(refreshToken);
        
        // Mark it as revoked so it drops off the Active Sessions UI
        await QueryService.revokeRefreshToken(hashedRefresh);
      }

      return res.json({ success: true, message: 'Session terminated successfully' });
    } catch (err) {
      next(err);
    }
  }
}