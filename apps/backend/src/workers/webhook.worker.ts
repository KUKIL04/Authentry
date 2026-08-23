import { Worker, Queue } from 'bullmq';
import * as crypto from 'crypto';
import { bullmqConnection } from '../db/redis.js';
import { QueryService } from '../services/query.service.js';

// Initialize the queue using our existing Redis connection
export const webhookQueue = new Queue('webhook_dispatch', { connection: bullmqConnection });

export const startWebhookWorker = () => {
  console.log('🔗 [Webhook Worker] Initialized. Listening for event dispatches.');

  const worker = new Worker('webhook_dispatch', async (job) => {
    const { tenantId, event, data, endpointId, deliveryLogId } = job.data;

    try {
      // Fetches Endpoint Config via QueryService
      const endpoint = await QueryService.getWebhookEndpointCredentials(endpointId);
      if (!endpoint) throw new Error('Webhook endpoint is inactive or deleted.');

      // Constructs & Signs Payload
      const payloadString = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data
      });
      
      const hmac = crypto.createHmac('sha256', endpoint.signing_secret);
      const signature = `sha256=${hmac.update(payloadString).digest('hex')}`;

      // Dispatches using Native Fetch
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Event-ID': job.id || crypto.randomUUID(), 
          'X-Signature': signature,
        },
        body: payloadString,
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      // Mark Success
      await QueryService.updateDeliveryLogSuccess(deliveryLogId, response.status);
      console.log(`✅ [Webhook Worker] Delivered ${event} to Tenant ${tenantId}`);

    } catch (error: any) {
      const statusCode = error.name === 'TimeoutError' ? 408 : 500; // Map timeouts to 408
      
      // Update attempts (we are assuming current attempt is the 3rd if it throws here)
      const attempts = await QueryService.updateDeliveryLogFailure(deliveryLogId, statusCode, false);

      if (attempts >= 3) {
        // DEAD LETTER STATE
        await QueryService.updateDeliveryLogFailure(deliveryLogId, statusCode, true);
        console.error(`💀 [Webhook Worker] Dead-lettered ${event} for Tenant ${tenantId} after 3 attempts.`);
        return; 
      }

      console.warn(`⚠️ [Webhook Worker] Attempt ${attempts} failed for ${event}. Retrying...`);
      throw error; // Triggers BullMQ's exponential backoff
    }
  }, {
    connection: bullmqConnection,
    limiter: { max: 100, duration: 1000 } // Rate limit globally
  });

  worker.on('error', (err) => console.error('Webhook Worker Runtime Error:', err));
};