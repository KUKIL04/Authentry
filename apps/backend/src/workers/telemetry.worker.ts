import { redisClient } from '../db/redis.js';

export const startTelemetryWorker = () => {
  console.log('📡 Telemetry worker initialized. Flushing metrics every 60 seconds.');

  setInterval(async () => {
    try {
      const bufferKey = 'telemetry:tenant_api_buffer';
      
      // Fetches current buffered counts
      const tenantCounts = await redisClient.hGetAll(bufferKey);
      if (Object.keys(tenantCounts).length === 0) return;

      // Immediately clears the buffer so live traffic starts fresh
      await redisClient.del(bufferKey);

    } catch (error) {
       console.error('Telemetry Worker Runtime Error:', error);
    }
  }, 60000);
};