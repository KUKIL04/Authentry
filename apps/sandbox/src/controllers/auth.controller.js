import { authentry } from '../services/authentry.service.js';
import { CONFIG } from '../config/constants.js';

export class AuthController {
  static renderLogin(req, res) {
    res.send(`
      <div style="font-family: sans-serif; max-width: 600px; margin: 100px auto; text-align: center;">
        <div style="width: 64px; height: 64px; background: #4f46e5; border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 32px;">📦</div>
        <h1 style="color: #1e293b; margin-bottom: 8px;">SCM Workspace</h1>
        <p style="color: #64748b; margin-bottom: 40px; font-weight: 500;">Global Enterprise Supply Chain Suite</p>
        <a href="${CONFIG.getLoginUrl()}" style="padding: 14px 32px; background: #0f172a; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; box-shadow: 0 4px 14px 0 rgba(15, 23, 42, 0.39); transition: all 0.2s;">
          Access Your Workspace
        </a>
      </div>
    `);
  }

  static async handleCallback(req, res) {
    const { code } = req.query;
    if (!code) return res.status(400).send('No authorization code provided.');

    try {
      // Exchange code via SDK
      const authData = await authentry.auth.exchangeCode(code);
      
      const isProduction = process.env.NODE_ENV === 'production';

      // 1. The Short-Lived Access Token (15 Minutes)
      res.cookie('tenant_session', authData.accessToken, { 
        httpOnly: true, 
        secure: isProduction,
        maxAge: 15 * 60 * 1000 
      });

      // 2. The Long-Lived Refresh Token (7 Days)
      res.cookie('tenant_refresh', authData.refreshToken, { 
        httpOnly: true, 
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });

      res.redirect('/portal/dashboard');
    } catch (error) {
      // Safely extract the exact error message from the IDP response if it exists
      const idpErrorMsg = error.response?.data?.error || error.message;
      
      // Check if the IDP actively rejected the token exchange (e.g., cross-tenant spoofing)
      if (error.response?.status === 403) {
        console.warn(`[SECURITY WARNING] Token exchange blocked by IDP: ${idpErrorMsg}`);
        // Graceful deflection: Force the user to restart the flow safely from the beginning
        return res.redirect(CONFIG.getLoginUrl()); 
      }

      // Check if the auth code was just expired or invalid (401)
      if (error.response?.status === 401) {
        console.warn(`[AUTH] Invalid or expired auth code used. Redirecting to login.`);
        return res.redirect(CONFIG.getLoginUrl());
      }

      // Generic fallback for actual server crashes or network timeouts (500s)
      console.error('[SYSTEM ERROR] IDP Communication Failure:', idpErrorMsg);
      res.status(500).send('Authentication Service is currently unavailable. Please try again later.');
    }
  }

  static logout(req, res) {
    res.clearCookie('tenant_session');
    res.clearCookie('tenant_refresh');
    res.redirect('/');
  }
}