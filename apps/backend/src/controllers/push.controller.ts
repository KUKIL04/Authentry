import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { QueryService } from '../services/query.service.js';

export class PushController {
  static async subscribe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { subscription, deviceName } = req.body;

      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      if (!subscription || !subscription.endpoint) return res.status(400).json({ error: 'Invalid subscription payload' });

      await QueryService.savePushSubscription(
        userId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
        deviceName || 'Unknown Device'
      );

      return res.json({ success: true, message: 'Push subscription active.' });
    } catch (err) {
      next(err);
    }
  }
}