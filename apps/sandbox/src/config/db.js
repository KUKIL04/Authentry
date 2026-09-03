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
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle sandbox database client', err);
});
