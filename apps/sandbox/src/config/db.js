import pg from 'pg';

// Connects to the isolated sandbox-postgres container running on port 5435
export const pool = new pg.Pool({
  user: 'sandbox_admin',
  host: 'localhost',
  database: 'sandbox_audit_db',
  password: 'sandbox_password',
  port: 5435,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});