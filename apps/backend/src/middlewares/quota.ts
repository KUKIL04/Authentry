import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { AppRequest } from './api-key.js';
import { QueryService } from '../services/query.service.js';
import { redisClient } from '../db/redis.js';

export const requireQuota = (resource: 'MAU' | 'API_CALLS') => {
  return async (req: AuthenticatedRequest | AppRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req as AuthenticatedRequest).user?.tenantId 
                    || req.body?.tenantId 
                    || req.query?.tenantId;
      
      if (!tenantId) return res.status(400).json({ error: 'Tenant context lost' });
      if (tenantId === 'SYSTEM') return next(); // SuperAdmin bypass

      // =====================================
      // ACTIVE USER (MAU) ENFORCEMENT
      // =====================================
      if (resource === 'MAU') {
        const quota = await QueryService.getTenantMauQuota(tenantId);
        if (!quota) return res.status(404).json({ error: 'Subscription data not found.' });

        if (quota.max_allowed !== null && quota.current_usage >= quota.max_allowed) {
          return res.status(403).json({
            error: 'Quota Exceeded',
            code: 'MAU_LIMIT_REACHED',
            message: `Workspace has reached its user limit (${quota.current_usage}/${quota.max_allowed}).`
          });
        }
        return next();
      }

      // =====================================
      // API CALLS ENFORCEMENT (Redis-backed)
      // =====================================
      if (resource === 'API_CALLS') {
        const userId = (req as AuthenticatedRequest).user?.userId;

        // Per-User Sliding Window Rate Limiter (Protects the Company Quota)
        if (userId) {
          const currentMinute = new Date().toISOString().slice(0, 16); // e.g., "2026-08-19T02:14"
          const userThrottleKey = `throttle:user:${userId}:${currentMinute}`;
          
          const userRequestsThisMinute = await redisClient.incr(userThrottleKey);
          if (userRequestsThisMinute === 1) await redisClient.expire(userThrottleKey, 120); // 2 min expiry
          
          // Inject standard Enterprise Rate Limit Headers
          res.setHeader('X-RateLimit-Limit', 150);
          res.setHeader('X-RateLimit-Remaining', Math.max(0, 150 - userRequestsThisMinute));

          // Hard limit: No single user can make more than 150 API calls per minute
          if (userRequestsThisMinute > 150) {
            res.setHeader('Retry-After', 60); // Tells the client script to pause for 60 seconds
            return res.status(429).json({
              error: 'Rate Limit Exceeded',
              code: 'USER_THROTTLED',
              message: 'You are making requests too quickly. Please slow down.'
            });
          }
        }

        // Fetches the limit from Redis Cache
        const limitCacheKey = `quota:api_limit:${tenantId}`;
        let maxAllowedStr = await redisClient.get(limitCacheKey);

        if (!maxAllowedStr) {
          const quota = await QueryService.getTenantApiQuota(tenantId);
          if (!quota) return res.status(404).json({ error: 'Subscription data not found.' });
          
          const valueToCache = quota.max_allowed === null ? 'UNLIMITED' : quota.max_allowed.toString();
          
          await redisClient.setEx(limitCacheKey, 3600, valueToCache); 
          maxAllowedStr = valueToCache;
        }

        if (maxAllowedStr === 'UNLIMITED') {
          return next();
        }

        const maxAllowed = parseInt(maxAllowedStr as string, 10);

        // Generates a Monthly Billing Key (e.g., api_usage:tenant123:2026-07)
        const currentMonth = new Date().toISOString().slice(0, 7); 
        const usageKey = `quota:api_usage:${tenantId}:${currentMonth}`;

        // Atomically increments the usage counter
        const currentUsage = await redisClient.incr(usageKey);

        if (currentUsage === 1) {
          await redisClient.expire(usageKey, 60 * 60 * 24 * 35); // 35 days
        }

        // Evaluates Limit
        if (currentUsage > maxAllowed) {
          return res.status(429).json({
            error: 'Too Many Requests',
            code: 'API_QUOTA_EXCEEDED',
            message: `Your workspace has exceeded its monthly API limit of ${maxAllowed} requests. Please upgrade your plan.`
          });
        }

        return next();
      }

    } catch (error) {
      console.error('Quota Middleware Error:', error);
      return res.status(500).json({ error: 'Failed to verify workspace quotas.' });
    }
  };
};