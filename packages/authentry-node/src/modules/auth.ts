import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { HttpClient } from '../httpClient.js';

export class AuthModule {
  private jwksClient: jwksClient.JwksClient;

  // 1. HARD BLOCKS (Security Events)
  private localBlacklist: Map<string, number> = new Map();
  // TENANT LEVEL KILL-SWITCH
  private tenantBlacklist: Map<string, number> = new Map();

  // 2. SOFT FLAGS (RBAC Updates)
  private staleSessions: Map<string, number> = new Map();

  constructor(private http: HttpClient, issuerUrl: string) {
    this.jwksClient = jwksClient({
      jwksUri: `${issuerUrl}/.well-known/jwks.json`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 86400000, 
      rateLimit: true,
    });

    // Cleanup both maps every 5 minutes
    setInterval(() => this.cleanupMemory(), 5 * 60 * 1000);
  }

  // --- HARD BLACKLIST METHODS ---
  blockUserLocally(userId: string, ttlMs: number = 900000) {
    this.localBlacklist.set(userId, Date.now() + ttlMs);
  }

  unblockUserLocally(userId: string) {
    this.localBlacklist.delete(userId);
  }

  // Block an entire company instantly
  blockTenantLocally(tenantId: string, ttlMs: number = 900000) {
    this.tenantBlacklist.set(tenantId, Date.now() + ttlMs);
    console.warn(`🛑 [SDK] Workspace ${tenantId} blocked locally. License revoked.`);
  }

  // --- SOFT STALE SESSION METHODS ---
  markSessionStale(userId: string, ttlMs: number = 900000) {
    this.staleSessions.set(userId, Date.now() + ttlMs);
  }

  clearStaleSession(userId: string) {
    this.staleSessions.delete(userId);
  }

  private cleanupMemory() {
    const now = Date.now();
    for (const [userId, expiry] of this.localBlacklist.entries()) {
      if (now > expiry) this.localBlacklist.delete(userId);
    }
    for (const [userId, expiry] of this.staleSessions.entries()) {
      if (now > expiry) this.staleSessions.delete(userId);
    }
    for (const [tenantId, expiry] of this.tenantBlacklist.entries()) {
      if (now > expiry) this.tenantBlacklist.delete(tenantId);
    }
  }

  async exchangeCode(code: string) {
    const response = await this.http.client.post('/auth/exchange', { code });
    const data = response.data; 

    // ---> NEW: Auto-Heal the Local Penalty Box <---
    // Decode the token (no verification needed here, it just came directly from the trusted IDP)
    const decoded = jwt.decode(data.accessToken) as jwt.JwtPayload & { userId?: string };
    
    if (decoded && decoded.userId) {
      this.unblockUserLocally(decoded.userId);
      this.clearStaleSession(decoded.userId); // Clear yellow flags too, just in case
      console.log(`✅ [SDK] Security lockouts cleared for user ${decoded.userId} after successful login.`);
    }

    return data;
  }

  async refreshToken(refreshToken: string) {
    const response = await this.http.client.post('/auth/refresh', { refreshToken });
    const data = response.data; 
    
    // ---> Auto-Heal the Stale Flag <---
    const decoded = jwt.decode(data.accessToken) as jwt.JwtPayload & { userId?: string };
    
    if (decoded && decoded.userId) {
      this.clearStaleSession(decoded.userId);
      console.log(`✅ [SDK] Soft RBAC flag cleared for user ${decoded.userId} after successful silent refresh.`);
    }

    return data;
  }

  async verifySession(token: string): Promise<any> {
    const getKey = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
      this.jwksClient.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
      });
    };

    return new Promise((resolve, reject) => {
      jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err) return reject(new Error('Invalid or expired session token'));

        const payload = decoded as jwt.JwtPayload & { userId?: string, tenantId?: string };

        if (payload && payload.userId) {
          // 1. Check Hard Blacklist (Circuit Breaker)
          const banExpiry = this.localBlacklist.get(payload.userId);
          if (banExpiry && Date.now() < banExpiry) {
             return reject(new Error('Session has been revoked locally by security event.'));
          }

          // 2. CHECK TENANT KILL SWITCH
          if (payload.tenantId) {
            const tenantBanExpiry = this.tenantBlacklist.get(payload.tenantId);
            if (tenantBanExpiry && Date.now() < tenantBanExpiry) {
               return reject(new Error('Session has been revoked locally: Workspace license has been terminated.'));
            }
          }

          // 3. Check Soft Stale Flag (Force Sync)
          const staleExpiry = this.staleSessions.get(payload.userId);
          if (staleExpiry && Date.now() < staleExpiry) {
             // We throw a very specific string so the frontend Axios interceptor can catch it
             return reject(new Error('REQUIRE_SILENT_REFRESH')); 
          }
        }
        resolve(decoded);
      });
    });
  }
}