import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'boya-secret-key-12345';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'boya-refresh-secret-67890';

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

  // Proxy to live NestJS backend
  app.use('/api/v1', createProxyMiddleware({
    target: 'https://boya.bcshopir.ir/api/v1',
    changeOrigin: true,
    pathRewrite: {
      '^/api/v1': '', // Remove /api/v1 when forwarding
    },
    onProxyReq: (proxyReq, req, res) => {
      // You can add headers here if needed
    }
  }));

  // Logging middleware for unauthorized access attempts
  app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function(body) {
      if (res.statusCode === 401 || res.statusCode === 403) {
        console.warn(`[SECURITY] Unauthorized access attempt: ${req.method} ${req.url} - IP: ${req.ip}`);
      }
      return originalSend.call(this, body);
    };
    next();
  });

  // Auth Endpoints (Mocking the logic for the BFF)
  app.post('/api/auth/login', (req, res) => {
    const { phone, otp } = req.body;
    
    // In a real app, verify OTP here.
    // Mock user for demonstration:
    const user = { id: 'usr-1', name: 'کاربر تستی', role: 'customer', phone };
    
    const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ user, accessToken });
  });

  app.post('/api/auth/refresh', (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token missing' });

    try {
      const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as any;
      // In a real app, look up user in DB
      const user = { id: payload.id, name: 'کاربر تستی', role: 'customer', phone: '09123456789' };
      const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: '15m' });
      
      res.json({ accessToken });
    } catch (err) {
      res.status(401).json({ message: 'Invalid refresh token' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('refreshToken');
    res.json({ success: true });
  });

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

  // Global Error Handler for production (Masking stack traces)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    const message = isProd ? 'خطایی در سرور رخ داده است. لطفاً بعداً تلاش کنید.' : err.message;
    res.status(500).json({ error: message });
  });

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

createServer();
