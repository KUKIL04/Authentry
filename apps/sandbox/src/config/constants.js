export const CONFIG = {
  PORT: 5000,
  
  AUTHENTRY_CLIENT_ID: 'm2m_7737388957c4f1df', 
  AUTHENTRY_CLIENT_SECRET: 'ae_live_094d3122b8fdb6a9a38862b6d19db07d418b2e91029fa3b37b7b533221b0b9d7', 
  
  AUTHENTRY_BASE_URL: 'https://smaller-dressing-collector-attachment.trycloudflare.com/api/v1',
  AUTHENTRY_WEBHOOK_SECRET: 'wh_sec_e943e3da31f3a1155b4d886ec15bc8e284e7a679ab43efbe',
  
  getLoginUrl: function() {
    return `https://choosing-disposal-explaining-similarly.trycloudflare.com/login?clientId=${this.AUTHENTRY_CLIENT_ID}&redirectUri=https://produce-mortgage-golf-swim.trycloudflare.com/callback`;
  }
};