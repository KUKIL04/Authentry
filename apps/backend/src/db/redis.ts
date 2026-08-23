import { createClient } from 'redis';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

// 1. Connection String Parsing
// Fallback to local 6380 (as defined in your docker-compose.yml)
const REDIS_URI = process.env.REDIS_URL || 'redis://localhost:6380';

// Cloud Redis instances (Upstash, Redis Cloud, AWS) require TLS. 
// Local Docker instances usually do not.
const isCloud = REDIS_URI.startsWith('rediss://');

// ---------------------------------------------------------
// STANDARD CLIENT (Blacklists, Quotas, Telemetry)
// ---------------------------------------------------------
export const redisClient = createClient({
  url: REDIS_URI,
  // 🚨 FIX: Pass the entire socket configuration conditionally!
  socket: isCloud ? {
    tls: true, // Strictly true
    rejectUnauthorized: false // Required for some free-tier SSL certificates
  } : undefined
});

redisClient.on('error', (err) => console.error('❌ Redis Client Error', err));

export const initializeRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('✅ Connected to Secure Node-Redis successfully.');
  }
};

// ---------------------------------------------------------
// BULLMQ CLIENT (Strictly for background workers & Webhooks)
// ---------------------------------------------------------
export const bullmqConnection = new Redis(REDIS_URI, {
  maxRetriesPerRequest: null,
  // ioredis handles the typing slightly differently, so this ternary works perfectly here
  tls: isCloud ? { rejectUnauthorized: false } : undefined,
});

bullmqConnection.on('error', (err: Error) => console.error('❌ BullMQ Redis Error', err));