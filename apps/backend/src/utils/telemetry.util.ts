import { redisClient } from '../db/redis.js';

export class Telemetry {
  
  // Wraps an asynchronous operation to track its latency, success, and failure rates in Redis. 
  static async track<T>(service: string, operation: string, fn: () => Promise<T>): Promise<T> {
    const start = process.hrtime();
    
    try {
      const result = await fn();
      
      const diff = process.hrtime(start);
      const latencyMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
      
      // Stores the most recent latency and increment the total calls
      await redisClient.set(`telemetry:latency:${service}:${operation}`, latencyMs);
      await redisClient.incr(`telemetry:calls:${service}:${operation}`);
      
      return result;
    } catch (error) {
      // If the third-party provider or database fails, we log the error spike
      await redisClient.incr(`telemetry:errors:${service}:${operation}`);
      throw error;
    }
  }
}