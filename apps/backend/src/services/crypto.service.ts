import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Telemetry } from '../utils/telemetry.util.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const TEMP_TOKEN_EXPIRY = '5m';
const KEY_ID = 'authentry-key-v1';

// --- ESM PATH RESOLUTION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- RS256 ASYMMETRIC KEY MANAGEMENT ---
// 1. Tries Render's Secret Files paths from Environment Variables first
// 2. Falls back to calculating the local path strictly relative to this file
const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || path.join(__dirname, '../../keys/private.pem');
const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || path.join(__dirname, '../../keys/public.pem');

let PRIVATE_KEY: string;
let PUBLIC_KEY: string;

// Initialize or Load Keys on Startup
if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
  PRIVATE_KEY = fs.readFileSync(privateKeyPath, 'utf8');
  PUBLIC_KEY = fs.readFileSync(publicKeyPath, 'utf8');
} else {
  console.log('⚠️ No RSA keys found on disk. Generating new RS256 Key Pair for AuthEntry...');
  
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  
  PRIVATE_KEY = privateKey;
  PUBLIC_KEY = publicKey;
  
  try {
    const keysDir = path.dirname(privateKeyPath);
    if (!fs.existsSync(keysDir)) fs.mkdirSync(keysDir, { recursive: true });
    
    fs.writeFileSync(privateKeyPath, PRIVATE_KEY);
    fs.writeFileSync(publicKeyPath, PUBLIC_KEY);
    console.log('✅ RS256 Key Pair generated and secured.');
  } catch (err) {
    console.warn('⚠️ Read-only environment detected. Keys generated and held in memory temporarily.');
  }
}

// --- ENTERPRISE JWT PAYLOAD INTERFACE ---
export interface AccessTokenPayload {
  userId: string;
  tenantId: string;
  tenantName?: string;
  isAdmin: boolean;
  // Extended Claims for the SDK / Headless Flow
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  roles?: string[];
  entitlements?: Record<string, Record<string, string>>;
  isProfileIncomplete?: boolean;
  isProfileEnforced?: boolean;
}

export class CryptoService {

  static generateClientId(): string {
    return `m2m_${crypto.randomBytes(8).toString('hex')}`;
  }
  
  // --- PASSWORD HASHING (Argon2id) ---
  static async hashPassword(password: string): Promise<string> {
    return Telemetry.track('crypto', 'hash_password', async() => {
      return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });
    });  
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return Telemetry.track('crypto', 'verify_password', async () => {
      try {
        return await argon2.verify(hash, password);
      } catch {
        return false;
      }
    });  
  }

  // --- TOKEN GENERATION ---
  static generateRandomToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 48; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // --- JWT OPERATIONS (RS256) ---
  static generateAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, PRIVATE_KEY, { 
      algorithm: 'RS256', 
      expiresIn: ACCESS_TOKEN_EXPIRY,
      keyid: KEY_ID
    });
  }

  static verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
    } catch {
      return null;
    }
  }

  static generateTempToken(payload: { userId: string }): string {
    return jwt.sign(payload, PRIVATE_KEY, { 
      algorithm: 'RS256', 
      expiresIn: TEMP_TOKEN_EXPIRY,
      keyid: KEY_ID 
    });
  }

  static verifyTempToken(token: string): any {
    try {
      return jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
    } catch {
      return null;
    }
  }

  // --- API KEY GENERATION ---
  static generateApiKey(): { rawKey: string, keyPrefix: string, keyHash: string } {
    // Generates 32 bytes of cryptographically secure randomness
    const randomHex = crypto.randomBytes(32).toString('hex');
    const rawKey = `ae_live_${randomHex}`;
    
    // Extracts a prefix so the tenant can identify the key in their UI
    const keyPrefix = rawKey.substring(0, 16); 
    
    // Hashes the full key
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    
    return { rawKey, keyPrefix, keyHash };
  }

  // --- WEBHOOK SECURITY ---
  static generateWebhookSecret(): string {
    // Generates 24 bytes of cryptographically secure randomness
    const randomHex = crypto.randomBytes(24).toString('hex');
    return `wh_sec_${randomHex}`;
  }

  // --- JWKS PUBLIC KEY EXPORT ---
  static getJWKS() {
    // Converts the PEM Public Key into a standard JWK format
    const publicKeyObj = crypto.createPublicKey(PUBLIC_KEY);
    const jwk = publicKeyObj.export({ format: 'jwk' });
    
    return {
      keys: [
        {
          kty: jwk.kty,
          n: jwk.n,
          e: jwk.e,
          alg: 'RS256',
          use: 'sig',
          kid: KEY_ID
        }
      ]
    };
  }
}