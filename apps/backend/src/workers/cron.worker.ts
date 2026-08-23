import { redisClient } from '../db/redis.js';
import { QueryService } from '../services/query.service.js';
import { EventDispatcherService } from '../services/event-dispatcher.service.js';
import { pool } from '../db/index.js'; // Imported to execute the ledger sync

// Run the batch push every 15 minutes
const AUDIT_BATCH_INTERVAL_MS = 15 * 60 * 1000; 
const EVENT_NAME = 'audit.log.batch';

// Run the quota ledger sync every 1 hour
const QUOTA_SYNC_INTERVAL_MS = 60 * 60 * 1000; 

export const startCronWorker = () => {
  console.log(`🕒 [Cron Worker] Initialized. Syncing API quotas every ${QUOTA_SYNC_INTERVAL_MS / 60000} mins.`);

  // ==========================================
  // 1. QUOTA & LEDGER SYNC WORKER (WRITE-BEHIND)
  // ==========================================
  setInterval(async () => {
    try {
      console.log(`📊 [Cron Worker] Starting Write-Behind Ledger Sync...`);
      
      // The exact month string used in our Redis keys
      const currentMonth = new Date().toISOString().slice(0, 7); 
      
      // Fetches all active subscriptions
      const subRes = await pool.query(`
        SELECT tenant_id, api_request_count, lifetime_api_calls, current_cycle_start 
        FROM tenant_subscriptions
      `);

      for (const sub of subRes.rows) {
        const tenantId = sub.tenant_id;
        const dbCycleStartMonth = new Date(sub.current_cycle_start).toISOString().slice(0, 7);
        
        // --- BILLING CYCLE ROLLOVER ---
        if (dbCycleStartMonth !== currentMonth) {
          await pool.query(`
            UPDATE tenant_subscriptions 
            SET api_request_count = 0, 
                current_cycle_start = CURRENT_TIMESTAMP 
            WHERE tenant_id = $1
          `, [tenantId]);
          
          console.log(`🔄 [Cron Worker] Rolled over billing cycle for Tenant ${tenantId}`);
          continue;
        }

        // --- DELTA SYNC LOGIC ---
        const usageKey = `quota:api_usage:${tenantId}:${currentMonth}`;
        const redisValStr = await redisClient.get(usageKey);
        
        const redisVal = parseInt(redisValStr || '0', 10);
        const dbVal = parseInt(sub.api_request_count || '0', 10);

        if (redisVal > dbVal) {
          const delta = redisVal - dbVal;
          await pool.query(`
            UPDATE tenant_subscriptions 
            SET api_request_count = $1, 
                lifetime_api_calls = lifetime_api_calls + $2 
            WHERE tenant_id = $3
          `, [redisVal, delta, tenantId]);
          
        } else if (redisVal < dbVal) {
          // We restore Redis back to the DB's last known state to prevent billing loss.
          await redisClient.setEx(usageKey, 60 * 60 * 24 * 35, dbVal.toString());
          console.log(`⚠️ [Cron Worker] Restored dropped Redis counter for Tenant ${tenantId} from DB (Value: ${dbVal})`);
        }
      }
      
      console.log(`✅ [Cron Worker] Write-Behind Ledger Sync completed.`);
    } catch (error) {
      console.error('❌ [Cron Worker] Quota ledger sync failed:', error);
    }
  }, QUOTA_SYNC_INTERVAL_MS);
};