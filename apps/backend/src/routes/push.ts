import { Router } from 'express';
import { PushController } from '../controllers/push.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router: Router = Router();

router.use(requireAuth as any);
router.post('/subscribe', PushController.subscribe);

export default router;