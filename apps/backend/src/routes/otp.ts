import { Router } from 'express';
import { OtpController } from '../controllers/otp.controller.js';

const router: Router = Router();

router.post('/send', OtpController.sendOtp);
router.post('/verify', OtpController.verifyOtp);

export default router;