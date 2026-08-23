import { webhookQueue } from '../workers/webhook.worker.js';
import { QueryService } from './query.service.js';

export class EventDispatcherService {
  
  static async dispatch(tenantId: string, event: string, data: any, priority: number = 2) {
    // AUTO-INJECT TENANT ID INTO ALL WEBHOOK PAYLOADS
    const enrichedData = { ...data, tenantId };

    // Fetches active endpoints listening for this specific event
    const endpoints = await QueryService.getActiveWebhooksForTenantEvent(tenantId, event);

    for (const endpoint of endpoints) {
      // Logs the intent to deliver
      const logId = await QueryService.createDeliveryLog(endpoint.id, event, enrichedData);

      // Drops into BullMQ with the configured priority and backoff
      await webhookQueue.add('dispatch', {
        tenantId,
        event,
        data: enrichedData,
        endpointId: endpoint.id,
        deliveryLogId: logId
      }, {
        priority, // BullMQ processes Priority 1 before Priority 3
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 } // 1m, 2m, 4m
      });
    }
  }

  // --- FOR DEAD-LETTER RECOVERY ---
  static async resurrect(tenantId: string, event: string, data: any, endpointId: string, deliveryLogId: string, priority: number = 3) {
    // Drops directly into BullMQ using the EXISTING endpoint and log IDs
    await webhookQueue.add('dispatch', {
      tenantId,
      event,
      data,
      endpointId,
      deliveryLogId
    }, {
      priority,
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 }
    });
  }
}