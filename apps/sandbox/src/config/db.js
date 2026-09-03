import pg from 'pg';
const { Pool } = pg;

// Reads the Transaction Pooler URL (port 6543) from the environment variable
// Falls back to local Docker for development
const connectionString = process.env.DATABASE_URL || 'postgres://admin:password123@localhost:5435/sandbox_audit_db';

// Identify if we are running locally or in the cloud
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }, 
  
  max: 5, 
  keepAlive: true,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.warn('⚠️ Idle sandbox database client error (Safe to ignore):', err.message);
});
