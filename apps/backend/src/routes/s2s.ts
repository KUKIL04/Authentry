import { Router } from 'express';
import { S2SController } from '../controllers/s2s.controller.js';
import { requireAppAuth } from '../middlewares/api-key.js';
import { requireQuota } from '../middlewares/quota.js';

const router: Router = Router();

router.use(requireAppAuth);

// QUOTA WALL: Increments and verifies API usage for ALL routes below this line
router.use(requireQuota('API_CALLS'));

// Directory Management
router.get('/directory/users/:userId', S2SController.getUserDetails);
router.put('/directory/users/:userId/suspend', S2SController.suspendUser);

// --- PROTECTED WEBHOOK & SYNC ROUTES ---
router.post('/directory/users/:userId/sync', S2SController.syncUser);


export default router;