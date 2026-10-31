import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { createBooking, getBookingsForUser, updateBookingStatus } from './src/db/bookings.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function createServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // SMS Logger Mock
  const logSms = (phone: string, message: string) => {
    console.log(`[SMS] To: ${phone} | Content: ${message}`);
  };

  // --- API Routes ---

  // User Profile
  app.get('/api/profile', requireAuth, (req: AuthRequest, res) => {
    res.json(req.dbUser);
  });

  // Salons & Services
  app.get('/api/salons', async (req, res) => {
    try {
      const allSalons = await db.query.salons.findMany({
        with: {
          services: true,
          specialists: {
            with: {
              user: true,
              portfolio: true
            }
          }
        }
      });
      res.json(allSalons);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch salons' });
    }
  });

  // Bookings
  app.post('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const booking = await createBooking({
        ...req.body,
        customerId: req.dbUser.id,
      });
      
      logSms(req.dbUser.phone || '09120000000', `نوبت شما در سامانه بویا ثبت شد. کد رهگیری: ${booking.trackingCode}`);
      
      res.status(201).json(booking);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const bookings = await getBookingsForUser(req.dbUser);
      res.json(bookings);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  app.patch('/api/bookings/:id/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { status } = req.body;
      const updated = await updateBookingStatus(Number(req.params.id), status);
      
      logSms(req.dbUser.phone || '09120000000', `وضعیت نوبت شما به ${status} تغییر یافت.`);
      
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  // Proxy to external legacy backend
  app.use('/api/v1', createProxyMiddleware({
    target: 'https://boya.bcshopir.ir/api/v1',
    changeOrigin: true,
    pathRewrite: { '^/api/v1': '' },
  }));

  // Vite integration
  let vite: any;
  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
  }

  // Fallback to index.html for SPA
  app.use('*', async (req, res) => {
    const url = req.originalUrl;
    try {
      let template: string;
      if (!isProd) {
        template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
      } else {
        template = fs.readFileSync(path.resolve(__dirname, 'dist/index.html'), 'utf-8');
      }
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      if (!isProd) vite.ssrFixStacktrace(e);
      console.error(e.stack);
      res.status(500).end(isProd ? 'Internal Server Error' : e.stack);
    }
  });

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

createServer();
