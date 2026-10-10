import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { CryptoService } from '../services/crypto.service.js';
import { QueryService } from '../services/query.service.js';
import { RequestUtil } from '../utils/request.util.js';

export class ApiKeyController {
  
  // 1. Generate/Rotate M2M Credentials for an Enterprise Module
  static async rotateAppCredentials(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const appId = req.params?.appId as string;
      const actorId = req.user?.userId;

      const newClientId = CryptoService.generateClientId();
      const { rawKey: newClientSecret, keyHash: newSecretHash } = CryptoService.generateApiKey();

      const app = await QueryService.rotateAppCredentials(appId, newClientId, newSecretHash);
      
      if (!app) {
        return res.status(404).json({ error: 'Enterprise app not found.' });
      }

      await QueryService.logSuperAdminEvent(
        actorId!, 
        'MODULE_CREDENTIALS_ROTATED', 
        RequestUtil.getIp(req), 
        { appId }
      );

      return res.status(201).json({
        success: true,
        message: 'M2M Credentials generated securely. Please save the Client Secret now, as it cannot be recovered.',
        clientId: newClientId,
        clientSecret: newClientSecret 
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Fetch the Public Client ID for a Module
  static async getAppCredentials(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const appId = req.params?.appId as string;

      const app = await QueryService.getAppCredentials(appId);

      if (!app) {
         return res.status(404).json({ error: 'Enterprise app not found.' });
      }

      return res.json(app);
    } catch (err) {
      next(err);
    }
  }
}