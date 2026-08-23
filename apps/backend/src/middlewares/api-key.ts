import { Request, Response, NextFunction } from 'express';
import { CryptoService } from '../services/crypto.service.js';
import { pool } from '../db/index.js';

export interface AppRequest extends Request {
  appId?: string;
}

export async function requireAppAuth(req: AppRequest, res: Response, next: NextFunction) {
  try {
    // Standard M2M Client Credentials Headers
    const clientId = req.headers['x-client-id'] as string;
    const clientSecret = req.headers['x-client-secret'] as string;

    if (!clientId || !clientSecret) {
      return res.status(401).json({ error: 'Missing M2M Client ID or Client Secret.' });
    }

    // Hash the incoming secret to safely look it up in the database
    const secretHash = CryptoService.hashToken(clientSecret);

    // Query the database to find the Enterprise Module owner
    const result = await pool.query(
      'SELECT id FROM apps WHERE client_id = $1 AND client_secret_hash = $2',
      [clientId, secretHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or revoked M2M Credentials.' });
    }

    // Attach the Module ID and proceed to the controller
    req.appId = result.rows[0].id;
    next();
  } catch (error) {
    console.error('M2M Middleware Error:', error);
    return res.status(500).json({ error: 'Internal server error during M2M validation' });
  }
}