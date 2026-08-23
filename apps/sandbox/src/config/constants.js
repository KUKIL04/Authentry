export const CONFIG = {
  // 1. Sandbox Application Config
  PORT: process.env.PORT || 5000,
  APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:5000',
  
  // 2. Target IDP Platform Config
  AUTHENTRY_BASE_URL: process.env.AUTHENTRY_BASE_URL || 'https://manavsutra-api.onrender.com/api/v1',
  IDP_FRONTEND_URL: process.env.IDP_FRONTEND_URL || 'https://manavsutra.vercel.app',
  
  // 3. Sandbox M2M/App Credentials
  AUTHENTRY_CLIENT_ID: process.env.AUTHENTRY_CLIENT_ID || 'm2m_c0c0a9a82109676d', 
  AUTHENTRY_CLIENT_SECRET: process.env.AUTHENTRY_CLIENT_SECRET || 'ae_live_bced7b3b3445135ad2ce7a19578daf79ae3b7aef04737f3ec184af0baa3a6e08', 
  AUTHENTRY_WEBHOOK_SECRET: process.env.AUTHENTRY_WEBHOOK_SECRET || 'wh_sec_5507bb4df7af56ee52947038695efb830db437c2533bc436',
  
  // 4. Dynamic URL Generator
  getLoginUrl: function() {
    // The sandbox tells the IDP to send the user back to its own callback route
    const encodedRedirect = encodeURIComponent(`${this.APP_BASE_URL}/callback`);
    
    // Assembles the final Vercel login URL with the correct Sandbox client ID
    return `${this.IDP_FRONTEND_URL}/login?clientId=${this.AUTHENTRY_CLIENT_ID}&redirectUri=${encodedRedirect}`;
  }
};