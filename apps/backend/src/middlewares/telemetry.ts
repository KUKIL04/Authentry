import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../db/redis.js';
import jwt from 'jsonwebtoken';

// Add the AppRequest interface to safely extract the M2M App ID
interface AppRequest extends Request {
  appId?: string;
}

export const edgeTelemetry = (req: AppRequest, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on('finish', async () => {
    try {
      const diff = process.hrtime(start);
      const latency = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2); // Latency in ms
      
      // 1. Increments Global Live Counters
      await redisClient.incr('telemetry:global:api_calls');
      
      if (res.statusCode >= 500) {
        await redisClient.incr('telemetry:global:errors');
      }

      // 2. Extracts Identity for Multi-Dimensional Metering
      let tenantId = 'ANONYMOUS';
      let userId = 'ANONYMOUS';

      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          // Fast decode (no verification overhead) just for telemetry routing
          const decoded = jwt.decode(token) as any;
          if (decoded && decoded.tenantId) {
            tenantId = decoded.tenantId;
            userId = decoded.userId || 'ANONYMOUS';
          }
        } catch (e) {
          // Ignore malformed tokens; auth middleware handles the rejection
        }
      }

      // Identify if the request came from an M2M Software Suite (via requireAppAuth)
      const appId = req.appId || 'CORE_IDP';

      // 3. Buffers Multi-Dimensional Consumption in Redis
      if (tenantId !== 'ANONYMOUS' && tenantId !== 'SYSTEM') {
         
         // Dimension A: Company-Wise Buffer (For global tenant graphs)
         await redisClient.hIncrBy('telemetry:tenant_api_buffer', tenantId, 1);
         
         // Dimension B: User-Wise Buffer (Which employee is eating the quota?)
         if (userId !== 'ANONYMOUS') {
           await redisClient.hIncrBy(`telemetry:user_api_buffer:${tenantId}`, userId, 1);
           await redisClient.hIncrBy('telemetry:user_api_total', userId, 1);
         }

         // Dimension C: App-Wise Buffer (Which suite is generating traffic?)
         await redisClient.hIncrBy(`telemetry:app_api_buffer:${tenantId}`, appId, 1);
      }
    } catch (err) {
      console.error('Telemetry capture failed:', err);
    }
  });

  next();
};