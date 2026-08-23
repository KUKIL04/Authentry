import { QueryService } from '../services/query.service.js';

// Run the sweep every 5 hours
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; 

export const startCleanupWorker = () => {
  // Execute the sweep on a repeating interval
  setInterval(async () => {
    try {
      console.log('🧹 [Cleanup Worker] Initiating routine database sweep...');
      // Destructure the individual counts from the object
      const { tokensDeleted, invitesDeleted } = await QueryService.cleanupExpiredTokens();
      
      // Prune Webhook Ledger Bloat
      const prunedLogs = await QueryService.pruneWebhookLedger();

      // Fallback to 0 if the counts happen to be null
      const totalDeleted = (tokensDeleted ?? 0) + (invitesDeleted ?? 0);
      
      if (totalDeleted > 0) {
        console.log(`✅ [Cleanup Worker] Successfully purged ${tokensDeleted ?? 0} dead sessions and ${invitesDeleted ?? 0} expired invites, and ${prunedLogs} redundant webhook logs.`);
      } else {
        console.log('ℹ️ [Cleanup Worker] Sweep completed. No expired items found.');
      }
    } catch (error) {
      console.error('❌ [Cleanup Worker] Database sweep failed:', error);
    }
  }, CLEANUP_INTERVAL_MS);
  
  console.log('🕒 Cleanup Worker initialized (Runs every 5 minutes)');
};