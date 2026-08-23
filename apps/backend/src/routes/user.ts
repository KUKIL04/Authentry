import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireQuota } from '../middlewares/quota.js';

const router: Router = Router();

router.use(requireAuth as any);
router.use(requireQuota('API_CALLS') as any);

router.get('/me', UserController.getMyProfile as any);
router.get('/access', UserController.getMyAccess as any);
router.get('/onboarding-schema', UserController.getOnboardingSchema as any);
router.put('/platform-profile', UserController.updatePlatformProfile as any);
router.post('/complete-profile', UserController.completeProfile as any);

export default router;