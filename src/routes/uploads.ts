import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { requireAuth, type AuthRequest } from '../middleware/auth.ts';

const router = Router();

function validateAndProcessImage(rawData: string): { buffer: Buffer; ext: string } {
  if (!rawData || typeof rawData !== 'string') throw new Error('داده تصویر نامعتبر است.');
  if (rawData.length > 7 * 1024 * 1024) throw new Error('حجم فایل بیش از حد مجاز است.');
  const matches = rawData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  const base64Data = matches ? matches[2] : rawData;
  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length > 5 * 1024 * 1024) throw new Error('حجم فایل بیش از حد مجاز است.');

  let ext = '';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ext = 'jpg';
  else if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) ext = 'png';
  else if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') ext = 'webp';
  else throw new Error('فرمت نامعتبر است.');
  return { buffer, ext };
}

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rawData = req.body.fileData || req.body.base64;
    const { buffer, ext } = validateAndProcessImage(rawData);
    const safeName = `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;

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

    fs.writeFileSync(path.join(uploadsDir, safeName), buffer);
    res.json({ success: true, url: `/uploads/${safeName}` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
