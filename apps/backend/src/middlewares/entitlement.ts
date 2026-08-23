import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { AppRequest } from './api-key.js';
import { QueryService } from '../services/query.service.js';
import { redisClient } from '../db/redis.js';

export const requireFeature = (featureKey: string) => {
  return async (req: AuthenticatedRequest | AppRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req as AuthenticatedRequest).user?.tenantId 
                    || req.body?.tenantId 
                    || req.query?.tenantId;
                    
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });

      // SuperAdmins bypass tier restrictions to manage the platform
      const isAdmin = (req as AuthenticatedRequest).user?.isAdmin;
      if (isAdmin && tenantId === 'SYSTEM') {
        return next();
      }
      
      // High-performance Redis caching
      const cacheKey = `entitlement:${tenantId}:${featureKey}`;
      const cachedResult = await redisClient.get(cacheKey);

      if (cachedResult === 'GRANTED') {
        return next();
      } else if (cachedResult && cachedResult.startsWith('DENIED:')) {
        const requiredPlan = cachedResult.split(':')[1];
        return res.status(403).json({
          error: 'Upgrade Required',
          code: 'FEATURE_LOCKED',
          message: `This workspace must be upgraded to the ${requiredPlan} to use this feature.`
        });
      }

      // Cache miss: Check the database via QueryService
      const entitlement = await QueryService.checkTenantEntitlement(tenantId, featureKey);

      if (entitlement.isAllowed) {
        // Cache success for 1 hour
        await redisClient.setEx(cacheKey, 3600, 'GRANTED');
        return next();
      } else {
        if (entitlement.reason === 'FEATURE_DISABLED_GLOBALLY') {
          return res.status(503).json({ 
            error: 'Feature Disabled', 
            message: 'This feature is currently disabled by the platform administrator.' 
          });
        }
        
        // Cache denial for 10 minutes (shorter TTL to allow quick upgrades)
        await redisClient.setEx(cacheKey, 600, `DENIED:${entitlement.requiredPlan}`);
        return res.status(403).json({
          error: 'Upgrade Required',
          code: 'FEATURE_LOCKED',
          message: `This workspace must be upgraded to the ${entitlement.requiredPlan} to use this feature.`
        });
      }
    } catch (error) {
      console.error('Entitlement Middleware Error:', error);
      return res.status(500).json({ error: 'Failed to verify workspace entitlements.' });
    }
  };
};