import { Router, Request, Response } from 'express';
import { CryptoService } from '../services/crypto.service.js';

const router: Router = Router();

// Standard OIDC / OAuth2 Discovery Endpoint for Public Keys
router.get('/jwks.json', (req: Request, res: Response) => {
  try {
    const jwks = CryptoService.getJWKS();
    
    // Sets caching headers so external servers don't hammer our DB
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    return res.json(jwks);
  } catch (error) {
    console.error('JWKS Generation Error:', error);
    return res.status(500).json({ error: 'Failed to generate JWKS' });
  }
});

export default router;