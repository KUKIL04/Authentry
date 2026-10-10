import webpush from 'web-push';
import { QueryService } from './query.service.js';

// Configure the VAPID keys (Must be in your backend .env)
webpush.setVapidDetails(
  'mailto:admin@authentry.com', // Replace with your actual support email
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export interface PushPayload {
  type?: 'STANDARD' | 'MFA_CHALLENGE' | 'MFA_RESOLVED';
  title: string;
  body: string;
  url?: string;
  icon?: string;
  vibrate?: number[];
  tag?: string;
  actions?: { action: string; title: string; icon?: string }[];
  actionUrls?: Record<string, string>; // Maps action ID to a specific URL
  mfa?: {
    attemptId: string;
    actionToken: string;
    resolveUrl: string;
    options: string[];
    device: string;
    location: string;
    ip: string;
  };
}

export class PushService {
  static async sendToUser(
    userId: string, 
    payload: PushPayload
  ): Promise<{ deliveredCount: number; totalAttempted: number }> {
    try {
      const subscriptions = await QueryService.getPushSubscriptions(userId);
      if (subscriptions.length === 0) {
        return { deliveredCount: 0, totalAttempted: 0 };
      }

      const stringPayload = JSON.stringify(payload);
      let deliveredCount = 0;

      const pushPromises = subscriptions.map(async (sub) => {
        const pushConfig = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          await webpush.sendNotification(pushConfig, stringPayload);
          deliveredCount++;
        } catch (error: any) {
          // If the browser unsubscribed or the token expired, Apple/Google returns 404 or 410.
          if (error.statusCode === 404 || error.statusCode === 410) {
            console.log(`🧹 Pruning dead push subscription for user ${userId}`);
            await QueryService.deletePushSubscription(sub.endpoint);
          } else {
            console.error('Push notification delivery failed:', error);
          }
        }
      });

      await Promise.all(pushPromises);
      return { deliveredCount, totalAttempted: subscriptions.length };
    } catch (err) {
      console.error('Failed to dispatch push notifications:', err);
      return { deliveredCount: 0, totalAttempted: 0 };
    }
  }
}