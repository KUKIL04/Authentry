import dotenv from 'dotenv';
dotenv.config();

import { Pool, QueryResult, QueryResultRow } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { redisClient } from './redis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Dynamic Connection Pool with Cloud SSL support
const isLocal = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://admin:password123@localhost:5434/auth_saas_db',
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10, // Safeguard pool size to prevent exhausting Supabase free limits
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Deep Telemetry Configuration
const SLOW_QUERY_THRESHOLD_MS = 5;
const MAX_BUFFER_SIZE = 49;

const originalQuery = pool.query.bind(pool);

// --- ENTERPRISE QUERY PROFILER INTERCEPTOR ---
pool.query = async function <R extends QueryResultRow = any, I extends any[] = any[]>(
  this: typeof pool,
  ...args: Parameters<typeof originalQuery>
): Promise<QueryResult<R>> {
  const start = process.hrtime();

  try {
    const executeQuery = originalQuery as unknown as (...a: any[]) => Promise<QueryResult<R>>;
    const res = await executeQuery(...args);

    const diff = process.hrtime(start);
    const durationMs = parseFloat((diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2));

    if (redisClient.isOpen) {
      Promise.all([
        redisClient.incr('telemetry:db:query_count'),
        redisClient.set('telemetry:db:last_query_latency_ms', durationMs.toString())
      ]).catch(err => console.error('Redis metrics sync failed:', err));

      if (durationMs >= SLOW_QUERY_THRESHOLD_MS) {
        const queryText = typeof args[0] === 'string' ? args[0] : (args[0] as unknown as { text?: string })?.text;
        const queryNormalized = queryText ? queryText.replace(/\s+/g, ' ').trim() : 'UNKNOWN QUERY';

        const slowQueryPayload = JSON.stringify({
          query: queryNormalized,
          durationMs,
          timestamp: new Date().toISOString()
        });

        (async () => {
          try {
            await redisClient.lPush('telemetry:db:slow_queries', slowQueryPayload);
            await redisClient.lTrim('telemetry:db:slow_queries', 0, MAX_BUFFER_SIZE);
            await redisClient.incr('telemetry:db:slow_query_count');
          } catch (err) {
            console.error('Redis slow query push failed:', err);
          }
        })();

        console.warn(`⚠️ [SLOW DB QUERY] Execution took ${durationMs}ms: "${queryNormalized.substring(0, 80)}..."`);
      }
    }

    return res;
  } catch (error) {
    if (redisClient.isOpen) {
      redisClient.incr('telemetry:db:error_count').catch(() => {});
    }
    throw error;
  }
} as typeof pool.query;

export const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(sql);
    console.log('✅ Database schema verified.');
  } catch (err) {
    console.error('❌ Error verifying database schema:', err);
  } finally {
    client.release();
  }
};