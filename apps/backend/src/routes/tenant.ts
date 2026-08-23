import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller.js';
import { uploadLogo } from '../middlewares/upload.js';
import { deleteCloudinaryAsset } from '../utils/upload.util.js';

const router: Router = Router();

router.post('/logo', uploadLogo.single('logo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const oldLogoUrl = req.body.oldLogoUrl;
  if (oldLogoUrl && oldLogoUrl.includes('cloudinary.com')) {
    try {
      await deleteCloudinaryAsset(oldLogoUrl);
      console.log(`✅ Cleaned up orphaned staged logo: ${oldLogoUrl}`);
    } catch (err) {
      console.error(`⚠️ Failed to clean up orphaned logo:`, err);
    }
  }
  
  return res.json({ 
    success: true, 
    logoUrl: (req.file as any).path
  });
});

router.post('/register', TenantController.registerTenant);

export default router;