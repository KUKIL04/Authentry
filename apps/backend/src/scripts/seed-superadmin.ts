import 'dotenv/config';
import { pool } from '../db/index.js';
import { CryptoService } from '../services/crypto.service.js';
import { initializeRedis, redisClient } from '../db/redis.js';

async function seedSuperAdmin() {
  const email = 'admin@authentry.com';
  const password = 'rootpassword123';

  console.log(`\n⚙️  Initializing SuperAdmin Seed Protocol...`);
  console.log(`📧 Target Email: ${email}`);

  try {
    // Establishes Redis connection for telemetry utilities
    await initializeRedis();

    // Hashes the password securely
    const hash = await CryptoService.hashPassword(password);
    
    // Upserts the SuperAdmin strictly into the modernized global identity matrix
    const query = `
      INSERT INTO users (
        email, password_hash, first_name, last_name, mobile_no, is_superadmin
      ) VALUES (
        $1, $2, 'System', 'Administrator', '+00000000000', true
      )
      ON CONFLICT (email) DO UPDATE 
      SET is_superadmin = true, password_hash = $2
      RETURNING id, email, is_superadmin;
    `;

    const res = await pool.query(query, [email, hash]);
    
    console.log('\n✅ SUCCESS: Root User Provisioned!');
    console.log(`🆔 UUID: ${res.rows[0].id}`);
    console.log(`🔐 Clearance: is_superadmin = ${res.rows[0].is_superadmin}\n`);

  } catch (error) {
    console.error('\n❌ FATAL: Failed to seed SuperAdmin\n', error);
  } finally {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
    await pool.end();
    if (redisClient.isOpen) {
      await redisClient.disconnect();
    }
    process.exit(0);
  }
}

seedSuperAdmin();