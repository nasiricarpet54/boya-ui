import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_SALONS, INITIAL_USERS, INITIAL_TICKETS } from '../shared/data/marketplaceData.ts';
import { normalizePhone } from '../shared/utils/persianUtils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE_PATH = path.resolve(__dirname, '../../server-data/platform_store.json');

interface PlatformServerData {
  salons: any[];
  users: any[];
  bookings: any[];
  notifications: any[];
  adminProfile: any;
}

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'جشنواره تخفیف پاییزی سالن‌های VIP بویا',
    content: 'تا ۲۰٪ تخفیف ویژه رزرو لاین‌های رنگ و کوتاهی مو در منتخب‌ترین سالن‌های تهران، شیراز و اصفهان. فرصت محدود تا پایان آبان!',
    type: 'promotional',
    targetAudience: 'customer',
    channel: 'in_app',
    badgeText: 'تخفیف ویژه',
    actionUrl: '/salons',
    actionText: 'مشاهده سالن‌های تخفیف‌دار',
    isActive: true,
    createdAt: '۱۴۰۳/۰۸/۱۰',
    expiresAt: '۱۴۰۳/۰۸/۳۰',
    viewsCount: 1420,
    clicksCount: 388,
    smsSentCount: 0,
  },
  {
    id: 'notif-2',
    title: 'بروزرسانی مهم: قابلیت جدید مسدودسازی سانس‌ها برای بیوتیشن‌ها',
    content: 'مدیران گرامی سالن‌ها و متخصصین محترم، اکنون می‌توانید سانس‌های استراحت یا نوبت‌های تلفنی خود را مستقیماً در تقویم مسدود کنید تا تداخل نوبت ایجاد نشود.',
    type: 'informational',
    targetAudience: 'salon',
    channel: 'in_app',
    badgeText: 'قابلیت جدید',
    actionUrl: '/salon-admin',
    actionText: 'بررسی پنل زمان‌بندی',
    isActive: true,
    createdAt: '۱۴۰۳/۰۸/۰۸',
    expiresAt: '۱۴۰۳/۰۹/۱۵',
    viewsCount: 245,
    clicksCount: 112,
    smsSentCount: 58,
  },
];

const DEFAULT_ADMIN_PROFILE = {
  id: 1,
  fullName: 'مهندس حسینی',
  phone: '09123456789',
  email: 'admin@boya.ir',
  emergencyPhone: '09351234567',
  positionTitle: 'مدیر ارشد پلتفرم و ناظر عالی کل بویا',
  adminCode: 'SA-1001',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  bio: 'مدیر توسعه محصول، نظارت بر استانداردهای احراز هویت سالن‌ها، امنیت پایگاه‌داده و مدیریت زنجیره خدمات زیبایی پلتفرم بویا در ۳۱ استان کشور.',
  province: 'تهران',
  city: 'تهران',
  securityAlertSms: true,
  newSalonsNotifySms: true,
  weeklyReportsEmail: true,
  twoFactorEnabled: true,
};

export function deduplicateUsers(usersList: any[]): any[] {
  if (!Array.isArray(usersList)) return [];
  const map = new Map<string, any>();

  for (const u of usersList) {
    const rawPhone = u.phone || u.phoneNumber;
    const cleanPhone = rawPhone ? normalizePhone(rawPhone) : null;
    const key = cleanPhone || String(u.id);

    if (map.has(key)) {
      const existing = map.get(key)!;
      map.set(key, {
        ...existing,
        ...u,
        phone: cleanPhone || existing.phone,
        fullName: u.fullName || u.name || existing.fullName || existing.name,
      });
    } else {
      map.set(key, {
        ...u,
        phone: cleanPhone || u.phone,
      });
    }
  }

  return Array.from(map.values());
}

export function loadServerData(): PlatformServerData {
  try {
    const dirPath = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      const rawUsers = parsed.users && parsed.users.length > 0 ? parsed.users : INITIAL_USERS;
      return {
        salons: parsed.salons && parsed.salons.length > 0 ? parsed.salons : INITIAL_SALONS,
        users: deduplicateUsers(rawUsers),
        bookings: parsed.bookings || [],
        notifications: parsed.notifications || DEFAULT_NOTIFICATIONS,
        adminProfile: parsed.adminProfile || DEFAULT_ADMIN_PROFILE,
      };
    }
  } catch (err) {
    console.error('[SERVER DB LOAD ERROR]', err);
  }

  // Fallback defaults
  const initialData: PlatformServerData = {
    salons: INITIAL_SALONS,
    users: deduplicateUsers(INITIAL_USERS),
    bookings: [],
    notifications: DEFAULT_NOTIFICATIONS,
    adminProfile: DEFAULT_ADMIN_PROFILE,
  };

  saveServerData(initialData);
  return initialData;
}

export function saveServerData(data: PlatformServerData): void {
  try {
    const dirPath = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    if (data.users && Array.isArray(data.users)) {
      data.users = deduplicateUsers(data.users);
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[SERVER DB PERSIST LOG] Platform store saved successfully.');
  } catch (err) {
    console.error('[SERVER DB SAVE ERROR]', err);
  }
}
