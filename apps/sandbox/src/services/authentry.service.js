import { AuthEntry } from '@auth-entry/node';
import { CONFIG } from '../config/constants.js';

// Initialize the AuthEntry SDK once for the entire application
export const authentry = new AuthEntry({
  clientId: CONFIG.AUTHENTRY_CLIENT_ID, 
  clientSecret: CONFIG.AUTHENTRY_CLIENT_SECRET,
  baseUrl: CONFIG.AUTHENTRY_BASE_URL,
  webhookSecret: CONFIG.AUTHENTRY_WEBHOOK_SECRET
});