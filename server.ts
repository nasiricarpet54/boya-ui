// ==========================================
// BOYA Platform — Server Entry Point
// ==========================================
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { runMigrations } from './src/db/migrate.ts';
import { seedDatabase } from './src/db/seed.ts';

// Route modules — each file owns one feature area.
import authRoutes from './src/routes/auth.ts';
import salonRoutes from './src/routes/salons.ts';
import bookingRoutes from './src/routes/bookings.ts';
import adminRoutes from './src/routes/admin.ts';
import uploadRoutes from './src/routes/uploads.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function createServer() {
  const app = express();

  app.set('trust proxy', 1);

  // --- Security middleware ---
  if (isProd) {
    app.use(helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "img-src": ["'self'", "data:", "blob:", "https:", "https://images.unsplash.com"],
          "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          "connect-src": ["'self'", "https:*", "wss:*"],
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }));
  }

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));
  app.use(cookieParser());

  // --- Database bootstrap ---
  await runMigrations();

  if (process.env.RUN_SEED === 'true') {
    try {
      await seedDatabase();
      console.log('[DB BOOT] Database tables and seed data synchronized successfully.');
    } catch (err) {
      console.error('[DB BOOT CRITICAL ERROR] Seeding failed:', err);
      if (isProd) process.exit(1);
    }
  } else {
    console.log('[DB BOOT] Skipping seed execution (RUN_SEED != true).');
  }

  // --- Static uploads ---
  // AUDIT (P0): prefer UPLOADS_DIR (a mounted volume) so uploads survive
  // container restarts; fall back to /app/uploads then public/uploads.
  const envUploads = process.env.UPLOADS_DIR;
  const dockerUploads = '/app/uploads';
  const localUploads = path.resolve(process.cwd(), 'public/uploads');
  const uploadsDir = envUploads
    ? path.resolve(envUploads)
    : fs.existsSync(dockerUploads)
      ? dockerUploads
      : localUploads;
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(localUploads)) fs.mkdirSync(localUploads, { recursive: true });
  console.log(`[BOOT] Upload storage directory: ${uploadsDir}`);

  app.use('/uploads', express.static(uploadsDir));
  app.use('/uploads', express.static(localUploads));

  // --- API routes ---
  // Health probe lives under adminRoutes and is mounted at /api/health.
  app.use('/api/auth', authRoutes);
  app.use('/api/salons', salonRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api', adminRoutes);
  app.use('/api/upload', uploadRoutes);

  // --- Frontend serving ---
  let vite: any;
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
  }

  // SPA fallback: serve index.html for any non-API route.
  app.get('*', async (req, res, next) => {
    try {
      const url = req.originalUrl;
      let template = fs.readFileSync(path.resolve(__dirname, isProd ? 'dist/index.html' : 'index.html'), 'utf-8');
      if (!isProd) template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      next(e);
    }
  });

  // --- Global error handler ---
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[SERVER ERROR]', err);
    res.status(500).json({ error: 'خطای داخلی سرور.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [READY] Server on port ${PORT} [Mode: ${isProd ? 'Production' : 'Development'}]`);
    console.log(`🌍 [READY] Accessible at http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('[BOOT FATAL]', err);
  process.exit(1);
});
