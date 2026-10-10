import { Request, Response, NextFunction } from 'express';
import { CryptoService } from '../services/crypto.service.js';
import { redisClient } from '../db/redis.js';
import { pool } from '../db/index.js'

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    tenantId: string;
    isAdmin: boolean;
    email?: string;
    firstName?: string;
    lastName?: string;
    status?: 'UNVERIFIED' | 'PENDING' | 'ACTIVE' | 'SUSPENDED';
    roles?: string[];
    entitlements?: Record<string, Record<string, string>>;
    isProfileIncomplete?: boolean;
    isProfileEnforced?: boolean;
  };
}

// Ensures user has valid JWT and is not blacklisted
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // EXTRACT TOKEN (Prioritize secure cookie, fallback to header for SDK/M2M)
    let token = req.cookies?.accessToken;
    
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Authorization cookie or header is missing' });
    }
    
    // Verifies JWT cryptographically
    const decodedPayload = CryptoService.verifyAccessToken(token);

    if (!decodedPayload) {
      return res.status(401).json({ error: 'Access token expired or invalid' });
    }

    // --- THE PROGRESSIVE PROFILING TRAP ---

    // Whitelist the endpoints required to fix the profile or log out safely
    const isWhitelistedRoute = 
      req.originalUrl.includes('/user/complete-profile') || 
      req.originalUrl.includes('/user/onboarding-schema') || 
      req.originalUrl.includes('/user/me') ||
      req.originalUrl.includes('/user/platform-profile') ||
      req.originalUrl.includes('/auth/workspaces') || 
      req.originalUrl.includes('/auth/logout')
      req.originalUrl.includes('/auth/mfa/') ||
      req.originalUrl.includes('/push/');

      // Admin Safe Harbor. Admins can always access the control plane to fix schemas.
      const isAdminSafeHarbor = decodedPayload.isAdmin && req.originalUrl.includes('/admin');

    if (decodedPayload.isProfileIncomplete && decodedPayload.tenantId !== 'SYSTEM' && !isWhitelistedRoute && !isAdminSafeHarbor) {
      
      const tenantContext = await pool.query(
        'SELECT enforce_profile_completion FROM tenants WHERE id = $1',
        [decodedPayload.tenantId]
      );
      
      const isCurrentlyEnforced = tenantContext.rows[0]?.enforce_profile_completion;

      if (isCurrentlyEnforced) {
        return res.status(403).json({ 
          error: 'PROFILE_INCOMPLETE_ENFORCED', 
          message: 'Your organization requires you to complete your profile before accessing this workspace.' 
        });
      }
    }

    // --- THE ENTERPRISE KILL SWITCH CHECK ---

    // If the user isn't the SuperAdmin, we check if their workspace is frozen
    if (decodedPayload.tenantId !== 'SYSTEM') {
      const isFrozen = await redisClient.get(`tenant:frozen:${decodedPayload.tenantId}`);
      if (isFrozen) {
        return res.status(401).json({ 
          error: 'WORKSPACE_FROZEN', 
          message: 'This workspace has been suspended by the platform administrator. All API access is denied.' 
        });
      }
    }

    // --- GLOBAL BLACKLIST CHECK (SuperAdmin Only) ---
    const isGloballyBlacklisted = await redisClient.get(`bl:user:${decodedPayload.userId}`);
    if (isGloballyBlacklisted) {
      return res.status(401).json({ error: 'Unauthorized: Platform access permanently revoked.' });
    }

    // --- TENANT BLACKLIST CHECK (Workspace Admins) ---
    if (decodedPayload.tenantId !== 'SYSTEM') {
      const isTenantBlacklisted = await redisClient.get(`bl:tenant:${decodedPayload.tenantId}:${decodedPayload.userId}`);
      if (isTenantBlacklisted) {
        return res.status(401).json({ error: 'Unauthorized: Session forcefully terminated in this workspace.' });
      }
    }

    // Attaches payload and proceed
    req.user = decodedPayload;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

// Guards to enforce that only Tenant Admins (HR) can manage the dashboard
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }

  next();
};

export async function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const dbCheck = await pool.query(
      'SELECT is_superadmin FROM users WHERE id = $1', 
      [req.user.userId]
    );

    if (dbCheck.rows.length === 0 || !dbCheck.rows[0].is_superadmin) {
      console.warn(`CRITICAL: User ${req.user.userId} attempted to access SuperAdmin routes.`);
      return res.status(403).json({ error: 'Platform access denied. SuperAdmin clearance required.' });
    }

    next();
  } catch (error) {
    console.error('SuperAdmin Verification Error:', error);
    return res.status(500).json({ error: 'Internal server error during authorization check' });
  }
}