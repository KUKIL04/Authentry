import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireAppAuth } from '../middlewares/api-key.js';

const router: Router = Router();

router.get('/invite/:token', AuthController.verifyInviteToken);
router.post('/check-identity', AuthController.checkIdentity);
router.post('/login', AuthController.login);
router.post('/superadmin/login', AuthController.superAdminLogin);
router.post('/select-workspace', AuthController.selectWorkspace)
router.post('/register', AuthController.registerFromInvite);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/verify-password', requireAuth, AuthController.verifyCurrentPassword);
router.post('/change-password', requireAuth, AuthController.changePassword);
router.post('/refresh', AuthController.refreshToken);
router.post('/launch-token', requireAuth, AuthController.issueLaunchCode);
router.post('/logout', AuthController.logout);

// --- NUMBER-MATCH MFA ROUTES ---
router.get('/mfa/status/:attemptId', AuthController.getMfaStatus);
router.get('/mfa/active', requireAuth, AuthController.getActiveMfaChallenge);
router.post('/mfa/resolve', AuthController.resolveMfaChallenge);
router.post('/mfa/email-fallback/send', AuthController.sendMfaEmailFallback);
router.post('/mfa/email-fallback/verify', AuthController.verifyMfaEmailFallback);

// --- Public endpoint for Dynamic OAuth Branding ---
router.get('/tenant/:tenantId/branding', AuthController.getTenantBranding);

// --- Authenticated route to get workspaces for switching ---
router.get('/workspaces', requireAuth, AuthController.getAvailableWorkspaces);

// --- SERVER-TO-SERVER OAUTH EXCHANGE ROUTE ---
router.post('/exchange', requireAppAuth, AuthController.exchangeCode);

export default router;