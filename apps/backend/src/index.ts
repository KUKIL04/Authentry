import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, pool } from './db/index.js';
import { initializeRedis, redisClient } from './db/redis.js';
import { errorHandler } from './middlewares/error.js';
import { edgeTelemetry } from './middlewares/telemetry.js';
import { startCleanupWorker } from './workers/cleanup.worker.js';
import { startTelemetryWorker } from './workers/telemetry.worker.js';
import { startWebhookWorker } from './workers/webhook.worker.js';
import { startCronWorker } from './workers/cron.worker.js';

// Route Imports
import otpRouter from './routes/otp.js';
import tenantRouter from './routes/tenant.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import userRouter from './routes/user.js';
import superadminRouter from './routes/superadmin.js';
import discoveryRouter from './routes/discovery.js';
import s2sRouter from './routes/s2s.js';
import pushRouter from './routes/push.js';
import cookieParser from 'cookie-parser';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Tells Express to trust the reverse proxy (Vercel, Render, Cloudflare, etc.)
// and properly populate req.ip and x-forwarded-for with the real client IP.
app.set('trust proxy', 1);
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

app.use(edgeTelemetry);

const PORT = process.env.PORT || 3333;

app.use('/.well-known', discoveryRouter);

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use('/api/v1/otp', otpRouter);
app.use('/api/v1/tenant', tenantRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/s2s', s2sRouter);
app.use('/api/v1/platform', superadminRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/push', pushRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-backend' });
});

app.use(errorHandler);

const bootServer = async () => {
  try {
    // 1. Connect to infrastructure FIRST
    await initializeDatabase();
    await initializeRedis();

    // 2. Open HTTP port ONLY after databases are ready
    const server = app.listen(PORT, () => {
      console.log(`🚀 Production-grade Auth Backend listening on port ${PORT}`);
      
      // START BACKGROUND WORKERS
      startTelemetryWorker();
      startCleanupWorker();
      
      // START WEBHOOK PIPELINE
      startWebhookWorker(); 
      startCronWorker();
    });

    // 3. Attach Graceful Shutdown logic
    const gracefulShutdown = (signal: string) => {
      console.log(`🛑 ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        console.log('✅ HTTP server closed. Releasing active connections...');
        try {
          if (redisClient.isOpen) await redisClient.quit();
          await pool.end();
          console.log('✅ Resources released. Safe exit complete.');
          process.exit(0);
        } catch (err) {
          console.error('❌ Error during shutdown sequence:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // For Render/Docker
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // For Local Ctrl+C

  } catch (error) {
    console.error('❌ FATAL: Failed to boot server infrastructure:', error);
    process.exit(1);
  }
};

bootServer();