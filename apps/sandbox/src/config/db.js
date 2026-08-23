import pg from 'pg';
const { Pool } = pg;

// Reads from the Render environment variable, falls back to local Docker
const connectionString = process.env.DATABASE_URL || 'postgres://admin:password123@localhost:5435/sandbox_audit_db';

// Identify if we are running locally or in the cloud
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }, // Required for Supabase
  max: 5, // Keep the pool small for the free tier
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Automatically route all queries to the sandbox schema
pool.on('connect', (client) => {
  // We apply this in production so it targets your isolated Supabase schema
  if (!isLocal) {
    client.query('SET search_path TO sandbox, public')
      .catch(err => console.error('Failed to set search_path:', err));
  }
});