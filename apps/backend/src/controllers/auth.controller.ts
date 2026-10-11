import { Request, Response, NextFunction } from 'express';
import { QueryService } from '../services/query.service.js';
import { CryptoService } from '../services/crypto.service.js';
import { EventDispatcherService } from '../services/event-dispatcher.service.js';
import { EmailService } from '../services/email.service.js';
import { PushService } from '../services/push.service.js';
import { redisClient } from '../db/redis.js';
import { RequestUtil } from '../utils/request.util.js';
import { OtpService } from '../services/otp.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { AppRequest } from '../middlewares/api-key.js';
import crypto from 'crypto';

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const isProd = process.env.NODE_ENV === 'production';
  
  const baseOptions = {
    httpOnly: true,
    secure: isProd, // Must be true on HTTPS
    partitioned: isProd,
    sameSite: isProd ? 'none' as const : 'lax' as const, // Lax needed for local dev across ports
    path: '/'
  };

  res.cookie('accessToken', accessToken, { ...baseOptions, maxAge: 15 * 60 * 1000 }); // 15 mins
  res.cookie('refreshToken', refreshToken, { ...baseOptions, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days
};

const clearAuthCookies = (res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';
  const baseOptions = {
    httpOnly: true,
    secure: isProd,
    partitioned: isProd,
    sameSite: isProd ? 'none' as const : 'lax' as const,
    path: '/'
  };
  res.clearCookie('accessToken', baseOptions);
  res.clearCookie('refreshToken', baseOptions);
};

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

      await QueryService.saveRefreshToken(user.id, 'SYSTEM', hashedRefresh, expiry, RequestUtil.getIp(req), RequestUtil.getAgent(req));

      // Logs the login event directly to the highly secure superadmin_audit_logs
      await QueryService.logSuperAdminEvent(user.id, 'SUPERADMIN_LOGIN', RequestUtil.getIp(req));

      setAuthCookies(res, accessToken, rawRefreshToken);

      return res.json({
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
  
  // --- HELPER: FINALIZES LOGIN & ISSUES COOKIES / OAUTH REDIRECT ---
  private static async finalizeLoginSession(
    req: Request,
    res: Response,
    workspaces: any[],
    activeWorkspaces: any[],
    targetRecord: any,
    params: { redirectUri?: string; targetTenantId?: string; clientId?: string }
  ) {
    const { redirectUri, targetTenantId, clientId } = params;
    const oldRefreshToken = req.cookies?.refreshToken || req.body?.oldRefreshToken;

    // Clears the Tenant-Specific security lockout
    await redisClient.del(`bl:tenant:${targetRecord.tenant_id}:${targetRecord.user_id}`);

    // Multi-Tenant Workspace Selector
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

    if (oldRefreshToken) {
      const hashedOldRefresh = CryptoService.hashToken(oldRefreshToken);
      await QueryService.deleteRefreshTokenByHash(hashedOldRefresh);
    }

    const accessContext = await QueryService.getUserAccessContext(targetRecord.user_id, targetRecord.tenant_id);
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

    await QueryService.saveRefreshToken(
      targetRecord.user_id, 
      targetRecord.tenant_id, 
      hashedRefresh, 
      expiry, 
      RequestUtil.getIp(req), 
      RequestUtil.getAgent(req)
    );
    await QueryService.logEvent(
      targetRecord.tenant_id, 
      targetRecord.user_id, 
      'USER_LOGIN', 
      RequestUtil.getIp(req), 
      RequestUtil.getAgent(req), 
      {}
    );

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

    setAuthCookies(res, accessToken, rawRefreshToken);

    if (redirectUri) {
      const clientRefreshToken = CryptoService.generateRandomToken();
      const clientHashedRefresh = CryptoService.hashToken(clientRefreshToken);
      await QueryService.saveRefreshToken(
        userPayload.id, 
        userPayload.tenantId, 
        clientHashedRefresh, 
        expiry, 
        RequestUtil.getIp(req), 
        RequestUtil.getAgent(req)
      );

      const authCode = crypto.randomBytes(32).toString('hex');
      const codePayload = JSON.stringify({ 
        accessToken, 
        refreshToken: clientRefreshToken, 
        user: userPayload, 
        tenantId: targetRecord.tenant_id 
      });
      await redisClient.setEx(`auth_code:${authCode}`, 60, codePayload);

      const finalUrl = new URL(redirectUri);
      finalUrl.searchParams.append('code', authCode);

      return res.json({ 
        success: true, 
        redirectUrl: finalUrl.toString(),
        user: userPayload 
      });
    }

    return res.json({ user: userPayload });
  }
  
  // --- THE LOGIN METHOD ---
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, redirectUri, targetTenantId, clientId } = req.body;

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

      // Clears the brute-force tracking keys upon successful password verification
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

      // Pre-validate redirectUri BEFORE triggering MFA so untrusted links are blocked immediately
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

      const targetRecord = accessibleWorkspaces[0];

      // ==========================================
      // 3. NUMBER-MATCH PUSH MFA INTERCEPT
      // ==========================================
      // Only trigger Push MFA if the user has at least one active logged-in session AND a registered push device
      const activeSessions = await QueryService.getActiveSessions(targetRecord.tenant_id);
      const userHasActiveSession = activeSessions.some((s: any) => s.email === globalUser.email);
      const subscriptions = userHasActiveSession ? await QueryService.getPushSubscriptions(globalUser.id) : [];
      if (subscriptions.length > 0) {
        const attemptId = crypto.randomUUID();
        const actionToken = crypto.randomBytes(32).toString('hex');

        // Generate 4 unique 2-digit numbers (10-99)
        const numSet = new Set<string>();
        while (numSet.size < 4) {
          numSet.add(crypto.randomInt(10, 100).toString());
        }
        const allFourOptions = Array.from(numSet);
        const challengeCode = allFourOptions[0];

        // 3 shuffled options for Native OS Banner; 4 shuffled options for In-App Modal
        const bannerOptions = [challengeCode, allFourOptions[1], allFourOptions[2]].sort(() => Math.random() - 0.5);
        const modalOptions = [...allFourOptions].sort(() => Math.random() - 0.5);

        const clientIp = RequestUtil.getIp(req);
        const deviceMeta = RequestUtil.getDevice(req);
        const locationMeta = RequestUtil.getLocation(clientIp);
        const resolveUrl = `/api/v1/auth/mfa/resolve`;

        const pushResult = await PushService.sendToUser(globalUser.id, {
          type: 'MFA_CHALLENGE',
          title: 'Sign-In Request',
          body: `${deviceMeta.displayName} • ${locationMeta.displayLocation} (${clientIp}). Select matching number to approve.`,
          tag: `mfa-${attemptId}`,
          vibrate: [200, 100, 200],
          url: `/app?mfaAttempt=${attemptId}`,
          actions: bannerOptions.map(num => ({
            action: `mfa_pick_${num}`,
            title: `Approve: ${num}`
          })),
          mfa: {
            attemptId,
            actionToken,
            resolveUrl,
            options: modalOptions,
            device: deviceMeta.displayName,
            location: locationMeta.displayLocation,
            ip: clientIp
          }
        });

        // Only pause on the MFA Hold screen if at least 1 live device received the push!
        // (If the user uninstalled the PWA, PushService auto-prunes the dead rows and returns deliveredCount === 0)
        if (pushResult.deliveredCount > 0) {
          const mfaVaultPayload = {
            attemptId,
            userId: globalUser.id,
            tenantId: targetRecord.tenant_id,
            email: globalUser.email,
            challengeCode,
            bannerOptions,
            options: modalOptions,
            actionToken,
            status: 'PENDING',
            device: deviceMeta.displayName,
            location: locationMeta.displayLocation,
            ip: clientIp,
            loginParams: { redirectUri, targetTenantId, clientId },
            createdAt: Date.now()
          };

          await redisClient.setEx(`mfa:attempt:${attemptId}`, 180, JSON.stringify(mfaVaultPayload));
          await redisClient.setEx(`mfa:user_active:${globalUser.id}`, 180, attemptId);

          return res.status(202).json({
            requiresMfa: true,
            attemptId,
            challengeCode,
            expiresIn: 180
          });
        }
      }

      // ==========================================
      // 4. NO ACTIVE PUSH DEVICES -> FINALIZE IMMEDIATELY
      // ==========================================
      return await AuthController.finalizeLoginSession(
        req,
        res,
        workspaces,
        activeWorkspaces,
        targetRecord,
        { redirectUri, targetTenantId, clientId }
      );
    } catch (err) {
      next(err);
    }
  }

  // --- THE NEW SELECT WORKSPACE METHOD ---
  static async selectWorkspace(req: Request, res: Response, next: NextFunction) {
    try {
      const { tempToken, tenantId, redirectUri, clientId } = req.body;
      const oldRefreshToken = req.cookies?.refreshToken || req.body.oldRefreshToken;

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
        await QueryService.deleteRefreshTokenByHash(hashedOldRefresh);
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

      await QueryService.saveRefreshToken(user.id, user.tenant_id, hashedRefresh, expiry, RequestUtil.getIp(req), RequestUtil.getAgent(req));
      await QueryService.logEvent(user.tenant_id, user.id, 'USER_LOGIN', RequestUtil.getIp(req), RequestUtil.getAgent(req), {});

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

      setAuthCookies(res, accessToken, rawRefreshToken);

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

        const clientRefreshToken = CryptoService.generateRandomToken();
        const clientHashedRefresh = CryptoService.hashToken(clientRefreshToken);
        await QueryService.saveRefreshToken(
          userPayload.id, 
          userPayload.tenantId, 
          clientHashedRefresh, 
          expiry, 
          RequestUtil.getIp(req), 
          RequestUtil.getAgent(req)
        );

        const authCode = crypto.randomBytes(32).toString('hex');
        const codePayload = JSON.stringify({ 
          accessToken, 
          refreshToken: clientRefreshToken, 
          user: userPayload, 
          tenantId: user.tenant_id 
        });
        await redisClient.setEx(`auth_code:${authCode}`, 60, codePayload);

        const finalUrl = new URL(redirectUri);
        finalUrl.searchParams.append('code', authCode);

        return res.json({ 
          success: true, 
          redirectUrl: finalUrl.toString(),
          user: userPayload 
        });
      }

      return res.json({ user: userPayload });
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
  
  // ==========================================
  // NUMBER-MATCH MFA ENDPOINTS
  // ==========================================

  // 1. Frontend Login Screen Polls This Every 2 Seconds
  static async getMfaStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const attemptId = req.params.attemptId as string;
      const raw = await redisClient.get(`mfa:attempt:${attemptId}`);

      if (!raw) {
        return res.status(404).json({ status: 'EXPIRED', error: 'Verification challenge expired. Please sign in again.' });
      }

      const attempt = JSON.parse(raw);

      if (attempt.status === 'PENDING') {
        return res.json({ status: 'PENDING' });
      }

      if (attempt.status === 'DENIED') {
        await redisClient.del(`mfa:attempt:${attemptId}`);
        return res.status(403).json({
          status: 'DENIED',
          error: 'Compromised login attempt blocked: This sign-in was explicitly denied from your registered device.'
        });
      }

      if (attempt.status === 'APPROVED') {
        await redisClient.del(`mfa:attempt:${attemptId}`);

        let workspaces = await QueryService.getTenantsByEmail(attempt.email);
        const { redirectUri, targetTenantId, clientId } = attempt.loginParams || {};

        if (clientId) {
          const allocatedTenantIds = await QueryService.getAllocatedTenantsForClient(clientId);
          workspaces = workspaces.filter(w => allocatedTenantIds.includes(w.tenant_id));
        }
        const contextualWorkspaces = targetTenantId
          ? workspaces.filter(w => w.tenant_id === targetTenantId)
          : workspaces;
        const activeWorkspaces = contextualWorkspaces.filter(w => w.tenant_status === 'ACTIVE');
        const accessibleWorkspaces = activeWorkspaces.filter(w => w.status !== 'SUSPENDED');
        const targetRecord = accessibleWorkspaces[0];

        return await AuthController.finalizeLoginSession(
          req, res, workspaces, activeWorkspaces, targetRecord,
          { redirectUri, targetTenantId, clientId }
        );
      }

      return res.json({ status: 'PENDING' });
    } catch (err) {
      next(err);
    }
  }

  // 2. Existing Logged-In PWA Checks for Active Challenge (For In-App Security Modal)
  static async getActiveMfaChallenge(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const attemptId = await redisClient.get(`mfa:user_active:${userId}`);
      if (!attemptId) return res.json({ activeChallenge: null });

      const raw = await redisClient.get(`mfa:attempt:${attemptId}`);
      if (!raw) return res.json({ activeChallenge: null });

      const attempt = JSON.parse(raw);
      if (attempt.status !== 'PENDING') return res.json({ activeChallenge: null });

      return res.json({
        activeChallenge: {
          attemptId: attempt.attemptId,
          options: attempt.options,
          device: attempt.device,
          location: attempt.location,
          ip: attempt.ip,
          createdAt: attempt.createdAt
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Resolves Challenge (Called by Service Worker Action Buttons OR In-App Modal)
  static async resolveMfaChallenge(req: Request, res: Response, next: NextFunction) {
    try {
      const { attemptId, actionToken, selectedCode, decision } = req.body;
      if (!attemptId) return res.status(400).json({ error: 'Attempt ID required' });

      const raw = await redisClient.get(`mfa:attempt:${attemptId}`);
      if (!raw) return res.status(404).json({ error: 'Challenge expired or already resolved.' });

      const attempt = JSON.parse(raw);
      if (attempt.status !== 'PENDING') {
        return res.json({ success: true, message: 'Already resolved.' });
      }

      // SECURITY: Verify the approving device is ACTUALLY LOGGED IN via accessToken or refreshToken cookie!
      // This prevents a logged-out PWA notification button from ever approving a login.
      let isAuthorizedSession = false;

      if (req.cookies?.accessToken) {
        const decoded = CryptoService.verifyAccessToken(req.cookies.accessToken);
        if (decoded && decoded.userId === attempt.userId) {
          isAuthorizedSession = true;
        }
      }

      if (!isAuthorizedSession && req.cookies?.refreshToken) {
        const hashedRefresh = CryptoService.hashToken(req.cookies.refreshToken);
        const tokenRecord = await QueryService.getRefreshToken(hashedRefresh);
        if (tokenRecord && tokenRecord.user_id === attempt.userId && new Date(tokenRecord.expires_at) > new Date()) {
          isAuthorizedSession = true;
        }
      }

      if (!isAuthorizedSession) {
        return res.status(401).json({ error: 'You must be logged in on this device to approve a sign-in request.' });
      }

      const isApproved = decision !== 'DENY' && String(selectedCode) === String(attempt.challengeCode);
      attempt.status = isApproved ? 'APPROVED' : 'DENIED';

      // Save updated status for the polling login screen to pick up
      await redisClient.setEx(`mfa:attempt:${attemptId}`, 60, JSON.stringify(attempt));
      await redisClient.del(`mfa:user_active:${attempt.userId}`);

      if (!isApproved) {
        await QueryService.logEvent(
          attempt.tenantId,
          attempt.userId,
          'MFA_CHALLENGE_DENIED',
          attempt.ip,
          attempt.device,
          { selectedCode, decision, location: attempt.location }
        );
      }

      // Broadcast Silent Ghosting Push to clear the notification & modal across ALL other devices
      await PushService.sendToUser(attempt.userId, {
        type: 'MFA_RESOLVED',
        title: '',
        body: '',
        tag: `mfa-${attemptId}`,
        mfa: {
          attemptId,
          actionToken: '',
          resolveUrl: '',
          options: [],
          device: '',
          location: '',
          ip: ''
        }
      });

      return res.json({
        success: true,
        status: attempt.status,
        message: isApproved ? 'Login approved.' : 'Login attempt denied and blocked.'
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. Fallback: Send Email OTP if User Cannot Access Their Registered Device
  static async sendMfaEmailFallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { attemptId } = req.body;
      const raw = await redisClient.get(`mfa:attempt:${attemptId}`);
      if (!raw) return res.status(404).json({ error: 'Challenge expired. Please sign in again.' });

      const attempt = JSON.parse(raw);
      const emailOtp = crypto.randomInt(100000, 999999).toString();
      attempt.fallbackOtp = emailOtp;
      attempt.status = 'PENDING'

      await redisClient.setEx(`mfa:attempt:${attemptId}`, 180, JSON.stringify(attempt));
      
      // Dismiss the push notification while the user is verifying via Email OTP
      await PushService.sendToUser(attempt.userId, {
        type: 'MFA_RESOLVED',
        title: '',
        body: '',
        tag: `mfa-${attemptId}`
      });

      await EmailService.sendOtpEmail(attempt.email, emailOtp);

      return res.json({ success: true, message: 'Verification code sent to your email.' });
    } catch (err) {
      next(err);
    }
  }

  // 4B. Re-dispatch Push Notification When User Clicks "Back to Number Match"
  static async resendMfaPush(req: Request, res: Response, next: NextFunction) {
    try {
      const { attemptId } = req.body;
      const raw = await redisClient.get(`mfa:attempt:${attemptId}`);
      if (!raw) return res.status(404).json({ error: 'Challenge expired. Please sign in again.' });

      const attempt = JSON.parse(raw);
      attempt.status = 'PENDING';

      await redisClient.setEx(`mfa:attempt:${attemptId}`, 180, JSON.stringify(attempt));
      await redisClient.setEx(`mfa:user_active:${attempt.userId}`, 180, attemptId);

      const bannerOptions: string[] = attempt.bannerOptions || [attempt.challengeCode, attempt.options[0]];

      await PushService.sendToUser(attempt.userId, {
        type: 'MFA_CHALLENGE',
        title: 'Sign-In Request',
        body: `${attempt.device} • ${attempt.location} (${attempt.ip}). Select matching number to approve.`,
        tag: `mfa-${attemptId}`,
        vibrate: [200, 100, 200],
        url: `/app?mfaAttempt=${attemptId}`,
        actions: bannerOptions.map((num: string) => ({
          action: `mfa_pick_${num}`,
          title: `Approve: ${num}`
        })),
        mfa: {
          attemptId: attempt.attemptId,
          actionToken: attempt.actionToken,
          resolveUrl: `/api/v1/auth/mfa/resolve`,
          options: attempt.options,
          device: attempt.device,
          location: attempt.location,
          ip: attempt.ip
        }
      });

      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  // 5. Fallback: Verify Email OTP & Immediately Finalize Session
  static async verifyMfaEmailFallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { attemptId, otp } = req.body;
      const raw = await redisClient.get(`mfa:attempt:${attemptId}`);
      if (!raw) return res.status(404).json({ error: 'Challenge expired. Please sign in again.' });

      const attempt = JSON.parse(raw);
      if (!attempt.fallbackOtp || String(attempt.fallbackOtp) !== String(otp).trim()) {
        return res.status(400).json({ error: 'Invalid verification code.' });
      }

      // Consume the MFA attempt & clear notifications on other devices
      await redisClient.del(`mfa:attempt:${attemptId}`);
      await redisClient.del(`mfa:user_active:${attempt.userId}`);

      await PushService.sendToUser(attempt.userId, {
        type: 'MFA_RESOLVED',
        title: '',
        body: '',
        tag: `mfa-${attemptId}`
      });

      let workspaces = await QueryService.getTenantsByEmail(attempt.email);
      const { redirectUri, targetTenantId, clientId } = attempt.loginParams || {};

      if (clientId) {
        const allocatedTenantIds = await QueryService.getAllocatedTenantsForClient(clientId);
        workspaces = workspaces.filter(w => allocatedTenantIds.includes(w.tenant_id));
      }
      const contextualWorkspaces = targetTenantId
        ? workspaces.filter(w => w.tenant_id === targetTenantId)
        : workspaces;
      const activeWorkspaces = contextualWorkspaces.filter(w => w.tenant_status === 'ACTIVE');
      const accessibleWorkspaces = activeWorkspaces.filter(w => w.status !== 'SUSPENDED');
      const targetRecord = accessibleWorkspaces[0];

      return await AuthController.finalizeLoginSession(
        req, res, workspaces, activeWorkspaces, targetRecord,
        { redirectUri, targetTenantId, clientId }
      );
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

      let newUser;
      
      // ==========================================
      // THE GRACEFUL CONSTRAINT CATCHER
      // ==========================================
      try {
        newUser = await QueryService.createUser({
          tenantId: invite.tenant_id,
          email: invite.email,
          passwordHash,
          firstName,
          middleName,
          lastName,
          mobileNo,
          countryCode: countryCode || '91',
          isTenantAdmin: false,
          status: isAutoActive ? 'ACTIVE' : 'PENDING',
          customProfileData: mergedCustomData,
          employeeId: invite.employee_id
        });
      } catch (dbError: any) {
        // Catch duplicate Employee ID
        if (dbError.code === '23505' && dbError.constraint === 'workspace_memberships_tenant_id_employee_id_key') {
          return res.status(400).json({ 
            error: `Registration halted: The Employee ID (${invite.employee_id}) assigned to your invitation is already in use by another active member of this workspace. Please contact your HR administrator.` 
          });
        }
        // Catch if they somehow registered globally between the invite and the click
        if (dbError.code === '23505' && dbError.constraint === 'users_email_key') {
          return res.status(400).json({ 
            error: 'An account with this email already exists globally. Please return to the login page and authenticate directly.' 
          });
        }
        throw dbError; // Bubble up unexpected errors
      }

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
        RequestUtil.getIp(req),
        RequestUtil.getAgent(req),
        { inviteId: invite.id, bypassedWaitingRoom: isAutoActive  }
      );

      return res.status(201).json({
        message: isAutoActive 
          ? 'Registration complete! Your workspace access is now active.' 
          : 'Registration complete! Welcome to the Waiting Room. Please wait for HR approval.',
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

      // 1. Verify OTP first
      const isValidOtp = await OtpService.verifyOtp(email, 'EMAIL', otp);
      if (!isValidOtp) {
        return res.status(400).json({ error: 'Invalid or expired OTP code.' });
      }

      const passwordHash = await CryptoService.hashPassword(newPassword);
      const updatedUser = await QueryService.updateUserPassword(email, passwordHash);

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Terminate all existing sessions globally after a password reset
      await QueryService.revokeAllUserTokensGlobally(updatedUser.id);

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
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token is required' });
      }

      // Hashes the incoming raw token to compares against the database record
      const hashedRefresh = CryptoService.hashToken(refreshToken);
      
      // Looks up the token ensuring it hasn't been manually revoked
      const tokenRecord = await QueryService.getRefreshTokenAbsolute(hashedRefresh);

      if (!tokenRecord) {
        clearAuthCookies(res);
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // 1. Resolve current client network coordinates
      const isSdkRequest = Boolean(req.headers['x-client-id']);
      const currentIp = RequestUtil.getIp(req);
      const currentAgent = RequestUtil.getAgent(req);
      const currentDevice = RequestUtil.getDevice(req);
      const currentLocation = RequestUtil.getLocation(currentIp);

      // ==========================================
      // 2. THE OAUTH TOKEN THEFT TRAP
      // ==========================================
      if (tokenRecord.is_revoked) {
        // Check 30-second grace window for concurrent multi-tab or SDK requests
        const gracePayloadStr = await redisClient.get(`grace:refresh:${hashedRefresh}`);
        const isSameContext = isSdkRequest || (tokenRecord.user_agent === currentAgent);

        if (gracePayloadStr && isSameContext) {
          const gracePayload = JSON.parse(gracePayloadStr);
          if (!isSdkRequest && gracePayload.accessToken && gracePayload.refreshToken) {
            setAuthCookies(res, gracePayload.accessToken, gracePayload.refreshToken);
          }
          return res.status(200).json(gracePayload);
        }

        // --- PREVENT CONCURRENCY SPAM (Refresh Storm Lock) ---
        const theftLockKey = `lock:token_theft:${hashedRefresh}`;
        const acquiredLock = await redisClient.set(theftLockKey, 'locked', { NX: true, EX: 60 });

        if (acquiredLock === 'OK') {
          console.warn(`[SECURITY] Token Replay Detected! NUKING SESSIONS FOR USER: ${tokenRecord.user_id}`);
          
          // 1. Nuke ALL database sessions globally
          await QueryService.revokeAllUserTokensGlobally(tokenRecord.user_id);
          
          // 2. Retrieve email for alerting
          const userEmail = await QueryService.getUserEmailById(tokenRecord.user_id);
          if (userEmail) {
            // Push Notification
            await PushService.sendToUser(tokenRecord.user_id, {
              title: 'Security Alert: Session Revoked',
              body: `Suspicious token activity from ${currentDevice.displayName} (${currentIp}). All sessions terminated.`,
              tag: 'security-compromise',
              vibrate: [400, 150, 400],
              url: '/login'
            });

            // Email Notification with Exact Location and Device
            await EmailService.sendTokenTheftAlertEmail(
              userEmail,
              currentIp,
              currentDevice.displayName,
              currentLocation.displayLocation
            );
          }

          // 3. Audit Logging & Webhook Dispatch
          if (tokenRecord.tenant_id) {
            await QueryService.logEvent(
              tokenRecord.tenant_id, 
              tokenRecord.user_id, 
              'TOKEN_THEFT_DETECTED', 
              currentIp, 
              currentAgent, 
              { device: currentDevice.displayName, location: currentLocation.displayLocation }
            );
            
            await EventDispatcherService.dispatch(tokenRecord.tenant_id, 'user.session.revoked', {
              userId: tokenRecord.user_id,
              reason: 'token_theft_detected'
            }, 1);
          } else {
            await QueryService.logSuperAdminEvent(tokenRecord.user_id, 'TOKEN_THEFT_DETECTED', currentIp);
          }
        }

        clearAuthCookies(res);
        return res.status(401).json({ 
          error: 'Compromised session detected. All your active sessions have been terminated for your protection. Please log in again.' 
        });
      }

      // Manually verify the token hasn't expired yet
      if (new Date(tokenRecord.expires_at) < new Date()) {
        await QueryService.deleteRefreshTokenByHash(hashedRefresh);
        clearAuthCookies(res);
        return res.status(401).json({ error: 'Refresh token has expired' });
      }

      // ==========================================
      // 3. DEVICE & GEO-IP ANOMALY DETECTION
      // ==========================================
      if(!isSdkRequest) {
        // A. Strict User-Agent Binding
        if (tokenRecord.user_agent !== currentAgent) {
          console.warn(`[SECURITY] User-Agent mismatch for user ${tokenRecord.user_id}.`);
          await QueryService.deleteRefreshTokenByHash(hashedRefresh);
          clearAuthCookies(res);
          return res.status(401).json({ error: 'Session context mismatch. Please log in again.' });
        }

        // B. Geo-IP Anomaly Detection
        if (tokenRecord.ip_address !== currentIp) {
          const originalLocation = RequestUtil.getLocation(tokenRecord.ip_address);
          
          // If either IP can't be resolved properly (e.g. internal network), we skip the strict check
          if (
            originalLocation.country !== 'Unknown' && 
            originalLocation.country !== 'Dev Network' &&
            currentLocation.country !== 'Unknown' && 
            currentLocation.country !== 'Dev Network'
          ) {
            // If the country completely changed during a single session, assume theft!
            if (originalLocation.country !== currentLocation.country) {
              console.warn(`[SECURITY] Geo-IP anomaly detected! Original: ${originalLocation.country}, Current: ${currentLocation.country}`);
              
              // 1. Burn the compromised token
              await QueryService.deleteRefreshTokenByHash(hashedRefresh);
              clearAuthCookies(res);
              
              // 2. Fetch the user's email to notify them
              const userEmail = await QueryService.getUserEmailById(tokenRecord.user_id);
              if (userEmail) {
                await PushService.sendToUser(tokenRecord.user_id, {
                  title: 'Unrecognized Location Blocked',
                  body: `Sign-in blocked from ${currentLocation.displayLocation} (${currentDevice.displayName}). Session terminated.`,
                  tag: 'security-alert',
                  vibrate: [400, 150, 400],
                  url: '/login',
                  actions: [{ action: 'reset_pwd', title: 'Reset Password' }],
                  actionUrls: { 'reset_pwd': '/forgot-password' }
                });

                await EmailService.sendSuspiciousActivityEmail(
                  userEmail, 
                  currentLocation.displayLocation, 
                  currentIp, 
                  currentDevice.displayName
                );
              }

              // 3. Reject the request
              return res.status(401).json({ 
                error: 'Suspicious login location detected. Your session has been terminated for your protection. Please check your email and log in again.' 
              });
            }
          }
        }
      }  

      // --- REFRESH TOKEN ROTATION ---

      // Generate the replacement token
      const newRawRefreshToken = CryptoService.generateRandomToken();
      const newHashedRefresh = CryptoService.hashToken(newRawRefreshToken);
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      const ipToSave = isSdkRequest ? tokenRecord.ip_address : currentIp;
      const agentToSave = isSdkRequest ? tokenRecord.user_agent : currentAgent;

      // ==========================================
      // BRANCH 1: SUPERADMIN REFRESH FLOW
      // ==========================================
      if (!tokenRecord.tenant_id) {
        const user = await QueryService.getGlobalUserById(tokenRecord.user_id);

        // Ensures they still have SuperAdmin clearance and haven't been blacklisted
        if (!user || !user.is_superadmin || user.is_blacklisted) {
          await QueryService.deleteRefreshTokenByHash(hashedRefresh);
          clearAuthCookies(res);
          return res.status(403).json({ error: 'SuperAdmin account invalid or blacklisted' });
        }

        // Generates a fresh Access Token using the 'SYSTEM' bypass string
        const newAccessToken = CryptoService.generateAccessToken({
          userId: user.id,
          tenantId: 'SYSTEM', 
          isAdmin: true,
        });

        const superAdminResponse = {
          success: true,
          accessToken: newAccessToken,
          refreshToken: newRawRefreshToken
        };

        // Inside refreshToken, right before await QueryService.revokeRefreshToken(hashedRefresh):
        await redisClient.setEx(`grace:refresh:${hashedRefresh}`, 30, JSON.stringify(superAdminResponse));
        await QueryService.revokeRefreshToken(hashedRefresh);
        await QueryService.saveRefreshToken(user.id, 'SYSTEM', newHashedRefresh, newExpiry, RequestUtil.getIp(req), RequestUtil.getAgent(req));
        
        setAuthCookies(res, newAccessToken, newRawRefreshToken);

        return res.json({ success: true, accessToken: newAccessToken, refreshToken: newRawRefreshToken });
      }

      // ==========================================
      // BRANCH 2: STANDARD WORKSPACE REFRESH FLOW
      // ==========================================

      // Re-verifies the user's status using strict multi-tenant validation
      const user = await QueryService.getUserByIdAndTenant(tokenRecord.user_id, tokenRecord.tenant_id);
      
      if (!user || user.status === 'SUSPENDED') {
        await QueryService.deleteRefreshTokenByHash(hashedRefresh);
        clearAuthCookies(res);
        return res.status(401).json({ error: 'User account is suspended.' });
      }

      const accessContext = await QueryService.getUserAccessContext(user.id, tokenRecord.tenant_id);
      const profileData = await QueryService.getUserProfileData(user.id, user.tenant_id);
      const tenantContext = await QueryService.getTenantOnboardingContext(user.tenant_id);
      
      const isProfileIncomplete = AuthController.isProfileMissingRequiredFields(tenantContext?.onboarding_schema, profileData);
      const isProfileEnforced = tenantContext?.enforce_profile_completion || false;

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

      const workspaceResponse = {
        accessToken: newAccessToken,
        refreshToken: newRawRefreshToken,
        user: userPayload
      };

      // Cache new tokens in 10s grace key BEFORE revoking old token
      await redisClient.setEx(`grace:refresh:${hashedRefresh}`, 30, JSON.stringify(workspaceResponse));
      await QueryService.revokeRefreshToken(hashedRefresh);
      await QueryService.saveRefreshToken(
        user.id, 
        user.tenant_id, 
        newHashedRefresh, 
        newExpiry,
        ipToSave, 
        agentToSave
      );

      if (!isSdkRequest) {
        setAuthCookies(res, newAccessToken, newRawRefreshToken);
      }

      return res.json(workspaceResponse);
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
      const { appName } = req.body;
      
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

      const rawRefreshToken = CryptoService.generateRandomToken();
      const hashedRefresh = CryptoService.hashToken(rawRefreshToken);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);

      await QueryService.saveRefreshToken(
        userRecord.id, 
        userRecord.tenant_id, 
        hashedRefresh, expiry, 
        RequestUtil.getIp(req), 
        RequestUtil.getAgent(req)
      );
      
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

      // Re-issue a fresh Refresh Token for the current device so they stay logged in
      const newRawRefreshToken = CryptoService.generateRandomToken();
      const newHashedRefresh = CryptoService.hashToken(newRawRefreshToken);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);
      await QueryService.saveRefreshToken(userId, tenantId, newHashedRefresh, expiry, RequestUtil.getIp(req), RequestUtil.getAgent(req));

      if (req.cookies?.accessToken) {
        setAuthCookies(res, req.cookies.accessToken, newRawRefreshToken);
      }

      // Logs the security action
      await QueryService.logEvent(
        tenantId, 
        userId, 
        'PASSWORD_CHANGED', 
        RequestUtil.getIp(req), 
        RequestUtil.getAgent(req), 
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
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const pushEndpoint = req.body?.endpoint;

      if (refreshToken) {
        // Hashes the token exactly as it is stored in the database
        const hashedRefresh = CryptoService.hashToken(refreshToken);
        
        // Mark it as revoked so it drops off the Active Sessions UI
        await QueryService.deleteRefreshTokenByHash(hashedRefresh);
      }

      // Unlink push notifications for this device when the user logs out
      if (pushEndpoint) {
        await QueryService.deletePushSubscription(pushEndpoint);
      }

      clearAuthCookies(res);

      return res.json({ success: true, message: 'Session terminated successfully' });
    } catch (err) {
      next(err);
    }
  }
}