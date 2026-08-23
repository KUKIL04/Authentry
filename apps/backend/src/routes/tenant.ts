import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { uploadLogo } from '../middlewares/upload.js';

const router: Router = Router();

router.post('/logo', uploadLogo.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  return res.json({ 
    success: true, 
    logoUrl: (req.file as any).path
  });
});

router.post('/register', TenantController.registerTenant);

export default router;