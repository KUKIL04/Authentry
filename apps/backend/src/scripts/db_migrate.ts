import dotenv from 'dotenv';
dotenv.config();

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  // Always use the DIRECT_URL for migrations, falling back to DATABASE_URL
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ No connection string found for migrations.');
    process.exit(1);
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  const client = new Client({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('⚡ Connected to PostgreSQL for schema migration...');

    // 1. Run base schema
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(sql);
      console.log('✅ Base schema applied successfully.');
    }

    // 2. Optionally run incremental migration files in order
    const migrations = [
      'migration_employee_id.sql',
      'migration_invitation_upgrade.sql',
      'migration_suite_taxonomy.sql',
      'migration_transition.sql',
      'migration_useragent_ip_refreshtoken.sql'
    ];

    for (const file of migrations) {
      const filePath = path.join(__dirname, `../db/${file}`);
      if (fs.existsSync(filePath)) {
        const migrationSql = fs.readFileSync(filePath, 'utf8');
        await client.query(migrationSql);
        console.log(`✅ Applied migration: ${file}`);
      }
    }

    console.log('🎉 All migrations successfully executed.');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();