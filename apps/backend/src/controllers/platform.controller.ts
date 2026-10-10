import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { redisClient } from '../db/redis.js';
import { PlatformService } from '../services/platform.service.js';
import { RequestUtil } from '../utils/request.util.js';

export class PlatformController {
  
  static async getPlatformStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const stats = await PlatformService.getGlobalStats();
      return res.json(stats);
    } catch (err) {
      next(err);
    }
  }

  static async getSystemTelemetry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const slowQueries = await PlatformService.getSystemTelemetryLogs();
      return res.json({ slowQueries });
    } catch (err) {
      next(err);
    }
  }

  static async flushTelemetry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorId = req.user?.userId;
      const ip = RequestUtil.getIp(req);
      
      if (!actorId) return res.status(401).json({ error: 'Unauthorized' });

      await PlatformService.flushTelemetry(actorId, ip);
      return res.json({ success: true, message: 'Telemetry buffer flushed successfully.' });
    } catch (err) {
      next(err);
    }
  }

  // --- FEATURE FLAG MANAGEMENT ---

  static async createPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { code, name, monthlyPriceUsd, maxMau, maxApiRequests, tierRank } = req.body;
      const actorId = req.user?.userId;
      
      if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
      if (!code || !name) return res.status(400).json({ error: 'Plan Code and Name are required.' });

      const parsedMau = (maxMau !== undefined && maxMau !== null && maxMau !== '') ? Number(maxMau) : null;
      const parsedApi = (maxApiRequests !== undefined && maxApiRequests !== null && maxApiRequests !== '') ? Number(maxApiRequests) : null;
      const parsedRank = (tierRank !== undefined && tierRank !== null) ? Number(tierRank) : 10;

      const newPlan = await PlatformService.createPlanDefinition(
        code, name, monthlyPriceUsd || 0, parsedMau, parsedApi, parsedRank, actorId, RequestUtil.getIp(req)
      );

      return res.status(201).json({ success: true, plan: newPlan });
    } catch (err: any) {
      if (err.code === '23505') return res.status(400).json({ error: 'A plan with this code already exists.' });
      next(err);
    }
  }

  static async getFeatureMatrix(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const [features, plans] = await Promise.all([
        PlatformService.getFeatureFlags(),
        PlatformService.getPlanDefinitions()
      ]);
      
      return res.json({ features, plans });
    } catch (err) {
      next(err);
    }
  }

  static async updatePlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const planCode = req.params.planCode as string;
      const { monthlyPriceUsd, maxMau, maxApiRequests } = req.body;
      const actorId = req.user?.userId;
      
      if (!actorId) return res.status(401).json({ error: 'Unauthorized' });

      const parsedMau = (maxMau !== undefined && maxMau !== null && maxMau !== '') ? Number(maxMau) : null;
      const parsedApi = (maxApiRequests !== undefined && maxApiRequests !== null && maxApiRequests !== '') ? Number(maxApiRequests) : null;

      const updatedPlan = await PlatformService.updatePlanDefinition(
        planCode, monthlyPriceUsd, parsedMau, parsedApi, actorId, RequestUtil.getIp(req)
      );

      if (!updatedPlan) return res.status(404).json({ error: 'Plan not found.' });

      // Clears the Redis cache so quotas update immediately for live tenants
      await redisClient.flushDb(); 

      return res.json({ success: true, plan: updatedPlan });
    } catch (err) {
      next(err);
    }
  }

  static async updateFeatureFlag(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const featureKey = req.params.featureKey as string;
      const { minPlanCode } = req.body;
      const actorId = req.user?.userId;
      const ip = RequestUtil.getIp(req);

      if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
      if (!minPlanCode) return res.status(400).json({ error: 'Target plan code is required.' });

      const updatedFeature = await PlatformService.updateFeatureTier(featureKey, minPlanCode, actorId, ip);

      if (!updatedFeature) {
        return res.status(404).json({ error: 'Feature flag not found.' });
      }

      // CRITICAL: We must flush the Redis entitlement cache so active tenants immediately feel the change!
      await redisClient.flushDb();

      return res.json({ 
        success: true, 
        message: 'Feature matrix updated and active sessions re-evaluated.',
        feature: updatedFeature 
      });
    } catch (err) {
      next(err);
    }
  }
}