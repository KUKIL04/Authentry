import { authentry } from '../services/authentry.service.js';

export const requireAuth = async (req, res, next) => {
  let token = req.cookies.tenant_session;
  
  const refreshToken = req.cookies.tenant_refresh;
  
  // If neither token exists, they are completely logged out
  if (!token && !refreshToken) {
    return res.redirect('/');
  }

  try {
    // If the access token vanished but refresh exists, skip straight to the catch block
    if (!token) throw new Error('Token Expired');
    
    // Cryptographically verify the session without making a DB call!
    const session = await authentry.auth.verifySession(token);
    
    console.log('\n🔍 [Sandbox JWT Payload]:', JSON.stringify(session, null, 2));
    // Success! Inject into request
    req.session = session;
    next();
  } catch (error) {
    // The Access Token is expired or missing. Can we heal the session?
    if (refreshToken) {
      try {

        // ---> THE HARD BLOCK CHECK <---
        // If the SDK tells us this is a local security ban, DO NOT try to refresh.
        if (error.message.includes('revoked locally')) {
          console.log('🛑 Hard block detected in local memory. Instantly terminating session.');
          res.clearCookie('tenant_session');
          res.clearCookie('tenant_refresh');
          return res.redirect('/');
        }

        console.log('🔄 Access token expired. Attempting silent refresh via SDK...');
        
        // 1. Call your AuthEntry Backend via the SDK
        const refreshData = await authentry.auth.refreshToken(refreshToken);
        
        // 2. Update the variable and inject the fresh cookie into the user's browser
        token = refreshData.accessToken;
        res.cookie('tenant_session', token, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production',
          maxAge: 15 * 60 * 1000 
        });

        if (refreshData.refreshToken) {
          res.cookie('tenant_refresh', refreshData.refreshToken, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 
          });
        }

        // 3. Verify the newly generated token to extract the payload (roles/modules)
        const session = await authentry.auth.verifySession(token);
        req.session = session;
        
        // 4. Continue seamlessly to the Controller!
        return next();

      } catch (refreshError) {
        // The Refresh Token itself was revoked, blacklisted, or expired.
        console.error('❌ Silent refresh failed. Session terminated.', refreshError.message);
        res.clearCookie('tenant_session');
        res.clearCookie('tenant_refresh');
        return res.redirect('/');
      }
    }
    res.clearCookie('tenant_session');
    res.redirect('/');
  }
};